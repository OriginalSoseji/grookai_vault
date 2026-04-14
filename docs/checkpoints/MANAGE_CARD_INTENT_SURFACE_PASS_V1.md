# MANAGE CARD INTENT SURFACE PASS V1

## Purpose
Surface collector intent at the top of `Manage Card` so the page reflects what the user is doing with the card, not just how the wall config is stored.

## Scope Lock
- mobile `Manage Card` only
- reuse existing intent model
- no new backend semantics
- reorganize hierarchy, not product meaning

## Intent Audit
- existing intent source: the product already uses the canonical vault intent model from web `apps/web/src/lib/network/intent.ts` and mobile vault/network readers; grouped card intent lives on `vault_items.intent`, and exact-copy intent lives on `vault_item_instances.intent`
- existing intent values: `hold`, `trade`, `sell`, `showcase`
- current mobile representation: `VaultManageCardCopy.intent` is loaded into the copy list, but the grouped `Manage Card` surface does not surface intent near the top and does not currently expose grouped-card intent controls
- current web/wall representation: public wall and network surfaces use `Trade`, `Sell`, and `Showcase`; web exact-copy settings also expose `Hold`, `Trade`, `Sell`, and `Showcase`
- current `Manage Card` top hierarchy: hero card -> wall settings form -> copies list
- why the page currently feels off: the screen leads with grouped wall fields like category, note, and price display before it explains the collector decision; intent exists in the product model but is visually buried inside copy rows instead of guiding the top of the page
