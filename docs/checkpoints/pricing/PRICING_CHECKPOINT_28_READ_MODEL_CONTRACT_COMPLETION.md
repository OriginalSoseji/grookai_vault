# Pricing Checkpoint 28: Read Model Contract Completion

## Context

TCGPlayer Market Product V1 already had immutable qualification and
publication ledgers, exact-printing publication, authenticated product reads,
shared web and Flutter clients, and a frozen 100-printing production canary.

The implementation was audited from the database RPC through the parent
summary, web service, server-rendered card pricing rail, and Flutter services.
That audit found a remaining contract gap even though the existing canary was
healthy.

## Problem

The shared pricing read model did not return `published_at`. Parent rows also
discarded the identity and provenance of the exact printing selected for the
parent price.

The top-market read path still summarized active listings from the raw listing
warehouse instead of the governed current active-ask snapshot. It also omitted
the exact printing identity, publication timestamp, and provenance backing the
displayed parent amount.

Without these fields, a client could display a correct amount while being
unable to prove which exact printing and immutable publication produced it.
The server-rendered web selector also needed to distinguish exact rows from
parent rows now that parent rows intentionally retain the selected printing
identity.

## Risk

- A displayed parent amount could lose its exact-printing provenance.
- `observed_at` could be presented as publication time.
- A product read could depend on a raw listing aggregate.
- A parent row carrying a selected printing ID could be mistaken for an exact
  printing row by client selection code.
- Detail and top-market surfaces could expose different pricing semantics.

## Decision

The Product V1 read contract now preserves two separate timestamps:

- `observed_at`: when TCGPlayer observed the market price
- `published_at`: when Grookai published the qualified immutable snapshot

Every parent amount is backed by one deterministic current eligible exact
printing. The parent row retains that printing's:

- `card_printing_id`
- `printing_gv_id`
- `finish_key`
- `provenance_id`
- `observed_at`
- `published_at`

For a parent with multiple eligible printings, the selected row is the minimum
eligible TCGPlayer Market amount and the response remains explicitly
`pricing_scope = parent` and `is_from_price = true`.

For a parent with one eligible printing, the same exact identity is exposed
with `is_from_price = false`.

The top-market read now consumes the governed current price view and the
indexed current active-ask snapshot. It does not aggregate the raw listing
warehouse in a product request.

Client exact-printing selection requires
`pricing_scope = card_printing`; identity fields on a parent row cannot make it
an exact row.

## Alternatives Rejected

- Keeping only `observed_at` was rejected because source observation and
  governed publication are different events.
- Returning an anonymous parent minimum without exact-printing identity was
  rejected because the displayed amount would not be fully traceable.
- Recomputing active asks from raw listings per request was rejected because
  product clients must consume governed read models, not source archives.
- Removing exact identity from parent rows was rejected because it would hide
  the evidence used to calculate `From`.
- Treating any row with `card_printing_id` as exact was rejected because parent
  rows now preserve backing identity intentionally.

## Implementation

Producing code commit:

`71f4d679`

Immutable migration:

`supabase/migrations/20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql`

The migration recreates:

- `get_market_pricing_read_model_v1(uuid[], uuid[])`
- `v_market_price_parent_summary_v1`
- `get_top_market_pricing_v1(integer)`

It preserves authenticated and service-role execution while denying anonymous
and public execution.

Updated consumers:

