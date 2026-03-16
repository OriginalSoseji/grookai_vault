# eBay OAuth Callback Disabled V1

- `supabase/functions/ebay_oauth_callback/index.ts` is intentionally disabled.
- Reason:
  - eBay account-linking is not currently active.
  - OAuth state validation / CSRF hardening is not yet complete.
- Current behavior:
  - the callback fails closed immediately with `503`
  - no token exchange runs
  - no `ebay_accounts` read/write runs
- Pricing impact:
  - none
  - Grookai pricing workers and pricing ingestion are unaffected
- Re-enable requirements:
  - implement and enforce OAuth state validation
  - verify token and account storage contract
  - verify callback routing and error handling end-to-end
