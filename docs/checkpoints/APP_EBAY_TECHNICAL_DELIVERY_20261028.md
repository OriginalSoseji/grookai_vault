# Integrated app and eBay technical delivery — October28,2026

This checkpoint records technical delivery through19:52UTC. The normal app and
server workflow are integrated and deployed. Actual seller consent/provider
readback and the Samsung foreground checks remain external qualification steps;
this is not a claim that an eBay account is linked or a listing was published.

## Delivered source and devices

PR830 merged as `a0d8e7da6c2777998dd6c6b95fb50ff2ba30b074` from qualified
source `b85c52f23013beca12dae6656d0543ddd4134257`. While checks ran, main received
five automated founder-ops snapshot updates. Four change collection timestamps;
the fifth rolls the91-entry trend window. Those updates were preserved. Every
other repository blob, including all native, web, backend and migration source,
is identical to the qualified source. GitHub's proposed merge tree and the final
merged tree both match `8d9751f2850e73ab32734a86a066b5b1bea3fe2e`.

Signed release510 uses the normal `com.grookai.vault` package. The production APK
SHA256 is `771b59f926be592a97c58c43992d5e16a6cbfc93197e12e58fa7a326dfb055ad`.
The Samsung-compatible release preview SHA256 is
`7d4e07f4f871cdf2d674c3d0ea3e727f6e362fb8a40c6305bdd5a941f29a3c4b`.
Both contain the same qualified app code; the latter retains the phone's existing
signing certificate. Both devices received update-only installs from508; no
uninstall or app-data clear occurred. Held509 remains preserved and was never
installed.

QA retained its signed-in Vault with11 cards and its private Binder cover,
requirements, order and privacy. A selected4×4 grid survived a full restart.
Release PNG export opened Android's real share chooser and was cancelled without
sending. After verification, the single private QA Binder was recoverably
archived through the owner SDK; its definition and every Vault copy remain.
The real Samsung installed510 but was locked for final foreground verification.

## Qualification and production readback

- Normal commit and push shipchecks passed:8,529 contract tests with11 existing
  skips,12 backend tests, native analysis without issues,1,977 native tests with
  two existing skips, web types/lint and strict production build.
- All24 hosted checks passed. Canonical Windows Samsung browser parity passed
  159 tests. All review threads, including the corrected URL assertion flagged
  by CodeQL, were resolved after their fixes were verified.
- Windows native test startup twice lost its local runner connection. The
  unchanged affected files passed independently; clean full runs then passed.
  Failed logs remain preserved. No tests or hooks were disabled or weakened.
- Official CLI applied exactly112000 and174000 from the verified479 baseline.
  Production481 has zero complete public-schema difference against both qualified
  targets, all1392 security entries equal,81 seller object fingerprints and39
  unchanged intake objects. Seller controls were off through this readback.
- The production deployment `dpl_66X9u8MNHxcCKianHZgvHFaf6Dsj` is ready on
  `grookaivault.com` for the exact merged commit.
- Six actual production HTTP/shared-Auth checks passed: anonymous/invalid bearer
  rejection, native bearer ownership, exact-copy entry, peer isolation, malformed
  draft rejection and foreign-origin rejection. QA inventory was unchanged.
- The actual production backend factory accepted the configured server settings
  and stopped disabled linking before creating an OAuth attempt or making any
  provider request. Controls stayed at revision1/off with an empty canary list.

Frozen480 SHA256:
`3f137899a0e2b442fdb9f2dc967c0a12eaa015467b5ea56167cfcb256602c0ff`.
Frozen481 SHA256:
`3707e988d663a4e70e52ddcfc9d60c34ee4fcb3dbd6c1ebf135f14d318c8a9c9`.
Both applied files, old480 proofs and the consumed recovery PrePush scope remain
immutable. Use a new exact forward scope for future schema work.

## Seller registration and remaining collector action

The existing OAuth-enabled RuName
`Grookai_Vault_L-GrookaiV-grooka-xwlbq` retains its original production keyset.
eBay accepted and persisted these settings, independently checked after reload:

- Display title: `grookai vault`.
- Privacy URL: `https://grookaivault.com/privacy`.
- Accepted/declined URL:
  `https://grookaivault.com/api/ebay/seller/oauth/callback`.

No actual seller grant, provider listing, price/photo choice or publication has
been made. Next, verify the Samsung's actual signed-in account, open a bounded
linking canary for that real collector through `ebay_seller_set_control_v1`, and
have the collector complete eBay consent. Read back the immutable provider
identity and seller setup through the qualified server authority. Keep QA
accounts separate. Any later activation needs its own current-state,
revision-checked receipt; the static checkpoint is not activation authority.

TCGplayer condition links, eBay active/sold searches and scanner paths retain
their previously verified source. Their last real Samsung checks passed on506;
the final510 foreground checks await unlock. No founder inventory was changed.

## Follow-up Android menu correction

The subsequent QA510 foreground review reproduced Android system Back leaving
for the launcher while the collector menu was open. The root shell now advertises
Back interception while that menu is open, closes the menu on Back, and releases
interception after closure. Dialogs above the menu retain their normal priority.
The shared dock label has an explicit 1.2 line height to prevent a measured 2px
Scan-label overflow with bundled Roboto, without changing dock geometry.

