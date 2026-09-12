# Collector Shared Binder Browser Verification V1

September 11, 2026. Local collector preview only.

- Exercise the actual Next website and existing Supabase RPCs with synthetic users.
- Create a new private custom Binder; do not change another Binder or its members.
- Temporarily enable only the local database `shared` gate and the matching web
  gate. Save/read back the original flag state and restore it in finally.
- Start the local launcher with `-SharedBinders`; it generates a process-local
  invitation encryption secret. No production secrets, email dispatch, public
  listing, view links, notifications, migration, deployment, or Set Binder gate.
- Test owner invitation, explicit recipient acceptance, one-use replay denial,
  exact-copy contribution and withdrawal, member departure and outsider access.
- A member's cards stay in their Vault. Compare full original catalog/Vault rows
  and verify all test copies remain unchanged after Binder operations.
- Preserve failures and non-secret readback outside Git. Never record invite
  capabilities, session cookies or credentials in screenshots/reports.
- Synthetic Binder/account fixtures remain private and local. Restore feature
  flags and normal server mode at completion; do not clear data to make tests pass.

## Verified Repair Boundaries

- Secret-link paths may be rebased only from the canonical/configured origin onto
  the configured site. Reject foreign origins and malformed capability URLs.
- Both handoff and response redirects preserve the configured login origin.
- Raw token routes remain no-referrer. Only the fixed token-free review page uses
  same-origin policy, preserving native POST Origin without cross-origin referrers.
- Do not weaken Origin, CSRF nonce, encryption, HttpOnly, expiry or one-use checks.
- Fresh synthetic owners isolate repeated tests from earlier fixtures. Rate limits
  remain active. Reconcile every original row and the one explicit test-copy delta.
- Rendered screenshot proof requires the checklist action and a decoded artwork
  image before capture at 1440 and 390 pixels. Loading skeletons are not proof.
