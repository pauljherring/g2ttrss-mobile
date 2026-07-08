Refactor notes — g2ttrss-mobile/js/g2tt.js

Summary: Refactor discussion for g2tt.js

- Goal: Reduce duplication and nesting in g2tt.js, prioritise high-impact, low-risk changes.
- Actions taken: Introduced cookie helpers (`readCookie`, `setCookie`, `delCookie`); split large `$(document).ready(...)` into binding functions; extracted headline rendering helpers (`renderEntryMarkup`, `renderHeadlines`, `handleHeadlinesResponse`); introduced a centralized `appState` object; centralized tree-row HTML rendering in `buildTreeRow`.
- Important details to recall later:
  - `handleHeadlinesResponse` intentionally throws on API error (regression acknowledged and retained).
  - `bindClick()` helper now selects event types for special cases and is not universally click-only; it currently handles `submit` for `#login` and `keypress` for `#search-input`.
  - `appState` must preserve existing init sources and overrides: user-editable config values first, then cookies/defaults.
  - `buildTreeRow` now exists and is used by `getTopCategories()` and `getFeeds()` to centralize tree-row HTML.
  - File to inspect for HTML generation: g2ttrss-mobile/js/g2tt.js
  - Potential next refactor: parameterise and harden `buildTreeRow({id, title, unread, sub, nested, icon})` so it preserves class variants (`open-sub-folder`, `closed-sub-folder`, `nested-sub`, `sub`) and icon types (`fa-folder`, `fa-folder-open`, `fa-rss-square`).

How to use: open `g2ttrss-mobile/js/g2tt.js` and search for the "tree row" HTML blocks in `getTopCategories()` and `getFeeds()`.

TODO: Revisit `buildTreeRow(id, title, unread, classes, icon)` to consolidate tree-row HTML; left for a future session.

Saved: 2026-07-08
