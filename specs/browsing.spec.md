# Browsing

Within an open repository, the wiki shows one Markdown page at a time,
with a sidebar built from the content tree of the version being viewed.
The page and version are part of the shareable URL
(see [`selecting-a-repository.spec.md`](selecting-a-repository.spec.md)).

## Sidebar

The sidebar lists every `.md` file under the chosen content directory
at the version being viewed:

- the root `README.md` comes first, titled by its first heading
  (or "Overview" when it has none);
- loose pages follow, sorted by title;
- each subdirectory becomes a section, recursively.
  A section takes its title and its clickable index from its own `README.md`;
  without one, the capitalised directory name is used as a plain label.
- a top-level `changes/` directory is never shown
  (it holds work-in-progress drafts).

Page titles come from each file's first `#` heading,
falling back to the file name.
The current page is highlighted.
On narrow screens the sidebar folds behind a toggle
and closes after a selection.

## Page rendering

Pages render as GitHub-flavoured Markdown:
tables, task-list checkboxes, autolinked URLs,
syntax-highlighted code fences,
and heading anchors slugged the same way GitHub slugs them.
Raw HTML in the Markdown is not executed.

The browser tab shows `<page title> · <repository>`.
Each page links to its source on GitHub at the shown version.

## Link behaviour

Relative links are rewritten by where they land:

- another `.md` file inside the content tree —
  an in-wiki link at the version being viewed, anchors preserved;
- a non-Markdown file inside the tree (an image, say) —
  the raw file at the shown version;
- a file outside the tree but inside the repository
  (for example `../schema.dbml`) —
  the file on GitHub at the matching version;
- in-page anchors scroll within the page;
- external links are left untouched.

A link to a page that does not exist at the shown version
(a repository may forward-reference planned pages)
navigates to a "page not found at this version" notice
offering the way back to that version's overview.
