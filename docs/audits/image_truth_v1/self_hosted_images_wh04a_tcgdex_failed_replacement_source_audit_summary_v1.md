# IMG-HOST-WH-04A-TCGDEX-FAILED-REPLACEMENT-SOURCE-AUDIT

- Generated: 2026-06-23T17:41:56.521Z
- Mode: read_only_replacement_source_audit
- Proof hash: `cc2bc09597a1ebaa39f8cbf96f4cd0c3ed881f809fa4a18ce4e2ab01f020ad56`
- Source JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh01a_results_v1.jsonl`
- Result JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh04a_tcgdex_failed_replacement_source_audit_v1.jsonl`
- DB writes performed: false
- Storage uploads performed: false
- Migrations created: false
- Exact image claim changes performed: false

## Counts

- Total result rows: 12333
- Replacement found rows: 12198
- Replacement missing rows: 135
- Physical replacement found rows: 11527
- TCG Pocket review replacement found rows: 671

## By Replacement Route

| key | count |
| --- | ---: |
| tcgdex_high_suffix_repair | 12096 |
| no_candidate_rule | 135 |
| replacement_malie_trainer_kit | 90 |
| replacement_pokemontcg_trainer_kit | 10 |
| replacement_tcgcollector_trainer_kit | 2 |

## By Replacement Confidence

| key | count |
| --- | ---: |
| high_url_repair | 11425 |
| tcg_pocket_review_required | 671 |
| none | 135 |
| medium_representative_only | 92 |
| high | 10 |

## Top Replacement Sets

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
| sv03.5 | 207 |
| swsh2 | 201 |
| sm11 | 200 |
| swsh1 | 200 |
| swsh3 | 200 |
| swsh4 | 200 |
| swsh6 | 200 |
| swsh8 | 199 |
| sm9 | 196 |
| svp | 192 |
| swsh5 | 183 |
| sv02 | 180 |
| sv08.5 | 180 |
| unknown | 176 |
| sv10.5w | 173 |
| sv10.5b | 172 |
| sm1 | 171 |
| ecard1 | 165 |
| xy5 | 164 |
| bw7 | 153 |
| dp6 | 146 |
| xy1 | 146 |

## Top Unresolved Sets

| key | count |
| --- | ---: |
| ecard2 | 40 |
| ecard3 | 32 |
| mep | 16 |
| bog | 13 |
| ex5.5 | 10 |
| tk1b | 10 |
| hsp | 9 |
| bwp | 3 |
| pl2 | 1 |
| svp | 1 |

## Policy

- Read-only source replacement audit.
- No uploads, database writes, migrations, deletes, merges, identity writes, or price writes.
- Candidate rows require a later upload dry-run and explicit apply approval before storage or DB changes.
- TCG Pocket rows are counted separately for review and should not be applied into English physical beta lanes without explicit product approval.