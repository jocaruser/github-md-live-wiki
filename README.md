# github-md-live-wiki

github-md-live-wiki is a **content-agnostic wiki shell** for markdown that lives in a GitHub repository. It is a static single-page app (**React 18**, **TypeScript**, **Vite**, **Tailwind CSS**) that fetches the `.md` files **from GitHub at view time** — so content changes publish the moment they merge, with no wiki build or release — and a version selector lets the reader view the content at **any release tag, branch head, or commit id** (see [ADR-0001](specs/decisions/ADR-0001-runtime-content-from-github.md)).

It ships as a single Docker image (`ghcr.io/jocaruser/github-md-live-wiki`) configured entirely by environment variables, with `serve` and `export` modes (see [ADR-0003](specs/decisions/ADR-0003-container-contract.md)), and this repository's own GitHub Pages hosts a live instance rendering [jocaruser/illo3d](https://github.com/jocaruser/illo3d)'s behaviour specs: **<https://jocaruser.github.io/github-md-live-wiki/>**.

Reading features: sidebar from the content tree, full-text search, dark mode, deep links, and **on-device automatic translation** of the shown page (Español, Français, Deutsch, Italiano, Português, 日本語) via the browser's built-in Translator API — no keys, no server; the selector appears only where the browser supports it. MIT licensed ([LICENSE](LICENSE)).

## Using the image

| Variable | Meaning | Default |
|----------|---------|---------|
| `CONTENT_REPO` | GitHub `owner/name` to render | required unless `/content` is mounted |
| `CONTENT_PATH` | directory inside that repo holding the pages | `specs` |
| `SITE_TITLE` | title in the top bar and browser tab | `<repo> specs` |
| `APP_URL` | optional "App ↗" link | none |
| `DEFAULT_REF` | branch shown as **latest** | `main` |
| `PORT` | port for `serve` mode | `5176` |

**Serve** (local reading, plus local mode when `/content` is mounted — uncommitted edits show on refresh):

```bash
docker run --rm -p 5176:5176 -e CONTENT_REPO=jocaruser/illo3d ghcr.io/jocaruser/github-md-live-wiki:v1
# with local content:
docker run --rm -p 5176:5176 -e CONTENT_REPO=jocaruser/illo3d \
  -v "$PWD/specs:/content:ro" ghcr.io/jocaruser/github-md-live-wiki:v1
```

**Export** (in a consumer's Pages workflow — the bundle is path-agnostic, so it works under any subpath; the container runs as uid 1000, so `/out` must be writable by it, or pass `--user`):

```bash
docker run --rm -e CONTENT_REPO=jocaruser/illo3d -e APP_URL=https://jocaruser.github.io/illo3d/ \
  -v "$PWD/dist/specs:/out" ghcr.io/jocaruser/github-md-live-wiki:v1 export
```

Consumers should pin the **major tag** (`:v1`): bugfix releases flow automatically, breaking changes require a deliberate bump.

## Development

Prerequisites: **Docker**, **Docker Compose**, **GNU Make**. First run: `make init`, then `make dev` and open <http://localhost:5176>.

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

Releases ship the **engine only** — content repositories never need one. Bump `version` in `package.json` (every PR bumps it per [AGENTS.md](AGENTS.md)), add `changelog/v<version>.md`, merge, then run the manual **Release** workflow: it builds the image, pushes `vX.Y.Z` + `vX` + `latest` to GHCR, and creates the GitHub release.

## Specs

The behaviour record lives in [`specs/`](specs/README.md); decisions in [`specs/decisions/`](specs/decisions/README.md). This repository follows the Aircury engineering framework (`FRAMEWORK.md`) and mirrors illo3d's standards ([ADR-0002](specs/decisions/ADR-0002-mirror-illo3d-standards.md)).
