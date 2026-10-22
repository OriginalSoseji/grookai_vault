# Pricing Checkpoint 169: MTG Ambiguous Parent Review Queue

## Status

`IMPLEMENTED - HOSTED RUNTIME RECEIPT PENDING`

## Live baseline

The governed parent-mapping plan from workflow run `39857995081` found 1,084
single-parent MTG products and 1,184 products whose exact Normal/Foil printing
mappings point to more than one canonical parent. Rollback run `39858301228`
verified the 1,084-row transaction, and production run `39858674255` applied and
read back all 1,084 rows without changing Pokemon or other external mappings.

The generic catalog candidate search cannot represent the remaining 1,184
products. Its first production receipt, workflow run `39857628507`, correctly
emitted zero MTG candidates because these products require a choice between the
parents already named by exact printing evidence.

## Repair

Hosted candidate enrichment now reads the ambiguous products from
`v_mtg_tcgplayer_parent_mapping_candidates_v1` and reconstructs each bounded
parent set from active `tcgplayer_market` printing mappings. It attaches canonical
name, number, set, identity, and existing-mapping facts for only those parents.

One-parent evidence stays on the deterministic parent-mapping lane. Two or more
parents enter the local Ollama review queue. The generic catalog search remains
the fallback for products that do not have an ambiguous exact-printing set.

## Boundaries

- The hosted transaction is repeatable-read and read-only.
- Exact printing mappings define the candidate boundary; the model cannot add a
  target outside that boundary.
- Ollama output is advisory and cannot write mappings, canonical identity,
  prices, publication state, or customer state.
- Reconciled leads remain review evidence. Any mapping apply and later pricing
  publication must use their existing governed release paths.

## Verification gate

After merge, dispatch the pricing-completion workflow from the exact merged
commit. Require a nonzero MTG exact-printing candidate count, reconcile the
combined and per-category hashes, then run the local V2 consumer and retain its
zero-error receipt. Do not replace the Windows task action until both receipts
pass.
