// Config

// URL for the /api parent URL. Can omit https://<hostname>/
// e.g for https://www.example.com/tt-rss/api, use
// - "https://www.example.com/tt-rss" or
// - "/tt-rss"
// a trailing / would be redundant (would cause a double / in the API call)
var global_ttrssUrl = "/tt-rss"; // eslint-disable-line no-unused-vars

// Which feed/category to show by default. Anything over 0 is a regular feed/category ID,
// negative numbers are special feeds:
//      -4 means all items,
//      -3 is unread items,
//      -2 is starred items,
//      -1 is published items,
//       0 and above are feed/category IDs.
var pref_Feed = '140'; // eslint-disable-line no-unused-vars

// View mode: 'unread' or 'all'
var pref_ViewMode = 'unread'; // eslint-disable-line no-unused-vars

// Order by: 'date_reverse' (oldest first [default]) or 'date' (newest first)
var pref_OrderBy = 'date_reverse'; // eslint-disable-line no-unused-vars

// Sort feeds by:
//      '0' (default, no sorting),
//      '1' (sort by title),
//      '2' (sort by unread count)
var pref_FeedSort = '0'; // eslint-disable-line no-unused-vars

// Whether to show feeds or articles, depending on pref_feed
//     '0' (default, show articles),
//     '1' (show feed list instead of articles when pref_feed is a category)
var pref_StartInCat = '0'; // eslint-disable-line no-unused-vars

// How many articles to load at once when scrolling down. Default is 25, but you
// can set it higher if you have a fast connection and want to load more items at
// once.
var pref_Feed_limit = 50; // eslint-disable-line no-unused-vars
