# ADR-0001: Content is fetched from GitHub at view time

- Status: Accepted
- Date: 2026-07-18

## Context

The wiki must make a repository's markdown publicly and easily available,
with a version selector covering releases, **branch heads and arbitrary commit ids**,
and content changes must publish without any wiki build or release.

Build-time generators (VitePress, Docusaurus, MkDocs with mike)
can only ship versions that were baked when the site was built —
branch heads go stale between builds
and arbitrary commit ids can never be pre-built.
The closest runtime alternatives were evaluated and fall short:
Docsify renders markdown at runtime but dynamic branch/tag rendering is an
[open feature request](https://github.com/docsifyjs/docsify/issues/341),
its versioned plugin needs a hard-coded versions array,
and MDwiki is unmaintained.
Every distinctive requirement would still be custom code,
without the type-safety and test rig this project demands.

## Decision

github-md-live-wiki is a static single-page shell that fetches content
from the configured GitHub repository at view time:

- tag, branch and tree listings come from the GitHub REST API
  (cached in the session; immutable refs cached hardest);
- file bodies come from `raw.githubusercontent.com`, which is CDN-served
  and not subject to the small unauthenticated API allowance;
- the version selector is populated dynamically
  and accepts any commit id;
- the shell itself only redeploys when the engine changes —
  releases are manual, infrequent, and ship a Docker image
  ([ADR-0003](ADR-0003-container-contract.md)).

## Consequences

- Merged content edits are visible on the live wiki immediately;
  the content repository needs no deploy hook at all.
- Rendering happens in the reader's browser:
  no prerendered HTML for crawlers,
  and the unauthenticated GitHub API allowance (60 requests/hour/IP)
  bounds how many distinct versions one reader can open per hour —
  roughly one tree call per version plus two listing calls,
  which comfortably covers human browsing.
- A GitHub outage degrades the wiki to its error states.
- The engine is content-agnostic and reusable by any repository.
