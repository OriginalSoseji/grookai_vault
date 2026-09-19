# Browse-only storefront implementation — local candidate

Recorded September 17, 2026, America/Denver (receipts use September 18 UTC).

## Source and isolation

- Baseline: current `origin/main` and GitHub main confirmed at
  `a14388f689235d62b3165c1dd88aaa4c562ab186` before implementation.
- New branch/worktree: `feature/vendor-storefronts-v1`,
  `C:/grookai_vault_storefronts_v1`.
- Original checkout: `C:/grookai_vault`, branch
  `fix/lot-sharing-pricing-main-v1`, `91e4c043f076a71721cd95c27715c3737eba78ed`.
  It remained clean at the final check.
- The dirty `C:/grookai_vault_mapping_identity_20260917` worktree, Trainer Kit
  fixtures, exact-ID search work and catalog repair evidence were not edited.
- Open PRs inspected: #473 (Vault add) and #118 (search). No merge, push, PR creation,
  remote migration, entitlement activation, worker dispatch, payment or deployment.

Read current AGENTS, operator playbook, rulebook, migration prompt and relevant
vendor, Wall, entitlement, identity and public-printing contracts. The strict linked
schema audit was attempted from this intentionally unlinked worktree; it stopped
with `Cannot find project ref`. No remote target was linked to bypass that gate.
No duplicate migration timestamps were found. The only new migration is
`20260918040000_vendor_storefronts_v1.sql`; existing migration bytes are unchanged.

## Implemented

The native Vendor Mode entry opens store setup, separate branding, normalized slug,
explicit exact-copy selection, selected Wall sections and order, app/web previews,
and separately confirmed publication controls. New package capabilities never alter
the existing Vendor Mode entry or inventory writers. Browser and native store views
consume the same exact-copy DTO and link to existing GVVI details/collector follows.

The migration adds store metadata/membership, private branding and a service-owned
rollout switch (off by default). Owner RPCs enforce database grants and current
ownership. Public reads recheck selection, privacy, sale price, public catalog release
and governed printing availability. Downgrade suspension persists across re-upgrade.
Unselected copies never enter from section creation or price changes.

Referral contexts support the existing GVVI and new store entry. Authenticated
account creation is checked in a service-only database credit RPC with a unique
referred-user ledger. Telemetry's event-name bug is repaired; forged referral events
are rejected. Navigation survives attribution failure.

## Local environment and proof limits

Docker's read-only `info` probe did not answer within its bounded timeout; no Docker
service/container was restarted or shared Supabase/repair database reset. The first
attempt to bind the new native PostgreSQL cluster to 56630 was denied by Windows;
15438 succeeded. Its dedicated data directory is `.local/storefront/pgdata`, role
`storefront_test`, bound to 127.0.0.1. No production records were copied.

The SQL runner verifies the server's exact `data_directory` before creating a fresh
timestamped `grookai_storefront_v1_*` database. It builds representative synthetic
dependency tables, installs actual governed catalog visibility/public-printing
functions from recorded migrations, applies the new migration and tests real SQL
roles, RLS, grants, RPCs, triggers and concurrent connections.

The loopback HTTP adapter on 15439 delegates storefront RPCs and Storage metadata
checks to that database. Authentication and binary Storage transport are synthetic;
this is **not** a complete GoTrue/PostgREST/Storage or historical migration replay.
The actual Next app runs on 15440. Its launcher clears inherited service credentials,
pins the synthetic target, disables analytics and uses a non-loopback network guard.
Browser interception blocks external requests. A local-only staging mode is mutually
exclusive with production/other staging modes. No production browser smoke occurred.

## Verification receipts

| Check | Result |
| --- | --- |
| SQL integration runner | 31 passing scenarios; `sql-receipt.json` |
| Next API + desktop/mobile Chromium | 9 passing scenarios; `browser-receipt.json` |
| Referral/runtime and local-target guards | 7 passing tests |
| Flutter store/service/navigation + legacy vendor/offer | 11 passing tests |
| Selected legacy vendor/QR/entitlement/staging contracts | 33 passing tests |
| Existing QR crypto/bitmap/runtime suite | 6 passing tests |
| Focused Flutter analysis | No issues |
| Web TypeScript and focused ESLint | Passed |
| Optimized Next build, loopback-only staging and outbound guard | Passed; 27 static pages, dynamic storefront/API routes |

