# Uhambo — VPS Deployment Runbook

Target: HostPinnacle VPS — Ubuntu 24.04.5 LTS, 4 vCPU, 6 GB RAM, 100 GB disk,
Docker Engine + Compose v2, PostgreSQL 17 already running in `/opt/uhambo/compose.yaml`.

| Path | Purpose |
|---|---|
| `/opt/uhambo/compose.yaml` | Existing Compose file (PostgreSQL service `db`, database `uhambo`) — not modified |
| `/opt/uhambo/source` | This repository |
| `/etc/uhambo/backend.env` | Backend runtime env + secrets (`0600 root`) |
| `/etc/uhambo/frontend.env` | Frontend build-time values (`0600 root`) |
| `/etc/uhambo/image-tag` | Image tag currently deployed (used for rollback) |
| `/srv/uhambo/uploads` | Media (bind-mounted into the backend, served by Nginx) |
| `/var/backups/uhambo` | Database / media backups (`0700`) |

| Host | Served by |
|---|---|
| `https://www.uhamboeastafrica.com` | Host Nginx → frontend container `127.0.0.1:3000` |
| `https://uhamboeastafrica.com` | 301 → `www` |
| `https://api.uhamboeastafrica.com` | Host Nginx → backend container `127.0.0.1:8000` |
| `https://api.uhamboeastafrica.com/media/` | Host Nginx, directly from `/srv/uhambo/uploads` |

**Always manage the app containers with `deployment/vps/uhambo-compose.sh`.**
It runs in `/opt/uhambo` with `compose.yaml` + both overrides, exports the
frontend build values, refuses `down`/`rm`/`-v`/`--force-recreate` and any
command naming `db`, adds `--no-deps` to `up`, and aborts if the existing `db`
container is not running in that project (which would otherwise mean a second,
empty database). Below, `UC` means:

```bash
UC="sudo /opt/uhambo/source/deployment/vps/uhambo-compose.sh"
```

---

## 0. Prerequisites (verify before starting)

- [ ] DNS for `www`, apex and `api` can be pointed at the VPS (not changed yet).
- [ ] Nginx and Certbot installed on the host (`sudo apt install nginx certbot python3-certbot-nginx`).
- [ ] Ports 80/443 open in the firewall; 3000, 8000 and 5432 **not** exposed publicly.
- [ ] Git access to this repository from the VPS (deploy key or token).
- [ ] 2 GB swap (protects the 6 GB host during the frontend image build):
      `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`
- [ ] AWS access for the one-time data copy: an IAM principal allowed `rds-db:connect`
      to Aurora and `s3:ListBucket`/`s3:GetObject` on the media bucket, from a machine
      that can reach the Aurora endpoint (Aurora is usually VPC-private: use a bastion,
      CloudShell VPC environment, or an ECS one-off task).
- [ ] KCB sandbox credentials (for the post-deploy STK check) and production credentials.
- [ ] Google Maps browser key, restricted to `https://www.uhamboeastafrica.com/*`.
- [ ] A maintenance window agreed for the final data cutover.

## 1. Inspect the existing PostgreSQL setup (read-only)

```bash
cd /opt/uhambo
docker compose config --services                 # must list: db
docker compose ps db                             # must be running
docker compose ls                                # note the project name (normally "uhambo")
docker compose config | sed -n '/^  db:/,/^  [a-z]/p'   # check networks + ports of db
docker volume ls | grep -i uhambo                # note the data volume name — never remove it
docker compose exec db psql -U postgres -d uhambo -Atc "select version()"   # PostgreSQL 17.x
docker compose exec db psql -U postgres -d uhambo -Atc \
  "select count(*) from information_schema.tables where table_schema='public'"
```

Required outcomes:
- The service is named **`db`** (the overrides depend on it; `config` fails loudly otherwise).
- `db` is on the project's **default** network. If it is only on a custom network,
  add that network to both app services in the overrides before continuing.
- `db` has **no public port** (no `ports:`, or `127.0.0.1:` only). If it publishes
  `5432` on all interfaces, fix that in `compose.yaml` during the maintenance window.
- Note whether the `uhambo` database is **empty** (count = 0) — required for §6.
- If the superuser is not `postgres`, substitute it below (`POSTGRES_USER` in the container).

## 2. Host preparation

```bash
sudo git clone <repo-url> /opt/uhambo/source          # or: git -C /opt/uhambo/source fetch
sudo git -C /opt/uhambo/source checkout feature/VPS-integration   # or the release tag/commit

sudo install -d -m 755 /srv/uhambo/uploads
sudo chown 10001:10001 /srv/uhambo/uploads             # backend container UID/GID
sudo install -d -m 700 /var/backups/uhambo
sudo install -d -m 700 /etc/uhambo
```

