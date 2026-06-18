# Card Row Enrichment Consumer Readiness V1

## Result

- Audit only: true
- DB writes performed: false
- Migrations created: false
- Fingerprint: `3789e80cdf5a75a65b48a3a80f8f9186c1bd50be900d406fca2c3c8ec1b7e1a2`

## Row Universe

| metric | rows |
| --- | --- |
| english_physical_parent_rows | 22859 |
| english_physical_child_printing_rows | 37620 |
| english_physical_parent_gap_rows | 5192 |
| english_physical_child_gap_rows | 13012 |

## Core Display Readiness

| metric | value |
| --- | --- |
| finish_key coverage | 100% |
| active_finish_key coverage | 100% |
| non_provisional child printings | 100% |
| current display missing rows | 0 |
| exact variant image backlog | 14501 |
| exact image promote-ready rows now | 0 |

## Surface Decisions

| surface | status | basis |
| --- | --- | --- |
| public_card_identity | ready | English physical core identity gaps are 0; no active identity backfill candidates remain. |
| printing_selector | ready | Every child printing has finish_key and active_finish_key coverage. |
| image_display | ready_with_labeling_guardrails | Image Truth reports current display missing rows as 0, but exact variant image backlog remains. |
| catalog_metadata | ready_with_labeling_guardrails | 139 English physical catalog metadata gaps remain, but no exact source-mapped write package is safe. |
| species_and_traits | ready_with_labeling_guardrails | Species and trait residuals are source-limited or not-applicable classes, not broad write queues. |
| external_source_links | admin_only_or_hidden | External mapping payload governance found 0 ready mapping rows; verified_master_index_v1 payloads are provenance, not active source mappings. |
| public_provenance | not_public_ready | Master Index provenance surface plan says 592 rows are internal-admin ready and 0 are public-surface ready. |

## Implementation Next Steps

1. Ensure website and app consume child-printing-level finish truth.
   The reconciled DB truth lives at card_printings for finishes and display image confidence.
2. Make image confidence visible wherever a non-exact image can appear.
   Representative coverage is allowed only when the UI is honest about exact variant uncertainty.
3. Hide or admin-scope raw Master Index provenance payloads.
   They are governance/evidence context, not public source mappings.
4. Treat blank enrichment fields as unknown.
   Remaining catalog metadata, species, and trait residuals are not safe inference targets.

## Forbidden For Consumers

- Do not infer missing printings or finishes in UI.
- Do not label representative images as exact.
- Do not require exact child image before displaying a verified printing.
- Do not expose raw provenance payloads as public source links.
- Do not use external_ids payloads as active mappings.
