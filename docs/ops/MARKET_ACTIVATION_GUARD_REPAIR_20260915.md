# Market Activation Guard Repair

Date: September 15, 2026.
Branch: `fix/market-activation-guard-20260915`.
Worktree: `C:/grookai_vault_market_activation_20260915`.
Base main: `296e63b6af075db1c0b3dd793ed22fffe54c6e83`.

## Incident And Evidence

The founder challenged the Bulbasaur 001/165 price while reviewing the client
candidate. The previous $12.34 example was an isolated synthetic fixture, not a
real market price. Read-only production tracing verified the exact mapping to
TCGPlayer product 502552 and its Normal/Reverse Holo printings.

At the audit, the active September 14 publication returned $0.27 Normal and
$0.35 Reverse Holo. The completed September 15 source sync contained $0.28 and
$0.38. The founder's screenshot showed $0.28 and $0.36; its capture time is
unknown. Do not overwrite governed prices with the screenshot or assume the
source discrepancy is resolved.

Failed run: `9bd42b0a-49d8-4a33-8247-afaa2d73e1b8`.
Producer: `60d1c1d07f85504d747519b6cd566f253ddc96f8`, worker V1_7.
Staged publication: `41cc7491-e974-4495-9101-329b1d25566f`.
It reconciled 164,110 snapshots, but three activation attempts failed with
statement/client timeouts. The September 14 active pointer remained intact.

The production guard query exactly matches that producer's query. EXPLAIN
estimates one staged snapshot even though the staged publication has 164,110.
Its plan performs repeated primary-key decision lookups. This is evidence of a
poor cardinality estimate, not proof that all database latency has one cause.

## Narrow Repair

Worker V1_8 reads the guard counts using materialized, release-scoped snapshots
and run-scoped eligible decisions, joined once. Hidden printing IDs are deduped
before joining. The six existing counts and their policy evaluator are unchanged.
The 120-second database / 125-second client limits remain unchanged.

No changed price formula, freshness window, drop tolerance, canonical identity,
printing truth, grant, RLS rule, schema, or activation/rollback procedure.
No production writes, deployment, push, provider ingestion, or pointer activation
were performed in this repair task. The website candidate remains separate.

## Verification

- 226 pricing regression tests passed, zero skipped, including opt-in PostgreSQL.
- Local temporary-table parity against a frozen copy of the original SQL.
- Duplicate printings, hidden reviews, missing and mismatched decisions, wrong
  run, non-current decisions, failed baseline, broken/missing pointer, stale
  snapshots, unrelated categories, and expired source evidence exercised.
- Scale fixture: 300,000 historical rows plus 164,110 staged and 164,117 active
  snapshots, with statistics collected before the new releases were inserted.
- Production probes are repeatable-read/read-only. Both query forms exceeded a
  preliminary 30-second cap. Revised query completed at the existing 120-second
  cap in 53.404 seconds; unchanged active pointer before/after.
- Revised live counts: MTG selected/eligible 132,921, prior MTG 132,924;
  Pokemon eligible 31,189, prior/fresh Pokemon 31,193. Existing loss thresholds
  are satisfied. This is a read-only guard proof, not publication proof.
- The original query subsequently completed in 62.719 seconds with exactly the
  same six counts. These sequential probes have different cache/load conditions;
  they are not a controlled cold-cache benchmark or proof of scheduled recovery.
- Syntax and diff checks pass. No claim of deployed UI verification.

Receipts, raw failures, plans, timings and test logs:
`C:/grookai_vault_operator_artifacts/bulbasaur_live_price_20260915`.
The original-query 120-second comparison has its own immutable receipt:
`guard-original-120s.json`. Final hashes are in `repair-artifact-hashes.json`.
Changes are local and uncommitted; no frozen repair commit or deployed worker is
claimed. The existing main and catalog candidate remain untouched.

## Release Follow-up Authorized

The founder requested the next step after connecting Samsung. The release lane
may freeze/merge this isolated repair, preserve and switch the pricing runtime,
run the existing governed shadow/production workflow, and verify prices. This
does not authorize a client candidate release, schema change, manual price edit,
MEE runtime replacement, canonical mutation, or recovery-artifact deletion.

Fresh SSH readback confirms the failed guard artifact's stage is
`production_pre_activation`. The pricing runtime is still `60d1c1d07f` and the
separate MEE runtime is `ed7414b980`. The worker host is 98% disk-full (3.4 GiB
free); old complete scheduled artifacts can exceed 1 GiB. Preserve them. Use
the existing GitHub publication workflow for the bounded recovery, avoid another
warehouse ingestion, and budget the small immutable runtime separately. Host
capacity remains an operational risk, not a reason to bypass retention rules.

Release artifacts: `C:/grookai_vault_operator_artifacts/market_activation_release_20260915`.
The pre-commit shipcheck runs against loopback-only local Supabase, with inherited
credentials removed and a local-only admin key for existing build-time reads.

Run local SQL parity explicitly:

```powershell
$env:GROOKAI_LOCAL_ACTIVATION_SQL_TEST='1'
node --test tests/contracts/market_activation_coverage_v1.test.mjs
```

The test uses only temporary tables in the local Docker database, then rolls
back. It never accepts a production connection string from the environment.

## Remaining Release Gate

1. Review/freeze this isolated worker repair through normal repository checks.
   Do not ship the unrelated local catalog client candidate with it.
2. Deploy a new immutable pricing runtime from the merged producer, preserving
   the current runtime and active publication rollback references. Do not
   replace the separately governed MEE nightly runtime.
3. Obtain a fresh same-producer shadow/reconciliation proof, then run the
   governed production publication with a new run key and valid source evidence.
   A run's SHA, worker version and source lineage are frozen: never edit the
   failed V1_7 ledger to resume it under V1_8. Do not bypass the provenance check.
4. Read back the new active pointer, exact snapshot counts, guard artifact,
   source provenance, Bulbasaur Normal/Reverse RPC rows and actual client
   rendering. Values must agree with the selected source, not a guessed price.
5. Verify the next scheduled run and alert route. A successful read-only probe
   is not evidence that the production incident or scheduler is repaired.
