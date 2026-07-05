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

var pref_IsCat = readCookie('g2tt_isCat', false);
var pref_Feed = readCookie('g2tt_feed', pref_Feed);
var pref_ViewMode = readCookie('g2tt_viewMode', pref_ViewMode);
var pref_OrderBy = readCookie('g2tt_orderBy', pref_OrderBy);
var pref_FeedSort = readCookie('g2tt_feedSort', pref_FeedSort);
var global_ttrssUrl; // eslint-disable-line no-unassigned-vars -- defined in config
var pref_StartInCat; // eslint-disable-line no-unassigned-vars -- defined in config
var pref_Feed_limit; // eslint-disable-line no-unassigned-vars -- defined in config
var historylist = [];

if (typeof (readCookie('g2tt_history')) !== 'undefined') {
    historylist = JSONSafeParse(readCookie('g2tt_history'));
}

var global_backCat = []; // Feed view always starts with all items
var global_ids = []; // List of all article IDs currently displayed
var global_parentId = '-4';

$(document).ready(function () {
    bindGlobalUi();
    bindLoginForm();
    bindNavigation();
    bindSearchUi();
    bindSubscriptionUi();
    bindKeyboardShortcuts();
    load();
});

function bindGlobalUi() {
    $('html').off('click').on('click', function () {
        $('#header-menu').removeClass('m-button-pressed');
        $('#menuDown').removeClass('hidden');
        $('#menuUp').addClass('hidden');
        $('.g2tt-menu').hide();
    });
}

