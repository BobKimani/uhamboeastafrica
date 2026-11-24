#!/usr/bin/env bash
# Copy existing media from the S3 bucket to local VPS storage.
#
# SAFE BY DESIGN:
#   * Read-only on S3: uses `aws s3 sync` WITHOUT --delete, so nothing in the
#     bucket (or in the local directory) is ever removed.
#   * Never touches the database. Keys are copied 1:1, so existing DB values
#     (S3 URLs, CloudFront URLs, relative keys) resolve to the same paths under
#     MEDIA_BASE_URL without rewriting any records.
#   * Re-runnable: only new/changed objects are downloaded.
#
# Requirements (on the VPS or any machine with access to the bucket):
#   - AWS CLI v2 with read access to the bucket (s3:ListBucket, s3:GetObject)
#   - sudo rights to set ownership on the media directory
#
# Usage:
#   ./migrate-s3-media.sh --dry-run      # show what would be copied
#   ./migrate-s3-media.sh                # copy
#
# Environment overrides:
#   S3_BUCKET   (default uhambo-s3-bucket)
#   AWS_REGION  (default eu-north-1)
#   MEDIA_DIR   (default /srv/uhambo/uploads)
#   APP_UID / APP_GID (default 10001, the backend container user)

set -euo pipefail

S3_BUCKET="${S3_BUCKET:-uhambo-s3-bucket}"
AWS_REGION="${AWS_REGION:-eu-north-1}"
MEDIA_DIR="${MEDIA_DIR:-/srv/uhambo/uploads}"
APP_UID="${APP_UID:-10001}"
APP_GID="${APP_GID:-10001}"

DRY_RUN=()
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=(--dryrun)
fi

if [[ -z "$MEDIA_DIR" || "$MEDIA_DIR" == "/" ]]; then
  echo "Refusing to use MEDIA_DIR='$MEDIA_DIR'" >&2
  exit 1
fi

command -v aws >/dev/null || { echo "AWS CLI not found" >&2; exit 1; }

echo "Source:      s3://${S3_BUCKET} (${AWS_REGION})"
echo "Destination: ${MEDIA_DIR}"
aws sts get-caller-identity --query Arn --output text

echo "Objects in bucket:"
aws s3 ls "s3://${S3_BUCKET}" --recursive --summarize --region "$AWS_REGION" | tail -2

if [[ ${#DRY_RUN[@]} -eq 0 ]]; then
  sudo mkdir -p "$MEDIA_DIR"
  sudo chown "$(id -u):$(id -g)" "$MEDIA_DIR"
fi

# Copy only image types; never --delete.
aws s3 sync "s3://${S3_BUCKET}" "$MEDIA_DIR" \
  --region "$AWS_REGION" \
  --exclude "*" \
  --include "*.jpg" --include "*.jpeg" --include "*.png" --include "*.gif" \
  --include "*.webp" --include "*.avif" --include "*.ico" \
  --include "*.JPG" --include "*.JPEG" --include "*.PNG" --include "*.GIF" \
  --include "*.WEBP" --include "*.AVIF" --include "*.ICO" \
  --only-show-errors \
  "${DRY_RUN[@]}"

if [[ ${#DRY_RUN[@]} -gt 0 ]]; then
  echo "Dry run complete; nothing was copied."
  exit 0
fi

# Ownership for the backend container user; read-only for everyone else (Nginx).
sudo chown -R "${APP_UID}:${APP_GID}" "$MEDIA_DIR"
sudo find "$MEDIA_DIR" -type d -exec chmod 755 {} +
sudo find "$MEDIA_DIR" -type f -exec chmod 644 {} +

echo "Local files: $(sudo find "$MEDIA_DIR" -type f | wc -l)"
echo "Done. Now run the read-only audit inside the backend container:"
echo "  docker compose -f compose.yaml -f <path>/compose.backend.yaml exec backend python -m app.media_audit"
