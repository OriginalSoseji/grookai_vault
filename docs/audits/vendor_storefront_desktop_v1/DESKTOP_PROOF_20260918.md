# Desktop storefront owner management — September 18, 2026

## Delivered candidate

The existing website now includes `/account/store`, linked from Account and the
desktop Account menu. Owners can create a store, edit business identity and branding,
select exact Vault copies, create/edit custom collectibles, upload and order photos,
manage quantities and sections, preview, and explicitly publish or unpublish app/web
destinations from a computer. Existing website catalog search/add, inventory import
and exact-copy management are linked rather than duplicated.

Authoring is available to the app-only package on desktop as well as the app+web
package. Public web publication still requires the active database `store_web` grant.
There is no billing activation or checkout. Existing public `/store`, `/u`, `/gvvi`
and `/q` surfaces retain their identities and authorization boundaries.

The isolated candidate is `C:/gv_store_desktop_20260918`, detached at recorded main
`a151794a98cc1e47a9a8886e0e643009cea898e5`. It includes the complete preceding candidate
from `C:/gv_store_current_20260918`, which reconciled main #494 and PR #473. Main and
PR #473 were rechecked during this extension: main remains that revision; #473 is
OPEN at `6e747bb1561354fc56b62c73be39f258da506f15`. No existing checkout, catalog repair
worktree or historical receipt was changed.

## Implementation boundaries

- `apps/web/src/app/account/store/page.tsx`: private, dynamic, noindex owner entry
  with a safe authentication return destination.
- `apps/web/src/components/stores/StoreManager.tsx`, `StoreProductManager.tsx`,
  `storeManagerClient.ts` and `StoreManager.module.css`: responsive owner workspace,
  forms, explicit publication, bounded lists, filter retention and dirty-edit guards.
- `apps/web/src/app/api/stores/owner/media/route.ts`: authenticated upload and draft
  delivery, owner RLS clients, exact-origin writes, bounded streamed requests, file
  signatures, private UUID paths and current-attachment checks. No service client.
- `.gitignore` explicitly retains store API source, including the new owner media
  route, in review/release inputs despite the repository's general API ignore rule.
- Account and desktop navigation gain a Manage store link. Existing pricing and
  condition writers are unchanged; browser proof exercises their actual server actions.
- `vendorQrCore.ts` accepts HTTP for exact loopback hosts (`localhost`, `127.0.0.1`,
  `[::1]`) so local owner copy pages can render QR controls consistently with the
  website origin helper. A regression test retains HTTPS enforcement elsewhere and
  rejects non-HTTP schemes on loopback. Production QR eligibility is unchanged.

No new migration or native edit was needed. Existing versioned custom-product RPCs
remain the write authority; stale edits return 409 and preserve entered values. An
explicit reload discards them. Zero stock clears publication and restock does not
restore it. SKU is owner-only. New photos are uploaded privately before attachment;
a failed attachment can leave a private orphan, with no automatic cleanup added.

Contract: `docs/contracts/VENDOR_STOREFRONT_DESKTOP_MANAGEMENT_V1.md`.

## Fresh local evidence

| Check | Result | Receipt |
|---|---|---|
| Real authenticated desktop owner journey | 11 groups passed, zero page errors | `desktop-browser-receipt.json`, `desktop-browser.log` |
| Real local Auth/Storage/direct RPC | 8 groups passed | `auth-storage-receipt.json` |
| Public/owner HTTP, media and referral concurrency | 6 groups passed | `web-receipt.json` |
| Exact-copy parity, quarantine and invalidation | 4 groups passed | `catalog-receipt.json` |
| PR #473 writer and storefront selection boundary | 2 SQL rollback tests passed | `vault-add-sql-receipt.json` |
| Storefront runtime/auth/referral/local-target guards | 7 passed | `desktop-runtime.log` |
| Existing QR/referral core plus loopback regression | 7 passed | `desktop-qr.log` |
| Next production build and TypeScript | passed | `desktop-build.log` |
| Focused ESLint | passed, zero warnings | `desktop-eslint.log`, `verification.json` |

The desktop browser journey uses real email/password sign-in and checks return to
the workspace; private draft creation; logo/photo upload; forged-origin, invalid-type
and oversized-upload rejection; section creation/selection; custom authoring and
private SKU redaction; owner preview; separate product/app/web publication; slug
freeze; exact-copy selection with unassigned exclusions; filter retention; existing
desktop price/condition updates reflected by the next store read; conflicting saves
and dirty-navigation cancellation; zero stock/restock; app-only package enforcement;
foreign-owner read/edit/upload denial; responsive editor and archive retention.

Desktop and responsive screenshots were inspected: `desktop-overview.png`,
`desktop-inventory.png`, `desktop-product-editor.png`, `desktop-responsive-editor.png`.
The screenshots show synthetic data only. The final journey runs the production-mode
local Next build, not a production deployment. A development-server preview reload,
legacy QR loopback validation and fixture/locator errors were diagnosed during test
development; final receipts contain the passing run after fixes. The test fixture
uses valid-shaped synthetic GVVIs and never infers a real catalog identity.

## Isolation and preservation

The retained dedicated project `grookai-storefront-verification-20260918` uses API
16421, DB 16422 and mail 16424, with the web proof on 15440 and loopback relay 15439.
No reset or migration replay occurred in this extension. All 397 migration hashes
still match the earlier full replay; the database ledger contains 397 migrations,
workers remain zero and cron executions remain zero. Synthetic accounts and inventory
were added only there. The shared 54321/54330 services and repair databases were not used.

The web launcher passes only allowlisted local configuration, disables telemetry,
blocks non-loopback connections, and uses a separate build directory. Browser
contexts also reject non-loopback requests. Private local keys, credentials and
fixtures stay ignored outside this review package. Dependencies were reused through
existing local junctions; no installation or lockfile change occurred.

`preservation.json` verifies the preceding candidate's source manifest and unchanged
native source/test files. Native device execution was not repeated; prior Samsung
proof is historical evidence linked from the preceding receipt, not fresh proof.
Generated Next configuration changes were restored after the build. Dedicated task
processes and seven containers were stopped, with database volumes retained. See
`database-readback.json` and `final-readback.json`.

## Review package and remaining release gates

`final-source.json` records final diff hashes, excluding itself. The complete binary
patch against `a151794a9` is `.local/integration/desktop-review.patch`; its hash is in
`.local/integration/review-patch.json`. The working diff is reviewable without a
commit. No content was staged, committed, merged, pushed or deployed, and no remote
migration, entitlement activation, worker dispatch or payment action occurred.

Code review and separately authorized integration/release remain next. Review the
existing three additive storefront migrations with the earlier release checklist
in `../vendor_storefront_integration_v1/INTEGRATION_PROOF_20260918.md`. Recheck active
catalog repair schema/dependency fingerprints before any production migration.
Billing channels/provider, commerce and custom domains remain separate phases.

This is a targeted desktop storefront proof, not every repository test or desktop
parity for every native Vendor Mode operation. Catalog add/import links reuse their
existing workflows; this journey freshly executes exact-copy price and condition
edits, not a new bulk import. No new custom CSV importer or manual transaction UI
was added. Provider OAuth, cold app links, iOS and production readback are not claimed.

Rollback removes the desktop entry points or restores previous clients, and disables
store availability through existing rollout controls as needed. Retain additive
tables, private media, listing history and Vault ownership; no destructive rollback.
