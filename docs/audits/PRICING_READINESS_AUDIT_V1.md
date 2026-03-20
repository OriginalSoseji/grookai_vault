# PRICING_READINESS_AUDIT_V1

## Scope

This audit evaluates whether the current Grookai Vault repository is ready to connect or expand broader eBay-driven pricing.

This is an audit-only artifact based on repository evidence as of 2026-03-19. It does not propose schema changes, worker refactors, or UI changes in this pass. Where older docs conflict with current repo/runtime reality, this audit treats current code and active migrations as authoritative and calls the documentation drift out explicitly.

## Repo Evidence Reviewed

Primary docs and contracts reviewed:

- `docs/audits/AUDIT_PRICING_L3_V1.md`
- `docs/audits/PRICING_SCHEMA_AUDIT_V1.md`
- `docs/audits/AUDIT_PRICING_ENGINE_L2.md`
- `docs/audits/AUDIT_MAPPING_ENFORCEMENT_L2.md`
- `docs/audits/AUDIT_EBAY_MAPPING_L2.md`
- `docs/audits/analytics_admin_cutover_v1.md`
- `docs/ops/PRICING_HIGHWAY_WORKER_V1.md`
- `docs/release/PRODUCTION_READINESS_GATE_V1.md`
- `docs/contracts/STABILIZATION_CONTRACT_V1.md`
- `docs/contracts/PRICING_SURFACE_CONTRACT_V1.md`
- `docs/contracts/PRICING_SURFACE_GUARD_V1.md`
- `docs/contracts/PRICING_FRESHNESS_CONTRACT_V1.md`
- `docs/contracts/PRICING_SCHEDULER_CONTRACT_V1.md`
- `docs/contracts/PRICING_CONTRACT_INDEX.md`

Primary backend runtime reviewed:

- `backend/package.json`
- `backend/pricing/pricing_job_runner_v1.mjs`
- `backend/pricing/pricing_queue_worker.mjs`
- `backend/pricing/pricing_scheduler_v1.mjs`
- `backend/pricing/pricing_backfill_worker_v1.mjs`
- `backend/pricing/pricing_queue_priority_contract.mjs`
- `backend/pricing/ebay_browse_prices_worker.mjs`
- `backend/pricing/get_live_price_worker.mjs`
- `backend/clients/ebay_browse_client.mjs`
- `backend/clients/ebay_browse_budget_v1.mjs`
- `backend/ebay/ebay_self_orders_worker.mjs`
- `backend/ebay/ebay_sellers_sync_worker.mjs`

Primary web / app / edge read surfaces reviewed:

- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/lib/getPublicCardByGvId.ts`
- `apps/web/src/lib/explore/getExploreRows.ts`
- `apps/web/src/lib/cards/getPublicCardsByGvIds.ts`
- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- `apps/web/src/components/pricing/VisiblePrice.tsx`
- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/app/vault/page.tsx`
- `apps/web/src/app/founder/page.tsx`
- `apps/web/src/lib/founder/getPricingOpsSummary.ts`
- `lib/card_detail_screen.dart`
- `supabase/functions/pricing-live-request/index.ts`

Primary DB / migration surfaces reviewed:

- `supabase/migrations/20251213153625_baseline_init.sql`
- `supabase/migrations/20251213153627_baseline_views.sql`
- `supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql`
- `supabase/migrations/20260304120000_pricing_jobs_requester_user_id.sql`
- `supabase/migrations/20260304170000_views_security_invoker.sql`
- `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql`
- `supabase/migrations/20260315233000_reconcile_pricing_compatibility_lane_to_v1_1.sql`

## Current Architecture Snapshot

Current repo reality is a mixed pricing system with one canonical public raw-price seam and at least one additional live vault pricing semantic.

Authoritative public raw-price path:

1. `pricing_jobs` queue in `supabase/migrations/20251213153625_baseline_init.sql`
2. authoritative runner `backend/pricing/pricing_job_runner_v1.mjs`
3. active worker `backend/pricing/ebay_browse_prices_worker.mjs`
4. Browse budget guard at `backend/clients/ebay_browse_client.mjs` via `backend/clients/ebay_browse_budget_v1.mjs`
5. canonical active-price tables / views:
   - `ebay_active_price_snapshots`
   - `ebay_active_prices_latest`
   - `card_print_price_curves`
   - `card_print_active_prices`
