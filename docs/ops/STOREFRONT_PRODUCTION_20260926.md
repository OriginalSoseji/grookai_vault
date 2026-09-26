# Production storefront connection checkpoint

The user asked: "This ready to go live? Connect to real db". Production
integration is now authorized scope; older pilot-only stopping instructions
do not prohibit preparing this release. Do not merely repoint the pilot.
Payments remain disabled unless separately activated through their own gates.

## Latest continuation — September 26, 18:33 UTC

Production schema402 and private cache remain verified. Browse-only app/web/custom,
batch intake and pinned scan rollout are enabled. Seller onboarding, reservations,
orders and all payment flags remain off. Two invitation codes were created privately:
one14-day/max10 review invitation and one temporary synthetic smoke invitation.
The existing bootstrap founder grant alone received store_app/store_web features;
its identity, role, tier and other features were preserved. No store was auto-published.

Hosted V2 caught an ignored-route packaging defect: root .gitignore excluded all40
new vendor APIs. Explicit source allowlists and a regression test now prevent it.
The failed V2 and partial V3 packages remain retained. V4 includes all2,192 files,
including every non-fixture application route, and is READY as
`dpl_8uQg9dRSofCzoJJoSW5Ukx9wGgLU`. Public alias remains unchanged.
Temporary authenticated Vercel automation access is active for smoke only; global
deployment protection is unchanged. Revoke this token after release verification.

Two synthetic production accounts and one empty private store currently exist for
HTTPS checks. No production inventory copy was created. Setup, owner preview,
foreign-owner denial, trial web-publication denial and media/origin checks pass.
All15 HTTPS boundary/setup checks and5 real-scan comparisons pass, including TG
gallery scans and browser-converted HEIC previews. Match latency was14–19seconds.
See `docs/audits/storefront_production_20260926/live-hosted-proof.json`.
Cleanup must delete only these bound synthetic accounts and their smoke
invitation. Keep the separate review invitation for the user.

Private release state: `.local/integration/production-live-v1/` and
`.local/integration/production-web-v4/`. Remaining: finish hosted proof, normal Git
push hook, production environment persistence, source integration and apex promotion,
public link verification and synthetic/automation cleanup. Earlier all-flags-off
and no-grants statements below are historical. No Stripe action occurred.

The initial direct Git commit correctly stopped at the normal hook because its
shell lacked SUPABASE_DB_URL. The dedicated commit/push wrappers supply only the
isolated402 lab credentials, read-only database and loopback network guard; they
do not bypass either managed hook. Commit/push receipts and subsequent final
hosting/cleanup readbacks are retained under the ignored production-live-v1 and
production-trial-v1 directories. Check those receipts plus remote Git/hosting state
before resuming; never repeat a consumed activation or promotion intent.

## Continuation update — September 26, 17:24 UTC

### Superseding production update — 18:03 UTC

#### Further update — 18:22 UTC

Production and the dedicated lab now have **402 migrations**. Invitation migration
`20260926200000_vendor_store_trials_v1.sql` is applied once through the CLI and
verified: one entitlement reader changed,26 invitation objects added; all retained
data and permissions match. All rollout/payment controls are still off and no
invitation or grant has yet been created in production. An initial pre-apply
read-only request timed out before the apply intent; the exact safe retry completed.

The full402 replay equals the upgraded schema with1,066 security objects. Seven
real trial tests, four HTTP-handler checks, five wrong-mode gate checks, eighteen
intake regression checks and normal shipcheck pass. Raw trial features are empty;
the database derives temporary app access, preserving paid lifecycle suspension.

All19,621 private cache objects (8,478,139,239 bytes;20,079 references) are uploaded,
downloaded and hash-verified. Independent storage inventory exactly matches the
plan. Transient upload failures were resumed from the bound journal; do not rerun
the completed uploader. See feature-staging.json and feature-inventory.json.

The unpromoted V2 website is `dpl_BbtVKW5gBDkHH2K2UeLtadT62csQ`, URL
https://grookai-vault-hqklta7i0-sosejis-projects.vercel.app . Its2,152-file package is
under `.local/integration/production-web-v2/`. The V1 package is retained and its
deploy mode retired. The public alias still points to the preceding main deployment.
Local/private build and release artifacts are now explicitly ignored by Git.
Old frozen catalog repair fingerprints must be refreshed before any future repair;
the paused checkpoint and repair evidence were not edited or executed.

Next: finish hosted proof and controlled access activation, preserve the complete
source in Git through the normal push hook, and only then promote the verified
website. Checkout, subscriptions and seller payment controls stay disabled.

Production now has **401 migrations**. The exact consolidated migration
`20260926190000_vendor_storefront_production_v1.sql` was applied once through
`supabase db push` after strict baseline/PrePush, a single-file dry run, full
401 replay, exact equality with the 419-file development schema, six scan quota
tests and eighteen real Auth/Storage/HTTP intake tests. The normal shipcheck
passed: 5,491 Node contracts (four skipped, zero failed), web typecheck/lint/build,
Flutter analysis and 748 Flutter tests. Six extra production-gate tests pass.

