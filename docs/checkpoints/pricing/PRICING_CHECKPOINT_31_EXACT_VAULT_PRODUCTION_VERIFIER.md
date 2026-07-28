# Pricing Checkpoint 31: Exact-Vault Production Verifier

## Context

Exact-printing Vault pricing is repository-ready but intentionally undeployed
while the authenticated 100-printing canary remains frozen. The post-canary
rollout needs production evidence stronger than migration success or local
smoke output.

## Problem

The rollout previously depended on separate manual checks for:

- view definition and security options
- ACL and RLS boundaries
- authenticated owner filtering
- anonymous denial
- exact-printing pricing scope
- duplicate and unresolved copy reconciliation
- copy-level total agreement

Manual checks can omit a boundary or preserve identifiers in ad hoc output.
They also make it difficult to compare the known pre-deployment state with the
post-deployment result.

## Risk

- A view can exist with the wrong `security_invoker` behavior.
- Authenticated reads can leak another owner’s rows.
- Anonymous reads can become available accidentally.
- Vault totals can use parent prices or count one exact price incorrectly.
- A passing migration command can be mistaken for a complete production proof.

## Decision

The post-canary rollout must run:

```text
npm run pricing:market:vault:verify -- \
  --expected-commit-sha=<exact-deployed-40-character-sha> \
  --require-pass
```

The verifier is read-only and requires:

- a clean exact commit
- `security_barrier=true`
- `security_invoker=false`
- RLS on the ownership table
- owner-filtered view definition
- archived and slab exclusion
- authenticated and service-role `SELECT` only
- anonymous SQLSTATE `42501`
- zero rows when authenticated without a user identity
- exact agreement between direct owner rows and authenticated view rows
- zero cross-owner or duplicate instances
- every requested pricing row scoped to `card_printing`
- exact identity agreement
- at least one priced raw copy
- priced and unpriced copy-count reconciliation
- total agreement between the governed pricing RPC and the independent current
  exact-printing view

Artifacts contain aggregate evidence only. Customer identifiers are excluded.

## Pre-Deployment Baseline

Command:

```text
npm run pricing:market:vault:verify
```

Artifact:

```text
artifacts/market_pricing_product_v1/vault_production_readback/2026-07-28T14-17-41-271Z/summary.json
```

SHA-256:

```text
b30292139fd094b4ec33b3d619df75c75eab275439757f778e768e05a49fd45f
```

Result:

- status: `failed`
- production target view: absent
- owner sample: unavailable through the absent view
- priced-copy proof: unavailable
- database writes: `0`

This failure is expected and authoritative. It proves the exact-Vault
migration has not been deployed and prevents schema or surface completion from
being claimed early.

## Current Truths

- The verifier policy and audit are implemented.
- Targeted policy tests cover clean, missing-schema, widened-access,
  cross-owner, duplicate, parent-scope, identity, total, and no-priced-sample
  cases.
- The production runbook requires the verifier before enabling the full-scope
  schedule.
- Production is unchanged.

## Invariants

1. Production verification is read-only.
2. A passing local smoke cannot replace production readback.
3. Owner identities never enter audit artifacts.
4. Parent-scope pricing cannot satisfy an exact-copy proof.
5. A Vault proof must include at least one real priced exact copy.
6. Anonymous access remains denied.

## Exact Next Gate

After the 72-hour canary passes, deploy and apply the exact clean rollout
commit, activate the full eligible signed-in publication, then rerun the
verifier with `--require-pass`.

Do not mark production schema parity or all-surface completion passed until the
enforcing run succeeds and its artifact hash is checkpointed.