6. canonical raw-value view `public.v_grookai_value_v1_1` in `supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql`
7. canonical app-facing raw compatibility view `public.v_best_prices_all_gv_v1` in `supabase/migrations/20260315233000_reconcile_pricing_compatibility_lane_to_v1_1.sql`
8. shared web/app read seam `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
9. current public consumers:
   - public card detail
   - explore
   - compare
   - Flutter card detail
   - edge `pricing-live-request`

Live vault pricing path:

1. `public.v_vault_items_web` in `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql`
2. `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
3. vault UI surfaces consume `effective_price`

This means current repo has:

- one canonical public raw seam for `raw_price`, `raw_price_source`, and `raw_price_ts`
- one separate vault-facing effective-price semantic
- legacy pricing tables and older observation lanes still present in schema and docs

Non-authoritative or partial pricing runtime surfaces still present:

- `backend/pricing/pricing_queue_worker.mjs` is explicitly non-authoritative and not for production use
- `backend/pricing/get_live_price_worker.mjs` appears to be utility / CLI support, not a product truth surface
- `backend/ebay/ebay_self_orders_worker.mjs` and `backend/ebay/ebay_sellers_sync_worker.mjs` still write to `price_observations` outside the active Browse raw lane

## Readiness Scorecard

| Domain | Status | Why |
| ------ | ------ | --- |
| Truth Surface | PARTIAL | Public raw-price reads are unified on `v_best_prices_all_gv_v1` plus `card_print_active_prices`, but vault still exposes a separate `effective_price` semantic via `v_vault_items_web`. |
| Queue / Runner | PARTIAL | `pricing_job_runner_v1.mjs` is authoritative and production-safe in pacing, reclaim, retry, and quota behavior, but it still claims jobs FIFO by `requested_at` and does not honor declared priority. |
| Scheduler | PARTIAL | A real budget-aware scheduler exists and a real backfill worker exists, but scheduler contracts are partly stale, rotation is not evident, and committed production wiring for backfill is unproven. |
| Pricing Logic | PARTIAL | Listing filters, number checks, quota control, and monotonicity enforcement exist, but ambiguous listings still collapse into LP and classification remains heuristic rather than fully trust-safe. |
| Source Boundary / Mapping | FAIL | eBay Browse writes directly into canonical active-price tables, while other eBay ingestion workers still write unmapped `price_observations` with null `card_print_id`. Mapping-first boundaries are not fully locked. |
| Observability | PARTIAL | Founder Pricing Ops, budget RPCs, queue telemetry, and retry visibility exist, but burn rate is still estimated, config visibility is not worker-authoritative, and listing-level decision traces are missing. |
| User Trust | FAIL | Web public and vault surfaces still hide important freshness / source / pricing-mode semantics even though the metadata exists or differs underneath. |

## Domain Findings

### Truth Surface

Status: PARTIAL

What is authoritative now:

- `docs/contracts/STABILIZATION_CONTRACT_V1.md` and `docs/contracts/PRICING_SURFACE_CONTRACT_V1.md` both define `public.v_best_prices_all_gv_v1` as the canonical app-facing raw-price surface.
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts` explicitly reads `v_best_prices_all_gv_v1` for `base_market`, `base_source`, and `base_ts`, then joins `card_print_active_prices` for `confidence`, `listing_count`, `updated_at`, and `last_snapshot_at`.
- `apps/web/src/lib/getPublicCardByGvId.ts`, `apps/web/src/lib/explore/getExploreRows.ts`, `apps/web/src/lib/cards/getPublicCardsByGvIds.ts`, `lib/card_detail_screen.dart`, and `supabase/functions/pricing-live-request/index.ts` all now consume that unified raw seam.

What is still split:

- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts` reads `v_vault_items_web`, not the public raw seam.
- `public.v_vault_items_web` in `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql` exposes `effective_price`, `effective_mode`, and `effective_source`, which is a different semantic than the public `raw_price`.
- Vault UI currently receives `effective_price` only, which means product-wide pricing semantics are still not unified even though public raw reads are.

Stale documentation to call out:

- Older pricing audits that describe mobile as reading only `card_print_active_prices` directly are now stale. Current Flutter `lib/card_detail_screen.dart` reads the same unified raw seam as web card detail.

### Queue / Runner

Status: PARTIAL

Authoritative production runner:

- `backend/pricing/pricing_job_runner_v1.mjs`
- reinforced by `docs/ops/PRICING_HIGHWAY_WORKER_V1.md`
- `backend/pricing/pricing_queue_worker.mjs` is explicitly deprecated / non-authoritative

What is production-safe:

- stale lock reclaim in `claimStaleRunningJob(...)`
- quota snapshot checks before job start
- pause-until-next-UTC-day on budget exhaustion
- retryable requeue on 429 exit code `42`
- retryable requeue on quota exhaustion exit code `43`
- durable queue status tracking on `pricing_jobs`

What is not production-ready:

- `claimPendingJob(...)` in `backend/pricing/pricing_job_runner_v1.mjs` orders only by `requested_at asc`
- `backend/pricing/pricing_queue_priority_contract.mjs` defines a priority order, but also exports `AUTHORITATIVE_PRICING_CLAIM_STRATEGY = 'fifo_requested_at'`
- `supabase/functions/pricing-live-request/index.ts` enqueues `priority: "user"`, but the authoritative runner does not enforce that priority in claim order

Dashboard language risk:

- Founder Pricing Ops accurately reflects queue state and retry pressure from `pricing_jobs`, but queue semantics still over-imply meaningful priority because the runtime stores priority while the authoritative runner does not act on it.

### Scheduler

Status: PARTIAL

What exists and is real:

- `backend/pricing/pricing_scheduler_v1.mjs` is a real scheduler
- it is budget-aware through `getEbayBrowseBudgetSnapshot(...)`
- it uses canonical active-instance signals from `vault_item_instances` and `slab_certs`
- it uses `v_best_prices_all_gv_v1`, `ebay_active_prices_latest`, and `card_print_active_prices` to score refresh need
- it enqueues `priority: "scheduled"` with open-job and cooldown guards

What else exists:

- `backend/pricing/pricing_backfill_worker_v1.mjs` is a real worker for unpriced, higher-interest cards

What is partial or unproven:

- no explicit rotation scheduler is evident in repo
- no committed production entrypoint was found for backfill in `backend/package.json`
- `docs/contracts/PRICING_SCHEDULER_CONTRACT_V1.md` is partly stale relative to current code; it still references older truth inputs and older priority assumptions
- `docs/audits/analytics_admin_cutover_v1.md` shows current scheduler inputs have already moved to canonical `vault_item_instances`, so older docs mentioning `vault_items.qty` should not be treated as current truth

Classification by requested domain:

- vault scheduler: present and authoritative enough in code via active instance counts
- rarity scheduler: not a standalone current scheduler; only a backfill heuristic uses rarity as an inclusion filter
- rotation scheduler: not proven
- cold-pool scheduler: partially present through long-tail / cold-catalog logic in `pricing_scheduler_v1.mjs`

### Pricing Logic

Status: PARTIAL

What is strong enough now:

- deterministic query construction and set / number enrichment in `backend/pricing/ebay_browse_prices_worker.mjs`
- collector-number validation and mismatch rejection
- auction / graded / sealed / lot / fake / language / wrong-set filtering
- budget-aware Browse call path via `backend/clients/ebay_browse_client.mjs`
- monotonicity enforcement via `enforceMonotonicCurve(summary)` before writes
- guarded LP floor logic and median trimming

What remains risky:

- ambiguous but otherwise accepted listings still route through `pushBucket('lp', 'unknown_as_lp')`
- classification and fallback remain heuristic, not contractually proven against a persisted observation audit trail
- active Browse worker writes directly to canonical active-price tables instead of first persisting to a generalized canonical observation model and then promoting
- `docs/audits/AUDIT_PRICING_L3_V1.md` is stale on monotonicity; current code now enforces it, so that older finding is superseded

Conclusion:

- current logic is substantially safer than older audits imply
- it is still not trust-hard enough to call fully ready for broader eBay expansion

### Source Boundary / Mapping

Status: FAIL

What is safe:

- the active Browse pricing path starts from a canonical `card_print_id` job and writes to card-print scoped active-price tables

What is not locked:

- `backend/ebay/ebay_self_orders_worker.mjs` inserts into `price_observations` with `card_print_id: null`
- `backend/ebay/ebay_sellers_sync_worker.mjs` also inserts into `price_observations` with null `card_print_id` and explicitly logs that mapping is still pending
- this means eBay-derived observations can still enter pricing-adjacent storage without canonical mapping

Why that matters:

- broader eBay connection would expand source volume before the mapping-first boundary is enforced
- canonical active-price truth is currently isolated only because the active Browse worker starts from canonical jobs, not because the repository has fully locked the ingestion boundary

Documentation drift to call out:

- `docs/audits/AUDIT_MAPPING_ENFORCEMENT_L2.md` and `docs/EBAY_SELLER_SYNC_V1.md` reference `price_aggregates_v1` / `price_index_v1`, but repo search shows those objects only in `docs/legacy_migrations_v0`, not in active `supabase/migrations`
- those docs should not be read as proof of a currently active protected observation promotion lane

