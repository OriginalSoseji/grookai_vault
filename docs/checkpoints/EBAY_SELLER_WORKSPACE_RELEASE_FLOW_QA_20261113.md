# eBay Seller Workspace Release Flow QA — 2026-11-13

## Verified

- The seller workspace browser suite passes 17/17 checks across draft save and
  recovery, provider-backed category and condition choices, listing preparation,
  explicit publication confirmation, lost-result recovery, expired-fee blocking,
  and 384px/1200px dark/light layouts.
- The production Samsung account access/readback from November 7 remains the
  latest live account evidence: 18 drafts were readable through the app. That
  check did not publish or mutate a listing.

## Still required for the requested live listing

- Identify the specific existing draft/post intended to go live. The verified
  production account had 18 drafts, and no candidate has been selected or
  published in this work. Do not publish an unrelated draft.
- Complete the live provider publish/readback against that exact item.

## Source

- `apps/web/tests/parity/ebay-seller-workspace.spec.ts`
- `docs/checkpoints/EBAY_NATIVE_ACCOUNT_ACCESS_20261107.md`
