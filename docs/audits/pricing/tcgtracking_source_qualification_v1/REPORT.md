# TCGTracking source qualification — November 17, 2026

Owner clarification after this review: use the published API without requesting
separate permission unless an applicable restriction is explicit. The absent
permission statement below is a historical observation, not a current blocker.
The provider inquiry is superseded. [V2](../../../contracts/TCGTRACKING_CONDITION_PRICING_V2.md)
records the decision and the signed-in condition-reference integration. It does
not assert ownership or upstream licensing authority for TCGTracking.

Reviewed at 8:59 PM America/Denver (`2026-11-18T03:59:13.376Z`). This was a
credential-free public-source check. No production reads or writes, source
refresh import, provider messages, deployment or activation occurred.

## Result

The documented API is intentionally public, free and condition-aware. The
reviewed pages do not establish commercial application display rights or an
explicit currency definition for the SKU `mkt` field. These remain unresolved
evidence questions, not a finding that use is prohibited. Keep the existing
private preview and unverified-currency representation.

The [Open TCG API documentation](https://openapi.tcgtracking.com/) describes
unauthenticated access, condition/finish/language SKU prices, daily refresh and
local caching. It identifies `mkt` as a TCGPlayer market price. Its linked
examples use a dollar sign, but neither the documented SKU schema nor the
fresh Dragons Exalted response specifies a currency. Examples are a useful USD
hint, not an explicit guarantee across categories and languages.

The [provider home page](https://tcgtracking.com/) advertises the free public
data API. The [disclaimer](https://tcgtracking.com/disclaimer.php) and
[privacy policy](https://tcgtracking.com/privacy.php) primarily address shipping,
accounts and integrations. They did not resolve API data display, commercial
redistribution, attribution or retention rights. The disclaimer's USD reference
concerns insurance coverage; it does not define SKU pricing currency.
The [contact form](https://tcgtracking.com/contact.php) is the observed provider
inquiry route. It was not submitted.

TCGplayer's own [price-point documentation](https://help.tcgplayer.com/hc/en-us/articles/222376867-What-do-the-different-price-points-on-TCGplayer-com-mean)
confirms that pricing reflects selected printings and conditions and describes
Market Price as sales-derived. That establishes the meaning of the official
metric; it does not independently authenticate TCGTracking's individual values.
The earlier NM comparison to TCGCSV is also not an official condition-SKU audit.

## Fresh source comparison

One unauthenticated GET fetched Dragons Exalted's published SKU feed. It returned
1,207 SKU rows across 131 source products. No currency field exists in its
envelope or any SKU row. The feed's SHA-256 was
`715628f8740f7e6a7fc02508aeeb560b3bb75777d2659143639a86c53dd5fda8`, identical to
the earlier acquired bytes; this is the same provider snapshot retrieved again,
not evidence that the provider issued a new update.

All 20 selections across the preview's four printings matched the saved private
DTOs: 18 positive source prices and two unavailable conditions. This confirms
current published-source consistency with that fixture. It does not revalidate
live database mappings, broaden canonical coverage or provide an official
TCGplayer accuracy guarantee. Original provider time:
`2026-11-17T13:36:40-05:00`; retrieving it later does not reset its freshness age.

## Required external evidence

The [prepared provider inquiry](PROVIDER_INQUIRY.md) asks for display/cache rights
in free and paid grookai surfaces, attribution and rate limits, retention,
SKU currency and source-field semantics. It is a local draft and has not been
sent. Retain the provider's actual response or a published policy URL before
updating source qualification. Do not turn an absent keyword or a third-party
consumer's behavior into permission evidence.

Independently compare exact official product/finish/language/condition SKU
values at a recorded time before claiming official-value corroboration.
Source-use permission, currency verification, independent accuracy, mapping
coverage, refresh qualification and deployment remain separate facts.

## Reproduction and receipts

Run the credential-free audit from the isolated worktree with a fresh output
directory; it refuses to overwrite an acquisition:

```powershell
node --use-system-ca scripts/audits/tcgtracking_source_qualification_v1.mjs
```

The six captures all returned HTTP 200. Full provider HTML and the SKU JSON are
retained only in ignored
`artifacts/tcgtracking_source_qualification_v1/20261117/`. Their URLs, hashes,
allowed cache headers and comparison results are in [report.json](report.json).
No cookies, credentials or response authorization headers are recorded there.
Keyword-search results are discovery aids and cannot auto-approve source use.

The audit ran successfully, its 20 selections reconciled, its immutable-output
guard was verified, and Node syntax checking passed. No application code changed
in this step; the prior targeted implementation checks remain recorded in the
[private preview checkpoint](../../../checkpoints/pricing/CONDITION_PRICING_PRIVATE_CANARY_20261117.md).