### Observability

Status: PARTIAL

What exists now:

- Founder Pricing Ops in `apps/web/src/app/founder/page.tsx`
- server-side ops read model in `apps/web/src/lib/founder/getPricingOpsSummary.ts`
- live Browse budget via working RPCs
- queue health, retry pressure, throughput, velocity, and error distribution from `pricing_jobs`
- worker and scheduler structured logs

What can be diagnosed today:

- whether daily Browse budget is being consumed
- whether pending/running/failed jobs are rising
- whether retry pressure is dominated by 429s or quota exhaustion
- approximate burn rate and projected hours remaining
- whether queue backlog is growing or shrinking

Critical blind spots:

- no persisted Browse call time series beyond a daily aggregate bucket
- burn rate is estimated from started jobs and configured call ceiling, not actual call telemetry
- live config card on Founder reflects web runtime env/default assumptions, not authoritative worker-process runtime state
- no persisted listing-level classification trace for accepted vs rejected Browse items
- no structured per-job phase breadcrumbs beyond status, timestamps, attempts, and one error string

Against `docs/release/PRODUCTION_READINESS_GATE_V1.md`, current observability is much better than older audits, but still not complete enough to call PASS.

### User Trust

Status: FAIL

What is honest enough:

- Flutter card detail in `lib/card_detail_screen.dart` shows source and updated age using `raw_price_source` and freshness metadata

What remains misleading or under-explained:

- web `apps/web/src/components/pricing/VisiblePrice.tsx` renders the value as `Grookai Value` without surfacing source or freshness
- public card detail, explore, and compare use that component even though `raw_price_source`, `raw_price_ts`, and active-price metadata are available from the shared read seam
- vault reads `effective_price` through `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`, but vault UI does not surface `effective_mode`, `effective_source`, or timestamp context

User-visible risk:

- a user can see a price that is raw, derived, stale, or semantically different from another product surface without clear explanation
- that is a trust blocker for broader eBay expansion even if the underlying pipeline continues to improve

## Critical Risks

1. Mapping-first ingestion boundaries are still not locked.
   - Evidence: `backend/ebay/ebay_self_orders_worker.mjs` and `backend/ebay/ebay_sellers_sync_worker.mjs` insert eBay-derived `price_observations` with null `card_print_id`.

2. Product-wide pricing semantics are still split between public raw price and vault effective price.
   - Evidence: `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts` vs `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts` and `public.v_vault_items_web`.

3. Queue priority exists as metadata but is not honored by the authoritative runner.
   - Evidence: `backend/pricing/pricing_queue_priority_contract.mjs` vs FIFO claim logic in `backend/pricing/pricing_job_runner_v1.mjs`.

4. Current pricing logic still uses heuristic ambiguity handling that can silently shape value.
   - Evidence: `unknown_as_lp` handling and direct canonical writes in `backend/pricing/ebay_browse_prices_worker.mjs`.

5. Web trust surfaces under-disclose source and freshness relative to available data.
   - Evidence: `apps/web/src/components/pricing/VisiblePrice.tsx` and vault read/display path.

6. Pricing governance docs are partly stale, which increases operational misread risk.
   - Evidence: `docs/contracts/PRICING_FRESHNESS_CONTRACT_V1.md`, `docs/contracts/PRICING_SCHEDULER_CONTRACT_V1.md`, and docs referencing non-active `price_aggregates_v1` / `price_index_v1`.

## Readiness Verdict

Overall verdict: NOT READY

Why:

- The public raw-price seam is meaningfully improved and the authoritative runner is now production-usable under quota guard.
- But broader eBay connection would still widen the system before two foundational areas are locked:
  - source-boundary / mapping safety
  - user-facing pricing trust and semantic consistency

In other words, the repo is ready enough to operate the current constrained pricing lane, but not ready to broaden eBay-driven pricing without first tightening source isolation, trust semantics, and a few core governance/runtime mismatches.

## Must-Fix Before Broader eBay Connection

1. Mapping-first eBay ingestion boundary
   - Why it blocks readiness: broader eBay ingestion cannot be considered safe while repo-owned eBay workers still persist observations with null canonical identity.
   - Exact repo area to fix: `backend/ebay/ebay_self_orders_worker.mjs`, `backend/ebay/ebay_sellers_sync_worker.mjs`, and the staging / unmatched ingestion path around `price_observations` and `unmatched_price_rows`.

