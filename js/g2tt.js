const SUPPORTED_API_LEVEL = 23;

const STATUS_OK = 0;
const STATUS_ERR = 1; // eslint-disable-line no-unused-vars

const E_API_DISABLED = "API_DISABLED";
const E_NOT_LOGGED_IN = "NOT_LOGGED_IN";
const E_LOGIN_ERROR = "LOGIN_ERROR";
const E_INCORRECT_USAGE = "INCORRECT_USAGE";
const E_UNKNOWN_METHOD = "UNKNOWN_METHOD";
const E_OPERATION_FAILED = "E_OPERATION_FAILED";
const E_NOT_FOUND = "E_NOT_FOUND";

globalThis.appState.feedId = readCookie('g2tt_feed', globalThis.appState.feedId);
globalThis.appState.isCategory = readCookie('g2tt_isCat', globalThis.appState.isCategory);
globalThis.appState.viewMode = readCookie('g2tt_viewMode', globalThis.appState.viewMode);
globalThis.appState.orderBy = readCookie('g2tt_orderBy', globalThis.appState.orderBy);
globalThis.appState.feedSort = readCookie('g2tt_feedSort', globalThis.appState.feedSort);
globalThis.appState.feedLimit = readCookie('g2tt_feedLimit', globalThis.appState.feedLimit);

// let appState.feedLimit = globalThis.appState.feedLimit;

function readCookie(name, fallback = undefined) {
    const value = $.cookie(name);
    return typeof value !== 'undefined' ? value : fallback;
}

function setCookie(name, value, days = undefined) {
    let oldVal = readCookie(name);
    if (typeof days === 'undefined') {
        $.cookie(name, value);
    } else {
        $.cookie(name, value, {
            expires: days
        });
    }
    return oldVal;
}

function delCookie(name) {
    let oldVal = readCookie(name);
    $.removeCookie(name);
    return oldVal;
}

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
        if (bindLoginForm.request !== undefined && bindLoginForm.request.abort !== undefined) {
            console.log("Aborting previous login request...");
            console.log(bindLoginForm.request);
        }

        let loginForm = $(this);
        let inputs = loginForm.find("input");
        let values = {};
        inputs.each(function () {
            values[this.name] = $(this).val();
        });

        let data = {
            'op': 'login',
            'user': values.Username,
            'password': values.Passwd,
        };

        inputs.prop("disabled", true);

        bindLoginForm.request = apiCall(data);

        bindLoginForm.request.done(function (loggedIn) {
            $('.login').addClass('hidden');
            $('#main').removeClass('hidden');
            if (loggedIn.api_level < SUPPORTED_API_LEVEL) {
                window.alert("Current TT-RSS API version (" + loggedIn.api_level + ") is unsupported, require at least version " + SUPPORTED_API_LEVEL);
                logoutToHomepage();
            }
            setCookie('g2tt_sid', loggedIn.session_id, 7);
            load();
        });

        // callback handler that will be called regardless
        // if the request failed or succeeded
        bindLoginForm.request.always(function () {
            // reenable the inputs
            inputs.prop("disabled", false);
        });

        // prevent default posting of form
        event.preventDefault();
    });
    //end of #login function
}

