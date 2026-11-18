# Condition pricing V2 — November 17, 2026

Current release integration:
[release candidate checkpoint](TCGTRACKING_CONDITION_RELEASE_20261117.md).
It carries this implementation onto PR945/current main in a separate release
checkout. The implementation-phase observations below remain historical proof.

The owner authorized using TCGTracking's intentionally published free API
without a separate permission request unless an applicable restriction is
explicit. That preference is recorded in
[V2](../../contracts/TCGTRACKING_CONDITION_PRICING_V2.md); the previous permission
inquiry is superseded and was not sent. Unknown currency remains accurately
represented and no longer stops implementing condition references.

## Implementation

Source candidate in `C:/grookai_condition_pricing_20261117`, branch
`codex/tcgtracking-condition-pricing-v1`. The original dirty checkout is preserved.
No deployment, production writes, new import, schedule or native integration was
performed. No consumed acknowledgement was reused.

- Shared backend: `backend/pricing/condition_pricing_read_model_v1.mjs`.
- Signed-in cookie/bearer endpoint: `/api/condition-pricing/v1`, with no founder
  requirement. The previous founder-only snapshot preview remains available in
  source as a separate inspection surface.
- Web control integration: Add to Vault condition buttons and active raw-copy
  settings automatically request the selected exact printing and condition.
  Unknown condition, unresolved printing, missing evidence and failed/mismatched
  requests clear the old amount. Copy condition-save failures restore the
  previous condition and corresponding price; graded/archived copies are excluded.
- Current mapping/review checks run for each request. Existing exact mappings
  across the four supported domains are eligible; this is not a promise that
  every database card has a valid mapping or all five source prices.
- Published daily set SKU feeds are fetched on demand with a one-hour bounded
  process cache. Same-set requests coalesce, at most two groups fetch concurrently,
  one response is limited to 16 MiB, and six groups/32 MiB of raw response size
  bound the cache. Freshness still uses provider time and expires after 36 hours.
- Only exact positive supplied market amounts qualify. No percentages or
  condition/finish fallback. Available references have medium confidence and
  explicit TCGplayer/TCGTracking attribution. Currency is null with an unverified
  USD hint; the UI says "USD assumed".

The shared current market RPC, headline publication, Vault total calculations,
asking-price rules and Square/eBay integrations are untouched. The new amount is
a separate condition reference, not a replacement valuation.

## Verification

Canonical routing was verified through the existing shared backend client:
173,837 card prints, 3,420 sets and 47,409 traits in project
`ycdxbpibncqcchqiihfz`. Counts meet the repository's environment gates.

Read-only live checks selected seven printings across all four supported source
categories and requested all five conditions: 35 selections, 23 positive prices,
12 unavailable. Each available amount matched the exact source product, finish,
language and condition. English Dragons Exalted still contributes four eligible
printings, 18 available amounts and two unavailable. The additional MTG sample
has an LP amount and no NM value; it stayed unpriced for NM rather than borrowing
LP. These are sampled live checks, not a full-database coverage census.

Final live proof: `artifacts/condition_price_read_model_v1/20261117-r4/readback.json`.
The repeatable script is `scripts/audits/condition_price_read_model_live_v1.mjs`.
It makes no production writes. The first environment-count attempt failed
transiently and the second attempt exposed an audit-script receipt-envelope
error; both were corrected before the successful complete readback. The final
readback independently checks unavailable selections too and binds executing
module hashes. The API
product-detail probe returned older embedded pricing, so the implementation uses
the documented daily set SKU endpoint instead.

All 39 targeted Node tests passed, including 13 new model/cache/route checks.
Web TypeScript checking and targeted ESLint passed. Thirteen existing Vault
ownership/curation/removal regression tests and the release secret-packaging
guard also passed. Tests exercise mapping and
condition isolation, unknown domain/finish, active/hidden eligibility, competing
products/parents, MTG split-parent finish, stale/null/string/duplicate evidence,
cache expiry/concurrency/stream bounds, source failures, authenticated collector
access, invalid bearer handling and DTO allowlisting.

Browser checks use the actual Add to Vault and copy-settings React components
in a loopback fixture with saved live DTOs. Authentication, navigation and save
actions are mocked; no copies are added or changed. All 20 Add to Vault selections
passed, as did failed-save price restoration and graded/archived exclusions in
the actual copy-settings component. Desktop and 320px light/dark screenshots
were inspected; there was no horizontal overflow. This is separate from the
live backend read and the Next route adapter's mocked SDK tests. These checks do
not prove a deployed authenticated website or native app.

Audit screenshots, browser check source/results and the safe sampled readback
are retained under `docs/audits/pricing/condition_pricing_v2/`.

Targeted test command:

```powershell
node --test tests/contracts/tcgtracking_condition_reference_v1.test.mjs tests/contracts/condition_pricing_canary_v1.test.mjs tests/contracts/condition_pricing_read_model_v1.test.mjs apps/web/src/lib/pricing/conditionCanaryRoute.test.mjs apps/web/src/lib/pricing/conditionPriceRoute.test.mjs
```

No successful commit or release is claimed. Full repository shipcheck has not
passed; the earlier hook attempt stopped at environment preflight. No hook was
bypassed. Existing migration replay prerequisites remain unchanged, and this
implementation adds no schema. Deployment, authenticated hosted acceptance and
any future valuation/native integration remain separate release work. Provider
permission outreach is not a prerequisite under the owner's clarified policy.
