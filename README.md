# Live Wiki

**Live Wiki** (`github-md-live-wiki`) is a **content-agnostic wiki** for the Markdown that lives
in a GitHub repository. It is a static single-page app (**React 18**, **TypeScript**, **Vite**,
**Tailwind CSS**) that fetches the `.md` files **from GitHub in your browser, at view time** — so
a repository's changes appear the moment they are pushed, with no build or deploy anywhere — and a
version selector renders the content at **any release tag, branch head, or commit id**
(see [ADR-0001](specs/decisions/ADR-0001-runtime-content-from-github.md)).

A hosted instance runs on this repository's own GitHub Pages:
**<https://jocaruser.github.io/github-md-live-wiki/>**.

## What it does

- **Open any repository** — the app opens to a form: enter `owner/name` and a path (e.g. `docs`
  or `specs`, or leave it empty for the repository root), and read. Repositories you open are kept
  in a **Recent** list; a **Close wiki** button returns to the form
  ([ADR-0005](specs/decisions/ADR-0005-reader-chosen-repository.md)).
- **Everything is in the URL** — repository, path, version and page all live in the address, so
  any link is shareable and reproducible: `…/#r=owner/name&p=docs&v=v1.2.0&f=guide/intro.md`.
- **Any version, live** — pick a release, a branch head, or paste a commit id; content is fetched
  fresh from GitHub, never pre-built.
- **Reading comforts** — sidebar from the content tree, full-text search, dark mode, GitHub-style
  rendering (syntax highlighting, task lists, heading anchors), and links back to each file on
  GitHub.
- **On-device translation** — translate the shown page (Español, Français, Deutsch, Italiano,
  Português, 日本語) via the browser's built-in Translator API; no keys, no server, code left
  verbatim. The selector appears only where the browser supports it.

MIT licensed ([LICENSE](LICENSE)).

## Self-hosting

The app is entirely client-side, so any static host works. The published Docker image
(`ghcr.io/jocaruser/github-md-live-wiki`) carries the bundle and a tiny static server — no
configuration, since the reader chooses the repository at runtime
([ADR-0003](specs/decisions/ADR-0003-container-contract.md)):

```bash
# serve on http://localhost:5176
docker run --rm -p 5176:5176 ghcr.io/jocaruser/github-md-live-wiki:v1

# or export the static files to embed elsewhere (e.g. another Pages artifact)
docker run --rm -v "$PWD/out:/out" ghcr.io/jocaruser/github-md-live-wiki:v1 export
```

Pin the **major tag** (`:v1`): bugfix releases flow automatically, breaking changes need a
deliberate bump. `PORT` (default `5176`) is the only knob.

## Development

Prerequisites: **Docker**, **Docker Compose**, **GNU Make**. First run: `make init`, then
`make dev` and open <http://localhost:5176>.

| Target | Purpose |
|--------|---------|
| `make init` | Build images, start containers, install deps |
| `make dev` | Vite dev server on :5176 |
| `make build` | Typecheck and production build |
| `make preview` | Preview the production build on :5176 |
| `make test` | Vitest unit tests with **100% coverage thresholds** |
| `make e2e-test` | Playwright e2e against the production bundle (GitHub mocked in-browser, fully offline) |
| `make lint` / `make format` | ESLint (0 warnings) / Prettier |
| `make react-doctor` | React Doctor over changed files vs main |
| `make audit` | Dependency vulnerability gate (high/critical) |
| `make budget` | Gzipped bundle budget |
| `make quality-gate` | Sequential full gate: build, lint, react-doctor, unit, e2e |
| `make ci` | CI shape: fast checks in parallel, then e2e |
| `make image` / `image-serve` / `image-export` | Build / smoke-test the production image |

## Releasing

Bump `version` in `package.json` (every PR bumps it per [AGENTS.md](AGENTS.md)), add
`changelog/v<version>.md`, merge, then run the manual **Release** workflow: it builds the image,
pushes `vX.Y.Z` + `vX` + `latest` to GHCR, and creates the GitHub release.

## Specs

The behaviour record lives in [`specs/`](specs/README.md); decisions in
[`specs/decisions/`](specs/decisions/README.md). Engineering standards are the project's own
([ADR-0002](specs/decisions/ADR-0002-engineering-standards.md)), atop the Aircury framework
(`FRAMEWORK.md`).
