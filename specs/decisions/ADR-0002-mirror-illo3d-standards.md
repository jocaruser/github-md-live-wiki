# ADR-0002: Mirror illo3d's stack and engineering standards

- Status: Accepted
- Date: 2026-07-18

## Context

github-md-live-wiki was extracted from illo3d
(jocaruser/illo3d publishes its behaviour specs through it)
and is maintained by the same people.
Two stacks or two quality bars would double the upkeep.

## Decision

Adopt illo3d's conventions wholesale:

- **Stack**: React 18, TypeScript, Vite, Tailwind CSS, pnpm 9 —
  the same toolchain the maintainers already work in daily.
- **Workflow**: everything runs in Docker through Make targets;
  the Aircury framework files (`FRAMEWORK.md`, `.aircury/`, `docs/aircury/`)
  govern this repository identically.
- **Quality gates**: ESLint at zero warnings, react-doctor,
  Vitest with **100% coverage thresholds**,
  an offline Playwright e2e suite against the production bundle,
  a gzipped bundle budget, and a dependency audit —
  all wired into CI jobs that mirror illo3d's, including auto-merge.
- **Specs**: page-focused behaviour specs under `specs/`,
  ADRs under `specs/decisions/`,
  written with semantic line breaks in British English.
- **Delivery**: PRs to `main`, a version bump in `package.json` every PR,
  and a changelog entry per release.

## Consequences

- Anyone fluent in illo3d's workflow is immediately fluent here.
- The 100% coverage bar and offline e2e suite make the runtime-fetching
  behaviour — the riskiest part of ADR-0001 — regression-proof.
- Divergence from illo3d's standards needs its own ADR.
