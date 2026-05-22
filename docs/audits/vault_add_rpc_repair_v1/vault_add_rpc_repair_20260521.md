# Vault Add RPC Repair V1 - 2026-05-21

## Scope

Fix the app-facing add-to-vault RPC path that can leave the mobile UI stuck on `Adding...`.

## Root Cause

`supabase db lint --linked --level error --output json` reported:

- `public.vault_add_card_instance_v1`: ambiguous `admin_vault_instance_create_v1` call.
- `public.execute_card_interaction_outcome_v1`: same ambiguous admin-create overload.
- `public.vault_add_or_increment`: stale `on conflict (user_id, card_id)` implementation without a matching unique constraint.

The linked DB had two `admin_vault_instance_create_v1` overloads. The older overload predates child printing ownership, while the newer overload supports `p_card_printing_id`. Because most parameters have defaults, named calls could not resolve deterministically.

The mobile app now sends `p_card_printing_id` when a selected finish/version exists, so the server RPC must expose that argument directly.

## Migration

Created:

```text
supabase/migrations/20260521203000_vault_add_rpc_repair_v1.sql
```

Changes:

- Drops the obsolete pre-child-printing `admin_vault_instance_create_v1` overload.
- Replaces `vault_add_card_instance_v1` with an 8-argument signature including nullable `p_card_printing_id`.
- Routes exact-copy creation through the child-printing-aware admin function.
- Keeps parent-only ownership compatible by allowing `p_card_printing_id = null`.
- Replaces the stale 5-argument `vault_add_or_increment` body with update-then-insert logic instead of invalid `ON CONFLICT`.
- Sends `notify pgrst, 'reload schema'` so PostgREST can see the new RPC signature.

## Safety

- No data rewrite.
- No scanner changes.
- No pricing changes.
- No Species Dex denominator changes.
- No public child route changes.
- No parent `gv_id` changes.

## Verification Plan

Before apply:

```powershell
supabase migration list --linked
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521203000
supabase db push --dry-run
```

After apply:

```powershell
supabase migration list --linked
supabase db lint --linked --level error --output json
supabase db query --linked "<read-only RPC signature checks>"
npm run preflight
git diff --check
```

Manual smoke:

- Sign into the mobile app.
- Search a card.
- Tap Add to vault.
- Confirm the loading state resolves.
- Confirm the card appears in Vault.
- Confirm selected finish/variant still carries into the vault row when applicable.

## Execution Result

Status: `APPLIED`

Remote migration applied:

```text
20260521203000_vault_add_rpc_repair_v1.sql
```

Pre-apply verification:

- `supabase migration list --linked`: expected local-only migration was `20260521203000`.
- `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521203000`: passed, including local reset/replay.
- `supabase db push --dry-run`: exactly one migration planned, `20260521203000_vault_add_rpc_repair_v1.sql`.

Post-apply verification:

- `supabase migration list --linked`: ledger aligned; `20260521203000` is present locally and remotely.
- Remote function signature check:
  - `admin_vault_instance_create_v1`: one child-printing-aware overload remains.
  - `vault_add_card_instance_v1`: exposes nullable `p_card_printing_id`.
  - `vault_add_or_increment`: stale invalid `ON CONFLICT` body replaced.
- Direct unauthenticated RPC resolution check returned `not_authenticated`, proving the function resolves and executes its auth guard.
- `supabase db lint --linked --level error --output json`: no longer reports:
  - `public.vault_add_card_instance_v1`
  - `public.vault_add_or_increment`
  - `public.execute_card_interaction_outcome_v1`
- Remaining lint debt is unrelated to the mobile add-to-vault loading state:
  - `extensions.index_advisor`: missing `hypopg_reset()`
  - `ingest.merge_card_prints`: invalid `ON CONFLICT`
  - `public.vault_post_to_wall`: stale `vault_items` column reference
- `npm run preflight`: passed with known deferred debt.
- `git diff --check`: passed.

Expected app result:

- The mobile `Adding...` state should now resolve for authenticated users.
- Parent-only add remains compatible.
- Selected finish/variant add remains compatible through `p_card_printing_id`.
