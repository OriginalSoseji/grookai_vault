# Notification controls — October 8, 2026

Candidate: `C:/gv_product_notifications_20261008`, from qualified collector
usability `5bafd6f3f34e959bafea0afe562face0543580e6`. The external
`product_notifications_20261008/CHECKPOINT.json` owns current qualification status.
This is part of the complete DeckTradr-driven overhaul, not its completion.

Account now opens explicit notification preferences on web and native. Existing
owner-only `notification_prefs` remains the authority. Cadence edits write only
the changed field. Quiet hours save a complete start/end/timezone together;
disabling them preserves cadence and timezone. Missing rows use existing defaults
without a write. Failed reads and unconfirmed saves require recovery rather than
silently inventing defaults. Weekly updates are explicitly described as unavailable;
their control saves a preference for future support.

Native permission prompts require an explicit action. Device synchronization is
serialized and bound to the captured owner; token RPCs retain that owner's session
header. Account replacement retires the physical token before registering another
and clears this app's delivered notifications. Retirement failure blocks new
registration. Private settings close on account replacement, including delayed
responses. Saved, Want, Watch and operations alerts retain their existing meanings.

Quiet-hour calculations now find the actual end instant across daylight-saving
changes, including repeated/skipped times, midnight and fractional offsets. The
418 selectable timezones are shared between web/native and checked against local
Deno. Existing unsupported zones remain visible for review. No SQL bytes changed;
source remains438 and the inherited exact release package437 excludes deferred
receipt delivery. Production remains429, pending the same eight migrations.

Runtime evidence uses three synthetic accounts in retained local438 at
127.0.0.1:35521. The dedicated fixture retains all361 prior table sets, changes no
global controls, creates no public profiles, and disables only its synthetic tokens
on restoration. Auth/RLS proof covers14 cases. Browser proof covers12 scenarios,
including 320px keyboard access, partial saves, lost replies, read failures, legacy
quiet settings and real cross-tab account replacement.

Samsung build441 uses the separate `com.grookai.vault.notificationsproof` package.
Its messaging provider is fake; Auth, preference/token RPCs, SharedPreferences,
native notification cleanup and the full-app Account entry are real. A debug-only
method can post one synthetic OS notification only in that exact proof package.
The device proof verifies its removal after account replacement. This is not FCM
or APNs delivery verification. Existing primary and earlier proof apps remain intact.
Physical iOS remains unverified pending the two previously requested Mac-local
permissions. Do not re-ask, retry or bypass them.

Docker's Windows backend crashed during setup. Existing Docker was restarted;
no container, volume, lab or original seal was removed. The separate recovery
receipt `docker-recovery-1791513795133/result.json` verifies all ten exact-package
databases against their original seals, allowing only attested IP changes. Original
qualified checkouts remain clean. `product_notifications_parent_v1.mjs` validates
that recovery without rewriting historical evidence or rerunning the pre-change
baseline against modified source.

Use only the dedicated notification fixture, Auth, web, evidence, check and release
helpers in this checkout. The release gate and CLI inspection offer no production
apply operation. The reviewed evidence manifest binds runtime results, images,
source and producer hashes. Freeze product inputs before ordinary commit checks;
retain failed runs and archived APKs. Current-source native outputs were compressed
losslessly only after builds completed, with content/path/write-time verification.

After this slice, continue R4 portability, store/distribution and measured competitor
tasks. Provider activation, production deployment and a claim of competitive victory
are not implied by local qualification.
