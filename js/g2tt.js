const SUPPORTED_API_LEVEL = 23;

const C_STATUS_OK = 0;
const C_STATUS_ERR = 1;

const E_API_DISABLED = 'API_DISABLED';
const E_NOT_LOGGED_IN = 'NOT_LOGGED_IN';
const E_LOGIN_ERROR = 'LOGIN_ERROR';
const E_INCORRECT_USAGE = 'INCORRECT_USAGE';
const E_UNKNOWN_METHOD = 'UNKNOWN_METHOD';
const E_OPERATION_FAILED = 'E_OPERATION_FAILED';
const E_NOT_FOUND = 'E_NOT_FOUND';

/* updateArticle constants */
/* modes */
const C_UA_FALSE = 0;
const C_UA_TRUE = 1;
const C_UA_TOGGLE = 2;
/* fields */
const C_UA_STAR = 0;
const C_UA_PUBLISH = 1;
const C_UA_UNREAD = 2;
const C_UA_ARTICLE = 3;

if (!Array.prototype.peek) {
    Object.defineProperty(Array.prototype, 'peek', {
        value: function (p = 1) {
            // "this" refers to whatever array calls the method
            if (this.length > p - 1) {
                return this[this.length - p];
            }
            return '';
        },
        enumerable: false, // Keeps it hidden from for...in loops
        configurable: true, // Allows redefinition if needed
        writable: true, // Allows value changes
    });
}

function getErrorObject() {
    try {
        throw Error('');
    } catch (err) {
        return err;
    }
}

/* eslint-disable-next-line no-unused-vars */
function callee() {
    var err = getErrorObject();
    var caller_line = err.stack.split('\n')[3];
    var index = caller_line.indexOf('at ');
    var clean = caller_line.slice(index + 2, caller_line.length);
    return clean;
}

function readCookie(name, fallback = undefined) {
    const value = $.cookie(name);
    return typeof value !== 'undefined' ? value : fallback;
}

function setCookie(name, value, days = undefined) {
    const oldVal = readCookie(name);
    if (typeof days === 'undefined') {
        $.cookie(name, value);
    } else {
        $.cookie(name, value, {
            expires: days,
        });
    }
    return oldVal;
}

function delCookie(name) {
    const oldVal = readCookie(name);
    $.removeCookie(name);
    return oldVal;
}

function getHistoryBasePath() {
    const pathname = window.location.pathname || '/';
    const search = window.location.search || '';
    const basePath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${basePath}${search}`;
}

function buildHistoryUrl(entry) {
    const route = normalizeRoute(entry);
    const cleanedRoute = String(route || '').replace(/^\/+|\/+$/g, '');
    const basePath = getHistoryBasePath();

    if (!cleanedRoute || cleanedRoute === 'category/-4') {
        return `${basePath}#`;
    }

    const [type, id] = cleanedRoute.split('/');
    const compactRoute = `${type}-${id}`;
    const baseWithoutHash = basePath.replace(/#.*/, '');
    return `${baseWithoutHash}#${compactRoute}`;
}

function normalizeRoute(route) {
    const raw = String(route || '');
    const withoutOrigin = raw.replace(/^https?:\/\/[^/]+/, '');
    const hashValue = withoutOrigin.includes('#') ? withoutOrigin.split('#').pop() : '';
    const cleaned = String(hashValue || withoutOrigin.replace(/^#/, '') || '').replace(/^\/+|\/+$/g, '');

    if (!cleaned) {
        return 'category/-4';
    }

    const compactMatch = cleaned.match(/^(category|categoryfeed|feed)-(.+)$/i);
    if (compactMatch) {
        return `${compactMatch[1].toLowerCase()}/${compactMatch[2]}`;
    }

    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length === 1) {
        return `category/${parts[0]}`;
    }

    if (parts.length >= 2 && ['category', 'categoryfeed', 'feed'].includes(parts[0])) {
        return `${parts[0].toLowerCase()}/${parts[1]}`;
    }

    return 'category/-4';
}

function pushHistory(t) {
    const { historylist } = globalThis.appState;
    const entry = normalizeRoute(t);
    if (historylist[historylist.length - 1] !== entry) {
        historylist.push(entry);
    }
    if (window.location.hash.replace(/^#/, '') !== entry) {
        window.location.hash = entry;
    }
    setCookie('g2tt_history', JSON.stringify(historylist.slice(-20)));
    console.log('Pushed to history: ' + entry + ' - stack: ' + JSON.stringify(historylist));
}

function popHistory() {
    const { historylist } = globalThis.appState;
    const h = historylist.pop();
    const nextEntry = historylist.peek();
    const entry = nextEntry || 'category/-4';
    history.replaceState({ page: entry }, '', buildHistoryUrl(entry));
    setCookie('g2tt_history', JSON.stringify(historylist.slice(-20)));
    console.log('Popped from history: ' + h + ' - stack: ' + JSON.stringify(historylist));
    return entry;
}

function resetHistory() {
    let { historylist } = globalThis.appState;
    historylist.length = 0;
    setCookie('g2tt_history', JSON.stringify([]));
    history.replaceState({ page: 'category/-4' }, '', buildHistoryUrl('category/-4'));
}

function JSONSafeParse(str) {
    // Check for empty input
    if (!str || typeof str !== 'string') {
        console.error('Invalid input: expected non-empty string');
        return null;
    }

    // Trim whitespace and BOM
    str = str.trim().replace(/^\uFEFF/, '');

    try {
        return JSON.parse(str);
    } catch (error) {
        console.error('JSON parse error:', error.message);

        // Try to identify the problem location
        const match = error.message.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1]);
            console.error(
                'Error near:',
                str.substring(Math.max(0, pos - 20), pos + 20)
            );
        }
        return [];
    }
}

globalThis.appState.feedId = readCookie(
    'g2tt_feed',
    globalThis.appState.feedId
);
globalThis.appState.isCategory =
    readCookie('g2tt_isCat', globalThis.appState.isCategory) === 'true';
globalThis.appState.viewMode = readCookie(
    'g2tt_viewMode',
    globalThis.appState.viewMode
);
globalThis.appState.orderBy = readCookie(
    'g2tt_orderBy',
    globalThis.appState.orderBy
);
globalThis.appState.feedSort = readCookie(
    'g2tt_feedSort',
    globalThis.appState.feedSort
);
globalThis.appState.feedLimit = readCookie(
    'g2tt_feedLimit',
    globalThis.appState.feedLimit
);
globalThis.appState.historylist =
    JSONSafeParse(readCookie('g2tt_history', '[]')) || [];

function bindClick(selector, callback) {
    let eventType = 'click';
    switch (selector) {
        case '#login':
            eventType = 'submit';
            break;
        case '#search-input':
            eventType = 'keypress';
            break;
        default:
    }
    $(selector).off(eventType).on(eventType, callback);
}

function bindGlobalUi() {
    bindClick('html', function () {
        $('#header-menu').removeClass('m-button-pressed');
        $('#menuDown').removeClass('hidden');
        $('#menuUp').addClass('hidden');
        $('.g2tt-menu').hide();
    });
}

