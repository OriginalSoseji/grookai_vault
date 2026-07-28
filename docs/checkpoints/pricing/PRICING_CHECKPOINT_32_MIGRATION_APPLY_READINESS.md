# Pricing Checkpoint 32: Migration Apply Readiness

## Context

The authenticated 100-printing pricing canary is still inside its mandatory
72-hour observation window. Exact shared-read and Vault pricing work is
committed but intentionally not applied to production during that frozen
window.

## Problem

The post-canary runbook named migration application as a prerequisite but did
not freeze the exact pending migration set, file hashes, or tested command
sequence. An operator could otherwise apply the wrong local-only history,
reach for `--include-all`, or mistake expected pending schema delta for
unrelated remote drift.

## Risk

- A migration outside the reviewed pricing set could be applied accidentally.
- A remote-only migration could be hidden by an unsafe history command.
- A local smoke could pass while the remote ledger remains divergent.
- Production schema parity could be claimed before enforcing readback.
- The exact-Vault clients could deploy without their governed database target.

## Decision

The rollout is governed by:

```text
backend/pricing/rollout/tcgplayer_market_production_v1_migration_manifest.json
```

It freezes exactly:

- `20260728130000`
- `20260728133000`

The strict `PrePush` gate passed for those IDs, including duplicate-object
scanning and full local replay. The ledger has zero remote-only IDs.

`AuditLinkedSchema` currently reports `expected_pending_delta` because the
two migrations are deliberately unapplied. It may be called clean only after
remote apply produces an empty linked diff.

## Alternatives Rejected

- Applying during the canary: rejected because it changes the frozen
  production state being observed.
- `supabase db push --include-all`: rejected because it can conceal migration
  history defects and is forbidden by repository governance.
- Relying on documentation without a contract test: rejected because IDs,
  hashes, or command order could drift silently.
- Treating local reset as production verification: rejected because it does
  not prove remote schema, ACL/RLS, or signed-in behavior.

## Current Truths

- Branch: `pricing/mee-productization-v1`
- Preflight commit: `4d3fbd8fb43eef26dfa58a993258b2640eb5f225`
- Expected local-only IDs: `2`
- Actual local-only IDs: `2`
- Remote-only IDs: `0`
- Duplicate pending objects: `0`
- Full local replay: passed
- Production writes from readiness work: `0`
- Production schema parity: pending

## Invariants

1. Canary pass is required before remote apply.
2. The deployment checkout must be clean and its exact SHA recorded.
3. Only the two manifest IDs may be local-only at apply time.
4. `--include-all` is forbidden.
5. Post-apply linked schema diff must be empty.
6. Schema, grants, RLS, owner isolation, anonymous denial, and exact pricing
   must be read back from production.
7. A fresh V1.2 full shadow must pass before full signed-in activation.

## Exact Next Gate

Continue read-only canary observation through
`2026-07-31T08:40:15.793Z`. If the enforcing observer passes, rerun the
manifest preflight from the exact clean deployment commit and apply the two
migrations. Stop on any ID, hash, ledger, replay, or post-apply mismatch.
