# Market Listing Warehouse V2 Live Canary

## Result

The official eBay taxonomy gate and bounded local-artifact canary passed. Database apply was not executed.

- Provider-run commit: `c77831c6c4706edcf5ce67fc1a7ace44070e09a1`
- Offline repair commit: `22c4feba4e9e1c5cae3c3b228300350ee7b9abd9`
- Target: `me05` / Mega Evolution: Pitch Black
- Provider calls: `9/9` successful
- Unique listings preserved: `630`
- Database writes: `0`
- Canonical assignments: `0`
- Public or app-visible pricing changes: `0`

## Taxonomy

The eBay US taxonomy response reported category tree `0`, version `134`.

| Product shelf | Category ID | Category name |
| --- | ---: | --- |
| Raw and graded card evidence | `183454` | CCG Individual Cards |
| Sealed packs | `183456` | CCG Sealed Packs |
| Sealed decks and kits | `183457` | CCG Sealed Decks & Kits |
| Sealed boxes | `261044` | CCG Sealed Boxes |
| Sealed cases | `261045` | CCG Sealed Cases |

The sealed route is reviewed, fingerprinted, and ready for governed acquisition planning.

## Provider Run

The frozen plan contained one raw request, four graded suffix requests, and four sealed category requests.

- Raw provider total: `594`; fetched: `200`
- Sealed packs provider total: `453`; fetched: `200`
- Sealed decks/kits provider total: `23`; fetched: `23`
- Sealed boxes provider total: `1,292`; fetched: `200`
- Sealed cases provider total: `7`; fetched: `7`
- Graded suffix provider totals: `0` for `graded card`, `PSA`, `CGC`, and `BGS`

The graded route executed correctly but did not prove slab yield for this newly released set. One graded listing was retained from the broad individual-card shelf.

## Repair And Replay

The immutable provider payload exposed a narrow product-kind gap: plural packs, blisters, display boxes, and cases were underclassified, while card names and promo-card references needed stronger protection.

The offline repair:

- uses provider `New/Factory Sealed` as packaging evidence;
- requires product-form/container evidence before treating sealed-route rows as sealed products;
- keeps ad hoc lots separate from sealed products;
- protects ETB promo cards, card names containing `Tin`, and Build & Battle stamped/non-holo cards;
- preserves unclear rows as `unknown` rather than guessing;
- replays the original raw snapshots without another provider call.

Final replay counts:

| Product kind | Count |
| --- | ---: |
| Raw single | 182 |
| Graded single | 1 |
| Sealed product | 382 |
| Lot or bundle | 61 |
| Accessory | 2 |
| Unknown | 2 |

The two unknown rows are intentionally unresolved: one digital redemption-card listing and one vague `Slow Poke` listing without a provable product form.

## Reconciliation

- Planned requests: `9`
- Request results: `9`
- Raw response snapshots: `9`
- Projected observations: `630`
- Unique listing IDs: `630`
- Duplicate raw rows skipped: `0`
- Candidate rows proposed: `0`
- Rollup rows proposed: `0`
- Canonical IDs present: `0`
- Publication-eligible rows: `0`
- Reconciliation mismatches: `0`

The append-only plan proposes one acquisition run, nine query-cache rows, 630 raw snapshots, 630 observations, 483 seller snapshots, and 630 price events. Hash validation passed with no findings.

## Tests

- V2 targeted contract suite: `9/9` passed.
- All `market_listing*.test.mjs` contracts: `69/69` passed.
- Agent and replay syntax checks: passed.
- `git diff --check`: passed.
- Full repository shipcheck: not run to completion because local `SUPABASE_DB_URL` is unavailable; the pre-commit hook stopped at runtime preflight.

## Gate Decision

The taxonomy and no-write canary are complete. The batch is ready for a separately approved append-only warehouse apply, but it is not proof that graded acquisition has sufficient yield for nightly scale.

After a bounded apply and readback, run an older high-volume set canary to measure graded/slab yield before expanding V2 nightly acquisition.