Database scenarios include two isolated owners, visitor/authenticated reads, drafts,
explicit publication, sibling GVVIs, search/pagination, sections, slug freeze/reserved
route, wrong-parent/missing/unassigned printings, private/zero-price/archived/transferred
copies, disabled sharing, truth quarantine, inactive finish, suppressed and staged
catalog, app/web parity, direct RPC package denial, durable downgrade/re-upgrade,
private media ownership, client ledger denial, old/self/expired attribution, eight
concurrent credit attempts (one credited, seven duplicates), kill switches and
presentation-reference deletion behavior.

Browser/API scenarios cover anonymous web vs authenticated app parity, owner-preview
isolation, forged capabilities/types/origins, second-owner app-only setup and
publication, surface-query bypass denial, next-read unpublication, forged telemetry,
branding upload/scope/preview/revocation, mobile and desktop filters/copy links,
encrypted HttpOnly referral cookies, and safe preview login destinations. Screenshots
were inspected for layout/overflow; no checkout UI exists.

Flutter widget/service tests prove draft-only save, explicit publication confirmation
and cancellation, app-only web disablement, private-copy disablement, bounded response
version/error handling, media format rejection, audience-specific routes and pending
preview destinations. These are local widget/service tests, not physical-device proof.

During development, failing tests exposed a proxy-origin assumption and test-fixture
setup issues; they were corrected and rerun. Final proof also tightened media audience
routes and catalog parity. Raw intermediate receipts remain under the ignored local
directory; final receipts here contain no tokens or production credentials.

## Reproduction

Use this isolated worktree only. Install the locked root/web Node and Flutter
dependencies. Provision a new PostgreSQL 16 cluster at the exact local directory,
with role `storefront_test`, bound to 127.0.0.1:15438, after verifying the port is unused.
Never redirect these scripts to the shared Supabase or catalog rehearsal cluster.

1. `node scripts/tests/vendor_storefront_local_v1.mjs`
2. `node scripts/tests/vendor_storefront_http_fixture.mjs` (own process, port 15439)
3. `node scripts/tests/vendor_storefront_web_local.mjs` (own process, port 15440)
4. `node scripts/tests/vendor_storefront_browser_v1.mjs`
5. `node --test scripts/tests/vendor_storefront_runtime_v1.test.mjs`
6. `flutter test --no-pub test/storefront_v1_test.dart test/gvvi_vendor_offer_mobile_test.dart test/vendor_mode_workspace_test.dart`
7. From `apps/web`: `npm run typecheck`; focused ESLint on store modules/routes and
   referral/telemetry changes. Stop the dedicated web server before
   `node scripts/tests/vendor_storefront_web_local.mjs --build` from repo root.

The HTTP adapter reads the latest SQL receipt at startup: restart it after a new SQL
run. All tokens/keys it generates are local fixtures. Next may regenerate `next-env.d.ts`
and local dist-directory type includes; those generated changes are not release inputs.

The dedicated PostgreSQL, HTTP adapter and Next processes were stopped after proof;
local fixture data/receipts remain available. Shared services were not stopped.

## Integration and release gates still open

1. Full clean Supabase migration-chain replay and real local GoTrue/Storage journey,
   followed by strict linked schema audit/PrePush at the separately authorized target.
   No migration readiness or production schema parity is claimed by synthetic proof.
2. Recheck current main and reconcile PR #473 before integrating the small native
   `main.dart`/`main_shell.dart` routing patch. No Vault-add implementation was changed.
3. Coordinate the new foreign-key dependencies with active catalog repair operators;
   regenerate/revalidate frozen schema/dependency fingerprints before any schema apply.
4. Physical Android/iOS link, owner setup and media-picking smoke; AASA/manifest source
   additions do not prove deployed link association or device handling.
5. Review database grant provisioning and rollout activation separately. Proposed
   package prices have no subscription collection/provider integration.

Rollback is feature disablement: set the new rollout flags false through a separately
authorized release action, retain all additive data and previous client compatibility.
Do not drop tables, change Vault ownership, or disable legacy QR/Vendor Mode tools.
