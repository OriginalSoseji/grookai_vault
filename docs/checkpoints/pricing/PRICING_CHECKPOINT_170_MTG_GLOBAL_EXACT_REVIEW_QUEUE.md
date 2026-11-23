# Pricing Checkpoint 170: MTG Global Exact Review Queue

## Status

`IMPLEMENTED - READ-ONLY RELEASE CANDIDATE`

## Problem

The hosted pricing completion agent and local Ollama consumer were healthy but
stopped at measurement and advisory triage. Three hosted snapshots across
nearly six hours were identical at 249,612 selected observations, 187,246
published observations, 62,366 non-published observations, and a 55,889-row
identity-mapping backlog. The current local input completed 1,250 model calls
with zero errors and yielded 1,185 collision-free review leads, but no governed
bulk producer advanced those leads into review packages.

The existing qualifier producer admitted only unique TCGPlayer-group-to-set
consensus. Most current exact MTG leads use a global catalog search because the
source group does not yet provide one unique set authority. That conservative
hold was correct, but it left exact name-and-number evidence unconsumed.

## Repair

`backend/pricing/mtg_tcgplayer_global_exact_review_queue_v1.mjs` adds a
deterministic read-only admission policy for the narrow global-search lane.
Every admitted row must prove all of the following:

- the row survived batch target-collision reconciliation;
- the target is in `mtg_eng_paper_print` with one active standard identity;
- the target has zero active TCGPlayer mappings;
- the source and canonical printed numbers normalize to the same non-empty
  coordinate;
- the canonical name is one of the independently recomputed source search
  names;
- the enriched global search discovered exactly one eligible target;
- the advisory lead is bound to that target at confidence 0.99 with
  `unique_field_alignment`;
- the target retains the canonical Scryfall parent-key shape; and
- the upstream enrichment remains explicitly read-only with no mapping or
  publication authority.

The producer holds every ambiguity and deduplicates both source products and
targets across the complete input. It sorts the admitted rows deterministically
and emits founder-review batches of no more than 50 rows, preserving the active
V6 review limit.

Each review row carries the readable target set name as well as its set ID and
code, the exact source group and printed coordinate, normalized name evidence,
current identity and mapping counts, candidate-pool result, group-consensus
diagnostics, and model reason code. The batch manifest binds these
review-critical fields, not only the proposed source-to-target IDs. This keeps
cross-set false positives visible to the founder before any outcome exists.

The continuous V2 runner now invokes this producer after reconciliation. On an
unchanged completed input, it backfills a missing review package before taking
the normal no-op path. This closes the repeated-measurement gap without adding
database credentials or a writer to the local Ollama task.

Queue reuse is fail-closed. The producer writes every review artifact and its
hash manifest before writing `COMPLETE_V1.json` as the final package file. The
runner rebuilds the expected package from the exact input and source commit,
verifies every byte, the complete file inventory, and the completion marker,
and only then reuses it. A missing marker, partial write, altered artifact, or
unexpected file causes the generated queue directory to be removed and rebuilt
from the unchanged source evidence. The presence of `summary.json` alone is
never completion evidence.

## Current-input proof

The read-only producer was run against local input SHA-256
`b53d2c688ab52f71a52f2ed8c5bc435fd9791356eae97956ae7618f89510e763`,
derived from hosted pricing completion run `45074771689` at source commit
`5d0915f14b9ac7f2ab63f69f3393560ebff4bab9`.

- input review leads: 1,185;
- admitted exact MTG review rows: 1,062;
- held rows: 123;
- founder-review batches: 22 (21 × 50 and 1 × 12);
- projected price observations: 1,063;
- full manifest SHA-256:
  `fb5db258cfc1feb5881470e6279b4c364cb2203a917a02de57c74e0db4a3413f`;
- verified package artifacts: 48 source-bound review artifacts plus the hash
  manifest and final completion marker;
- holds: 51 non-unique global searches, 43 non-MTG rows, and 29 weak or
  non-exactly-bound model leads.

The first 50-row batch now has manifest SHA-256
`80e441256015b01b002e63612cc0e1b5fe8e2b44d4664534fae0fdb6bdc1bdc9`.
Its readable evidence exposed one cross-set risk before review: TCGPlayer
product `58205`, `Mountain (The Izzet League)`, points at target set `sum`,
`Summer Magic / Edgar`. That row remains unapproved and must be held unless a
separate exact set authority proves the proposed target. The other 49 rows are
also still review evidence, not approved mappings.

The founder subsequently approved a conservative partition bound to decision
fingerprint
`97cca525c64f868da34019e0f9713d38e17b62e8280af92e32588adb8697d087`:
36 Commander Legends rows whose readable target and group-consensus set codes
match were accepted for a separate mapping-outcome preflight; 13 promo-context
rows remain held; and product `58205` was rejected. This approval grants no
mapping or pricing authority.

`scripts/audits/mtg_tcgplayer_global_exact_mapping_preflight_v1.mjs` consumes
that exact approval and the content-addressed batch. It performs two independent
repeatable-read, read-only production transactions and fails closed on source,
identity, price-lane, target, or mapping drift. The preflight contains no insert,
update, delete, commit, mapping, pricing, publication, canonical, or Vault write
path. A successful receipt still requires a separate exact founder approval
before any insert-only executor may be considered. That approval was granted
for source commit `bb923161c47d582334a564894436802ab7b5df9a`, preflight
fingerprint
`f0b5a8df70331fbc4317125ca53a3c133614739d86603fbe286d1464d0697b7c`,
and the exact 36-row scope. The one-time executor binds the approved preflight
and selected-row artifact bytes before opening a database connection, then
revalidates all source, target, identity, price-lane, and collision state inside
one serializable transaction. It permits only insertions into
`public.external_mappings`, captures rollback identities before commit, and
requires an independent zero-mismatch readback.

The original queue proof wrote only temporary local artifacts and performed no
database read or write. The later mapping-outcome preflight performed only two
repeatable-read, read-only production transactions and wrote local evidence;
it did not change mappings, prices, publication pointers, canonical identity,
Vault data, or customer state.

## Boundaries and next gate

This checkpoint creates review evidence, not production authority. Each batch
still requires founder review, a separate mapping-outcome preflight, a second
founder approval, an insert-only executor, transactional current-state
revalidation, and durable readback. Pricing remains a later full shadow and
guarded production publication after mappings reconcile.
