# Collectible Wave 1 Canonical Reconciliation V1

## Status

`COMPLETE - READ-ONLY RECONCILIATION WITH EXPECTED BLOCKERS`

The exact Yu-Gi-Oh and Gundam Parser Wave 1 artifact has been reconciled
against the production canonical database from an immutable default-branch
commit. All 46,259 candidates were preserved and classified exactly once. No
production game foundation currently exists for either candidate game, so all
rows correctly remain blocked and no promotion plan is authorized.

## Subsequent Gate

The aggregate-only 124-card alternative-artwork limitation recorded below was
resolved as source metadata addressability by
`2026-08-28_COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_V1.md`. The source
cards and stable source image IDs are now individually addressable, while the
artwork-to-printing mapping correctly remains unresolved. Historical statements
below describe the state at the time of this reconciliation proof.

## Context

Parser Wave 1 produced source-owned printing candidates without granting them
canonical authority. This gate had to establish whether each candidate already
mapped to Grookai identity, represented a new candidate, was ambiguous or
conflicting, or was blocked by missing canonical prerequisites.

The reconciler was deliberately built and reviewed before the production run.
It uses active `card_print_identity` coordinates as authority, active external
mappings as source evidence, game/set ownership boundaries, and legacy parent
fields only as a compatibility fallback when no complete active identity is
available.

## Frozen Input

- Parser workflow run: `33118951166`
- Parser artifact ID: `9665669509`
- Parser commit: `90afb4b7f33ff5b37c8c2183889bccae486b734b`
- Candidate artifact: `candidate_index.jsonl`
- Candidate count: `46,259`
- Candidate SHA-256:
  `30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f`
- Yu-Gi-Oh candidates: `44,443`
- Gundam candidates: `1,816`

The live workflow accepts no caller-provided artifact tuple. The run ID,
parser SHA, candidate count, and candidate hash are pinned in trusted code.

## Implementation

- Contract:
  `docs/contracts/COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_V1.md`
- Reconciliation module:
  `backend/catalog/collectible_wave1_canonical_reconciliation_v1.mjs`
- Read-only worker:
  `scripts/workers/collectible_wave1_canonical_reconciliation_v1.mjs`
- Manual workflow:
  `.github/workflows/collectible-wave1-canonical-reconciliation.yml`
- Pull request:
  `https://github.com/OriginalSoseji/grookai_vault/pull/276`
- Merge commit:
  `658e71924449f685cf1e2e97c7bea99e8f3137f5`

## Review Hardening

Before merge, automated review findings were repaired and regression-tested:

1. the parser artifact tuple is hard-pinned;
2. canonical rows are indexed rather than rescanned per candidate;
3. coordinate matching cannot cross game ownership;
4. missing game foundations remain blocker rows instead of aborting;
5. multiple matching sets are ambiguous;
6. the workflow is default-branch-only and checks out immutable `github.sha`;
7. cards are read only through matching game/set foundations;
8. inactive identities and mappings are excluded;
9. ambiguous and conflicting decisions count as blockers;
10. nullable parent collector numbers remain safely unmatchable;
11. active identity coordinates are authoritative over stale parent fields;
12. identity set-code aliases cannot cross-match sibling cards;
13. the database snapshot contains only candidate-game foundations.

The final automated review of commit `0617626ce2c42ae171f2178affa2077958a452c5`
reported no major issues.

## Validation

- Node syntax checks: passed.
- Targeted contract suites: `49/49` passed.
- Git diff check: passed.
- CodeQL: passed.
- Contracts drift gate: passed.
- Contracts runtime protection: passed.
- Legacy-key guard: passed.
- Vercel preview: passed.
- All pull-request review threads: resolved.

Adversarial coverage includes substituted artifacts, duplicate candidate IDs,
cross-game ownership, orphan sets, multiple set owners, inactive identity
history, active-identity precedence, numberless parent rows, set-code alias
cross-matches, rarity conflicts, source-mapping conflicts, and blocker-status
reporting.

## Default-Branch Production Proof

- Workflow run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33129873589`
- Workflow result: `success` in `47s`
- Immutable workflow SHA:
  `658e71924449f685cf1e2e97c7bea99e8f3137f5`
- Reconciliation artifact ID: `9669832253`
- Artifact name:
  `collectible-wave1-canonical-reconciliation-33129873589`
- Blocker issue:
  `https://github.com/OriginalSoseji/grookai_vault/issues/277`

Result:

- status: `completed_with_blockers`
- selected candidates: `46,259`
- reconciled candidates: `46,259`
- decision bucket total: `46,259`
- `blocked_missing_game_foundation`: `46,259`
- blocking decisions: `46,259`
- exact existing identity: `0`
- new candidate: `0`
- ambiguous candidate: `0`
- conflicting candidate: `0`
- missing candidate IDs: `0`
- unexpected candidate IDs: `0`
- duplicate source/output/bucket IDs: `0`
- source evidence hash drift: `0`
- authority leakage: `0`
- artifact hash mismatches: `0`

