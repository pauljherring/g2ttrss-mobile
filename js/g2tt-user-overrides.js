if (globalThis.appState) {
    /* URL for the /api parent URL. Can omit https://<hostname>/ if on the same host
     * e.g for https://www.example.com/tt-rss/api, use
     * - "https://www.example.com/tt-rss" or
     * - "/tt-rss"
     * a trailing / would be redundant (would cause a double / in the API call)
     */
    // globalThis.appState.url = "/tt-rss";

    /* Which feed/category to show by default. Anything over 0 is a regular feed/category ID,
     * negative numbers are special feeds:
     *      -4 means all items,
     *      -3 is unread items,
     *      -2 is starred items,
     *      -1 is published items,
     *       0 and above are feed/category IDs.
     */
    // globalThis.appState.feedId = '-4';

    /* View mode: 'unread' or 'all'
     */
    // globalThis.appState.viewMode = 'unread';

    /* Order by: 'date_reverse' (oldest first [default]) or 'date' (newest first)
     */
    // globalThis.appState.orderBy = 'date_reverse';

    /* Sort feeds by:
     *      '0' (default, no sorting),
     *      '1' (sort by title),
     */
    // globalThis.appState.feedSort = '0';

    /* Whether to show feeds or articles, depending on pref_feed
     *     false (default, show articles),
     *     true (show feed list instead of articles when pref_feed is a category)
     */
    // globalThis.appState.startCategory = false;

    /* How many articles to load at once when scrolling down. Default is 25, but you
     * can set it higher if you have a fast connection and want to load more items at
     * once.
     */
    // globalThis.appState.feedLimit = 25;

    /* Keyboard shortcuts can be customized here. Use lowercase letters.
     * Example: */
    /*
     globalThis.appState.keyboardShortcuts = {
         nextEntry: 'j',
         previousEntry: 'k',
         nextPage: 'n',
         previousPage: 'p',
         toggleExpand: 'o',
         toggleRead: 'm',
         toggleStar: 's'
     };
     */

    /* Which set of colors to use for the category backgrounds. Default is 'none'
     * (no colors, just white), but you can set it to 'pastel' or 'vibrant' if
     * you want to use different pre-defined color schemes. */
    // globalThis.appState.categoryColors = 'none';

    /* You can also define your own set of colors here. Just add a new key to the
     * categoryColorSet object (called 'myColors' in the example), and set it
     * to an array of colors. You should use at least 1 color, but you can use
     * as many as you want. The colors will be used 'randomly' bur unless you
     * change the number, the same color will be used for the same category each time.
     *
     * For example:
     */
    /*
    globalThis.appState.categoryColorSet['myColors'] = [
        '#ff9999',
        '#99ff99',
        '#9999ff',
        '#ffff99',
        '#ff99ff',
    ];
    */
}