Three actual-AppShell widget regressions passed with bundled Roboto and Android
platform behaviour: phone menu Back, desktop menu Back, and a dialog above the
menu. Both menu tests also verify that ordinary root Back can still exit after
the menu closes. The correction is prepared for signed511; this checkpoint does
not assert that511 has already been installed or device-qualified.

Preserve later build/install/device readback under protected
`app-source-preservation-20261028/android-511-candidate-v1`,
`android-511-device-qa-v1/upgrade-qualified.json`, and
`android-511-samsung-preview-v1`. Missing qualification receipts do not establish
success. The native-shell correction needs no migration apply. Production481 and its
immutable proofs remain unchanged. The subsequent provider-response repair below
adds a separately qualified backend code change.

The follow-up incorporates pricing-retention PR831 at
`37cda8886e42278285b8da984adfb413ec483e9a`, preserving its workers, tests and
operator notes. Earlier in-progress checks were superseded when that main update
arrived; qualification must run against the combined source. The native source
was retained through the clean fast-forward and exact scoped stash restore.

## Collector connection completed at21:13UTC

This supersedes the earlier pending-account/consent statements. The Samsung was
unlocked through its existing credential and its actual signed-in Account hub
was matched to the exact public profile and shared Auth record. No credential
was saved in repository documentation or client configuration.

The existing revision-checked service authority moved seller controls from
revision1/all-off to revision2/linking-only with exactly that verified collector
in the canary list. Preparation and publication remain off. Native Connect eBay
returned through the registered production callback without presenting the
agent with a new consent button. Independent SDK readback verified the fresh
linked OAuth attempt, the correct grookai owner, a non-empty immutable production
provider identity and ready token state. Opening grookai from the return page
showed the connected seller account in the actual native workspace.

Preserve protected `ebay-seller-labs-v1/production-collector-device-identity-v1`,
`production-seller-linking-canary-v1`, and
`production-seller-consent-v1/result.json` with its private readback. Identity
and token data remain protected. No listing, photo, price or inventory mutation
was made. Further preparation/publication activation requires a separate current
control readback and receipt; this connection is not a published listing.

## Actual provider metadata response correction

The connected seller has four fulfillment policies, two payment policies, three
return policies and one enabled inventory location. Live GET qualification found
that eBay's card-aspect dictionary is2,657,707 decoded bytes with35 aspects, larger
than the client's2,000,000-byte response ceiling. The deployed client rejected it.

The follow-up allows4,000,000 bytes exclusively for the exact taxonomy
get_item_aspects_for_category GET endpoint. Other responses keep the2MB ceiling;
redirects, pinned origins, timeouts and write uncertainty remain unchanged. Empty
successful GETs cannot qualify metadata. Three added transport regressions cover
complete large dictionaries, over-limit/malformed responses and empty reads while
preserving legitimate empty write acknowledgements. All18 transport tests pass. The full focused seller contract run passes119 tests.

The native authenticated metadata action accepts an8MiB composite envelope for
the aspect dictionary plus seller policies. Workspace, draft and publish
responses retain their2MiB limit. Both added native regressions pass with all
seven transport tests; focused analysis reports no issues. Signed511 must carry
this native correction together with the menu Back fix.

All seven real provider GETs pass with the corrected client: policies, location,
category tree, condition policies and35 aspects. Provider listing writes and
inventory writes remain zero. Protected proof:
`ebay-seller-labs-v1/production-seller-provider-readback-v2/result.json`, bound to
client LF SHA256 `89600589df0d2008903eba042280f07afd8676a44a047687fb4b0357f09d994b`.
The failed original read and size diagnostic remain preserved.

This is a backend code release, requiring normal checks, hosted review and the
merged web deployment before enabling preparation. The historical481 package,
source in `C:/gv_ebay_integrated_20261028`, migrations, manifests and consumed
receipts remain frozen. No schema reapply or manifest widening belongs here.
Any later activation is recorded separately and must reread live controls.

## Evidence locations

Protected root: `C:/gv_intake_recovery_private_20261027`.
Under `ebay-seller-labs-v1`, preserve `production-recovery-apply-v2`,
`production-recovery-web-v1`, `production-seller-http-v1`,
`production-seller-paused-factory-v1`, `registered-production-callback-v1.json`,
`registered-production-callback-v2.png`, `pr830-recovery-hosted-qualified-v1.json`,
`pr830-recovery-tested-main-ready-v1.json`, and
`main-dashboard-snapshot-compatibility-v1`. The separate
`ebay-seller-recovery-release-gate-production-v1/qualification.json` records
independent481 readback. Its pending list describes the original consumed
payload, not unapplied production migrations.

Later collector consent/provider qualification, only when completed, is recorded
as `ebay-seller-labs-v1/production-seller-consent-v1/result.json`; any subsequent
activation has a separate `production-seller-activation-v1/result.json`.
Absent receipts do not establish either action. Live SQL control/owner state
remains authoritative and must be read before further changes.

Under `app-source-preservation-20261028`, preserve the510 artifact metadata,
QA/Samsung install receipts, QA `upgrade-qualified.json`, and
`native-qa-binder-archive-v1/result.json`. Credentials and tokens remain outside
the repository and must never be printed or copied into client configuration.
