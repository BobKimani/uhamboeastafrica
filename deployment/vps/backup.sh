#!/usr/bin/env bash
# Back up the Uhambo PostgreSQL database (and optionally media) on the VPS.
# Read-only for the database; never deletes existing backups.
#
#   sudo /opt/uhambo/source/deployment/vps/backup.sh            # database only
#   sudo /opt/uhambo/source/deployment/vps/backup.sh --media    # database + /srv/uhambo/uploads
#
# Output: /var/backups/uhambo/<db>-<UTC timestamp>.dump (pg_dump custom format)
#         /var/backups/uhambo/uploads-<UTC timestamp>.tar.gz (with --media)
# Restore: see DEPLOYMENT.md, "Rollback".
set -euo pipefail

UHAMBO_DIR="${UHAMBO_DIR:-/opt/uhambo}"
DB_SERVICE="${UHAMBO_DB_SERVICE:-db}"
DB_NAME="${DB_NAME:-uhambo}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/uhambo}"
MEDIA_DIR="${UHAMBO_MEDIA_DIR:-/srv/uhambo/uploads}"

db() { docker compose --project-directory "$UHAMBO_DIR" -f "$UHAMBO_DIR/compose.yaml" exec -T "$DB_SERVICE" "$@"; }

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/$DB_NAME-$ts.dump"
media_out="$BACKUP_DIR/uploads-$ts.tar.gz"
# Never leave half-written files that could be mistaken for a backup.
trap 'rm -f "$out.partial" "$media_out.partial"' EXIT

echo "Dumping database '$DB_NAME' from service '$DB_SERVICE'..."
# POSTGRES_USER is the superuser configured in the db container.
db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$1" --format=custom --no-password' _ "$DB_NAME" > "$out.partial"

# Verify the archive is a readable pg_dump archive before keeping it (an empty
# database is valid: e.g. the pre-migration backup has no tables yet).
if ! toc="$(db pg_restore --list < "$out.partial")" || [[ -z "$toc" ]]; then
  echo "Backup verification failed: archive is not readable" >&2
  exit 1
fi
tables="$(grep -c ' TABLE ' <<< "$toc" || true)"
mv "$out.partial" "$out"
sha256sum "$out" > "$out.sha256"
echo "OK  $out  ($(du -h "$out" | cut -f1), $tables tables)"

if [[ "${1:-}" == "--media" ]]; then
  tar -C "$(dirname "$MEDIA_DIR")" -czf "$media_out.partial" "$(basename "$MEDIA_DIR")"
  mv "$media_out.partial" "$media_out"
  sha256sum "$media_out" > "$media_out.sha256"
  echo "OK  $media_out  ($(du -h "$media_out" | cut -f1), $(find "$MEDIA_DIR" -type f | wc -l) files)"
fi
