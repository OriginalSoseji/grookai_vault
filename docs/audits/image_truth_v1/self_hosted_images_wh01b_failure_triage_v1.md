# IMG-HOST-WH-01B-FAILURE-TRIAGE-AND-UPLOAD-READINESS

- Generated: 2026-06-23T12:09:02.640Z
- Proof hash: `045c6e7ef349832ded941e7f54e18f864ba3300290e14c82a9c10424ddb339d4`
- Source: `docs\audits\image_truth_v1\self_hosted_images_wh01a_results_v1.jsonl`
- DB writes performed: false
- Storage uploads performed: false
- Migrations created: false

## Counts

- Total image field rows: 40268
- Successful rows: 27821
- Failed rows: 12447
- Already self-hosted valid rows: 682
- Valid external upload candidates: 27139
- Failed external rows: 12447
- Failed storage rows: 0

## Repair Routes

| key | count |
| --- | ---: |
| upload_candidate_external_validated | 27139 |
| replacement_required_tcgdex_failed | 12333 |
| already_self_hosted_valid | 682 |
| replacement_required_external_failed | 114 |

## Failed By Source Lane

| key | count |
| --- | ---: |
| external_tcgdex | 12333 |
| external_pokemontcg | 114 |

## Failed By Reason

| key | count |
| --- | ---: |
| non_image_content_type,dimensions_unreadable,very_small_image_payload | 12096 |
| http_404,non_image_content_type,dimensions_unreadable,very_small_image_payload | 237 |
| http_404 | 114 |

## Top Failed Sets

| key | count |
| --- | ---: |
| B1 | 331 |
| A1 | 285 |
| swshp | 285 |
| sv01 | 258 |
| sv04.5 | 245 |
| me04 | 244 |
| sv03 | 230 |
| sv05 | 218 |
| svp | 216 |
| sv03.5 | 207 |
| swsh2 | 201 |
| sm11 | 200 |
| swsh1 | 200 |
| swsh3 | 200 |
| swsh4 | 200 |
| swsh6 | 200 |
| swsh8 | 199 |
| sm9 | 196 |
| swsh5 | 183 |
| sv02 | 180 |
| sv08.5 | 180 |
| unknown | 176 |
| ecard2 | 173 |
| sv10.5w | 173 |
| sv10.5b | 172 |
| sm1 | 171 |
| ecard3 | 170 |
| ecard1 | 165 |
| xy5 | 164 |
| bw7 | 153 |

## TCGdex Failed Path Prefixes

| key | count |
| --- | ---: |
| en/base/basep/1 | 2 |
| en/ecard/bog/1 | 2 |
| en/ecard/bog/2 | 2 |
| en/ecard/bog/6 | 2 |
| en/ecard/bog/7 | 2 |
| en/ex/ex5.5/1 | 2 |
| en/ex/ex5.5/2 | 2 |
| en/ex/ex5.5/3 | 2 |
| en/ex/ex5.5/4 | 2 |
| en/ex/ex5.5/5 | 2 |
| en/me/me04/001 | 2 |
| en/me/me04/002 | 2 |
| en/me/me04/003 | 2 |
| en/me/me04/004 | 2 |
| en/me/me04/005 | 2 |
| en/me/me04/006 | 2 |
| en/me/me04/007 | 2 |
| en/me/me04/008 | 2 |
| en/me/me04/009 | 2 |
| en/me/me04/010 | 2 |
| en/me/me04/011 | 2 |
| en/me/me04/012 | 2 |
| en/me/me04/013 | 2 |
| en/me/me04/014 | 2 |
| en/me/me04/015 | 2 |
| en/me/me04/016 | 2 |
| en/me/me04/017 | 2 |
| en/me/me04/018 | 2 |
| en/me/me04/019 | 2 |
| en/me/me04/020 | 2 |

## Upload Candidates By Source Lane

| key | count |
| --- | ---: |
| external_tcgdex | 21025 |
| external_pokemontcg | 6096 |
| external_other | 18 |

## Recommended Next Packages

- `IMG-HOST-WH-02A-VALID-EXTERNAL-UPLOAD-DRY-RUN`: 27139 rows. Re-download already validated external images and stage/upload to warehouse-backed storage manifest only.
- `IMG-HOST-WH-03A-TCGDEX-FAILED-REPLACEMENT-SOURCE-AUDIT`: 12333 rows. For failed TCGdex rows, find source-backed replacements from PokemonTCG, TCGCollector, Malie, or approved source lanes.
- `IMG-HOST-WH-04A-STORAGE-PATH-REPAIR-AUDIT`: 0 rows. If any existing Supabase storage paths failed, verify object existence/path/bucket and repair plan.

## Policy

- Read-only derivative report.
- No upload, DB write, migration, delete, merge, identity write, price write, or exact-image claim change was performed.
