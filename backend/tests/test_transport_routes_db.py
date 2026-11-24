"""Route data, seeding and quote resolution against a real PostgreSQL."""

import json
from decimal import Decimal

import pytest
from sqlalchemy import select, text

from app.db.models import Vehicle
from app.db.transport_models import TransportPlace, TransportRoute
from app.seed_transport import SEED_PATH, seed_transport
from app.services.transport_quotes import (
    RouteNeedsReview,
    RouteNotFound,
    VehicleNotQuotable,
    quote_route,
)
from tests.conftest import BACKEND, requires_db

pytestmark = requires_db

SEED = json.loads(SEED_PATH.read_text())


@pytest.fixture
def db(pg_session_factory):
    with pg_session_factory() as session:
        session.execute(text(
            "TRUNCATE transport_routes, transport_places, bookings, payments, vehicles CASCADE"
        ))
        session.execute(text(
            "INSERT INTO transport_pricing_settings (id, fuel_price_kes, margin_kes, multiplier) "
            "VALUES (1, 217, 0, 0.9) ON CONFLICT (id) DO UPDATE SET fuel_price_kes=217, "
            "margin_kes=0, multiplier=0.9, updated_by=NULL"
        ))
        session.commit()
        yield session


def add_vehicle(db, type_, km_per_litre=None, available=True):
    vehicle = Vehicle(
        slug=type_.lower().replace(" ", "-"), name=f"Test {type_}", type=type_, capacity=6,
        price_per_day=100, best_for="Safari", features=[], image="assets/vehicles/x.jpg",
        region="kenya", is_available=available, km_per_litre=km_per_litre,
    )
    db.add(vehicle)
    db.flush()
    return vehicle


def place(db, name):
    return db.scalar(select(TransportPlace).where(TransportPlace.name == name))


def test_seed_file_matches_the_chart():
    assert len(SEED["places"]) == 88
    assert len(SEED["routes"]) == 715
    assert sum(r["needsReview"] for r in SEED["routes"]) == 25


def test_seed_loads_places_routes_and_is_idempotent(db):
    first = seed_transport(db, SEED)
    db.commit()
    assert first["placesCreated"] == 88 and first["routesCreated"] == 715

    second = seed_transport(db, SEED)
    db.commit()
    assert second["placesCreated"] == 0 and second["routesCreated"] == 0
    assert db.scalar(select(text("count(*)")).select_from(TransportRoute)) == 715


def test_seed_never_overwrites_admin_edits(db):
    seed_transport(db, SEED)
    route = db.scalar(select(TransportRoute).where(TransportRoute.needs_review.is_(True)))
    route.distance_km = Decimal("123.0")
    route.needs_review = False
    db.commit()

    seed_transport(db, SEED)
    db.commit()
    db.refresh(route)
    assert route.distance_km == Decimal("123.0") and route.needs_review is False


def test_seed_sets_vehicle_km_per_litre_by_type_only_when_empty(db):
    noah = add_vehicle(db, "Noah")
    cruiser = add_vehicle(db, "4x4 Land Cruiser", km_per_litre=Decimal("6"))
    unknown = add_vehicle(db, "Bicycle")
    seed_transport(db, SEED)
    db.commit()
    assert noah.km_per_litre == Decimal("9")
    assert cruiser.km_per_litre == Decimal("6")  # admin value kept
    assert unknown.km_per_litre is None


def test_quote_works_in_either_direction(db):
    seed_transport(db, SEED)
    vehicle = add_vehicle(db, "Noah", km_per_litre=Decimal("9"))
    a, b = place(db, "Ahero"), place(db, "Nairobi")  # 335 km in the chart

    forward = quote_route(db, a.id, b.id, vehicle.id, "return")
    backward = quote_route(db, b.id, a.id, vehicle.id, "return")
    assert forward.quote.distance_km == Decimal("335.0")
    assert forward.quote.total_kes == backward.quote.total_kes
    assert forward.from_place.name == "Ahero" and backward.from_place.name == "Nairobi"


def test_quote_uses_current_settings(db):
    seed_transport(db, SEED)
    vehicle = add_vehicle(db, "Noah", km_per_litre=Decimal("9"))
    a, b = place(db, "Ahero"), place(db, "Nairobi")
    before = quote_route(db, a.id, b.id, vehicle.id, "return").quote.total_kes
    db.execute(text("UPDATE transport_pricing_settings SET fuel_price_kes = 250"))
    after = quote_route(db, a.id, b.id, vehicle.id, "return").quote.total_kes
    assert after > before


def test_routes_needing_review_cannot_be_quoted(db):
    seed_transport(db, SEED)
    vehicle = add_vehicle(db, "Noah", km_per_litre=Decimal("9"))
    with pytest.raises(RouteNeedsReview):
        quote_route(db, place(db, "Nairobi").id, place(db, "Mombasa").id, vehicle.id, "return")


def test_missing_route_inactive_place_and_same_place_are_rejected(db):
    seed_transport(db, SEED)
    vehicle = add_vehicle(db, "Noah", km_per_litre=Decimal("9"))
    sagana, kisumu = place(db, "Sagana"), place(db, "Kisumu")  # Sagana only -> Nairobi
    with pytest.raises(RouteNotFound):
        quote_route(db, sagana.id, kisumu.id, vehicle.id, "return")
    with pytest.raises(RouteNotFound):
        quote_route(db, kisumu.id, kisumu.id, vehicle.id, "return")
    ahero, nairobi = place(db, "Ahero"), place(db, "Nairobi")
    ahero.is_active = False
    db.flush()
    with pytest.raises(RouteNotFound):
        quote_route(db, ahero.id, nairobi.id, vehicle.id, "return")


def test_vehicle_without_consumption_or_unavailable_cannot_be_quoted(db):
    seed_transport(db, SEED)
    no_rate = add_vehicle(db, "Alphard")
    away = add_vehicle(db, "Coaster", km_per_litre=Decimal("5"), available=False)
    a, b = place(db, "Ahero"), place(db, "Nairobi")
    with pytest.raises(VehicleNotQuotable):
        quote_route(db, a.id, b.id, no_rate.id, "return")
    with pytest.raises(VehicleNotQuotable):
        quote_route(db, a.id, b.id, away.id, "return")


def test_migration_is_re_runnable(pg_session_factory):
    sql = (BACKEND / "db/migrations/20261119_transport_route_pricing.sql").read_text()
    with pg_session_factory() as session:
        session.connection().connection.driver_connection.execute(sql)
        session.commit()
