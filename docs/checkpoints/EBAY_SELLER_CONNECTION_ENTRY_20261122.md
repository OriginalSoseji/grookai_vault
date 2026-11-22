# eBay Seller Connection Entry Checkpoint — 2026-11-22

## Findings

- On Samsung build 607, **Accounts → eBay seller account** opened the seller
  workspace, but no connection action appeared when the account map was absent.
- Build 608 exposed the missing-status path, but the live workspace reported
  `linked: true` and still showed no way to sign in again. The connected seller
  needed an explicit reauthentication action as well.

## Source correction

- The seller workspace always shows an authentication action: **Connect eBay**
  when unlinked or status is missing, and **Reconnect eBay** for linked sellers
  or sellers requiring reconnection.
- Explicit `linkingEnabled: false` remains authoritative and disables the
  action, including for partial status responses.
- OAuth continues through the authenticated seller endpoint. A saved draft is
  not a published listing.
- The active
  [eBay Seller Connection Entry Contract V1](../contracts/EBAY_SELLER_CONNECTION_ENTRY_CONTRACT_V1.md)
  records these requirements.

## Verification

- Focused Flutter widget tests: 23 passed, including linked seller reconnect,
  missing status, and explicit disablement.
- Focused Flutter analyzer: no issues.
- PR [#1012](https://github.com/OriginalSoseji/grookai_vault/pull/1012) merged
  to `main` as `5405f43d09a20027d117702bcd2c78bf99c0ef51`.
- Signed release workflow 45033415313 passed analysis, full Flutter tests,
  Windows renderer goldens, signing identity verification, and artifact upload.
- Build 609 installed in place on the Samsung. Its signer exactly matches the
  approved production signer, and existing app data was retained.
- On device, **Accounts → eBay seller account → Reconnect eBay** opened Chrome.
  The OAuth handoff reached the grookai return page with `status=linked`.
  **Open grookai** returned to the seller workspace, which refreshed on resume.
- No listing draft was created or published during this check.

## Remaining eBay verification

- Separately verify listing preparation and an explicitly selected listing's
  live publication before claiming the end-to-end selling flow is complete.
- Average sold-price display remains deferred under issue #1004.
