# Bulbapedia vs Grookai Vault Pokemon Catalog Audit v1

## Sources

- Bulbapedia expansion index: https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_Trading_Card_Game_expansions
- Bulbapedia set pages: fetched programmatically from index-linked (TCG) pages for matched sets

The Bulbapedia expansion index includes a "Set abb." column and separate "Other sets" sections. Those are useful for set-level validation, but they are not sufficient alone for card-level comparison because card rows live on the individual set pages.

## Normalization Rules

- Trimmed whitespace and collapsed repeated spaces
- Normalized punctuation and apostrophes for name matching
- Compared card numbers as strings first
- Used a secondary alphanumeric number normalization equivalent to number_plain
- Preserved subset lane meaning from Bulbapedia Setlist headers

## Set Matching Rules

- Preferred exact set-name matches against Bulbapedia index entry names and page titles
- Used printed set abbreviations as a fallback when unique
- Mapped explicit subset DB sets such as Trainer Gallery and Galarian Gallery to their parent Bulbapedia pages while preserving lane filters
- Did not merge distinct DB set codes solely because they shared a family abbreviation
- When multiple DB sets mapped to the same Bulbapedia page and lane, the highest-confidence set was treated as primary and the others were reported as set-membership mismatches

## Variant Handling Rules

- Layer 1 compared canonical membership by set, number, and name
- Layer 2 compared lane fidelity and explicit variant rows from Bulbapedia notes or duplicated setlist entries
- If canonical identity existed on both sides but the row cardinality or lane assignment differed, the issue was classified as variant_mismatch
- If multiple explicit variant rows existed but could not be paired safely to Grookai rows, the issue was classified as ambiguous_manual_review

## Exclusions

- Digital-only Pocket sets and rows flagged exclude_from_physical_pipelines were classified as domain_not_comparable
- Quarantine rows were classified as domain_not_comparable
- Sets absent from Bulbapedia's expansion index were classified as not_listed_on_bulbapedia_index

## Known Limitations

- Bulbapedia page structure is mostly consistent through Setlist templates, but some pages mix main-set rows with additional cards, stamped variants, jumbo variants, and merchandise notes
- Bulbapedia often exposes product variants explicitly while Grookai stores them behind opaque variant_key buckets, so some variant comparisons remain manual-review items
- Some historical duplicate Grookai set codes map to the same Bulbapedia page, which inflates set-membership mismatch counts

## Totals By Bucket

```json
{
  "total_db_rows": 22483,
  "total_bulbapedia_rows": 35098,
  "matched": 704,
  "missing_in_db": 3202,
  "extra_in_db": 1834,
  "name_mismatch": 28974,
  "number_mismatch": 432,
  "variant_mismatch": 555,
  "set_membership_mismatch": 609,
  "ambiguous_manual_review": 0,
  "domain_not_comparable": 1825,
  "not_listed_on_bulbapedia_index": 450
}
```

## Highest-Risk Mismatch Groups

1. sv10 | Destined Rivals | mismatch_count=474 | db_count=244 | bulbapedia_count=30 | status=partial_match
2. swsh7 | Evolving Skies | mismatch_count=435 | db_count=237 | bulbapedia_count=435 | status=partial_match
3. me02.5 | Ascended Heroes | mismatch_count=424 | db_count=295 | bulbapedia_count=302 | status=partial_match
4. sm115 | Hidden Fates | mismatch_count=403 | db_count=69 | bulbapedia_count=430 | status=partial_match
5. swsh12.5 | Crown Zenith | mismatch_count=391 | db_count=160 | bulbapedia_count=431 | status=partial_match
6. swsh6 | Chilling Reign | mismatch_count=371 | db_count=233 | bulbapedia_count=449 | status=partial_match
7. swsh8 | Fusion Strike | mismatch_count=368 | db_count=284 | bulbapedia_count=471 | status=partial_match
8. sv09 | Journey Together | mismatch_count=357 | db_count=190 | bulbapedia_count=30 | status=partial_match
9. swshp | SWSH Black Star Promos | mismatch_count=353 | db_count=304 | bulbapedia_count=466 | status=variant_review_needed
10. swsh11 | Lost Origin | mismatch_count=349 | db_count=229 | bulbapedia_count=365 | status=partial_match

## Largest DB vs Bulbapedia Count Gaps

1. sv10 | Destined Rivals | db_count=244 | bulbapedia_count=30 | mismatch_count=474
2. swsh7 | Evolving Skies | db_count=237 | bulbapedia_count=435 | mismatch_count=435
3. me02.5 | Ascended Heroes | db_count=295 | bulbapedia_count=302 | mismatch_count=424
4. sm115 | Hidden Fates | db_count=69 | bulbapedia_count=430 | mismatch_count=403
5. swsh12.5 | Crown Zenith | db_count=160 | bulbapedia_count=431 | mismatch_count=391
6. swsh6 | Chilling Reign | db_count=233 | bulbapedia_count=449 | mismatch_count=371
7. swsh8 | Fusion Strike | db_count=284 | bulbapedia_count=471 | mismatch_count=368
8. sv09 | Journey Together | db_count=190 | bulbapedia_count=30 | mismatch_count=357
9. swshp | SWSH Black Star Promos | db_count=304 | bulbapedia_count=466 | mismatch_count=353
10. swsh11 | Lost Origin | db_count=229 | bulbapedia_count=365 | mismatch_count=349

## Hard Blockers

- No page-fetch blockers encountered. Some rows still require manual review where Bulbapedia exposes variants more explicitly than Grookai.
