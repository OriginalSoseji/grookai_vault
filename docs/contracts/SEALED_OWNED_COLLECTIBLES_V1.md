# Sealed Owned Collectibles V1

Date: 2026-09-07. Status: Active implementation contract, not a live feature.
Authority: founder request that all sealed products work like cards in Vault,
totals, Wall, sale and trade. This is not catalog-ingestion or public-pricing
authorization. It supersedes treating sealed ownership as optional backlog.

## Product Scope

Every released sealed identity, across supported TCGs and languages, must have
the same collector lifecycle as an owned card. Do not require a market price to
own an item. Expired pricing or unavailable imagery must not erase ownership.
Hidden/unreconciled catalog candidates are not automatically made visible.

- Add from sealed search/browse/detail, choose quantity and acquisition cost.
- Read and manage exact copies in the existing Vault, not a second Vault.
- Include sealed in the same total with type subtotals and unpriced counts.
- Assign copies to existing Wall sections; showcase, offer for sale or trade.
- Vendor mode supports asking price, package condition, section and visibility.
- Record sale price and optional counterparty; record trade received and optional
  cash paid/received. Reuse the existing transaction UI and history conventions.
- Remove/archive and bulk-select exact copies without deleting history.
- Share exact-copy links, QR and lots without misidentifying products as cards.
- Preserve personal/front/back images and notes. Card-specific finishing,
  grading and numbering controls do not appear for sealed packages.
- Apply equivalent behavior in Flutter and web. Mixed card/sealed results and
  totals must remain consistent through reload, app restart and another client.

## Identity And Quantity

Keep `vault_item_instances` as ownership truth and GVVI as exact-copy identity.
Add a real `sealed_product_variant_id` FK, not a fake `card_print_id`, child
printing or legacy card bucket. Exactly one of card, slab or sealed anchors.
Sealed rows cannot carry card-printing, slab-grade or legacy card-bucket values.
Parent family identity is not sufficient: package, language, region, edition
and explicit variant distinctions remain authoritative.

One row represents one physical product. Three booster boxes create three owned
copies, not their packs or cards. Contents inventory is not created by addition.
Add retries use a user-scoped request ID, payload binding and one atomic GVVI
allocation. Reuse the existing owner allocator; do not introduce another GVVI
namespace or counter. Reusing a request ID with another payload must fail.

## Condition And Pricing

Use separate `seal_state` (factory_sealed/opened/unknown) and
`package_condition` (undamaged/damaged/unknown). Defaults are unknown, not a
claim that the owner possesses an undamaged factory-sealed product.

Current governed sealed market prices are factory-sealed product benchmarks.
Only eligible exact-condition observations contribute to market totals; no
invented damage discounts, opened-box valuation or asking-price fallback.
Display any reference benchmark as such, separately from eligible owned value.
Acquisition cost, asking price, realized proceeds and market value are separate.

Read current qualified evidence by exact variant and active per-game release.
Retain source, qualification, release and observation date in the read model.
Honor the existing UTC seven-day cutoff, future-date exclusion and audience
policy. Missing/expired/unsupported values contribute to unpriced counts, not
zero-price facts. Do not persist a signed URL or cached market number as truth.
Use integer minor units or decimal SQL arithmetic; never combine currencies
without an explicitly governed exchange-rate layer. An all-unpriced total is
unknown, not zero. Count each active owned copy once, never also its family or
compatibility bucket. Archived/sold/traded copies leave active totals.

## Shared Lifecycle And Privacy

Newly added copies start private/hold. Publishing uses existing owner and
section controls. Every read checks ownership or permitted shared visibility,
block policy and active state. Private sections and private notes remain private.
Anonymous price/image licensing is not bypassed by a Wall or GVVI route.

Sale/trade must atomically persist transaction evidence, archive the exact copy
and withdraw active listings. Retries return the same bound outcome. Competing
sale/trade requests cannot both succeed. A counterparty label does not transfer
ownership into another account; actual transfer needs their acceptance.
Trade-description text never auto-creates guessed received products.
No permanent deletes. Rollback disables entry points, preserves owned data and
history, and keeps existing card/slab paths available.

## Implementation Order

1. Audit live constraints, triggers, owner allocation, archive/disposition,
   section authorization, and all card-assuming read adapters.
2. Resolve linked-schema preflight differences before adding/applying a migration.
   Never execute a generated broad diff as the repair.
3. Add and replay the nullable sealed FK, anchor/condition guards, idempotent
   creation, lifecycle dispatch and transaction evidence extension. Prove all
   existing card/slab fixtures unchanged, RLS denial, concurrency and rollback.
4. Build typed owned-collectible readers for Vault/totals, Wall, vendor, GVVI,
   sharing/lots and transactions. Preserve older card-only endpoints during
   client rollout; no reinterpretation of old `card_id` response fields.
5. Wire both clients behind a default-off ownership flag and test against the
   migrated disposable database. No Add button may report success without readback.
6. Freeze the exact migration/apply plan under existing deployment governance;
   then bounded owner canary, readback, idempotency and disable/restore proof.
7. Activate only after full lifecycle and mixed-inventory regression acceptance.

## Acceptance Matrix

Require Pokemon and MTG examples, another supported game when its sealed lane
is released, multiple languages, box/pack/case distinctions, two copies of one
variant, missing/expired prices, private/public sections, sold/traded/removed
copies, partial trade plus cash and mixed card/slab/sealed holdings.

Prove cross-account denial, malformed/dual anchors, hidden identity rejection,
request replay, concurrent dispositions, identical cross-client totals,
preserved existing card IDs/counts/prices, exact-copy share identity and no
stale sold listing after reload. Anonymous denial remains intact.

`backend/vault/owned_collectible_contract_v1.mjs` is the executable offline
policy and transaction-plan vocabulary. It is not a writer, database security
boundary, deployed RPC, or proof that this full acceptance matrix is complete.