function bindLoadMore() {
    bindClick('#load-more-items', function () {
        let last;
        if (appState.orderBy == "date_reverse") {
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
        $(this).toggleClass('m-button-pressed');
        $('#menuDown').toggleClass('hidden');
        $('#menuUp').toggleClass('hidden');

        //Adjust the placement of the menu based on the height of the Nav bar
        //(for when category title is long)
        $('.g2tt-menu').css({
            top: parseInt($('.nav-bar-container').height()) - 8 + "px"
        });
        $('.g2tt-menu').toggle();
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
    // View mode menu selection
    $('#' + appState.viewMode).addClass('g2tt-option-selected');
    bindClick('.showItem', function () {
        appState.viewMode = $(this).attr('id');
        setCookie('g2tt_viewMode', appState.viewMode);
        $('.showItem').removeClass('g2tt-option-selected');
        $(this).addClass('g2tt-option-selected');
        $('.feedsItem').removeClass('g2tt-option-selected');
        $('#feeds-' + appState.viewMode).addClass('g2tt-option-selected');
        $('#entries').empty();
        $('#subscriptions').attr('class', 'hidden show-' + appState.viewMode);
        getHeadlines();
    });
}

function bindSortMode() {
    $('#' + appState.orderBy).addClass('g2tt-option-selected');
    bindClick('.sortItem', function () {
        appState.orderBy = $(this).attr('id');
        setCookie('g2tt_orderBy', appState.orderBy);
        $('.sortItem').removeClass('g2tt-option-selected');
        $(this).addClass('g2tt-option-selected');
        $('#entries').empty();
        getHeadlines();
    });
}

function bindFeedsMenu() {
    // View mode feeds menu selection
    $('#feeds-' + appState.viewMode).addClass('g2tt-option-selected');
    $('#subscriptions').addClass('show-' + appState.viewMode);
    bindClick('.feedsItem', function () {
        appState.viewMode = $(this).attr('id').substring(6);
        setCookie('g2tt_viewMode', appState.viewMode);
        $('.feedsItem').removeClass('g2tt-option-selected');
        $(this).addClass('g2tt-option-selected');
        $('.showItem').removeClass('g2tt-option-selected');
        $('#' + appState.viewMode).addClass('g2tt-option-selected');
        $('#subscriptions').attr('class', 'show-' + $(this).attr('id').substring(6));
    });
}

function bindSubscription() {
    bindClick('#add-new-subscription', function () {
        getCategoriesForNewSubscribe();
        $("#dialog-form").dialog("open");
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

function bindBackButtons() {
    // Back to Feeds
    bindClick('.back-to-feeds', function () {
        refreshCats();
        showFeeds();
    });

    // Back to Feeds from sub category
    bindClick('#sub-list-back', function () {
        refreshCats();
        getFeeds(appState.backCat.pop());
        if (appState.parentId == '-4'){
            $('#add-new-subscription').removeClass('hidden');
        }
    });
}

function bindSubscriptionRowActions() {
    $('#subscriptions-list')
        .off('click', '.closed-sub-folder')
        .off('click', '.open-sub-folder[id!="tree-item--4"]')
        .off('click', '.sub')
        .off('click', '#tree-item--4')
        .on('click', '.closed-sub-folder', function () {
            appState.backCat.push(appState.parentId);
            $('#subscriptions-list').children().addClass('hidden');
            getFeeds(
                $(this).attr('id').substring(10),
                $(this).find('.sub-item').html(),
                $(this).find('.item-count-value').html());
        })
        .on('click', '.open-sub-folder[id!="tree-item--4"]', function () {
            setCookie('g2tt_feed', $(this).attr('id').substring(10));
            setCookie('g2tt_isCat', true);
            appState.feedId = readCookie('g2tt_feed');
            appState.isCategory = (readCookie('g2tt_isCat') === 'true');
            getData();
        })
        .on('click', '.sub', function () {
            setCookie('g2tt_feed', $(this).attr('id').substring(10));
            setCookie('g2tt_isCat', false);
            appState.feedId = readCookie('g2tt_feed');
            appState.isCategory = (readCookie('g2tt_isCat') === 'true');
            getData();
        })
        .on('click', '#tree-item--4', function () {
            setCookie('g2tt_feed', $(this).attr('id').substring(10));
            setCookie('g2tt_isCat', false);
            appState.feedId = readCookie('g2tt_feed');
            appState.isCategory = (readCookie('g2tt_isCat') === 'true');
            getData();
        });
}

function bindMarkRead() {
    // Mark all as read
    bindClick('#show-more-row, #menu-mark-read', function () {
        $('body').removeClass('loaded').addClass('loading');
        $('.load-more-message').html('Marking as read...');
        //remove those that need to be kept unread
        keepUnread.removeFromArray(appState.itemIds);
        let data = {
            op: "updateArticle",
            article_ids: appState.itemIds.join(','),
            mode: 0,
            field: 2
        };
        let request = apiCall(data);

        request.done(function (_response) {
            $('#entries').empty();
            getHeadlines();
        });
    });
}

function clearCookies() {
    delCookie('g2tt_feed');
    delCookie('g2tt_isCat');
    delCookie('g2tt_viewMode');
    delCookie('g2tt_orderBy');
    delCookie('g2tt_keepUnread_ids');
    delCookie('g2tt_sid');
}

function logoutToHomepage() {
    clearCookies();
    location.reload(true);
}

function bindLogout() {
    bindClick('#menu-logout', function () {
        let data = {
            op: "logout"
        };
        let request = apiCall(data);

        request.done(function (_content) {
            logoutToHomepage();
        });
    });
}

function bindEmail() {
    $('#feed')
        .off('click', '.createmail')
        .on('click', '.createmail', function () {
            const entryContainer = $(this).closest(".entry-container");
            const title = entryContainer.find(".item-title-collapsed").html();
            const body = entryContainer.find(".entry-contents-inner").html();
            const anchor = entryContainer.find(".entry-header-body .text a.item-title-link").attr("href");
            const anchorText = entryContainer.find(".entry-header-body .text a.item-title-link").text().trim();
            const email_subject = title;
            const email_body = '<br><h4>Sent to you via tt-rss</h4><h2><a href="' + anchor + '">' +
        anchorText + '</a></h2>' + body;

            const mailto=`mailto:?subject=${fixedEncodeURIComponent(email_subject)}&body=${fixedEncodeURIComponent(email_body)}`;
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
    // Search
    // Show search
    bindClick('#menu-search', function () {
        $('.search-box').removeClass('hidden');
        $('#search-input').trigger('focus');
    });
    // Clear and hide search
    bindClick('#search-cancel', function () {
        $('#search-input').val('');
        $('.search-box').addClass('hidden');
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
        $('#entries').empty();
        getHeadlines();
        return false;
    });
}

function bindSubscriptionUi() {

    //Added for Subscribe to New Feeds
    $('.ui-loader').remove();

    let feedURL = $("#feedURL"),
        //password = $( "#password" ),
        allFields = $([]).add(feedURL),
        tips = $(".validateTips");

    function updateTips(t) {
        tips
            .text(t)
            .addClass("ui-state-highlight").removeClass("hidden");
        setTimeout(function () {
            tips.removeClass("ui-state-highlight", 1500);
        }, 500);
    }

    function checkLength(o, n, min, max) {
        if (o.val().length > max || o.val().length < min) {
            o.addClass("ui-state-error");
            updateTips("Length of " + n + " must be between " +
                min + " and " + max + ".");
            return false;
        } else {
            return true;
        }
    }

    function firstToUpperCase(str) {
        return str.substr(0, 5).toLowerCase() + str.substr(5);
    }

    function checkRegexp(o, regexp, n) {
        let makeOvalidHttp = o.val().trim();
        if (!(regexp.test(firstToUpperCase(makeOvalidHttp)))) {
            o.addClass("ui-state-error");
            updateTips(n);
            return false;
        } else {
            return true;
        }
    }

    $("#dialog-form").dialog({
        autoOpen: false,
        //height: 300,
        dialogClass: "dialog-nav-bar",
        draggable: false,
        resizable: false,
        //position: { my: "left top", at: "left top" } ,
        position: [5, 10],
        width: 300,
        modal: true,
        buttons: {
            "Subscribe": function () {
                let bValid = true;
                allFields.removeClass("ui-state-error");
                tips.addClass("hidden");

                bValid = bValid && checkLength(feedURL, "URL", 5, 1000);
                bValid = bValid && checkRegexp(feedURL,
                    /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!-/]))?$/,
                    "URL must be a valid URL. Make sure the URL is correct and re-submit");

                // From jquery.validate.js (by joern), contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/

                if (bValid) {
                    let catIDnum = $("#catItems option:selected").val();
                    let feedURLTrimmed = firstToUpperCase(feedURL.val().trim());

                    let multipleFeedSelected = $("#feedsAvail option:selected").val();

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
                $(this).dialog("close");
            }
        },
        close: function () {
            allFields.val("").removeClass("ui-state-error");
        }
    });
}

function bindKeyboardShortcuts() {
    $(document).on('keypress', function (event) {
        switch (String.fromCharCode(event.which).toLowerCase()) {
            case 'j': expandNextEntry(); break;
            case 'k': expandPreviousEntry(); break;
            case 'n': jumpNextEntry(); break;
            case 'p': jumpPreviousEntry(); break;
            case 'o': toggleCurrentEntryAsExpanded(); break;
            case 'm': toggleCurrentEntryAsRead(); break;
        }
    });
}

$(document).ready(function () {
    bindGlobalUi();
    bindLoginForm();
    bindNavigation();
    bindSearchUi();
    bindSubscriptionUi();
    bindKeyboardShortcuts();
    load();

});

function refreshCats() {
    let data = {
        op: "getCounters",
        output_mode: "fc"
    };
    let request = apiCall(data);

    request.done(function (counters) {
        let cats = [];
        let feeds = [];

        for (let i = 0; i < counters.length; i++) {
            if (counters[i].kind == 'cat') {
                cats[counters[i].id] = (counters[i]);
            } else {
                feeds[counters[i].id] = (counters[i]);
            }
        }
        $('.sub-row').each(function (_i, _j) {
            const id = $(this).attr('id').substring(10);
            let is_cat = ($(this).hasClass('open-sub-folder') || $(this).hasClass('closed-sub-folder'));

            if (id == "-4" || id == "-1") {
                $(this).find('.item-count-value').html(feeds['global-unread'].counter);
                if (feeds['global-unread'].counter == '0') {
                    $(this).addClass('no-unread-sub-row').removeClass('unread-sub');
                    $('#subscriptions').removeClass('show-unread').addClass('show-all');
                } else {
                    $(this).removeClass('no-unread-sub-row').addClass('unread-sub');
                    if (appState.viewMode == 'unread' && $('#subscriptions').hasClass('show-all')) {
                        $('#subscriptions').removeClass('show-all').addClass('show-unread');
                    }
                }
            } else if (is_cat) {
                $(this).find('.item-count-value').html(cats[id].counter);
                if (cats[id].counter == '0') {
                    $(this).addClass('no-unread-sub-row').removeClass('unread-sub');
                } else {
                    $(this).removeClass('no-unread-sub-row').addClass('unread-sub');
                }
            } else {
                if (typeof feeds[id] !== 'undefined') {
                    $(this).find('.item-count-value').html(feeds[id].counter);
                    if (feeds[id].counter == '0') {
                        $(this).addClass('no-unread-sub-row').removeClass('unread-sub');
                    } else {
                        $(this).removeClass('no-unread-sub-row').addClass('unread-sub');
                    }
                }
            }
        });
        showEmpty();

        $('#header-refresh').removeClass('m-button-pressed');
    });
}

function showEmpty() {
    let visible = $('#sub-' + appState.parentId).children(':visible');
    if (visible.length == 0) {
        $('#subscriptions').removeClass('show-unread').addClass('show-all');
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
        window.alert("Unexpected response from server");
        console.error(jqXHR);
        console.error(textStatus);
        console.error(errorThrown);
        throw new Error("Unexpected response");
    }

    if (jqXHR.content.error == E_API_DISABLED) {
        window.alert(
            "The API Settings are disabled. Login on the desktop version and enable both API settings in the Preferences."
        );
        logoutToHomepage();
    }
    if (jqXHR.content.error == E_NOT_LOGGED_IN) {
        window.alert("You are not logged in or your session has expired.");
        logoutToHomepage();
    }
    if (jqXHR.content.error == E_LOGIN_ERROR) {
        window.alert("Username and/or password were incorrect.");
    }
    if (jqXHR.content.error == E_INCORRECT_USAGE) {
        window.alert(
            "API error: Incorrect usage"
        );
    }
    if (jqXHR.content.error == E_UNKNOWN_METHOD) {
        window.alert(
            "API error: Unknown method called"
        );
    }
    if (jqXHR.content.error == E_OPERATION_FAILED) {
        window.alert(
            "API error: Operation failed"
        );
    }
    if (jqXHR.content.error == E_NOT_FOUND) {
        window.alert(
            "API error: Icon not found)"
        );
    }
}

function handleApiStatusError(response) {
    throw response;
}

function apiCall(data, opts = {}) {
    data.sid = readCookie('g2tt_sid');
    return $.ajax({
        url: appState.url + "/api/",
        type: "POST",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(data),
        async: opts.async !== false,
        timeout: opts.timeout || 15000
    })
        .then(response => {
            if (response.status !== STATUS_OK) {
                handleApiStatusError(response);
                return $.Deferred().reject(response).promise();
            }
            return response.content;
        })
        .fail((jqXHR, textStatus, errorThrown) => {
            handleAjaxError(jqXHR, textStatus, errorThrown);
            return $.Deferred().reject({ jqXHR, textStatus, errorThrown }).promise();
        });
}

function fixedEncodeURIComponent(str) {
    // encodeURIComponent fails to encode, e.g., single quotes
    // https://stackoverflow.com/a/32525285
    return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}

function headlineMeta(headline) {
    let date = new Date(headline.updated * 1000);
    return {
        readClass: (!headline.unread) ? " read" : "",
        starClass: headline.marked ? "starActive" : "starNotActive",
        formattedDate: date.toLocaleString()
    };
}

function headlineExcerpt(headline) {
    if (headline.excerpt && headline.excerpt !== '&hellip;') {
        return headline.excerpt;
    }
    return $(headline.content).text().substr(0, 100) + '&hellip;';
}

function headlineContentHtml(content) {
    let html = $(content);
    if (html.length === 1 && html.is("img")) {
        let alt = html.attr("title") || html.attr("alt");
        if (alt) {
            return `<div>${html[0].outerHTML}<div>${alt}</div></div>`;
        }
    }
    let container = $("<div></div>");
    container.append(html);
    return container[0].outerHTML;
}

function buildHeadlinesEntry(headline) {
    let contentHtml = headlineContentHtml(headline.content);
    let excerpt = headlineExcerpt(headline);
    let meta = headlineMeta(headline);

    return `
<div id='${headline.id}' class='entry-row whisper${meta.readClass}'>
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
                <i class='favStar fa fa-star fa-2x ${meta.starClass}'></i>
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
                <div class='entry-sub-header'>by ${headline.author}  on ${meta.formattedDate} + "</div>
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
    $.each(headlines, function (index, headline) {
        appState.itemIds.push(headline.id);
        $('#entries').append(buildHeadlinesEntry(headline));
    });
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
        let data = {
            op: "updateArticle",
            article_ids: $(this).closest('.entry-row').attr('id'),
            mode: 2,
            field: 0
        };
        let _response = apiCall(data);

        $(this).next().toggleClass('starNotActive').toggleClass('starActive');
    });
}

function finaliseHeadlines(headlines) {
    // Done loading
    $('body').removeClass('loading').addClass('loaded');
    if (headlines.length > 0) {
        $('.load-more-message').html('Mark these items as read');
    } else {
        $('.load-more-message').html(''); // effectively invisible?
    }
    $('.entries-count').html('Showing ' + $('.entry-row').length + ' items');
    keepUnread.clean(appState.itemIds);
}

function getHeadlinesRequest(since) {
    if (typeof (since) === 'undefined') since = 0;

    let search = $('#search-input').val();
    let data = {
        op: "getHeadlines",
        feed_id: appState.feedId,
        limit: appState.feedLimit,
        show_excerpt: 1,
        show_content: 1,
        include_attachments: 0,
        view_mode: appState.viewMode,
        is_cat: appState.isCategory,
        include_nested: true,
        order_by: appState.orderBy,
        search: search
    };

    if (appState.orderBy == "date_reverse") {
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

function buildAllArticlesRow(content) {
    return buildTreeRow({
        obj: content,
        sub: 'open-sub-folder'
    });
}

function buildCategoryRow(cat) {
    return buildTreeRow({
        obj: cat,
        sub: 'closed-sub-folder',
        nested: 'nested-sub'
    });
}

function buildParentFolderRow(parent) {
    return buildTreeRow({
        obj: parent,
        sub: 'open-sub-folder'
    });
}

function buildFeedRow(feed) {
    return buildTreeRow({
        obj: feed,
        sub: feed.is_cat ? 'closed-sub-folder' : 'sub'
    });
}

function buildTreeRow(row) {
    const iconMap = {
        'open-sub-folder': 'fa-folder-open',
        'closed-sub-folder': 'fa-folder',
        'sub': 'fa-rss-square'
    };
    const icon = iconMap[row.sub] || 'fa-question-circle';
    const unread = row.obj.unread > 0 ? 'unread-sub' : 'no-unread-sub-row';
    const classes = [
        'row',
        'whisper',
        'sub-row',
        row.sub,
        unread,
        row.nested
    ].filter(Boolean).join(' ');

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
    const db_order = ((a.order_id < b.order_id) ? -1 : ((a.order_id > b.order_id) ? 1 : 0));
    const alpha_order = ((a.title < b.title) ? -1 : ((a.title > b.title) ? 1 : 0));
    if (appState.feedSort == '1') {
        return alpha_order;
    } else {
        return db_order;
    }
}

function getTopCategories() {
    $('#nav-title').html('');
    $('#sub-list-back').addClass('hidden');
    if ($('#sub--4').length != 0) {
        $('#subscriptions-list').children().addClass('hidden');
        $('#sub--4').removeClass('hidden');
        appState.parentId = '-4';
    } else {
        $('body').addClass('loading').addClass('sub-tree');
        $('#loading-area-container').removeClass('hidden');

        $('#subscriptions-list').append("<div id='sub--4'></div>");

        let data = {
            op: "getUnread"
        };
        let unread = apiCall(data);
        unread.done(function (content) {
            content.id = -4;
            content.title = 'All articles'
            $('#sub--4').prepend(buildAllArticlesRow(content));
        });

        data = {
            op: "getCategories",
            enable_nested: true
        };
        let cats = apiCall(data);

        cats.done(function (cats) {
            cats.sort(compareBySortMode);
            $.each(cats, function (index, cat) {
                $('#sub--4').append(buildCategoryRow(cat));

            });
            appState.parentId = '-4';
            $('body').removeClass('loading').addClass('loaded');
            $('#loading-area-container').addClass('hidden');
        });
    }
}

function getFeeds(parent_id, parent_title, parent_unread) {
    appState.parentId = parent_id;
    let parent = {
        id: parent_id,
        title: parent_title,
        unread: parent_unread,
    };

    if (parent.id === '-4') {
        getTopCategories();
        return;
    }
    $('#nav-title').html('');
    $('#sub-list-back').removeClass('hidden');
    //added to show + for adding new subscriptions
    $('#add-new-subscription').addClass('hidden');

    if ($('#sub-' + parent.id).length != 0) {
        $('#subscriptions-list').children().addClass('hidden');
        $('#sub-' + parent.id).removeClass('hidden');
    } else {
        $('body').addClass('loading').addClass('sub-tree');
        $('#loading-area-container').removeClass('hidden');

        let data = {
            op: "getFeeds",
            cat_id: parent.id,
            include_nested: true
        };
        let feeds = apiCall(data);

        feeds.done(function (feeds) {
            feeds.sort(compareBySortMode);
            $('#subscriptions-list').append("<div id='sub-" + parent.id + "'></div>");
            $('#sub-' + parent.id).prepend(buildParentFolderRow(parent));
            $.each(feeds, function (index, feed) {
                $('#sub-' + parent.id).append(buildFeedRow(feed));

            });
            $('body').removeClass('loading').addClass('loaded');
            $('#loading-area-container').addClass('hidden');
        });
    }
}

function getTitle() {
    let data = {};
    if (appState.isCategory === true) {
        data.op = "getCategories";
    } else {
        data.op = "getFeeds";
        data.cat_id = "-4";
    }

    let request = apiCall(data);

    request.done(function (items) {
        $.each(items, function (index, item) {
            if (item.id == appState.feedId) {
                $('#nav-title').html(item.title);
                return;
            }
        });
    });
}

function load() {
    if (typeof ($.cookie('g2tt_sid')) === 'undefined') {
        $('#main').addClass('hidden');
        $('.login').removeClass('hidden');
    } else if (appState.startCategory == '1') {
        showFeeds();
        getTopCategories();
    } else {
        getTitle();
        getHeadlines();
        getTopCategories();
    }
}

function getData() {
    showArticles();
    $('body').removeClass('loaded').addClass('loading');
    $('.load-more-message').html('Marking as read...');
    $('#entries').empty();
    appState.itemIds = [];
    getTitle();
    getHeadlines();
}

var keepUnread = new function () {
    this.keepUnreadIdMap = undefined;

    let getIdMap = function () {
        if (undefined == this.keepUnreadIdMap) {
            //attempt to load from cookie
            this.keepUnreadIdMap = [];
            let savedKeepUnread_ids;
            savedKeepUnread_ids = readCookie('g2tt_keepUnread_ids');

            if (savedKeepUnread_ids && savedKeepUnread_ids.length > 0) {
                let idList = savedKeepUnread_ids.split(',');
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
        let keepUnreadIds = getIdMap();
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
        let keepUnreadIds = getIdMap();
        for (let id in keepUnreadIds) {
            id = id || 0; //id must be numeric
            let index = $.inArray(id, ids);
            if (index >= 0) {
                ids.splice(index, 1);
            }
        }
    };
    this.save = function () {
        let strVal = '';
        let keepIdMap = getIdMap();
        for (let articleId in keepIdMap) {
            if (strVal.length > 0) {
                strVal += ',';
            }
            strVal += articleId;
        }
        setCookie('g2tt_keepUnread_ids', strVal);
    };
};

function subscribe(feedurl, categoryID) {
    let data = {
        op: "subscribeToFeed",
        feed_url: feedurl,
        category_id: categoryID
    };
    $('#indicator').removeClass('hidden');
    let request = apiCall(data);

    request.done(function (content) {
        let status = content.status;
        let _message = status.message;
        let statusCode = status.code;
        //let feeds = [];
        let feeds = status.feeds;
        let feedUrls = [];
        let feedUrlsTitles = [];

        for (let key in feeds) {
            if (Object.hasOwn(feeds, "key")) {
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
                //let status0 = confirm('Feed already exists in your feed list. Press OK to return to feed list, or Cancel to try again.');
                $('#indicator').addClass('hidden');
                window.alert('Feed already exists in your feed list.');

                //uncomment next line if you'd like it to close pop-up when they press OK.
                //$( "#dialog-form" ).dialog( "close" );

                break;
            }
            case 1: {
                //1 - OK, Feed added
                $('#indicator').addClass('hidden');
                let tips = $(".validateTips");
                tips.text('Your Feed was Added')
                    .addClass("ui-state-highlight").removeClass("hidden");
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                setTimeout(function () {
                    //tips.removeClass( "ui-state-highlight", 1500 );

                    $('#feedURL').val("");
                }, 100);
                break;
            }
            case 2: {
                //2 - Invalid URL
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert('Invalid URL submitted. Please check URL and try again.');
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
            }
                break;
            case 4: {
                //4 - URL content is HTML which contains multiple feeds.
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').removeClass('hidden');
                $('#multipleFeedsSelect').removeClass('hidden');
                $.each(feeds, function (url, title) {
                    $('#feedsAvail').append($('<option></option>').val(url).html(title));

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

function getCategoriesForNewSubscribe() {
    let data = {
        op: "getFeedTree",
        include_empty: true,
        enable_nested: false
    };
    let catsForNew = apiCall(data);

    catsForNew.done(function (catsForNew) {
        $('#catItems').find('option').remove();
        $('#catItems').append($('<option></option>').val(0).html('Uncategorized'));

        $.each(catsForNew, function (index, cat) {
            $.each(cat.items, function (index, catObject) {
                let catObjectIds = [];
                if (catObject.bare_id != -1 && catObject.bare_id != 0) {
                    catObjectIds.push({
                        "parent_id": catObject.bare_id,
                        "child_id": catObject.bare_id,
                        "Name": catObject.name
                    });
                }
                $.each(catObject.items, function (index, subcatObject) {
                    if (subcatObject.type == "category") {
                        catObjectIds.push({
                            "parent_id": catObject.bare_id,
                            "child_id": subcatObject.bare_id,
                            "Name": subcatObject.name
                        });
                    }
                });

                //put Uncategorized first
                $.each(catObjectIds, function (index, objects) {
                    if (objects.parent_id == objects.child_id) {
                        $('#catItems').append($('<option></option>').val(objects
                            .parent_id).html(objects.Name));
                    } else {
                        let _newOptionCat = $('#catItems').append($('<option></option>')
                            .val(objects.child_id).html('&lfloor; ' + objects.Name));
                    }
                });

            });
        });
    });
}

function expandEntry(entryRow) {
    if (entryRow.hasClass('expanded')) {
        return;
    }

    $('.expanded').removeClass('expanded');
    entryRow.addClass('expanded');
    $('html,body').scrollTop(entryRow.offset().top);

    $('.current-entry').removeClass('current-entry');
    entryRow.addClass('current-entry');

    // Mark as read
    if (!entryRow.hasClass('read')) {
        entryRow.addClass('read');
        let data = {
            op: "updateArticle",
            article_ids: entryRow.attr('id'),
            mode: 0,
            field: 2
        };
        let _response = apiCall(data);
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
    if ($('.current-entry').length) {
        toggleEntryAsExpanded($('.current-entry'));
    }
}

function expandNextEntry() {
    let nextEntry;
    if (!$('.current-entry').length) {
        nextEntry = $('.entry-row').eq(0);
    } else {
        nextEntry = $('.current-entry').next();
    }
    if (!nextEntry.is('.entry-row')) {
        return;
    }
    expandEntry(nextEntry);
}

function expandPreviousEntry() {
    if (!$('.current-entry').length) {
        return;
    }
    let previous = $('.current-entry').prev();
    if (!previous.is('.entry-row')) {
        return;
    }
    expandEntry(previous);
}

function jumpNextEntry() {
    let nextEntry;
    if (!$('.current-entry').length) {
        nextEntry = $('.entry-row').eq(0);

    } else {
        nextEntry = $('.current-entry').next();
    }
    if (!nextEntry.is('.entry-row')) {
        return;
    }
    $('.current-entry').removeClass('current-entry');
    nextEntry.addClass('current-entry');
    if (!isElementInViewport($('.current-entry'))) {
        $('.current-entry')[0].scrollIntoView(false);
    }
}

function jumpPreviousEntry() {
    if (!$('.current-entry').length) {
        return;
    }
    let previous = $('.current-entry').prev();
    if (!previous.is('.entry-row')) {
        return;
    }
    $('.current-entry').removeClass('current-entry');
    previous.addClass('current-entry');

    if (!isElementInViewport($('.current-entry'))) {
        $('.current-entry')[0].scrollIntoView();
    }
}

function toggleEntryAsRead(entryRow) {
    entryRow.toggleClass('read');

    if (!entryRow.hasClass('read')) {
        entryRow.find(".read-state").html("<i class='fa fa-book'></i>&nbsp;Mark read");
        for (let i = 0; i < appState.itemIds.length; i++) {
            let articleId = entryRow.attr('id');
            if (appState.itemIds[i] == articleId) {
                appState.itemIds.splice(i, 1);
                keepUnread.addId(articleId);
            }
        }
    } else {
        entryRow.find(".read-state").html("<i class='fa fa-book-open'></i>&nbsp;Mark unread");
        let articleId = entryRow.attr('id');
        appState.itemIds.push(articleId);
        keepUnread.removeId(articleId);
    }

    let data = {
        op: "updateArticle",
        article_ids: entryRow.attr('id'),
        mode: 2,
        field: 2
    };
    let _response = apiCall(data);
}

function toggleCurrentEntryAsRead(_entryRow) {
    if ($('.current-entry').length) {
        toggleEntryAsRead($('.current-entry'));
    }
}

// source: http://stackoverflow.com/a/7557433/1135429
function isElementInViewport(el) {
    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    let rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}
