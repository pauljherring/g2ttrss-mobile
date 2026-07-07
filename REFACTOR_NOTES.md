Refactor notes — g2ttrss-mobile/js/g2tt.js

Summary: Refactor discussion for g2tt.js

- Goal: Reduce duplication and nesting in g2tt.js, prioritise high-impact, low-risk changes.
- Actions taken: Introduced cookie helpers (`readCookie`, `setCookie`, `delCookie`); split large `$(document).ready(...)` into binding functions; extracted headline rendering helpers (`renderEntryMarkup`, `renderHeadlines`, `handleHeadlinesResponse`); attempted and later reverted an HTML helper `buildTreeRow`.
- Important details to recall later:
  - `handleHeadlinesResponse` intentionally throws on API error (regression acknowledged and retained).
  - `buildTreeRow` was added then removed; current tree-row HTML exists inline in `getTopCategories()` and `getFeeds()`.
  - File to inspect for HTML generation: g2ttrss-mobile/js/g2tt.js
  - Potential next refactor: parameterise and reintroduce a robust `buildTreeRow(id, title, unread, classes, icon)` that preserves class variants (`open-sub-folder`, `closed-sub-folder`, `nested-sub`, `sub`) and icon types (`fa-folder`, `fa-folder-open`, `fa-rss-square`).

How to use: open `g2ttrss-mobile/js/g2tt.js` and search for the "tree row" HTML blocks in `getTopCategories()` and `getFeeds()`.

TODO: Revisit `buildTreeRow(id, title, unread, classes, icon)` to consolidate tree-row HTML; left for a future session.

Additional note (2026-07-07): When refactoring the tree-row markup into a helper, preserve the original class-list spacing so the generated HTML remains identical. In particular, ensure the optional `nested` class is prefixed with a space before it is appended, so rows retain `no-unread-sub-row nested-sub` rather than `no-unread-sub-rownested-sub`.

Saved: 2026-07-05
