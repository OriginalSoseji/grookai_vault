# Production Backend Launch V1 Gate Status - 2026-08-26

## Status

Backend and governed pricing execution are operationally proven. Public launch
is not yet authorized because provider billing/autoscale evidence,
same-candidate client verification, and the final candidate soak remain open.

## Frozen Source

- Branch: `release/production-backend-launch-v1`
- Pricing/coverage/index candidate: `ccf4062946e961a84acc303941e61cb09bc6c0eb`
- Retention and control-plane repair: `ed9771e5c052e692585edfe8af93f18938b34e07`
- Production pricing runtime: `4b6064a5fb7eeacb7887c240735fc6dd8ffec06f`
- Production control-plane runtime: `ed9771e5c052e692585edfe8af93f18938b34e07`

## Context

The final backend gate required current operational evidence, not another
feature checklist. It combined a full governed pricing cycle, exact pricing
readback, production coverage, database performance, Supabase provider state,
backup and restore evidence, worker-host retention, and the live production
control plane.

## Problem

Three concrete defects were found during execution:

1. the pending GV-ID trigram index used an unqualified operator class while
   production installs `pg_trgm` in the `extensions` schema;
2. the production coverage audit assumed shadow mode and performed repeated
   full scans that were not suitable for the 206,304-row production run;
3. immutable-release retention removed backend release `c434101ee` even though
   the active control-plane release referenced its `node_modules` directory.

The third defect caused `grookai-production-control-plane.service` to fail
every 15 minutes with `ERR_MODULE_NOT_FOUND`.

## Risk

- A failed migration could leave schema history ambiguous.
- Repeated full candidate scans could make routine coverage verification
  operationally expensive or time out.
- Cross-release dependency deletion could silently disable monitoring after a
  successful retention run.
- Launching without one synchronized client candidate would make rollback and
  incident attribution unreliable.

## Decision

- Qualify the index operator class as `extensions.gin_trgm_ops` and retain one
  exact migration ledger entry.
- Read large pricing candidate sets through bounded read-only cursors and
  evaluate the selected production run against Product Scope V1.3.
- Make control-plane releases self-contained and protect cross-release symlink
  dependencies transitively in retention.
- Fail closed when a protected release has a missing allowlisted dependency.
- Preserve external financial and client gates instead of weakening them.

## Verified Current Truths

### Pricing

- Production run ID: `70ab50a3-1603-47d3-96ab-30c42515e7fa`
- Run key: `TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-2026-08-26-publication`
- State: `verified`
- Reconciliation: `reconciled`
- Source price rows: `546,717`
- Selected rows: `206,304`
- Mapped rows: `175,496`
- Eligible/current snapshots: `164,135`
- Broken provenance traces: `0`
- Exact Vault sample: `12/12` returned, `11` priced, `1` explicitly unpriced
- Vault total: `$1,616.52`, with zero duplicate or foreign-owner rows
- Pokemon exact governed coverage: `31,181 / 32,716`, or `95.308%`
- Classified coverage gaps: `1,535`
- Published rows outside Product Scope V1.3: `0`

### Database And Reads

- Migration `20260826070000` is present in the production ledger.
- `card_prints_gv_id_trgm_idx` is valid, ready, and selected by PostgreSQL for
  case-insensitive GV-ID lookup.
- Canonical card count remained `169,914`.
- Non-null GV-ID count remained `169,852`.
- Current governed price count remained `164,135`.
- Post-index pricing reads: `180/180`, zero errors and zero row mismatches.
- Worst measured p95: `172.061 ms`, below the `500 ms` gate.
- The earlier five-minute launch load passed `9,900/9,900` requests at `33 RPS`.

### Supabase

- Project status: `ACTIVE_HEALTHY`
- Compute: Medium, 2 CPU cores, 4 GB memory
- Project read-only: false
- Current memory observation: approximately `51.3%`
- Disk: approximately `69.2%` of `320 GB`
- Completed physical backups: `8`
- WAL-G: enabled
- Isolated restore drill: verified, with the provider-owned collation repair
  still tracked through Supabase support request `SU-454155`
