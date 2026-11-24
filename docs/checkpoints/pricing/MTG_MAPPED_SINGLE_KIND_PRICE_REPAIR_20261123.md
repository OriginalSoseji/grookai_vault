# MTG mapped single-card price repair — November 23, 2026

Source-only candidate in `C:/grookai_mtg_kind_price_recovery_20261123`, branch
`codex/mtg-kind-price-recovery-20261123`. Preserve qualified pricing PR1029 at
f1c600caab9a72f858dee0d03222453790408102 and the separate catalog521 preview.
This candidate starts from their exact lossless union tree
f0bec1fafd08dcd1cda3edb745802b6bad5f7e47 and adds the closed MTG correction.
Catalog index521 is an unaccepted dependency; reconcile the actually accepted
source/schema and respect the shared merge pause before any release.

A complete hashed census of the retained 249657-decision V1_27 shadow found
38 positive MTG rows with exact parent/child mappings withheld solely for product
kind. It also found the four already repaired Japanese cases and separately
governed English special variants. This census is historical diagnostic evidence,
not current app coverage or a new runtime shadow. No old shadow was relabeled.

Verified-TLS repeatable-read/read-only production reads captured all 38 products,
original pipeline candidates, canonical printings and current exact mappings.
All 38 original retained Scryfall source bodies were separately retrieved and
hashed. Original IDs/names/set/numbers/type/layout/English paper status/finishes
matched the existing verified source metadata and exact canonical records.
The new registry contains identity, product-kind and provenance facts only;
real Market amounts are preserved from each current source observation.

Forty-four focused new tests passed: all 38 positive identity/finish cases,
adversarial mappings/source/type checks, real-price/integrity/freshness holds,
unaffected games/finishes, harmless-title evasion, unchanged Japanese admissions
and current worker/full-scope gate linkage. Existing current-worker assertions
advance to V1_30 without removing assertions. The combined 28-file catalog,
Play, Japanese, Magic, condition and reconciliation run passed all 299 tests with
zero skips. All 38 actual retained source candidates also passed through the new
evaluator and actual worker serializer, preserving their exact Market amounts,
source observation/row/artifact lineage, child and existing V1_3 policy lineage.
A synthetic unit fixture is not source-price proof.

The initial read-only live 38-row candidate query timed out at its unchanged
30-second diagnostic limit. The separate fixed four-row probe also timed out;
both failed receipts are retained and no successful live candidate probe is
claimed. Smaller probes cannot clear that timing or substitute for full worker30
shadow, runtime, normal/hosted or production qualification. The candidate SQL is
unchanged by this kind correction. No timeout, release threshold or assertion
was relaxed.

Private evidence is retained under
`C:/grookai_vault_operator_artifacts/play_stamp_normal_market_scope_fix_20261123`:
`retained-all-category-price-holds-v1.json`, `mtg-mapped-kind-holds-v1.json`,
`mtg-kind-exact-mapping-proofs-v1.json` and `mtg-kind-original-source-bodies-v1.json`.
This candidate imports no user/Auth fixtures and performs no production writes.

Follow [the contract](../../contracts/GOVERNED_MTG_MAPPED_SINGLE_KIND_V1.md).
Freeze the new JSON/resolver/evaluator and full runtime closure, not only the
entrypoint. Require worker30's own unlimited shadow and all normal guarded
publication/readback/app/natural refresh gates; old worker28/29 operators,
exact519/520 plans and earlier permissions cannot execute this changed runtime.
