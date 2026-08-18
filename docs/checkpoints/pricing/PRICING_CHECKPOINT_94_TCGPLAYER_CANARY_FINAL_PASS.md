# Pricing Checkpoint 94: TCGPlayer Canary Final Pass

## Status

The authenticated 100-printing Production V1 canary passed its governed
72-hour observation gate. This closes Operational Release Gate 1. It does not
activate full-scope publication or anonymous pricing.

## Context

The final scheduled observer initially failed even though every source and
publication cycle completed successfully. The observer compared the
publication worker's start time directly with the `08:15 UTC` warehouse
schedule. The August 15 warehouse began at `08:15:11 UTC`, but publication
began at `09:50:10 UTC` after source ingestion completed. That publication
start was 5.174 minutes outside the old 90-minute comparison window.

The workflow already supplied a 480-minute publication-completion grace, but
the audit CLI did not parse or enforce that value.

## Decision

Schedule evidence is now evaluated from the publication run's exact linked
`tcgcsv_source_sync_runs` row:

- source run ID and publication `source_sync_run_id` must agree;
- warehouse and publication run keys must be the deterministic pair for the
  expected date;
- the warehouse must start inside the schedule tolerance;
- source and publication timestamps must be ordered;
- publication must complete inside the configured completion grace;
- source and publication commits, statuses, failures, and reconciliation must
  remain exact and healthy.

Historical replay uses the immutable GitHub final-window evidence artifact,
verified by SHA-256, and augments only the linked source-cycle fields through
read-only database queries. Mutable current state is not substituted for the
historical final-window snapshot.

## Final Evidence

- Canary producing commit:
  `6b729441bf8944048885ade5d9905e23166d9d46`
- Observer repair merge:
  `3ac5e70b88176895f1422b52626c5b89bca3bfc2`
- Permanent observer pin merge:
  `ec2e216a7f2aa33752a6631b806af7dbd7d9d9ba`
- Final main-branch GitHub run:
  `32194979152`
- Frozen input evidence SHA-256:
  `7b84a452de3afff671fbbc83801f779020c5e9c1f2ad4edab5c4969999916013`
- Final replay status: `passed`
- Expected/matched schedule slots: `3/3`
- Missing slots: `0`
- Unmatched runs: `0`
- Unhealthy runs: `0`
- Terminal alerts: `0`
- Resolved exact prices: `98/98`
- Missing provenance: `0`
- Stale current prices: `0`
- Broken source-to-publication traces: `0`
- Authenticated governed read: passed
- Anonymous governed read: denied (`42501`)
- Rollback generation: available
- Artifact hash mismatches: `0`

Permanent artifacts:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_final_pass_20260818/github_main_replay_32194979152/`

## Migration Readback

The production migration ledger already contains both frozen post-canary
migrations:

- `20260728130000_tcgplayer_market_read_model_contract_completion_v1`
- `20260728133000_vault_exact_market_pricing_targets_v1`

They must not be reapplied. The next rollout gate must verify their schema,
grant, RLS, authenticated-access, and anonymous-denial effects in place.

## Invariants

1. TCGPlayer `marketPrice` remains the sole Production V1 market close.
2. Production V1 remains English Pokemon raw exact printings only.
3. Anonymous pricing remains denied.
4. The canary's failed historical artifact remains preserved; it is not
   rewritten or deleted.
5. The repaired pass is attributable to corrected evidence interpretation,
   not weakened health, mapping, count, provenance, or access requirements.
6. No canary observer path may write to the database or activate publication.
7. Full-scope signed-in activation remains gated by a fresh complete-scope
   shadow and the frozen Production V1 release requirements.

## Exact Next Gate

Freeze a clean post-canary rollout candidate from current `origin/main`,
verify the already-applied migrations and security boundaries, and run a fresh
complete-scope V1.2 shadow with no row limit and no publication activation.

Require at least 95 percent exact governed coverage, deterministic reasons for
every denominator gap, clean provenance, performance, health, exact-Vault,
and rollback evidence before any full signed-in activation.