Post-apply schema/security comparison passes (1,062 security objects; only the
known three-table physical column order normalization). All existing 3,525 copies,
40 profiles, the existing entitlement's original values, and catalog counts are
unchanged. Initial data comparison included the three newly added null billing
columns and therefore changed its row JSON hash; the retained readback-v2 verifies
the original column projection and separately proves all three new fields null.
The failed comparison and original uploader/apply script versions remain retained.

All production store/app/web/custom, batch, scan, seller, stock and checkout
controls remain **off**. No entitlement grants or publication changes occurred.
The private production `vendor-scan-features-v29` bucket is created; its 19,621
objects (8.48 GB) are still uploading with per-object downloaded SHA verification.
The uploader is resumable only against its exact plan/journal. It now requests
modern management API keys with `reveal=true`, and retries transient storage 502s.
Do not treat partial upload as feature-cache completion.

The local lab is now on the **401 release chain**, using
`.local/integration/production-package-v1/`; the old 419 fixture is preserved but
its old live-ledger guard no longer applies. The original nineteen unapplied
files are archived byte-exact under `docs/audits/storefront_production_package_v1/`.
Only the consolidated file remains in the active chain. Do not rerun consumed
replay, adoption or production-apply intents.

Current branch was fast-forwarded to new main `c42e163cca20914e5da7d09a99d5648efc174407`
(only five dashboard report changes). Current public deployment is
`dpl_3QVsc5mvLXphc4sojj9WdqCBbJxj`; no alias or website deployment was changed by
this task. A 2,149-file, 117.84 MB production website package is frozen under
`.local/integration/production-web-v1/`. It has not been submitted. Production
trial access, final hosting proof/activation and source commit remain unfinished.
Invitation-based trials match the user's earlier unknown-email vendor trial
request; do not enable paid subscriptions or payments to provide trial access.

Key receipts: `docs/audits/storefront_production_package_v1/production-applied.json`,
`replay.json`, `scan-admission.json`, the passing HTTP and shipcheck receipts,
`AuditLinkedSchema.json`, `PrePush.json`; private CLI/readback files are under
`.local/integration/production-apply-v1/`. No production apply retry is authorized
by an old receipt. New work must start from the actual 401 migration state.

The 17:24 notes below are historical and superseded where they disagree.

Docker became available without an agent restart. The dedicated new project is
`grookai-store-prod-20260926`, loopback ports 29021/29022/29024/29040, internal
network `10.249.90.0/24`, PostgreSQL17.6.1.113, background workers disabled.
Its files are `.local/integration/production-rehearsal-v2/`. Earlier failed
preparation artifacts are retained: default Docker address pools were exhausted,
then an overlong project ID was truncated by the CLI and caused a relay timeout.
No existing lab was reset or stopped. Only this newly created synthetic lab was
reset for the full-chain proof.

Completed in this production worktree:

- Replayed the 400-migration baseline and compared it read-only with production:
  public schema matches after the existing three-table column-order reconciliation;
  all 895 security records match. Production remains at 400 migrations.
- Imported 312 website/contract-test paths from the preserved candidate, preserving
  newer main; 18 new bracket-parameter routes were verified absent from both base
  and main before import. Verified every frozen V31 file (2,161 hashes); only three
  source files differ from that hosted package. Source import records are retained.
- Imported 478 supporting scripts/contracts; no current-main conflicts. Native
  integration and the normal complete repository shipcheck remain unfinished.
- Applied the exact 18 original migration candidates only in the local lab.
  Incremental upgrade: 944 added objects, zero changed/removed existing objects.
  Fresh 418-migration replay is exactly equal to the upgraded schema and all
  1,057 security records, with zero raw schema diff. All rollout controls stay off.
- Added production deployment binding for batch intake, preserving existing pilot
  targets and DB package/rollout authorization. Added a nineteenth candidate,
  `20260926180000_vendor_scan_admission_v1.sql`, for disabled-by-default shared
  scan quotas, concurrency leases and exact production reference-release pins.
  Applied only locally (419 versions). Six real DB permission/concurrency/lifecycle
  checks pass; all synthetic users and grants were removed afterward.
- Integrated HTTP intake proof passes 18 boundaries against the new local lab:
  real auth/storage, duplicate and concurrent submissions, quarantine, foreign
  sections/owners, privacy, media integrity, cancellation races and downgrade.
- Web typecheck and lint pass. Lint required a TypeScript parser for existing
  `.d.mts` declarations. The optimized strict local web build passes. Its first
  attempt compiled but failed the source-config restoration guard; known Next
  declaration changes were reviewed and the preservation helper corrected.
- 37 targeted source/runtime tests pass (33 scan/preservation/target tests plus
  four shared-admission binding tests). All 20,079 bundled references match the
  current production anonymous identity/artwork-path/public-printing boundary.
  This is not new image-byte verification or Master Index completeness.

