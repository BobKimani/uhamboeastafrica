import io
import os
import stat

import pytest
from fastapi.testclient import TestClient

from app.auth import require_authenticated_admin
from app.config import settings
from app.main import app
from app.services import media_storage
from app.services.media_storage import (
    LocalMediaStorage,
    UnsafeMediaPathError,
    build_catalog_key,
    detect_image_type,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 64
BASE_URL = "https://api.uhamboeastafrica.com/media"


@pytest.fixture
def media_root(tmp_path, monkeypatch):
    root = tmp_path / "uploads"
    root.mkdir()
    monkeypatch.setattr(settings, "media_root", str(root))
    monkeypatch.setattr(settings, "media_base_url", BASE_URL)
    monkeypatch.setattr(settings, "media_max_upload_bytes", 1024)
    return root


@pytest.fixture
def admin_client(media_root):
    app.dependency_overrides[require_authenticated_admin] = lambda: {"sub": "admin"}
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(require_authenticated_admin, None)


def upload(client, data, filename="photo.png", content_type="image/png"):
    return client.post(
        "/api/uploads/catalog-image",
        files={"file": (filename, io.BytesIO(data), content_type)},
    )


# ---------------------------------------------------------------- upload API
def test_upload_stores_file_locally_and_returns_media_url(admin_client, media_root):
    response = upload(admin_client, PNG, "Mara River Lodge.PNG")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"success", "url", "key"}
    assert body["success"] is True
    assert body["key"].startswith("catalog/")
    assert body["key"].endswith("-mara-river-lodge.png")
    assert body["url"] == f"{BASE_URL}/{body['key']}"

    stored = media_root / body["key"]
    assert stored.read_bytes() == PNG
    assert stat.S_IMODE(stored.stat().st_mode) == 0o644
    assert stat.S_IMODE(stored.parent.stat().st_mode) == 0o755
    # No temporary files left behind
    assert not [p for p in media_root.rglob(".upload-*")]


def test_upload_requires_admin(media_root):
    response = upload(TestClient(app), PNG)
    assert response.status_code in (401, 403)
    assert not any(media_root.rglob("*.*"))


def test_upload_rejects_non_image_content_type(admin_client, media_root):
    response = upload(admin_client, b"hello", "notes.txt", "text/plain")
    assert response.status_code == 400
    assert response.json() == {"success": False, "error": "Only image uploads are allowed"}
    assert not any(p.is_file() for p in media_root.rglob("*"))


@pytest.mark.parametrize(
    "data,filename",
    [
        (b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "x.svg"),
        (b"<html><script>alert(1)</script></html>", "x.png"),
        (b"#!/bin/sh\nrm -rf /\n", "x.jpg"),
    ],
)
def test_upload_rejects_spoofed_image_content(admin_client, media_root, data, filename):
    response = upload(admin_client, data, filename, "image/png")
    assert response.status_code == 400
    assert response.json()["error"] == "Only image uploads are allowed"
    assert not any(p.is_file() for p in media_root.rglob("*"))


def test_upload_rejects_files_over_size_limit(admin_client, media_root):
    response = upload(admin_client, PNG + b"\x00" * 2048)
    assert response.status_code == 413
    assert response.json()["success"] is False
    assert not any(p.is_file() for p in media_root.rglob("*"))


def test_extension_comes_from_content_not_filename(admin_client, media_root):
    response = upload(admin_client, JPEG, "evil.php", "image/jpeg")
    assert response.status_code == 200
    key = response.json()["key"]
    assert key.endswith("-evil.jpg")
    assert ".php" not in key


@pytest.mark.parametrize(
    "filename",
    ["../../../etc/passwd.png", "..\\..\\windows\\x.png", "/etc/cron.d/x.png", "a/../../b.png"],
)
def test_traversal_filenames_stay_inside_media_root(admin_client, media_root, filename):
    response = upload(admin_client, PNG, filename)
    assert response.status_code == 200
    key = response.json()["key"]
    stored = (media_root / key).resolve()
    assert stored.is_relative_to(media_root.resolve())
    assert ".." not in key and "\\" not in key
    files = [p for p in media_root.rglob("*") if p.is_file()]
    assert files == [stored]


def test_replacement_upload_creates_new_file_and_keeps_previous(admin_client, media_root):
    # Admin "replace image" = upload a new file, then PATCH the record's image.
    first = upload(admin_client, PNG, "hotel.png").json()
    second = upload(admin_client, WEBP, "hotel.webp", "image/webp").json()

    assert first["key"] != second["key"]
    assert second["key"].endswith(".webp")
    assert (media_root / first["key"]).read_bytes() == PNG
    assert (media_root / second["key"]).read_bytes() == WEBP


def test_same_name_uploads_in_same_second_do_not_collide(admin_client, media_root):
    keys = {upload(admin_client, PNG, "same.png").json()["key"] for _ in range(5)}
    assert len(keys) == 5


def test_storage_error_returns_controlled_500(admin_client, monkeypatch):
    def broken(*args, **kwargs):
        raise OSError("disk full")

    monkeypatch.setattr(media_storage.LocalMediaStorage, "save", broken)
    response = upload(admin_client, PNG)
    assert response.status_code == 500
    assert response.json() == {"success": False, "error": "Failed to upload image"}