## Database And Security Proof

- Database access: `true`, read-only only.
- Database writes: `false`.
- Session `default_transaction_read_only`: `on`.
- Transaction `transaction_read_only`: `on`.
- Transaction isolation: repeatable read.
- Transaction ended with: `ROLLBACK`.
- Required columns: `25`; missing columns: `0`.
- Candidate-game foundations: `0`.
- Candidate-game sets: `0`.
- Candidate-game cards: `0`.
- Candidate-only snapshot SHA-256:
  `df37d6defa34ab03cd4835d1f63e06214724c80b3a886069c3c9f3ef11f397ab`
- SSL transport: encrypted with libpq-compatible `require` semantics.
- Certificate-authority verification: not configured for the existing local and
  workflow connection secret. This remains explicit operational debt; it did
  not grant write authority or weaken transaction read-only enforcement.

Every boundary remained `false`: database writes, Storage access/writes, image
access, pricing access, canonical writes, publication writes, Vault access, and
writer dispatches.

## Permanent Artifact Hashes

- `run_plan.json`:
  `f14fc8902d4ce2469ff2da5a7079613b7d3db261b2e8b17f87785a2ffa904a98`
- `reconciliation_index.jsonl`:
  `e60b82a612852162341af8785acd0d1a1779b96d354dd04aef64eb942fc0ca0d`
- `blocked_candidates.jsonl`:
  `e60b82a612852162341af8785acd0d1a1779b96d354dd04aef64eb942fc0ca0d`
- Empty decision artifacts:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `artifact_limitations.json`:
  `f5e4cc3eb189b6b6e1dc930422ac02a935e5f303160f6b0d861b304f91d51e7d`
- `database_snapshot_summary.json`:
  `d4b453a943ad7b2f7a6778d53603af6e9f794085df29abf6def78e901b4359c1`
- `summary.json`:
  `2467826467f3a2e58b04ac98d6b7ac445b11bc6d3021cb1cf99205611152ff02`

The downloaded artifact was independently re-read after the workflow. Source,
output, and bucket IDs reconciled exactly and every manifest byte count and
SHA-256 matched.

## Artifact Limitation

The source parser reports `124` Yu-Gi-Oh alternative-artwork cases only as an
aggregate count. It does not identify the affected candidate rows. The
reconciliation therefore records:

- limitation: `unresolved_alternative_artwork_scope_not_row_addressable`
- aggregate source count: `124`
- row-addressable count: `0`
- decision: preserve the aggregate and block promotion until a metadata-only
  parser refinement produces source-ID-addressable evidence.

No model inference, image comparison, or guessed row assignment is permitted.

## Current Truths

1. The exact 46,259-row Wave 1 artifact is structurally sound and completely
   reconciled as evidence.
2. Production currently has no Yu-Gi-Oh or Gundam game foundation, so no row
   can lawfully be classified as existing or new within canonical identity.
3. Every candidate remains noncanonical and blocked; issue 277 is the durable
   operational signal.
4. This gate performed no mutation and authorized no future mutation.
5. The matching engine is ready for a future rerun after independently
   governed game foundations exist.
6. The 124 alternative-artwork cases are not row-addressable and cannot be
   promoted or guessed.
7. Parser source gaps documented in the prior checkpoint remain open.

## Invariants

1. Source evidence never becomes canonical identity by implication.
2. Identity never crosses game or set ownership.
3. Active identity coordinates outrank legacy parent compatibility fields.
4. Active source mappings are evidence, not write authorization.
5. Missing foundations, ambiguity, and conflict always remain blockers.
6. Every candidate must appear exactly once in reconciliation output.
7. All permanent artifacts must reconcile by count, ID, byte size, and hash.
8. This workflow must remain default-branch-only, immutable-SHA, read-only, and
   rollback-ended.
9. No parser refinement may invent alternative-artwork row assignments.
10. Database, Storage, image, pricing, publication, and Vault writes require
    separate explicit contracts and gates.

## What Must Never Be Broken

- Do not treat issue 277 as permission to create canonical rows.
- Do not add Yu-Gi-Oh or Gundam rows under another game's foundation.
- Do not re-enable caller-selected parser artifacts or branch execution.
- Do not use inactive identity or mapping history as current truth.
- Do not let parent name/number fields override complete active identities.
- Do not close the blocker issue while missing foundations, ambiguity,
  conflict, or artifact limitations remain.
- Do not add images, prices, rules text, or publication state to this evidence
  gate.

## Explicit Next Gate

First, build a metadata-only Parser Wave 1 refinement that makes the 124
alternative-artwork cases source-ID-addressable and rerun the same artifact
validation without production writes. In parallel or afterward, define a
separate, bounded Yu-Gi-Oh and Gundam game-foundation contract and dry-run its
exact rows. Only after those foundations are independently reviewed and applied
may this read-only reconciliation be rerun to produce meaningful existing/new/
ambiguous/conflicting buckets. Stop before any card, set, printing, mapping,
image, pricing, publication, or Vault write.
