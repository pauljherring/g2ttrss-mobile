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
        toggleStar: 's',
    },
    startCategory: false, // was pref_StartInCat
    lastOpenId: 0,
    // required for main js file, but do not change these here or in user-overrides
    isCategory: false,
    parentId: '-4',
    itemIds: [],
    backCat: [],
    cCats: [],
    cFeeds: [],
    historylist: ['category/-4'],
    parentList: {
        '-4': 'All articles',
    },
    categoryColors: 'none',
    categoryColorSet: {
        pastel: [
            '#f9c2ff', // Orchid Pink
            '#ddddff', // Lavender Mist
            '#c2f9ff', // Electric Blue
            '#c2fce0', // Soft Pale Mint
            '#c2ffc2', // Light Green
            '#e0fcc2', // Creamy Lime
            '#fff9c2', // Pastel Yellow
            '#ffddc2', // Soft Apricot
            '#ffc2c2', // Sunset Pink
            '#ffd1c2', // Pale Coral
            '#ffe1c2', // Peach Apricot
            '#e8d1e0', // Muted Mauve
            '#d2c2ff', // Periwinkle Blue
            '#cae0f7', // Ice Blue
            '#c2fff0', // Mint Teal
            '#c2ebf7', // Soft Duck-Egg Blue
            '#c2d8ff', // Baby Blue
            '#e0cdf0', // Pale Lilac
            '#ffc2e1', // Rose Pink
            '#fcc2f0', // Cotton Candy Pink
        ],
        vibrant: [
            '#ff0000', // Red
            '#808000', // Olive/Dark Yellow
            '#00ff00', // Lime Green
            '#008080', // Teal/Deep Cyan
            '#0000ff', // Blue
            '#808000', // Yellow-Green Mix
            '#ffff00', // Yellow
            '#ff0080', // Deep Pink
            '#ff00ff', // Magenta
            '#8080ff', // Bright Periwinkle
            '#00ffff', // Cyan
            '#80c400', // Acid Lime
            '#ff8800', // Bright Orange
            '#d54480', // Raspberry
            '#aa00ff', // Vivid Purple
            '#5580c4', // Steel Blue
            '#00ff88', // Spring Green
            '#80807f', // Medium Slate
            '#ff0077', // Hot Pink
            '#ff003c', // Crimson Red
        ],
    },
};
