# Card Visual Search Private Release Load V2

Status: PREPARED; HUMAN CALIBRATION REQUIRED BEFORE DATABASE APPLY

## Purpose

Move the frozen zero-AI visual-search release from immutable local artifacts to
a private, service-only production canary without changing the paid Fact
Graphs, canonical identity, or public search.

This runbook is an execution order, not authority to apply the migration, load
the release, or activate it.

## Frozen Inputs

- Branch: `agent/visual-search-lab-runtime-fix`
- Packet-builder commit:
  `9d2e6dd91fd567762aa4e1dddf9c5457d44dceb1`
- Release-producing commit:
  `1d82cfd0830cf0d64e6eaf4308f5eb17829c9d82`
- Release key: `card_visual_search_v2_240c7f4885b2c9ef`
- Release directory:
  `C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\2026-07-30T15-22-40-652Z_release_240c7f4885b2`
- Load plan: `load_plan.json` in the release directory
- Migration:
  `supabase/migrations/20260729173000_card_visual_search_persistence_v1.sql`
- Migration SHA-256:
  `cf63fb40dffefd46b1e4da7fb72f83db457573561c07d9b09c38c7c56eafe6b1`
- Calibration packet:
  `C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\reviewer_packet\2026-07-30T15-29-41-063Z_packet_03d35aae5757`

## Current Boundaries

- Migration: unapplied
- Release rows loaded: zero
- Active visual-search pointer: absent
- Provider calls for this build: zero
- Additional AI cost for the existing corpus: `$0`
- Embeddings: zero
- Database writes from this build: zero
- Holdout: sealed and unexecuted
- Public and anonymous visual search: disabled

## Human Gate

Do not apply the migration until all of the following are complete:

1. PokeJavi finishes the primary review of all 200 calibration queries.
2. His existing partial submission is archived unchanged.
3. A partial judgment may be carried forward only when the query, artwork,
   image SHA-256, result semantics, packet version, and result identity still
   match exactly.
4. A second reviewer completes the difficult families: subject role,
   multi-subject, object/count, representation/cameo, aliases,
   printing-expansion, and negative/zero-result.
5. Every disagreement is adjudicated.
6. Official calibration metrics are computed from reconciled human gold.
7. Release thresholds are written and frozen.
8. The 50-query holdout is executed exactly once against the frozen candidate.
9. The holdout satisfies the frozen thresholds and every high-risk invariant.

Source-derived bootstrap labels are not human gold and cannot satisfy this gate.

## Migration Gate

Migration apply is a separate authorized operation after holdout acceptance.

Before apply:

1. Verify the migration file hash matches the frozen SHA-256.
2. Run the visual-search persistence contracts.
3. Run the repository migration/RLS smoke checks in the governed environment
   with `SUPABASE_DB_URL`.
4. Capture the pre-apply schema, grants, RLS policies, functions, and active
   pointer state.
5. Confirm the active pointer is absent.

After apply, read back and preserve:

- all visual-search tables;
- primary and foreign keys;
- immutable-release triggers;
- RLS enabled status and policies;
- table and function grants;
- service-only search RPC signatures;
- authenticated correction-staging RPC;
- zero active-pointer rows;
- zero release data rows before load.

The migration itself must not load data or activate a release.

## Staged Load Gate

Load only release `card_visual_search_v2_240c7f4885b2c9ef` and follow the
frozen `load_plan.json`.

Required load order:

1. Create one `staged` release ledger row.
2. Load the six-row, hash-pinned `external_source_registry.jsonl`.
3. Load `9,532` artworks.
4. Load `9,702` printings.
5. Load `38,128` documents.
6. Load `392,050` source evidence rows.
7. Load one evidence suppression.
8. Load `2,329` external candidates into review-only staging.
9. Load `30` governed external assertions.
10. Load `886,245` deterministic index entries.
11. Reconcile all rows and references.
12. Run service-only RPC smoke tests with no active pointer.
13. Mark the release `validated` only after all checks pass.

Use bounded transactions and resumable chunks. A failed chunk must roll back
without changing an already reconciled chunk or activating the release.

## Required Reconciliation

The staged load is invalid unless all checks equal their frozen expectation:

- release rows: `1`
- source candidates accounted: `11,000`
- artwork rows: `9,532`
- printing rows: `9,702`
- coverage gaps retained outside searchable rows: `1,298`
- document rows: `38,128`
- source evidence rows: `392,050`
- searchable evidence after suppression: `392,046`
- evidence suppressions: `1`
- deterministic TCG concepts: `34,622`
- governed external sources: `6`
- external candidates: `2,329`
- external assertions: `30`
- index entries: `886,245`
- Energy rows: `0`
- duplicate primary keys: `0`
- missing foreign keys: `0`
- missing evidence references: `0`
- unresolved suppressions: `0`
- source hash mismatches: `0`
- active pointer rows: `0`
- RPC-visible results before activation: `0`

The release artifact manifest and every input hash must be verified again
immediately before loading.

## Private RPC Proof

Before activation:

- `get_card_visual_search_candidates_service_v1` must reject public,
  `anon`, and `authenticated` callers.
- `get_card_visual_search_groups_service_v1` must reject public,
  `anon`, and `authenticated` callers.
- Both service-role RPCs must return no active search data while the active
  pointer is absent.
- Candidate and hydration responses must preserve evidence authority,
  appearance role, document type, artwork identity, and printing expansion.
- The authenticated correction RPC may write only bounded correction staging.

## Activation Gate

Activation is a third, separately authorized database operation.

1. Record the current active pointer state.
2. Set the pointer to the validated release in one atomic transaction.
3. Enable only the signed-in beta feature flag.
4. Keep canonical search as the fallback.
5. Smoke-test the 12 high-risk queries and the human-approved calibration
   probes against the production adapter.
6. Verify evidence panels use self-hosted images and expose no service secret.
7. Monitor latency, zero-result rate, relaxation clicks, correction reports,
   role confusion, canonical fallback, and server errors.
8. Roll back by restoring or removing the active pointer and disabling the
   feature flag.

Anonymous/public activation is not part of this runbook.

## Embeddings

Embeddings are not required for this release. Structured and lexical search is
functional without them. Any embedding model, cost, vector schema, or hybrid
ranking experiment requires a separate approval and cannot charge the existing
10k corpus under this build.

## Stop Conditions

Stop immediately on:

- hash or count mismatch;
- missing or duplicate identity;
- Energy leakage;
- candidate evidence reaching active results;
- unresolved appearance-role ambiguity;
- public/authenticated access to service-only tables or RPCs;
- an active pointer appearing before the activation gate;
- human calibration or holdout failure;
- any proposal to rerun Vision for the existing 10k.

## Rollback Evidence

Every apply, load, validation, and activation operation must preserve:

- command metadata with secrets excluded;
- pre/post schema and security readbacks;
- transaction and chunk results;
- row counts and artifact hashes;
- active-pointer history;
- smoke-test output;
- rollback command and result;
- final checkpoint.
