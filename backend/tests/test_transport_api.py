"""Transport pricing HTTP API: public places/quote, admin settings/routes,
vehicle consumption, and route-priced bookings."""

import io
import json
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app import admin_cli
from app.config import settings
from app.db.models import Booking, Vehicle
from app.db.session import get_db
from app.db.transport_models import TransportPlace, TransportRoute
from app.main import app
from app.seed_transport import SEED_PATH, seed_transport
from tests.conftest import requires_db

pytestmark = requires_db

FRONTEND = "https://www.uhamboeastafrica.com"
ADMIN_EMAIL = "pricing.admin@uhamboeastafrica.com"
ADMIN_PASSWORD = "Pricing-Admin-Pass-42"


@pytest.fixture
def factory(pg_session_factory, monkeypatch):
    with pg_session_factory() as db:
        db.execute(text(
            "TRUNCATE transport_routes, transport_places, bookings, payments, vehicles, "
            "admin_login_attempts, admin_sessions, admin_users CASCADE"
        ))
        db.execute(text(
            "INSERT INTO transport_pricing_settings (id, fuel_price_kes, margin_kes, multiplier) "
            "VALUES (1, 217, 0, 0.9) ON CONFLICT (id) DO UPDATE SET fuel_price_kes=217, "
            "margin_kes=0, multiplier=0.9, updated_by=NULL"
        ))
        seed_transport(db, json.loads(SEED_PATH.read_text()))
        db.commit()

    def override_get_db():
        db = pg_session_factory()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(settings, "cors_allowed_origins", [FRONTEND])
    monkeypatch.setattr(settings, "frontend_url", FRONTEND)
    monkeypatch.setattr(settings, "session_https_only", True)
    yield pg_session_factory
    app.dependency_overrides.pop(get_db, None)


def client():
    return TestClient(app, base_url="https://api.uhamboeastafrica.com")


@pytest.fixture
def admin(factory):
    assert admin_cli.run(
        ["create", "--email", ADMIN_EMAIL, "--password-stdin"],
        session_factory=factory, stdin=io.StringIO(ADMIN_PASSWORD + "\n"),
    ) == 0
    c = client()
    csrf = c.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"Origin": FRONTEND},
    ).json()["csrfToken"]
    c.headers.update({"Origin": FRONTEND, "X-CSRF-Token": csrf})
    return c


@pytest.fixture
def noah(factory):
    with factory() as db:
        vehicle = Vehicle(
            slug="noah", name="Toyota Noah", type="Noah", capacity=7, price_per_day=140,
            best_for="Families", features=[], image="assets/vehicles/noah.jpg",
            region="kenya", is_available=True, km_per_litre=Decimal("9"),
        )
        db.add(vehicle)
        db.commit()
        return str(vehicle.id)


def place_id(factory, name):
    with factory() as db:
        return str(db.scalar(select(TransportPlace.id).where(TransportPlace.name == name)))


def mark_reviewed(factory, a, b, km=None):
    with factory() as db:
        ids = {db.scalar(select(TransportPlace.id).where(TransportPlace.name == n)) for n in (a, b)}
        route = db.scalar(select(TransportRoute).where(
            TransportRoute.place_a_id.in_(ids), TransportRoute.place_b_id.in_(ids)))
        route.needs_review = False
        if km is not None:
            route.distance_km = Decimal(km)
        db.commit()


def quote(c, factory, frm, to, vehicle_id, trip="return"):
    return c.get("/api/transport/quote", params={
        "from": place_id(factory, frm), "to": place_id(factory, to),
        "vehicleId": vehicle_id, "tripType": trip,
    })


# ----------------------------------------------------------------- public
def test_places_list_only_bookable_destinations(factory):
    body = client().get("/api/transport/places").json()
    assert body["success"] is True
    places = {p["name"]: p for p in body["places"]}
    assert len(places) == 88
    nairobi, mombasa = places["Nairobi"], places["Mombasa"]
    assert places["Ahero"]["id"] in nairobi["destinations"]
    assert mombasa["id"] not in nairobi["destinations"]  # needs review
    assert list(places) == sorted(places)


