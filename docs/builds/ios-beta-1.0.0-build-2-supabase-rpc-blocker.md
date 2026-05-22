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

## Checkout

```sh
git fetch origin --tags
git checkout codex/ios-beta-1.0.0-2-supabase-rpc-blocker
```