`/srv/uhambo/uploads` must be a real directory (not a symlink) — Nginx serves it
with `disable_symlinks on`.

## 3. Database role (once)

Create a dedicated, non-superuser application role that owns the database:

```bash
cd /opt/uhambo
docker compose exec db psql -U postgres -d postgres -c "CREATE ROLE uhambo_app LOGIN"
docker compose exec db psql -U postgres -d postgres -c "\password uhambo_app"   # prompts; nothing in shell history
docker compose exec db psql -U postgres -d postgres -c "ALTER DATABASE uhambo OWNER TO uhambo_app"
```

On PostgreSQL 15+ the `public` schema belongs to the database owner, so
`uhambo_app` can create tables and the trusted `pgcrypto` extension without
superuser rights (verified with PostgreSQL 17).

## 4. Environment files

```bash
cd /opt/uhambo/source/deployment/vps/env
sudo install -m 600 -o root -g root backend.env.example  /etc/uhambo/backend.env
sudo install -m 600 -o root -g root frontend.env.example /etc/uhambo/frontend.env
sudoedit /etc/uhambo/backend.env      # fill every <placeholder>; start with KCB_ENVIRONMENT=sandbox
sudoedit /etc/uhambo/frontend.env     # NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
sudo grep -n '<' /etc/uhambo/*.env    # must print only comment lines
```

Required values are documented inline in both templates (database role,
`SESSION_SECRET`, CORS/frontend URLs, KCB, Maps key). Generate `SESSION_SECRET`
with `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.

## 5. Validate the Compose configuration

```bash
$UC config --quiet && echo CONFIG_OK
$UC config | grep -E 'image: uhambo|published|source: /srv|env_file' -A1
```

Expect: `uhambo-backend`/`uhambo-frontend` images, ports published on
`127.0.0.1` only, the `/srv/uhambo/uploads` bind mount, `/etc/uhambo/backend.env`.

## 6. Data migration — Aurora → VPS PostgreSQL

Rehearse once before the real cutover (same steps, then reset with §12.2).

**6.1 Freeze (maintenance window).** Stop writes on AWS (scale the ECS service to 0
or put the site in maintenance). Make sure no KCB payment is still waiting:
```sql
-- on Aurora
SELECT count(*) FROM payments WHERE status = 'pending';   -- must be 0 (else wait / reconcile)
```

**6.2 Back up the VPS database (even if empty).**
```bash
sudo /opt/uhambo/source/deployment/vps/backup.sh
```

**6.3 Dump Aurora** (on the machine with Aurora access; PostgreSQL 17 client,
custom format, without Aurora-specific owners/grants such as `rds_iam`):
```bash
export AURORA_HOST=<aurora-writer-endpoint> AURORA_USER=<iam-db-user> AURORA_DB=<db-name> AWS_REGION=eu-north-1
export PGPASSWORD="$(aws rds generate-db-auth-token --hostname "$AURORA_HOST" --port 5432 --region "$AWS_REGION" --username "$AURORA_USER")"
docker run --rm -e PGPASSWORD -e PGSSLMODE=require postgres:17 \
  pg_dump -h "$AURORA_HOST" -U "$AURORA_USER" -d "$AURORA_DB" \
  --format=custom --no-owner --no-privileges > aurora-uhambo.dump
docker run --rm -e PGPASSWORD -e PGSSLMODE=require postgres:17 \
  psql -h "$AURORA_HOST" -U "$AURORA_USER" -d "$AURORA_DB" -Atc \
  "select 'hotels',count(*) from hotels union all select 'vehicles',count(*) from vehicles union all select 'bookings',count(*) from bookings union all select 'payments',count(*) from payments union all select 'inquiries',count(*) from inquiries" > aurora-counts.txt
sha256sum aurora-uhambo.dump > aurora-uhambo.dump.sha256
```
(The IAM token is only needed to open the connection; it expires after 15 minutes.)

**6.4 Transfer and verify integrity.**
```bash
scp aurora-uhambo.dump aurora-uhambo.dump.sha256 aurora-counts.txt <vps>:/tmp/
# on the VPS
cd /tmp && sha256sum -c aurora-uhambo.dump.sha256
sudo install -m 600 aurora-uhambo.dump aurora-counts.txt /var/backups/uhambo/ && rm aurora-uhambo.dump
```

**6.5 Restore** — only into the empty database from §1; all-or-nothing:
```bash
cd /opt/uhambo
docker compose exec -T db psql -U postgres -d uhambo -Atc \
  "select count(*) from information_schema.tables where table_schema='public'"   # must be 0
