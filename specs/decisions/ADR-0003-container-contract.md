# ADR-0003: The container just serves the static app

- Status: Accepted
- Date: 2026-07-18
- Amends: ADR-0001

## Context

The app is entirely client-side (ADR-0001): it fetches content from GitHub in
the browser and holds no state of its own. It still needs to be hostable —
on this project's own GitHub Pages, and by anyone who wants to self-host or
embed it — without per-repository configuration, since the reader chooses the
repository at runtime (ADR-0005).

## Decision

Releases publish a single public Docker image to GHCR
(`ghcr.io/jocaruser/github-md-live-wiki`) that carries the built bundle and a
tiny, dependency-free static server, in two modes:

- **`serve`** (default) — serves the bundle on `$PORT` (default `5176`),
  falling back to `index.html` for the app's own routes.
- **`export`** — copies the site into a directory mounted at `/out`, for a
  host that wants to embed it into its own static artifact.

There is **no runtime configuration**: no environment variables shape the
content, because there is no baked-in repository. The bundle is path-agnostic
(relative asset URLs, hash routing), so it serves correctly at a site root or
any subpath.

Security posture: the container runs as the unprivileged `node` user; the
server confines every request to the site directory (rejecting path escapes
and symlinks) and sets `nosniff` on every response.

Release tags are `vX.Y.Z`, `vX` and `latest`; the image and repository are
public, so pulls need no authentication.

## Consequences

- Hosting is one `docker run` (or a static file host — the export output is
  plain files); there is nothing to configure per deployment.
- The image is only rebuilt when the app changes; releases are manual and
  expected to be infrequent.
- Because there is no server-side content path, the whole class of
  server-side content bugs (traversal, injection, stale config) does not
  exist.
