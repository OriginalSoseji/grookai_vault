# INGESTION_PIPELINE_CONTRACT_V1

Status: Active
Date: 2026-07-22

## Purpose

This contract governs every external-data path that can eventually affect Grookai canon. It makes source intake replayable and prevents catalog, variant, pricing, or marketplace fields from manufacturing a physical printing.

This contract does not authorize a database write, migration, deployment, or destructive cleanup.

## Authority

The following stricter contracts remain binding:

- `PRINTING_TRUTH_CONTRACT_V1`
- `VERIFIED_MASTER_SET_INDEX_V1`
- `ENGLISH_MASTER_INDEX_COMPLETION_V1`
- `MASTER_INDEX_GOVERNANCE_CONTRACT_V1`
- frozen printed-identity and canonical-identity contracts

If a source adapter, price feed, or staging row conflicts with governed printing truth, governed printing truth wins and the lower-authority row remains evidence only.

## Required Lifecycle

Canon-bound external data must pass these stages in order:

1. raw receipt with the unmodified provider payload
2. deterministic normalization
3. mapping and conflict classification
4. Master Index and printing-truth gate
5. review or non-canonical staging
6. bounded mutation plan
7. immediate pre-commit assertion
8. atomic apply under a separately approved write package
9. exact database readback and rollback proof

No stage may be skipped. Raw receipt, normalization, provider agreement, or a price-bearing field does not authorize canon mutation.

## Authority Separation

Catalog truth and market evidence are separate domains:

- catalog/checklist evidence may propose a physical printing fact;
- market or pricing evidence may classify or price an already-governed printing;
- a price key, price bucket, product taxonomy, listing title, or inferred provider variant must never create, restore, delete, or rename a `card_printings` row;
- when the governed child printing does not exist, pricing evidence remains unmatched or review-only.

The source transport shape is not printing truth. A field being named `normal`, `holo`, `reverse`, or similar is only a source hint until the exact physical fact passes the printing-truth gate.

`normal` means an explicitly proven physical Normal or non-holo printing. It must never be inferred from an absent finish token, an unqualified rarity, `raw`, `ungraded`, a generic product row, or "not otherwise holo." Unqualified CardTrader blueprint rows normalize to unknown/manual review and emit no finish-truth evidence. Previously generated unqualified CardTrader Normal fixtures remain preserved on disk and load only as exact card/source evidence with unknown finish; they are excluded from working printing truth.

## Canonical Printing Truth Manifest

Before any plan can insert, update the identity of, or delete a canonical child printing, the target set must have a checked-in, source-backed truth manifest containing:

```text
set_key
expected_parent_count
expected_printing_count
expected_finish_counts
suppressed_printing_facts
protected_printing_facts
source_evidence_refs
contract_version
```

Rules:

- counts must be exact non-negative integers; unknown or `null` counts block apply;
- the sum of `expected_finish_counts` must equal `expected_printing_count`;
- every printing identity is the exact tuple `set + card number + card name + finish_key`;
- suppression and protected-exception lists must be explicit, even when empty;
- each suppression or exception must retain its evidence and reason;
- the plan must contain no duplicate exact printing identities;
- only facts admitted by the governed Master Index may enter a child-printing mutation plan.

## Source Semantic Precedence

When source shapes disagree, resolution is deterministic:

1. exact official, human-readable, or governed checklist evidence admitted by `PRINTING_TRUTH_CONTRACT_V1`;
2. the governed Master Index exact printing fact;
3. explicit provider card-level variant metadata, for evidence classification only;
4. an explicit finish suffix on a price metric, for evidence classification only;
5. an unsuffixed or ambiguous provider metric, which remains a review-only compatibility hint.

Items 3 through 5 never authorize a canonical child printing by themselves.

## TCGdex Cardmarket Normalization Rule

For TCGdex Cardmarket price metrics:

