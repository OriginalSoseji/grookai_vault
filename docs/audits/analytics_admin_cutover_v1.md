# Analytics / Admin Quantity Cutover V1

## Date
2026-03-16

## Objective
Cut over internal dashboards, metrics, and pricing/admin helpers so ownership counts no longer use `vault_items.qty` as truth and instead derive ownership from canonical active instance rows in `public.vault_item_instances` with `archived_at IS NULL`.

## Analytics Dependencies Found

| File / Surface | Classification | Pre-fix metric / behavior | Pre-fix source |
| --- | --- | --- | --- |
| [apps/web/src/app/founder/page.tsx](/c:/grookai_vault/apps/web/src/app/founder/page.tsx) | ACTIVE ANALYTICS DEPENDENCY | Founder dashboard totals, top-card leaderboards, set rollups, recent vault activity | `v_vault_items_web`, `v_recently_added`, bucket-derived `quantity` |
| [supabase/functions/pricing-live-request/index.ts](/c:/grookai_vault/supabase/functions/pricing-live-request/index.ts) | ACTIVE ANALYTICS DEPENDENCY | Freshness tier `vaultCount` for live pricing queue decisions | `vault_items.qty` |
| [backend/pricing/pricing_scheduler_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_scheduler_v1.mjs) | ACTIVE ANALYTICS DEPENDENCY | Scheduler hot/normal/cold prioritization and candidate sorting | summed `vault_items.qty` by `card_id` |
| [backend/pricing/pricing_backfill_worker_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_backfill_worker_v1.mjs) | ACTIVE ANALYTICS DEPENDENCY | Backfill job ranking by collector demand and recency | summed `vault_items.qty` by `card_id` |

## Pre-Fix Behavior
- The founder dashboard treated bucket-view `quantity` as ownership truth and rendered collector demand metrics from `v_vault_items_web` and `v_recently_added`.
- The live pricing edge function used active bucket quantity as the ownership intensity signal for freshness TTL selection.
- The pricing scheduler and pricing backfill worker both ranked cards using aggregated `vault_items.qty`, not canonical instance counts.
- During dual-run this happened to match most cards, but analytics truth still depended on the compatibility mirror instead of canonical owned-object rows.

## Canonical Analytics Applied
- [apps/web/src/app/founder/page.tsx](/c:/grookai_vault/apps/web/src/app/founder/page.tsx) now reads active rows from `vault_item_instances`, resolves slab rows through `slab_certs.card_print_id`, fetches card metadata from `card_prints`, and computes dashboard totals/leaderboards/recent activity from normalized canonical instance rows.
- [supabase/functions/pricing-live-request/index.ts](/c:/grookai_vault/supabase/functions/pricing-live-request/index.ts) now computes `vaultCount` from active raw instances plus active slab instances resolved through `slab_certs`, then applies freshness tiering from canonical counts only.
- [backend/pricing/pricing_scheduler_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_scheduler_v1.mjs) now uses `fetchActiveInstanceCountMap(...)` instead of `fetchVaultQtyMap(...)`, including slab-instance resolution through `slab_certs`.
- [backend/pricing/pricing_backfill_worker_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_backfill_worker_v1.mjs) now ranks backfill candidates from canonical active instance counts and latest active-instance timestamps, including slab-instance resolution through `slab_certs`.
- No touched analytics/admin surface now uses `vault_items.qty`, `SUM(qty)`, or bucket views as ownership truth.

## Verification Results
- `npm run typecheck` in `apps/web` passed after the founder dashboard cutover.
- `node --check backend/pricing/pricing_scheduler_v1.mjs` passed.
- `node --check backend/pricing/pricing_backfill_worker_v1.mjs` passed.
- Local canonical-vs-legacy dual-run parity check passed against the active fixture cards:

| User | Card Print ID | Active canonical instances | Active bucket qty |
| --- | --- | ---: | ---: |
| `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` | 1 | 1 |
| `d8711861-05fa-480c-a252-be6677753aab` | `55555555-5555-5555-5555-555555555555` | 1 | 1 |

- Global local parity check also passed:

| Metric | Value |
| --- | ---: |
| active canonical cards | 2 |
| active legacy cards | 2 |
| mismatch count | 0 |

- I could not run `deno check` for the edge function because `deno` is not installed in this shell environment. The function change was verified by source inspection plus the same canonical counting pattern used in the worker/runtime code.

## Result
PASS

## Remaining Legacy Dependencies
- [backend/vault/vault_instance_backfill_worker_v1.mjs](/c:/grookai_vault/backend/vault/vault_instance_backfill_worker_v1.mjs) still reads `vault_items.qty`, but only for backfill lineage and resumable bucket-to-instance conversion, not analytics truth.
- [apps/web/src/app/wall/page.tsx](/c:/grookai_vault/apps/web/src/app/wall/page.tsx) still reads `v_recently_added`, but that is a collector-facing/content surface outside analytics/admin scope.
- Bucket mirror writes remain in the active write seams by design and were not changed here.
- Historical `vault_item_id` consumers remain out of scope for this phase and still require separate reconciliation planning.

## Next Step
isolate historical `vault_item_id` consumers first
