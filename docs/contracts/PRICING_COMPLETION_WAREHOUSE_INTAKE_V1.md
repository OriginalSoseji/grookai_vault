# Warehouse discovery intake V1

`normalizePricingCompletionWarehouseIntakeV1` is a pure, built-in-only adapter for
the original `FIXED_OPERATOR_POKEMON_WAREHOUSE_EXPORT_V3` bytes. It requires the
external original-byte SHA256, exact reviewed collector and SQL pins, and explicit
validation time. It performs no filesystem, environment, network or database access.
The collector pin identifies the reviewed contract; replay cannot authenticate a
remote process. Transport/read-only/rollback fields remain recorded operator claims.

Every category-3 product is retained, including inactive, stale, unselected,
unquoted and unclassified products. Complete inventory coverage is not proof that
every product is a card or that every card exists. Master coverage remains unknown.
Historical observation counts must be null/not_collected. Indexed presence/latest
date is reconciled with every exported observation, including decision-only rows.

Admission checks exact envelope/record fields, original byte hash, strict UTF-8 and
JSON without duplicate keys, finite numbers, depth <=64, current publication binding,
verified/reconciled source state, full-sync completion, explicit read-only repeatable
read and rollback terminal, database maturity, current-source flags, exact mapping
identity, unique rows, every per-product count and all reported summaries. Limits
match the collector: 256 MiB original envelope, 200,000 products/statuses, 10,000
groups and 500,000 observations/decisions/mappings. One product row is <=128 KiB.
Capture age is caller bounded to at most 24 hours; combined refresh should use 30
minutes. The source must be <=24 hours old at validation, not just at capture.

`inventory` contains every real product identity and its stable semantic digest.
`observations` contains one entry per issue-bearing product with all sorted unique
issues. Identity is `{kind:'warehouse_product',provider:'tcgcsv',category:'3',
productId:string}`. There are no invented subtype, currency or printing IDs.
Products with no detected issues remain inventory; absence never closes earlier work.

Evidence retains stable product metadata and hashes of extended data, source quote
content, decisions and mappings. Capture hashes, observation/decision IDs, source-run
IDs and capture/seen timestamps are excluded from the semantic digest. Provenance-only
row IDs are in `sourceLinks`; complete run/clock/hash provenance is in `receipt` and
`coverage`. The original pinned capture remains the complete evidence artifact.
Real price, payload, classification or mapping changes change the semantic digest.
Name text does not establish card type, retailer identity, ownership or promotion
authority. `unsupported_product_kind` stays unresolved when captured decisions say it.
An individual current-run decision bound to a different source-sync run remains in
the census with `decision_source_sync_mismatch` and a stable boolean evidence flag;
its volatile run ID remains in the pinned original input. This diagnostic does not
reject or drop the rest of the product population.

This new discovery format is not a V1 worker input. It changes no deployed module,
queue, price, mapping or catalog record and permits no automatic closure or repair.
