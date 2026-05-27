#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STATE_FILE="${ATHENA_STATE_FILE:-.deploy/active-slot}"
SLOT_BLUE="${ATHENA_SLOT_BLUE:-blue}"
SLOT_GREEN="${ATHENA_SLOT_GREEN:-green}"

BLUE_BACKEND_PORT="${ATHENA_BLUE_BACKEND_PORT:?ATHENA_BLUE_BACKEND_PORT is required}"
BLUE_FRONTEND_PORT="${ATHENA_BLUE_FRONTEND_PORT:?ATHENA_BLUE_FRONTEND_PORT is required}"
BLUE_SHELL_PORT="${ATHENA_BLUE_SHELL_PORT:?ATHENA_BLUE_SHELL_PORT is required}"
GREEN_BACKEND_PORT="${ATHENA_GREEN_BACKEND_PORT:?ATHENA_GREEN_BACKEND_PORT is required}"
GREEN_FRONTEND_PORT="${ATHENA_GREEN_FRONTEND_PORT:?ATHENA_GREEN_FRONTEND_PORT is required}"
GREEN_SHELL_PORT="${ATHENA_GREEN_SHELL_PORT:?ATHENA_GREEN_SHELL_PORT is required}"

BLUE_BACKEND_NAME="${ATHENA_BLUE_BACKEND_NAME:?ATHENA_BLUE_BACKEND_NAME is required}"
BLUE_FRONTEND_NAME="${ATHENA_BLUE_FRONTEND_NAME:?ATHENA_BLUE_FRONTEND_NAME is required}"
BLUE_SHELL_NAME="${ATHENA_BLUE_SHELL_NAME:?ATHENA_BLUE_SHELL_NAME is required}"
GREEN_BACKEND_NAME="${ATHENA_GREEN_BACKEND_NAME:?ATHENA_GREEN_BACKEND_NAME is required}"
GREEN_FRONTEND_NAME="${ATHENA_GREEN_FRONTEND_NAME:?ATHENA_GREEN_FRONTEND_NAME is required}"
GREEN_SHELL_NAME="${ATHENA_GREEN_SHELL_NAME:?ATHENA_GREEN_SHELL_NAME is required}"

API_UPSTREAM_FILE="${ATHENA_API_UPSTREAM_FILE:?ATHENA_API_UPSTREAM_FILE is required}"
FRONTEND_UPSTREAM_FILE="${ATHENA_FRONTEND_UPSTREAM_FILE:?ATHENA_FRONTEND_UPSTREAM_FILE is required}"
SHELL_UPSTREAM_FILE="${ATHENA_SHELL_UPSTREAM_FILE:?ATHENA_SHELL_UPSTREAM_FILE is required}"
API_UPSTREAM_NAME="${ATHENA_API_UPSTREAM_NAME:?ATHENA_API_UPSTREAM_NAME is required}"
FRONTEND_UPSTREAM_NAME="${ATHENA_FRONTEND_UPSTREAM_NAME:?ATHENA_FRONTEND_UPSTREAM_NAME is required}"
SHELL_UPSTREAM_NAME="${ATHENA_SHELL_UPSTREAM_NAME:?ATHENA_SHELL_UPSTREAM_NAME is required}"

COMPOSE=(docker compose -f docker-compose.auditsense.yaml)
PUBLIC_HEALTH_URL="${ATHENA_PUBLIC_HEALTH_URL:-}"
PUBLIC_HEALTH_SUCCESS_COUNT="${ATHENA_PUBLIC_HEALTH_SUCCESS_COUNT:-3}"
DRAIN_SECONDS="${ATHENA_DRAIN_SECONDS:-20}"
BLUE_PROJECT="${ATHENA_BLUE_PROJECT:?ATHENA_BLUE_PROJECT is required}"
GREEN_PROJECT="${ATHENA_GREEN_PROJECT:?ATHENA_GREEN_PROJECT is required}"

mkdir -p "$(dirname "$STATE_FILE")"

health_ok_backend() {
  local port="$1"
  curl -sfS --connect-timeout 3 "http://127.0.0.1:${port}/health" >/dev/null 2>&1
}

