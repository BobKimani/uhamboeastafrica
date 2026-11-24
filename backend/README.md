# Uhambo Backend

The FastAPI backend uses PostgreSQL with standard username/password
authentication. On the VPS, PostgreSQL runs as the `db` service in the Docker
Compose project at `/opt/uhambo/compose.yaml`, and the backend reaches it over
the internal Docker network at `db:5432`.

## Required Database Environment

Set these in `backend/.env` (never commit real values; see `.env.example`):

```env
DB_HOST=db            # Docker service name; use localhost for a local Postgres
DB_PORT=5432
DB_NAME=<database_name>
DB_USER=<database_user>
DB_PASSWORD=<database_password>
DB_SSLMODE=disable    # internal Docker network; use require for a remote database
```

Special characters in `DB_PASSWORD` are escaped automatically, and the password
is masked whenever the connection URL is logged.

Quick connectivity check from the VPS (runs inside the existing db container):

```bash
docker compose -f /opt/uhambo/compose.yaml exec db \
  psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;"
```

## Docker (VPS)

`deployment/compose.backend.yaml` adds only the `backend` service to the
existing VPS Compose project; it does not define or modify the `db` service or
its volume. From `/opt/uhambo`:

```bash
docker compose -f compose.yaml -f <path-to>/backend/deployment/compose.backend.yaml config
docker compose -f compose.yaml -f <path-to>/backend/deployment/compose.backend.yaml up -d --build backend
docker inspect --format '{{.State.Health.Status}}' uhambo-backend
```

The container listens on port 8000 (published on `127.0.0.1:8000` for the host
Nginx reverse proxy) and Docker monitors it through `GET /health`.

## Media Storage (local, replaces S3/CloudFront)

Uploaded images are written to `MEDIA_ROOT` (`/app/uploads` in the container),
bind-mounted from `/srv/uhambo/uploads` on the VPS, and served by Nginx directly
at `MEDIA_BASE_URL` (`https://api.uhamboeastafrica.com/media/`). Files survive
container restarts, rebuilds and redeploys because they live on the host.

```env
MEDIA_ROOT=/app/uploads
MEDIA_BASE_URL=https://api.uhamboeastafrica.com/media
MEDIA_MAX_UPLOAD_BYTES=10485760
```

- `POST /api/uploads/catalog-image` keeps its request/response format
  (`{"success": true, "url": ..., "key": ...}`) and the S3 key layout
  (`catalog/YYYY/MM/DD/<timestamp>-<token>-<name>.<ext>`).
