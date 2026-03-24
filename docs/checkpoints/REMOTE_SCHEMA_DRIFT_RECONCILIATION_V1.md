# REMOTE SCHEMA DRIFT RECONCILIATION V1

## 1. INCIDENT SUMMARY

- Remote PostgreSQL schema diverged from `supabase/migrations` because schema changes were applied directly on the linked remote database instead of being introduced through forward-only migrations.
- In this incident, “schema drift outside migration history” means remote contained tables, views, functions, policies, and object definitions that were not reconstructible by replaying the repo migration chain from zero.
- The migration ledger could still look healthy because `supabase migration list` only proves migration ID history. It does not prove that replayed local schema matches remote schema.
- The core failure condition was: migration ledger looked clean, but the actual remote schema was not replayable from repo truth.

---

## 2. SYSTEM STATE BEFORE INCIDENT

- Remote DB had direct edits outside migrations. The drift scan recorded remote-only objects and same-name definition drift that did not exist in repo truth.
- Repo migration chain ended at `20260322193000_add_justtcg_direct_structure_helpers_v1.sql` when the current JustTCG repair window began.
- Local repo also had additional forward-only migration work pending during the repair window, including `20260323173000_add_justtcg_variant_price_snapshots_latest_order_index_v1.sql`. That pending local work did not explain the remote drift.
- `supabase db diff --linked` showed large drift. The recorded `DRIFT_SCAN_V1` summary found:
  - `26` remote-only objects
  - `1` local-only function signature
  - `5` same-name, different-definition objects
- The linked diff included destructive churn that could not be accepted as a migration verbatim, including:
  - `drop extension if exists "unaccent"`
  - broad `drop view if exists ...` statements for stable public views
  - `alter table public.card_prints alter column number_plain set default ...`
  - incorrect extension recreation using the wrong schema for `unaccent`
- Local replay proof was not trustworthy until the drift was reconciled. In practical terms, `supabase db reset --local` could not be treated as authoritative until the repo and remote schema were brought back into alignment.
- JustTCG latest-builder work overlapped this unstable state. That overlap mattered because the pricing lane needed new schema-backed work while the migration system was not yet authoritative.
- Ledger alignment vs schema alignment:
  - Ledger alignment: local and remote appear to share the same migration IDs.
  - Schema alignment: replaying the repo migrations from zero produces the same schema that exists remotely.
  - Before reconciliation, ledger alignment could appear acceptable while schema alignment was false.

---

## 3. ROOT CAUSE

Primary cause:

- Direct remote schema edits bypassed the migration system and created a remote schema that no longer matched repo replay output.

Secondary causes:

- No immediate `supabase db pull` was run after the remote edits.
- `scripts/drift_guard.ps1` was not strict enough to serve as a schema-authority gate. It was a ledger helper, not a replay proof.
- Workflow decisions relied too heavily on `supabase migration list` and not enough on full replay proof and linked-schema comparison.

Key insight:

- Ledger looked correct, but the system was non-deterministic.

---

## 4. IMPACT

- Migration replay became unsafe to trust until reconciliation was completed.
- Shadow-DB diff / pull output stopped being usable as a direct migration artifact because it contained destructive and non-canonical operations.
- Safe remote migration push was blocked because repo migrations were no longer the authoritative build story for the linked schema.
- JustTCG latest repair landed during this instability window, which increased rollout risk for a production pricing lane.
- In the JustTCG latest lane, the pre-fix builder also had a separate data-correctness failure:
  - `justtcg_variants = 140332`
  - `justtcg_variant_price_snapshots = 276809`
  - `justtcg_variant_prices_latest = 119951`
  - `20381` variants were missing from `justtcg_variant_prices_latest`
- That missing-latest state created stale or absent latest pricing rows and degraded pricing surfaces that depended on `public.justtcg_variant_prices_latest`.
- While the builder failure was caused by client-side replay over a growing snapshot table, the concurrent schema-drift state made it unsafe to treat any schema change as routine until repo truth was restored.
- The combined effect was loss of trust in diff output, loss of trust in migration replay, and elevated risk of silent future corruption.

---

## 5. DETECTION

- The first business-visible signal was a mismatch between `public.justtcg_variants` and `public.justtcg_variant_prices_latest`.
- The builder then failed during snapshot scan with:
  - `[justtcg-latest-builder] snapshot page query failed: canceling statement`
- Migration audit showed that ledger-only checks were insufficient.
- `supabase db diff --linked` exposed the actual schema mismatch and proved that remote contained objects and definitions that were not represented by replaying repo migrations.
- `DRIFT_SCAN_V1` made the gap concrete by enumerating remote-only tables, views, functions, and definition mismatches even though drift-guard style ledger checks had passed.

---

## 6. RECOVERY STRATEGY

1. Isolation
   - Created a clean git worktree dedicated to reconciliation work.
   - Linked that worktree to the remote project `ycdxbpibncqcchqiihfz`.

2. Audit
   - Ran `supabase migration list --linked`.
   - Ran `supabase db diff --linked`.
   - Confirmed the critical mixed state:
     - migration ledger looked mostly aligned
     - replayed local schema did not match remote

