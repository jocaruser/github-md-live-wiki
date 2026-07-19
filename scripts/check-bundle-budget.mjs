/**
 * Performance budget gate (standards dimension P2).
 *
 * Fails when the gzipped production bundle outgrows the budget. The numbers
 * are deliberate headroom (~20%) over the measured v1.0.0 baseline —
 * raise them consciously in a PR that explains the growth, never reflexively.
 *
 * Usage: node scripts/check-bundle-budget.mjs   (expects a built dist/)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGETS_KIB = { '.js': 220, '.css': 12 }

const distAssets = 'dist/assets'
if (!existsSync(distAssets)) {
  console.error('check-bundle-budget: dist/assets not found — run the build first')
  process.exit(2)
}

const totals = { '.js': 0, '.css': 0 }
for (const name of readdirSync(distAssets)) {
  const ext = extname(name)
  if (!(ext in totals)) continue
  totals[ext] += gzipSync(readFileSync(join(distAssets, name))).length
}

let failed = false
for (const [ext, budgetKiB] of Object.entries(BUDGETS_KIB)) {
  const actualKiB = totals[ext] / 1024
  const line = `${ext.slice(1).toUpperCase()} gzip total: ${actualKiB.toFixed(1)} KiB (budget ${budgetKiB} KiB)`
  if (actualKiB > budgetKiB) {
    console.error(`FAIL ${line}`)
    failed = true
  } else {
    console.log(`ok   ${line}`)
  }
}

process.exit(failed ? 1 : 0)
