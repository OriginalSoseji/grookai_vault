# Card Row Enrichment Residual Checkpoint V1

Generated: 2026-06-15

This checkpoint records the state after the English physical canon reconciliation and the first enrichment cleanup pass through `ENRICH-12`.

No database writes, migrations, cleanup, quarantine, image promotion, or global apply were performed while creating this checkpoint.

## Source Reports

- `docs/audits/card_row_enrichment_v1/card_row_enrichment_status_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich12_residual_source_audit_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich12b_external_id_payload_mapping_readiness_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich12c2_residual_catalog_metadata_guarded_dry_run_v1.json`

## Row Universe

| scope | parent rows | child printing rows |
| --- | ---: | ---: |
| all rows | 26,353 | 47,720 |
| English physical | 23,086 | 38,362 |
| TCG Pocket excluded | 2,947 | 8,841 |
| unclassified identity domain | 320 | 517 |

## English Physical Parent Residuals

| gap | rows | checkpoint classification |
| --- | ---: | --- |
| species_link | 3,701 | Mostly not applicable, not a write queue. |
| child_printings | 1,075 | Separate canon/ingestion class, not part of metadata cleanup. |
| traits | 996 | Mostly source-limited or non-trait source lanes; 8 retry rows are not currently write-ready. |
| external_mapping | 706 | Structured payload subset audited; 0 ready rows. |
| gv_id | 617 | Deferred identity/enrichment lane, not touched here. |
| core_identity | 572 | Deferred identity-domain cleanup, not touched here. |
| display_image | 150 | Deferred child image/display-image work. |
| catalog_metadata | 147 | 139 source-limited, 8 blocked by source name mismatch. |
| active_identity | 9 | Deferred identity lane, not touched here. |

## Species Residual Decision

The species gap count is not a direct species-write queue.

| classification | rows |
| --- | ---: |
| trainer_not_species_applicable | 2,919 |
| energy_not_species_applicable | 521 |
| blocked_missing_traits | 180 |
| blocked_core_identity_missing | 80 |
| fossil_object_not_species_applicable | 1 |

`ENRICH-12D-SPECIES-RULE-REVIEW` now has `0` write candidates.

## Blocked Source Lanes

### ENRICH-12B External ID Payload Mapping

Readiness result:

| metric | count |
| --- | ---: |
| candidate parent rows | 14 |
| candidate mapping rows | 15 |
| ready mapping rows | 0 |
| blocked mapping rows | 15 |

Blocked reasons:

| reason | rows |
| --- | ---: |
| blocked_variant_source_id_owned_by_base_parent | 11 |
| blocked_existing_owner_incomplete_identity | 4 |

Decision: do not create active `external_mappings` from these payloads. The source/external IDs are already actively owned elsewhere, so this lane requires ownership adjudication or should remain as non-authoritative payload context.

### ENRICH-12C2 Residual Catalog Metadata

Readiness result:

| metric | count |
| --- | ---: |
| candidate catalog metadata rows | 8 |
| accepted target rows | 0 |
| blocked rows | 8 |

Blocked reason:

| reason | rows |
| --- | ---: |
| source_name_mismatch | 8 |

Decision: do not backfill metadata for these rows without a specific rule that reconciles Grookai names to source names. Current blocked examples are `Basic <Type> Energy` versus source names such as `<Type> Energy`.

## Child Printing Residuals

English physical child-printing gaps:

| gap | rows | checkpoint classification |
| --- | ---: | --- |
| provenance | 13,428 | Deferred provenance enrichment, not canon truth drift. |
| printing_gv_id | 1,492 | Deferred child identity enrichment. |
| display_image | 191 | Explicitly deferred child image work. |

Child image printing cleanup remains intentionally skipped for this checkpoint.

## What This Means

The remaining enrichment rows are not equivalent to incorrect canon.

The current state separates:

- rows that are complete enough for canon/display truth,
- rows where the field is not applicable,
- rows blocked by source ownership collision,
- rows blocked by name mismatch,
- rows deferred to identity/provenance/image-specific lanes.

No remaining `ENRICH-12` lane is currently safe for automatic write without a new focused adjudication plan.

## Next Safe Work

Recommended next work, in order:

1. Build a residual enrichment decision dashboard/report for app and website visibility.
2. Create a focused identity/provenance plan for `gv_id`, `active_identity`, `printing_gv_id`, and provenance gaps.
3. Keep child image work separate under Image Truth V1.
4. Do not promote external mapping payloads unless source ownership is resolved.
5. Do not relax source name matching for catalog metadata without a governed alias rule.

## Verification

Latest verification performed:

- `node scripts/audits/card_row_enrichment_status_v1.mjs`
- `node scripts/audits/card_row_enrichment_enrich12_residual_source_audit_v1.mjs`
- `node --test tests/contracts/contract_scope_v1.test.mjs`
- `git diff --check`
- `npm run preflight`
- `git status --short -- supabase/migrations`

Result:

- preflight status: `PASS_WITH_DEFERRED_DEBT`
- critical failures: `0`
- migrations created: `false`
- DB writes performed by checkpoint: `false`
