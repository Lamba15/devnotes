#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUSK_ENV_FILE="${ROOT_DIR}/.env.dusk.local"

cd "$ROOT_DIR"

abort_if_dusk_targets_primary_db() {
    if [ ! -f "$DUSK_ENV_FILE" ]; then
        echo "Missing .env.dusk.local. Refusing to run browser tests without an isolated Dusk env." >&2
        exit 1
    fi

    local db_name=""
    local app_env=""

    db_name="$(grep '^DB_DATABASE=' "$DUSK_ENV_FILE" | cut -d '=' -f2- | tr -d '[:space:]')"
    app_env="$(grep '^APP_ENV=' "$DUSK_ENV_FILE" | cut -d '=' -f2- | tr -d '[:space:]')"

    if [ -z "$db_name" ]; then
        echo "DB_DATABASE is not set in .env.dusk.local. Refusing to run browser tests." >&2
        exit 1
    fi

    if [ "$db_name" = "devnotes" ]; then
        echo "Refusing to run browser tests against primary database 'devnotes'. Use an isolated Dusk database." >&2
        exit 1
    fi

    if [ "$app_env" = "local" ]; then
        echo "Refusing to run browser tests with APP_ENV=local in .env.dusk.local. Use APP_ENV=dusk." >&2
        exit 1
    fi
}

detect_browser_version() {
    local version=""

    version="$(google-chrome --version 2>/dev/null || true)"

    if [ -z "$version" ]; then
        version="$(google-chrome-stable --version 2>/dev/null || true)"
    fi

    if [ -z "$version" ]; then
        version="$(chromium --version 2>/dev/null || true)"
    fi

    if [ -z "$version" ]; then
        version="$(chromium-browser --version 2>/dev/null || true)"
    fi

    printf '%s' "$version"
}

BROWSER_VERSION="$(detect_browser_version)"

abort_if_dusk_targets_primary_db

if [ -z "$BROWSER_VERSION" ]; then
    echo "No Chrome-compatible browser found for Laravel Dusk." >&2
    exit 1
fi

CHROME_MAJOR="$(printf '%s' "$BROWSER_VERSION" | grep -oE '[0-9]+' | head -n1)"
APP_URL="http://127.0.0.1:8000"
SERVER_LOG="${ROOT_DIR}/storage/logs/dusk-server.log"
SERVER_PID=""
ASSISTANT_FIXTURE="${ROOT_DIR}/tests/Browser/fixtures/assistant-model-responses.json"

cleanup() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT

if [ -f "$ASSISTANT_FIXTURE" ]; then
    export OPENROUTER_FAKE_RESPONSES_FILE="$ASSISTANT_FIXTURE"
fi

php artisan config:clear --ansi
php artisan dusk:chrome-driver "$CHROME_MAJOR" --ansi

php artisan serve --host=127.0.0.1 --port=8000 >"$SERVER_LOG" 2>&1 &
SERVER_PID="$!"

for _ in $(seq 1 30); do
    if curl -sS "$APP_URL" >/dev/null 2>&1; then
        break
    fi

    sleep 1
done

if ! curl -sS "$APP_URL" >/dev/null 2>&1; then
    echo "Laravel test server did not become ready for Dusk." >&2
    exit 1
fi

APP_URL="$APP_URL" php artisan pest:dusk "$@"
