# CARD_DETAIL_ACTION_SURFACE_AUDIT_V1

## Current actions
- `Add to Vault` is shown in `lib/card_detail_screen.dart` but is a placeholder snackbar, not a real destination.
- `Compare` is shown and routes to `CompareScreen`.
- Contextual action routing is already present for `Exact copy`, `Open set`, or `Versions`.
- Collector actions are already present for `ContactOwnerButton` and `Messages` via `NetworkInboxScreen`.

## Existing destinations available in repo
- `VaultManageCardScreen`
- `VaultGvviScreen`
- `PublicGvviScreen`
- `PublicCollectorScreen`
- `CompareScreen`
- `PublicSetDetailScreen`
- `NetworkInboxScreen`

## Missing but real actions to surface
- `Manage card` when card detail is opened from an owned exact-copy path and the screen can resolve a real vault item id.
- `Open public page` when card detail is opened from an owned exact-copy path that already has a real public exact-copy destination.
- `View collector` when card detail can resolve a real public collector slug from existing exact-copy or contact-owner context.
