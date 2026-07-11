Suggestions to improve apiCall() and error handling
1. Fix the jQuery option typo
Current code uses:
```
    $.ajax({ ..., asynch: asynch })
```
jQuery expects:
```
    $.ajax({ ..., async: asynch })
```
That means the async flag is currently ignored.

2. Centralize API response validation
Right now every .done() caller repeats:
```
    if (response.status != 0) {
    $.removeCookie('g2tt_sid');
    getData();
    return;
    }
```
Instead:

make apiCall() reject the promise for bad API status
move login/session invalidation into the helper
let callers handle only the success payload
Example:
```
    function apiCall(data, options = {}) {
    data.sid = readCookie('g2tt_sid');
    return $.ajax({...})
        .then(response => {
        if (response.status !== 0) throw response;
        return response.content;
        })
        .fail(handleAjaxError);
    }
```
3. Add a shared AJAX failure handler
Right now every request duplicates:

```
    request.fail(function (jqXHR, textStatus, errorThrown) {
    console.error(...);
    });
```
Instead:

create one handleApiError(jqXHR, textStatus, errorThrown) helper
optionally show a user-facing alert only for unexpected network failures
keep console.error and preserve the current behavior
4. Normalize the request contract
Make apiCall() return content directly, not the raw response object:
```
apiCall(data).done(function (content) {
  // content is response.content
});
```
This simplifies callers and keeps error checks in one place.

5. Add timeout and retry behavior
A small config default helps stability:

const API_TIMEOUT_MS = 15000;
```
    function apiCall(data, { async = true, timeout = API_TIMEOUT_MS } = {}) {
    return $.ajax({
        async,
        timeout,
        contentType: 'application/json',
        dataType: 'json',
        ...
    });
    }
```
6. Preserve session override behavior
If sid is missing or invalid, the helper should:

remove expired session cookie
optionally redirect to login or call a centralized handleSessionExpired()
7. Keep caller-specific failure handling
For cases like “mark all as read” or feed loading, allow caller-specific .fail() behavior while still sharing base logging and session handling.

Practical improvement
A cleaner helper shape:
```
    function apiCall(data, opts = {}) {
    data.sid = readCookie('g2tt_sid');

    return $.ajax({
        url: appState.url + '/api/',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(data),
        async: opts.async !== false,
        timeout: opts.timeout || 15000
    })
    .then(response => {
        if (response.status !== 0) {
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
```
That gives you:

one true async option
centralized status/error handling
less repeated code
clearer caller semantics.
If you want, I can also suggest a concrete refactor for getHeadlines() to consume that cleaner API helper.


Concrete refactor for getHeadlines();


```
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

function handleHeadlinesResponse(response) {
    let headlines = response.content;
    updateHeadlinesPagination(headlines.length, appState.feedLimit);
    renderHeadlines(headlines);
    bindHeadlineEvents();
    finaliseHeadlines();
}

function getHeadlines(since) {
    $('body').addClass('loading');
    $('.load-more-message').html('Loading...');
    $('.entries-count').html('');

    getHeadlinesRequest(since).done(function (response, _textStatus, _jqXHR) {
        if (response.status != 0) {
            $.removeCookie('g2tt_sid');
            getData();
            return;
        }
        handleHeadlinesResponse(response);
    });
}
```