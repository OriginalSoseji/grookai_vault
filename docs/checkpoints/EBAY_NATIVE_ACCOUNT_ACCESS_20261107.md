# eBay native Account access — November 7, 2026

## Finding

The production signed-in native seller endpoint was checked on the Samsung
session and returned HTTP 200 with the expected linked account state and 18
drafts. A saved draft read through `GET /api/ebay/seller?draftId=…` also
returned HTTP 200. No listing was published and no draft was modified.

The source used for the current main release did not expose the eBay seller
workspace from the Account screen. The tile existed only on a separate feature
branch. The Account screen now surfaces **Connected accounts → eBay seller
account**, opening the existing native seller workspace and its connect or
reconnect flow.

## Prevention

Added `EBAY_NATIVE_ACCOUNT_ACCESS_AND_RELEASE_V1` to pin the Account entry,
bearer identity propagation to user-scoped Supabase RPCs, exact-candidate
readback, and production Android package/signing continuity. Its contract test
guards both the UI entry and the server identity boundary.

## Release state

The working branch is based on current `origin/main` commit
`ad1df583530813ef211ff8acecc10f9b6dc74553`. The production server already
returns the expected account state, so no backend deployment is needed. The
native Account entry required an app update. The Samsung had
`com.grookai.vault`, versionCode 525, signed by the local Android debug
certificate. The production-signed GitHub artifact (run `42455551230`, build
526) correctly failed Android's in-place signer check, so it was not installed.
The existing local debug key matched the installed certificate; a same-package
debug APK at versionCode 526 was then installed in place, preserving app data.

On the phone, Account → Connected accounts → eBay seller account opened the
existing signed-in eBay listings workspace and displayed the collector's
existing drafts. The live native seller API and a draft read both returned
HTTP 200. No listing was published and no draft was modified. The installed
build is a device QA build, not a production-signed release.

## Operator workflow follow-up — November 9, 2026

The hosted `build_number` override, production/debug signer rules, and
post-install seller readback steps are now indexed in
`docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md`. The native Account access contract
test also guards these operator instructions so future workflow changes keep
the durable instructions in sync.