2. Product pricing semantic reconciliation
   - Why it blocks readiness: public raw price and vault effective price remain live but differently defined, which makes broader rollout a trust risk.
   - Exact repo area to fix: `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`, `public.v_vault_items_web` in `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql`, and vault/public pricing display surfaces.

3. User-facing freshness and source disclosure
   - Why it blocks readiness: the system now has useful freshness/source metadata, but the web UI still hides it in the highest-traffic pricing surfaces.
   - Exact repo area to fix: `apps/web/src/components/pricing/VisiblePrice.tsx`, public card detail, explore, compare, and vault pricing displays.

4. Authoritative queue priority truth
   - Why it blocks readiness: broader eBay connection increases contention, and the repo currently stores priority metadata that the authoritative runner does not enforce.
   - Exact repo area to fix: `backend/pricing/pricing_job_runner_v1.mjs`, `backend/pricing/pricing_queue_priority_contract.mjs`, and stale supporting docs that currently imply stronger priority semantics than runtime provides.

5. Pricing governance document drift
   - Why it blocks readiness: operators and future implementation work can be misled by pricing contracts/audits that no longer match current runtime truth.
   - Exact repo area to fix: `docs/contracts/PRICING_FRESHNESS_CONTRACT_V1.md`, `docs/contracts/PRICING_SCHEDULER_CONTRACT_V1.md`, and legacy audit references to `price_aggregates_v1` / `price_index_v1`.

## Safe Next Build Order

1. Lock the mapping-first eBay ingestion boundary so no broader eBay-derived row can reach pricing-adjacent storage without canonical identity or explicit staging.
2. Reconcile product pricing semantics between public raw price and vault effective price, including explicit mode/source/timestamp truth.
3. Upgrade web trust surfaces to show the freshness and source metadata that the read model already carries.
4. Reconcile queue priority semantics by either enforcing priority in the authoritative runner or downgrading the contract/UI language to match actual FIFO behavior.
5. Clean and restate pricing governance docs so operators and future implementation work are anchored to current truth.
6. Expand pricing observability from queue-level metrics into persisted call-level and listing-decision telemetry.
7. Only after steps 1 through 6, evaluate broader eBay connection or ingestion expansion.

## Appendix: Evidence Map

Truth surface evidence:

- `docs/contracts/STABILIZATION_CONTRACT_V1.md`
- `docs/contracts/PRICING_SURFACE_CONTRACT_V1.md`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/lib/getPublicCardByGvId.ts`
- `apps/web/src/lib/explore/getExploreRows.ts`
- `apps/web/src/lib/cards/getPublicCardsByGvIds.ts`
- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql`

Queue / runner evidence:

- `backend/pricing/pricing_job_runner_v1.mjs`
- `backend/pricing/pricing_queue_worker.mjs`
- `backend/pricing/pricing_queue_priority_contract.mjs`
- `docs/ops/PRICING_HIGHWAY_WORKER_V1.md`
- `supabase/functions/pricing-live-request/index.ts`

Scheduler evidence:

- `backend/pricing/pricing_scheduler_v1.mjs`
- `backend/pricing/pricing_backfill_worker_v1.mjs`
- `backend/package.json`
- `docs/contracts/PRICING_SCHEDULER_CONTRACT_V1.md`
- `docs/audits/analytics_admin_cutover_v1.md`

Pricing logic evidence:

- `backend/pricing/ebay_browse_prices_worker.mjs`
- `backend/clients/ebay_browse_client.mjs`
- `backend/clients/ebay_browse_budget_v1.mjs`
- `docs/audits/AUDIT_PRICING_L3_V1.md`

Source boundary / mapping evidence:

- `backend/ebay/ebay_self_orders_worker.mjs`
- `backend/ebay/ebay_sellers_sync_worker.mjs`
- `docs/audits/AUDIT_MAPPING_ENFORCEMENT_L2.md`
- `docs/audits/AUDIT_EBAY_MAPPING_L2.md`
- `docs/EBAY_SELLER_SYNC_V1.md`

Observability evidence:

- `apps/web/src/app/founder/page.tsx`
- `apps/web/src/lib/founder/getPricingOpsSummary.ts`
- `docs/release/PRODUCTION_READINESS_GATE_V1.md`
- `backend/pricing/pricing_job_runner_v1.mjs`
- `backend/pricing/pricing_scheduler_v1.mjs`

User trust evidence:

- `apps/web/src/components/pricing/VisiblePrice.tsx`
- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/app/vault/page.tsx`
- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- `lib/card_detail_screen.dart`
