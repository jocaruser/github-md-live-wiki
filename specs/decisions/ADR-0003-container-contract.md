# ADR-0003: One generic container, configured by environment

- Status: Accepted
- Date: 2026-07-18

## Context

Consumer repositories (illo3d first) must publish the wiki
under their own GitHub Pages site and serve it locally,
without carrying any wiki code, dependencies, or build steps themselves.

## Decision

Releases ship a single Docker image to GHCR
(`ghcr.io/jocaruser/github-md-live-wiki`)
that any repository configures at run time:

- **Environment**: `CONTENT_REPO` (owner/name, required unless content is
  mounted), `CONTENT_PATH` (default `specs`), `SITE_TITLE`, `APP_URL`,
  `DEFAULT_REF` (default `main`), `PORT` (default `5176`).
  The entrypoint writes them into the shell's `config.js`;
  the bundle itself is path-agnostic (relative asset URLs, hash routing),
  so the same image serves at any base path.
- **Modes**:
  `serve` (default) — a dependency-free static server on `$PORT`;
  mounting a directory at `/content` enables local mode.
  `export` — copies the configured site into a directory mounted at `/out`,
  for a consumer's Pages workflow to include in its artifact.
- **Tags**: each release pushes `vX.Y.Z`, `vX` and `latest`.
  Consumers track the major (`:v1`):
  bugfix releases flow automatically,
  breaking changes require a deliberate bump.
  The image and repository are public, so pulls need no authentication.
- **Security posture**: the container runs as the unprivileged `node` user;
  the generated `config.js` is JSON-encoded (env values cannot inject code);
  local-mode serving refuses symlinks, path escapes,
  and script-capable content types, and sets `nosniff` on every response.
  In `export` mode the `/out` mount must be writable by uid 1000
  (or run with `--user`).

## Consequences

- A consumer integrates with one `docker run` line in CI
  and one Make target locally; engine updates reach it
  without touching its lockfile.
- The wiki release cadence is fully decoupled from every consumer's —
  releases happen only for engine changes, manually, and are expected
  to be rare.
- Rolling back a bad engine release for all consumers
  is re-tagging `v1` to the previous version.