No production DDL, storage upload, entitlement grant, alias change, payment action,
commit, push or deployment has occurred. The live pilot remains untouched.
Production private scan assets, invitation/access policy, final source/release
gates, 419-chain replay and production-mode verification are still required.
Do not call the older one-use preparation/replay commands again; inspect receipts
and use a new versioned intent for the changed 419-migration chain.

Receipts include `baseline-schema.json`, `local-upgrade.json`, `full-chain.json`,
`scan-admission.json`, `reference-authority.json`, the successful HTTP receipt and
the passing build receipt under the production audit directory.
The headings below retain the initial audit state; this update supersedes their
Docker and local-replay blockers.

## Current source and preservation

New isolated worktree: `C:/gv_store_production_20260926`, branch
`release/storefront-production-20260926`, based on freshly fetched main
`4c1fb7858146f2100e4b5d0de9c94716d0335409` (PR #517).
The dirty implementation at `C:/gv_store_billing_20260919`, frozen V31 package,
TestFlight worktree, catalog repair worktrees and all proof files are preserved.
No merge, commit or push has occurred. The candidate's committed branch differs
on 189 application/migration paths; newer main differs on 18, with five native
path overlaps. This is path comparison, not a completed merge/conflict audit.
The pilot also includes substantial uncommitted work; do not lose that payload.

## Fresh read-only production findings

Production `ycdxbpibncqcchqiihfz` has 171,021 cards, 3,400 sets, 32,903 traits and
400 recorded migrations. There are zero public vendor tables/functions, zero
active store_app/store_web grants and no vendor feature buckets. This means
store creation/intake cannot work by changing database credentials alone.

The active `grookaivault.com` deployment is
`dpl_9GgsSDFbyMZJswMyq7UVszPMcyoM`, project
`prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum`, from the same main commit. `www` currently
belongs to a separate older project/deployment; do not switch it incidentally.
No production app configuration or alias was changed. The isolated vendor pilot
remains live on `dpl_9oyb6uwYpsjmcji52NSmoE5UhK3h` with payments disabled.

An initial metadata query used nonexistent entitlement lifecycle columns and
returned HTTP400. The corrected read-only query uses the actual `is_active`
schema. Both SQL inputs are retained; the successful result is not proof that
the first query succeeded. No product data or DDL was written.

## Local migration-history recovery

Main lacked five already-applied migration files. They have been copied into
this new worktree from the preserved candidate after comparison with their
authenticated production ledger statements. They match after line-ending and
trailing-whitespace normalization; source bytes are retained exactly. No ledger
rows were created and these migrations must not be reapplied in production.

Local version inventory now matches the 400 production versions, including the
two legacy eight-digit IDs. This is version parity, not schema/replay proof.
`integration-manifest.json` records all hashes and the candidate's exact 18
unapplied migration files. Those 18 files have not been copied into this release
chain or selected for remote application yet. Do not run a global db push.

## Concrete blockers

1. The strict `AuditLinkedSchema` preflight against the existing linked candidate
   confirmed 400 applied and 18 pending versions, then failed at `db diff` because
   Docker's Linux engine is unavailable. Native PostgreSQL PID7484 remains
   present. No shared service was restarted or reset. Source/history recovery
   is not complete until an isolated replay and strict schema/security comparison
   pass. Preserve the failed preflight log.
2. Batch commit/cancellation and visual matching are deliberately limited to
   local/pilot targets. Scan artifacts and private feature delivery are bound to
   the pilot database. Production needs a governed binding and production-owned
   reference assets, plus current printing/visibility checks; changing a URL or
   removing a guard is insufficient.
3. Merge the full tested storefront payload with current main, preserving newer
   search/navigation and canonical readers. Run normal source/build hooks against
   the final production candidate, not a historical branch or standalone fixture.
4. Rehearse the exact dependency-reviewed migration set in a new isolated lab,
   refresh catalog dependency/schema fingerprints, then apply only the reviewed
   set with all rollout/payment controls initially off. The catalog checkpoint
   remains paused at V159; no repair jobs or frozen repair packets were changed.
5. Establish production scan resource/rate controls and production-target proof.
   The existing per-process counter is not a shared quota across server instances.
   Pilot corpus/Safari Simulator results remain bounded evidence, not complete
   catalog accuracy or physical picker/touch acceptance.
6. Stage a production-mode website against the real database through its governed
   release path, verify boundaries before alias promotion, and grant store access
   only to intended accounts. No accounts have been nominated for new production
   grants in this step; do not infer that all collectors receive paid features.

## Receipts and continuation

Public-safe metadata, integration manifest, fixed read-only SQL and source overlap
are under `docs/audits/storefront_production_20260926/`. Detailed logs and original
ledger statements are under
`C:/grookai_vault_operator_artifacts/storefront_production_20260926/`.

Next: complete the isolated schema comparison/replay and current-main integration
before production binding, migration or deployment. The current production
connection request is not complete. No new feature has been enabled on real users.
Rollback must disable new rollout flags and restore previous clients while
retaining all additive owner, receipt and financial data.
