"""Local filesystem media storage (replaces AWS S3 / CloudFront).

Files live under ``MEDIA_ROOT`` (``/app/uploads`` in the container, bind-mounted
from ``/srv/uhambo/uploads`` on the VPS) and are served by Nginx at
``MEDIA_BASE_URL`` (``https://api.uhamboeastafrica.com/media``).

Object keys keep the same layout as the former S3 bucket (for example
``catalog/2026/09/21/<name>.jpg`` or ``assets/hotels/<name>.jpg``), so existing
S3/CloudFront references map 1:1 onto ``MEDIA_BASE_URL/<key>``.
"""

from __future__ import annotations

import logging
import os
import re
import secrets
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

from app.config import settings

logger = logging.getLogger(__name__)

FILE_MODE = 0o644  # readable by Nginx, writable only by the app user
DIR_MODE = 0o755

# Only raster formats; SVG is deliberately excluded (it can carry scripts).
# Extension is derived from the detected content, never from the client filename.
_IMAGE_SIGNATURES: tuple[tuple[str, str, callable], ...] = (
    ("jpg", "image/jpeg", lambda h: h.startswith(b"\xff\xd8\xff")),
    ("png", "image/png", lambda h: h.startswith(b"\x89PNG\r\n\x1a\n")),
    ("gif", "image/gif", lambda h: h[:6] in (b"GIF87a", b"GIF89a")),
    ("webp", "image/webp", lambda h: h[:4] == b"RIFF" and h[8:12] == b"WEBP"),
    (
        "avif",
        "image/avif",
        lambda h: h[4:8] == b"ftyp" and h[8:12] in (b"avif", b"avis"),
    ),
)

_SAFE_KEY_SEGMENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


class MediaStorageError(Exception):
    """Base error for media storage failures."""


class InvalidMediaError(MediaStorageError):
    """The uploaded content is not an allowed image type."""


class MediaTooLargeError(MediaStorageError):
    """The uploaded content exceeds the configured size limit."""


class UnsafeMediaPathError(MediaStorageError):
    """A key would resolve outside the media root."""


@dataclass(frozen=True)
class StoredMedia:
    key: str
    url: str
    content_type: str
    size: int


def detect_image_type(data: bytes) -> tuple[str, str] | None:
    """Return (extension, content_type) for allowed image bytes, else None."""
    header = data[:32]
    for extension, content_type, matches in _IMAGE_SIGNATURES:
        if matches(header):
            return extension, content_type
    return None


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:60].strip("-") or "image"


def build_catalog_key(filename: str | None, extension: str, now: datetime | None = None) -> str:
    """Generate a safe, unique key in the same layout previously used on S3."""
    now = now or datetime.now(UTC)
    stem = PurePosixPath(filename or "image").stem  # drop client extension/dirs
    token = secrets.token_hex(4)  # avoid collisions for same name + second
    return (
        f"catalog/{now.strftime('%Y/%m/%d')}/"
        f"{now.timestamp():.0f}-{token}-{_slug(stem)}.{extension}"
    )


class LocalMediaStorage:
    def __init__(self, root: str | os.PathLike[str], base_url: str):
        self.root = Path(root).resolve()
        self.base_url = base_url.rstrip("/")

    # ----- key / path handling -------------------------------------------
    def _validate_key(self, key: str) -> str:
        if not key or "\\" in key or "\x00" in key:
            raise UnsafeMediaPathError("Invalid media key")
        parts = PurePosixPath(key).parts
        if not parts or PurePosixPath(key).is_absolute():
            raise UnsafeMediaPathError("Invalid media key")
        for part in parts:
            if part in (".", "..") or not _SAFE_KEY_SEGMENT.fullmatch(part):
                raise UnsafeMediaPathError("Invalid media key")
        return "/".join(parts)

    def path_for(self, key: str) -> Path:
        key = self._validate_key(key)
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root) or path == self.root:
            raise UnsafeMediaPathError("Media key escapes the media root")
        return path

    def url_for(self, key: str) -> str:
        return f"{self.base_url}/{self._validate_key(key)}"

    # ----- operations ----------------------------------------------------
    def save(self, key: str, data: bytes) -> Path:
        """Atomically write ``data`` to ``key``. Never overwrites an existing file."""
        path = self.path_for(key)
        self._ensure_dir(path.parent)

        fd, tmp_name = tempfile.mkstemp(dir=path.parent, prefix=".upload-", suffix=".tmp")
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            os.chmod(tmp_name, FILE_MODE)
            # link() fails if the target exists, so concurrent uploads can't clobber.
            try:
                os.link(tmp_name, path)
            except FileExistsError:
                raise
            except OSError:
                # Filesystem without hard-link support: fall back to rename.
                if path.exists():
                    raise FileExistsError(path)
                os.replace(tmp_name, path)
        except FileExistsError as exc:
            raise MediaStorageError("Media key already exists") from exc
        finally:
            try:
                os.unlink(tmp_name)
            except FileNotFoundError:
                pass
        return path

    def exists(self, key: str) -> bool:
        try:
            return self.path_for(key).is_file()
        except UnsafeMediaPathError:
            return False

    def open(self, key: str):
        return self.path_for(key).open("rb")

    def delete(self, key: str) -> bool:
        """Delete a stored file. Returns False if it did not exist."""
        path = self.path_for(key)
        try:
            path.unlink()
        except FileNotFoundError:
            return False
        return True

    def _ensure_dir(self, directory: Path) -> None:
        if not directory.resolve().is_relative_to(self.root):
            raise UnsafeMediaPathError("Directory escapes the media root")
        missing = []
        current = directory
        while not current.exists():
            missing.append(current)
            current = current.parent
        for item in reversed(missing):
            try:
                item.mkdir(mode=DIR_MODE)
            except FileExistsError:
                pass
            os.chmod(item, DIR_MODE)


def get_media_storage() -> LocalMediaStorage:
    return LocalMediaStorage(settings.media_root, settings.media_base_url)


async def read_upload_limited(upload, max_bytes: int, chunk_size: int = 1024 * 1024) -> bytes:
    """Read an UploadFile without buffering more than ``max_bytes + 1`` bytes."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await upload.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise MediaTooLargeError("Uploaded file is too large")
        chunks.append(chunk)
    return b"".join(chunks)


def store_catalog_image(data: bytes, filename: str | None) -> StoredMedia:
    detected = detect_image_type(data)
    if detected is None:
        raise InvalidMediaError("Only image uploads are allowed")
    extension, content_type = detected

    storage = get_media_storage()
    key = build_catalog_key(filename, extension)
    storage.save(key, data)
    logger.info("Stored catalog image %s (%d bytes)", key, len(data))
    return StoredMedia(key=key, url=storage.url_for(key), content_type=content_type, size=len(data))
