# TCGPlayer Market Production V1 Migration Apply Readiness

## Result

Status: `passed_pre_apply_canary_blocked`

The repository migration ledger contains exactly two intended local-only
migrations:

- `20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql`
- `20260728133000_vault_exact_market_pricing_targets_v1.sql`

There are no remote-only migration IDs.

## Proof

The strict `PrePush` gate passed with the exact two-ID allowlist. It proved:

- expected and actual local-only IDs agree
- no duplicate pending view, function, or index definitions were detected
- the complete migration history replays through
  `supabase db reset --local --yes`
- production database writes remained `0`

The linked-schema audit reports a nonempty diff because these two migrations
are intentionally pending. This is recorded as `expected_pending_delta`, not
as clean production schema parity.

## Decision

Do not apply either migration while the authenticated 72-hour canary is
active. After the canary passes:

1. freeze and record the exact clean deployment commit
2. rerun strict `PrePush` with only these two IDs
3. run `supabase db push` without `--include-all`
4. require both migration ledgers to reconcile
5. require `AuditLinkedSchema` to return an empty diff
6. run enforcing schema, grant, RLS, signed-in, anonymous-denial, and
   exact-Vault readback
7. run a fresh full-source V1.2 shadow before full activation

## Source Manifest

`backend/pricing/rollout/tcgplayer_market_production_v1_migration_manifest.json`

The manifest freezes migration IDs, file hashes, required commands, forbidden
flags, preconditions, and post-apply requirements.
