#!/bin/sh
# Recovery Portal Docker entrypoint
# Handles: ownership fix-up, secret generation, DB init, migrations, then app start.
# Designed to be run as root inside the container so it can correct bind-mount
# ownership, then drops to the nextjs user via su-exec.
set -e

DATA_DIR="${DATA_DIR:-/data}"
APP_UID="${APP_UID:-1001}"
APP_GID="${APP_GID:-1001}"
SECRETS_FILE="$DATA_DIR/secrets.env"

# ---------------------------------------------------------------------------
# 0. Fix ownership of the data volume
# Bind mounts from the host often come in owned by root or some other uid that
# does not match our in-container app user. Fix it before doing anything.
# ---------------------------------------------------------------------------

mkdir -p "$DATA_DIR"

if [ "$(id -u)" = "0" ]; then
  current_uid=$(stat -c '%u' "$DATA_DIR" 2>/dev/null || echo "")
  if [ "$current_uid" != "$APP_UID" ]; then
    echo "-> Fixing ownership of $DATA_DIR (was uid=$current_uid, setting to $APP_UID:$APP_GID)"
    chown -R "$APP_UID:$APP_GID" "$DATA_DIR"
  fi
fi

# ---------------------------------------------------------------------------
# 1. Secrets - load existing if present, otherwise generate and persist
# ---------------------------------------------------------------------------

if [ -f "$SECRETS_FILE" ]; then
  echo "-> Loading secrets from $SECRETS_FILE"
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
  export AUTH_SECRET TOTP_ENCRYPTION_KEY
fi

generate_hex() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

needs_save=0

if [ -z "${AUTH_SECRET:-}" ]; then
  AUTH_SECRET=$(generate_hex)
  export AUTH_SECRET
  echo "  v Generated AUTH_SECRET"
  needs_save=1
else
  echo "  . AUTH_SECRET provided"
fi

if [ -z "${TOTP_ENCRYPTION_KEY:-}" ]; then
  TOTP_ENCRYPTION_KEY=$(generate_hex)
  export TOTP_ENCRYPTION_KEY
  echo "  v Generated TOTP_ENCRYPTION_KEY"
  needs_save=1
else
  echo "  . TOTP_ENCRYPTION_KEY provided"
fi

if [ "$needs_save" = "1" ]; then
  {
    echo "# Auto-generated secrets. Back this file up!"
    echo "# Losing TOTP_ENCRYPTION_KEY locks all 2FA-enabled users out."
    echo "AUTH_SECRET=$AUTH_SECRET"
    echo "TOTP_ENCRYPTION_KEY=$TOTP_ENCRYPTION_KEY"
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  if [ "$(id -u)" = "0" ]; then
    chown "$APP_UID:$APP_GID" "$SECRETS_FILE"
  fi
  echo "  v Persisted to $SECRETS_FILE"
fi

# ---------------------------------------------------------------------------
# 2. Schema + migrations
# Run as the app user so any files the migrations create end up with the right
# ownership.
# ---------------------------------------------------------------------------

echo ""
echo "-> Initialising database schema and running migrations"

if [ "$(id -u)" = "0" ]; then
  su-exec "$APP_UID:$APP_GID" env \
    DATA_DIR="$DATA_DIR" \
    AUTH_SECRET="$AUTH_SECRET" \
    TOTP_ENCRYPTION_KEY="$TOTP_ENCRYPTION_KEY" \
    node /app/scripts/migrate-all.mjs
else
  node /app/scripts/migrate-all.mjs
fi

# ---------------------------------------------------------------------------
# 3. Hand off to the real command, dropping privileges if we are root
# ---------------------------------------------------------------------------

echo ""
echo "-> Starting application"

if [ "$(id -u)" = "0" ]; then
  exec su-exec "$APP_UID:$APP_GID" "$@"
else
  exec "$@"
fi
