# Card Visual Description Agent V1 Apply Gate

Date: 2026-07-15

Status: BLOCKED_BEFORE_REMOTE_SCHEMA_APPLY

Branch: `feature/card-visual-description-agent`

Commit: `312c74bbf592b3fc232d2a1429654678007e894d`

## Result

The one-card database apply proof was not completed.

The required strict migration prepush check failed before `supabase db push`, so the migration was not applied and the worker was not run in apply mode.

## Migration Status

Migration candidate:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

Apply status: NOT APPLIED

Apply output: not produced because the guardrail stopped before apply.

Strict prepush command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260715120000
```

Strict prepush result: FAIL, exit code `1`

Blocking remote-only migration IDs:

- `20260625130000`
- `20260625140000`
- `20260625150000`
- `20260625160000`

## Selected Card And Generated Row

Selected card: none

GV-ID: none

Generated row status: none

Reason: the migration did not apply, so the destination tables do not exist remotely and the one-card apply gate could not lawfully run.

## Token And Cost

No one-card apply token or cost usage exists.

Current OpenAI-backed economics proof remains the prior 10-card dry run:

- artifact: `docs/audits/card_visual_descriptions/2026-07-15T18-30-09-637Z_dry_run_89228354cebb/summary.json`
- model: `gpt-4o-mini`
- image detail: `high`
- requests: `10`
- retries: `0`
- input tokens: `226230`
- output tokens: `3214`
- total tokens: `229444`
- estimated cost: `$0.0358629`
- average per validated description: `$0.00358629`
- 500-card projection: `$1.793145`
- 1000-card projection: `$3.58629`
- full eligible catalog projection: `$190.88745783` for `53227` cards

## Schema/RLS Verification

Live schema/RLS/grant readback for the new objects was not run because the migration did not apply.

Static contract verification passed:

- migration creates private `card_visual_description_runs`
- migration creates private `card_print_visual_descriptions`
- migration enables RLS on both tables
- migration grants service-role-only access
- no app-facing read surface is created

## Boundary Proof

Pre-apply fingerprints were captured before the gate stopped:

- `card_prints` row count: `53316`
- `card_prints` fingerprint: `a3c8ac917ab99c48f00c8533cd029367`
- GV assignment row count: `53316`
- GV assignment fingerprint: `4de084541dc05f12b2edfedaa7ebb260`

App-facing object hashes were captured before apply for:

- `v_vault_items`
- `card_print_active_prices`
- `v_card_search`
- `v_card_images`
- `search_card_prints_v1`
- `vault_add_or_increment`

No after-apply diff exists because no apply happened.

## Tests Run

Passed:

```powershell
node --test tests\contracts\card_visual_description_agent_v1.test.mjs tests\contracts\grookai_signature_roadmap_v1.test.mjs
```

Result: 7 tests passed.

Passed:

```powershell
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
```

Passed:

```powershell
git diff --check
```

Not run:

- full contract suite
- live migration/RLS smoke against the new tables

Reason: strict migration prepush blocked schema apply before the new live objects existed.

## Artifacts

- `01_preflight_target_env_and_before_fingerprints.json`
- `02a_supabase_link_sandbox.txt`
- `02_supabase_migration_list_before_apply.txt`
- `03_strict_prepush_expected_20260715120000.txt`
- `04_targeted_contract_tests.txt`
- `05_node_check_card_visual_description_agent.txt`
- `06_git_diff_check.txt`
- `FINAL_BLOCKED_APPLY_GATE.md`
- `artifact_hashes.json`

Checkpoint:

- `docs/checkpoints/card_visual_descriptions/CARD_VISUAL_DESCRIPTION_AGENT_V1_APPLY_GATE_BLOCKED_20260715.md`

Domain index:

- `docs/checkpoints/card_visual_descriptions/INDEX.md`

Global index:

- `docs/checkpoints/CHECKPOINT_INDEX.md`

## Exact Next Gate

Reconcile the linked Supabase migration ledger drift, especially remote-only IDs `20260625130000`, `20260625140000`, `20260625150000`, and `20260625160000`.

After that, rerun:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260715120000
```

Proceed to migration apply and exactly one card apply only after that prepush passes.
