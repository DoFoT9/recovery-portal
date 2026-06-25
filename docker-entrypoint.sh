#!/bin/sh
# Recovery Portal Docker entrypoint
# Handles: secret generation, DB initialisation, migrations, then app start.
set -e

DATA_DIR="${DATA_DIR:-/data}"
SECRETS_FILE="$DATA_DIR/secrets.env"

mkdir -p "$DATA_DIR"

# ---------------------------------------------------------------------------
# 1. Secrets — load existing if present, otherwise generate and persist
# ---------------------------------------------------------------------------

if [ -f "$SECRETS_FILE" ]; then
  echo "→ Loading secrets from $SECRETS_FILE"
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
  echo "  ✓ Generated AUTH_SECRET"
  needs_save=1
else
  echo "  • AUTH_SECRET provided"
fi

if [ -z "${TOTP_ENCRYPTION_KEY:-}" ]; then
  TOTP_ENCRYPTION_KEY=$(generate_hex)
  export TOTP_ENCRYPTION_KEY
  echo "  ✓ Generated TOTP_ENCRYPTION_KEY"
  needs_save=1
else
  echo "  • TOTP_ENCRYPTION_KEY provided"
fi

if [ "$needs_save" = "1" ]; then
  {
    echo "# Auto-generated secrets. Back this file up!"
    echo "# Losing TOTP_ENCRYPTION_KEY locks all 2FA-enabled users out."
    echo "AUTH_SECRET=$AUTH_SECRET"
    echo "TOTP_ENCRYPTION_KEY=$TOTP_ENCRYPTION_KEY"
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  echo "  ✓ Persisted to $SECRETS_FILE"
fi

# ---------------------------------------------------------------------------
# 2. Schema + migrations
# ---------------------------------------------------------------------------

echo ""
echo "→ Initialising database schema and running migrations"
node /app/scripts/migrate-all.mjs

# ---------------------------------------------------------------------------
# 3. Hand off to the real command
# ---------------------------------------------------------------------------

echo ""
echo "→ Starting application"
exec "$@"
