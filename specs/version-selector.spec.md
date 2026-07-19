# Version selector

The top bar names the version being viewed
and opens a menu to change it.
Content is fetched from GitHub at view time,
so every choice below shows that version as it is right now.

## Labels

- The repository's default branch is labelled `latest (<branch>)`.
- Long commit ids are shortened to twelve characters.
- Anything else (a tag or branch name) is shown as-is.
- While the default branch is still being resolved, the trigger shows `…`.

## Menu

In order:

1. **latest (\<default branch\>)** — selecting it drops the version from the URL,
   so the link keeps following the default branch;
2. **Releases** — the repository's tags, newest first,
   or "No releases yet";
3. **Branches** — the repository's branches,
   or "No branches found";
4. **Any commit** — a free-text field taking a commit id;
   submitting an empty field does nothing.

Choosing an entry closes the menu and re-renders at that version,
keeping the current page;
if the page does not exist there, the not-found notice appears instead.
The tag and branch listings refresh after a few minutes at most;
when they cannot be fetched, the menu still opens with its placeholders
and browsing the current version continues to work.

## Failure states

Loading a version can fail; each failure offers "Back to latest",
and the top bar's Close wiki button is always available:

- **GitHub rate limit reached** — the API allowance is exhausted;
  the message says roughly when it resets.
- **Nothing found at this version** — the ref does not exist
  (a mistyped commit id, a deleted branch).
- **No pages at this version** — the ref exists
  but has no Markdown under the content directory
  (for example a tag that predates the content).
- **Could not load the pages** — any other network failure.
