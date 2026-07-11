# Remaining potential refactorings

## getHeadlines() orchestration

    split into fetchHeadlines(), renderHeadlines(), bindHeadlineEvents(),
    updateLoadMoreState(), finaliseHeadlines()

## headline rendering

make buildHeadlinesEntry() return a DOM/jQuery node or sanitized template
remove side effects like global_ids.push() from the render helper

## tree/list rendering

factor duplicate category/feed row building and click wiring
in getTopCategories() /
getFeeds()


## state management

reduce reliance on globals like pref_Feed, pref_IsCat, global_ids, global_parentId
consider a small state object instead of scattered vars

## keepUnread helper

fix hasId bug (getIdMap[articleId] should likely be getIdMap()[articleId])
simplify cookie load/save and map handling

## `API helper and error handling

improve apiCall() to handle failures consistently
verify the asynch option usage against jQuery’s async

## modern JavaScript cleanup

use const/let consistently
avoid var
simplify nested loops and conditional logic in getCategoriesForNewSubscribe() and other helpers


if pref_IsCat was sometimes a string and sometimes boolean, the exact semantics must be preserved
