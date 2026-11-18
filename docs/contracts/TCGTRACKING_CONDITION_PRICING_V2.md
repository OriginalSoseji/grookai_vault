# TCGTracking condition pricing V2

Status: Active implementation contract, November 17, 2026. Source candidate;
not deployed. This version extends V1 private inspection to signed-in collector
condition references and records the owner's source-use clarification.

## Owner decision and supersession

The owner instructed: "OK then just use it. No need to ask for permission unless
they explicitly say not to use it". Use TCGTracking's intentionally published
free Open TCG API without requesting a separate provider permission statement
when no applicable explicit restriction is stated. Respect published restrictions
that apply; absence of a permission statement alone is not a blocker. No provider
message is required or authorized by this decision. Do not accept account/legal
agreements or publish raw datasets as part of this integration.

This decision supersedes the separate-permission requirement in the V1 source
qualification report and any permission prerequisite inferred in
`TCGTRACKING_CONDITION_REFERENCE_INTAKE_V1` or
`CONDITION_PRICING_PRIVATE_CANARY_V1`. It authorizes using the published source,
not a claim that TCGTracking owns the underlying data, can license upstream
rights, or that applicable access agreements have been legally adjudicated.
Keep the earlier review and receipts as historical evidence. The prepared
provider inquiry is superseded and must not be treated as a required next step.

V1 identity, condition isolation, source attribution, freshness and no-percentage
rules remain binding. Reference evidence remains separate from the existing
Production V1 market publication, Vault totals and vendor asking prices.

## Read model and scope

The backend owns `condition_pricing_read_model_v1.mjs`. Accept one exact child
printing UUID and NM/LP/MP/HP/DMG. Supported domain/category/language tuples are
the same four as the intake: MTG English paper, English Pokemon physical,
One Piece English and Japanese Pokemon. No slabs, sealed products or unknown
condition/finish fallback. Never create or modify mappings to improve coverage.

Revalidate nonprovisional child identity, parent/domain, hidden reviews, active
exact mappings and active source-product category/group on each request. English
Pokemon parent fallback needs an active verified-visible review and a unique
nonprovisional sibling for the selected finish. Competing source products,
parents or exact finish mappings remain unavailable. Never use parent fallback
for MTG. Missing and ambiguous mappings produce no price and no provider fetch.

Fetch the documented `/v1/{category}/sets/{group}/skus` endpoint. Preserve the
exact positive numeric `mkt` for the mapped product/finish/language/condition.
Reject strings, null, zero, negative, duplicate or mismatched SKU evidence.
Validate group identity and SKU counts before caching. The older product-detail
endpoint is not a freshness substitute for the documented daily SKU feed.

Cache per process for one hour, coalesce concurrent same-set requests, allow at
most two concurrent group fetches and retain at most six groups/32 MiB of raw
response size. Reject a response over 16 MiB while reading the stream and time
out after 20 seconds. These are local bounds, not a distributed rate-limit claim.
Use normal verified HTTPS. Expired-cache fetch failures must not return old
values. Provider timestamps still expire after 36 hours and cannot be over five
minutes in the future; caching and retrieval never reset observation freshness.

## Client boundary and presentation

`/api/condition-pricing/v1` uses SDK-validated cookie or explicit bearer auth for
ordinary signed-in collectors. Invalid explicit bearer auth cannot borrow a
cookie session. No founder capability is required. Anonymous callers are denied.
The endpoint is exact-only, private/no-store, and returns an explicit DTO
allowlist. No provider datasets, receipts, mappings, account details or admin
credentials go to clients. The service client stays server-only.

The shared web `ConditionPrice` component follows the existing condition and
printing controls in Add to Vault and active raw-copy settings. Cancel old
requests and clear prior values while loading or on errors, unknown condition,
unresolved printing and mismatched responses. Failed condition saves restore
the previous control state and therefore its corresponding price request.
Missing prices remain unavailable with retry for request failures.

Display condition reference pricing attributed to TCGplayer via TCGTracking.
Do not call it independently verified official, live, or modeled pricing.
Confidence is medium when available and unavailable otherwise. Since the feed
does not specify currency, retain null currency, an unverified USD hint and a
visible "USD assumed" label; this uncertainty does not stop source integration.
Preserve shared fonts/theme tokens and 8px functional surfaces.

## Writes and release

This read path has no production mutations, migrations or new scheduled jobs.
It does not reuse the consumed intake acknowledgement, import a new batch,
alter market RPCs, change asking-price rules or recalculate Vault totals. Existing
condition and Add to Vault writes retain their current owner-write authority.
Do not silently use the new reference amount as the existing market valuation.

Verify mapping isolation, exact amounts, stale data, source/cache failures,
auth, response allowlisting, real control switching and error recovery.
Read-only backend checks against production and local captured-data browser
fixtures are separate from deployed authenticated application acceptance.
Release still follows the existing repository release process. A source-use
decision alone is not evidence of a deployment or native integration.
