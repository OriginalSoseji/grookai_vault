# Storefront release execution — September 19 UTC

The founder confirmed buyer checkout and seller payouts, selected the existing
Grookai Stripe account, and deferred custom domains. The finished goal includes
paid subscriptions and commerce; the browse-only candidate is its first release.
Canonical store URLs use the verified `grookaivault.com` domain.

## Completed in this release turn

- Published draft PR #496 after the full commit and push gates. The PR is mergeable
  and includes #473's already-tested Vault-add changes. No merge has occurred.
- Fixed local Next build configuration cleanup without hook exceptions. Six runtime
  tests cover known generated edits, unrelated edits, and production isolation.
- Fixed CI's legacy-key findings in four local harnesses using the CLI's modern
  publishable/secret fields. Each credential passed a read-only local API request.
  The key guard remains unchanged. Full commit/push gates pass: 3,910 Node tests,
  three skipped, 748 Flutter tests, web typecheck/lint/build and Flutter analysis.
- Refreshed production schema/security evidence against the bound formal baseline:
  zero SQL differences and all 893 inspected security objects match. The production
  migration dry run selects only `20260919050000_vendor_storefront_release_v1.sql`.
- Prepared a separate Mac worktree, passed 96 relevant native tests and built iOS
  archive 325 from `7a13b553278aced661a35ffd8457727b448a7fb3`. Signature, bundle identity,
  version, Runner/App symbols and existing sealed-feature configuration passed.
  Later commits change only local harnesses and documentation, with native build
  input parity verified. Existing Mac worktrees and archives remain preserved.
- Documented and configured the previously absent server-only referral encryption
  key in the existing Vercel project's production environment as a sensitive value.
  The current deployment pointer is unchanged; the key takes effect only on a new
  deployment. No key values appear in this receipt or source control.

## Direct findings and limitations

Vercel branch preview failure is the existing explicit production-target activation
guard, confirmed in its deployment events. It was not weakened. Hosted source,
Windows, visual and security checks must be reconciled on the final PR head.

The first Mac preparation passed tests but returned a trailing Windows line-ending
error; a normalized-LF rerun exited zero. SSH archive signing then reproduced the
documented `errSecInternalComponent` error. The same command succeeded in a new
recorded Terminal window in the existing desktop session. Keychain permissions,
certificates and passwords were not changed. The archive job is terminal with exit
zero. The archive has not been uploaded or claimed as installed-device proof.

Apple's current public iOS version is `PREPARE_FOR_SUBMISSION`. Existing TestFlight
build 324 is VALID and its audience was read back. TestFlight delivery, public store
review and physical installation must not be conflated. iOS/provider authentication,
cold-start routes and verified production links still require runtime evidence.

The nominated pilot account list and private Stripe test-credential location are
pending founder input. No Stripe integration, subscription collection, checkout,
reservation/order/payment ledger, refund, dispute or payout implementation is claimed.
Browser access failed to initialize through both provided runtimes, including a reset;
that does not imply the user's existing Stripe account is missing.

No production migration, store grant, feature activation, website promotion, native
upload or payment action has occurred in this checkpoint. Continue through the
requirements in `docs/ops/STOREFRONT_GOAL_RELEASE_20260919.md`; do not mark the full
goal complete from this release preparation. Rollback retains additive owner data
and disables storefront availability while restoring prior clients.

Sanitized evidence: `status.json`. Detailed logs, Apple receipts, archive manifest,
schema snapshots and environment receipt remain under ignored
`.local/integration/goal-release/` and the dedicated Mac operator artifact directory.