- an explicit `-<finish>` metric suffix is preserved as the evidence finish hint;
- an unsuffixed metric resolves to `holo` only when the same raw card payload explicitly has `variants.holo === true` and `variants.normal === false`;
- missing, partial, both-true, both-false, or otherwise ambiguous variant metadata retains the legacy `normal` evidence hint and remains review-gated;
- the raw metric key, raw variant flags, raw snapshot reference, and resolver version must be preserved.

This normalization rule only classifies market evidence or selects an existing verified child. It cannot prove or create a Normal or Holo printing.

## Two-Gate Mutation Rule

Every canonical child-printing mutation package must run the same truth assertion twice:

### Plan gate

Before a write plan is emitted, assert:

- exact parent count;
- exact total printing count;
- exact counts by finish;
- zero duplicate exact printing identities;
- zero suppressed or otherwise forbidden facts;
- all protected facts remain present;
- zero unresolved conflicts.

### Pre-commit gate

Inside the same transaction, immediately before mutation or commit, recompute and assert the same invariants against the pinned plan and current target state. Any drift rolls back the transaction.

The post-commit readback must prove the same invariant set and must include the plan hash, contract hash, affected-row counts, and a tested rollback artifact.

## ME04 Chaos Rising Non-Regression Profile

The checked-in ME04 profile is a permanent regression fixture for this failure mode:

```text
set_key: me04
expected_parent_count: 122
expected_printing_count: 202
expected_finish_counts:
  normal: 68
  reverse: 76
  holo: 58
historical_false_normal_suppressions: 45
```

Binding details:

- the exact 45 historical false Normal identities come from `docs/audits/verified_master_set_index_v1/source_fixtures/generated_me04_finish_governance_v1/me04.json`;
- the valid Build & Battle Normal printings `013`, `029`, `051`, and `068` are protected;
- `109 Jumbo Ice Cream` is Holo-only and a Normal fact is forbidden;
- any ME04 plan that does not resolve to `122 / 202 / 68 normal / 76 reverse / 58 holo` must fail before writing.

The executable profile and assertions live in `scripts/audits/me04_finish_truth_v1.mjs`. The Master Index build, publishable build, completion package, and child-insertion package must all consume that shared assertion.

## Required Enforcement Points

- `scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs`
- `scripts/audits/english_master_index_cardtrader_finish_acquisition_v1.mjs`
- `scripts/audits/english_master_index_cardtrader_normal_containment_v1.mjs`
- `scripts/audits/verified_master_set_index_v1/source_adapters/human_fixtures.mjs`
- `scripts/audits/english_master_index_publishable_v1_build.mjs`
- `scripts/audits/english_master_index_chaos_rising_completion_package_v1.mjs`
- `scripts/audits/english_master_index_pkg04a_chaos_rising_child_printing_completion_v1.mjs`
- `backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs`
- `scripts/audits/market_reference_tcgdex_pricing_backfill_apply_v1.mjs`
- `docs/sql/mee_variant_assignment_v1_backfill.sql`
- `scripts/ingest/new_set_release_ingest_v1.mjs`

Any future worker that can mutate `card_printings` must register an equivalent manifest assertion and pre-commit gate before it becomes an active ingestion path.

## Stop Conditions

Stop before any canonical write when:

- a truth manifest or required count is missing;
- exact finish evidence is unresolved;
- expected counts or finish distribution drift;
- a suppressed or forbidden fact appears;
- a protected fact disappears;
- a pricing-only signal is the proposed proof for a printing;
- the plan has duplicate identities or unresolved source conflicts;
- the pre-commit state differs from the pinned plan;
- rollback or post-write readback cannot be produced.

## Forbidden Behavior

- direct provider-to-canon writes
- default-finish child creation
- price-key-to-printing promotion
- set-wide or era-wide finish inference
- reintroducing a suppressed fact during rebuild
- treating a successful apply as complete without exact readback
- weakening a set profile to make a plan pass

## Success Definition

An ingestion is complete only when raw evidence is preserved, the governed truth manifest passes both gates, the bounded write is separately authorized, and exact readback proves that no unsupported printing entered canon.
