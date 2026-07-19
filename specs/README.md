# github-md-live-wiki behaviour specs

This tree is the canonical, non-technical record of what the github-md-live-wiki shell does,
organised by what a reader interacts with.
The format follows illo3d's conventions (adopted in
[ADR-0002](decisions/ADR-0002-mirror-illo3d-standards.md)):
page-focused files, user-observable scope, semantic line breaks, British English.

github-md-live-wiki is a content-agnostic wiki shell:
a static single-page app that renders the markdown of a configured GitHub repository
at any version — release, branch head, or commit — chosen at view time.
No build or release is needed for content changes;
see [ADR-0001](decisions/ADR-0001-runtime-content-from-github.md).

## Map

- [`browsing.spec.md`](browsing.spec.md) — sidebar, page rendering, link behaviour
- [`version-selector.spec.md`](version-selector.spec.md) — releases, branches, commit ids, error states
- [`search.spec.md`](search.spec.md) — full-text search within the shown version
- [`translations.spec.md`](translations.spec.md) — on-device automatic translation
- [`local-mode.spec.md`](local-mode.spec.md) — serving a mounted content directory
- [`decisions/`](decisions/README.md) — architecture decision records