function bindLoginForm() {
    bindClick('#login', function (event) {
        if (
            bindLoginForm.request !== undefined &&
            bindLoginForm.request.abort !== undefined
        ) {
            console.log('Aborting previous login request...');
            console.log(bindLoginForm.request);
        }

        const loginForm = $(this);
        const inputs = loginForm.find('input');
        let values = {};
        inputs.each(function () {
            values[this.name] = $(this).val();
        });

        const data = {
            op: 'login',
            user: values.Username,
            password: values.Passwd,
        };

        inputs.prop('disabled', true);

        bindLoginForm.request = apiCall(data);

        bindLoginForm.request.done(function (loggedIn) {
            $('.login').addClass('hidden');
            $('#main').removeClass('hidden');
            if (loggedIn.api_level < SUPPORTED_API_LEVEL) {
                window.alert(
                    'Current TT-RSS API version (' +
                        loggedIn.api_level +
                        ') is unsupported, require at least version ' +
                        SUPPORTED_API_LEVEL
                );
                logoutToHomepage();
            }
            clearCookies();
            setCookie('g2tt_sid', loggedIn.session_id, 7);
            load();
        });

        // callback handler that will be called regardless
        // if the request failed or succeeded
        bindLoginForm.request.always(function () {
            // reenable the inputs
            inputs.prop('disabled', false);
        });

        // prevent default posting of form
        event.preventDefault();
    });
    //end of #login function
}

function bindLoadMore() {
    bindClick('#load-more-items', function () {
        let last;
        if (appState.orderBy == 'date_reverse') {
            last = $('.entry-row').last().attr('id');
        } else {
            last = $('.entry-row').length;
        }
        getHeadlines(last);
    });
}
function bindHeader() {
    // Menu button
    bindClick('#header-menu', function (event) {
        const headerMenu = $(this);
        const menuDown = $('#menuDown');
        const menuUp = $('#menuUp');
        const menus = $('.g2tt-menu');
        const navBar = $('.nav-bar-container');

        headerMenu.toggleClass('m-button-pressed');
        menuDown.toggleClass('hidden');
        menuUp.toggleClass('hidden');

        //Adjust the placement of the menu based on the height of the Nav bar
        //(for when category title is long)
        menus.css({
            top: parseInt(navBar.height()) - 8 + 'px',
        });
        menus.toggle();
        event.stopPropagation();
    });

    // Refresh button
    bindClick('#header-refresh', function () {
        $(this).addClass('m-button-pressed');
        if ($('#subscriptions').is(':hidden')) {
            location.reload(true);
        } else {
            refreshCats();
        }
    });
}

function bindViewMode() {
    const viewModeItems = $('.showItem');
    const feedItems = $('.feedsItem');
    const subscriptions = $('#subscriptions');
    const entries = $('#entries');

    // View mode menu selection
    $('#' + appState.viewMode).addClass('g2tt-option-selected');
    bindClick('.showItem', function () {
        const selected = $(this);
        appState.viewMode = selected.attr('id');
        setCookie('g2tt_viewMode', appState.viewMode);
        viewModeItems.removeClass('g2tt-option-selected');
        selected.addClass('g2tt-option-selected');
        feedItems.removeClass('g2tt-option-selected');
        $('#feeds-' + appState.viewMode).addClass('g2tt-option-selected');
        entries.empty();
        subscriptions.attr('class', 'hidden show-' + appState.viewMode);
        getHeadlines();
    });
}

function bindSortMode() {
    const sortItems = $('.sortItem');
    const entries = $('#entries');

    $('#' + appState.orderBy).addClass('g2tt-option-selected');
    bindClick('.sortItem', function () {
        const selected = $(this);
        appState.orderBy = selected.attr('id');
        setCookie('g2tt_orderBy', appState.orderBy);
        sortItems.removeClass('g2tt-option-selected');
        selected.addClass('g2tt-option-selected');
        entries.empty();
        getHeadlines();
    });
}

function bindFeedsMenu() {
    const feedItems = $('.feedsItem');
    const viewModeItems = $('.showItem');
    const subscriptions = $('#subscriptions');

    // View mode feeds menu selection
    $('#feeds-' + appState.viewMode).addClass('g2tt-option-selected');
    subscriptions.addClass('show-' + appState.viewMode);
    bindClick('.feedsItem', function () {
        const selected = $(this);
        const viewMode = selected.attr('id').substring(6);
        appState.viewMode = viewMode;
        setCookie('g2tt_viewMode', appState.viewMode);
        feedItems.removeClass('g2tt-option-selected');
        selected.addClass('g2tt-option-selected');
        viewModeItems.removeClass('g2tt-option-selected');
        $('#' + appState.viewMode).addClass('g2tt-option-selected');
        subscriptions.attr('class', 'show-' + viewMode);
    });
}

function bindSubscription() {
    bindClick('#add-new-subscription', function () {
        getCategoriesForNewSubscribe();
        $('#dialog-form').dialog('open');
    });
}

function bindSort() {
    // Sort feeds A-Z
    if (appState.feedSort == '1') {
        $('.feedsSort').addClass('g2tt-option-selected');
    }
    bindClick('.feedsSort', function () {
        if (appState.feedSort == '1') {
            appState.feedSort = '0';
        } else {
            appState.feedSort = '1';
        }
        setCookie('g2tt_feedSort', appState.feedSort);
        $(this).toggle('g2tt-option-selected');
    });
}

function handleBackToFeeds() {
    const previousRoute = popHistory();
    markEntryRead();
    refreshCats();
    applyRoute(previousRoute);
}

function handleBackToSubCategory() {
    const previousRoute = popHistory();
    refreshCats();
    applyRoute(previousRoute);
    if (appState.parentId == '-4') {
        $('#add-new-subscription').removeClass('hidden');
    }
}

function bindBackButtons() {
    // Back to Feeds
    bindClick('.back-to-feeds', function () {
        handleBackToFeeds();
    });

    // Back to Feeds from sub category
    bindClick('#sub-list-back', function () {
        handleBackToSubCategory();
    });
}

