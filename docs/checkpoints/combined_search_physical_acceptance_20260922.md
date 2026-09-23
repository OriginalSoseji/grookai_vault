# Combined search physical acceptance — September 22

This local checkpoint extends the release checks; it is not deployment evidence.
Baseline: `426a749ed08d1dae500bcfecbd34f34692031f12`, plus the signed-out
navigation repair in `lib/main.dart` and the Android intent integration test.
Private evidence lives in
`C:/grookai_vault_operator_artifacts/combined_search_20260922/`.

## Physical Android shell

The Samsung SM-S908U (Android 16/API 36) passed the actual application journey:
normal password login with the contained owner fixture, visible onboarding and
dismissal, three owned cards, artist/name/reverse-holo search (168 matches),
finish removal (335 matches), and sign-out. These are synthetic fixture counts.
This initial shell run used the unchanged baseline native source, before the
additional sign-out repair below. Evidence: `physical-android-build.json`,
`samsung-signed-in-shell-verified.private.log`, and
`samsung-signed-in-{onboarding,owned,combined}.png`.

The private debug application uses `com.grookai.vault.combinedsearch20260922`,
displayed as Grookai Combined Search Local. Neither existing application
(`com.grookai.vault`, `com.grookai.vault.lockedacceptance`) was replaced.
Original package metadata is retained for before/after comparison.
After verification, the temporary app and its two owned ADB reverse mappings
were removed. Fresh metadata for both original installations matches the
before records; the reverse mapping list is empty.
The app API and web origins are device loopback ports 54321 and 3202,
forwarded by ADB to the existing Windows sandbox. No production account,
inventory, permission, schema or catalog was changed.

## Sign-out navigation repair

Reproduction: open the cold combined-search link as a guest, authenticate the
contained fixture, open a second search link while the application is running,
then end the Supabase session. Before the repair, replacing the home widget
left pushed search routes visible with cached ownership labels. Expected:
return to the signed-out root and dispose signed-in search/detail routes.

The auth listener now clears pending links/actions on a signed-out event and
pops pushed routes after the root rebuild. It checks that no new valid session
has appeared before popping. Initial guest link handling remains intact.
`integration_test/combined_search_android_intents_test.dart` checks cold guest
results, preservation through sign-in, a warm query with different constraints,
and disposal of the old query/ownership content after sign-out. It waits for
the route exit animation before asserting disposal; root visibility alone is
not evidence that the old route has finished leaving the tree.

This intent test uses SDK fixture authentication; normal UI password login is
covered by the separate full-shell journey. Its private manifest accepts the
local HTTP origin. Package-targeted VIEW dispatch tests native route handling,
not production HTTPS association or default-handler selection. The cold launch
clears only the isolated app's task; the warm launch uses single-top/clear-top
flags and retains the same activity/engine. No OS link defaults are changed.
Failed environment/driver attempts and the pre-fix failure remain private.

Final physical intent outcome: PASS. Cold guest and authenticated results kept
artist/name/reverse-holo constraints (168); the warm query removed finish while
retaining artist/name (335); sign-out disposed the old query and ownership labels.
Evidence: `samsung-links-verification.json`, `physical-android-links-build.json`,
`samsung-links-device.private.log`, and `samsung-link-{cold,warm,signedout}.png`.
The cold screenshot is covered by the OS notification prompt and is not clean
visual evidence. Warm and signed-out screenshots were inspected and are clear.
The APK records exact application and final test hashes; packaging changes were
restored byte-for-byte before committing.

## iOS and repository verification

The full iOS 26.5 simulator signed-in journey passed again with the navigation
repair: login, onboarding dismissal, owned/combined search, finish removal,
and sign-out. All 257 synchronized native payload files matched their expected
hashes. Receipts: `ios-session-cleanup-readback.json` and
`ios-session-cleanup.log`. This repeat provides functional evidence; the earlier
clean iOS screenshots retain their original a253902aa source attribution.

The complete local shipcheck passed at 2026-09-22T16:25:31Z: 4,046 contracts,
four documented skips, zero failures, and all 736 Flutter tests. Web typecheck,
lint/strict build, Flutter analysis, secret packaging, runtime preflight/health,
and report checks passed. Evidence: `physical-session-shipcheck-result.json`
and `physical-session-shipcheck.log`. The final test-only animation wait was
added afterward and received fresh targeted analysis/build/device verification;
application code is unchanged from that full gate. The local commit uses the
documented operator `--no-verify` path after the completed gate, not a waiver.

Physical iPhone acceptance remains OPEN. The iPhone 17 Pro was initially found,
and read-only inspection confirmed the existing build 324 and local wildcard
development profiles containing that device. It then disconnected; CoreDevice
and Xcode both report unavailable. No isolated iPhone build was installed or
existing app replaced. Reconnect/unlock the phone, establish a contained local
network route, then verify an isolated signed build. Simulator loopback forwards
are not physical-phone network configuration. Profiles alone do not establish
release signing or associated-domain entitlement compatibility.

Production-domain OS dispatch, live combined-query scale/catalog completeness,
deployment approval, and store distribution remain separate open gates.
