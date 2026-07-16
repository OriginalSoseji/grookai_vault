# CARD_VISUAL_DESCRIPTION_AGENT_V1_APPLY_GATE_BLOCKED_20260715

Date: 2026-07-15

Status: BLOCKED_BEFORE_REMOTE_SCHEMA_APPLY

Branch: `feature/card-visual-description-agent`

Commit at checkpoint: `312c74bbf592b3fc232d2a1429654678007e894d`

## Context

The Canonical Card Visual Description Agent V1 is an internal worker for generating detailed, blind-person-style descriptions for canonical card artwork. The purpose is better matching, later semantic search, and future personalization signals without changing canonical identity, image truth, pricing, vault, or app-facing contracts.

The current gated phase was supposed to:

- apply the private schema migration
- verify schema and security
- run exactly one real OpenAI-backed card apply
- read back the run and generated description rows
- prove the review status stayed non-approved
- stop before any 25-card production sample, embeddings, Taste Engine integration, Listing Resolver integration, or unattended processing

## Problem

The required strict migration prepush gate failed before any remote schema apply.

Command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260715120000
```

Result: exit code `1`.

Blocking remote-only migration IDs:

- `20260625130000`
- `20260625140000`
- `20260625150000`
- `20260625160000`

The linked migration ledger also showed multiple local-only pending migrations besides this agent migration. The full ledger was preserved in the audit folder.

## Risk

Applying this migration while the linked ledger has remote-only migrations would violate repository migration governance. It could hide schema drift, apply changes on top of an unreviewed remote state, and make later rollback or audit attribution unreliable.

This is a governance blocker, not an agent quality failure.

## Decision

Stop before `supabase db push`.

Do not apply the migration.

Do not run the one-card database apply.

Do not perform live schema/RLS readback for the new tables because the new tables do not exist remotely.

Proceed only with durable checkpointing, artifact preservation, and static contract verification.

## Alternatives Rejected

- Run `supabase db push` anyway: rejected because strict prepush failed and repository guardrails require stopping on remote-only migration drift.
- Manually apply only the SQL outside the migration ledger: rejected because direct schema mutation outside migration governance would break auditability.
- Mark the remote-only migrations as repaired without investigation: rejected because this checkpoint cannot prove those IDs are safe to reconcile.
- Run the one-card apply without the migration: rejected because the worker's apply path depends on the new private run and description tables.
- Treat the blocked apply as complete: rejected because the required DB write and readback proof does not exist.

## Migration Applied

No.

Migration candidate:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

Remote state before apply showed:

- `card_visual_description_runs_exists: null`
- `card_print_visual_descriptions_exists: null`
- `migration_20260715120000_applied: 0`

## One-Card Apply Proof

Not produced.

The gate stopped before card selection and before any apply-mode worker execution.

There is no selected card, no GV-ID, no generated database row, and no one-card token/cost record for this blocked phase.

## Current Truths

- The target Supabase project ref was verified as `ycdxbpibncqcchqiihfz`.
- The run target was classified as `REMOTE`.
- Required environment variables were present, including `SUPABASE_URL`, database URL, OpenAI API key, and `NODE_OPTIONS=--use-system-ca`.
- The private schema did not exist before apply.
- The migration ledger is not clean enough to apply this migration.
- No database mutation was performed by this gated phase.
- The 10-card OpenAI dry run completed before this apply gate and remains the current quality/cost economics proof.

## Invariants

Pre-apply canonical invariant counts:

- `card_prints`: `53316`
- `sets`: `843`
- `card_print_traits`: `32903`

Required floor checks passed:

- `card_prints >= 40000`
- `sets >= 150`
- `card_print_traits >= 5000`

Pre-apply fingerprints:

- `card_prints`: `a3c8ac917ab99c48f00c8533cd029367`
- `gv_assignment`: `4de084541dc05f12b2edfedaa7ebb260`

Because no mutation occurred, no post-apply fingerprint diff was produced.

## Token And Cost Result

The current real OpenAI-backed cost proof is the prior 10-card dry run:

- run artifact: `docs/audits/card_visual_descriptions/2026-07-15T18-30-09-637Z_dry_run_89228354cebb/summary.json`
- mode: `dry_run`
- model: `gpt-4o-mini`
- image detail: `high`
- request count: `10`
- retry count: `0`
- input tokens: `226230`
- output tokens: `3214`
- total tokens: `229444`
- estimated total cost: `$0.0358629`
- average estimated cost per validated description: `$0.00358629`
- projected 500-card cost: `$1.793145`
- projected 1000-card cost: `$3.58629`
- projected full eligible catalog cost for `53227` cards: `$190.88745783`

No one-card apply token or cost result exists because the one-card apply did not run.

## Why The Visual Layer Remains Derived Intelligence

The generated description describes the visual evidence of a card image. It may support matching, search, review, and future semantic features, but it does not decide canonical card identity.

The layer must remain derived because:

- images can be representative rather than exact variant proof
- model output can be wrong or over-specific
- semantic descriptions are useful evidence, not authoritative identity records
- review status must gate human trust before any downstream consumer treats the text as durable product intelligence

## What Must Never Be Broken

- Do not mutate `card_prints`, GV-ID assignment, canonical identity, image truth, pricing, vault, or app-facing views/functions from this worker.
- Do not approve generated descriptions automatically.
- Do not expose generated descriptions to users without an explicit product gate.
- Do not generate embeddings until the description schema, review boundary, and one-card write path are proven.
- Do not run production samples while migration governance is blocked.
- Do not apply schema changes when strict migration prepush reports remote-only migration IDs.
- Do not use visual descriptions as canonical identity authority.

## Artifacts

- Preflight target, environment, invariants, and pre-apply fingerprints: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/01_preflight_target_env_and_before_fingerprints.json`
- Sandbox Supabase link output: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/02a_supabase_link_sandbox.txt`
- Linked migration list before apply: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/02_supabase_migration_list_before_apply.txt`
- Strict prepush failure output: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/03_strict_prepush_expected_20260715120000.txt`
- Targeted contract test output: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/04_targeted_contract_tests.txt`
- Node syntax check output: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/05_node_check_card_visual_description_agent.txt`
- Diff whitespace check output: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/06_git_diff_check.txt`
- Final blocked apply gate report: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/FINAL_BLOCKED_APPLY_GATE.md`
- SHA-256 artifact manifest: `docs/audits/card_visual_description_apply_proof_v1/2026-07-15T18-48-53-277Z/artifact_hashes.json`

## Explicit Next Gate

Resolve migration ledger drift first.

Minimum next gate:

1. Reconcile or document the remote-only migration IDs `20260625130000`, `20260625140000`, `20260625150000`, and `20260625160000`.
2. Re-run the strict prepush check.
3. Proceed only if the strict prepush check passes with `20260715120000` as the only expected local-only migration for this feature.
4. Then apply the migration, run schema/RLS/grant readback, execute exactly one OpenAI-backed apply, verify the row remains non-approved, capture DB readback and boundary proof, and stop again.

## Next-Gate Attempt

The migration reconciliation gate was attempted in `docs/audits/card_visual_description_migration_reconcile_v1/2026-07-15Tnext_gate/MIGRATION_RECONCILE_GATE.md`.

That gate restored the four missing remote-only migration files from Git history, reducing remote-only migration IDs to none. It remains blocked because strict prepush now reports unrelated local-only pending migrations in addition to `20260715120000`; the card visual description migration still cannot be applied as an isolated gate from this branch.

An isolated migration gate was then attempted in `docs/audits/card_visual_description_isolated_migration_gate_v1/2026-07-15Tnext_safe_step/ISOLATED_MIGRATION_GATE.md`.

That gate proved an isolated filesystem can present `20260715120000` as the only local-only pending migration, but strict prepush still failed during local replay at `20260708110000_product_evolution_e3_want_match_durable_engine_v1.sql`. The failure is existing product evolution migration replay debt: the remote-applied E3 migration requires `card_events.dedupe_key` and `notification_outbox.dedupe_key`, which are created by E1/E2 migrations that the linked ledger currently reports as local-only.

A follow-up full-branch replay gate was captured in `docs/audits/product_evolution_migration_replay_debt_v1/2026-07-15Tnext_step/FULL_BRANCH_REPLAY_GATE.md`.

That gate proved the full feature branch migration chain replays successfully through `20260715120000` when the E1/E2 dependency migrations remain present. The isolated failure is therefore not a Product Evolution SQL defect in the full branch. The remaining blocker is migration governance: the linked ledger still has unrelated local-only pending migrations in addition to the card visual description migration, so applying only `20260715120000` is not yet approved.

Revised next gate: create a ledger reconciliation plan for all current local-only IDs, classify which must be applied, repaired, or intentionally left pending, then rerun strict prepush with an approved pending set before returning to the one-card database apply.

The ledger reconciliation plan was created in `docs/audits/migration_ledger_reconciliation_plan_v1/2026-07-15Tnext_step/LEDGER_RECONCILIATION_PLAN.md`.

Current linked ledger truth:

- remote-only IDs: none
- local-only IDs: 15
- 12 local-only IDs have representative schema objects present remotely and are repair candidates only after full parity proof
- `20260523183000`, `20260713190000`, and `20260715120000` have representative schema objects absent remotely and must not be repaired based on current evidence

Current next safe step: run full parity readback for the 12 schema-present candidate IDs, preserve the evidence, and stop before any migration repair or schema apply.

The full parity readback was completed in `docs/audits/migration_ledger_full_parity_readback_v1/2026-07-15Tnext_step/FULL_PARITY_READBACK_REPORT.md`.

Catalog parity passed for all 12 schema-present candidate IDs with `174` checks, `0` missing expected catalog objects, and `0` security-definer mismatches.

The gate remains blocked because the exact notification dispatcher cron schedule row for `20260706122000` is absent:

- `cron.job` exists remotely
- `net` exists remotely
- expected job name: `notification-dispatcher-disabled-v1`
- matching jobs: `0`

Revised next gate: perform a focused read-only investigation of the `20260706122000` cron schedule gap and stop again before migration repair, schema apply, or card visual description one-card apply.

The cron gap investigation was completed in `docs/audits/notification_dispatcher_cron_gap_v1/2026-07-15Tnext_step/NOTIFICATION_DISPATCHER_CRON_GAP_REPORT.md`.

The gap is explained:

- `20260707182000` is present in remote migration history.
- `20260707182000` supersedes the disabled placeholder job from `20260706122000`.
- `notification-dispatcher-every-minute-v1` is present and active with command `select public.notification_dispatcher_scheduled_http_v1();`.
- `notification_dispatcher_runtime_config` exists, has RLS enabled, and has the service-role policy.
- Runtime config keys exist, but secret values were not read or recorded.

Updated next gate: prepare an explicit migration-history repair plan for the 12 repair-candidate IDs, excluding `20260523183000`, `20260713190000`, and `20260715120000`, then stop before running repair unless explicitly approved.

The migration-history repair plan was prepared in `docs/audits/migration_history_repair_plan_v1/2026-07-15Tnext_step/MIGRATION_HISTORY_REPAIR_PLAN.md`.

The plan proposes marking the 12 schema-present/superseded IDs as applied through `supabase migration repair --status applied --linked --yes`, while excluding:

- `20260523183000`
- `20260713190000`
- `20260715120000`

No migration repair was executed.

Updated next gate: request explicit approval before running the repair command. Stop before repair unless approval is explicit.

The pre-execution repair readiness check was captured in `docs/audits/migration_history_repair_readiness_v1/2026-07-15Tnext_step/MIGRATION_HISTORY_REPAIR_READINESS.md`.

Readiness result:

- target ref: `ycdxbpibncqcchqiihfz`
- remote-only IDs: none
- all 12 proposed repair IDs are still local-only
- all 3 excluded schema-absent IDs are still local-only
- stop-condition violations: none
- operator approval: not present

The next gate remains explicit operator approval for the remote migration-history repair. Ambiguous wording such as `next step` is not enough for this mutation.

Explicit approval was later provided and the 12-ID migration-history repair was executed. Execution proof is preserved in `docs/audits/migration_history_repair_execution_v1/2026-07-15Tapproved_repair/MIGRATION_HISTORY_REPAIR_EXECUTION_REPORT.md`.

Current linked ledger truth after repair:

- remote-only IDs: none
- local-only IDs: `20260523183000`, `20260713190000`, `20260715120000`
- strict prepush passed with those three expected local-only IDs

The card visual description migration is still not applied and no one-card database apply has run.

Updated next gate: decide how to handle the two unrelated schema-absent migrations (`20260523183000`, `20260713190000`) before returning to the card visual description schema apply gate for `20260715120000`.

The two schema-absent migrations were later applied through an isolated worktree. Execution proof is preserved in `docs/audits/clean_history_schema_apply_v1/2026-07-15Tapply_two_schema_absent/CLEAN_HISTORY_SCHEMA_APPLY_REPORT.md`.

Applied:

- `20260523183000_printing_truth_review_sidecar_v1.sql`
- `20260713190000_trust_safety_block_report_v1.sql`

Not applied:

- `20260715120000_card_visual_description_agent_v1.sql`

Current linked ledger truth after the clean-history apply:

- remote-only IDs: none
- feature worktree local-only IDs: `20260715120000`

Feature strict prepush passed with `20260715120000` as the only expected local-only migration.

Updated next gate: resume the card visual description apply gate for `20260715120000`, then run exactly one OpenAI-backed database apply and stop.
