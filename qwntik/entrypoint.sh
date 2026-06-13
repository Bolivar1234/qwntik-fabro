#!/bin/sh
# Qwntik bootstrap: seeds settings and workflow templates on first boot,
# then hands off to the upstream fabro-entrypoint (docker socket group + su-exec).
set -eu

if [ "$(id -u)" = 0 ]; then
    FABRO_HOME_DIR="${FABRO_HOME:-/storage/.home}"
    mkdir -p "${FABRO_HOME_DIR}"

    # Seed settings.toml only on first boot — never overwrite operator edits.
    if [ ! -f "${FABRO_HOME_DIR}/settings.toml" ]; then
        cp /etc/fabro/settings.default.toml "${FABRO_HOME_DIR}/settings.toml"
    fi

    # Seed workflow templates — skip files that already exist.
    if [ -d /etc/fabro/workflows ] && [ "$(ls -A /etc/fabro/workflows 2>/dev/null)" ]; then
        mkdir -p "${FABRO_HOME_DIR}/workflows"
        for f in /etc/fabro/workflows/*; do
            dest="${FABRO_HOME_DIR}/workflows/$(basename "$f")"
            [ ! -f "$dest" ] && cp "$f" "$dest"
        done
    fi
fi

exec /usr/local/bin/fabro-entrypoint "$@"
