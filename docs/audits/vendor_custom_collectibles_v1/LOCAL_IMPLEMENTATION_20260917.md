# Custom vendor collectibles — local implementation receipt

Implemented in the existing `C:/grookai_vault_storefronts_v1` worktree on
`feature/vendor-storefronts-v1`, preserving its uncommitted storefront candidate.
HEAD remains `a14388f689235d62b3165c1dd88aaa4c562ab186`; no commit, push, merge,
remote migration, production entitlement change, worker activation or deployment.

## Source and isolation

`starting-source.json` records all 49 starting dirty files and their SHA-256 hashes.
The original complete patch is retained locally at `.local/storefront/custom-start.patch`.
Branch/HEAD, dirty state, worktrees, applicable AGENTS, rulebook, operator playbook,
storefront contract, provisional warehouse and ownership models were inspected.
No concurrent editor process for this worktree was detected. No other checkout,
catalog repair evidence, manifest, writer or Vault-add behavior was edited.

`final-source.json` inventories the full final dirty candidate, classifying each
file as preserved, changed by this extension, or new, with hashes. It excludes its
own self-referential hash. `changed-files.md` gives the exact extension file list.
The original storefront migration and every file under
`docs/audits/vendor_storefronts_v1/` are byte-preserved against the starting manifest.

Only `20260918070000_vendor_custom_collectibles_v1.sql` is added by this extension.
It adds three custom tables, store currency, the disabled-by-default custom rollout
switch, governed functions/policies, durable entitlement suspension and product
history. It replaces the store publish function additively to allow an explicitly
published custom-only store. No historical migration is modified.

The required strict linked audit was attempted and stopped at “Cannot find project
ref” in this intentionally unlinked worktree. No project was linked to bypass it.
A read-only Docker info probe pinned to the local Windows pipe timed out after
10 seconds. Full Supabase replay/Auth/Storage verification therefore remains open.

## Resulting behavior

Vendor Mode store management offers catalog-connected selection and custom
collectibles. The custom workflow supports incomplete drafts, all requested seller
fields, private SKU, vendor-managed price/quantity, private photo uploads (eight,
5 MB each), photo ordering/removal, existing selected store sections, app/web owner
preview, explicit publication/unpublication and retained archive. USD is the only
custom currency in this version; the store owns that setting and callers cannot
override it. Catalog prices and currencies are untouched.

Custom UUIDs and `/store/{slug}/products/{uuid}` routes are stable. There are no
fake GVVIs, catalog placeholders, automatic matches, conversion shortcuts, market
valuations or authenticity claims. Details explicitly say “Seller-provided details.”
The existing provisional model is catalog-review authority without ownership or
pricing; the existing owned-collectible model requires a canonical anchor and
exact-copy GVVIs. Neither is suitable for seller-authored quantity listings.

The mixed V2 DTO preserves individual catalog copies and exact-printing eligibility,
adds typed custom entries, and uses eligible-record counts, bounded pagination,
literal search and deterministic ordering. Catalog condition/raw/slab filters
retain their meaning; custom free-text condition is not a canonical grade.
Custom section membership is a separate product-to-selected-store-section join;
card-only Wall memberships are untouched. Private fields/storage paths are absent
from public projections, details, metadata and generic errors.

Owner writes lock the existing store/product and check an expected version.
Concurrent quantity saves produce one accepted write and one HTTP 409; native
editing preserves unsaved text and confirms discarding it on reload. Zero stock,
invalidated publication requirements, removal of all photos and loss of app-store
access suspend publication; repairs/restocking/re-upgrade never restore it.
Web-to-app downgrade preserves app access and requires explicit web republishing.
Owners retain inspection, previews, unpublish and archive without a grant.

Media streams recheck current store audience, entitlement, privacy, product
publication/availability and photo attachment. No signed public URL is minted.
Failed delivery renders “Photo unavailable.” Removed/orphaned photos remain private;
garbage collection is intentionally separate. Product links preserve login/native
destinations and use the existing server-derived store referral context.

## Executed local proof

All SQL ran in a new timestamped synthetic database on the existing dedicated
`127.0.0.1:15438` cluster after verifying its exact data directory. No reset or
schema apply touched shared Supabase 54321/54330 or repair databases. The adapter
on 15439 and Next on 15440 used synthetic tokens only; the launcher strips inherited
application environment, disables telemetry and rejects non-loopback networking.

