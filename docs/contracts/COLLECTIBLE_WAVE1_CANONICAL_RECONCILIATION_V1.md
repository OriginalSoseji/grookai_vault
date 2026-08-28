# Collectible Wave 1 Canonical Reconciliation V1

## Status

`BOUNDED READ-ONLY CANARY`

## Objective

Compare the exact immutable Parser Wave 1 Yu-Gi-Oh and Gundam candidate artifact
with current Grookai canonical identity without granting canonical authority or
writing any production state.

## Frozen Input

The live canary is bound to:

- parser workflow run `33118951166`;
- parser artifact ID `9665669509`;
- parser default-branch SHA
  `90afb4b7f33ff5b37c8c2183889bccae486b734b`;
- candidate count `46,259`;
- `candidate_index.jsonl` SHA-256
  `30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f`.

Every parser artifact listed by `artifact_hashes.json` must reconcile before a
database connection is opened. Failed parser sources, parser validation
failures, candidate-count drift, duplicate IDs, or a candidate hash mismatch
stop the run.

The live worker and workflow hard-pin this tuple. Workflow dispatchers cannot
substitute a run ID, artifact name, source commit, candidate count, or candidate
hash. The secret-backed job runs only when dispatched from the repository's
default branch, checks out the immutable dispatch SHA, and verifies that exact
SHA before database access.

## Database Boundary

The database session must:

1. request encrypted SSL transport with explicit libpq-compatible `require`
   semantics; the existing connection does not supply a project CA, so the
   artifact must record that CA verification is not configured;
2. set `default_transaction_read_only=on` at connection start;
3. set a bounded statement timeout;
4. begin a repeatable-read, read-only transaction;
5. prove session and transaction read-only state;
6. verify required schema columns;
7. read only candidate-game foundations, sets, cards, active identities, and
   external mappings;
8. end with `ROLLBACK`;
9. close the connection.

The worker contains no SQL mutation, Supabase Storage client, writer import, or
downstream dispatch path.

## Classification Order

Each candidate receives exactly one primary decision:

1. `blocked_missing_game_foundation`
   - No matching canonical game exists.
   - The candidate is not treated as a cross-game name or number match.
2. `exact_existing_identity`
   - One active source mapping and matching coordinates, or one exact
     game/set/number/name/rarity coordinate owner.
   - Active `card_print_identity` coordinates are authoritative. Legacy parent
     card fields are a compatibility fallback only when no complete active
     identity coordinate exists.
3. `ambiguous_candidate`
   - Multiple game foundations, source-mapping owners, sets, or canonical
     coordinate owners could satisfy the claim.
4. `conflicting_candidate`
   - A source mapping disagrees with coordinates, a canonical number belongs to
     another name, or rarity conflicts with an otherwise occupied identity.
5. `new_candidate`
   - The game foundation exists but the set or card identity does not.

Name-only similarity never proves a match. Identity never crosses game
boundaries. Missing canonical prerequisites never become invented rows.

## Variant Limitation

The frozen Parser Wave 1 artifact preserves 124 Yu-Gi-Oh alternative-artwork
cases as an aggregate completeness count, not row-addressable candidate facts.
The reconciler must preserve that limitation explicitly. It may not guess which
printing rows use alternative artwork. Row-level promotion remains blocked
until a metadata-only parser refinement produces source-ID-addressable variant
evidence.

Future candidates may carry row-level `variant_evidence`. That evidence is an
overlay on the primary decision and never grants canonical authority.

## Required Artifacts

- `run_plan.json`
- `reconciliation_index.jsonl`
- `exact_existing_identity.jsonl`
- `new_candidates.jsonl`
- `ambiguous_candidates.jsonl`
- `conflicting_candidates.jsonl`
- `blocked_candidates.jsonl`
- `unresolved_variants.jsonl`
- `artifact_limitations.json`
- `database_snapshot_summary.json`
- `summary.json`
- `artifact_hashes.json`

The primary bucket counts must sum exactly to the selected candidate count.
Every selected candidate ID must appear exactly once in
`reconciliation_index.jsonl`. Every output except the hash manifest must have a
recorded SHA-256 that matches independent readback.

## Invariants

- `canonical_authority` remains `false` on every output row.
- `write_authority` remains `false` on every output row.
- No database, Storage, image, pricing, publication, or Vault write occurs.
- No game foundation is inferred from a source candidate.
- No candidate is silently dropped, duplicated, substituted, or regenerated.
- Source evidence hashes survive reconciliation unchanged.
- Aggregate unresolved-variant evidence is not misrepresented as row-level
  certainty.

## Stop Condition

Stop after one exact-artifact, default-branch, production read-only canary and
artifact reconciliation. Do not create game foundations, sets, cards,
identities, mappings, images, prices, publication state, or Vault rows.
