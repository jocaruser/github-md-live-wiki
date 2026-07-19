/**
 * E2E policy (github-md-live-wiki):
 * - Chromium only by default (no extra browser matrix).
 * - Every spec intercepts api.github.com and raw.githubusercontent.com with
 *   fixtures (see tests/e2e/github-fixtures.ts), so the suite runs fully
 *   offline and deterministically against the production bundle.
 * - workers: 1 — one preview server; retries: 0 — a failure is a failure.
 *
 * The shell must already be served (make e2e-test builds dist-e2e with the
 * fixture repo id baked in and sets PLAYWRIGHT_BASE_URL).
 */
import { defineConfig, devices } from '@playwright/test'

const e2ePort = 5177
const e2eOrigin = `http://127.0.0.1:${e2ePort}`

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? e2eOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
