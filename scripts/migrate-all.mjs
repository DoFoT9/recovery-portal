#!/usr/bin/env node
// Runs init-db (which creates the COMPLETE current schema) plus any
// remaining version-specific migration scripts for legacy upgrade paths.
//
// init-db.mjs is mandatory.
// The migrate-vX-Y.mjs scripts are optional — they exist to handle upgrades
// from older installs but are no-ops on a fresh install since init-db
// already created everything.

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const SCRIPTS_DIR = path.resolve(process.cwd(), 'scripts')

const STEPS = [
  { name: 'init-db.mjs',       mandatory: true  },
  { name: 'migrate-v6-1.mjs',  mandatory: false },
  { name: 'migrate-v7-0.mjs',  mandatory: false },
  { name: 'migrate-v7-1.mjs',  mandatory: false },
  { name: 'migrate-v7-2.mjs',  mandatory: false },
]

let exitCode = 0
const missing = []

for (const { name, mandatory } of STEPS) {
  const scriptPath = path.join(SCRIPTS_DIR, name)
  if (!fs.existsSync(scriptPath)) {
    if (mandatory) {
      console.error(`\u2717 ${name} is mandatory but not found in ${SCRIPTS_DIR}`)
      process.exit(1)
    }
    console.log(`  \u26A0 ${name} not found — skipping (fine for fresh installs)`)
    missing.push(name)
    continue
  }
  console.log(`\n\u2192 Running ${name} ...`)
  const result = spawnSync('node', [scriptPath], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    console.error(`\u2717 ${name} failed with exit code ${result.status}`)
    exitCode = result.status || 1
    break
  }
}

if (missing.length > 0) {
  console.log(`\n\u26A0 ${missing.length} optional migration script(s) were missing: ${missing.join(', ')}`)
  console.log('  This is fine for fresh installs — init-db creates the complete schema.')
  console.log('  For installs upgrading from a much older version, restore the missing')
  console.log('  scripts from git history if you need the historical migration logic.')
}

if (exitCode === 0) {
  console.log('\n\u2713 All migrations complete.')
} else {
  process.exit(exitCode)
}
