# CARD_VISUAL_FACT_GRAPH_V2_ARTIFACT_APPLY_25_20260720

Status: COMPLETE

Date: 2026-07-20

## Context

Fact Graph V2 completed a reconciled 500-card non-Energy harvest with `482` validated rows and `18` quarantined failures. The next approved gate was to prove that already-paid validated artifact rows could be imported without regeneration, provider calls, approvals, embeddings, or canonical identity writes.

## Problem

The existing `--apply` path generated and persisted rows in one operation. Reusing validated harvest artifacts through that path would have repeated paid model calls and weakened provenance. The project needed a separate, idempotent artifact-to-database path.

## Risk

An importer could accept altered artifacts, exceed the bounded scope, include Energy cards, overwrite an approved current row, detach a row from its canonical image, approve or embed generated intelligence, partially commit a batch, or fail to reconcile stored payloads with source evidence.

## Decision

Add `CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_V1` with separate plan and apply phases. Freeze exact source hashes, canonical readback, selected IDs, source-row hashes, telemetry, branch/status counts, and code SHA before applying. Limit the importer to `25` rows, use one transaction, reject state drift, and immediately replay the same plan to prove idempotency.

## Alternatives Rejected

- Regenerate the same cards with `--apply`: rejected because it would add cost and model variability.
- Apply all `482` valid harvest rows immediately: rejected because the artifact import path needed a bounded proof first.
- Auto-approve pending rows: rejected because visual facts remain derived intelligence.
- Generate embeddings or expose public reads: rejected as separate downstream gates.
- Overwrite an approved current row: prohibited.
- Add a schema migration: unnecessary for this gate.

## Migration Applied

No new migration was created or applied. The existing migration `supabase/migrations/20260715120000_card_visual_description_agent_v1.sql` is present in the remote migration ledger and remains the active private storage contract.

## Prior One-Card Apply Proof

The earlier real OpenAI-backed one-card proof for `GV-PK-JPN-M5-113` remains valid. This gate adds a different proof: `25` previously generated Fact Graph V2 artifacts were imported with zero provider calls and exact database readback.

## Apply Proof

- Producing commit: `7e4eacb32a4c2ce5c2c0cdf60e58f2971ff669a4`
- Branch: `feature/card-visual-description-agent`
- Run ID: `f2033f7a-d158-4b92-b8a0-91742dd03957`
- Run key: `2d701657cb8e610df09c2d3779742978d8d244cdb48b9bc18c0ab1ede8121f15`
- Source manifest SHA-256: `6a80d724cd0b18ccec0378af4efbc4b7f89009cf328210a9349fef693fa839fd`
- Run plan SHA-256: `81373e81fad39ed39cace93fb8c1154bd2ff608cc6ab3c28e5235891ab082774`
- Selected rows SHA-256: `6d4199dc7baedecffaaac3318c041d3f2a7e863f32c01249f4d15b810b09a31e`
- Selected: `25`
- Inserted: `25`
- Immediate replay inserted: `0`
- Immediate replay result: `idempotent`
- Saved unique card-print IDs: `25`
- Reconciliation mismatches: `0`

## Current Truths

- All `25` selected rows came from the reconciled 500-card harvest artifact.
- All source artifact manifest entries verified before selection.
- Every selected canonical ID, GV-ID, name, set code, number, and self-hosted `image_path` matched database truth.
- The batch contains `0` Energy cards.
- All `25` rows contain `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2` graphs.
- Review statuses are `10 pending`, `15 needs_review`, `0 approved`.
- All `25` rows are current because no prior current row existed for the selected cards.
- No approved current or human-reviewed row was superseded.
- Canonical snapshot hash was unchanged across the transaction.
- Apply-time provider calls and model cost were both zero.

## Invariants

- The source artifact and each selected source row must match its frozen SHA-256.
- The producing branch and commit must match the frozen run plan.
- The importer cannot select more than `25` rows or select an Energy card.
- Only `pending` and `needs_review` rows may be imported.
- Canonical identity and self-hosted image path must reconcile before the transaction.
- Any approved current row, unexpected current row, mixed duplicate state, or canonical drift blocks the transaction.
- The batch is atomic.
- Replaying the same plan is a no-op.
- Approval and embedding columns remain null.

## Token And Cost Result

The database rows preserve their original generation telemetry:

- request count: `25`
- retry count: `0`
- input tokens: `223303`
- output tokens: `125457`
- total tokens: `348760`
- cached input tokens: `77824`
- reasoning output tokens: `0`
- original estimated generation cost: `$0.2667052`

Artifact import telemetry:

- provider requests: `0`
- new input/output tokens: `0`
- new model cost: `$0`

## Schema And Security

- Migration `20260715120000` present: `true`.
- RLS enabled on `card_visual_description_runs`: `true`.
- RLS enabled on `card_print_visual_descriptions`: `true`.
- Policies granting app access: `0`.
- Grants to `PUBLIC`, `anon`, or `authenticated`: `0`.
- `service_role` retains private table access.

## Why The Visual Layer Remains Derived Intelligence

Fact Graph V2 records model-extracted observations and deterministic concepts anchored to an image. It does not define card identity, printing truth, set membership, rarity, market value, lore, or collector preference. `card_prints` remains canonical authority, and imported rows remain review-routed private intelligence.

## What Must Never Be Broken

- Never let visual facts mutate canonical identity.
- Never treat `pending` as human approval.
- Never overwrite an approved current row without a separate explicit gate.
- Never generate embeddings from unapproved rows through this importer.
- Never expose these private rows to app-facing roles through this gate.
- Never inherit variant-specific print markers from shared artwork without evidence.
- Never treat `not observed` as `not present`.
- Never rerun the model when a validated, hash-verified artifact is being imported.

## Tests

- Importer contracts: `9/9` passed.
- Existing visual-agent contracts: `63/63` passed.
- Combined targeted result: `72/72` passed.
- Agent/importer syntax checks: passed.
- Migration/RLS/grant readback: passed.
- `git diff --check`: passed.
- Audit hash verification: passed with zero mismatches.
- Full repository contract suite: not run for this isolated Node/database gate.
- Broad pre-commit shipcheck: did not proceed past runtime preflight because this worktree does not contain `SUPABASE_DB_URL`; the guarded plan/apply explicitly loaded `C:/grookai_vault/.env.local` without recording secrets.

## Artifacts

Audit directory:

`docs/audits/card_visual_description_artifact_apply_v1/2026-07-20T18-53-12-028Z_plan_7e4eacb32a4c/`

Key artifacts:

- `run_plan.json`
- `selected_rows.jsonl`
- `source_hash_verification.json`
- `pre_apply_db_snapshot.json`
- `apply_result.json`
- `idempotency_result.json`
- `db_readback.json`
- `ALL_25_SAVED_DATABASE_JSON.json`
- `schema_rls_grant_readback.json`
- `boundary_proof.json`
- `RECONCILIATION_REPORT.json`
- `CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_REPORT.md`
- `targeted_test_results.json`
- `artifact_hashes.json`

## Explicit Next Gate

Run a `1,000`-card non-Energy harvest using the existing concurrency/autopilot envelope, preserving failures in quarantine. Do not apply additional database rows, approve descriptions, generate embeddings, or enable downstream consumers in that harvest gate. After it reconciles, use this importer in separately approved bounded apply packages.