function bindSubscriptionRowActions() {
    $('#subscriptions-list')
        .off('click.g2tt', '.closed-sub-folder')
        .off('click.g2tt', '.open-sub-folder[id!="tree-item--4"]')
        .off('click.g2tt', '.sub')
        .off('click.g2tt', '#tree-item--4')
        .on('click.g2tt', '.closed-sub-folder', function () {
            const id = $(this).attr('id').substring(10);
            appState.backCat.push(appState.parentId);
            $('#subscriptions-list').children().addClass('hidden');
            getFeeds(
                id,
                $(this).find('.sub-item').html(),
                $(this).find('.item-count-value').html()
            );
            pushHistory('category/' + id);
        })
        .on('click.g2tt', '.open-sub-folder[id!="tree-item--4"]', function () {
            const id = $(this).attr('id').substring(10);
            setCookie('g2tt_feed', id);
            setCookie('g2tt_isCat', true);
            appState.feedId = readCookie('g2tt_feed');
            appState.isCategory = readCookie('g2tt_isCat') === 'true';
            getData();
            pushHistory('categoryfeed/' + id);
        })
        .on('click.g2tt', '.sub', function () {
            const id = $(this).attr('id').substring(10);
            setCookie('g2tt_feed', id);
            setCookie('g2tt_isCat', false);
            appState.feedId = readCookie('g2tt_feed');
            appState.isCategory = readCookie('g2tt_isCat') === 'true';
            getData();
            pushHistory('feed/' + id);
        })
        .on('click.g2tt', '#tree-item--4', function () {
            const id = $(this).attr('id').substring(10);
            if (id === '-4') {
                setCookie('g2tt_feed', id);
                setCookie('g2tt_isCat', false);
                appState.feedId = readCookie('g2tt_feed');
                appState.isCategory = readCookie('g2tt_isCat') === 'true';
                getData();
                pushHistory('feed/-4');
                return;
            }
            setCookie('g2tt_feed', id);
            setCookie('g2tt_isCat', false);
            appState.feedId = readCookie('g2tt_feed');
            appState.isCategory = readCookie('g2tt_isCat') === 'true';
            getData();
            pushHistory('categoryfeed/' + id);
        });
}

function bindMarkRead() {
    // Mark all as read
    bindClick('#show-more-row, #menu-mark-read', function () {
        $('body').removeClass('loaded').addClass('loading');
        $('.load-more-message').html('Marking as read...');
        //remove those that need to be kept unread
        keepUnread.removeFromArray(appState.itemIds);
        const data = {
            op: 'updateArticle',
            article_ids: appState.itemIds.join(','),
            mode: C_UA_FALSE,
            field: C_UA_UNREAD,
        };
        const request = apiCall(data);

        request.done(function (_response) {
            $('#entries').empty();
            getHeadlines();
        });
        refreshCats(true);
    });
}

function clearCookies() {
    delCookie('g2tt_feed');
    delCookie('g2tt_isCat');
    delCookie('g2tt_viewMode');
    delCookie('g2tt_orderBy');
    delCookie('g2tt_keepUnread_ids');
    delCookie('g2tt_sid');
    delCookie('g2tt_history');
}

function logoutToHomepage() {
    clearCookies();
    location.reload(true);
}

function bindLogout() {
    bindClick('#menu-logout', function () {
        const data = {
            op: 'logout',
        };
        const request = apiCall(data);

        request.done(function (_content) {
            resetHistory();
            logoutToHomepage();
        });
    });
}

const loadScript = function (url, callback) {
    jQuery.ajax({
        url: url,
        dataType: 'script',
        success: callback,
        async: false,
    });
};

function logTurndown(script, status, _object) {
    if (status != 'success') {
        window.alert("Couldn't load conversion tool (Turndown)");
        throw new Error('Turndown missing');
    }
}

function bindEmail() {
    $('#feed')
        .off('click.g2tt', '.createmail')
        .on('click.g2tt', '.createmail', function () {
            if (typeof TurndownService == 'undefined') {
                loadScript('js/turndown.js', logTurndown);
            }

            const entryContainer = $(this).closest('.entry-container');
            const title = entryContainer.find('.item-title-collapsed').html();
            const body = entryContainer.find('.entry-contents-inner').html();
            const anchor = entryContainer
                .find('.entry-header-body .text a.item-title-link')
                .attr('href');
            const anchorText = entryContainer
                .find('.entry-header-body .text a.item-title-link')
                .text()
                .trim();
            const email_subject = title;
            const turndownService = new TurndownService();
            let email_body = turndownService.turndown(
                '<br><h4>Sent to you via tt-rss</h4><h2><a href="' +
                    anchor +
                    '">' +
                    anchorText +
                    '</a></h2>' +
                    body
            );
            if (email_body.length > 2500) {
                email_body =
                    email_body.slice(0, 2000) +
                    ' [truncated - visit URL for full article]';
            }
            const mailto = `mailto:?subject=${fixedEncodeURIComponent(email_subject)}&body=${fixedEncodeURIComponent(email_body)}`;
            window.open(mailto, '_self');
        });
}

function bindNavigation() {
    bindLoadMore();
    bindHeader();
    bindViewMode();
    bindSortMode();
    bindFeedsMenu();
    bindSubscription();
    bindSort();
    bindBackButtons();
    bindMarkRead();
    bindLogout();
    bindEmail();
    bindSubscriptionRowActions();
}

function bindSearchUi() {
    const searchBox = $('.search-box');
    const searchInput = $('#search-input');
    const entries = $('#entries');

    // Search
    // Show search
    bindClick('#menu-search', function () {
        searchBox.removeClass('hidden');
        searchInput.trigger('focus');
    });
    // Clear and hide search
    bindClick('#search-cancel', function () {
        searchInput.val('');
        searchBox.addClass('hidden');
    });
    // Enter in search field searches
    bindClick('#search-input', function (e) {
        if (e.which == 13) {
            jQuery(this).blur();
            jQuery('#search-submit').trigger('focus').trigger('click');
            return false;
        }
    });
    // Remove currently displayed headlines and search
    bindClick('#search-submit', function () {
        entries.empty();
        getHeadlines();
        return false;
    });
}

function bindSubscriptionUi() {
    //Added for Subscribe to New Feeds
    $('.ui-loader').remove();

    const feedURL = $('#feedURL');
    const allFields = $([]).add(feedURL);
    const tips = $('.validateTips');

    function updateTips(t) {
        tips.text(t).addClass('ui-state-highlight').removeClass('hidden');
        setTimeout(function () {
            tips.removeClass('ui-state-highlight', 1500);
        }, 500);
    }

    function checkLength(o, n, min, max) {
        if (o.val().length > max || o.val().length < min) {
            o.addClass('ui-state-error');
            updateTips(
                'Length of ' +
                    n +
                    ' must be between ' +
                    min +
                    ' and ' +
                    max +
                    '.'
            );
            return false;
        } else {
            return true;
        }
    }

    function firstToUpperCase(str) {
        return str.substr(0, 5).toLowerCase() + str.substr(5);
    }

    function checkRegexp(o, regexp, n) {
        const makeOvalidHttp = o.val().trim();
        if (!regexp.test(firstToUpperCase(makeOvalidHttp))) {
            o.addClass('ui-state-error');
            updateTips(n);
            return false;
        } else {
            return true;
        }
    }

    $('#dialog-form').dialog({
        autoOpen: false,
        //height: 300,
        dialogClass: 'dialog-nav-bar',
        draggable: false,
        resizable: false,
        //position: { my: "left top", at: "left top" } ,
        position: [5, 10],
        width: 300,
        modal: true,
        buttons: {
            Subscribe: function () {
                let bValid = true;
                allFields.removeClass('ui-state-error');
                tips.addClass('hidden');

                bValid = bValid && checkLength(feedURL, 'URL', 5, 1000);
                bValid =
                    bValid &&
                    checkRegexp(
                        feedURL,
                        /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!-/]))?$/,
                        'URL must be a valid URL. Make sure the URL is correct and re-submit'
                    );

                // From jquery.validate.js (by joern), contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/

                if (bValid) {
                    const catIDnum = $('#catItems option:selected').val();
                    const feedURLTrimmed = firstToUpperCase(
                        feedURL.val().trim()
                    );

                    const multipleFeedSelected = $(
                        '#feedsAvail option:selected'
                    ).val();

                    if (multipleFeedSelected == null) {
                        $('#feedURL').val(feedURLTrimmed);
                        subscribe(feedURLTrimmed, catIDnum);
                    } else {
                        $('#feedURL').val(multipleFeedSelected);
                        subscribe(multipleFeedSelected, catIDnum);
                    }
                }
            },
            Cancel: function () {
                $(this).dialog('close');
            },
        },
        close: function () {
            allFields.val('').removeClass('ui-state-error');
        },
    });
}

