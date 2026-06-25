#!/usr/bin/env node
// Runs the base schema init followed by every version migration in order.
// All migrations are idempotent - safe to run on every container start.

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const SCRIPTS_DIR = path.resolve(process.cwd(), 'scripts')

// Ordered list. New migrations go at the end.
const STEPS = [
  'init-db.mjs',
  'migrate-v6-1.mjs',
  'migrate-v7-0.mjs',
  'migrate-v7-1.mjs',
  'migrate-v7-2.mjs',
]

let exitCode = 0

for (const step of STEPS) {
  const scriptPath = path.join(SCRIPTS_DIR, step)
  if (!fs.existsSync(scriptPath)) {
    console.log(`  \u2022 ${step} not present, skipping`)
    continue
  }
  console.log(`\n\u2192 Running ${step} ...`)
  const result = spawnSync('node', [scriptPath], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    console.error(`\u2717 ${step} failed with exit code ${result.status}`)
    exitCode = result.status || 1
    break
  }
}

if (exitCode === 0) {
  console.log('\n\u2713 All migrations complete.')
} else {
  process.exit(exitCode)
}
