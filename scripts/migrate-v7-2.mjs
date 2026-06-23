#!/usr/bin/env node
// v7.2 has no schema changes — packaging/deployment release only.
console.log('→ v7.2 has no schema changes (packaging release).')
console.log('  Make sure AUTH_SECRET and TOTP_ENCRYPTION_KEY are set in .env.local.')
console.log('  Run ./scripts/init-secrets.sh if you have not already.')
console.log('✓ Nothing to migrate.')
process.exit(0)
