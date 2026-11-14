# eBay Draft Removal UX Checkpoint — 2026-11-14

## Completed

- Added a confirmed **Remove draft** action in the native and web draft review
  surfaces for editable and prepared drafts.
- The confirmation states that removal hides the draft from grookai's active
  eBay drafts list, does not delete an eBay resource, and does not remove the
  exact card copy from the Vault.
- Removed drafts remain in the backend as `abandoned` records for audit and
  idempotency, but are filtered from the recent drafts list on both clients.
- Drafts in `uncertain`, preparing, publishing, live, or terminal sale states do
  not expose this removal action. Uncertain states require eBay status recovery.

## Authority and scope

This uses the existing `ebay_seller_draft_action_v1(..., 'abandon')` path under
`EBAY_SELLER_PUBLISHER_V1`. The RPC marks a safe local draft abandoned and does
not mutate an eBay provider resource or canonical Vault inventory. Its existing
revision, reservation, and operation checks remain authoritative. No live eBay
drafts were changed as part of this UI work.

## Verification

- Inspected the existing SQL state transition and the native/web caller paths.
- Confirmed the list filtering applies only to `abandoned` records.
- Automated tests and device verification were not run in this checkpoint.

## iPhone build handoff attempt

- Duet successfully connected to the user's MacBook Pro.
- The Mac's existing VS Code checkout is based on a different commit and shows
  189 local changes, including a modified `.env`; it was left untouched.
- The eBay removal changes are staged in the Windows feature checkout but not
  committed. The required pre-commit shipcheck stopped at runtime preflight
  because `SUPABASE_DB_URL` is unavailable. No commit, remote push, iOS build,
  or phone installation occurred.
- Resume with the required local database URL available to the preflight, then
  build from a separate clean Mac checkout so the existing Mac changes remain
  preserved.

## Files

- `lib/screens/ebay/ebay_seller_review.dart`
- `lib/screens/ebay/ebay_seller_screen.dart`
- `apps/web/src/components/ebay/SellerWorkspace.tsx`
- `apps/web/src/components/ebay/SellerWorkspace.module.css`
