#!/usr/bin/env bash
# Safe wrapper around `docker compose` for the Uhambo VPS project.
#
#   sudo /opt/uhambo/source/deployment/vps/uhambo-compose.sh <compose command> [args]
#
# - Always runs in /opt/uhambo with compose.yaml + the backend/frontend overrides,
#   so the existing project (and its PostgreSQL container/volume) is reused.
# - Exports frontend build values from /etc/uhambo/frontend.env.
# - Refuses commands that could stop, remove or recreate PostgreSQL or delete
#   volumes, and makes `up` use --no-deps so `db` is never touched.
# - Uses the image tag in /etc/uhambo/image-tag unless UHAMBO_IMAGE_TAG is set.
set -euo pipefail

UHAMBO_DIR="${UHAMBO_DIR:-/opt/uhambo}"
UHAMBO_ENV_DIR="${UHAMBO_ENV_DIR:-/etc/uhambo}"
DB_SERVICE="${UHAMBO_DB_SERVICE:-db}"
APP_SERVICES=(backend frontend)

die() { echo "uhambo-compose: $*" >&2; exit 1; }

[[ -f "$UHAMBO_DIR/compose.yaml" ]] || die "$UHAMBO_DIR/compose.yaml not found"
[[ -r "$UHAMBO_ENV_DIR/frontend.env" ]] || die "$UHAMBO_ENV_DIR/frontend.env not readable (run with sudo?)"
[[ -r "$UHAMBO_ENV_DIR/backend.env" ]] || die "$UHAMBO_ENV_DIR/backend.env not readable (run with sudo?)"

# Frontend build-time values (NEXT_PUBLIC_*, BACKEND_API_URL) for interpolation.
set -a
# shellcheck disable=SC1091
. "$UHAMBO_ENV_DIR/frontend.env"
set +a
export UHAMBO_BACKEND_ENV_FILE="${UHAMBO_BACKEND_ENV_FILE:-$UHAMBO_ENV_DIR/backend.env}"
if [[ -z "${UHAMBO_IMAGE_TAG:-}" && -r "$UHAMBO_ENV_DIR/image-tag" ]]; then
  UHAMBO_IMAGE_TAG="$(tr -d '[:space:]' < "$UHAMBO_ENV_DIR/image-tag")"
fi
export UHAMBO_IMAGE_TAG="${UHAMBO_IMAGE_TAG:-latest}"

compose() {
  docker compose --project-directory "$UHAMBO_DIR" \
    -f "$UHAMBO_DIR/compose.yaml" \
    -f "$UHAMBO_DIR/source/backend/deployment/compose.backend.yaml" \
    -f "$UHAMBO_DIR/source/frontend/deployment/compose.frontend.yaml" \
    "$@"
}

[[ $# -gt 0 ]] || die "usage: $0 <config|build|up|ps|logs|exec|stop|restart|images|top> [args]"
cmd="$1"
shift

# ---------------------------------------------------------------- guards
case "$cmd" in
  down|rm|kill)
    die "'$cmd' would also stop/remove the PostgreSQL container. Use: $0 stop backend frontend" ;;
esac
for arg in "$@"; do
  case "$arg" in
    -v|--volumes|--remove-orphans|--renew-anon-volumes|-V|--force-recreate)
      die "'$arg' is not allowed through this wrapper (could affect PostgreSQL or volumes)" ;;
  esac
done

case "$cmd" in
  up|stop|start|restart|build|pull|create|run|pause|unpause)
    services=()
    for arg in "$@"; do [[ "$arg" == -* ]] || services+=("$arg"); done
    for svc in ${services[@]+"${services[@]}"}; do
      [[ "$svc" == "$DB_SERVICE" ]] && die "refusing to '$cmd' the PostgreSQL service '$DB_SERVICE'"
    done
    if [[ "$cmd" != build && ${#services[@]} -eq 0 ]]; then
      die "name the services explicitly, e.g.: $0 $cmd ${APP_SERVICES[*]}"
    fi
    ;;
esac

# The existing PostgreSQL container must be running in this same project;
# otherwise Compose is pointed at a different project and would create a
# second, empty database.
if [[ "$cmd" != config ]]; then
  if ! compose ps --status running --services 2>/dev/null | grep -qx "$DB_SERVICE"; then
    die "PostgreSQL service '$DB_SERVICE' is not running in the Compose project at $UHAMBO_DIR — refusing to continue"
  fi
fi

if [[ "$cmd" == up ]]; then
  has_no_deps=false
  for arg in "$@"; do [[ "$arg" == --no-deps ]] && has_no_deps=true; done
  $has_no_deps || set -- --no-deps "$@"
fi

echo "uhambo-compose: image tag ${UHAMBO_IMAGE_TAG}" >&2
compose "$cmd" "$@"