def test_quote_endpoint_returns_breakdown(factory, noah):
    mark_reviewed(factory, "Nairobi", "Mombasa", km="470")
    body = quote(client(), factory, "Nairobi", "Mombasa", noah).json()
    assert body["success"] is True
    q = body["quote"]
    assert (q["totalKes"], q["distanceKm"], q["tripType"]) == (30597, 470.0, "return")
    assert q["fuelKes"] == 22664.44 and q["driverAllowanceKes"] == 11332.22
    one_way = quote(client(), factory, "Nairobi", "Mombasa", noah, "one_way").json()["quote"]
    assert one_way["totalKes"] == 30597  # same as return: the vehicle comes back


def test_quote_errors(factory, noah):
    c = client()
    review = quote(c, factory, "Nairobi", "Mombasa", noah)
    assert review.status_code == 404 and review.json()["code"] == "route_needs_review"
    missing = quote(c, factory, "Sagana", "Kisumu", noah)
    assert missing.status_code == 404 and missing.json()["code"] == "route_not_found"
    bad_trip = quote(c, factory, "Ahero", "Nairobi", noah, "weekly")
    assert bad_trip.status_code == 400
    bad_id = c.get("/api/transport/quote", params={
        "from": "not-a-uuid", "to": "x", "vehicleId": noah, "tripType": "return"})
    assert bad_id.status_code == 400


# ------------------------------------------------------------------ admin
def test_admin_pricing_endpoints_require_admin(factory):
    c = client()
    assert c.get("/api/transport/settings").status_code == 401
    assert c.put("/api/transport/settings", json={}).status_code == 401
    assert c.get("/api/transport/routes").status_code == 401


def test_admin_updates_fuel_price_and_quotes_follow(admin, factory, noah):
    before = quote(admin, factory, "Ahero", "Nairobi", noah).json()["quote"]["totalKes"]
    r = admin.put("/api/transport/settings",
                  json={"fuelPriceKes": 250, "marginKes": 500, "multiplier": 0.9})
    assert r.status_code == 200, r.text
    assert r.json()["settings"]["fuelPriceKes"] == 250
    assert admin.get("/api/transport/settings").json()["settings"]["marginKes"] == 500
    after = quote(admin, factory, "Ahero", "Nairobi", noah).json()["quote"]["totalKes"]
    assert after > before


@pytest.mark.parametrize("payload", [
    {"fuelPriceKes": 0, "marginKes": 0, "multiplier": 0.9},
    {"fuelPriceKes": 217, "marginKes": -1, "multiplier": 0.9},
    {"fuelPriceKes": 217, "marginKes": 0, "multiplier": 0},
])
def test_invalid_settings_rejected(admin, payload):
    assert admin.put("/api/transport/settings", json=payload).status_code == 400


def test_settings_write_requires_csrf(admin):
    admin.headers.pop("X-CSRF-Token")
    r = admin.put("/api/transport/settings",
                  json={"fuelPriceKes": 300, "marginKes": 0, "multiplier": 0.9})
    assert r.status_code == 403


def test_admin_route_list_search_and_review_filter(admin):
    everything = admin.get("/api/transport/routes").json()["routes"]
    assert len(everything) == 715
    review = admin.get("/api/transport/routes", params={"needsReview": "true"}).json()["routes"]
    assert len(review) == 25
    mombasa = admin.get("/api/transport/routes", params={"search": "momba"}).json()["routes"]
    assert mombasa and all("Mombasa" in (r["fromPlace"], r["toPlace"]) for r in mombasa)
    nm = next(r for r in review if {r["fromPlace"], r["toPlace"]} == {"Nairobi", "Mombasa"})
    assert nm["distanceKm"] == 490.0 and nm["needsReview"] is True


def test_admin_marks_route_reviewed_and_it_becomes_bookable(admin, factory, noah):
    review = admin.get("/api/transport/routes", params={"search": "mombasa", "needsReview": "true"})
    nm = next(r for r in review.json()["routes"] if {r["fromPlace"], r["toPlace"]} == {"Nairobi", "Mombasa"})
    r = admin.patch(f"/api/transport/routes/{nm['id']}", json={"distanceKm": 480, "needsReview": False})
    assert r.status_code == 200 and r.json()["route"]["needsReview"] is False
    assert quote(client(), factory, "Nairobi", "Mombasa", noah).status_code == 200