function bindKeyboardShortcuts() {
    $(document).off('keypress.g2tt').on('keypress.g2tt', function (event) {
        const shortcuts = globalThis.appState.keyboardShortcuts || {};
        const key = String.fromCharCode(event.which).toLowerCase();

        if (key === (shortcuts.nextEntry || 'j')) {
            expandNextEntry();
        } else if (key === (shortcuts.previousEntry || 'k')) {
            expandPreviousEntry();
        } else if (key === (shortcuts.nextPage || 'n')) {
            jumpNextEntry();
        } else if (key === (shortcuts.previousPage || 'p')) {
            jumpPreviousEntry();
        } else if (key === (shortcuts.toggleExpand || 'o')) {
            toggleCurrentEntryAsExpanded();
        } else if (key === (shortcuts.toggleRead || 'm')) {
            toggleCurrentEntryAsRead();
        } else if (key === (shortcuts.toggleStar || 's')) {
            toggleCurrentEntryAsStar();
        }
    });
}

function toggleCurrentEntryAsStar(_entryRow) {
    const currentEntry = $('.current-entry');
    if (!currentEntry.length) {
        return;
    }

    toggleEntryStar(currentEntry);
}

function bindBackFunctions() {
    $(window).off('hashchange.g2tt').on('hashchange.g2tt', function () {
        const route = normalizeRoute(window.location.hash || window.location.pathname);
        if (!route) {
            return;
        }

        const lastEntry = globalThis.appState.historylist[globalThis.appState.historylist.length - 1];
        if (lastEntry && lastEntry !== route) {
            const existingIndex = globalThis.appState.historylist.indexOf(route);
            if (existingIndex >= 0) {
                globalThis.appState.historylist.length = existingIndex + 1;
            } else {
                globalThis.appState.historylist.push(route);
            }
        }

        applyRoute(route);
    });
}

$(document).ready(function () {
    const initialPage = normalizeRoute(window.location.hash || window.location.pathname || window.location.search);
    history.replaceState({ page: initialPage }, '', buildHistoryUrl(initialPage));
    console.log('initial page: ' + initialPage);

    bindGlobalUi();
    bindLoginForm();
    bindNavigation();
    bindSearchUi();
    bindSubscriptionUi();
    bindKeyboardShortcuts();
    bindBackFunctions(); // TODO - this needs more examination while sober...
    load();
});

function refreshCats(countersOnly = false) {
    const data = {
        op: 'getCounters',
        output_mode: 'fc',
    };
    const request = apiCall(data);

    request.done(function (counters) {
        appState.cCats.length = 0;
        appState.cFeeds.length = 0;

        for (let i = 0; i < counters.length; i += 1) {
            if (counters[i].kind == 'cat') {
                appState.cCats[counters[i].id] = counters[i];
            } else {
                appState.cFeeds[counters[i].id] = counters[i];
            }
        }
        if (countersOnly) {
            return;
        }

        const subscriptions = $('#subscriptions');
        const subRows = $('.sub-row');

        subRows.each(function () {
            const row = $(this);
            const id = row.attr('id').substring(10);
            const isCat =
                row.hasClass('open-sub-folder') ||
                row.hasClass('closed-sub-folder');
            const countValue = row.find('.item-count-value');
            let counter = 0;

            if (id == '-4' || id == '-1') {
                counter = appState.cFeeds['global-unread']?.counter ?? 0;
            } else if (isCat) {
                counter = appState.cCats[id]?.counter ?? 0;
            } else if (typeof appState.cFeeds[id] !== 'undefined') {
                counter = appState.cFeeds[id].counter;
            }

            countValue.html(counter);
            if (counter == '0' || counter === 0) {
                row.addClass('no-unread-sub-row').removeClass('unread-sub');
            } else {
                row.removeClass('no-unread-sub-row').addClass('unread-sub');
            }

            if (id == '-4' || id == '-1') {
                if (counter == '0' || counter === 0) {
                    subscriptions
                        .removeClass('show-unread')
                        .addClass('show-all');
                } else if (
                    appState.viewMode == 'unread' &&
                    subscriptions.hasClass('show-all')
                ) {
                    subscriptions
                        .removeClass('show-all')
                        .addClass('show-unread');
                }
            }
        });
        showEmpty();

        $('#header-refresh').removeClass('m-button-pressed');
    });
}

function showEmpty() {
    const visible = $('#sub-' + appState.parentId).children(':visible');
    const subscriptions = $('#subscriptions');
    if (visible.length == 0) {
        subscriptions.removeClass('show-unread').addClass('show-all');
    }
}

function showFeeds() {
    $('#feed').addClass('hidden');
    $('#subscriptions').removeClass('hidden');
    $('.back-to-feeds').addClass('hidden');
    $('.articlesMenu').addClass('hidden');
    $('.feedsMenu').removeClass('hidden');
    //added to show + for adding new subscriptions
    $('#add-new-subscription').removeClass('hidden');
    if (appState.parentId != -4) {
        $('#sub-list-back').removeClass('hidden');
        //added to show + for hiding new subscriptions
        $('#add-new-subscription').addClass('hidden');
    }
    $('#nav-title').html('');
}

function showArticles() {
    $('#feed').removeClass('hidden');
    $('#subscriptions').addClass('hidden');
    //added to hide + for add new subscriptions
    $('#add-new-subscription').addClass('hidden');

    $('.back-to-feeds').removeClass('hidden');
    $('.articlesMenu').removeClass('hidden');
    $('.feedsMenu').addClass('hidden');
    $('#sub-list-back').addClass('hidden');
}

function handleAjaxError(jqXHR, textStatus, errorThrown) {
    if (jqXHR.content === undefined || jqXHR.status === undefined) {
        window.alert('Unexpected (non-)response from server: ' + textStatus);
        console.error(jqXHR);
        console.error(textStatus);
        console.error(errorThrown);
        // throw new Error("Unexpected response");
    }

    if (jqXHR.content.error == E_API_DISABLED) {
        window.alert(
            'The API Settings are disabled. Login on the desktop version and enable both API settings in the Preferences.'
        );
        logoutToHomepage();
    }
    if (jqXHR.content.error == E_NOT_LOGGED_IN) {
        window.alert('You are not logged in or your session has expired.');
        logoutToHomepage();
    }
    if (jqXHR.content.error == E_LOGIN_ERROR) {
        window.alert('Username and/or password were incorrect.');
    }
    if (jqXHR.content.error == E_INCORRECT_USAGE) {
        window.alert('API error: Incorrect usage');
    }
    if (jqXHR.content.error == E_UNKNOWN_METHOD) {
        window.alert('API error: Unknown method called');
    }
    if (jqXHR.content.error == E_OPERATION_FAILED) {
        window.alert('API error: Operation failed');
    }
    if (jqXHR.content.error == E_NOT_FOUND) {
        window.alert('API error: Icon not found)');
    }
}

