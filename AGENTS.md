# Agent Guidelines for github-md-live-wiki

## Framework

> Framework-managed section. Add project-specific instructions outside this section.

This project follows the Aircury engineering framework defined in [FRAMEWORK.md](./FRAMEWORK.md).

All agents contributing to this repository MUST read and apply FRAMEWORK.md before doing any work. It is not optional and it is not advisory.

Where the repository rules in this file are stricter than `FRAMEWORK.md`, the repository rules win — in particular the Golden Rules below.

## Golden Rules

### 1. All Commands Go Through Make
- **Never** run `pnpm`, `npm`, `vitest`, `playwright`, `docker`, or `tsc` directly.
- Always use the Makefile targets: `make dev`, `make build`, `make test`, `make e2e-test`, `make lint`, `make quality-gate`, `make add PKG=...`, etc.
- The Makefile ensures the right environment (Docker containers, env vars, preview-server orchestration for E2E).

### 2. All Tests Must Pass — No Skipping, No Removing
- **A failing test is never skipped or deleted.** It is a bug report. Fix the root cause.
- Do **not** use `test.skip()`, `describe.skip()`, `test.fixme()`, or comment out tests to "get CI green."
- Coverage thresholds are **100%** across statements, branches, functions, and lines; they are never lowered to pass.
- If a test asserts behaviour that no longer matches the app, decide which is correct: fix the app, or update the asserted contract.

### 3. Quality Gate Before Finish
```
make quality-gate   # build, lint, react-doctor, unit tests, e2e tests — must all pass
```

### 4. TDD for Bug Fixes
1. Reproduce in a test (red).
2. Apply the minimal fix (green).
3. Run `make quality-gate` to verify.

### 5. Version Must Be Bumped in Every PR
- Every PR **must** increment `version` in `package.json`.
- Follow semver: bump major for breaking changes to the container contract (ADR-0003) or rendering behaviour, minor for new features, patch for bug fixes.

### 6. Use `gh` CLI for GitHub Operations
- Prefer `gh` CLI over GitHub MCP tools for PR, branch, and release operations.

### 7. Document User-Facing Changes in the Changelog
- Create or update `changelog/v<version>.md` for the version being released (matching `package.json`).
- The release workflow uses it as the GitHub release body when present.
- See `CHANGELOG.md` for the index.

### 8. Specs Lead
- `specs/` is the canonical behaviour record; update it in the same PR as any behaviour change.
- Material decisions go to `specs/decisions/` as ADRs (see its README for the process).

## Project Structure

- `src/` — the shell: `config.ts` (runtime config), `lib/` (GitHub client, nav builder, markdown pipeline, router, search), `components/`, `hooks/`
- `docker/` — `entrypoint.sh` (serve/export modes, config.js generation) and `server.mjs` (static + local-content server)
- `tests/Unit/` — Vitest suite mirroring `src/`; **coverage thresholds are 100%**
- `tests/e2e/` — Playwright suite; GitHub API and raw content are mocked in the browser, so it runs offline against the production bundle
- `specs/` — behaviour specs and ADRs
- `Makefile` — single source of truth for all dev/CI commands
