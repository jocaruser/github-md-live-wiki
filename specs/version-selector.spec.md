# Version selector

The top bar names the version being viewed
and opens a menu to change it.
Content is fetched from GitHub at view time,
so every choice below shows that version as it is right now —
no wiki deployment is involved.

## Labels

- The configured default branch is labelled `latest (<branch>)`.
- A mounted local directory is labelled `local`.
- Long commit ids are shortened to twelve characters.
- Anything else (a tag or branch name) is shown as-is.

## Menu

In order:

1. **local (mounted directory)** — only when the container has content mounted
   (see [`local-mode.spec.md`](local-mode.spec.md));
2. **latest (\<default branch\>)**;
3. **Releases** — the repository's tags, newest first,
   or "No releases yet";
4. **Branches** — the repository's branches,
   or "No branches found";
5. **Any commit** — a free-text field taking a commit id;
   submitting an empty field does nothing.

Choosing an entry closes the menu and re-renders at that version,
keeping the current page path;
if the page does not exist there, the not-found notice appears instead.
The tag and branch listings refresh after a few minutes at most;
when they cannot be fetched, the menu still opens with its placeholders
and browsing the current version continues to work.

## Failure states

Loading a version can fail; each failure names the way forward
("Back to latest"):

- **GitHub rate limit reached** — the API allowance is exhausted;
  the message says roughly when it resets.
- **Nothing found at this version** — the ref does not exist
  (a mistyped commit id, a deleted branch).
- **No specs at this version** — the ref exists
  but has no markdown under the content directory
  (a tag that predates the content tree).
- **Could not load the specs** — any other network failure.
