# Remaining potential refactorings

## headline rendering

make buildHeadlinesEntry() return a DOM/jQuery node or sanitized template
remove side effects like global_ids.push() from the render helper

## tree/list rendering

factor duplicate category/feed row building and click wiring
in getTopCategories() / getFeeds()


## modern JavaScript cleanup

use const/let consistently
avoid var
simplify nested loops and conditional logic in getCategoriesForNewSubscribe() and other helpers