- Only JPEG, PNG, GIF, WebP and AVIF are accepted, verified by file content
  (not the client's content type or extension). SVG is rejected.
- Filenames are slugged; the extension comes from the detected type. Keys are
  validated so files can never be written outside `MEDIA_ROOT`, and existing
  files are never overwritten. Files are `0644`, directories `0755`.
- As before with S3, replacing an image uploads a new file and the old file is
  kept; deleting a hotel/vehicle does not delete its image file.

One-time host setup (the container runs as UID/GID `10001`):

```bash
sudo mkdir -p /srv/uhambo/uploads
sudo chown -R 10001:10001 /srv/uhambo/uploads
sudo chmod 755 /srv/uhambo/uploads
```

Nginx: see `deployment/nginx/api.uhamboeastafrica.com.conf` (serves image files
only from `/media/`, blocks hidden files, symlinks and directory listings, and
proxies everything else to FastAPI). `/srv/uhambo/uploads` must not itself be a
symlink, because the config uses `disable_symlinks on`.

### Migrating existing S3/CloudFront images

Database records are **not** rewritten and S3 objects are **not** deleted.
Existing references keep working because S3 keys are copied 1:1 and the
frontend maps S3/CloudFront URLs onto `NEXT_PUBLIC_MEDIA_URL` by path.

1. Copy the bucket (read-only on S3, never uses `--delete`):
   ```bash
   ./deployment/migrate-s3-media.sh --dry-run
   ./deployment/migrate-s3-media.sh
   ```
2. Verify every database reference resolves to a local file (read-only):
   ```bash
   docker compose -f compose.yaml -f <path>/compose.backend.yaml exec backend python -m app.media_audit
   ```
   To include the frontend's static media keys, generate a list on a machine
   with the repo and pass it with `--keys-file` (place it under the uploads dir
   so the container can read it), for example:
   ```bash
   grep -rhoE 'mediaUrl\("[^"]+"\)|"(/)?(assets|icons)/[^"]+\.(jpe?g|png|webp|gif|avif|ico)"' \
     frontend/lib frontend/components frontend/app \
     | sed -E 's/^mediaUrl\("//; s/"\)$//; s/^"//; s/"$//; s#^/##' | sort -u \
     > /srv/uhambo/uploads/.frontend-keys.txt
   docker compose ... exec backend python -m app.media_audit --keys-file /app/uploads/.frontend-keys.txt
   ```
   The audit exits non-zero and lists `MISSING` keys if anything is absent.
3. Spot-check in a browser: `https://api.uhamboeastafrica.com/media/assets/hotels/<file>.jpg`.
4. Keep the S3 bucket and CloudFront distribution until the site has been
   verified on the VPS; decommissioning them is a separate, manual step.

## Admin Authentication (local, replaces AWS Cognito)

Administrators sign in with email and password on the frontend `/auth` page.
There is no public registration and no default account.

- **Accounts**: `admin_users` table. Passwords are stored only as Argon2id
  hashes (argon2-cffi defaults, RFC 9106 low-memory profile). Emails are
  case-insensitive.
- **Sessions**: `admin_sessions` table. A random 256-bit token is set in the
  `uhambo_admin_session` cookie (`HttpOnly; Secure; SameSite=Lax; Path=/`,
  host-only for `api.uhamboeastafrica.com`); only its SHA-256 hash is stored.
  Sessions expire 8 hours after login (hard maximum) and are revoked on logout,
  password change, `revoke-sessions`, or when the administrator is disabled.
- **CSRF**: every non-GET request to an admin endpoint must send
  `X-CSRF-Token` (an HMAC of the session token keyed by `SESSION_SECRET`,
  returned by `/auth/login` and `/auth/me`; the frontend keeps it in memory)
  and, from browsers, an `Origin` in `CORS_ALLOWED_ORIGINS`.
- **Rate limiting**: `admin_login_attempts` table. 5 failed attempts per email
  or 20 per IP within 15 minutes lock further attempts (HTTP 429 with
  `Retry-After`). Configure with `ADMIN_LOGIN_*`.
- Accounts, sessions and attempts live in PostgreSQL, so they persist across
  container restarts and redeploys.

Endpoints:

| Endpoint | Behaviour |
|---|---|
| `POST /auth/login` | `{"email","password"}` → `{"authenticated": true, "user": {...}, "csrfToken": "..."}` and sets the cookie; `401` `{"authenticated": false, "user": null, "error": "Invalid email or password"}`; `429` when rate limited |
| `GET /auth/me` | Same `user` shape as before (`sub`, `email`, `name`, `groups`, `isAdmin`) plus `csrfToken`; `401` when not signed in |
| `POST /auth/logout` | Revokes the session (requires `X-CSRF-Token`), clears the cookie |
| `GET /auth/login`, `GET /auth/logout` | Redirect to the frontend login page (former Cognito links); they do not change any state |

### Provisioning administrators

Cognito passwords cannot be exported, so each administrator gets a new password.

1. Apply the migration once (additive; creates only the three tables above):
   ```bash
   docker compose -f /opt/uhambo/compose.yaml exec -T db \
     psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < db/migrations/20261116_admin_auth.sql
   ```
2. Ensure `SESSION_SECRET` (≥ 32 random characters) is set in the backend env,
   `SESSION_HTTPS_ONLY=true`, and `SESSION_MAX_AGE_SECONDS=28800`.
3. Create each administrator (password prompted twice, hidden; never passed as
   an argument):
   ```bash
   docker compose -f compose.yaml -f <path>/compose.backend.yaml exec backend \
     python -m app.admin_cli create --email first.admin@example.com --name "First Admin"
   docker compose ... exec backend python -m app.admin_cli create --email second.admin@example.com --name "Second Admin"
   ```
   Passwords must be 12–256 characters. Share initial passwords out of band
   (e.g. a password manager); each administrator should change theirs with
   `set-password` after first sign-in.
4. Manage accounts:
   ```bash
   docker compose ... exec backend python -m app.admin_cli list
   docker compose ... exec backend python -m app.admin_cli set-password --email first.admin@example.com
   docker compose ... exec backend python -m app.admin_cli disable --email first.admin@example.com   # also signs out
   docker compose ... exec backend python -m app.admin_cli enable --email first.admin@example.com
   docker compose ... exec backend python -m app.admin_cli revoke-sessions --email first.admin@example.com
   docker compose ... exec backend python -m app.admin_cli purge-sessions   # housekeeping
   ```

The Cognito user pool is no longer used by the application; it was not
modified or deleted. Remove it manually only after the VPS login is verified.

## Transport Pricing (route-based)

Transport is priced per trip from route distance, in KES, by the backend only
(`app/services/transport_pricing.py`):

```
legs     = 2 for one way and return (the vehicle always drives back)
fuel     = distance_km / vehicle km_per_litre * fuel_price_kes * legs
driver   = fuel / 2
total    = round_half_up((fuel + driver + margin_kes) * multiplier)
```

- Admin → Transport edits the fuel price, margin and multiplier
  (`transport_pricing_settings`), routes/distances (`transport_places`,
  `transport_routes`) and each vehicle's km/L (`vehicles.km_per_litre`).
- Each booking stores a `transport_quote` snapshot, so later price changes never
  alter existing bookings. If the price changes between quote and booking the
  API returns 409 `price_changed` with the new quote.
- Routes flagged `needs_review` and unlisted routes become quote requests
  (`quote_requested`, no online payment).
- Load the chart data once (idempotent): `python -m app.seed_transport`
  (`db/seeds/transport_routes.seed.json`, generated from
  `UHAMBO TRANSPORT PRICE CHART.xlsx`).

## Local Backend Check

```bash
cd backend
python3 -m venv uhambo
source uhambo/bin/activate
pip install -r requirements.txt
python -m pytest
python -c "import app.main; print('backend import ok')"
uvicorn app.main:app --reload --port 8000
curl -i http://localhost:8000/health
```

The health endpoint returns only safe status information:

```json
{
  "status": "healthy",
  "database": "connected"
}
```

## Database Migrations

Schema changes are plain SQL files in `backend/db/migrations/`. The project does
not use Alembic. Migrations should be forward-only and non-destructive unless a
feature explicitly requires removing an obsolete column.

Apply a migration with `psql`. On the VPS, pipe it into the existing db container:

```bash
docker compose -f /opt/uhambo/compose.yaml exec -T db \
  psql -U "$DB_USER" -d "$DB_NAME" < db/migrations/20260921_hotel_rates.sql
```

Alternatively, run the SQL through the app's configured SQLAlchemy session:

```bash
uhambo/bin/python - <<'PY'
from pathlib import Path
from sqlalchemy import text
from app.db.session import SessionLocal

sql = Path("db/migrations/20260921_hotel_rates.sql").read_text(encoding="utf-8")
with SessionLocal() as db:
    db.execute(text(sql))
    db.commit()
PY
```

### Hotel Rates

`20260921_hotel_rates.sql` adds the nullable `hotels.rates jsonb` column used by
the current SQLAlchemy `Hotel` model. The value stores contract rates by
currency and room type:

```json
{
  "KES": {
    "sharing": {
      "monthly": [12000, null, null, null, null, null, null, null, null, null, null, null],
      "festive": null
    }
  }
}
```

Verify the column after applying the migration:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hotels'
  AND column_name = 'rates';
```

Expected result: `rates`, `jsonb`, nullable, no default.
