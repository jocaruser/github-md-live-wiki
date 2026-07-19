# Local mode

Local mode lets a contributor read uncommitted spec edits
with the same wiki they publish.

- Mounting a directory at `/content` when running the container
  enables the `local` pseudo-version,
  which becomes the starting view.
- The sidebar and pages are built from the mounted directory's
  `.md` files, same rules as remote browsing.
- Local pages re-read the mounted files on every page load —
  refresh the browser to see an edit.
- Links that leave the content tree
  open the file on GitHub at the configured default branch
  (a local checkout's siblings are not served).
- Local pages have no "view on GitHub" source link.
- The version menu keeps offering the remote versions,
  so local edits can be compared against
  latest, any release, branch, or commit.
