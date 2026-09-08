# Sealed Ownership Native Acceptance

Date: 2026-09-08. Local enabled acceptance, not production activation.
Previous release: [Clients 316](SEALED_OWNERSHIP_CLIENTS_316_20260908.md).

## Scope And Source

- Worktree: `C:/grookai_vault_pokemon_sealed`.
- Branch: `fix/sealed-lot-unpriced-acceptance`, based on documentation commit
  `d40860c36f40c4bb0f7c0e2f32b71071313b72af`.
- Deployed producer remains `5d823163eea470c31213de6f457e4e8124db0163`;
  TestFlight 316 and physical Samsung were not replaced in this gate.
- Emulator-only x64 builds target isolated Supabase through `10.0.2.2:55429`.
  The second build records the exact modified source hashes in its run plan.
  Never publish either local APK or install it on the physical Samsung.
- No production data, Storage, flag, migration, pricing or deployment writes.

## Native Proof

Android emulator `Medium_Phone_API_36.0` / `emulator-5554`:

1. Real local-auth login and enabled Vault show 22 synthetic active sealed
   copies, all unpriced. These are synthetic fixtures, not founder inventory.
2. Copy sharing opens Android's native sheet with the complete package identity
   and exact `https://grookaivault.com/gvvi/GVVI-CB221B65-000023` link.
   No message was sent. This synthetic ID does not resolve in production.
3. Native printing saves a one-page, readable PDF. Its rendered QR independently
   decodes to the same exact link. Android chose A4 output; this is not proof of
   A6 physical printer sizing, despite the application's A6 document layout.
4. Selecting two copies, entering a 35 USD bundle price and choosing Save Image
   opens Android sharing with two actual PNG attachments, each 1200 x 1680.
   Both exports were read from the app cache, hashed and visually inspected.
5. One selected fixture has a local test-logo photo; the other deliberately has
   no image. A blank placeholder there is not production image-coverage proof.

## Found And Repaired

The first native lot export showed missing item prices as `$0`, and a struck-out
`$0 value` beside the asking bundle price. This was a genuine presentation bug,
not a missing source quote or backend price regression.

- Missing item prices now render `Unpriced` on both sides.
- Only a complete positive estimate receives the comparative value label;
  partially priced lots no longer present a partial sum as the whole value.
- Positive item/reference amounts retain cents instead of rounding to zero.
- Existing source values, serialization, market evidence and seller prices are
  unchanged. No database repair is needed for this display correction.
- Rebuilt, restarted and retested the emulator. The second native exports show
  `Unpriced`, the entered `$35` bundle price, and no false zero-value comparison.
  Original and corrected artifacts are both preserved.

## Verification

- 37 original local SQL/concurrency assertions passed, including ten concurrent
  retries, ten distinct additions, and competing sale/trade arbitration.
- Local Auth/Storage passed: three uploads, five exact byte readbacks, private
  staging, atomic photo revisions, retained old signed URL bytes and anonymous
  signing denial.
- Added an SQL rollback test proving disabling additions preserves existing
  inventory, totals and disposition history. All 35 rollback assertions pass.
- 21 targeted Flutter tests pass, including two- and twelve-item unpriced
  front/back rendering, exact cents and unchanged market-reference controls.
- 75 targeted ownership/preflight contract tests pass; modified widgets analyze
  cleanly; syntax and diff checks pass.
- The first commit attempt lacked the existing runtime environment. With that
  environment loaded, full contracts and web checks passed, but the Windows
  Flutter runner stalled at the final file after 693 assertions. Only its
  positively identified tester was stopped. Both tests in that file passed in
  the focused retry. Preserve both logs and require the full normal commit-hook
  retry; no hook was bypassed and no assertion was weakened.
- Repaired the local replay runner's obsolete four-pending-migration expectation.
  It now requires an empty pending set because all five migrations are applied.
  This does not bypass preflight or authorize another production apply.
- Strict PrePush and all 392 migrations replayed successfully in the named
  disposable database, then the 35 rollback tests passed again.
- Final local readback: ownership false, zero sealed copies, zero request rows,
  zero synthetic users. Populated local project on port 54330 was untouched.
- Temporary local web harness and emulator were stopped. Temporary emulator
  loopback forwarding was removed. No physical-device data was cleared.

Production readback at 12:40 UTC: ownership false, zero sealed copies/request
rows, 3,401 total existing copies, three dispositions, 392 migrations;
170,404 cards, 3,397 sets, 32,903 traits.

## Browser Limitation

MTG production catalog rendered product names, prices and image elements;
sanitized DOM is saved. The browser transport then disconnected repeatedly.
Loaded-image, interactive web Vault/Wall and enabled local browser acceptance
remain unverified. Do not describe DOM presence as completed image loading or
reuse the previous SSR proof as browser interaction proof.

## Exact Remaining Gates

1. Release this small lot-display repair through normal review/checks; do not
   claim it is already in TestFlight 316 or deployed web.
2. Finish browser Vault/Wall, image loading and enabled cross-client acceptance
   once browser control is stable. The local test account was reset; recreate
   through the existing isolated fixture/harness commands, not production.
3. Resolve the production canary scope: current server control is global, with
   no account allowlist. Do not turn it on and call that a one-owner canary.
   Any account-scoped server capability needs its own governed migration plan;
   existing applied migration receipts must not be reused as authorization.
4. Complete bounded production owner lifecycle/media/readback and native iOS
   share/print verification before broad activation. No founder fake fixtures.
5. Activate only after acceptance, then monitor additions, totals, media failures
   and disposition reconciliation. Default-off deployment is not completion.

## Artifacts

All artifacts are outside the checkout under
`C:/grookai_vault_operator_artifacts/sealed_ownership/`:

- `20260908_ownership_acceptance/`: native PNG/XML, before/after lot attachments,
  PDF/QR readback, production/local DB readbacks and targeted test log.
- `2026-09-08T12-22-26-005Z_fixtures/`: original SQL concurrency and media logs.
- `2026-09-08T12-26-09-715Z_android/`: original local APK source/build proof.
- `2026-09-08T12-38-44-443Z_android/`: corrected local APK source/build proof.
- `2026-09-08T12-44-54-907Z_replay/`: strict replay and final rollback proof.

The first PDF pull captured a zero-byte file while Android was still writing;
readback after completion verified 5,470 bytes and a decodable QR. An early
post-restart UI capture had no accessibility root; subsequent settled captures
are retained. Neither transient capture is represented as product acceptance.