- PITR: disabled

### Runtime Control Plane

- Active control-plane release: `/opt/grookai/releases/control-plane/ed9771e5c0`
- Production timer: active
- Latest launch summary: `13 healthy / 0 failed / 0 unmeasured`
- Scanner V3 and V5 services and HTTP health probes: passed
- New-set discovery: fresh, with governed review backlog preserved
- Pricing pipeline, source sync, MEE, alerts, web edge, MTG supervisor, and
  mobile workflow evidence: healthy
- Four background Class C lanes remain explicitly unmeasured and nonlaunch
  critical.

### Worker-Host Retention

- Active and rollback release dependencies are protected transitively.
- Missing cross-release dependencies fail before removal.
- The active control-plane release owns its runtime dependencies.
- The rollback control-plane dependency resolves to retained backend release
  `4b6064a5f`.
- The repaired retention service completed successfully.
- Obsolete control-plane release `c54047c35f` was removed by the governed
  retention service only after plan proof.
- Worker-host free space after cleanup: `24,052,490,240` bytes.

## Verification

- Full contract suite: `2,451/2,451` passed.
- Full pre-commit shipcheck passed twice after the final repairs.
- Web typecheck, lint, and strict production build passed.
- Flutter analyze passed.
- Flutter tests: `634/634` passed.
- Secret packaging guard and runtime preflight passed.
- Linked migration list and no-pending dry run passed after apply.

## Permanent Evidence

- `C:\secure-ops\production-backend-launch\pricing-verification\20260826T074500Z_production_cycle_controls`
- `C:\secure-ops\production-backend-launch\pricing-verification\20260826T074500Z_production_coverage_final\2026-08-26T08-21-48-300Z`
- `C:\secure-ops\production-backend-launch\database-performance\20260826T082300Z_gv_id_trgm_apply`
- `C:\secure-ops\production-backend-launch\control-plane\20260826T084200Z_self_contained_repair`
- `C:\secure-ops\production-backend-launch\supabase-capacity\20260826T023644Z_provider_post_pricing_index`
- `C:\secure-ops\production-backend-launch\supabase-capacity\20260826T023718Z_metrics_post_pricing_index`
- `C:\secure-ops\production-backend-launch\supabase-managed\20260826T023624Z_post_pricing_index`
- `C:\secure-ops\production-backend-launch\automated-readiness\2026-08-26T08-38-25-990Z_read_only`
- Raw 1.5 GB pricing evidence remains retained at
  `/var/lib/grookai/market-pricing/TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-2026-08-26`.

## Invariants

- No user, Vault, pricing-source, canonical, or Storage data is deleted by
  launch repair.
- Every published price remains attributable to exact source evidence and the
  governed publication generation.
- Anonymous pricing remains denied until its separate authority gate.
- A successful worker exit never substitutes for terminal database
  reconciliation.
- Runtime evidence under `/var/lib/grookai` is outside immutable-release
  retention authority.

## Remaining Gates

1. Capture signed-in Supabase billing-cycle cached and uncached egress, quota
   status, Spend Cap state, and effective autoscale settings.
2. Decide whether to purchase PITR. Until then, recovery is limited to physical
   backups and the proven restore procedure.
3. Push one consolidated final candidate and obtain successful current web and
   Flutter CI from that source.
4. Build and verify web, Android, and iOS journeys from the same candidate for
   authentication, search, pricing, Vault, images, sharing, and Memory links.
5. Freeze rollback metadata and execute the final 72-hour same-candidate soak.
6. Produce the zero-mismatch final launch report.

## Explicit Next Gate

Create one consolidated release commit and push it once. Require current web
and Flutter CI to pass, then build and test all three clients from that exact
SHA. Do not start the 72-hour soak until those client proofs and the provider
billing/autoscale evidence are attached to the candidate manifest.