function handleApiStatusError(response) {
    throw response;
}

function apiCall(data, opts = {}) {
    data.sid = readCookie('g2tt_sid');
    return $.ajax({
        url: appState.url + '/api/',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(data),
        async: opts.async !== false,
        timeout: opts.timeout || 15000,
    })
        .then((response) => {
            if (response.status !== C_STATUS_OK) {
                handleApiStatusError(response);
                return $.Deferred().reject(response).promise();
            }
            return response.content;
        })
        .fail((jqXHR, textStatus, errorThrown) => {
            handleAjaxError(jqXHR, textStatus, errorThrown);
            return $.Deferred()
                .reject({ jqXHR, textStatus, errorThrown })
                .promise();
        });
}

function fixedEncodeURIComponent(str) {
    // encodeURIComponent fails to encode, e.g., single quotes
    // https://stackoverflow.com/a/32525285
    return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}

function headlineExcerpt(headline) {
    if (headline.excerpt && headline.excerpt !== '&hellip;') {
        return headline.excerpt;
    }
    return $(headline.content).text().substr(0, 100) + '&hellip;';
}

function headlineContentHtml(content) {
    const html = $(content);
    if (html.length === 1 && html.is('img')) {
        const alt = html.attr('title') || html.attr('alt');
        if (alt) {
            return `<div>${html[0].outerHTML}<div>${alt}</div></div>`;
        }
    }
    if (html.length === 1) {
        return html[0].outerHTML;
    }
    const container = $('<div></div>');
    container.append(html);
    return container[0].outerHTML;
}

function buildHeadlinesEntry(headline) {
    const contentHtml = headlineContentHtml(headline.content);
    const excerpt = headlineExcerpt(headline);
    const readClass = !headline.unread ? ' read' : '';
    const starClass = headline.marked ? 'starActive' : 'starNotActive';
    const formattedDate = new Date(headline.updated * 1000).toLocaleString();

    return `
<div id='${headline.id}' class='entry-row whisper${readClass}'>
    <div class='entry-container'>
        <div class='entry-top-bar'>
            <span class='link entry-next'>
                <span class='entry-next-fa-icon'>
                    <i class='fa fa-arrow-down'></i>
                </span>
                <span class='entry-next-text'>Next item</span>
            </span>
            <span class='link entry-collapse'>
                <span class='entry-collapse-fa-icon'><i class='fa fa-bars'></i></span>
                <span class='entry-collapse-text'>Collapse</span>
            </span>
        </div>
        <div class='entry-header'>
            <div class='entry-icons'>
                <i class='favStarDiv fa-regular fa-star fa-2x starBorder'> </i>
                <i class='favStar fa fa-star fa-2x ${starClass}'></i>
            </div>
            <div class='entry-header-body'>
                <div class='text'>
                    <span class='item-title-collapsed'>${headline.title}</span>
                    <a href='${headline.link}' class='item-title item-title-link' target='_blank'>
                        ${headline.title}
                    </a>
                    <span class='item-source-title'>&nbsp;-&nbsp;${headline.feed_title}</span>
                    <div class='item-snippet'>${excerpt}</div>
                </div>
                <div class='entry-sub-header'>by ${headline.author}  on ${formattedDate} + "</div>
            </div>
        </div>
        <div class='entry'>
            <div id='entry-contents' class='entry whisper'>
                <div class='entry-annotations'></div>
                <div class='entry-contents-inner'>
                    ${contentHtml}
                </div>
            </div>
            <div class='entry-footer'>
                <div class='entry-actions'>
                    <div class='entry-actions-primary'>
                        <span class='read-state link unselectable' title='Toggle read'>
                            <i class='fa fa-book-open'></i>&nbsp;Mark unread\
                        </span>
                        <span class='link unselectable' title='Send by mail'>
                            <i class='fa fa-envelope' style='vertical-align:top;'></i>
                            <span class='createmail link'>E-Mail</a>
                        </span>
                        <wbr />
                    </div>
                </div>
            </div>
            <div class='action-area-container'></div>
        </div>
    </div>
</div>`;
}

function renderHeadlines(headlines) {
    if (!headlines || !headlines.length) {
        return;
    }

    const entries = $('#entries');
    let html = '';

    for (let index = 0; index < headlines.length; index += 1) {
        const headline = headlines[index];
        appState.itemIds.push(headline.id);
        html += buildHeadlinesEntry(headline);
    }

    if (html) {
        entries.append(html);
    }
}

function bindHeadlineEvents() {
    // Expand an entry
    bindClick('.entry-header-body', function () {
        expandEntry($(this).closest('.entry-row'));
    });

    // Collapse an entry
    bindClick('.entry-top-bar', function () {
        collapseEntry($(this).closest('.entry-row'));
    });

    // Next entry
    bindClick('.entry-next', function (event) {
        expandEntry($(this).closest('.entry-row').next());
        event.stopPropagation();
    });

    // Toggle read
    bindClick('.read-state', function () {
        toggleEntryAsRead($(this).closest('.entry-row'));
    });

    // Mark NewFont (star) entry
    bindClick('.favStarDiv', function () {
        toggleEntryStar($(this).closest('.entry-row'));
    });
}

function toggleEntryStar(entryRow) {
    if (!entryRow.length) {
        return;
    }

    const starIcon = entryRow.find('.favStarDiv').next();
    const data = {
        op: 'updateArticle',
        article_ids: entryRow.attr('id'),
        mode: C_UA_TOGGLE,
        field: C_UA_STAR,
    };
    apiCall(data);
    starIcon.toggleClass('starNotActive').toggleClass('starActive');
}

function finaliseHeadlines(headlines) {
    const body = $('body');
    const loadMoreMessage = $('.load-more-message');
    const entriesCount = $('.entries-count');
    const entryRows = $('.entry-row');

    // Done loading
    body.removeClass('loading').addClass('loaded');
    if (headlines.length > 0) {
        loadMoreMessage.html('Mark these items as read');
    } else {
        loadMoreMessage.html(''); // effectively invisible?
    }
    const { isCategory, feedId, cCats, cFeeds } = appState;
    let total =
        isCategory ?
            (cCats[feedId]?.counter ?? '??')
        :   (cFeeds[feedId]?.counter ?? '??');
    if (total === 0) {
        total = '';
    } else if (total > 50) {
        // hacky - TTRSS counter totals don't necessarily match up with the
        // actual number of rows displayed. Don't know why.
        total = `<abbr title="Totals may be inaccurate">/~${Math.ceil(total / 10) * 10}</abbr>`;
    } else {
        total = `/${total}`;
    }

    entriesCount.html(`Showing ${entryRows.length}${total} items`);
    keepUnread.clean(appState.itemIds);
}

