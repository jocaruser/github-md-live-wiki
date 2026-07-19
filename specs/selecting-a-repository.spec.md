# Selecting a repository

Live Wiki assumes no repository. A reader points it at one, and the choice —
along with the path, version and page — lives in the URL so any view is
shareable.

## The landing form

Opening the app with no repository in the URL shows a form:

- **Repository** — `owner/name`. Load stays disabled until this is well-formed.
- **Path inside repository** — the directory holding the pages;
  empty means the repository root.
- **Load** — opens the repository.

Submitting trims the inputs and strips wrapping slashes,
then opens `owner/name` at that path.

## The shareable URL

Once open, the whole view is held in the URL hash:

```
#r=<repo>&p=<path>&v=<version>&f=<page>&a=<anchor>
```

- `r` the repository (its absence is the landing form);
- `p` the content path (absent means the root);
- `v` the version — a tag, branch or commit id (absent means "latest", the
  default branch);
- `f` the page within the content path (absent means the overview);
- `a` an in-page anchor.

Every navigation updates this hash, so copying the address bar shares the exact
repository, path, version and page, and reloading or bookmarking restores it.

## Recent repositories

Opening a repository records it in a recent list (most recent first, de-duplicated
by repository and path). On the landing form, below the fields, each recent entry
is shown with its path (or "(root)") and can be reopened with a click or removed.
The recent list is the only thing kept between visits; it never appears in a
shared link.

## Opening and closing

- Opening resolves the repository's default branch;
  a repository that cannot be reached (mistyped, private, or GitHub
  unreachable) shows a "couldn't open" notice with a way back to the form.
- A **Close wiki** button in the top bar returns to the landing form,
  where the just-closed repository now appears under Recent repositories.
