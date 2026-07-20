# Card Visual Fact Graph V2 Artifact Apply 250

Status: COMPLETE

Date: 2026-07-20

## Context

The high-value non-Energy harvest and recovery gates produced a hash-verified, reconciled export containing 1,000 apply-ready saved-system rows. The earlier artifact importer had proven a 25-row database apply but intentionally could not consume the recovery export or exceed 25 rows.

## Problem

The next gate required a meaningful database canary without regenerating paid model output, weakening the original 25-row guardrail, overwriting reviewed rows, or applying an unverified recovery artifact.

## Risk

- A larger importer profile could silently weaken the original 25-row boundary.
- Recovery records could be detached from their manifest, canonical identity, or image path.
- Existing current or approved descriptions could be superseded.
- A partial batch could leave the run ledger and description rows inconsistent.
- Generated rows could be approved, embedded, or exposed to app roles during import.

## Decision

Add an explicit `CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_READINESS_CANARY_V1` profile capped at 250 rows. Preserve the default 25-row profile unchanged. The canary profile verifies the recovery manifest, all 1,000 generated rows, selected row hashes, canonical identity and image paths, existing description state, and a frozen run-plan hash before one atomic transaction. It immediately replays the same plan to prove idempotency and then performs exact database readback.

## Alternatives Rejected

- Run ten independent 25-row applies: rejected because it would not prove one atomic 250-row canary.
- Raise the original V1 cap globally: rejected because it would weaken a previously governed invariant.
- Regenerate 250 cards: rejected because validated artifacts already exist and model variability would change the evidence set.
- Apply all 1,000 rows at once: rejected because the new recovery-export path first required a bounded database proof.
- Approve pending rows or generate embeddings: rejected as separate human-review and downstream gates.

## Migration Applied

No new migration was created or applied. Remote readback confirms `20260715120000_card_visual_description_agent_v1.sql` remains present.

## Apply Proof

- Producing commit: `21ce5a1856af6c3482b5e26d7d44b4afb47a4ec5`
- Source-producing commit: `ddeefef4c88efbdaa8aabfb6b02db862f111c0ad`
- Run ID: `dbf8fb06-c553-4f8d-aff3-7d3b7da913e2`
- Run key: `4116989ac032eee26fedc7a0e0eaa8ac82e9cf571d4a1205911a45fde0416b20`
- Frozen run-plan SHA-256: `41a3fef36f687fd84f9c7b87be278e90bc6e118e71701150cdf3aebea204fb4d`
- Source manifest SHA-256: `d7341b32bc0d5f53d4de5832793fb61a158e6e818bf6a14d922c933ee08722e3`
- Selected rows SHA-256: `dc9562905fb37a5252199798287d477a91e0163aa989c723a570e2ea8421d063`
- Eligible source rows: `1,000`
- Selected and inserted: `250`
- Unique database rows read back: `250`
- Immediate replay inserted: `0`
- Immediate replay result: `idempotent`
- Reconciliation mismatches: `0`
- Final audit hashes verified: `16/16`

## Current Truths

- The selected batch contains `249` Pokemon rows, `1` Trainer row, and `0` Energy rows.
- Database statuses are `71 pending`, `179 needs_review`, and `0 approved`.
- Approval timestamps and approver IDs are null for all 250 rows.
- Embedding fields are null for all 250 rows.
- No selected card had a current, duplicate, or approved description before apply.
- The canonical snapshot hash was identical before and after the transaction.
- Apply-time provider requests, retries, tokens, and cost were all zero.
- The remaining 750 recovered rows were not written.

## Invariants

- The original artifact-apply profile remains capped at 25 rows.
- The recovery canary profile requires its explicit CLI flag and remains capped at 250 rows.
- Every selected row must remain linked to a hash-verified source record and exact canonical image path.
- Any current, duplicate, approved, canonical-drift, source-drift, or plan-hash conflict blocks the transaction.
- Only `pending` and `needs_review` rows may be imported.
- The batch is atomic and exact-plan replay is a no-op.
- Canonical identity, approvals, embeddings, and public app access remain outside this importer.

## Token And Cost Result

The database ledger preserves the selected rows' original generation telemetry:

- requests: `257`
- retries: `7`
- input tokens: `2,258,836`
- output tokens: `1,322,222`
- total tokens: `3,581,058`
- cached input tokens: `930,560`
- original estimated generation cost: `$2.7399216`

Apply execution used `0` provider calls and `$0` new model cost.

## Schema And Security

- Migration `20260715120000` present: `true`.
- RLS enabled on both private visual-description tables: `true`.
- Policies on those tables: `0`.
- Grants to `PUBLIC`, `anon`, or `authenticated`: `0`.
- `service_role` access is present on both tables.

## Tests

- Artifact importer contracts: `10/10` passed.
- Visual-agent contracts: `65/65` passed.
- Combined targeted contracts: `75/75` passed.
- Agent and importer syntax checks: passed.
- Migration/RLS/grant readback: passed.
- `git diff --check`: passed.
- Full repository suite: not run for this isolated Node/database gate.

## Artifacts

Audit directory:

`docs/audits/card_visual_description_artifact_apply_v1/2026-07-20T22-22-15-058Z_plan_21ce5a1856af`

Key artifacts include `run_plan.json`, `selected_rows.jsonl`, source-hash verification, pre/post database readbacks, schema/RLS/grant readbacks, `ALL_250_SAVED_DATABASE_JSON.json`, boundary proof, reconciliation reports, targeted test results, command metadata, and `artifact_hashes.json`.

## Why This Remains Derived Intelligence

The imported graph records model-extracted and deterministically normalized observations anchored to an image. It does not define canonical card identity, printing truth, ownership, lore, pricing, approval, or collector preference. Importing a row does not make it human-reviewed truth.

## What Must Never Be Broken

- Never overwrite approved or current human-reviewed rows through a bulk artifact import.
- Never treat `pending` as approval.
- Never let a shared artwork image confirm variant-specific print markers.
- Never write canonical identity or image ownership through this path.
- Never regenerate model output when a hash-verified saved artifact is being imported.
- Never create embeddings or public reads as an implicit side effect of apply.
- Never proceed after a plan, source, canonical, readback, or reconciliation mismatch.

## Explicit Next Gate

Authorize a governed drain of the remaining 750 apply-ready rows as three sequential, independently frozen 250-row transactions. Each transaction must stop on any mismatch, preserve `pending`/`needs_review`, perform immediate idempotency replay and exact readback, and make zero provider calls. Do not approve rows, generate embeddings, or enable downstream consumers in that drain.
