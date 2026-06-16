# Card Row Enrichment Completion Checkpoint V1

Generated: 2026-06-16

This checkpoint records the state after the English physical canon reconciliation, row enrichment cleanup, provenance recovery, and residual source-governance pass.

No database writes, migrations, image work, cleanup, quarantine, or global apply were performed while creating this checkpoint.

## What This Means

The remaining enrichment gaps are no longer broad automatic cleanup queues.

The safe write lanes that existed earlier have already been handled through guarded dry-run and explicit apply packages. The current residual rows are either blocked, source-limited, provenance-only, not applicable, or intentionally deferred to Image Truth V1.

## Source Reports

- `docs/audits/card_row_enrichment_v1/card_row_enrichment_status_v1.json`
- `docs/audits/card_row_enrichment_v1/card_row_enrichment_cleanup_plan_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich12_residual_source_audit_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich12b_external_id_payload_mapping_readiness_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich12c2_residual_catalog_metadata_guarded_dry_run_v1.json`
- `docs/audits/card_row_enrichment_v1/card_row_enrichment_residual_blocker_audit_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich28b_master_index_provenance_surface_plan_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich29a_provenance_review_evidence_recovery_v1.json`
- `docs/audits/card_row_enrichment_v1/enrich30a_external_id_payload_source_governance_v1.json`

## Current Row Universe

| scope | rows |
| --- | ---: |
| all parent rows | 26,228 |
| all child printing rows | 47,561 |
| English physical parent rows | 23,078 |
| English physical child printing rows | 38,111 |
| parent gap rows | 8,619 |
| child gap rows | 23,142 |

## English Physical Residuals

| residual | rows | ready now |
| --- | ---: | ---: |
| parent GV-ID candidates | 125 | 0 |
| child printing GV-ID candidates | 129 | 0 |
| active identity candidates | 0 | 0 |
| core identity gaps | 0 | 0 |
| external mapping gaps | 706 | 0 |
| no-child parent rows | 1,087 | 0 |
| trait gaps | 1,090 | 0 |
| species gaps | 3,752 | 0 |
| catalog metadata gaps | 139 | 0 |

These counts are not all user-facing defects. Several are not-applicable, provenance-only, source-limited, or deferred enrichment lanes.

## Closed Or Exhausted Lanes

### Catalog Metadata

`ENRICH-12C2` found no remaining safe source-mapped metadata targets.

| metric | count |
| --- | ---: |
| candidate rows | 0 |
| target rows | 0 |

Decision: no metadata write package is available without a new exact source rule.

### Direct External ID Payload Mapping

`ENRICH-12B` found 14 parent rows / 15 mapping payloads, but none were safe to insert.

| classification | rows |
| --- | ---: |
| blocked_variant_source_id_owned_by_base_parent | 11 |
| blocked_existing_source_external_owner | 4 |

Decision: do not create active `external_mappings` from those payloads.

### Broad External ID Payload Source Governance

`ENRICH-30A` classified all 636 parent payload rows.

| classification | rows |
| --- | ---: |
| provenance_payload_not_external_mapping_source | 622 |
| blocked_variant_source_id_owned_by_base_parent | 11 |
| blocked_existing_source_external_owner | 4 |

Decision: `verified_master_index_v1` payloads are provenance, not source mappings. The remaining direct `tcgdex` / `pokemonapi` payloads are collision-blocked.

### Master Index Provenance Recovery

After `ENRICH-29B`, the review queue is source-exhausted for automatic cleanup.

| metric | rows |
| --- | ---: |
| review rows | 30 |
| fully recoverable rows | 0 |
| write-ready rows | 0 |

Decision: these remain review/provenance display concerns, not canonical cleanup writes.

## Remaining Work Classification

Not immediate write-ready:

- Parent GV-ID collisions require identity/modifier-aware GV policy before writes.
- Child printing GV-ID candidates are blocked by parent GV-ID or suffix governance.
- External mapping gaps are mostly provenance-only payloads or source ownership collisions.
- Catalog metadata gaps lack exact active source-mapped metadata targets.
- Trait and species residuals are source-limited or not-applicable classes, not broad write queues.
- No-child parent rows need canon/ingestion adjudication, not metadata cleanup.
- Child image/display-image work remains deferred to Image Truth V1.

Safe future work:

- Source-specific external mapping governance reports.
- Identity/modifier-aware GV-ID policy design.
- Admin-only provenance display contract for usable Master Index payloads.
- Image Truth V1 child-printing image work.
- Website/app consumption of canonical parent and child printing truth.

## Picking This Back Up

Start with reports, not writes:

```powershell
node scripts/audits/card_row_enrichment_status_v1.mjs
node scripts/audits/card_row_enrichment_cleanup_plan_v1.mjs
node scripts/audits/card_row_enrichment_residual_blocker_audit_v1.mjs
node scripts/audits/card_row_enrichment_enrich30a_external_id_payload_source_governance_v1.mjs
```

If a future package is proposed, it must have:

- a narrow package ID,
- exact target rows,
- explicit forbidden writes,
- rollback-only dry-run proof,
- non-regression checks,
- explicit approval before real apply.

## Verification

Latest verification:

- `node --check scripts/audits/card_row_enrichment_enrich30a_external_id_payload_source_governance_v1.mjs`
- `node --test tests/contracts/contract_scope_v1.test.mjs`
- `git diff --check`
- `git status --short -- supabase\migrations`
- `npm run preflight`

Result:

- preflight status: `PASS_WITH_DEFERRED_DEBT`
- critical failures: `0`
- migrations created: `false`
- DB writes performed by checkpoint: `false`