health_ok_http() {
  local port="$1"
  curl -sfS --connect-timeout 3 "http://127.0.0.1:${port}/" >/dev/null 2>&1
}

dump_container_diagnostics() {
  local name="$1"
  echo "===== docker ps (${name}) ====="
  docker ps -a --filter "name=^/${name}$" || true
  echo "===== docker logs (${name}) ====="
  docker logs "$name" 2>&1 || true
}

wait_for() {
  local label="$1"
  local check_fn="$2"
  local port="$3"
  local attempts="${4:-90}"
  local sleep_s="${5:-2}"
  local i
  for i in $(seq 1 "$attempts"); do
    if "$check_fn" "$port"; then
      echo "${label} healthy on 127.0.0.1:${port} (attempt ${i})"
      return 0
    fi
    sleep "$sleep_s"
  done
  echo "ERROR: ${label} not healthy on 127.0.0.1:${port}" >&2
  return 1
}

wait_for_public_health() {
  local url="$1"
  local required="${2:-3}"
  local success=0
  local i
  for i in $(seq 1 60); do
    if curl -sfS --connect-timeout 5 "$url" >/dev/null 2>&1; then
      success=$((success + 1))
      echo "Public health OK via ${url} (${success}/${required})"
      if [ "$success" -ge "$required" ]; then
        return 0
      fi
    else
      success=0
    fi
    sleep 2
  done
  echo "ERROR: public health check failed for ${url}" >&2
  return 1
}

write_upstream() {
  local file="$1"
  local name="$2"
  local port="$3"
  sudo install -d -m 755 "$(dirname "$file")"
  sudo tee "$file" >/dev/null <<EOF
upstream ${name} {
    server 127.0.0.1:${port};
}
EOF
  echo "Updated ${file} -> 127.0.0.1:${port}"
}

reload_nginx() {
  sudo nginx -t
  sudo systemctl reload nginx
}

compose_for_slot() {
  local slot="$1"
  shift
  if [ "$slot" = "$SLOT_BLUE" ]; then
    COMPOSE_PROJECT_NAME="$BLUE_PROJECT" "${COMPOSE[@]}" "$@"
  else
    COMPOSE_PROJECT_NAME="$GREEN_PROJECT" "${COMPOSE[@]}" "$@"
  fi
}

slot_vars() {
  local slot="$1"
  if [ "$slot" = "$SLOT_BLUE" ]; then
    SLOT_BACKEND_PORT="$BLUE_BACKEND_PORT"
    SLOT_FRONTEND_PORT="$BLUE_FRONTEND_PORT"
    SLOT_SHELL_PORT="$BLUE_SHELL_PORT"
    SLOT_BACKEND_NAME="$BLUE_BACKEND_NAME"
    SLOT_FRONTEND_NAME="$BLUE_FRONTEND_NAME"
    SLOT_SHELL_NAME="$BLUE_SHELL_NAME"
  else
    SLOT_BACKEND_PORT="$GREEN_BACKEND_PORT"
    SLOT_FRONTEND_PORT="$GREEN_FRONTEND_PORT"
    SLOT_SHELL_PORT="$GREEN_SHELL_PORT"
    SLOT_BACKEND_NAME="$GREEN_BACKEND_NAME"
    SLOT_FRONTEND_NAME="$GREEN_FRONTEND_NAME"
    SLOT_SHELL_NAME="$GREEN_SHELL_NAME"
  fi
}

