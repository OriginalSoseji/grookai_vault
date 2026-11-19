# TCGTracking condition reference intake V1

Status: Active. Owner-authorized scope: extend the Dragons Exalted source trial
across existing database mappings, November 17, 2026.

## Authority

This additive private intake follows `PRICING_EVIDENCE_ENGINE_V1` and
`EXTERNAL_SOURCE_INGESTION_MODEL_V1`. It does not change Production V1 headline
prices, canonical identities, printing truth, Vault totals or vendor asks.

TCGTracking documents unauthenticated daily SKU prices at
`https://openapi.tcgtracking.com/`. These are third-party reported TCGPlayer
amounts; independent official SKU verification, commercial public-display
permission and currency guarantees remain open. Only private staging is enabled.

## Exact mapping

- Freeze existing active mappings and nonprovisional visible child printings.
- Supported domain/category/language tuples: MTG English paper/1/EN,
  Pokemon English physical/3/EN, One Piece English/68/EN, Pokemon Japanese/85/JP.
  Pocket, unknown domains, slabs and sealed products have no mapping lane here.
- Prefer exact `external_printing_mappings`. Normalize explicit Normal/normal,
  Foil/foil, Holofoil/holo, Reverse Holofoil/reverse hints; unknown never means Normal.
- An English Pokemon parent TCGPlayer mapping can select a child only with an
  active verified-visible truth review. Never use this fallback for MTG, where
  one product may map to different parents for Normal and Foil.
- Conflicting source-to-child mappings, multiple source products for one child,
  unsupported finishes and missing provider groups stay held.
- Provider data may select existing printings. It cannot create, restore,
  rename, delete, reclassify or change visibility of identities or mappings.

## Condition rules

Accept only NM/LP/MP/HP/DMG and the exact positive numeric supplied `mkt`.
Reject strings, zeroes, nulls, negatives, wrong languages and wrong finishes.
No percentages, interpolation, averaging, monotonic adjustment or condition
fallback. Preserve higher worse-condition amounts as evidence. Multiple SKUs
for one exact printing/condition/language are ambiguous, not an average.

Require a parseable set-level update time within 36 hours and at most five
minutes ahead. That timestamp does not prove a sale or per-SKU observation time.
The response has no currency field: retain `currency=null`, `currency_hint=USD`,
`currency_verified=false`. Stale groups yield no condition-price candidates.

## Storage and read boundary

The only production write is an append to existing private `public.raw_imports`:

- source `tcgtracking_condition_reference`
- status `tcgtracking_condition_staged`
- payload kind `condition_price_reference_group_v1`
- external identifier `<category_id>:<group_id>`
- unchanged upstream SKU objects for scoped language/finish targets (including
  missing prices), receipt/full-response hashes, mapping lineage and normalized
  rows; retain complete response bytes in the acquisition artifact, rather than
  copying unrelated or foreign-language provider datasets into production
- `pricing_lane=reference`, `app_visible=false`, `can_publish_price_directly=false`

An unexpected raw-import trigger blocks apply. Preserve service-role-only RLS.
Existing normalizers filter their own source/kind and `pending` status, so these
staged rows are outside their intake. Never grant raw receipts to clients.

The private backend reader takes bounded group and exact-condition requests.
Read the latest receipt; missing, stale and ambiguous prices remain unavailable.
This reader cannot replace the shared market pricing RPC or alter totals.

## Apply, replay and recovery

Prepare/fetch/replay are read-only against production. Apply requires the
repository acknowledgement plus exact plan, receipt and executing worker hashes.
Hold a source-specific PostgreSQL advisory lock. Reassert exact canonical child
and active mapping lineage within each group transaction. Same acquisition-key
retries reuse the raw row. Multiple existing rows for one key fail closed.

Persist apply receipts and independently read back through the shared backend
client. Verify row IDs, source/status, acquisition keys, normalized counts and
closed app visibility. Offline replay reconstructs normalization from hashed raw
responses. Partial intake is reported as partial, never as full success.

This path requires no migration. The historical canonical alias replay
prerequisite still blocks unrelated schema promotion; it is not bypassed.
Stopping intake preserves private receipts and needs no price-pointer rollback.
Do not delete history or restore older customer values as rollback.

Client display, recurring schedules, source licensing, a typed observation
schema and any Production V1.1 cutover require separate qualified changes.
