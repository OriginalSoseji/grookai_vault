# Storefront reconciliation with current main — September 18, 2026

The candidate now contains current main's exact-printing search and anthology
coordinate repair (#494), the browse-only storefront/custom-collectible work and
complete Vault-add PR #473. Targeted combined checks pass. This closes the newer
main reconciliation identified by the preceding rehearsal, without a commit,
Git merge, push, remote migration, production activation or deployment.

## Source and preservation

- New isolated worktree: `C:/gv_store_current_20260918`.
- HEAD and final observed GitHub main:
  `a151794a98cc1e47a9a8886e0e643009cea898e5`.
- PR #473 remained open at `6e747bb1561354fc56b62c73be39f258da506f15`.
- Previous combined candidate remains at `C:/gv_store_integration_20260918`,
  detached at `83b2283a09ad1893e10fcd27d5d8ceb6dbaf4d6d`.
- Original storefront source remains at `C:/grookai_vault_storefronts_v1`.

`assembly.json` binds the previous complete binary patch and source manifest to
this checkout. All application changes applied cleanly. AGENTS.md was reconciled
by preserving its complete preceding content and adding current main's Collector
Printing Readback checkpoint. The operator playbook retains the storefront and
Anniversary Vault Add Repair checkpoints. A new checkpoint records this result.
No application behavior needed an additional repair during this follow-up.

This checkout is sparse to avoid duplicating historical audit archives. Current
main's catalog/dashboard data remain authoritative in HEAD/index; excluded files
are not deletions. No dirty catalog repair worktree content was imported. No
environment file or linked production configuration was used for execution.
Existing installed Node dependencies are reused without installation or changes
to lockfiles. Test credentials, fixtures and build output remain ignored.

## Fresh verification

| Check | Result | Receipt |
|---|---|---|
| Exact GV-ID parsing and catalog presentation | 24 passed | `catalog-search.log` |
| Surrounding search, public access, pricing redaction, ownership and release boundaries | 46 passed | `related-contracts.log` |
| Storefront runtime/auth/referral/target guards | 7 passed | `runtime-tests.log` |
| Existing vendor QR and referral core | 6 passed | `qr-tests.log` |
| Real local Auth/Storage/direct RPC | 8 groups passed | `auth-storage-receipt.json` |
| Exact-copy catalog parity, quarantine and invalidation | 4 groups passed | `catalog-receipt.json` |
| Web/API/browser/media/referral concurrency | 6 groups passed | `web-receipt.json` |
| PR #473 writer plus combined storefront exclusion/selection | 2 rollback tests passed | `vault-add-sql-receipt.json` |
| Next production build, including TypeScript and prerender | passed | `next-build.log` |
| Focused ESLint on six changed main web helpers | passed, zero warnings | `verification.json`, `focused-eslint.log` |
| Checked-in public set count prebuild validation | 691 counts validated | `set-count-validation.log` |

The 83 runtime/contract tests preserve exact identifiers including underscores,
dots and finish suffixes, prevent anthology membership counts becoming invented
card denominators, and retain public/pricing/owner boundaries. The local real
storefront checks cover explicit publication, package enforcement, private media,
concurrent quantity edits, downgrade/re-upgrade, distinct exact copies, printing
eligibility and referral credit uniqueness. Desktop and mobile screenshots were
inspected. All tests used guarded loopback endpoints or mocks; no production
browser smoke or telemetry was performed.

All 397 migration source hashes still match the earlier full replay. The populated
dedicated `grookai-storefront-verification-20260918` project was restarted without
reset or replay. Synthetic fixtures were created through the existing guarded
tests; both new ownership-boundary transactions rolled back. Database readback
confirmed 397 ledger entries, zero workers and zero cron executions. The shared
54321/54330 services and repair databases were not used.

Native execution was not repeated because all 468 native source/test files match
the preceding combined candidate byte-for-byte, including all nine recorded native
build inputs. The earlier 62 Flutter tests and Samsung full-app auth/navigation
proof remain linked evidence, not fresh device results. `native-parity.json` records
this comparison. No new provider OAuth, cold-process link, iOS or Edge HTTP Vault-add
proof is claimed. The web checks are fresh against this current-main checkout.

The Next launcher used local credentials, disabled telemetry, blocked non-loopback
connections and wrote a separate build directory. Generated TypeScript configuration
changes were restored after the passing build. The seven dedicated containers were
stopped afterward; retained database volumes and all previous evidence remain.
See `database-readback.json` and `final-readback.json`.

## Review package and remaining gates

`final-source.json` lists the final working diff and hashes, excluding itself.
The complete binary review patch against `a151794a9` is
`.local/integration/current-main-review.patch`; its hash is recorded in
`.local/integration/review-patch.json`. There is no staged content, commit or remote
PR mutation. A reviewer can inspect the full working diff directly in this checkout.

Current-main and PR #473 source reconciliation is complete at the recorded revisions.
The next step is code review and a separately authorized integration/release process.
The existing release checklist in
`../vendor_storefront_integration_v1/INTEGRATION_PROOF_20260918.md` still governs
production catalog/repair dependency fingerprints, migration preflight, rollout flags,
native/web release paths and post-release readback. Its historical main-drift item
is resolved by this receipt; its production gates remain open.

Review the three additive migrations together. Store FKs, entitlement revocation
triggers and private Storage policies can invalidate frozen repair fingerprints
without modifying canonical rows. Keep app/web/custom rollout flags off until a
governed release. Package billing, checkout, payouts and domains remain separate.
Rollback disables new store availability and restores prior clients while retaining
store data, media, custom-product history and Vault ownership. No production schema,
RLS, entitlement or deployment readback is claimed here, and this is a targeted
suite rather than every repository test.
