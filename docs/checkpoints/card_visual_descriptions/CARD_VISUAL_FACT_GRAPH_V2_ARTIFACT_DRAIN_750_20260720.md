# Card Visual Fact Graph V2 Artifact Drain 750

Status: COMPLETE; ALL 1,000 SOURCE ROWS SAVED

Date: 2026-07-20

## Context

The first recovery-export database canary inserted and reconciled 250 of the 1,000 high-value non-Energy Fact Graph V2 rows. Approval was then granted to drain the remaining 750 rows through three independently frozen 250-row transactions.

## Problem

The remaining apply-ready rows needed to reach private database storage without regenerating model output, weakening row-status review boundaries, or turning one successful canary into an unbounded write.

## Risk

- A later batch could overlap a prior batch or omit source rows.
- Database state could drift between planning and applying.
- Partial writes could break exact source-to-database reconciliation.
- Approved/current rows, canonical identity, embeddings, or public access could be changed implicitly.
- A failed batch could be hidden by aggregate totals.

## Decision

Execute three sequential `CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_READINESS_CANARY_V1` transactions. Each transaction creates a new plan from current database state, selects exactly the next 250 rows with no current or duplicate visual version, freezes the plan hash, applies atomically, replays immediately to prove idempotency, verifies schema/security, reads all 250 rows back, and stops the sequence on any mismatch.

## Alternatives Rejected

- One unbounded 750-row transaction: rejected because the importer is governed at 250 rows.
- Reuse one plan for all three writes: rejected because each plan must reflect database state after the preceding transaction.
- Regenerate rows: rejected because all rows are already hash-verified paid artifacts.
- Auto-approve or embed after apply: rejected as separate downstream gates.

## Migration Applied

No migration was created or applied. Migration `20260715120000_card_visual_description_agent_v1.sql` remained present and the two private visual-description tables retained RLS with no app-role grants.

## Drain Proof

Frozen execution commit: `5c9619060913c250b7c07322c020118c2948722e`

### Batch 1 Of 3

- Eligible before selection: `750`
- Plan SHA-256: `349520968d51cfd33aa47f2501da7f7e3671c3062432018d65144c77f2567095`
- Run ID: `2c56a65a-a290-4671-b4f9-c457948a49d9`
- Run key: `7c06e442a476fa1c35f81ca7375e05d83ac02bb07a5b27aa23f89b66941fbc99`
- Inserted: `250`
- Statuses: `67 pending`, `183 needs_review`
- Idempotent replay inserted: `0`
- Reconciliation mismatches: `0`
- Artifact hashes: `14/14` verified

### Batch 2 Of 3

- Eligible before selection: `500`
- Plan SHA-256: `fdfa4a737fd0db7aebd5901e332632807eb2d44bf4bba81076e5fcb334f80b06`
- Run ID: `ec888869-282f-4f2e-9fee-cc7bbe51d73b`
- Run key: `e2f071ce8be101a7a20e1cfc99e3256284c9ef689d964ce63d199bd13f02fd32`
- Inserted: `250`
- Statuses: `56 pending`, `194 needs_review`
- Idempotent replay inserted: `0`
- Reconciliation mismatches: `0`
- Artifact hashes: `14/14` verified

### Batch 3 Of 3

- Eligible before selection: `250`
- Plan SHA-256: `7bfb166b4caca92fa8cf1bbbdecd3b838cf28a64a3685418ada435d95bae414d`
- Run ID: `ed910226-3057-413e-a1f1-d63fd899e8de`
- Run key: `d9218b5e093b9f6121575556ace9241230004dc08207f5576c9f3f13f632bc46`
- Inserted: `250`
- Statuses: `52 pending`, `198 needs_review`
- Idempotent replay inserted: `0`
- Reconciliation mismatches: `0`
- Artifact hashes: `14/14` verified

## Final 1,000-Row Readback

- Source rows: `1,000`
- Exact visual versions matched: `1,000`
- Unique database description IDs: `1,000`
- Unique card-print IDs: `1,000`
- Missing source rows: `0`
- Duplicate source versions: `0`
- Canonical identity mismatches: `0`
- Source/database status mismatches: `0`
- Non-current rows: `0`
- Pending: `246`
- Needs review: `754`
- Approved: `0`
- Approval timestamps or actors present: `0`
- Embedded rows: `0`
- Incomplete run ledgers: `0`
- Aggregate reconciliation: `true`

## Current Truths

- All 1,000 recovered high-value non-Energy rows now exist in private database storage.
- The four atomic packages consist of the prior 250-row canary plus this three-batch 750-row drain.
- The source set contains `856` Pokemon, `109` Trainer, `23` Item/Tool/Supporter, `12` Stadium, and `0` Energy rows.
- No generated row became approved.
- No embedding, provider request, canonical identity write, or public integration occurred during apply.

## Invariants

- Every package remains bound to its source manifest, row hashes, canonical snapshot, and frozen plan SHA-256.
- Package selection must be disjoint and its union must equal the governed source set.
- Only `pending` and `needs_review` rows may be imported.
- Any approved/current conflict or source, canonical, hash, security, readback, or reconciliation mismatch stops the drain.
- Exact-plan replay must insert zero rows.

## Token And Cost Result

Persisted row telemetry across the final 1,000 saved rows:

- requests: `1,021`
- retries: `21`
- input tokens: `9,059,258`
- output tokens: `5,156,271`
- total tokens: `14,215,529`
- cached input tokens: `4,424,192`
- original estimated generation cost: `$10.5464792`

All four database apply packages used `0` provider calls and `$0` new model cost.

## Schema And Security

- Migration `20260715120000` present: `true`.
- RLS enabled on both private visual-description tables: `true`.
- Policies granting app access: `0`.
- Grants to `PUBLIC`, `anon`, or `authenticated`: `0`.
- `service_role` access remains present.

## Tests

- Drain preflight importer contracts: `10/10` passed.
- Importer syntax check: passed.
- `git diff --check`: passed.
- Every batch performed schema/RLS/grant verification and exact database readback.
- Full repository suite was not run for this isolated database drain.

## Artifacts

Aggregate audit directory:

`docs/audits/card_visual_description_artifact_apply_v1/2026-07-20T22-38-04-049Z_drain_750_5c9619060913`

It links the prior canary and three drain directories, records all batch reconciliation results, preserves a row-level final 1,000-row database coverage readback, captures all four run ledgers, and contains a verified aggregate hash manifest.

## Why This Remains Derived Intelligence

Database persistence makes the visual graph durable, not canonical. These are model-extracted, evidence-routed observations tied to an image and retained for review. They do not define identity, printing truth, ownership, value, approval, lore, or collector preference.

## What Must Never Be Broken

- Never confuse database persistence with human approval.
- Never overwrite approved or current human-reviewed intelligence through bulk import.
- Never let shared artwork confirm printing-specific markers without evidence.
- Never mutate canonical card identity through visual extraction.
- Never generate embeddings or enable public reads implicitly.
- Never hide failed, missing, duplicated, or unreconciled rows in aggregate counts.

## Explicit Next Gate

Run the next high-value non-Energy harvest as a separately frozen batch of up to 2,000 previously unattempted card-print IDs using 10 workers and harvest-mode quarantine. Do not write those new rows to the database during generation. After deterministic quarantine recovery and exact saved-system reconciliation, apply them through independently planned 250-row packages under the proven importer boundary.