sudo cat /var/backups/uhambo/aurora-uhambo.dump | docker compose exec -T db \
  pg_restore -U uhambo_app -d uhambo --no-owner --no-privileges --exit-on-error --single-transaction
```
If the database is **not** empty, stop: do not restore over existing data.

**6.6 Apply migrations** (all additive and idempotent; adds the admin-auth tables):
```bash
for f in /opt/uhambo/source/backend/db/migrations/*.sql; do
  echo "== $f"
  docker compose exec -T db psql -U uhambo_app -d uhambo -v ON_ERROR_STOP=1 < "$f"
done
```

**6.7 Verify.**
```bash
docker compose exec -T db psql -U uhambo_app -d uhambo -Atc \
  "select 'hotels',count(*) from hotels union all select 'vehicles',count(*) from vehicles union all select 'bookings',count(*) from bookings union all select 'payments',count(*) from payments union all select 'inquiries',count(*) from inquiries" \
  | diff - <(sudo cat /var/backups/uhambo/aurora-counts.txt) && echo COUNTS_MATCH
docker compose exec -T db psql -U uhambo_app -d uhambo -Atc \
  "select string_agg(tablename, ',' order by tablename) from pg_tables where schemaname='public'"
# expect: admin_login_attempts,admin_sessions,admin_users,bookings,hotels,inquiries,payments,vehicles
sudo /opt/uhambo/source/deployment/vps/backup.sh       # post-migration backup
```

## 7. Media migration — S3 → `/srv/uhambo/uploads`

Read-only on S3 (never `--delete`); database references are not rewritten.
```bash
sudo -E /opt/uhambo/source/backend/deployment/migrate-s3-media.sh --dry-run
sudo -E /opt/uhambo/source/backend/deployment/migrate-s3-media.sh
```
(Requires AWS CLI + read credentials on the VPS; alternatively run it elsewhere
and `rsync -a` the result to `/srv/uhambo/uploads`, then re-run the
`chown -R 10001:10001` / `chmod` lines from the script.)
The audit (step 9.4) confirms every referenced file exists.

## 8. Build and start the containers

Build one image at a time (the frontend build peaks at ~2–3 GB RAM):
```bash
TAG=$(git -C /opt/uhambo/source rev-parse --short HEAD)
UHAMBO_IMAGE_TAG=$TAG $UC build backend
UHAMBO_IMAGE_TAG=$TAG $UC build frontend
echo "$TAG" | sudo tee /etc/uhambo/image-tag
$UC up -d backend frontend                       # --no-deps added by the wrapper
$UC ps                                           # both "healthy" within ~1 minute
```

Memory budget (limits set in the overrides): backend ≤ 768 MB (2 uvicorn
workers), frontend ≤ 768 MB; PostgreSQL, Nginx and the OS use the rest.
Tune with `UHAMBO_BACKEND_MEMORY`, `UHAMBO_FRONTEND_MEMORY`, `UHAMBO_BACKEND_WORKERS`.

## 9. Administrators, Nginx and TLS

**9.1 Administrators** (Cognito passwords cannot be migrated):
```bash
$UC exec backend python -m app.admin_cli create --email <admin1-email> --name "<Admin One>"
$UC exec backend python -m app.admin_cli create --email <admin2-email> --name "<Admin Two>"
$UC exec backend python -m app.admin_cli list
```

**9.2 Local smoke test (before DNS):**
```bash
curl -fsS http://127.0.0.1:8000/health                 # {"status":"healthy","database":"connected"}
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/            # 200
curl -fsS http://127.0.0.1:3000/api/hotels | head -c 120; echo              # via Next.js rewrite -> backend:8000
```

**9.3 Nginx + certificates.**
```bash
sudo cp /opt/uhambo/source/backend/deployment/nginx/api.uhamboeastafrica.com.conf  /etc/nginx/sites-available/
sudo cp /opt/uhambo/source/frontend/deployment/nginx/www.uhamboeastafrica.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.uhamboeastafrica.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/www.uhamboeastafrica.com.conf /etc/nginx/sites-enabled/
```
Certificates need DNS pointing at the VPS (HTTP-01). Either issue them right
after the DNS switch, or use a DNS-01 challenge beforehand:
```bash
sudo certbot certonly --nginx -d www.uhamboeastafrica.com -d uhamboeastafrica.com
sudo certbot certonly --nginx -d api.uhamboeastafrica.com
sudo nginx -t && sudo systemctl reload nginx
```
(Until certificates exist, `nginx -t` fails for the TLS server blocks — enable
the two site files only after issuing them.)

**9.4 Media audit (read-only):**
```bash
$UC exec backend python -m app.media_audit        # exit 0 = every referenced image exists
```

## 10. Cutover and verification

1. Switch DNS for `www`, apex and `api` to the VPS (manual, outside this repo).
2. Verify:
   ```bash
   curl -fsS https://api.uhamboeastafrica.com/health
   curl -sI  https://uhamboeastafrica.com | grep -i '^location'                   # https://www...
   curl -s -o /dev/null -w '%{http_code}\n' https://api.uhamboeastafrica.com/api/bookings   # 401
   curl -sI  https://api.uhamboeastafrica.com/media/<known-file>.jpg | head -3    # 200 image/*
   ```
3. Browser: sign in at `https://www.uhamboeastafrica.com/auth`, open every admin
   page, upload an image, sign out.
4. KCB: with `KCB_ENVIRONMENT=sandbox`, run one STK push and confirm the callback
   marks the booking paid. Then set production KCB values in
   `/etc/uhambo/backend.env` and `$UC up -d backend` (startup validation refuses
   incomplete production settings).

## 11. Operations

```bash
$UC ps                                  # status + health
$UC logs -f --tail=200 backend          # logs (rotated: 5 × 10 MB per container)
$UC logs -f --tail=200 frontend
docker stats --no-stream                # memory/CPU vs limits
sudo /opt/uhambo/source/deployment/vps/backup.sh --media     # schedule daily via cron/systemd timer
$UC exec backend python -m app.admin_cli purge-sessions      # occasional housekeeping
df -h / /srv /var/lib/docker && docker system df
```

**Update to a new release:**
```bash
sudo git -C /opt/uhambo/source fetch && sudo git -C /opt/uhambo/source checkout <release>
TAG=$(git -C /opt/uhambo/source rev-parse --short HEAD)
sudo /opt/uhambo/source/deployment/vps/backup.sh
UHAMBO_IMAGE_TAG=$TAG $UC build backend && UHAMBO_IMAGE_TAG=$TAG $UC build frontend
# apply any new files in backend/db/migrations/ as in §6.6
PREV=$(cat /etc/uhambo/image-tag); echo "$TAG" | sudo tee /etc/uhambo/image-tag
$UC up -d backend frontend && $UC ps
docker image prune -f                   # keep tagged images for rollback; remove dangling only
```

## 12. Rollback

**12.1 Application release** (images are tagged per commit):
```bash
echo "$PREV" | sudo tee /etc/uhambo/image-tag
$UC up -d backend frontend
```

**12.2 Database** (restore a backup from `/var/backups/uhambo`; destructive to
current data in `uhambo` — take a fresh backup first):
```bash
$UC stop backend frontend
cd /opt/uhambo
docker compose exec db psql -U postgres -d postgres -c "DROP DATABASE uhambo WITH (FORCE)"
docker compose exec db psql -U postgres -d postgres -c "CREATE DATABASE uhambo OWNER uhambo_app"
sudo cat /var/backups/uhambo/<backup>.dump | docker compose exec -T db \
  pg_restore -U uhambo_app -d uhambo --no-owner --no-privileges --exit-on-error --single-transaction
$UC up -d backend frontend
```
This recreates the *database* inside the same PostgreSQL instance; the
container and its volume are untouched.

**12.3 Cutover rollback:** point DNS back to AWS (still intact — nothing in AWS
is modified or deleted by this procedure). Bookings/payments created on the VPS
after cutover must be reconciled manually.

**12.4 Media:** S3 is never modified; `/srv/uhambo/uploads` can be restored
from `uploads-<ts>.tar.gz` with `sudo tar -C /srv/uhambo -xzf <file>`.

## 13. Security notes

- App containers: non-root (backend UID 10001, frontend `nextjs`), all Linux
  capabilities dropped, `no-new-privileges`, memory/CPU limits, ports on
  `127.0.0.1` only, log rotation.
- PostgreSQL: reachable only on the Compose network (verify §1); the app uses a
  non-superuser role.
- Secrets live only in `/etc/uhambo/*.env` (`0600 root`) — never in the repo or images.
- Backups are `0600` in a `0700` directory; copy them off the VPS regularly.
- The application has never sent email; there is no SMTP configuration to set.
