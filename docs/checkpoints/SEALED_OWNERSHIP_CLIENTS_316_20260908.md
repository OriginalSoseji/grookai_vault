# Sealed Ownership Client Release 316

Date: 2026-09-08. This is a default-OFF compatibility release, not ownership
activation or full lifecycle acceptance.

## Released Source

- PR #440 merged normally after both repaired review threads were resolved.
- Feature source: `01cd20528bfe911cabc174396cf2294987a71310`.
- Merged producer: `5d823163eea470c31213de6f457e4e8124db0163`.
- Preserved newer main `26c2d198136f3b747f609e6ddd8377d681f36800`
  (automated Pokemon Master Index PR #441). No refs or worktrees deleted.
- All six post-merge GitHub workflows passed, including Flutter, signed APK,
  contracts/runtime protection and drift checks.
- The subsequent documentation commit's local Flutter runner stalled while
  loading `mtg_sealed_client_v1_test.dart`. Only the positively identified owned
  tester/compiler process tree was stopped; no source or test was changed.
  The focused rerun passed. Preserve the interrupted log separately from the
  complete commit-check retry; this was not a failing production test assertion.

## Schema Complete, Do Not Reapply

The four original migrations and separately authorized photo revision migration
are applied. Production/replay ledger parity is 392/392. The photo migration
replaces only `vault_save_sealed_details_v1` and `sealed_owned_media_visible_v1`.

- Migration: `20260908070000_sealed_owned_photo_revisions_v1.sql`.
- SQL SHA: `8dd6ac2ef0f9e3f9880f17469147060d6fb91525484f51816c4ff0f6dc790499`.
- Plan: `37c44a9975115683b053669430a428abfca605d456f19f9f3f2a83f3f3b4a4fd`.
- Applied 11:38 UTC; separate readbacks and full schema/security parity passed.
- Receipt: `C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_approved_photo_revision/APPLIED.md`.
- Preserve the single-use execution marker. Never reuse the old four-migration
  plan generator as authority for already-applied SQL.

At 11:59 UTC: ownership OFF, zero sealed copies/journal rows, 3,401 existing
owned copies, three dispositions. Canonical counts: 170,404 cards, 3,397 sets,
32,903 traits. No inventory, catalog, pricing or Storage mutations in this client
gate. The existing store-review identity was used for a temporary SSR probe
session; only that session was revoked afterward.

## Web

Production deployment `dpl_8MZHL1ojDPpoAFfHppbCpJWrkZ3p` is READY from the
merged producer above. Ownership environment flag remains absent/default false.
The automatic Git deployment was used; no manual duplicate deployment.

Signed-in Pokemon browse: 24/24 loaded self-hosted product images, prices,
and no Add control. `151` with Bundles returned three correct products with
prices 177.29, 1897.93 and 218.28. Browser capture later disconnected repeatedly:
do not claim final browser MTG, web Vault/Wall or screenshot acceptance.

Independent existing SSR smoke passed four production cases (page 1/page 2,
Japanese booster boxes, Pikachu), 24 exact names/self-hosted image paths each;
anonymous access redirected to login. These are server-rendered/read-model
checks, not a replacement for browser interaction. Case timings 5.1-14.2 seconds
include the comparison RPC and are not a page-load performance benchmark.

## Samsung

Built merged producer in profile mode, both sealed browse flags true, ownership
false. Installed in place on SM-S908U without clearing data or changing signing.

- APK SHA: `91fa6b853a4c2a65a8561322b4711ca6da2f069ff916d588549b8b5c579f88ef`.
- Signing SHA: `e9575fdd80e4bc1b4e5a80e3638c76f963ae2618db4f71f95d5a0022bc7089c2`.
- Vault unchanged: 14 cards, 13 unique, 12 valued copies, USD 2,049.85.
- Card images and prices render; initial loading screenshot precedes settled
  price readback. Preserve both instead of treating loading as final state.
- Pokemon and MTG sealed images/prices render, with no Add control.
- MTG Sets now shows 946; prior zero-set observation did not reproduce. This
  does not establish a diagnosed/fixed cause for that earlier failure.
- Wall sections and card prices read back; no Wall edits performed.

## iOS / TestFlight

Build 316 is VALID and IN_BETA_TESTING for the existing internal Friends and
Family group. Existing external groups do not contain this build. Notes and
membership read back directly from Apple; no public App Store submission.

Isolated Mac worktree: `~/grookai_vault_testflight_316_sealed_privacy`.
Exact source is the merged producer. Code signature and Runner/App dSYMs match;
release configuration matches 314, both sealed browse flags ON, ownership OFF.
Simulator launch rendered the normal sign-in screen. This is not authenticated
iPhone lifecycle or native share/print proof. Preserve old 315; it was not uploaded.

## Evidence And Remaining Work

Artifacts: `C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_sealed_client_deploy/`.
Includes frozen run plan, Vercel/DB readback, Samsung PNG/XML, APK, native logs,
archive verification, Apple finalization, simulator screenshot, SSR summary.

1. Finish interrupted browser MTG and Vault/Wall smoke when browser control is
   stable. No new migration or deployment is needed to repeat read-only checks.
2. Run the separately bounded owner canary using exact released Pokemon/MTG
   variants, with add/retry, quantity, package condition, market/unpriced totals,
   private/public Wall sections, sale, trade/cash, archive and history readback.
3. Verify revised media privacy and native share/QR/lot/print on the enabled
   canary client; check cross-account/anonymous denial and cross-client totals.
4. Prove disabling Add preserves owned data/history and existing card behavior.
5. Only then activate ownership entry points and monitor the resulting writes.

Default-off smoke cannot prove an enabled ownership lifecycle. No founder Vault
fixtures, ownership activation or production photo uploads were performed.
Recurring TCGPlayer/control-plane alerts remain a separate operational issue;
this release does not claim whole-app or pricing-pipeline readiness.
