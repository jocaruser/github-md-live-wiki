# Live Wiki — behaviour specs

This tree is the canonical, non-technical record of what Live Wiki does,
organised by what a reader interacts with.
The format is this project's own convention
([ADR-0002](decisions/ADR-0002-engineering-standards.md)):
page-focused files, user-observable scope, semantic line breaks, British English.

Live Wiki is a content-agnostic wiki: a static single-page app that renders the
Markdown of **any GitHub repository the reader opens**, at any version —
release, branch head, or commit — fetched live in the browser.
No build or release is involved for content changes;
see [ADR-0001](decisions/ADR-0001-runtime-content-from-github.md).

## Map

- [`selecting-a-repository.spec.md`](selecting-a-repository.spec.md) — the landing form, recents, closing, and the shareable URL
- [`browsing.spec.md`](browsing.spec.md) — sidebar, page rendering, link behaviour
- [`version-selector.spec.md`](version-selector.spec.md) — releases, branches, commit ids, error states
- [`search.spec.md`](search.spec.md) — full-text search within the shown version
- [`translations.spec.md`](translations.spec.md) — on-device automatic translation
- [`decisions/`](decisions/README.md) — architecture decision records
