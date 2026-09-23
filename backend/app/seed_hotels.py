"""Load db/seeds/hotels.seed.json into the hotels table.

Usage (from backend/, with the usual DB env vars set):
    python -m app.seed_hotels            # insert new hotels, update existing ones
    python -m app.seed_hotels --dry-run  # report what would change

Hotels are matched on slug, so re-running is safe. Existing rows keep their
image, tags, top-rated flag and availability if an admin has edited them;
name, location, rating, "from" price and contract rates are refreshed.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

from app.db.models import Hotel
from app.db.session import SessionLocal

SEED_FILE = Path(__file__).resolve().parents[1] / "db" / "seeds" / "hotels.seed.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--file", type=Path, default=SEED_FILE)
    args = parser.parse_args()

    records = json.loads(args.file.read_text(encoding="utf-8"))
    created = updated = 0

    with SessionLocal() as db:
        existing = {h.slug: h for h in db.scalars(select(Hotel)).all()}
        for rec in records:
            hotel = existing.get(rec["slug"])
            if hotel is None:
                db.add(
                    Hotel(
                        slug=rec["slug"],
                        name=rec["name"],
                        country=rec["country"],
                        region=rec["region"],
                        destination=rec["destination"],
                        price_per_night=rec["pricePerNight"],
                        rating=rec["rating"],
                        image=rec["image"],
                        tags=rec["tags"],
                        description=rec["description"],
                        top_rated=rec["topRated"],
                        is_available=rec["isAvailable"],
                        rates=rec["rates"],
                    )
                )
                created += 1
            else:
                hotel.name = rec["name"]
                hotel.country = rec["country"]
                hotel.region = rec["region"]
                hotel.destination = rec["destination"]
                hotel.price_per_night = rec["pricePerNight"]
                hotel.rating = rec["rating"]
                hotel.description = rec["description"]
                hotel.rates = rec["rates"]
                hotel.updated_at = datetime.now(UTC)
                updated += 1

        if args.dry_run:
            db.rollback()
        else:
            db.commit()

    mode = "Would create" if args.dry_run else "Created"
    print(f"{mode} {created} hotels, {'would update' if args.dry_run else 'updated'} {updated}.")


if __name__ == "__main__":
    main()
