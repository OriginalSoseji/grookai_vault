# Collector Backend Repair Checkpoint

September 12, 2026 UTC. Both code repairs are implemented and locally tested;
neither is applied to production. Do not call the live blockers resolved.

Follow-up: `COLLECTOR_SCHEMA_RECONCILIATION_20260912.md` now explains and verifies
the baseline differences. Three table column-order differences triggered 41 view
replacements in the raw diff. Exact column-definition comparison reduces the
baseline diff to zero; all 891 security metadata objects match. Do not rebuild
those views. The unknown baseline drift investigation below is historical and
complete; the actual feature apply gates remain pending.

## MTG Pricing

New files:
- `backend/pricing/mtg_sealed_paired_refresh_v1.mjs`
- `scripts/audits/mtg_sealed_paired_refresh_v1.mjs`
- `.github/workflows/mtg-sealed-paired-refresh-v1.yml`

The existing read-only planner and Pokemon publisher are unchanged. The new MTG
worker uses their established paired-release pattern with MTG-specific immutable
baseline, source/language/group checks and verified four-argument reader contract.

Production read-only plan:
- Verified image-backed baseline: 2,149 variants, 2,141 existing image objects.
- Proposed members: 2,104 price members and 2,104 matching image members.
- Excluded: 32 missing/stale/invalid prices and 13 source-identity mismatches.
- Fresh warehouse sync: `c3d84662-9f5b-48ad-a162-63e3d6d53370`, September 11.
- Proposed qualification dates: September 5 through September 11.
- Plan fingerprint: `3e69ad7f6956e569819b216994e70d83b5fa4e472de65f4ab9d4a096f144c855`.

The plan was generated from uncommitted repair source against base
`31372a7c69c221adbfa6ac8c9505d929fe3ec08c`; it is diagnostic, NOT apply authority.
Regenerate after the producer is legitimately committed. The plan's producer.json
records exact source hashes. New partition-bounded reads produced identical plan
fingerprint in about eight seconds instead of scanning expired historical prices.

Proposed insert counts: 2,104 qualifications, one price release, 2,104 price members,
2,104 image evidence rows, 2,104 assertions, one image release, 2,104 image members;
two atomic pointer changes. Existing matching qualification rows are reused only
after exact readback. Zero Storage, identity, visibility or ownership writes.

New workflow defaults publication OFF and manual dispatch audit-only. It preserves
artifacts and raises a deduplicated founder GitHub issue; successful planning alone
does not close a publication failure. Workflow is local, not deployed/enabled.

## Confirmed Cameos

New migration: `20260912050000_confirmed_card_cameo_read_v2.sql`.
SHA-256: `5626c20bf8a422d5143a770478cfb2b2621c8fcac851b85363aafd2d7deef5ad`.
It creates the private confirmation table and public bounded RPC. No legacy
association or synthetic confirmation is promoted. The app is already wired to
this reader, so no additional design changes are needed.

Local cloned-schema SQL replay passed twice, including confirmed positive match,
unconfirmed/inactive denial, raw-table denial, missing-host rejection, source/image
drift, bounded inputs, hidden/signed-in set denial, and public-set/hidden-game denial.
All test confirmation rows rolled back. This does not replace full-chain reset proof.

## Verification

41 targeted tests passed: new MTG generator/execution fault injection, existing MTG
planner and Pokemon refresh regressions, cameo contract and migration checks.
Syntax and diff checks and release secret-packaging guard passed.
Transaction fault injection proves orchestration rollback behavior but is NOT a
real production rollback canary. No production mutation was attempted.

Evidence root:
`C:/grookai_vault_operator_artifacts/collector_polish/backend_repair_20260912`.
Read `mtg-bounded-plan/run_plan.json`, `producer.json`, and
`collector_pricing_replay_1789190181484/summary.json`.
The earlier failed local test-harness run is preserved; its replacement-string
escaping bug was repaired and the full SQL suite rerun successfully.

## Current Stop And Next Work

Completed September 12 follow-up:
- Strict baseline audit passes: 393 applied migrations, sole pending ID
  `20260912050000`, no remaining SQL difference, 891 security objects agree.
- Strict PrePush passes, including real reset/replay of all 394 migrations in
  the new isolated project `collector-cameo-replay-20260912` on port 56530.
- Five isolated-gate regression tests pass. Wrong pending sets fail before
  external commands. Source/config/inventory/port drift refuses the reset.
- No production writes and no existing preview resets.
- First broader shipcheck: 3,359 passed, 8 failed, 1 skipped. Seven source-shape
  assertions still described the replaced presentation/read paths; one test
  dependency was absent from this tree's shared installation. Updated assertions
  preserve bounded confirmed-RPC paging, verified-user pricing, governed search,
  child-image fallbacks and intrinsic artwork proportions. Genuine pinned engine
  tests run through the local-only identical-lock dependency resolver.
- Corrected suite: 3,370 passed, zero failed, one skipped; runtime preflight,
  health, quarantine/deferred reports and web typecheck passed. Lint identified
  missing explicit `declare` in the staging `.d.mts`; corrected and targeted
  lint passed. Final full managed-hook completion is still a separate receipt.
- First managed commit attempt then passed web lint/optimized build and Flutter
  analysis, but stopped at four MTG loader tests with expired September 3 test
  prices (714 passed). The real freshness policy correctly withheld those rows.
  Loader-only fake evidence now uses the test day's date; fixed historical
  classifier/boundary cases remain unchanged. Added stale-loader/no-signing
  regression. All 11 targeted MTG Flutter tests pass. No production price was
  re-dated and no production freshness rule was changed. Preserve the failed
  receipt as `managed-commit-expired-fixtures.log`.

Evidence: `collector_polish/schema_strict_gate_20260912` and
`collector_polish/cameo_full_replay_20260912` under the operator artifact root.
Read `strict-baseline.log`, `strict-prepush.log`, `reset-readback.json` and the
producer check logs. The full producer hook is not declared passed until its
actual completion receipt exists.

1. Baseline reconciliation: complete; never execute raw view-replacement SQL.
2. Full isolated migration-chain replay and exact pending preflight: complete.
3. Finish the repository's legitimate producer-commit checks. No hook was bypassed.
   Production DB credentials exist in the operator environment, but the isolated
   website tree intentionally has no production .env.local. Do not route the app
   to production to make its commit hook happy.
4. Apply/read back only the confirmed-cameo migration through its governed gate.
5. Freeze/regenerate MTG plan; perform real rollback canary, exact durable apply,
   independent readback and zero-row idempotency. Only then deploy/enable schedule.
6. Recheck signed-in MTG sealed and confirmed-cameo behavior, then resume the
   preserved website rollout checks. Live is unchanged and still has both blockers.

No main push, deployment, production schema/data write, Vercel build, worker
dispatch, image download or permission expansion occurred in this repair task.