start_slot() {
  local slot="$1"
  slot_vars "$slot"

  echo "Starting ${slot} slot:"
  echo "  backend  ${SLOT_BACKEND_NAME} -> ${SLOT_BACKEND_PORT}"
  echo "  frontend ${SLOT_FRONTEND_NAME} -> ${SLOT_FRONTEND_PORT}"
  echo "  shell    ${SLOT_SHELL_NAME} -> ${SLOT_SHELL_PORT}"

  ATHENA_BACKEND_CONTAINER="$SLOT_BACKEND_NAME" \
  ATHENA_FRONTEND_CONTAINER="$SLOT_FRONTEND_NAME" \
  ATHENA_SHELL_CONTAINER="$SLOT_SHELL_NAME" \
  ATHENA_BACKEND_PUBLISH="$SLOT_BACKEND_PORT" \
  ATHENA_FRONTEND_PUBLISH="$SLOT_FRONTEND_PORT" \
  ATHENA_SHELL_PUBLISH="$SLOT_SHELL_PORT" \
  compose_for_slot "$slot" up -d --no-deps backend

  if ! wait_for "backend" health_ok_backend "$SLOT_BACKEND_PORT" 120 3; then
    dump_container_diagnostics "$SLOT_BACKEND_NAME"
    return 1
  fi

  ATHENA_BACKEND_CONTAINER="$SLOT_BACKEND_NAME" \
  ATHENA_FRONTEND_CONTAINER="$SLOT_FRONTEND_NAME" \
  ATHENA_SHELL_CONTAINER="$SLOT_SHELL_NAME" \
  ATHENA_BACKEND_PUBLISH="$SLOT_BACKEND_PORT" \
  ATHENA_FRONTEND_PUBLISH="$SLOT_FRONTEND_PORT" \
  ATHENA_SHELL_PUBLISH="$SLOT_SHELL_PORT" \
  compose_for_slot "$slot" up -d --no-deps frontend shell

  wait_for "frontend" health_ok_http "$SLOT_FRONTEND_PORT" 90 2
  wait_for "shell" health_ok_http "$SLOT_SHELL_PORT" 90 2
}

stop_slot() {
  local slot="$1"
  slot_vars "$slot"
  compose_for_slot "$slot" stop backend frontend shell || true
  compose_for_slot "$slot" rm -f backend frontend shell || true
  docker rm -f "$SLOT_BACKEND_NAME" "$SLOT_FRONTEND_NAME" "$SLOT_SHELL_NAME" 2>/dev/null || true
}

prepare_slot() {
  local slot="$1"
  slot_vars "$slot"
  echo "Cleaning ${slot} slot before start..."
  compose_for_slot "$slot" down --remove-orphans || true
  docker rm -f "$SLOT_BACKEND_NAME" "$SLOT_FRONTEND_NAME" "$SLOT_SHELL_NAME" 2>/dev/null || true
}

if [ -f "$STATE_FILE" ]; then
  ACTIVE_SLOT="$(tr -d '[:space:]' <"$STATE_FILE")"
else
  ACTIVE_SLOT="$SLOT_BLUE"
fi

if [ "$ACTIVE_SLOT" != "$SLOT_BLUE" ] && [ "$ACTIVE_SLOT" != "$SLOT_GREEN" ]; then
  echo "ERROR: invalid slot in ${STATE_FILE}: ${ACTIVE_SLOT}" >&2
  exit 1
fi

if [ "$ACTIVE_SLOT" = "$SLOT_BLUE" ]; then
  INACTIVE_SLOT="$SLOT_GREEN"
else
  INACTIVE_SLOT="$SLOT_BLUE"
fi

echo "=== AskAthena blue-green: active=${ACTIVE_SLOT} inactive=${INACTIVE_SLOT} ==="

prepare_slot "$INACTIVE_SLOT"
compose_for_slot "$INACTIVE_SLOT" build backend
start_slot "$INACTIVE_SLOT"
slot_vars "$INACTIVE_SLOT"

write_upstream "$API_UPSTREAM_FILE" "$API_UPSTREAM_NAME" "$SLOT_BACKEND_PORT"
write_upstream "$FRONTEND_UPSTREAM_FILE" "$FRONTEND_UPSTREAM_NAME" "$SLOT_FRONTEND_PORT"
write_upstream "$SHELL_UPSTREAM_FILE" "$SHELL_UPSTREAM_NAME" "$SLOT_SHELL_PORT"
reload_nginx

if [ -n "$PUBLIC_HEALTH_URL" ]; then
  wait_for_public_health "$PUBLIC_HEALTH_URL" "$PUBLIC_HEALTH_SUCCESS_COUNT"
fi

echo "$INACTIVE_SLOT" >"$STATE_FILE"

echo "Draining old slot for ${DRAIN_SECONDS}s..."
sleep "$DRAIN_SECONDS"
stop_slot "$ACTIVE_SLOT"

echo "=== AskAthena cutover complete (active=${INACTIVE_SLOT}) ==="
