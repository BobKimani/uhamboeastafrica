"""Read-only audit of image references against local media storage.

Resolves every hotel/vehicle ``image`` value (legacy S3 URL, CloudFront URL,
new MEDIA_BASE_URL URL, or relative key) to the storage key the frontend will
request under ``MEDIA_BASE_URL``, and reports which files are missing from
``MEDIA_ROOT``. It never writes to the database or the media directory.

Usage (inside the backend container on the VPS):
    docker compose ... exec backend python -m app.media_audit
    docker compose ... exec backend python -m app.media_audit --keys-file /app/uploads/.extra-keys.txt

Exit status: 0 when every referenced local file exists, 1 otherwise.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections.abc import Iterable
from dataclasses import dataclass
from urllib.parse import unquote, urlsplit

from app.config import settings
from app.services.media_storage import LocalMediaStorage, UnsafeMediaPathError

LEGACY_S3_HOST = re.compile(r"^uhambo-s3-bucket\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$")
LEGACY_CLOUDFRONT_HOST = "d2fbz2lzk71lum.cloudfront.net"

# Mirrors frontend/lib/media.ts: old flat catalog/<file> keys were moved.
LEGACY_CATALOG_IMAGE_PATHS = {
    "10-seater-van.png": "assets/vehicles/10-seater-van.png",
    "alphard.jpg": "assets/vehicles/alphard.jpg",
    "coaster.png": "assets/vehicles/coaster.png",
    "diani-beach.jpg": "assets/destinations/diani-beach.jpg",
    "expedition-truck.jpg": "assets/vehicles/expedition-truck.jpg",
    "mara-river-lodge.jpg": "assets/hotels/mara-river-lodge.jpg",
    "ngorongoro.jpg": "assets/destinations/ngorongoro.jpg",
    "noah.jpg": "assets/vehicles/noah.jpg",
    "rwanda-hills.jpg": "assets/destinations/rwanda-hills.jpg",
    "serengeti.jpg": "assets/destinations/serengeti.jpg",
    "toyota-land-cruiser.jpg": "assets/vehicles/toyota-land-cruiser.jpg",
    "uganda-gorilla.jpg": "assets/destinations/uganda-gorilla.jpg",
}


@dataclass(frozen=True)
class Reference:
    source: str  # e.g. "hotels:<id>"
    value: str
    kind: str  # local | external | inline
    key: str | None = None


def _remap_legacy(key: str) -> str:
    key = key.lstrip("/")
    match = re.fullmatch(r"catalog/([^/]+)", key)
    if match:
        return LEGACY_CATALOG_IMAGE_PATHS.get(match.group(1), key)
    return key


def resolve_key(value: str, media_base_url: str) -> tuple[str, str | None]:
    """Return (kind, key) for a stored image reference."""
    value = (value or "").strip()
    if not value or value.startswith(("data:", "blob:")):
        return "inline", None

    parts = urlsplit(value)
    if parts.scheme in ("http", "https"):
        host = (parts.hostname or "").lower()
        path = unquote(parts.path)
        if LEGACY_S3_HOST.match(host) or host == LEGACY_CLOUDFRONT_HOST:
            return "local", _remap_legacy(path)
        base = urlsplit(media_base_url)
        base_path = base.path.rstrip("/")
        if (
            (parts.scheme, parts.netloc) == (base.scheme, base.netloc)
            and (path == base_path or path.startswith(f"{base_path}/"))
        ):
            return "local", _remap_legacy(path[len(base_path):])
        return "external", None

    return "local", _remap_legacy(unquote(parts.path))


def database_references() -> list[Reference]:
    from sqlalchemy import select

    from app.db.models import Hotel, Vehicle
    from app.db.session import SessionLocal

    references: list[Reference] = []
    with SessionLocal() as db:  # read-only: no add/flush/commit
        for model, table in ((Hotel, "hotels"), (Vehicle, "vehicles")):
            for row_id, image in db.execute(select(model.id, model.image)):
                kind, key = resolve_key(image, settings.media_base_url)
                references.append(Reference(f"{table}:{row_id}", image, kind, key))
    return references


def file_references(path: str) -> list[Reference]:
    references = []
    with open(path, encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, 1):
            value = line.strip()
            if value and not value.startswith("#"):
                kind, key = resolve_key(value, settings.media_base_url)
                references.append(Reference(f"{path}:{line_no}", value, kind, key))
    return references


def audit(references: Iterable[Reference], storage: LocalMediaStorage) -> int:
    references = list(references)
    missing: dict[str, list[str]] = {}
    unsafe: list[Reference] = []
    found: set[str] = set()
    external = [r for r in references if r.kind == "external"]

    for ref in references:
        if ref.kind != "local" or not ref.key:
            continue
        try:
            exists = storage.path_for(ref.key).is_file()
        except UnsafeMediaPathError:
            unsafe.append(ref)
            continue
        if exists:
            found.add(ref.key)
        else:
            missing.setdefault(ref.key, []).append(ref.source)

    print(f"MEDIA_ROOT:      {storage.root}")
    print(f"MEDIA_BASE_URL:  {storage.base_url}")
    print(f"References:      {len(references)}")
    print(f"  present files: {len(found)} unique")
    print(f"  missing files: {len(missing)} unique")
    print(f"  external URLs: {len(external)} (not stored locally; left unchanged)")
    print(f"  unsafe keys:   {len(unsafe)}")

    for key, sources in sorted(missing.items()):
        print(f"MISSING  {key}  <- {', '.join(sources[:5])}{' ...' if len(sources) > 5 else ''}")
    for ref in unsafe:
        print(f"UNSAFE   {ref.source}: {ref.value!r}")
    for ref in external:
        print(f"EXTERNAL {ref.source}: {ref.value}")

    return 1 if missing or unsafe else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--keys-file", action="append", default=[],
                        help="Extra image keys/URLs to check, one per line")
    parser.add_argument("--skip-db", action="store_true",
                        help="Only check --keys-file entries")
    args = parser.parse_args(argv)

    references: list[Reference] = []
    if not args.skip_db:
        references += database_references()
    for path in args.keys_file:
        references += file_references(path)

    storage = LocalMediaStorage(settings.media_root, settings.media_base_url)
    return audit(references, storage)


if __name__ == "__main__":
    sys.exit(main())
