# Collector Website Production Release V1

September 11, 2026 (America/Denver). Founder approved the proposed final production
verification and conditional website switch: "ok do it." This supersedes prior
no-rollout boundaries only after the following evidence gates pass.

## Scope And Preservation

Work in `C:/grookai_vault_collector_release` on
`release/collector-web-production-20260912`, based on actual live/main
`31372a7c69c221adbfa6ac8c9505d929fe3ec08c`. Preserve original live deployment
`dpl_EZXp6L6jkUdVCGJPvAALFJSXc3JQ`, protected staging, both source snapshots and
private recovery assets. Never modify the preserved design tree to prepare release.
No database migration, canonical/price mutation, ingestion, worker change, mobile
build, private-user copy, destructive cleanup or feature-gate expansion.

Import only manifest-verified web implementation and focused tests from the
preserved candidate. Keep live backend/schema and operational changes intact.
No test fixtures, credentials or staging deployment automation in production.

## Required Gates

1. Freeze source lineage and route parity against live. Preserve every existing
   tab and non-replaced workflow. Review behavioral changes, not only filenames.
2. Explicit production runtime configuration must reject staging/sample databases,
   while staging still rejects production credentials. No dev build against prod.
3. Read-only production inspection: environment, required RPCs/signatures/grants,
   catalog availability, current pricing and existing feature flags. SQL inspections
   use a read-only transaction, bounded queries and timeout. Never copy private users.
4. Test pricing, exact printings, collection totals including sealed, Pokemon/MTG/
   One Piece search/sets, authentication, Wall, Pulse/Discover, Dex, Binders, sharing,
   images and correction routes. Synthetic write tests remain isolated in staging.
5. Build a production release artifact only after source tests and compatibility
   checks pass. Do not repoint the staging application at production as a shortcut.
6. Switch the production website only if all critical gates pass. Freeze deployment
   IDs and a website rollback procedure first. Verify source/main/deployment have
   not drifted. Smoke-test immediately; revert website deployment on regression.

## Stop Conditions

Do not switch live with a failed critical workflow, missing required backend
contract, unauthenticated data leak, lost pricing/ownership, missing TCG or sealed
coverage, unverified source/package, or preservation mismatch. Repair within this
website scope where possible; report any backend/migration gate separately instead
of weakening evidence or claiming success. A website rollback never reverses data.

Record results and remaining gates in
`docs/ops/COLLECTOR_WEB_PRODUCTION_RELEASE_CHECKPOINT_20260912.md`.
