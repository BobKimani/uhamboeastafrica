"""Load transport places/routes from db/seeds/transport_routes.seed.json.

Idempotent and non-destructive: creates missing places and routes only. It
never changes a route or place that already exists (so admin edits survive),
never deletes anything, and only fills vehicle km/L where it is empty.

    python -m app.seed_transport            # inside the backend container
"""

from __future__ import annotations

import json
import sys
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Vehicle
from app.db.transport_models import TransportPlace, TransportRoute
from app.services.transport_quotes import find_place_by_name, find_route

SEED_PATH = Path(__file__).resolve().parents[1] / "db" / "seeds" / "transport_routes.seed.json"


def seed_transport(db: Session, data: dict) -> dict[str, int]:
    stats = {"placesCreated": 0, "routesCreated": 0, "vehiclesUpdated": 0}

    places: dict[str, TransportPlace] = {}
    for name in data["places"]:
        existing = find_place_by_name(db, name)
        if existing is None:
            existing = TransportPlace(name=name, is_active=True)
            db.add(existing)
            db.flush()
            stats["placesCreated"] += 1
        places[name] = existing

    for route in data["routes"]:
        a, b = places[route["from"]], places[route["to"]]
        if find_route(db, a.id, b.id) is not None:
            continue
        db.add(
            TransportRoute(
                place_a_id=a.id,
                place_b_id=b.id,
                distance_km=Decimal(str(route["distanceKm"])),
                needs_review=bool(route["needsReview"]),
            )
        )
        stats["routesCreated"] += 1
    db.flush()

    for vehicle_type, km_per_litre in data.get("vehicleKmPerLitreDefaults", {}).items():
        for vehicle in db.scalars(
            select(Vehicle).where(Vehicle.type == vehicle_type, Vehicle.km_per_litre.is_(None))
        ):
            vehicle.km_per_litre = Decimal(str(km_per_litre))
            stats["vehiclesUpdated"] += 1
    db.flush()
    return stats


def main() -> int:
    from app.db.session import SessionLocal

    data = json.loads(SEED_PATH.read_text())
    with SessionLocal() as db:
        stats = seed_transport(db, data)
        db.commit()
    print(
        f"Places created: {stats['placesCreated']}, routes created: {stats['routesCreated']}, "
        f"vehicles given km/L: {stats['vehiclesUpdated']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
