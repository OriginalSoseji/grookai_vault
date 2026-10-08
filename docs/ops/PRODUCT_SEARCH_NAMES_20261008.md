# Card-name and artist ambiguity

The qualified offer UI parent is d4c19b0523caba1d2dee665315efdb45688f782b.
Its ordinary hook passed8,003 contracts/10 skips,1,947 native/3 skips, web
types/lint/build and analysis. All32 retained hashes matched. Samsung429 native356
inputs and five browser/runtime source bindings remain unchanged. Preserve it.

## Reproduced problem

The Pokemon parser changes Black Market to artist TOMATO MARKET plus text Black.
A read-only catalog check found Black Market diamond at GV-PK-TEU-134 and a
Japanese canonical printing. The deployed public GET returned0 for unquoted
Black Market and those2 cards for quoted text. Deployment source is not bound
to this worktree, but current parser behavior independently matches. Evidence
is in product_offer_ui_20261008/search-intent-collision.json,
search-pokemon-collision-readonly.json and search-public-comparison.json.
No production data was changed.

## Implementation boundary

Reuse catalogSetSearch name checks and request-local page retention where useful.
The route currently skips name disambiguation when an inferred artist exists.
Compare a literal interpretation of an ambiguous partial credit against actual
card-name evidence. Preserve full credits, explicit artist/illustrator prefixes
and parameters, surname+card+finish combinations, typo correction/undo, quotes,
exact identifiers, game/language and set constraints. Consider explicit set
parameters and artist-only queries rather than only the reproduced phrase.
Do not disable artist search or hard-code a Black Market exception.

Read apps/web/AGENTS.md and relevant installed Next docs before edits. Read
GROOKAI_SMART_SEARCH_V1 and UNIFIED_COLLECTOR_SEARCH_UX_V1. Existing tests include
combined_search_intent.test.mjs and catalog_set_search.test.mjs. Shared dependency
junctions point to qualified Buy; do not reinstall/mutate them.

Current-route runtime uses fresh synthetic local catalog fixtures, retaining
all prior rows and controls. Production GET/catalog reads are baseline evidence,
not permission to connect a development build to production. No schema work,
provider fetch, data rewrite, deployment, upload or activation. Dedicated
ordinary wrappers must pin this new root and evidence base.

The parser can now produce a literal alternative without guessing a partial
artist. The route verifies its card-name fragments through the existing bounded
catalog reader before selecting it. Explicit prefixes/full credits remain artist
requests; an explicit illustrator parameter keeps card words in the text.
Single-word ambiguity and exact/inline sets are covered. Failed catalog reads
return an error rather than changing interpretation.

Focused48 parser/route tests pass, along with web types and lint. Actual local
RPC run search-1791453545036 passes15 query cases plus browser rendering. Two
phone/desktop images were inspected. The run adds only synthetic catalog rows;
all32 prior table row sets, accounts, copies, receipts and controls are preserved.
There is no active price pointer. The current source bindings still match.
No native product inputs changed. The external checkpoint owns ordinary-hook
status and actual progress. Exact combined cost/Buy/Trade release, mobile density,
iOS capacity, measured benchmark and the full overhaul remain open. Mac latest
read-only capacity is1,173,708KiB; no build attempted or archives removed.
