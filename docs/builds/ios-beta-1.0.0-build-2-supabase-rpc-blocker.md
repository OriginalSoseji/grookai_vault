# iOS Beta Build 1.0.0+2: Supabase RPC Blocker

Date: 2026-05-22
Branch: `codex/ios-beta-1.0.0-2-supabase-rpc-blocker`
Tag: `ios-beta-v1.0.0-build2-supabase-rpc-blocker`

## What This Build Contains

- iOS beta release readiness for `Grookai Vault` version `1.0.0+2`.
- Xcode workspace support for local Dart defines through ignored `DebugSecrets.xcconfig` and `ReleaseSecrets.xcconfig`.
- App Store privacy/export metadata and iOS release notes.
- Android parity surfaces for Grookai Dex, Sets/master-set details, Compare, scanner placeholder, and public collector slug lookup.

## Known Backend Blocker

Exact Copy and some Manage Card routes can fail until Supabase permissions are fixed.

Observed error:

```text
permission denied for function resolve_active_vault_anchor_v1
```

This build intentionally does not include client-side workaround patches for that RPC issue. The intended fix is in Supabase, so another computer should start from this branch/tag and repair the backend permission or RPC chain.

Likely backend area:

- `vault_mobile_instance_detail_v1`
- `public_vault_instance_detail_v1`
- `vault_mobile_card_copies_v1`
- `resolve_active_vault_anchor_v1`

## Backend Fix Applied

Applied on 2026-05-22:

- `supabase/migrations/20260522160000_ios_beta_resolve_active_vault_anchor_rpc_fix_v1.sql`
- `supabase/migrations/20260522161500_public_vault_instance_detail_definer_restore_v1.sql`
- `supabase/migrations/20260522163000_resolve_active_vault_anchor_invoker_v1.sql`

Root cause:

- `20260521223000_security_warn_remediation_v2.sql` revoked authenticated execution from `resolve_active_vault_anchor_v1`.
- The iOS app directly calls `resolve_active_vault_anchor_v1` for owned anchor resolution.
- `vault_mobile_instance_detail_v1` also called that helper internally, so private Exact Copy detail could fail through the nested RPC chain.
- `public_vault_instance_detail_v1` had been converted to invoker, but anon does not have direct table access to `vault_item_instances`, so the public exact-copy read surface still needed a governed definer boundary.

Fix:

- `resolve_active_vault_anchor_v1` now enforces `p_user_id = auth.uid()` for non-service callers.
- `resolve_active_vault_anchor_v1` now runs as `SECURITY INVOKER` and keeps authenticated/service-role execute grants.
- `public_vault_instance_detail_v1` no longer calls the privileged anchor helper.
- `public_vault_instance_detail_v1` is restored as the intentional public `SECURITY DEFINER` read boundary instead of granting anon direct table access.

Verification:

- Authenticated direct `resolve_active_vault_anchor_v1(... p_create_if_missing => false)` returns the owned anchor.
- Authenticated cross-user `resolve_active_vault_anchor_v1` fails with `vault_anchor_owner_mismatch`.
- Authenticated `vault_mobile_instance_detail_v1(gv_vi_id)` returns private detail.
- Authenticated `vault_mobile_card_copies_v1(card_print_id, vault_item_id)` returns copies.
- Authenticated `vault_owned_counts_v1(card_print_ids)` returns owned counts.
- Anonymous `public_vault_instance_detail_v1(gv_vi_id)` returns public detail without granting anon execute on `resolve_active_vault_anchor_v1`.

## Checkout

```sh
git fetch origin --tags
git checkout codex/ios-beta-1.0.0-2-supabase-rpc-blocker
```
