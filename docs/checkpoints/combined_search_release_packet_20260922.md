# Combined search reconciled release packet — September 22

Frozen candidate: `f53ea3bb4f80b49540bbb4cb65c51426d8d81485`.
Current main `76ff8b32b84f04d0482bf51678478d2d0a35d5dd` is included.
The merge adds only five founder dashboard JSON snapshots. All five parse, and
the application code is identical to the tested `ed8645b93` repair. No new full
shipcheck is claimed for this documentation-only reconciliation. The existing
4,050-contract/736-Flutter gate and subsequent scale receipts retain their source
attribution. `release-next-source-manifest.json` hashes 2,269 tracked runtime files
and links the relevant evidence to the frozen candidate.

## Fresh live readback

At 21:33:07 UTC, Vercel production and the public health endpoint agree on
`dpl_8pGjGm9tHyk9i6i3gxJ9hpaiFyhF`, sourced from current main, READY. This is the
new observed rollback reference, replacing the older preflight observation.
It was not created or promoted by this step. Both association files still match
the candidate bytes. The Samsung debug build still does not match the published
release certificate and does not verify production-domain dispatch.

Evidence: `release-next-readback.json`. Re-read these external pointers before
any separately approved release. No candidate deployment or store upload occurred.

## Physical iPhone preparation and blocker

CoreDevice and Xcode initially both reported the iPhone 17 Pro available, running
iOS 27.0 with developer mode and DDI services enabled. Existing Grookai build 324
was read back. A fresh check matched all 225 native source/dependency files with
the frozen Windows candidate before building on the Mac.

An isolated development test app successfully built and signed, using the existing
manual wildcard development profile already covering the device:
`com.cesar.grookaivault.combinedsearch20260922`, display name Grookai Search Local.
It is not a store artifact or a replacement for the installed app. Its private
packaging removes production associated-domain/push entitlements and URL schemes,
permits the contained LAN fixture route and supplies only local test credentials.
Original project, plist and entitlement bytes are restored after every build.

The first signing attempt selected an Xcode-managed profile with manual settings;
the next exposed SSH `errSecInternalComponent`. Using the existing manual profile
and the documented desktop Terminal signing workflow succeeded. No certificate,
keychain permission, account or provisioning resource was created or changed.
The separate permission helper also built successfully. These are build outcomes,
not runtime acceptance.

Before installation/launch, the phone disconnected again. CoreDevice subsequently
reported unavailable, Xcode could not select the physical destination, and the
Flutter driver remained at “Waiting for … iPhone to connect.” No test step or
physical screenshot completed. **Physical iPhone acceptance remains OPEN.**
Reconnect by cable, leave it unlocked on the Mac's Wi-Fi, then rerun the prepared
isolated journey. Do not convert the earlier simulator pass or this signed build
into a physical pass. A temporary LAN relay must run only for the contained test
and be stopped afterward; it is not a hosted staging deployment.

The waiting attempt was stopped. Readback confirms no listeners on either owned
LAN relay port, temporary test/driver sources removed, original iOS packaging
restored and all 225 native files still matching. The driver never progressed
beyond waiting for the device; no installation or journey was observed. Fresh
on-device application metadata cannot be read while it is disconnected, so no
post-device readback is claimed. `iphone-next-cleanup.json` records this boundary.

The prepared journey covers normal password sign-in, onboarding, owned cards,
combined search, finish removal and sign-out. It does not establish production
universal links or release signing. Current iOS search association expansion
remains deferred for older-client compatibility.

Private artifacts:
`C:/grookai_vault_operator_artifacts/combined_search_20260922/`, with Mac counterparts
under `/Users/cesarcabral/grookai_operator_artifacts/combined_search_20260922/`.
Use `iphone-next-readback.json`, `iphone-next-build.json`, the native source manifest
and private driver/signing logs. Private LAN defines and fixture credentials must
remain outside the repository and public report.

## Remaining release work

1. Complete the physical iPhone journey with a stable connection.
2. Verify production Android dispatch using the approved release signing identity;
   do not add the debug certificate to production association files.
3. Verify candidate performance in representative approved staging/production
   conditions. Larger local fixture results are complete but not production proof.
4. Review exact web and native rollout artifacts separately before deployment or
   distribution. Retain the current AASA bytes until older-client compatibility
   supports expansion, and refresh rollback pointers immediately before release.

CS-CATALOG-01 remains separately governed catalog work. These search checks do
not complete the broader app/web audit or Vendor Mode work.