# ---------------------------------------------------------- storage backend
def test_files_persist_across_storage_instances(media_root):
    # Simulates a container restart/redeploy: a fresh storage object pointing at
    # the same (bind-mounted) directory sees previously written files.
    key = "catalog/2026/11/16/persist.png"
    LocalMediaStorage(media_root, BASE_URL).save(key, PNG)

    restarted = LocalMediaStorage(media_root, BASE_URL)
    assert restarted.exists(key)
    with restarted.open(key) as handle:
        assert handle.read() == PNG


def test_retrieve_and_delete(media_root):
    storage = LocalMediaStorage(media_root, BASE_URL)
    key = "assets/hotels/mara.jpg"
    storage.save(key, JPEG)

    assert storage.url_for(key) == f"{BASE_URL}/assets/hotels/mara.jpg"
    assert storage.path_for(key) == (media_root / key).resolve()
    assert storage.delete(key) is True
    assert not storage.exists(key)
    assert storage.delete(key) is False


def test_save_never_overwrites_existing_file(media_root):
    storage = LocalMediaStorage(media_root, BASE_URL)
    storage.save("catalog/x.png", PNG)
    with pytest.raises(media_storage.MediaStorageError):
        storage.save("catalog/x.png", JPEG)
    assert (media_root / "catalog/x.png").read_bytes() == PNG


@pytest.mark.parametrize(
    "key",
    [
        "../outside.png",
        "catalog/../../outside.png",
        "/etc/passwd",
        "catalog\\..\\x.png",
        ".hidden.png",
        "catalog/.upload-1.tmp",
        "catalog//x.png/..",
        "",
        "catalog/x\x00.png",
    ],
)
def test_unsafe_keys_are_rejected(media_root, key):
    storage = LocalMediaStorage(media_root, BASE_URL)
    with pytest.raises(UnsafeMediaPathError):
        storage.path_for(key)
    with pytest.raises(UnsafeMediaPathError):
        storage.save(key, PNG)
    assert not storage.exists(key)


def test_symlinked_directory_cannot_escape_root(media_root, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    os.symlink(outside, media_root / "escape")
    storage = LocalMediaStorage(media_root, BASE_URL)
    with pytest.raises(UnsafeMediaPathError):
        storage.save("escape/x.png", PNG)
    assert not any(outside.iterdir())


def test_detect_image_type():
    assert detect_image_type(PNG) == ("png", "image/png")
    assert detect_image_type(JPEG) == ("jpg", "image/jpeg")
    assert detect_image_type(WEBP) == ("webp", "image/webp")
    assert detect_image_type(b"GIF89a" + b"\x00" * 10) == ("gif", "image/gif")
    assert detect_image_type(b"<svg></svg>") is None


def test_build_catalog_key_is_safe():
    key = build_catalog_key("../../My Photo!!.JPEG", "jpg")
    assert key.startswith("catalog/")
    assert key.endswith("-my-photo.jpg")
    assert ".." not in key


# ------------------------------------------------- legacy reference audit
from app.media_audit import Reference, audit, resolve_key  # noqa: E402


@pytest.mark.parametrize(
    "value,expected",
    [
        ("assets/hotels/mara.jpg", ("local", "assets/hotels/mara.jpg")),
        ("/assets/hotels/mara.jpg", ("local", "assets/hotels/mara.jpg")),
        (
            "https://uhambo-s3-bucket.s3.eu-north-1.amazonaws.com/catalog/2026/09/21/1-x.jpg",
            ("local", "catalog/2026/09/21/1-x.jpg"),
        ),
        (
            "https://uhambo-s3-bucket.s3.amazonaws.com/catalog/noah.jpg",
            ("local", "assets/vehicles/noah.jpg"),
        ),
        (
            "https://d2fbz2lzk71lum.cloudfront.net/assets/hotels/Mara%20Lodge.JPG",
            ("local", "assets/hotels/Mara Lodge.JPG"),
        ),
        (f"{BASE_URL}/catalog/2026/11/16/1-ab-x.png", ("local", "catalog/2026/11/16/1-ab-x.png")),
        ("https://images.unsplash.com/photo-1", ("external", None)),
        ("https://api.uhamboeastafrica.com/api/hotels", ("external", None)),
        ("data:image/png;base64,AAAA", ("inline", None)),
    ],
)
def test_resolve_key_maps_legacy_references_to_local_keys(value, expected):
    assert resolve_key(value, BASE_URL) == expected


def test_audit_reports_missing_files_without_modifying_anything(media_root, capsys):
    storage = LocalMediaStorage(media_root, BASE_URL)
    storage.save("assets/hotels/present.jpg", JPEG)
    refs = [
        Reference("hotels:1", "assets/hotels/present.jpg", "local", "assets/hotels/present.jpg"),
        Reference("hotels:2", "assets/hotels/gone.jpg", "local", "assets/hotels/gone.jpg"),
        Reference("vehicles:3", "https://images.unsplash.com/x", "external", None),
    ]
    before = sorted(p for p in media_root.rglob("*"))

    assert audit(refs, storage) == 1
    out = capsys.readouterr().out
    assert "MISSING  assets/hotels/gone.jpg  <- hotels:2" in out
    assert "present files: 1 unique" in out
    assert sorted(p for p in media_root.rglob("*")) == before
