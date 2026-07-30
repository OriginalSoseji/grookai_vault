# Post-Canary Migration Rehearsal

- Status: `passed`
- Environment: disposable isolated Supabase stack
- Production database contacted: `no`
- Shared local stack modified: `no`
- Full migration history replayed: `305`

## Frozen Package

| Migration | SHA-256 | Replay |
| --- | --- | --- |
| `20260728130000` | `028c94a4b86cf2e29fcd74dba4e5111c24ce70512019db3688c6d1e5b1632681` | passed |
| `20260728133000` | `a66c7ae4aa3903077ad70d81bd1aeaa595f90a27ad30dd5b5604198eb7975cd7` | passed |
| `20260730180000` | `2cca3f5634a40ee68489944fc08e026f8de840a276f159e43546cd3458ea31cf` | passed |

All three migrations appeared in `supabase_migrations.schema_migrations`
after the replay. The first two remain the frozen read-model and exact-vault
package. The third is the later parent-summary runtime repair and must be
included explicitly in the post-canary apply package.

## Security Readback

Seven affected functions were `security definer` with
`search_path=public`:

- `get_market_pricing_read_model_v1`
- `get_top_market_pricing_v1`
- `vault_mobile_card_copies_v1`
- `vault_mobile_instance_pricing_target_v1`
- `public_vault_instance_pricing_target_v1`
- `public_shared_card_pricing_targets_v1`
- `public_discoverable_card_copies_v1`

Grant and RLS results:

- `anon` cannot execute the governed market RPCs and cannot select the parent
  summary view.
- `authenticated` can execute the governed market RPCs but cannot select the
  service-only parent summary view.
- `service_role` retains the required RPC and parent-view access.
- `vault_item_instances` has RLS enabled.
- `v_vault_mobile_pricing_targets_v1` has `security_barrier=true` and
  `security_invoker=false`.

## Behavior Readback

- The parent summary view materializes current exact-price evidence.
- An authenticated empty governed read returned zero rows.
- An owner-scoped empty vault target read returned zero rows.
- Behavior probes ran inside a rollback transaction.

## Decision

The package is technically replayable, but this is not production apply
authorization. Production remains blocked until the active 72-hour canary
passes, the integration candidate is frozen, strict production preflight
matches these hashes, and the signed release commandbook authorizes the apply.
