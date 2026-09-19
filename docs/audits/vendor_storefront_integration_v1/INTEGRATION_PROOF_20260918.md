# Combined storefront integration rehearsal — September 18, 2026

The storefront/custom-collectible candidate and all 13 files from Vault-add PR #473
were assembled in an isolated detached worktree against recorded main. Combined
local checks pass, including the actual production Dart entry point on a Samsung.
No Git merge, commit, push, remote migration, production entitlement, worker,
payment or deployment action occurred.

## Exact source boundary

- Worktree: `C:/gv_store_integration_20260918`.
- Recorded main/HEAD: `83b2283a09ad1893e10fcd27d5d8ceb6dbaf4d6d`.
- Preserved storefront source: `C:/grookai_vault_storefronts_v1`, base
  `a14388f689235d62b3165c1dd88aaa4c562ab186`, plus its recorded working diff.
- PR #473: `6e747bb1561354fc56b62c73be39f258da506f15`, still open at final readback.
- `assembly.json` records patch and per-file hashes and the three-way combination.
  The one conflict was the operator playbook; both checkpoint blocks remain.
  `lib/main.dart` combined cleanly. No new production behavior was needed for this
  rehearsal; the new code is a combined database regression and its guarded runner.
- All 154 hashes in the original candidate's final manifest were reverified.
  Its source, prior receipts, installed dependencies and lockfiles were preserved.
  No dirty mapping/repair worktree files were copied or changed.

The initial full checkout exhausted space copying historical audit archives. Git
removed that failed registration. This rehearsal uses a sparse checkout; excluded
catalog audit archives remain in HEAD/index, not deleted or replaced. Application
environment files are excluded. Installed Node dependencies are reused by junction;
build outputs and generated harness files are isolated under this worktree.

## Verification

| Check | Result | Receipt |
|---|---|---|
| Combined storefront/custom/navigation/Vault-add Flutter tests | 62 passed | `flutter-tests.log` |
| Changed native entry, shell, store screens/services, printing/add services and confirmation widget | no analyzer issues | `flutter-analyze.log` |
| Storefront auth/referral/runtime target guards | 7 passed | `runtime-tests.log` |
| Real local Auth/Storage/direct RPC | 8 groups passed | `auth-storage-receipt.json` |
| Exact-copy real schema, parity, quarantine and invalidation | 4 groups passed | `catalog-receipt.json` |
| Real web/API/browser/referral concurrency | 6 groups passed | `web-receipt.json` |
| PR #473 ownership writer and combined storefront boundary | 2 rollback transactions passed | `vault-add-sql-receipt.json` |
| Full production Dart app through real local auth and Android intents | 1 physical integration test, six journey assertions passed | `journey-receipt.json`, `native-journey.log` |
| Next production build with guarded local backend | passed | `next-build.log` |
| Retained database migration source compatibility | all 397 hashes match prior successful replay | `vault-add-sql-receipt.json` |

The dedicated project is `grookai-storefront-verification-20260918`, using API
16421, database 16422, guarded web relay 15439 and Next 15440. Its populated
database was not reset or replayed. Only synthetic fixture users, grants, stores
and catalog copies were written. `database-readback.json` confirms both native
fixture users signed in, publication state persisted, workers remained zero and
cron execution count remained zero. Previous test databases and repair snapshots
were not used.

The new rollback test proves unassigned Vault ownership is accepted and remains
visible to its owner with `Printing unassigned`, while selection/publication are
rejected. Later child-printing creation does not assign or value the existing copy.
A separate exact-printing add and asking-price save still do not select that copy.
Only explicit selection followed by publication exposes it, preserving its GVVI
and printing identity consistently in app/web reads. Both fixtures roll back.

The native harness uses `com.grookai.storefrontauthproof`, the combined app as a
path dependency, actual `main()`, real login and refresh, Vendor Mode management,
owner product preview, visitor product access and foreign-owner preview denial.
It uses fixed loopback networking and disables Firebase services. All common Dart
dependency versions match the candidate. `build-source.json` binds the tested APK
to native inputs. Five screenshots were inspected; the visitor denial has no
product details and the store-save notice renders within the screen.

The first Android build failed at native library assembly because C: was full;
no device test ran then. On resume, approximately 28 GiB was already free, so no
additional cleanup was necessary. The same source built and passed. `disk-block.json`
records the failure/recovery without exposing raw Gradle defines or device IDs.
Next-generated TypeScript configuration changes were restored after the build.
Local services and the task's ADB reverse mappings were stopped/removed; retained
database volumes and source/evidence remain intact. See `final-readback.json`.

These are targeted combined tests, not a full repository suite. Device proof does
not claim an Edge HTTP Vault-add journey, provider OAuth, cold-process links or
iOS. Vault-add request behavior is mocked in Flutter and its ownership RPC is
executed separately in the real local schema. Those evidence boundaries remain
explicit.

## Main advanced during proof

Final remote readback found main at
`a151794a98cc1e47a9a8886e0e643009cea898e5`, including #494's exact-printing search and
anthology-coordinate repair plus dashboard snapshots. That delta was read and
recorded in `main-drift.json`, but not silently imported into the tested source.
Its only directly overlapping candidate file is AGENTS.md; it also changes shared
catalog read/presentation/search helpers that warrant combined regression before
release. PR #473's head stayed unchanged. This proof is for recorded `83b2283a0`,
not a claim about the later main.

## Integration and release checklist

1. Review the combined diff and reconcile the later main delta, preserving both
   AGENTS checkpoints. Rerun affected catalog/search and storefront reads on the
   final integrated source; preserve all current catalog audit data from main.
2. Coordinate PR #473's native entry/confirmation and storefront pending routes.
   Keep its existing nullable-printing ownership behavior and the store exclusion
   boundary proven here. Review the complete PR, not just `lib/main.dart`.
3. Before production schema application, the catalog/repair owner must recompute
   and approve applicable schema/dependency fingerprints. Store metadata adds FKs
   to `auth.users`, `vault_item_instances` and `wall_sections`; capability revocation
   adds triggers to `user_entitlements`; private media adds Storage bucket/policy
   dependencies. Eligibility reads public catalog/printing/quarantine boundaries.
   These can affect frozen repair fingerprints without changing catalog rows.
4. Review additive migrations `20260918040000`, `20260918070000` and
   `20260918100000` together. All app/web/custom rollout flags default off. No
   production schema/RLS/grant/deployment readback is claimed by local replay.
5. Billing provider/channel decisions and verified subscription lifecycle remain
   separate. Proposed package grants were simulated locally; no subscription is
   billable from this work. Checkout, payouts and domains remain out of scope.
6. Release schema and web/native clients only through their governed release
   paths, with explicit authorization and post-release readback. Rollback disables
   store app/web/custom availability and restores prior clients while retaining
   store data, private media, custom-product history and Vault ownership.

`final-source.json` identifies the reviewable working diff (excluding itself).
The complete binary review patch is in ignored `.local/integration/combined-review.patch`,
with its hash in `.local/integration/review-patch.json`. Secrets, fixture passwords,
raw Gradle logs, build outputs and local credentials are excluded from the diff.
