# ADR-0005: The reader chooses the repository, and the URL holds the choice

- Status: Accepted
- Date: 2026-07-19

## Context

The app renders any public GitHub repository (ADR-0001), so it cannot assume a
repository. A reader must be able to point it at one, return to ones they have
opened before, and — crucially — **share a link that reproduces exactly what
they are looking at**: the repository, the content path, the version, and the
page.

## Decision

- On opening the app with no repository in the URL, it shows a **landing
  form**: a repository field (`owner/name`), a content-path field (empty means
  the repository root), and Load. Below it, a **Recent repositories** list.
- The **URL is the single source of truth** for the current view, held in the
  hash (a static host has no server-side routing):

  ```
  #r=<repo>&p=<path>&v=<version>&f=<page>&a=<anchor>
  ```

  An absent `v` means the repository's default branch ("latest"). Every
  navigation — sidebar, in-page links, the version selector, search — updates
  this hash, so any link is shareable and any view is reproducible.
- The only persisted state is the **recent-repositories history** in
  `localStorage`; the current selection is never persisted, because the URL
  already carries it.
- A top-bar **Close wiki** button clears the URL back to the landing form,
  where the just-closed repository now appears under Recent repositories.

## Consequences

- Sharing the address bar shares the exact repository, path, version and page.
- Reloading or bookmarking a repository view restores it from the URL alone;
  clearing the URL (or a fresh visit) starts at the form.
- The app has no notion of a "default" or "configured" repository, which keeps
  it honestly content-agnostic and removes all per-deployment configuration
  (ADR-0003).
- Recent repositories are a convenience, not addressable state; they never
  appear in shared links.