- `apps/web/src/lib/pricing/marketPricingReadModelV1.ts`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/components/pricing/CardPagePricingRail.tsx`
- `lib/services/public/card_surface_pricing_service.dart`
- `lib/services/network/network_stream_service.dart`

Updated contract and proof:

- `docs/contracts/TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md`
- `scripts/audits/tcgplayer_market_publication_local_smoke_v1.mjs`
- `tests/contracts/tcgplayer_market_read_model_contract_completion_v1.test.mjs`

## Migration Proof

The complete migration chain rebuilt from zero twice with:

`supabase db reset --local --yes`

The final migration also applied through the normal local upgrade path.

Authenticated unavailable readback proved:

- `pricing_scope = parent`
- `status = unavailable`
- `unavailable_reason = no_current_qualified_market_price`
- `published_at = null`
- `eligible_printing_count = 0`

Function ACL readback proved:

- authenticated execution: allowed
- anonymous execution: denied

No production migration was applied in this checkpoint.

## Local Publication Proof

Command:

`node scripts/audits/tcgplayer_market_publication_local_smoke_v1.mjs`

Result:

- status: `passed`
- source run: `00ef5da3-4d9e-4bf7-b22f-e4b288f5a279`
- canonical card print:
  `1574c412-b466-487f-8297-75d3b09b313e`
- exact card printing:
  `4b5dc994-aec2-4d73-a57a-5b5d1aac11b7`
- first publication set:
  `6df9626e-3ca4-4a2d-a6ee-de53cb8ecd20`
- replacement publication set:
  `9ecafaff-21e1-4ead-9875-4c18fd83b178`
- restored publication set:
  `6df9626e-3ca4-4a2d-a6ee-de53cb8ecd20`
- market close: `$12.34`
- authenticated read rows: `2`
- parent identity matches exact: `true`
- parent publication timestamp matches exact: `true`
- parent provenance matches exact: `true`
- authenticated provenance tracing: denied
- service-role provenance tracing: allowed
- service trace rows: `1`

The smoke test proves publication replacement and rollback without losing the
exact/parent contract or widening provenance access.

Local artifact root:

`artifacts/market_pricing_product_v1/local_smoke/2026-07-28T12-50-06-073Z`

Key SHA-256 hashes:

- `local_smoke_summary.json`:
  `bbb85ac1c8ae8629ab96bbe8afb44db193b361c5ab14925129558889e06bcd72`
- first `qualification_decisions.jsonl`:
  `395f607dba9e44edc4f0e1f78370a006197a4abed3bf163d17799ce03da0b8df`
- first `reconciliation.json`:
  `ef3f959e0e915236a451a37d07e230fa1bcbd598a51df68cc69029f1dac6e690`
- first `run_plan.json`:
  `d605b1d192fe7d15856a7e46e5cdca3d1d3a8519bcaa94ea66aecccaf64b8d82`
- first `summary.json`:
  `319cdfba8000594f1aa726938e0370fa1ea644d7df8b71e91385f10ae59eb6e0`
- replacement `qualification_decisions.jsonl`:
  `3308d0c643d4a2416eab428b8d882bc006efa397a15821d52d3f97b9519c6346`
- replacement `reconciliation.json`:
  `ef3f959e0e915236a451a37d07e230fa1bcbd598a51df68cc69029f1dac6e690`
- replacement `run_plan.json`:
  `773d1b617f7d3c19c44a9feeb6bf8ac18d221b7e34070dc94a90138b02534776`
- replacement `summary.json`:
  `1b0cf82dd4d6e329e662bf0d9b0fdaf32666a432452ebaf183603ec1dee23890`

## Tests

- New read-model completion contracts: `11/11` passed
- Focused pricing contract suite: `47/47` passed
- Complete contract suite: `835/835` passed
- Web typecheck: passed
- Web lint: passed
- Web strict production build: passed
- Flutter analysis: passed
- Flutter tests: `302/302` passed
- Release secret guard: passed
- Runtime preflight: passed with known deferred debt and zero critical failures
- `git diff --check`: passed
- Full pre-commit shipcheck for `71f4d679`: passed

## Current Truths

- The read-model contract completion is committed locally at `71f4d679`.
- The branch is `pricing/mee-productization-v1`.
- The dirty `pricing/full-tcgcsv-warehouse` worktree was not changed.
- The new migration has not been applied to production.
- The production canary remains frozen on
  `c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d`.
- The active canary publication was not changed.
- The 72-hour canary gate still ends at
  `2026-07-31T08:40:15.793Z`.
- Anonymous pricing reads remain denied.
- Licensing and public display authority remain externally unresolved.
- MEE Pricing Platform Production V1 is not complete.

## Invariants

- Source observation time and Grookai publication time remain distinct.
- Every parent amount identifies its selected exact eligible printing.
- Parent identity evidence never changes a parent row into an exact row.
- Product reads never aggregate the raw listing warehouse.
- Supporting market metrics and eBay active asks never modify TCGPlayer Market.
- Exact printings never inherit a sibling or parent value.
- Ordinary authenticated clients cannot trace internal provenance details.
- Only a service role can write qualification or publication evidence.
- The frozen canary remains unchanged until its observation gate completes.
- Anonymous access remains closed until all public rollout gates pass.

## Exact Next Gate

Push the isolated implementation branch, continue read-only observation of the
frozen canary, and wait until `2026-07-31T08:40:15.793Z`.

At or after that timestamp:

1. require the frozen 72-hour canary to pass
2. deploy the exact clean corrected rollout commit, including this migration
3. run a fresh full-source V1.2 shadow
4. require the fixed coverage threshold
5. activate the complete eligible signed-in publication with no row limit
6. require read-model, API, provenance, rollback, performance, and surface
   checks
7. enable exact-commit scheduling
8. observe seven unattended daily cycles

Do not grant anonymous access.
