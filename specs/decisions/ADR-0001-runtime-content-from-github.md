# ADR-0001: Content is fetched from GitHub at view time

- Status: Accepted
- Date: 2026-07-18

## Context

The wiki must render a GitHub repository's Markdown
publicly and easily, with a version selector covering
releases, **branch heads and arbitrary commit ids**,
and a content change must appear without any build or release step.

Build-time generators (VitePress, Docusaurus, MkDocs with mike)
can only ship versions that were baked when the site was built —
branch heads go stale between builds
and arbitrary commit ids can never be pre-built.
The closest runtime alternatives were evaluated and fall short:
Docsify renders Markdown at runtime but dynamic branch/tag rendering is an
[open feature request](https://github.com/docsifyjs/docsify/issues/341),
its versioned plugin needs a hard-coded versions array,
and MDwiki is unmaintained.
Every distinctive requirement would still be custom code,
without the type-safety and test rig this project holds itself to.

## Decision

The wiki is a static single-page app that fetches everything
from GitHub in the reader's browser, at view time:

- tag, branch, default-branch and tree listings come from the GitHub REST API
  (cached in the session; immutable commit ids cached hardest);
- file bodies come from `raw.githubusercontent.com`, which is CDN-served
  and not subject to the small unauthenticated API allowance;
- the version selector is populated dynamically from the repository
  and accepts any commit id;
- there is no server and no per-repository configuration —
  the app holds no content of its own.

## Consequences

- A repository's edits are visible the moment they are pushed to GitHub;
  nothing about the wiki deploys, builds, or is notified.
- Rendering happens in the reader's browser:
  no prerendered HTML for crawlers,
  and the unauthenticated GitHub API allowance (60 requests/hour/IP)
  bounds how many distinct versions one reader can open per hour —
  roughly one tree call per version plus a few listing calls,
  which comfortably covers human browsing.
- A GitHub outage degrades the wiki to its error states.
- The app is content-agnostic: it can render any public repository
  (see [ADR-0005](ADR-0005-reader-chosen-repository.md)).
