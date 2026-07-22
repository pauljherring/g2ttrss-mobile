/*
 * DO NOT change this file - please change/override values in
 * g2tt-user-overrides.js
 */

// not everything here is designed to be configurable, do not override anything
// not currently mentioned in g2tt-user-overrides.js
globalThis.appState = {

    // things overridable in user-overrides
    url: '/tt-rss', // was global_ttrssUrl
    feedId: -4, // was pref_Feed
    viewMode: 'unread', // was pref_ViewMode
    orderBy: 'date_reverse', // was pref-OrderBy
    feedSort: 0, // was pref_FeedSort
    feedLimit: 25, // was pref_Feed_Limit
    keyboardShortcuts: {
        nextEntry: 'j',
        previousEntry: 'k',
        nextPage: 'n',
        previousPage: 'p',
        toggleExpand: 'o',
        toggleRead: 'm',
        toggleStar: 's'
    },
    startCategory: false, // was pref_StartInCat

    // required for main js file, but do not change these here or in user-overrides
    isCategory: false,
    parentId: '-4',
    itemIds: [],
    backCat: [],
};
