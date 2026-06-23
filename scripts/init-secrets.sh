#!/usr/bin/env bash
# Generate required secrets and append to .env.local if missing.
set -euo pipefail

ENV_FILE=".env.local"

ensure_secret() {
  local key="$1"
  local bytes="$2"
  if grep -qE "^${key}=." "$ENV_FILE" 2>/dev/null; then
    echo "  • $key already present in $ENV_FILE"
  else
    local value
    value=$(node -e "console.log(require('crypto').randomBytes($bytes).toString('hex'))")
    [[ -f "$ENV_FILE" ]] || touch "$ENV_FILE"
    [[ -s "$ENV_FILE" && $(tail -c1 "$ENV_FILE") != $'\n' ]] && printf '\n' >> "$ENV_FILE"
    echo "${key}=${value}" >> "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo "  ✓ Generated $key"
  fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo "  ✓ Created $ENV_FILE from .env.example"
  else
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
fi

ensure_secret "AUTH_SECRET" 32
ensure_secret "TOTP_ENCRYPTION_KEY" 32

echo ""
echo "✓ Secrets ready in $ENV_FILE"
echo "  Back this file up — losing TOTP_ENCRYPTION_KEY locks 2FA users out."
