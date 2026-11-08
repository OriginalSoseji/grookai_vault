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
native Account entry requires a signed app update. The installed Samsung
package is `com.grookai.vault`, versionCode 525; this checkout's baseline uses
versionCode 410. Do not install a lower or differently signed APK. The seller
draft remains unpublished.
