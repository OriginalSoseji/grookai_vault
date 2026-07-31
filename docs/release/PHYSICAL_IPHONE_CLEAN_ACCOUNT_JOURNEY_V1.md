# Physical iPhone Clean-Account Journey V1

## Purpose

This gate proves that TestFlight Build 258 supports the complete collector
journey on a physical iPhone. Flutter tests, Xcode Cloud, and database probes do
not replace this device proof.

## Fixed Release Inputs

- TestFlight build: `1.0.0 (258)`
- App-producing commit: `35c8bff9cc4368dec05e61b3739322c2f0c524f1`
- Distribution: internal Friends and Family

## Device Procedure

1. Install Build 258 from TestFlight on a physical iPhone.
2. Start a continuous screen recording before opening Grookai Vault.
3. Sign up with a new account created for this gate.
4. Search for a card and open its exact card-detail screen.
5. Add one copy to the Vault and confirm it appears in the Vault.
6. Create a personal Binder and confirm it appears in the Binder library.
7. Set the owned copy to `trade`, `sell`, or `showcase`. For `sell`, save a
   positive asking price.
8. Open the relevant activity surface and confirm the resulting collector
   activity is visible.
9. Stop the recording and retain it outside the repository.

Do not use an existing populated account. Do not include passwords, email,
device serial numbers, tokens, or private messages in the recording or
evidence JSON.

## Evidence File

Copy
`docs/release/physical_iphone_clean_account_journey_v1.example.json` to a
private location outside the repository. Set each confirmation only after the
step is visibly proven. Point `artifact_paths` at the screen recording or
screenshots. The verifier stores only each artifact's ordinal number, byte
count, and SHA-256 hash. It does not retain the original path or filename.

## Read-Only Reconciliation

Run from a clean checkout containing the verifier:

```powershell
$env:RELEASE_JOURNEY_SUBJECT_USER_ID = "<new Supabase auth user UUID>"
node scripts/audits/release_clean_account_journey_readback_v1.mjs `
  --window-start=<signup-start-UTC> `
  --window-end=<test-end-UTC> `
  --expected-app-commit-sha=35c8bff9cc4368dec05e61b3739322c2f0c524f1 `
  --expected-testflight-build=258 `
  --device-evidence=<private-evidence-json> `
  --require-pass
```

The verifier opens a read-only database transaction. It requires:

- the account was created inside the test window;
- an owned card instance was created inside the window;
- a Binder and matching `binder_created` event exist;
- a non-hold exact-copy intent and matching `vault_intent_changed` event exist;
- a matching `vault_added` event exists;
- no card-event emission failure exists for the subject in the window;
- all device confirmations and at least one hashed artifact are present.

Artifacts are written under
`artifacts/release/clean_account_journey/<timestamp>/`. They contain a subject
hash, never the email or raw user UUID.

## Stop Conditions

Stop and preserve evidence if any app step fails, the app crashes, an event is
missing, a database relationship does not reconcile, or the verifier reports a
finding. Do not mark the physical-device gate complete from screenshots alone.