def test_admin_adds_route_with_new_place_and_deletes_it(admin, factory, noah):
    r = admin.post("/api/transport/routes",
                   json={"fromPlace": "Nairobi", "toPlace": "Maasai Mara", "distanceKm": 270})
    assert r.status_code == 201, r.text
    route = r.json()["route"]
    assert route["toPlace"] == "Maasai Mara" and route["needsReview"] is False
    assert quote(client(), factory, "Nairobi", "Maasai Mara", noah).status_code == 200
    dup = admin.post("/api/transport/routes",
                     json={"fromPlace": "maasai mara", "toPlace": "NAIROBI", "distanceKm": 300})
    assert dup.status_code == 409
    assert admin.delete(f"/api/transport/routes/{route['id']}").json()["success"] is True
    assert quote(client(), factory, "Nairobi", "Maasai Mara", noah).status_code == 404


def test_admin_rejects_bad_routes(admin):
    assert admin.post("/api/transport/routes",
                      json={"fromPlace": "Nairobi", "toPlace": "nairobi", "distanceKm": 10}).status_code == 400
    assert admin.post("/api/transport/routes",
                      json={"fromPlace": "Nairobi", "toPlace": "Thika", "distanceKm": 0}).status_code == 422


def test_vehicle_km_per_litre_is_editable_and_price_per_day_optional(admin, noah):
    vehicles = admin.get("/api/vehicles").json()["vehicles"]
    current = next(v for v in vehicles if v["id"] == noah)
    assert current["kmPerLitre"] == 9.0
    payload = {k: current[k] for k in ("name", "type", "capacity", "bestFor", "features", "image", "region", "isAvailable")}
    r = admin.patch(f"/api/vehicles/{noah}", json={**payload, "kmPerLitre": 8.5})
    assert r.status_code == 200, r.text
    assert r.json()["vehicle"]["kmPerLitre"] == 8.5
    assert r.json()["vehicle"]["pricePerDay"] == 140.0  # unchanged when omitted
    created = admin.post("/api/vehicles", json={**payload, "name": "Second Noah", "kmPerLitre": 10})
    assert created.status_code == 200 and created.json()["vehicle"]["kmPerLitre"] == 10.0


# --------------------------------------------------------------- bookings
BOOKING = {
    "fullName": "Route Traveller", "email": "route@example.com", "phone": "0712345678",
    "destination": "Mombasa", "travelStartDate": "2027-03-01", "travelEndDate": "2027-03-01",
    "travellingWith": "couple", "bookingType": "transport", "numberOfTravellers": 2,
    "numberOfRooms": 0,
}


def priced_booking(factory, vehicle_id, trip="return", total=None, **extra):
    return {**BOOKING, "transportFromId": place_id(factory, "Ahero"),
            "transportToId": place_id(factory, "Nairobi"), "vehicleId": vehicle_id,
            "tripType": trip, **({"quotedTotalKes": total} if total is not None else {}), **extra}


def test_booking_is_priced_by_route_and_snapshots_the_quote(factory, noah):
    c = client()
    shown = quote(c, factory, "Ahero", "Nairobi", noah, "one_way").json()["quote"]["totalKes"]
    r = c.post("/api/bookings", json=priced_booking(factory, noah, "one_way", shown,
                                                    amountKes=1))  # client amount ignored
    assert r.status_code == 201, r.text
    assert r.json()["payment"] == {"required": True, "amountKes": shown}
    with factory() as db:
        b = db.get(Booking, r.json()["id"])
        assert (b.amount_kes, b.transport_amount_kes, b.payment_status) == (shown, shown, "unpaid")
        assert (b.trip_type, b.transport_from, b.transport_to) == ("one_way", "Ahero", "Nairobi")
        assert b.transport_days is None and str(b.selected_vehicle_id) == noah
        assert b.transport_quote["totalKes"] == shown and b.quote_requested is False


def test_price_change_after_quote_is_rejected_with_new_quote(admin, factory, noah):
    c = client()
    shown = quote(c, factory, "Ahero", "Nairobi", noah).json()["quote"]["totalKes"]
    admin.put("/api/transport/settings", json={"fuelPriceKes": 260, "marginKes": 0, "multiplier": 0.9})
    r = c.post("/api/bookings", json=priced_booking(factory, noah, "return", shown))
    assert r.status_code == 409
    assert r.json()["code"] == "price_changed"
    assert r.json()["quote"]["totalKes"] > shown


def test_later_fuel_change_does_not_alter_existing_booking(admin, factory, noah):
    c = client()
    shown = quote(c, factory, "Ahero", "Nairobi", noah).json()["quote"]["totalKes"]
    booking_id = c.post("/api/bookings", json=priced_booking(factory, noah, "return", shown)).json()["id"]
    admin.put("/api/transport/settings", json={"fuelPriceKes": 300, "marginKes": 0, "multiplier": 0.9})
    with factory() as db:
        b = db.get(Booking, booking_id)
        assert b.amount_kes == shown and b.transport_quote["fuelPriceKes"] == 217.0