3. Reconstruction
   - Ran `supabase db pull` in the clean worktree.
   - Used the generated output as raw recovery input only.
   - Converted the captured remote truth into forward-only reconciliation migrations instead of editing applied migrations.

4. Hardening migration
   Removed non-replay-safe operations from the generated diff:
   - `drop extension if exists "unaccent"`
   - broad `drop view if exists ...` output for stable public views
   - generated/default mutation on `public.card_prints.number_plain`
   - incorrect extension recreation and schema references

5. Fixes applied
   - Ensured `unaccent` remained in the canonical extension schema used by the repo.
   - Corrected extension schema usage and schema-qualified references.
   - Removed invalid `ALTER` statements that mutated canonical derived/default behavior.
   - Cleaned malformed SQL blocks until the captured DDL replayed correctly.
   - Split the hardened result into explicit forward-only migrations, including:
     - `20260304070000_printing_layer_v1.sql`
     - `20260305090000_capture_admin_change_checkpoints.sql`
     - `20260305093000_force_security_invoker_8_views.sql`
     - `20260307053045_repair_sets_printed_set_abbrev_from_pokemonapi.sql`

6. Validation loop
   - Re-ran `supabase db diff --linked` after each hardening pass.
   - Fixed each failure deterministically before continuing.
   - Re-ran replay and drift checks after each forward-only repair.
   - Refused to modify any migration already applied remotely.

7. Final proof
   - `supabase db reset --local` succeeded.
   - Historical replay proof was captured in `docs/release/logs/DB_REPLAY_STEP2_FIX1_reset.log`.
   - Current repo replay also succeeds with the full migration chain, including the JustTCG latest-order index migration.

---

## 7. FINAL SYSTEM STATE

- At the completion of this reconciliation, the migration chain was again authoritative for the recovered incident scope.
- Schema relevant to the incident was reproducible from repo migrations.
- Remote objects uncovered by the drift scan were either captured explicitly in forward-only migrations or intentionally removed in forward-only cleanup.
- No incident-scope drift remained affecting correctness of the recovered system.
- JustTCG latest system is restored and aligned.
- The legacy Supabase REST offset-replay builder was replaced with a deterministic DB-native refresh path:
  - `backend/pricing/justtcg_variant_prices_latest_refresh_v1.mjs`
  - `backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs`
  - `backend/pricing/justtcg_variant_prices_latest_repair_v1.mjs`
- The required latest-order index is represented in:
  - `supabase/migrations/20260323173000_add_justtcg_variant_price_snapshots_latest_order_index_v1.sql`

Explicit invariants:

- reset from zero works
- no missing latest variants
- no duplicate variant rows in `public.justtcg_variant_prices_latest`
- no stale latest data relative to snapshot winners

Current JustTCG dry-run proof:

- `variants_count = 140332`
- `snapshots_count = 276809`
- `latest_count = 140332`
- `missing_latest_variants = 0`
- `duplicate_latest_variant_ids = 0`
- `card_print_id_mismatch_count = 0`
- `set_level_missing_latest_groups = 0`

This checkpoint records the recovered incident state. Any later drift event must be treated as a separate incident.

---

## 8. WHAT WAS LEARNED

- Schema drift can exist even when the migration ledger appears clean.
- Replayability is the only authoritative correctness test for schema state.
- Diff tools are signals, not truth.
- Destructive drop output from `supabase db diff --linked` does not automatically mean those drops are correct or safe.
- Migrations must be treated as the source of truth, not as optional documentation after remote edits.
- A ledger helper is not a schema-authority gate.

---

## 9. PREVENTION RULES (MANDATORY)

### Rule 1 — No Direct Remote Edits

- Direct remote schema edits are forbidden in normal workflow.
- All schema changes must originate from forward-only migrations committed to repo.

### Rule 2 — Emergency Edit Protocol

- If an emergency remote schema edit occurs:
  - run `supabase db pull` immediately in a clean worktree
  - stop all other migration work
  - do not resume schema work until reconciliation is complete

### Rule 3 — Replay Gate

- Before any schema task is considered valid, `supabase db reset --local` must pass.
- If reset fails, stop. No additional schema work may be stacked on top.

### Rule 4 — Drift Gate

- Before any remote push:
  - `supabase migration list --linked` must be clean
  - no remote-only state is allowed
  - no pending or error state is allowed

### Rule 5 — Migration Immutability

- Never edit applied migrations.
- Any repair must be forward-only.

### Rule 6 — Diff Interpretation Rule

- Treat destructive diff output as a diagnostic signal, not as an auto-apply plan.
- Ignore generated drop/recreate churn unless it is proven to affect correctness and can be expressed as a replay-safe forward migration.

---

## 10. FOLLOW-UP ACTIONS

- add `REMOTE_SCHEMA_EDIT_POLICY_V1`
- add drift-prevention enforcement as a strict preflight gate
- strengthen `scripts/drift_guard.ps1`
- add a formal remote-schema reconciliation playbook
- enforce a standard Codex migration workflow: Audit -> Classify -> Plan -> Apply -> Verify

---

## 11. CHECKPOINT STATUS

Name:
remote_schema_drift_reconciliation_v1

Status:
COMPLETE

Result:
System restored to deterministic, replayable state.