function bindLoginForm() {
    $("#login").on('submit', function (event) {
        if (request) {
            request.abort();
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

        var request = apiCall(data);

        request.done(function (response, _textStatus, _jqXHR) {
            if (response.content.error == 'LOGIN_ERROR') {
                window.alert("Username and/or Password were incorrect!");
            }
            if (response.content.error == 'API_DISABLED' || response.content.error ==
                'INCORRECT_USAGE') {
                window.alert(
                    "The API Settings are disabled. Login on the desktop version and enable both API settings in the Preferences."
                );
            }
            if (typeof response.content.error !== 'undefined') {
                window.alert("Unexpected error received: ".concat(" ", response.content
                    .error));
            } else {
                setCookie('g2tt_feed', pref_Feed, 7);
                $('.login').addClass('hidden');
                $('#main').removeClass('hidden');
                load();
            }
            resetHistory();
        });

        // callback handler that will be called on failure
        request.fail(function (_jqXHR, textStatus, errorThrown) {
            // log the error to the console
            console.error(
                "The following error occured: " +
                textStatus, errorThrown);
        });

        // callback handler that will be called regardless
        // if the request failed or succeeded
        request.always(function () {
            // reenable the inputs
            inputs.prop("disabled", false);
        });

        // prevent default posting of form
        event.preventDefault();
    });
}

function bindNavigation() {
    // Show more items
    $('#load-more-items').off('click').on('click', function () {
        let last;
        if (pref_OrderBy == "date_reverse") {
            last = $('.entry-row').last().attr('id');
        } else {
            last = $('.entry-row').length;
        }
        getHeadlines(last);
    });

    // Menu button
    $('#header-menu').off('click').on('click', function (event) {
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
    $('#header-refresh').off('click').on('click', function () {
        $(this).addClass('m-button-pressed');
        if ($('#subscriptions').is(':hidden')) {
            location.reload(true);
        } else {
            refreshCats();
        }
    });

    // View mode menu selection
    $('#' + pref_ViewMode).addClass('g2tt-option-selected');
    $('.showItem').off('click').on('click', function () {
        console.log('showItem');
        pref_ViewMode = $(this).attr('id');
        setCookie('g2tt_viewMode', pref_ViewMode);
        $('.showItem').removeClass('g2tt-option-selected');
        $(this).addClass('g2tt-option-selected');
        $('.feedsItem').removeClass('g2tt-option-selected');
        $('#feeds-' + pref_ViewMode).addClass('g2tt-option-selected');
        $('#entries').empty();
        $('#subscriptions').attr('class', 'hidden show-' + pref_ViewMode);
        getHeadlines();
    });

    // Order by menu selection
    $('#' + pref_OrderBy).addClass('g2tt-option-selected');


    $('.sortItem').off('click').on('click', function () {
        pref_OrderBy = $(this).attr('id');
        setCookie('g2tt_orderBy', pref_OrderBy);
        $('.sortItem').removeClass('g2tt-option-selected');
        $(this).addClass('g2tt-option-selected');
        $('#entries').empty();
        getHeadlines();
    });

    // Back to Feeds
    $('.back-to-feeds').off('click').on('click', function () {
        popHistory()
        popHistory()
        refreshCats();
        showFeeds();
    });


    // Back to Feeds from sub category
    $('#sub-list-back').off('click').on('click', function () {
        refreshCats();
        getFeeds(global_backCat.pop());
        popHistory()
        if (historylist.peek() == "folder/-4") {
            $('#add-new-subscription').removeClass('hidden');
        }
    });

    // Mark all as read
    $('#show-more-row, #menu-mark-read').off('click').on('click', function () {
        $('body').removeClass('loaded').addClass('loading');
        $('.load-more-message').html('Marking as read...');
        //remove those that need to be kept unread
        keepUnread.removeFromArray(global_ids);
        let data = {
            op: "updateArticle",
            article_ids: global_ids.join(','),
            mode: 0,
            field: 2
        };
        let request = apiCall(data);

        request.done(function (_response) {
            $('#entries').empty();
            getHeadlines();
        });
    });

    // Logout
    $('#menu-logout').off('click').on('click', function () {
        resetHistory()
        pushHistory('Logout');
        let data = {
            op: "logout"
        };
        let request = apiCall(data);

        request.done(function (_response) {
            delCookie('g2tt_feed');
            delCookie('g2tt_isCat');
            delCookie('g2tt_viewMode');
            delCookie('g2tt_orderBy');
            delCookie('g2tt_sid');
            delCookie('g2tt_history');
            location.reload(true);
        });
    });
}

function bindSubscriptionUi() {
    // ADDED - Subscribe to new Feeds
    $('#add-new-subscription').off('click').on('click', function () {
        getCategoriesForNewSubscribe();
        $("#dialog-form").dialog("open");
    });

    // View mode feeds menu selection
    $('#feeds-' + pref_ViewMode).addClass('g2tt-option-selected');
    $('#subscriptions').addClass('show-' + pref_ViewMode);
    $('.feedsItem').off('click').on('click', function () {
        console.log('feedsItem');
        pref_ViewMode = $(this).attr('id').substring(6);
        setCookie('g2tt_viewMode', pref_ViewMode);
        $('.feedsItem').removeClass('g2tt-option-selected');
        $(this).addClass('g2tt-option-selected');
        $('.showItem').removeClass('g2tt-option-selected');
        $('#' + pref_ViewMode).addClass('g2tt-option-selected');
        $('#subscriptions').attr('class', 'show-' + $(this).attr('id').substring(6));
    });

    // Sort feeds A-Z
    if (pref_FeedSort == '1') {
        $('.feedsSort').addClass('g2tt-option-selected');
    }
    $('.feedsSort').off('click').on('click', function () {
        if (pref_FeedSort == '1') {
            pref_FeedSort = '0';
        } else {
            pref_FeedSort = '1';
        }
        setCookie('g2tt_feedSort', pref_FeedSort);
        $(this).toggle('g2tt-option-selected');
    });

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
}

function bindSearchUi() {
    // Show search
    $('#menu-search').off('click').on('click', function () {
        $('.search-box').removeClass('hidden');
        $('#search-input').trigger('focus');
    });
    // Clear and hide search
    $('#search-cancel').off('click').on('click', function () {
        $('#search-input').val('');
        $('.search-box').addClass('hidden');
    });
    // Enter in search field searches
    $('#search-input').off('keypress').on('keypress', function (e) {
        if (e.which == 13) {
            jQuery(this).blur();
            jQuery('#search-submit').trigger('focus').trigger('click');
            return false;
        }
    });
    // Remove currently displayed headlines and search
    $('#search-submit').off('click').on('click', function () {
        $('#entries').empty();
        getHeadlines();
        return false;
    });
}

function bindKeyboardShortcuts() {
    $(document).on('keypress', function(event) {
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





function refreshCats() {
    let data = {
        op: "getCounters",
        output_mode: "fc"
    };
    let request = apiCall(data);

    request.done(function (response) {
        let counters = response.content;
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
            let id = $(this).attr('id').substring(10);
            let is_cat = ($(this).hasClass('open-sub-folder') || $(this).hasClass('closed-sub-folder'));

            if (id == "-4" || id == "-1") {
                $(this).find('.item-count-value').html(feeds['global-unread'].counter);
                if (feeds['global-unread'].counter == '0') {
                    $(this).addClass('no-unread-sub-row').removeClass('unread-sub');
                    $('#subscriptions').removeClass('show-unread').addClass('show-all');
                } else {
                    $(this).removeClass('no-unread-sub-row').addClass('unread-sub');
                    if (pref_ViewMode == 'unread' && $('#subscriptions').hasClass('show-all')) {
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
    let visible = $('#sub-' + global_parentId).children(':visible');
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
    if (global_parentId != '-4') {
        $('#sub-list-back').removeClass('hidden');
        //added to show + for hiding new subscriptions
        $('#add-new-subscription').addClass('hidden');
    }
    pushHistory("folder/" + global_parentId);
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

function apiCall(data, asynch) {
    if (typeof (asynch) === 'undefined') asynch = true;
    data.sid = readCookie('g2tt_sid');
    data = JSON.stringify(data);
    let request = $.ajax({
        contentType: "application/json",
        url: global_ttrssUrl + "/api/",
        type: "post",
        dataType: "json",
        data: data,
        asynch: asynch,
    });

    return request;
}

function renderEntryMarkup(headline) {
    global_ids.push(headline.id);
    let email_subject = headline.title;
    let email_body = '<br><h4>Sent to you via tt-rss</h4><h2><a href="' + headline.link + '">' +
        headline.title + '</a></h2>' + headline.content;

    let content = $(headline.content);
    let alt;
    if (content.length == 1 && content.is("img") && (alt = (content.attr("title") || content
            .attr("alt")))) {
        content = $("<div>" + content[0].outerHTML + "<div>" + alt + "</div></div>");
    } else {
        let container = $("<div></div>");
        container.append(content);
        content = container;
    }
    let date = new Date(headline.updated * 1000);
    let entry = "<div id='" + headline.id + "' class='entry-row whisper" + ((!headline.unread) ?
            " read" : "") + "'> \
    <div class='entry-container'> \
    <div class='entry-top-bar'> \
    <span class='link entry-next'> \
    <span class='entry-next-fa-icon'><i class='fa fa-arrow-down'></i></span> \
    <span class='entry-next-text'>Next item</span> \
    </span> \
    <span class='link entry-collapse'> \
    <span class='entry-collapse-fa-icon'><i class='fa fa-bars'></i></span> \
    <span class='entry-collapse-text'>Collapse</span> \
    </span> \
    </div> \
    <div class='entry-header'> \
    <div class='entry-icons'> \
    <i class='favStarDiv fa-regular fa-star fa-2x starBorder'> </i> \
    <i class='favStar fa fa-star fa-2x " + ((headline.marked) ? "starActive" : "starNotActive") + "'></i> \
    </div> \
    <div class='entry-header-body'> \
    <div class='text'> \
    <span class='item-title-collapsed'>" + headline.title + "</span> \
    <a href='" + headline.link + "' \
    class='item-title item-title-link' target='_blank'>" + headline.title + "</a> \
    <span class='item-source-title'>&nbsp;-&nbsp;" + headline.feed_title + "</span> \
    <div class='item-snippet'>" + ((headline.excerpt && headline.excerpt != '&hellip;') ? headline.excerpt : $(
            headline.content).text().substr(0, 100) + '&hellip;') + "</div> \
    </div> \
    <div class='entry-sub-header'>by " + headline.author + " on " + date.toLocaleString() + "</div> \
    </div> \
    </div> \
    <div class='entry'> \
    <div id='entry-contents' class='entry whisper'> \
    <div class='entry-annotations'></div> \
    <div class='entry-contents-inner'>" + content[0].outerHTML + "</div> \
    </div> \
    <div class='entry-footer'> \
    <div class='entry-actions'> \
    <div class='entry-actions-primary'> \
    <span class='read-state link unselectable' title='Toggle read'>\
    <i class='fa fa-book-open'></i>&nbsp;Mark unread\
    </span> \
    <span class='link unselectable' title='Sent by mail'> \
    <i class='fa fa-envelope-o' style='vertical-align:top;'></i> \
    <a class='link unselectable' href='mailto:?subject=" + encodeURIComponent(email_subject) + "&body=" +
        encodeURIComponent(email_body) + "'>E-Mail</a> \
    </span> \
    <wbr /> \
    </div> \
    </div> \
    </div> \
    <div class='action-area-container'></div> \
    </div> \
    </div> \
    </div>";

    $('#entries').append(entry);
}

function renderHeadlines(headlines) {
    $.each(headlines, function (index, headline) {
        renderEntryMarkup(headline);
    });
}

function handleHeadlinesResponse(data, response, _textStatus, _jqXHR) {
    if (response.status != 0) {
        delCookie('g2tt_sid');
        console.log('Removed sid - response.status = ' + response.status); // why?
        console.log(data);
        console.log(response);
        throw "Problem: " + response.content.error;
        // getData();
        // return;
    }
    let headlines = response.content;

    if (headlines.length != data.limit) {
        $('#load-more-items').hide();
    } else {
        $('#load-more-items').show();
    }
    renderHeadlines(headlines);

    // Expand an entry
    $('.entry-header-body').off('click').on('click', function () {
        expandEntry($(this).closest('.entry-row'));
    });

    // Collapse an entry
    $('.entry-top-bar').off('click').on('click', function () {
        collapseEntry($(this).closest('.entry-row'));
    });

    // Next entry
    $('.entry-next').off('click').on('click', function (event) {
        expandEntry($(this).closest('.entry-row').next());
        event.stopPropagation();
    });

    // Toggle read
    $('.read-state').off('click').on('click', function () {
        toggleEntryAsRead($(this).closest('.entry-row'));
    });

    // Mark NewFont (star) entry
    $('.favStarDiv').off('click').on('click', function () {
        let data = {
            op: "updateArticle",
            article_ids: $(this).closest('.entry-row').attr('id'),
            mode: 2,
            field: 0
        };
        let _response = apiCall(data);

        $(this).next().toggleClass('starNotActive').toggleClass('starActive');
    });

    // Done loading
    $('body').removeClass('loading').addClass('loaded');
    $('.load-more-message').html('Mark these items as read');
    $('.entries-count').html('Showing ' + $('.entry-row').length + ' items');
    keepUnread.clean(global_ids);
}

function getHeadlines(since) {
    $('body').addClass('loading');
    $('.load-more-message').html('Loading...');
    $('.entries-count').html('');
    if (typeof (since) === 'undefined') since = 0;

    //Anytime we get headlines, check if there is a search filter
    let search = $('#search-input').val();

    let data = {
        op: "getHeadlines",
        feed_id: pref_Feed,
        limit: pref_Feed_limit,
        show_excerpt: 1,
        show_content: 1,
        include_attachments: 0,
        view_mode: pref_ViewMode,
        is_cat: pref_IsCat
    };
    data.include_nested = true;
    data.order_by = pref_OrderBy;
    if (pref_OrderBy == "date_reverse") {
        data.since_id = since;
    } else {
        data.skip = since;
    }
    data.search = search;
    let headlines = apiCall(data);

    headlines.done(function (response, _textStatus, _jqXHR) {
        handleHeadlinesResponse(data, response, _textStatus, _jqXHR);
    });
}

function getTopCategories() {
    $('#nav-title').html('');
    $('#sub-list-back').addClass('hidden');
    if ($('#sub--4').length != 0) {
        $('#subscriptions-list').children().addClass('hidden');
        $('#sub--4').removeClass('hidden');
        $('.closed-sub-folder').off('click').on('click', function () {
            console.log('closed-sub-folder');
            global_backCat.push("-4");
            pushHistory('folder/-4');
            $('#subscriptions-list').children().addClass('hidden');
            getFeeds($(this).attr('id').substring(10), $(this).find('.sub-item').html(), $(this).find(
                '.item-count-value').html());
        });
    } else {
        $('body').addClass('loading').addClass('sub-tree');
        $('#loading-area-container').removeClass('hidden');

        $('#subscriptions-list').append("<div id='sub--4'></div>");

        let data = {
            op: "getUnread"
        };
        let request = apiCall(data);
        request.done(function (response, _textStatus, _jqXHR) {
            var entry = "<div class='row whisper sub-row open-sub-folder" +
            ((unread > 0) ?
                " unread-sub" :
                " no-unread-sub-row") +
            "' id='tree-item--4'> \
            <div class='icon-cell'> \
            <i class='fa fa-folder-open fa-lg'></i> </div> \
            <div class='text sub-item'>All articles</div> \
            <div class='item-count larger whisper'> \
            <span class='item-count-value' id='tree-item--4-unread-count'>" + unread + "</span> \
            </div> \
            </div>";


            $('#sub--4').prepend(entry);

            $('#tree-item--4').off('click').on('click', function () {
                showFeedsFn($(this).attr('id').substring(10), false);
            });
        });

        data = {
            op: "getCategories",
            enable_nested: true
        };
        let cats = apiCall(data);

        cats.done(function (response, _textStatus, _jqXHR) {
            cats = response.content;

            cats.sort(function (a, b) {
                let db_order = ((a.order_id < b.order_id) ? -1 : ((a.order_id > b.order_id) ? 1 : 0));
                let alpha_order = ((a.title < b.title) ? -1 : ((a.title > b.title) ? 1 : 0));
                if (pref_FeedSort == '1') {
                    return alpha_order;
                } else {
                    return db_order;
                }
            });
            $.each(cats, function (index, cat) {
                var entry = "<div class='row whisper sub-row closed-sub-folder" +
                ((cat.unread > 0) ?
                    " unread-sub" :
                    " no-unread-sub-row") +
                " nested-sub' id='tree-item-" + cat.id + "'> \
                <div class='icon-cell'> \
                <i class='fa fa-folder fa-lg'></i></div> \
                <div class='text sub-item'>" + cat.title + "</div> \
                <div class='item-count larger whisper'> \
                <span class='item-count-value' id='tree-item-" + cat.id + "-unread-count'>" + cat.unread + "</span> \
                </div> \
                </div>";

                $('#sub--4').append(entry);

            });

            $('.closed-sub-folder').off('click').on('click', function (_event) {
                pushHistory("folder/" + $(this).attr('id').substring(10));
                global_backCat.push("-4");
                $('#subscriptions-list').children().addClass('hidden');
                getFeeds($(this).attr('id').substring(10), $(this).find('.sub-item').html(), $(this)
                    .find('.item-count-value').html());
            });

            // Done loading
            $('body').removeClass('loading').addClass('loaded');
            $('#loading-area-container').addClass('hidden');
        });
    }
}

function showFeedsFn(feedId, isCat) {
    pushHistory((isCat?'mult':'sing') + '/feed/' + feedId);
    setCookie('g2tt_feed', feedId);
    setCookie('g2tt_isCat', isCat);
    pref_Feed = readCookie('g2tt_feed', pref_Feed);
    pref_IsCat = readCookie('g2tt_isCat', pref_IsCat);
    getData();
}

function getFeeds(parent_id, parent_title, parent_unread) {
    global_parentId = parent_id;

    if (parent_id === '-4') {
        getTopCategories();
        return;
    }
    $('#nav-title').html('');
    $('#sub-list-back').removeClass('hidden');
    //added to show + for adding new subscriptions
    $('#add-new-subscription').addClass('hidden');

    if ($('#sub-' + parent_id).length != 0) {
        $('#subscriptions-list').children().addClass('hidden');
        $('#sub-' + parent_id).removeClass('hidden');
        $('.closed-sub-folder').off('click').on('click', function () {
            console.log('closed-sub-folder: ' + parent_id);
            global_backCat.push(parent_id);
            $('#subscriptions-list').children().addClass('hidden');
            getFeeds($(this).attr('id').substring(10), $(this).find('.sub-item').html(), $(this).find(
                '.item-count-value').html());
        });
    } else {
        $('body').addClass('loading').addClass('sub-tree');
        $('#loading-area-container').removeClass('hidden');

        let data = {
            op: 'getFeeds',
            cat_id: parent_id,
            include_nested: true
        };
        let feeds = apiCall(data);

        feeds.done(function (response, _textStatus, _jqXHR) {
            feeds = response.content;
            feeds.sort(function (a, b) {
                let alpha_order = ((a.title < b.title) ? -1 : ((a.title > b.title) ? 1 : 0));
                if (pref_FeedSort == '1') {
                    return alpha_order;
                } else {
                    return ((a.cat_id < b.cat_id) ? -1 : ((a.cat_id > b.cat_id) ? 1 : 0));
                }
            });
            $('#subscriptions-list').append("<div id='sub-" + parent_id + "'></div>");
            var entry = "<div class='row whisper sub-row open-sub-folder" +
            ((parent_unread > 0) ?
                " unread-sub" :
                " no-unread-sub-row") +
            "' id='tree-item-" + parent_id + "'> \
            <div class='icon-cell'> \
            <i class='fa fa-folder-open fa-lg'></i> </div> \
            <div class='text sub-item'>" + parent_title + "</div> \
            <div class='item-count larger whisper'> \
            <span class='item-count-value' id='tree-item-" + parent_id + "-unread-count'>" + parent_unread + "</span> \
            </div> \
            </div>";

            $('#sub-' + parent_id).prepend(entry);

            $.each(feeds, function (index, feed) {
                var entry = "<div class='row whisper sub-row" +
                ((feed.unread > 0) ?
                    " unread-sub" :
                    " no-unread-sub-row")
                + " " +
                ((feed.is_cat) ?
                    "closed-sub-folder" :
                    "sub") +
                " nested-sub' id='tree-item-" + feed.id + "'> \
                <div class='icon-cell'> \
                <i class='fa fa-rss-square'></i> </div> \
                <div class='text sub-item'>" + feed.title + "</div> \
                <div class='item-count larger whisper'> \
                <span class='item-count-value' id='tree-item-" + feed.id + "-unread-count'>" + feed.unread + "</span> \
                </div> \
                </div>";

                $('#sub-' + parent_id).append(entry);

            });

            $('.closed-sub-folder').off('click').on('click', function (_event) {
                console.log('closed-sub-folder');
                global_backCat.push(parent_id);
                pushHistory("folder/" + $(this).attr('id').substring(10));
                $('#subscriptions-list').children().addClass('hidden');
                getFeeds($(this).attr('id').substring(10), $(this).find('.sub-item').html(), $(this)
                    .find('.item-count-value').html());
            });

            $('.open-sub-folder[id!="tree-item--4"]').off('click').on('click', function () {
                console.log('open-sub-folder!=-4');
                showFeedsFn($(this).attr('id').substring(10), true);
            });

            $('.sub').off('click').on('click', function (_event) {
                showFeedsFn($(this).attr('id').substring(10), false);
            });

            // Done loading
            $('body').removeClass('loading').addClass('loaded');
            $('#loading-area-container').addClass('hidden');
        });
    }
}

function getTitle() {
    let data = {};
    if (pref_IsCat == "true") {
        data.op = "getCategories";
    } else {
        data.op = "getFeeds";
        data.cat_id = "-4";
    }

    let request = apiCall(data);

    request.done(function (response, _textStatus, _jqXHR) {
        if (response.status != 0) {
            delCookie('g2tt_sid');
            getData();
            return;
        }
        let items = response.content;

        $.each(items, function (index, item) {
            if (item.id == pref_Feed) {
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
    } else if (pref_StartInCat == '1') {
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
    global_ids = [];
    getTitle();
    getHeadlines();
}

var keepUnread = new function () {
    this.keepUnreadIdMap = undefined;

    let getIdMap = function () {
        if (undefined == this.keepUnreadIdMap) {
            //attempt to load from cookie
            this.keepUnreadIdMap = [];
            let savedKeepUnread_ids = readCookie('g2tt_keepUnread_ids');

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
        return true == getIdMap[articleId];
    };
    this.removeId = function (articleId) {
        delete getIdMap()[articleId];
    };
    this.addId = function (articleId) {
        getIdMap()[articleId] = true;
        this.save();
    };
    this.clean = function (ids) {
        //check that global_keepUnread_ids does not contain items which are no longer in global_ids
        var keepUnreadIds = getIdMap();
        if (ids.length > 0) {
            for (var id in keepUnreadIds) {
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
        var keepUnreadIds = getIdMap();
        for (var id in keepUnreadIds) {
            id = id || 0; //id must be numeric
            var index = $.inArray(id, ids);
            if (index >= 0) {
                ids.splice(index, 1);
            }
        }
    };
    this.save = function () {
        var strVal = '';
        var keepIdMap = getIdMap();
        for (var articleId in keepIdMap) {
            if (strVal.length > 0) {
                strVal += ',';
            }
            strVal += articleId;
        }
        setCookie('g2tt_keepUnread_ids', strVal);
    };
};


//ADDED for subscribing to new feeds

function subscribe(feedurl, categoryID) {
    let data = {
        op: "subscribeToFeed",
        feed_url: feedurl,
        category_id: categoryID
    };
    $('#indicator').removeClass('hidden');
    let request = apiCall(data);

    request.done(function (response, _textStatus, _jqXHR) {
        let content = response.content;
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
         *                 0 - OK, Feed already exists
         *                 1 - OK, Feed added
         *                 2 - Invalid URL
         *                 3 - URL content is HTML, no feeds available
         *                 4 - URL content is HTML which contains multiple feeds.
         *                     Here you should call extractfeedurls in rpc-backend
         *                     to get all possible feeds.
         *                 5 - Couldn't download the URL content.
         *                 6 - Content is an invalid XML.
         */
        switch (statusCode) {
            case 0:{
                //0 - OK, Feed already exists
                //let status0 = confirm('Feed already exists in your feed list. Press OK to return to feed list, or Cancel to try again.');
                $('#indicator').addClass('hidden');
                window.alert('Feed already exists in your feed list.');

                //uncomment next line if you'd like it to close pop-up when they press OK.
                //$( "#dialog-form" ).dialog( "close" );

                break;}
            case 1:{
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
                break;}
            case 2:{
                //2 - Invalid URL
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert('Invalid URL submitted. Please check URL and try again.');
                break;}
            case 3:{
                //3 - URL content is HTML, no feeds available
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert(
                    'URL content is HTML, no feeds available. Please check that URL has feeds and try again.'
                );}
                break;
            case 4:{
                //4 - URL content is HTML which contains multiple feeds.
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').removeClass('hidden');
                $('#multipleFeedsSelect').removeClass('hidden');
                $.each(feeds, function (url, title) {
                    $('#feedsAvail').append($('<option></option>').val(url).html(title));

                });
                break;}
            case 5:{
                //5 - Couldn't download the URL content.
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert(
                    'Unable to download the URL content. Please check your internet connection or the URL and try again.'
                );
                break;}
            case 6:{
                //6 - Content is an invalid XML.
                $('#indicator').addClass('hidden');
                $('#multipleFeedNotice').addClass('hidden');
                $('#multipleFeedsSelect').addClass('hidden');
                window.alert(
                    'Content is an invalid XML format. Please visit the website you are trying to add to verify they use XML feed output.'
                );
                break;}
        }
        return response;
    });
}

function getCategoriesForNewSubscribe() {
    let data = {
        op: "getFeedTree",
        include_empty: true,
        enable_nested: false
    };
    let catsForNew = apiCall(data);

    catsForNew.done(function (response, _textStatus, _jqXHR) {
        catsForNew = response.content;
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

    console.log($('.expanded'));
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
        for (let i = 0; i < global_ids.length; i++) {
            let articleId = entryRow.attr('id');
            if (global_ids[i] == articleId) {
                global_ids.splice(i, 1);
                keepUnread.addId(articleId);
            }
        }
    } else {
        entryRow.find(".read-state").html("<i class='fa fa-book-open'></i>&nbsp;Mark unread");
        let articleId = entryRow.attr('id');
        global_ids.push(articleId);
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

// function getErrorObject() {
//     try { throw Error('') } catch(err) { return err; }
// }

// function callee() {
//     var err = getErrorObject();
//     var caller_line = err.stack.split("\n")[4];
//     var index = caller_line.indexOf("at ");
//     var clean = caller_line.slice(index+2, caller_line.length);
//     return clean;
// }


// historylist.peek = function(p = 1){
//     if (historylist.length > p - 1) {
//         return historylist[historylist.length - p];
//     }
//     return '';
// }
if (!Array.prototype.peek) {
    Object.defineProperty(Array.prototype, 'peek', {
        value: function(p = 1) {
            // "this" refers to whatever array calls the method
            if (this.length > p - 1) {
                return this[this.length - p];
            }
            return '';
        },
        enumerable: false,   // Keeps it hidden from for...in loops
        configurable: true,  // Allows redefinition if needed
        writable: true       // Allows value changes
    });
}

function pushHistory(t) {
    historylist.push(t);
    sethash(historylist.peek());
    setCookie('g2tt_history', JSON.stringify(historylist.slice(-20)));
}

function popHistory() {
    var h = historylist.pop();
    sethash(historylist.peek());
    setCookie('g2tt_history', JSON.stringify(historylist.slice(-20)));
    return h;
}

function resetHistory() {
    historylist = [];
    setCookie('g2tt_history', JSON.stringify([]));
    sethash('');
}

function sethash(h) {
    var oldLocation = '';
    if (window.location) {
        oldLocation = window.location.hash.slice(1); // remove # from the start
        window.location.hash = h;
    }
    return oldLocation;
}

function gethash() { // eslint-disable-line no-unused-vars
    if (window.location && window.location.hash) {
        return window.location.hash.slice(1);
    }
    return '';
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
        console.error('Error near:', str.substring(Math.max(0, pos - 20), pos + 20));
        }
        return [];
    }
}