# iPad sales desk — October 3, 2026

Worktree `C:/gv_ipad_sales_cart_20261003`, branch
`feature/ipad-sales-cart-20261003`, originally current main
`c9ae9d7981b053ab0009ef37b4a9d6c8cc81d15a`. Main PR585
`b066c1164` was incorporated without overlapping native/schema changes.
Prior receipt PR583 is already live; do not replay it.

Read [the sales cart contract](../contracts/VENDOR_SALES_CART_V1.md).
Source implements native iPad/phone cart, quick manual items, one atomic
multi-copy disposition/receipt transaction, owner-only recovery and web receipt
resolution. No production schema, controls, payment or customer data changed.

Read-only strict `SalesCartBaselineV1` audit passed against production415:
171036 cards /3400 sets /32903 traits; governed schema normalization and all
1119 security objects matched the retained415 replay. It is not PrePush authority.
Migration `20261003100000_vendor_sales_cart_v1.sql` defaults new sales OFF.

Dedicated labs only:

- `sales-cart-full-416-v1-20261003`: loopback64800 DB/64801 API/64804 inbox;
  internal10.245.128.0/24. Full reset and no-op push passed.
- `sales-cart-upgrade-416-v1-20261003`: loopback64820/64821/64824;
  internal10.245.129.0/24. Two retained copies survived415→416 unchanged;
  resulting schema/security matched the fresh replay exactly.
- Both use Supabase PostgreSQL17.6.1.113, workers0 and cron0. Never reset
  populated labs or stop shared Docker. The first attempted network was occupied;
  the guard stopped before creating it, and unused networks were chosen.

`scripts/receipts/prove_sales_cart_v1.mjs` uses real local Auth/PostgREST and
concurrent requests; it removes only generated synthetic records and restores
both controls OFF. It proves mixed copies/manual quantities, account isolation,
atomic rejection, duplicate request recovery, competing cart/single-sale races,
existing customer preservation and stale web-book rejection. Earlier failed
test assertions remain in external evidence; they are not passing receipts.

Native fixture preparation/verification/cleanup is separate and local-only.
`integration_test/sales_desk_local_test.dart` accepts only loopback64801 and a
synthetic email. `test_driver/sales_desk_driver.dart` saves screenshots. The Mac
worktree is `/Users/cesarcabral/grookai_ipad_sales_20261003`; all other trees and
archives remain untouched. Ten old compiler/package-cache directories under
the known memory-print worktree were removed after path/process/archive checks,
recovering about7GB. The exact receipt is in the Mac task-artifact directory.

Actual iPad Pro11 M5/iOS26.4 integration passed against64801 via a temporary
loopback SSH relay: native Auth, one exact copy plus two manual units, atomic
$22.34 receipt, archival and account-change concealment. Screenshots and exact
Mac source hashes were copied back and compared. The website independently
reopened that native receipt and both sources of another multi-copy receipt,
without extra saves. The first web proof timed out on navigation; the corrected
proof waits for the actual authenticated destination. Synthetic fixtures were
removed and both controls restored OFF. The task-created simulator was removed;
all original simulators were preserved.

Mac free space required two additional bounded cleanup passes (old package caches
and compiler intermediates only); the new Mac checkout is sparse to native source.
Source, archives, IPA files, scans and old built products were preserved.

Apple read-only `GET /v1/builds` now returns403
`FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. App Store Connect Business
is open in Chrome for the founder to sign in/review the agreement. No terms were
accepted, no build number guessed/reserved, and no TestFlight upload performed.
Continue other release work independently; re-read Apple state after resolution.

External authoritative status and proofs:
`C:/grookai_vault_operator_artifacts/ipad_sales_cart_20261003`.
Read its latest checkpoint before release, cleanup or continuation. Do not infer
TestFlight distribution or production activation from this source candidate.
Preserve the separate checkout candidate and the active catalog repair agent;
recheck schema/dependency fingerprints before any production migration.
