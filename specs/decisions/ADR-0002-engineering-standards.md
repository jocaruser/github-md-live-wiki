# ADR-0002: Engineering standards and stack

- Status: Accepted
- Date: 2026-07-18

## Context

This is a small, long-lived tool whose correctness people rely on when they
read specifications through it. It needs standards that keep it correct and
approachable as it changes, without ceremony that a project this size cannot
justify.

## Decision

Adopt one coherent, self-hosting toolchain and hold the quality bar high:

- **Stack**: React 18, TypeScript (strict), Vite, Tailwind CSS, pnpm.
  A single client-side app, no framework sprawl.
- **Everything runs in Docker through Make targets**, so the environment is
  identical for every contributor and in CI; no host-level Node or pnpm.
- **Quality gates, all enforced in CI**:
  ESLint at zero warnings, react-doctor,
  Vitest with **100% coverage thresholds**,
  an offline Playwright end-to-end suite against the production bundle
  (GitHub is mocked at the network boundary, so it is deterministic),
  a gzipped bundle-size budget, and a dependency-vulnerability audit.
- **Specifications** live in `specs/` as page-focused behaviour specs,
  with architecture decisions in `specs/decisions/`,
  written in British English with semantic line breaks.
- **Delivery**: pull requests to `main`, a version bump every PR,
  and a changelog entry per release.
- **Dependencies** are kept current by Dependabot (npm, Docker, Actions),
  grouped and minor/patch only.

## Consequences

- The 100% coverage bar and the offline, production-bundle e2e suite make the
  riskiest behaviour — fetching and rendering arbitrary repositories at view
  time — regression-proof.
- The cost is discipline: new code arrives with tests and a spec update, and
  the gate must be green before merge.
- These standards are the project's own; changing them is itself an ADR.
