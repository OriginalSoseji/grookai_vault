# Condition pricing private canary V1

Status: Active. November 17, 2026. Companion to
[TCGTracking condition reference intake V1](TCGTRACKING_CONDITION_REFERENCE_INTAKE_V1.md).

## Scope and authority

The owner's request to take the next implementation step permits a private
founder inspection UI over the completed intake. This version qualifies only
that inspection surface. It does not qualify collector display, commercial
source use, currency, recurring refresh, condition-based valuation or a release.
The intake contract and existing Production V1 pricing authority remain binding.

The bounded set is English Pokemon Dragons Exalted (`bw6`, category 3/group
1394). Selection uses an existing exact child printing and NM/LP/MP/HP/DMG.
Never calculate percentages, interpolate, borrow another condition or finish,
or replace a missing source amount with the existing market headline.

## Read and access boundary

`backend/pricing/condition_pricing_canary_v1.mjs` owns the read model. It reads
the latest private staged receipt, checks its envelope, and rechecks canonical
parent/set/domain, nonprovisional printing, visibility and active mapping
lineage. Parent-based mappings additionally require an active verified-visible
printing truth review. Scope is capped at 500 receipt printing IDs. Stale source
values remain unavailable under the intake's existing freshness policy.

`/founder/pricing/conditions` requires the existing founder capability before
reading its catalog. `/api/founder/condition-pricing/v1` independently validates
the session through the Supabase SDK and checks that capability before price
reads. An explicitly supplied invalid bearer cannot fall back to cookie auth.
Anonymous and ordinary collector requests are denied. Responses are private,
uncacheable and explicitly allowlisted; raw receipts and provider datasets never
reach the browser. The shared server admin client remains server-only.

## Presentation

The client requests the exact printing and condition, clears old amounts while
loading or on failure, aborts superseded requests, and rejects response identity
mismatches. Missing prices show unavailable, and errors allow retry.

Show the supplied amount as a number with an explicit currency-verification
notice. Currency remains null, with an unverified USD hint; do not display a
dollar symbol or claim independently verified official TCGPlayer SKU pricing.
Label the source as a TCGPlayer condition reference via TCGTracking and the
surface as private. Use shared visual tokens, bundled Roboto, 8px controls and
surfaces, and controls at least 44px high.

No mutations, new tables, schedules, shared market RPC changes, Vault total
changes, saved condition changes or vendor asking-price changes belong here.
Broader coverage requires governed existing mappings; the source-only trial
does not establish canonical printing eligibility.

## Verification and release

Verify model behavior, the actual Next route adapter's access boundary, exact
source amounts, missing conditions, rapid switching, failed requests and retries.
Record captured-fixture browser checks separately from deployed authenticated
route checks. Neither a fixture nor type checking constitutes release proof.

This implementation is not deployed. External release follows the repository's
normal qualified release and owner-approval process. Public condition switching
requires a separately qualified integration and resolution of source-use and
currency evidence. Disabling this inspection surface requires no price-pointer
rollback because it never publishes prices.