function getHeadlinesRequest(since) {
    if (typeof since === 'undefined') since = 0;

    // console.log(`*** getHeadlinesRequest(${since})`);

    const search = $('#search-input').val();
    const data = {
        op: 'getHeadlines',
        feed_id: appState.feedId,
        limit: appState.feedLimit,
        show_excerpt: 1,
        show_content: 1,
        include_attachments: 0,
        view_mode: appState.viewMode,
        is_cat: appState.isCategory,
        include_nested: true,
        order_by: appState.orderBy,
        search: search,
    };
    // console.log(
    //     `appState.feedId: ${appState.feedId} appState.viewMode: ${appState.viewMode} appState.isCategory: ${appState.isCategory} appState.orderBy: ${appState.orderBy}`
    // );

    if (appState.orderBy == 'date_reverse') {
        data.since_id = since;
    } else {
        data.skip = since;
    }

    return apiCall(data);
}

function updateHeadlinesPagination(headlineCount, limit) {
    if (headlineCount != limit) {
        $('#load-more-items').hide();
    } else {
        $('#load-more-items').show();
    }
}

function handleHeadlinesResponse(headlines) {
    updateHeadlinesPagination(headlines.length, appState.feedLimit);
    renderHeadlines(headlines);
    bindHeadlineEvents();
    finaliseHeadlines(headlines);
}

function getHeadlines(since) {
    $('body').addClass('loading');
    $('.load-more-message').html('Loading...');
    $('.entries-count').html('');

    getHeadlinesRequest(since).done(function (headlines) {
        handleHeadlinesResponse(headlines);
    });
}

const TREE_ROW_ICON_MAP = Object.freeze({
    'open-sub-folder': 'fa-folder-open',
    'closed-sub-folder': 'fa-folder',
    sub: 'fa-rss-square',
});

function buildAllArticlesRow(content) {
    return buildTreeRow({
        obj: content,
        sub: 'open-sub-folder',
    });
}

function buildCategoryRow(cat) {
    return buildTreeRow({
        obj: cat,
        sub: 'closed-sub-folder',
        nested: 'nested-sub',
    });
}

function buildParentFolderRow(parent) {
    return buildTreeRow({
        obj: parent,
        sub: 'open-sub-folder',
    });
}

function buildFeedRow(feed) {
    return buildTreeRow({
        obj: feed,
        sub: feed.is_cat ? 'closed-sub-folder' : 'sub',
    });
}

function buildTreeRow(row) {
    const icon = TREE_ROW_ICON_MAP[row.sub] || 'fa-question-circle';
    const unread = row.obj.unread > 0 ? 'unread-sub' : 'no-unread-sub-row';
    const classes = ['row', 'whisper', 'sub-row', row.sub, unread, row.nested]
        .filter(Boolean)
        .join(' ');

    return `
<div class='${classes}' id='tree-item-${row.obj.id}'>
    <div class='icon-cell'>
        <i class='fa ${icon} fa-lg'></i>
    </div>
    <div class='text sub-item'> ${row.obj.title} </div>
    <div class='item-count larger whisper'>
        <span class='item-count-value' id='tree-item-${row.obj.id}-unread-count'>
            ${row.obj.unread}
        </span>
    </div>
</div>`;
}

function compareBySortMode(a, b) {
    const db_order =
        a.order_id < b.order_id ? -1
        : a.order_id > b.order_id ? 1
        : 0;
    const alpha_order =
        a.title < b.title ? -1
        : a.title > b.title ? 1
        : 0;
    if (appState.feedSort == '1') {
        return alpha_order;
    } else {
        return db_order;
    }
}

function getTopCategories() {
    const subscriptionsList = $('#subscriptions-list');
    const navTitle = $('#nav-title');
    const subListBack = $('#sub-list-back');
    const loadingArea = $('#loading-area-container');
    const existingSubRoot = $('#sub--4');

    navTitle.html('');
    subListBack.addClass('hidden');
    if (existingSubRoot.length != 0) {
        subscriptionsList.children().addClass('hidden');
        existingSubRoot.removeClass('hidden');
        appState.parentId = '-4';
        $('body').removeClass('loading').addClass('loaded');
        loadingArea.addClass('hidden');
        return;
    }

    $('body').addClass('loading').addClass('sub-tree');
    loadingArea.removeClass('hidden');

        // create container if it wasn't created by a concurrent call
        if ($('#sub--4').length === 0) {
            subscriptionsList.append("<div id='sub--4'></div>");
        }
        const subRoot = $('#sub--4');

    let data = {
        op: 'getUnread',
    };
    const unread = apiCall(data);
        unread.done(function (content) {
            content.id = -4;
            content.title = 'All articles';
            // avoid double-prepend if the All Articles row already exists
            if (subRoot.find('#tree-item--4').length === 0) {
                subRoot.prepend(buildAllArticlesRow(content));
            }
        });

    data = {
        op: 'getCategories',
        enable_nested: true,
    };
    const cats = apiCall(data);

    cats.done(function (cats) {
        cats.sort(compareBySortMode);
        const categoryHtml = [];
        for (let index = 0; index < cats.length; index += 1) {
            categoryHtml.push(buildCategoryRow(cats[index]));
        }
            // avoid appending duplicate category lists if another call already populated
            if (subRoot.children().length <= 1) {
                subRoot.append(categoryHtml.join(''));
            }
        appState.parentId = '-4';
        $('body').removeClass('loading').addClass('loaded');
        loadingArea.addClass('hidden');
    });
}

function getFeeds(parent_id, parent_title, parent_unread) {
    appState.parentId = parent_id;
    const parent = {
        id: parent_id,
        title: parent_title,
        unread: parent_unread,
    };

    if (parent.id === '-4') {
        getTopCategories();
        return;
    }
    const subscriptionsList = $('#subscriptions-list');
    const navTitle = $('#nav-title');
    const subListBack = $('#sub-list-back');
    const addNewSubscription = $('#add-new-subscription');
    const loadingArea = $('#loading-area-container');

    navTitle.html('');
    subListBack.removeClass('hidden');
    //added to show + for adding new subscriptions
    addNewSubscription.addClass('hidden');

    const containerId = '#sub-' + parent.id;
    const existingSubRoot = $(containerId);
    if (existingSubRoot.length != 0) {
        subscriptionsList.children().addClass('hidden');
        existingSubRoot.removeClass('hidden');
        $('body').removeClass('loading').addClass('loaded');
        loadingArea.addClass('hidden');
        return;
    }

    $('body').addClass('loading').addClass('sub-tree');
    loadingArea.removeClass('hidden');

    const data = {
        op: 'getFeeds',
        cat_id: parent.id,
        include_nested: true,
    };
    const feeds = apiCall(data);

    feeds.done(function (feeds) {
        feeds.sort(compareBySortMode);
        // If another concurrent call already created this subtree, reuse it
        const containerSelector = '#sub-' + parent.id;
        const existing = $(containerSelector);
        const rowHtml = [buildParentFolderRow(parent)];
        for (let index = 0; index < feeds.length; index += 1) {
            rowHtml.push(buildFeedRow(feeds[index]));
        }

        if (existing.length === 0) {
            const subRoot = $('<div id="sub-' + parent.id + '"></div>');
            subscriptionsList.append(subRoot);
            subRoot.append(rowHtml.join(''));
        } else {
            // avoid appending duplicate rows if already populated
            if (existing.children().length <= 1) {
                existing.append(rowHtml.join(''));
            }
        }

        $('body').removeClass('loading').addClass('loaded');
        loadingArea.addClass('hidden');
    });
}