def test_booking_on_route_needing_review_is_refused(factory, noah):
    payload = {**priced_booking(factory, noah), "transportToId": place_id(factory, "Mombasa"),
               "transportFromId": place_id(factory, "Nairobi")}
    r = client().post("/api/bookings", json=payload)
    assert r.status_code == 404 and r.json()["code"] == "route_needs_review"


def test_quote_request_is_saved_without_payment(factory):
    r = client().post("/api/bookings", json={
        **BOOKING, "quoteRequested": True, "transportFrom": "Nairobi",
        "transportTo": "Maasai Mara", "tripType": "return", "vehicleType": "Noah",
    })
    assert r.status_code == 201, r.text
    assert r.json()["payment"] == {"required": False, "amountKes": None}
    with factory() as db:
        b = db.get(Booking, r.json()["id"])
        assert b.quote_requested is True and b.payment_status == "not_required"
        assert b.amount_kes is None and b.transport_to == "Maasai Mara"


def test_transport_booking_requires_route_or_quote_request(factory, noah):
    r = client().post("/api/bookings", json={**BOOKING, "tripType": "return", "vehicleId": noah})
    assert r.status_code == 400


def test_admin_booking_list_shows_trip_type_quote_and_flag(admin, factory, noah):
    shown = quote(admin, factory, "Ahero", "Nairobi", noah).json()["quote"]["totalKes"]
    client().post("/api/bookings", json=priced_booking(factory, noah, "return", shown))
    client().post("/api/bookings", json={**BOOKING, "quoteRequested": True, "transportFrom": "Nairobi",
                                         "transportTo": "Maasai Mara", "tripType": "one_way"})
    rows = admin.get("/api/bookings").json()["bookings"]
    priced = next(b for b in rows if not b["quoteRequested"])
    requested = next(b for b in rows if b["quoteRequested"])
    assert priced["tripType"] == "return" and priced["transportQuote"]["totalKes"] == shown
    assert requested["tripType"] == "one_way" and requested["transportQuote"] is None


# ------------------------------------------------------ code-review fixes
@pytest.mark.parametrize("payload,message", [
    ({"fuelPriceKes": 0.001, "marginKes": 0, "multiplier": 0.9}, "Fuel price"),   # rounds to 0.00
    ({"fuelPriceKes": 217, "marginKes": 0, "multiplier": 0.00001}, "Multiplier"), # rounds to 0.0000
    ({"fuelPriceKes": 100000, "marginKes": 0, "multiplier": 0.9}, "Fuel price"),
    ({"fuelPriceKes": 217, "marginKes": 10000000, "multiplier": 0.9}, "Margin"),
])
def test_settings_validated_at_stored_precision_without_server_error(admin, payload, message):
    r = admin.put("/api/transport/settings", json=payload)
    assert r.status_code == 400, r.text
    assert message in r.json()["error"]


def test_settings_are_stored_at_column_precision(admin):
    r = admin.put("/api/transport/settings",
                  json={"fuelPriceKes": 217.456, "marginKes": 10.005, "multiplier": 0.91234})
    assert r.status_code == 200
    s = r.json()["settings"]
    assert (s["fuelPriceKes"], s["marginKes"], s["multiplier"]) == (217.46, 10.01, 0.9123)


def test_adding_route_to_inactive_place_reactivates_it(admin, factory, noah):
    with factory() as db:
        place = db.scalar(select(TransportPlace).where(TransportPlace.name == "Sagana"))
        place.is_active = False
        db.commit()
    r = admin.post("/api/transport/routes",
                   json={"fromPlace": "Sagana", "toPlace": "Kisumu", "distanceKm": 300})
    assert r.status_code == 201, r.text
    names = {p["name"] for p in client().get("/api/transport/places").json()["places"]}
    assert "Sagana" in names
    assert quote(client(), factory, "Sagana", "Kisumu", noah).status_code == 200


def test_place_names_are_matched_ignoring_case_and_extra_spaces(admin):
    r = admin.post("/api/transport/routes",
                   json={"fromPlace": "  nairobi ", "toPlace": "Burnt   forest", "distanceKm": 1})
    assert r.status_code == 409  # existing Nairobi <-> Burnt Forest pair, not new places