| Check | Result |
|---|---|
| PostgreSQL baseline plus custom extension | 49 passed: 31 existing + 18 custom |
| Custom API/browser scenarios | 9 passed, desktop 1440px and mobile 390px |
| Existing storefront API/browser suite with custom rollout off | 9 passed |
| Flutter custom service/widget/route/visual tests | 7 passed |
| Existing storefront Flutter tests | 5 passed |
| Existing native Vendor Mode and GVVI offer tests | 6 passed |
| Existing storefront/referral runtime tests | 7 passed |
| Selected legacy QR/entitlement/Vendor Mode contracts | 21 passed |
| Existing QR runtime/bitmap/crypto tests | 6 passed |
| Focused Flutter analysis, including custom tests | No issues |
| Web TypeScript, focused ESLint, optimized isolated Next build | Passed |

SQL covers drafts, owner isolation, base-table denial, strict numeric/text/currency
validation, foreign product/photo/section rejection, explicit publication, public
allowlists, app/web parity, mixed filters/sections/pages, racing versioned writes,
zero/restock/unpublish/archive, privacy, missing profile identity, rollout disable,
app-only packages, downgrade/re-upgrade and custom-only store publication. It also
retests V2 quarantine, unassigned printing and transfer boundaries and compares
canonical/Vault/Wall snapshots before and after custom actions.

HTTP/browser coverage includes rejected upload types/sizes/scopes, private draft
photos, photo ordering/removal, 409 conflicts, next-read media revocation, forged
origin/audience rejection, safe complete auth destinations, escaped script-like
seller text, distinct GVVI/product links, encrypted HttpOnly referral cookies,
unavailable-photo rendering and archived owner retention. The old browser test has
only its empty-state wording updated; its prior receipts are retained unchanged.

Flutter proof covers typed mixed navigation, deep-link validation, all three link
forms and preview query retention, separate authenticated/preview endpoints,
expected-version submission, bad upload rejection, draft-only saves, publication
confirmation/cancel, conflict text retention and explicit reload. The route test
found and fixed query loss for slash-style app links.

`sql-receipt.json`, `browser-receipt.json`, `legacy-browser-receipt.json` and
`checks.json` record these results. Six PNGs show desktop/mobile grid and product
detail plus native draft editor/preview. All were inspected for text, overflow,
seller claims, distinct links and unavailable media. Native PNGs are widget renders
of draft states, using local test fonts; they are not device or camera/gallery proof.
Browser images use an explicitly synthetic photo fixture; no external images or
production catalog requests were made. Full-page mobile captures include the
existing fixed navigation overlay at its viewport position.

## Reproduction and remaining gates

1. Start only the verified dedicated PostgreSQL data directory and unused 15438
   listener; follow the preceding storefront receipt's isolation checks.
2. `node scripts/tests/vendor_custom_collectibles_local_v1.mjs` creates a new
   timestamped database, reruns V1 and applies/tests the additive extension.
3. `node scripts/tests/vendor_storefront_http_fixture.mjs --custom` reads the new
   custom receipt. Restart only this adapter after each new SQL fixture run.
4. `node scripts/tests/vendor_storefront_web_local.mjs` launches guarded Next.
5. `node scripts/tests/vendor_custom_collectibles_browser_v1.mjs` creates and
   archives its own synthetic product and writes screenshots/receipts locally.
6. `flutter test --no-pub test/custom_collectibles_v1_test.dart test/storefront_v1_test.dart test/gvvi_vendor_offer_mobile_test.dart test/vendor_mode_workspace_test.dart`.
   To regenerate native receipt PNGs on this Windows fixture host, run the custom
   test with `--update-goldens --dart-define=CUSTOM_VISUALS=true`; normal tests do
   not require visual artifacts or Windows fonts.
7. Run the runtime/contracts/QR commands listed in `checks.json`, targeted analyzer,
   TypeScript and ESLint. Stop Next before the isolated launcher's `--build` mode.

The dedicated PostgreSQL, adapter and Next processes were stopped after proof;
data and receipts remain. Generated Next local-dist typing changes were restored.

Release gates remain: full historical migration replay in dedicated Supabase;
actual GoTrue/Storage upload, auth refresh and media-policy tests; physical native
photo picking and deep links; current-main/PR #473 navigation reconciliation;
catalog-repair dependency fingerprint coordination; strict target schema audit
and separately reviewed rollout/entitlement provisioning. The synthetic adapter
implements relevant HTTP semantics but is not real Supabase. No production/runtime
or billing readiness is claimed, and no external integration approval was sought.

Rollback is a separately authorized `custom_enabled=false` operational change,
retaining products, stock, history and private media. It blocks public custom data
and new custom edits while leaving catalog storefronts and retained owner access.
Do not drop schema or mutate canonical/Vault ownership. The original app/web
rollout flags remain available for broader storefront rollback.