function getTitle() {
    // console.log('*** getTitle()***');
    let data = {};
    if (appState.isCategory === true) {
        data.op = 'getCategories';
    } else {
        data.op = 'getFeeds';
        data.cat_id = '-4';
    }

    // console.log(
    //     `appState.isCategory: ${appState.isCategory}, data.op ${data.op}, data.cat_id: ${appState.isCategory ? 'ignored' : data.cat_id}`
    // );
    const request = apiCall(data);

    request.done(function (items) {
        $.each(items, function (index, item) {
            if (item.id == appState.feedId) {
                $('#nav-title').html(item.title);
                return;
            }
        });
    });
}

function parseRoute(route = null) {
    if (route === null) {
        route = window.location.hash || window.location.pathname || window.location.search || '';
    }

    const normalized = normalizeRoute(route);
    const parts = normalized.split('/');
    const type = parts[0];
    const id = parts[1];

    if (type === 'category') {
        appState.isCategory = true;
        appState.feedId = id;
        appState.parentId = id;
        return { type, id };
    }

    if (type === 'feed') {
        appState.isCategory = false;
        appState.feedId = id;
        return { type, id };
    }

    if (type === 'categoryfeed') {
        appState.isCategory = true;
        appState.feedId = id;
        return { type, id };
    }

    return null;
}

function applyRoute(route) {
    const parsedRoute = parseRoute(route);
    if (!parsedRoute) {
        return;
    }

    if (parsedRoute.type === 'category') {
        refreshCats(true);
        showFeeds();
        if (parsedRoute.id === '-4') {
            getTopCategories();
        } else {
            getFeeds(parsedRoute.id);
        }
        return;
    }

    refreshCats(true);
    appState.feedId = parsedRoute.id;
    appState.isCategory = parsedRoute.type === 'categoryfeed';
    getData();
}

function load() {
    console.log('load() called, location = ' + window.location.pathname + window.location.search);
    if (typeof $.cookie('g2tt_sid') === 'undefined') {
        $('#main').addClass('hidden');
        $('.login').removeClass('hidden');
    } else {
        const route = parseRoute();
        if (route) {
            applyRoute(route.type + '/' + route.id);
        } else {
            applyRoute('category/-4');
        }
        history.replaceState({ page: normalizeRoute(window.location.hash || window.location.pathname || window.location.search) }, '', buildHistoryUrl(normalizeRoute(window.location.hash || window.location.pathname || window.location.search)));
    }
}

function getData() {
    showArticles();
    $('body').removeClass('loaded').addClass('loading');
    $('.load-more-message').html('Marking as read...');
    $('#entries').empty();
    appState.itemIds.length = 0;
    getTitle();
    getHeadlines();
}

var keepUnread = new (function () {
    this.keepUnreadIdMap = undefined;

    const getIdMap = function () {
        if (undefined == this.keepUnreadIdMap) {
            //attempt to load from cookie
            this.keepUnreadIdMap = [];
            let savedKeepUnread_ids;
            savedKeepUnread_ids = readCookie('g2tt_keepUnread_ids');

            if (savedKeepUnread_ids && savedKeepUnread_ids.length > 0) {
                const idList = savedKeepUnread_ids.split(',');
                for (let i = 0; i < idList.length; i++) {
                    this.keepUnreadIdMap[idList[i]] = true;
                }
            }
        }
        return this.keepUnreadIdMap;
    };

    this.hasId = function (ids, articleId) {
        return true == getIdMap()[articleId];
    };
    this.removeId = function (articleId) {
        delete getIdMap()[articleId];
    };
    this.addId = function (articleId) {
        getIdMap()[articleId] = true;
        this.save();
    };
    this.clean = function (ids) {
        //check that global_keepUnread_ids does not contain items which are no longer in appState.itemIds
        const keepUnreadIds = getIdMap();
        if (ids.length > 0) {
            for (let id in keepUnreadIds) {
                id = id || 0; //id must be numeric
                if ($.inArray(id, ids) < 0) {
                    this.removeId(id);
                }
            }
        }
        this.save();
    };

    /*given array of ids, remove all that need to be kept unread*/
    this.removeFromArray = function (ids) {
        const keepUnreadIds = getIdMap();
        for (let id in keepUnreadIds) {
            id = id || 0; //id must be numeric
            const index = $.inArray(id, ids);
            if (index >= 0) {
                ids.splice(index, 1);
            }
        }
    };
    this.save = function () {
        let strVal = '';
        const keepIdMap = getIdMap();
        for (let articleId in keepIdMap) {
            if (strVal.length > 0) {
                strVal += ',';
            }
            strVal += articleId;
        }
        setCookie('g2tt_keepUnread_ids', strVal);
    };
})();

function subscribe(feedurl, categoryID) {
    const data = {
        op: 'subscribeToFeed',
        feed_url: feedurl,
        category_id: categoryID,
    };
    $('#indicator').removeClass('hidden');
    const request = apiCall(data);

    request.done(function (content) {
        const status = content.status;
        const _message = status.message;
        const statusCode = status.code;
        const feeds = status.feeds;
        let feedUrls = [];
        let feedUrlsTitles = [];

        for (let key in feeds) {
            if (Object.hasOwn(feeds, 'key')) {
                feedUrls.push(key);
                feedUrlsTitles.push(feeds[key]);
            }
        }

        /**
         * @return array (code => Status code, message => error message if available)
         *
         *  0 - OK, Feed already exists
         *  1 - OK, Feed added
         *  2 - Invalid URL
         *  3 - URL content is HTML, no feeds available
         *  4 - URL content is HTML which contains multiple feeds.
         *      Here you should call extractfeedurls in rpc-backend
         *      to get all possible feeds.
         *  5 - Couldn't download the URL content.
         *  6 - Content is an invalid XML.
         */
        switch (statusCode) {
            case 0: {
                //0 - OK, Feed already exists
                $('#indicator').addClass('hidden');
                window.alert('Feed already exists in your feed list.');
                break;
            }
            case 1: {
                //1 - OK, Feed added
                $('#indicator').addClass('hidden');
                const tips = $('.validateTips');
                tips.text('Your Feed was Added')
                    .addClass('ui-state-highlight')
                    .removeClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                setTimeout(function () {
                    $('#feedURL').val('');
                }, 100);
                break;
            }
            case 2: {
                //2 - Invalid URL
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert(
                    'Invalid URL submitted. Please check URL and try again.'
                );
                break;
            }
            case 3: {
                //3 - URL content is HTML, no feeds available
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert(
                    'URL content is HTML, no feeds available. Please check that URL has feeds and try again.'
                );
                break;
            }
            case 4: {
                //4 - URL content is HTML which contains multiple feeds.
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').removeClass('hidden');
                $('#multipleFeedsSelect').removeClass('hidden');
                $.each(feeds, function (url, title) {
                    $('#feedsAvail').append(
                        $('<option></option>').val(url).html(title)
                    );
                });
                break;
            }
            case 5: {
                //5 - Couldn't download the URL content.
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert(
                    'Unable to download the URL content. Please check your internet connection or the URL and try again.'
                );
                break;
            }
            case 6: {
                //6 - Content is an invalid XML.
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert(
                    'Content is an invalid XML format. Please visit the website you are trying to add to verify they use XML feed output.'
                );
                break;
            }
        }
        return content;
    });
}

