#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const SCRIPTS_DIR = path.resolve(process.cwd(), 'scripts')

const STEPS = [
  { name: 'init-db.mjs', mandatory: true },
  { name: 'migrate-v6-1.mjs', mandatory: false },
  { name: 'migrate-v7-0.mjs', mandatory: false },
  { name: 'migrate-v7-1.mjs', mandatory: false },
  { name: 'migrate-v7-2.mjs', mandatory: false },
  { name: 'migrate-v7-3.mjs', mandatory: false },
  { name: 'migrate-v7-4-1.mjs', mandatory: false },
  { name: 'migrate-v7-4-5.mjs', mandatory: false },
  { name: 'migrate-v7-5-1.mjs', mandatory: false },
]

let exitCode = 0
for (const { name, mandatory } of STEPS) {
  const p = path.join(SCRIPTS_DIR, name)
  if (!fs.existsSync(p)) {
    if (mandatory) { console.error(`\u2717 ${name} mandatory but missing`); process.exit(1) }
    console.log(`  \u26A0 ${name} not found - skipping`)
    continue
  }
  console.log(`\n\u2192 Running ${name} ...`)
  const r = spawnSync('node', [p], { stdio: 'inherit', env: process.env })
  if (r.status !== 0) { console.error(`\u2717 ${name} failed`); exitCode = r.status || 1; break }
}

if (exitCode === 0) console.log('\n\u2713 All migrations complete.')
else process.exit(exitCode)
