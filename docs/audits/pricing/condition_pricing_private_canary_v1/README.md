# Private condition preview evidence

This is evidence for a local component fixture, not a deployed page. See the
[checkpoint](../../../checkpoints/pricing/CONDITION_PRICING_PRIVATE_CANARY_20261117.md)
for access-test scope, commands, coverage and remaining release gates.

`live-read-model.json` contains the safe allowlisted private DTOs captured from
the live backend reader at its recorded `checked_at`; it contains no keys, raw
receipts or complete provider datasets. These amounts are a historical fixture,
not fresh public pricing. The current reader applies its freshness policy.

`browser-checks.js` records the Playwright CLI check function run against a
loopback fixture at port 56377. That fixture mounted the actual React component
with these DTOs and simulated delayed, failed and mismatched responses. Test-only
mode routes belong to that local fixture, not the production Next endpoint.
`browser-result.json` records the observed pass; the three PNGs show desktop,
320px light and 320px dark component layouts. Outer fixture headings explicitly
identify it as local verification content. No authenticated browser session or
production Next route was exercised by these screenshots.