function collectCategoryOptions(cats) {
    const options = [];
    $.each(cats, function (index, cat) {
        $.each(cat.items, function (index, catObject) {
            $.each(
                buildCategoryOptionItems(catObject),
                function (index, option) {
                    options.push(option);
                }
            );
        });
    });

    return options;
}

function buildCategoryOptionItems(catObject) {
    const options = [];
    if (catObject.bare_id != -1 && catObject.bare_id != 0) {
        options.push({
            parent_id: catObject.bare_id,
            child_id: catObject.bare_id,
            Name: catObject.name,
        });
    }

    $.each(catObject.items, function (index, subcatObject) {
        if (subcatObject.type == 'category') {
            options.push({
                parent_id: catObject.bare_id,
                child_id: subcatObject.bare_id,
                Name: subcatObject.name,
            });
        }
    });

    return options;
}

function appendCategoryOptions(options) {
    $.each(options, function (index, objects) {
        if (objects.parent_id == objects.child_id) {
            $('#catItems').append(
                $('<option></option>').val(objects.parent_id).html(objects.Name)
            );
        } else {
            $('#catItems').append(
                $('<option></option>')
                    .val(objects.child_id)
                    .html('&lfloor; ' + objects.Name)
            );
        }
    });
}

function getCategoriesForNewSubscribe() {
    const data = {
        op: 'getFeedTree',
        include_empty: true,
        enable_nested: false,
    };
    const catsForNew = apiCall(data);

    catsForNew.done(function (catsForNew) {
        $('#catItems').find('option').remove();
        $('#catItems').append(
            $('<option></option>').val(0).html('Uncategorized')
        );
        appendCategoryOptions(collectCategoryOptions(catsForNew));
    });
}

function markEntryRead(id = null) {
    if (id == null) {
        id = appState.lastOpenId;
        appState.lastOpenId = 0;
    }
    if (id > 0) {
        const data = {
            op: 'updateArticle',
            article_ids: id,
            mode: C_UA_FALSE,
            field: C_UA_UNREAD,
        };
        const _response = apiCall(data);
    }
}

function expandEntry(entryRow) {
    if (entryRow.hasClass('expanded')) {
        return;
    }

    const currentEntry = $('.current-entry');
    const expandedEntries = $('.expanded');
    const entryId = entryRow.attr('id');

    expandedEntries.removeClass('expanded');
    entryRow.addClass('expanded');
    $('html,body').scrollTop(entryRow.offset().top);

    currentEntry.removeClass('current-entry');
    entryRow.addClass('current-entry');

    // Mark previously opened as read
    markEntryRead();

    if (!entryRow.hasClass('read')) {
        entryRow.addClass('read');
        appState.lastOpenId = entryId;
    }
}

function collapseEntry(entryRow) {
    entryRow.removeClass('expanded');
}

function toggleEntryAsExpanded(entryRow) {
    if (entryRow.hasClass('expanded')) {
        collapseEntry(entryRow);
    } else {
        expandEntry(entryRow);
    }
}

function toggleCurrentEntryAsExpanded(_entryRow) {
    const currentEntry = $('.current-entry');
    if (currentEntry.length) {
        toggleEntryAsExpanded(currentEntry);
    }
}

function expandNextEntry() {
    const currentEntry = $('.current-entry');
    let nextEntry;
    if (!currentEntry.length) {
        nextEntry = $('.entry-row').eq(0);
    } else {
        nextEntry = currentEntry.next();
    }
    if (!nextEntry.is('.entry-row')) {
        return;
    }
    expandEntry(nextEntry);
}

function expandPreviousEntry() {
    const currentEntry = $('.current-entry');
    if (!currentEntry.length) {
        return;
    }
    const previous = currentEntry.prev();
    if (!previous.is('.entry-row')) {
        return;
    }
    expandEntry(previous);
}

function jumpNextEntry() {
    const currentEntry = $('.current-entry');
    let nextEntry;
    if (!currentEntry.length) {
        nextEntry = $('.entry-row').eq(0);
    } else {
        nextEntry = currentEntry.next();
    }
    if (!nextEntry.is('.entry-row')) {
        return;
    }
    currentEntry.removeClass('current-entry');
    nextEntry.addClass('current-entry');
    if (!isElementInViewport(nextEntry)) {
        nextEntry[0].scrollIntoView(false);
    }
}

function jumpPreviousEntry() {
    const currentEntry = $('.current-entry');
    if (!currentEntry.length) {
        return;
    }
    const previous = currentEntry.prev();
    if (!previous.is('.entry-row')) {
        return;
    }
    currentEntry.removeClass('current-entry');
    previous.addClass('current-entry');

    if (!isElementInViewport(previous)) {
        previous[0].scrollIntoView();
    }
}

function toggleEntryAsRead(entryRow) {
    const articleId = entryRow.attr('id');
    const readState = entryRow.find('.read-state');
    const isRead = entryRow.toggleClass('read').hasClass('read');

    if (!isRead) {
        readState.html("<i class='fa fa-book'></i>&nbsp;Mark read");
        for (let i = 0; i < appState.itemIds.length; i += 1) {
            if (appState.itemIds[i] == articleId) {
                appState.itemIds.splice(i, 1);
                keepUnread.addId(articleId);
                break;
            }
        }
    } else {
        readState.html("<i class='fa fa-book-open'></i>&nbsp;Mark unread");
        appState.itemIds.push(articleId);
        keepUnread.removeId(articleId);
    }

    const data = {
        op: 'updateArticle',
        article_ids: articleId,
        field: C_UA_UNREAD,
        mode: appState.lastOpenId == articleId,
    };
    appState.lastOpenId = appState.lastOpenId == articleId ? 0 : articleId; // swap state of lastOpenId
    const _response = apiCall(data);
}

function toggleCurrentEntryAsRead(_entryRow) {
    if ($('.current-entry').length) {
        toggleEntryAsRead($('.current-entry'));
    }
}

// source: http://stackoverflow.com/a/7557433/1135429
function isElementInViewport(el) {
    //special bonus for those using jQuery
    if (typeof jQuery === 'function' && el instanceof jQuery) {
        el = el[0];
    }

    const rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
            (window.innerHeight ||
                document.documentElement
                    .clientHeight) /*or $(window).height() */ &&
        rect.right <=
            (window.innerWidth ||
                document.documentElement.clientWidth) /*or $(window).width() */
    );
}

