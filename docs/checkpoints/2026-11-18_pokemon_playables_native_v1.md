# Pokémon playables native consumer — November 18, 2026

The accepted usage feature is live on web, with ordinary, full-art and SIR
versions. This continuation adds native search grid/list and card-detail badges
from the same public projection. It extends the existing shared resolver client
instead of adding a native parser or classification engine. See
[the native consumer contract](../contracts/POKEMON_PLAYABLES_NATIVE_CONSUMER_V1.md).

The native resolver now forwards `playable=1` and preserves playable intent
through empty-result retries. Search interpretation retains the server's typed
playable flag. Visible consumers share a bounded public read, refresh once per
minute and on resume, and remove highlights on expiry, revocation, malformed
data or failed refresh. A playable search requires current published membership
and clears expired results while retaining the query, interpreted filter and
retry. Ordinary browsing, ownership and pricing remain independent.

Before implementation, canonical environment readback showed 173,837 card
prints, 3,420 sets, 47,409 traits and 325 Vault items. Live `/api/playables`
served 269 current positive printings. No schema, canonical, mapping, pricing,
ownership or competitive-source writer is added.

The initial Samsung read showed `com.grookai.vault` 1.0.0 build552; a later
pre-update read at 2026-11-19 05:32 UTC showed build555, followed by build556
with device update time 2026-11-18 22:54:54 local. The shared Android/iOS
candidate is build600, leaving room above concurrent device updates, with matching
App Store Connect build metadata paths. Source is isolated at
`.tmp/pokemon_playables_native_checkout_20261118`, branch
`feat/pokemon-playables-native-20261118`, based on
`d143f4128df1a1ea6ea206c82075b1af9d91ad10`. Preserve unrelated root changes.

The initial 28 focused native checks passed, including actual search-expiry behavior;
native analysis is clean. Platform and presentation checks, normal hooks and hosted checks remain
required before release. For a device update, verify a higher version and the
same signer with `scripts/android_update_preflight.ps1`; never uninstall or
clear data. A prepared Android artifact is not a completed paired mobile/store
release. Retain actual source/build/signer/device and live API readback before
claiming activation. No App Store submission is part of this checkpoint.

The first managed check stopped at web landing-page static generation: the
shared local Docker service accepted connections without returning data, and
preview reads had no deadline. Read-only preview transport now retains caller
cancellation and adds a five-second deadline, allowing the existing metadata
failure fallback. Production transport and source-access rules are unchanged.
The failure log is retained; normal hooks must pass again after this repair.

PR964 review identified and corrected two native/public consistency gaps:
cached badge mounts now retain the original one-minute refresh deadline, and
native accepts the public reader's full 20,000 rows / 4 MiB bounds. The 20
playables checks passed after these changes, including a badge mounted at
59 seconds refreshing at 60 seconds, acceptance of 20,000 rows, rejection of
20,001 rows and rejection above 4 MiB. First-revision normal managed commit
and push checks passed with 2,087 native tests and two existing skips; the
revised source still requires normal hook and hosted-check verification.
The in-progress revised commit hook was stopped when the higher installed
build was observed; its log is retained. Normal checks must run again against
the aligned candidate, followed by a fresh pre-install device check.

The revised build556 source passed the complete normal commit gate: 8,781
contract checks (11 existing skips), backend/web checks, clean native analysis
and 2,090 native tests (two existing skips). A Windows test-process startup
stall was retained as a failed run; the unrelated sales file passed both tests
in isolation and then in the full retry. The subsequent push was stopped after
observing installed556. The metadata-only build600 update requires the same
normal gates before source publication; no downgrade or uninstall is allowed.
