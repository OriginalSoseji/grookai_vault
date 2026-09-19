# Full native storefront authentication proof — September 18, 2026

## Result

The physical Samsung SM-S908U passed the full production Dart app's email-login,
refresh and pending storefront/product navigation journey against the retained
real local Supabase environment. This follow-up also prepared the integration
review. It did not merge, push, deploy or apply any migration.

Candidate worktree: `C:/grookai_vault_storefronts_v1`, branch
`feature/vendor-storefronts-v1`, HEAD `a14388f689235d62b3165c1dd88aaa4c562ab186`.
The initial 131-file manifest was verified before work. Previous implementation,
Supabase and device receipts remain unchanged. See `starting-source.json` and
`final-source.json` for the complete source boundary.

## Physical proof and correction

A separate Android package, `com.grookai.storefrontauthproof`, imports the actual
candidate as a path dependency and invokes `package:grookai_vault/main.dart`'s
`main()`. It exercises the production `MyApp`, profile/auth gate, `AppShell`,
`LoginPage`, AppLinks listener, Vendor Mode and store screens. It does not replace
login with a token-injection screen or a custom route dispatcher. Every common
Dart dependency version matches the candidate lockfile.

Real Android VIEW intents arrive while the app is signed out. The actual email
form signs into real local GoTrue accounts; the pending destinations then open.
The integration test checks:

1. Store destination survives sign-in and loads its selected custom collectible.
2. Real refresh rotates the refresh token while the store route stays mounted.
3. The app drawer opens existing Vendor Mode, then Manage store; settings save
   through the authenticated owner API and the already-published slug stays frozen.
4. Product UUID and `preview=1` survive owner sign-in; private Storage imagery loads.
5. A separate visitor signs in and sees the app-published product without private SKU.
6. That visitor's request for the owner's preview returns unavailable, without
   product details. Final sign-out clears the session.

The first complete journey reached all route assertions but failed Flutter's
rendering checks: the floating `Saved` notice was laid out off screen when returning
from store management. `AppShell`'s mobile bottom dock contained an `Align` that
expanded vertically to the available scaffold height. Adding `heightFactor: 1`
constrains it to its child's height, leaving room for floating notices. This is the
only production behavior change in this follow-up (`lib/main_shell.dart`).

The physical test now asserts the actual bottom dock height is below 180 logical
pixels and repeats the store-save/return/auth journey. The rerun passed with no
rendering exceptions. The original failure is retained in `snackbar-failure.json`.
No unrelated Vault-add behavior was changed.

| Verification | Result | Evidence |
|---|---|---|
| Full app on physical Samsung, real local Auth/API/Storage | 1 integration test, six journey assertions, passed | `journey-receipt.json`, `journey.log` |
| Storefront, custom collectibles and mobile navigation regression | 25/25 passed | `regression.log` |
| Production `main.dart` and `main_shell.dart` analysis | no issues | `production-analyze.log` |
| Harness entry/test analysis | no issues before device execution | recorded command below |
| Local database readback | both accounts signed in; store state retained; workers/cron execution zero | `database-readback.json` |

The executed debug APK hash, production source hashes and harness boundary are in
`build-source.json`. Five `native_*.png` files capture store, settings, owner preview,
visitor product and denied preview states. Owner preview and denial captures were
visually inspected. The test package was absent after Flutter's test cleanup;
only the pre-existing `com.grookai.vault` and `com.grookai.vault.lockedacceptance`
packages remained. A redundant uninstall returned package-absent failure; it did
not remove either existing app.

## Isolation and reproduction

The retained `grookai-storefront-verification-20260918` containers were restarted
without reset, replay or new schema changes. They retain the 397-migration proof.
The database remains on its internal network with `max_worker_processes=0` and
zero cron runs. Only local synthetic accounts, profile settings and store records
were created. No canonical fixture changes were needed in this follow-up.

The test app's Firebase platform implementation rejects initialization before
calling native Firebase, and native auto-collection metadata is disabled. Dart
HTTP connections are restricted to `127.0.0.1:16421` and `127.0.0.1:15440`, routed
through this device's ADB reverse mappings. The actual app resolves its Supabase
and web endpoints from local-only Dart defines. No production environment assets
or service-role credentials are embedded. The Next server retains the previously
proven loopback guard and disabled telemetry.

Build preparation initially hit a Java repository certificate error. Offline mode
then exposed missing dynamic-version metadata. The isolated Android test build
pins its cached `androidx.test:runner:1.3.0` and uses Gradle offline; it does not
change the production Android build, installed SDK, system trust store or TLS
verification. `DEBUG` is cleared for the launcher to prevent Gradle echoing build
arguments. Failed raw build logs and local fixture secrets stay in ignored `.local`.
The committed successful journey log is checked for credentials before retention.

Checked-in reproduction files under `scripts/tests/`:

- `prepare_storefront_full_app_v1.mjs`
- `storefront_full_app_fixture_v1.mjs`
- `run_storefront_full_app_v1.mjs`
- `storefront_full_app_boot_v1.dart.template`
- `storefront_full_app_auth_v1.dart.template`

Preparation uses `flutter create --no-pub --platforms=android --org com.grookai
--project-name storefrontauthproof .local/storefront/native_auth`, followed by the
preparation/fixture scripts, `flutter pub get --offline` in that directory, and
`flutter analyze --no-pub` on its entry/test files. Preserve an already prepared
harness and fixture instead of overwriting them. Start the guarded real-backend web
launcher, add only the dedicated 16421/15440 ADB mappings, then run the orchestrator.
The runner requires one connected device, reads its serial dynamically, and sends
explicit VIEW intents only to the separate test package. Device serials and fixture
passwords are excluded from retained receipts. The checked-in runner's automatic
single-device selection replaces the hard-pinned device selection used in this
execution; the APK and test journey themselves are unchanged.

## Integration and remaining release boundaries

Read `INTEGRATION_REVIEW_20260918.md` and `integration-review.json`. Current main
`83b2283a09ad1893e10fcd27d5d8ceb6dbaf4d6d` adds only catalog audit data since the
candidate base. Its changed files do not overlap this candidate. PR #473's native
`main.dart` combines cleanly in a three-way scratch merge. Its operator-playbook
checkpoint conflicts with prepended checkpoints; the proposed resolution retains
both. Review-only patch illustrations are included. Neither branch was changed,
and no messages or review requests were sent to other contributors.

This proves real password authentication, explicit refresh and pending Android
intents through the full Dart app. It does not prove Google/provider OAuth, iOS,
verified production Universal/App Links, cold-process intent/session restoration,
or a release-signed installed client. The native store-settings path was tested
with a preconfigured synthetic store; a complete fresh-account branding-picker
journey is not newly claimed. Previous independent upload/authoring/device and
real Supabase proofs remain valid at their recorded boundaries.

Coordinated integration still needs the complete Vault-add branch's tests and
current catalog repair dependency-fingerprint review before any production schema
application. Preserve the dirty mapping worktree. Billing, checkout and domains
remain outside this work. Rollback keeps presentation data and Vault ownership;
disable the new store surfaces through the governed rollout switches.

Task services and device mappings are stopped/removed after proof, with local
volumes, database fixtures and build evidence retained. No shared Docker restart,
shared database reset, remote migration, production grant, worker activation,
payment, push, merge or deployment occurred in this follow-up.
