# ENRICH-28B Master Index Provenance Surface Plan V1

## Result

- Audit only: true
- DB writes performed: false
- Migrations created: false
- Fingerprint: `bf1a91415dc4486053a7a65eae87c4021b87ec9b3526edc888b1514c7d49cbd8`

## Surface Readiness

| metric | value |
| --- | --- |
| internal_admin_surface_ready_rows | 592 |
| public_surface_ready_rows | 0 |
| reason_public_surface_not_ready | Public provenance display needs a stable UI contract and source attribution rules; do not expose raw payloads directly. |
| review_queue_rows | 30 |
| db_write_ready_rows | 0 |

## Review Queue

| lane | rows |
| --- | --- |
| payload_missing_evidence_and_source_labels | 29 |
| payload_missing_fingerprint_only | 1 |

## Recommended Model

- Current safe model: Keep external_ids.verified_master_index_v1 as embedded audit provenance for now.
- Future model: append-only card_print_evidence or card_print_provenance table

## Hard Rules

- must not replace external_mappings
- must not imply source/external_id ownership
- must preserve source URL or stable source reference
- must be append-only or historically auditable
- must distinguish exact proof from representative/supporting evidence

## Recommended Next Actions

- No DB write package now: There are zero external_mapping-ready rows and provenance should not overload external_mappings.
- Use 570 usable rows for internal audit/admin provenance display only: They have source labels, evidence URLs, and fingerprints.
- Queue 52 review rows for evidence payload cleanup: They are active identities but lack one or more display-grade provenance fields.
- Defer schema until product needs first-class provenance search/display: A migration is unnecessary unless the app needs queryable evidence rows.
