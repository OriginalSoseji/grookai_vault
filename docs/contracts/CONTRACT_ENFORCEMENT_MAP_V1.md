# CONTRACT_ENFORCEMENT_MAP_V1

Status: Active runtime support document

## Audited Canon-Affecting Execution Paths

| Execution Path | File / Surface | Current Behavior | Canon-Affecting? | Runtime Scope |
| --- | --- | --- | --- | --- |
| `external_discovery_to_warehouse_bridge_v1` | [backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs](/C:/grookai_vault/backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs) | Inserts founder-routed warehouse candidates and candidate events | Yes | `external_discovery_to_warehouse_bridge_v1` |
| `classification_apply_write_plan_v1` | [backend/warehouse/classification_worker_v1.mjs](/C:/grookai_vault/backend/warehouse/classification_worker_v1.mjs) | Mutates `canon_warehouse_candidates` and appends events during first classification | Yes | `classification_apply_write_plan_v1` |
| `classification_apply_reclassification_result_v1` | [backend/warehouse/classification_worker_v1.mjs](/C:/grookai_vault/backend/warehouse/classification_worker_v1.mjs) | Mutates candidate summaries during reclassification | Yes | `classification_apply_reclassification_result_v1` |
| `promotion_stage_create_stage_v1` | [backend/warehouse/promotion_stage_worker_v1.mjs](/C:/grookai_vault/backend/warehouse/promotion_stage_worker_v1.mjs) | Creates frozen promotion staging rows and advances candidate state | Yes | `promotion_stage_create_stage_v1` |
| `alias_mapping_execution_v1` | [backend/warehouse/promotion_executor_v1.mjs](/C:/grookai_vault/backend/warehouse/promotion_executor_v1.mjs) | Writes alias-backed `external_mappings` and archives candidate | Yes | `alias_mapping_execution_v1` |
| `promotion_executor_execute_claimed_stage_v1` | [backend/warehouse/promotion_executor_v1.mjs](/C:/grookai_vault/backend/warehouse/promotion_executor_v1.mjs) | Creates canonical `card_prints` / `card_printings` or canon image writes | Yes | `promotion_executor_execute_claimed_stage_v1` |
| `gv_id_assignment_worker_v1` | [backend/warehouse/gv_id_assignment_worker_v1.mjs](/C:/grookai_vault/backend/warehouse/gv_id_assignment_worker_v1.mjs) | Assigns canonical `gv_id` values | Yes | `gv_id_assignment_worker_v1` |
| `source_image_enrichment_worker_v1` | [backend/images/source_image_enrichment_worker_v1.mjs](/C:/grookai_vault/backend/images/source_image_enrichment_worker_v1.mjs) | Writes representative image fields onto canonical rows | Yes | `source_image_enrichment_worker_v1` |
| `promote_source_backed_justtcg_mapping_v1` | [backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs](/C:/grookai_vault/backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs) | Upserts identity-bearing external mappings | Yes | `promote_source_backed_justtcg_mapping_v1` |
| `printing_upsert_v1` | [backend/printing/printing_upsert_v1.mjs](/C:/grookai_vault/backend/printing/printing_upsert_v1.mjs) | Upserts canonical child `card_printings` rows | Yes | `printing_upsert_v1` |
| `controlled_growth_ingestion_worker_v1` | [backend/ingestion/controlled_growth_ingestion_worker_v1.mjs](/C:/grookai_vault/backend/ingestion/controlled_growth_ingestion_worker_v1.mjs) | Writes `external_discovery_candidates` raw staging rows only | No, non-canonical staging | Not required in V1 runtime scope |

## Enforcement Map

Only contracts that are actually in runtime scope are listed below.

| Contract Name | Status | Authority Level | Domain | Canon-Affecting? | Enforcement Points | Current Status | Gaps | Required Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GROOKAI_GUARDRAILS` | Active | Stabilization / Checkpoint | Governance | Yes | worker: `execute_canon_write_v1`; audit: `drift_audit_v1.sql`; checkpoint: `CONTRACT_RUNTIME_LAYER_V1` | Enforced | No migration scope yet | Extend later to canon-affecting migration replay |
| `NO_ASSUMPTION_RULE` | Active | Stabilization / Checkpoint | Governance | Yes | worker: `execute_canon_write_v1`; audit: `drift_audit_v1.sql` | Enforced | Human repair flow is still manual | Add explicit repair workflow later |
| `IDENTITY_CONTRACT_SUITE_V1` | Frozen | Identity / Frozen Canon | Identity | Yes | DB: `card_print_identity`; worker: promotion + gv_id; audit: identity drift queries | Partially enforced | 11,852 live rows still missing active identity | Finish backfill before stricter DB enforcement |
| `IDENTITY_PRECEDENCE_RULE_V1` | Frozen | Identity / Frozen Canon | Identity | Yes | worker: bridge + stage + executor; audit: drift queries | Partially enforced | Worker docs still mention non-index alias names | Remove name drift from docs/playbooks |
| `GV_ID_ASSIGNMENT_V1` | Frozen | Identity / Frozen Canon | Identity | Yes | DB: unique `gv_id`; worker: `gv_id_assignment_worker_v1`, promotion executor | Enforced | 3,559 live rows still missing `gv_id` | Keep backfill lane active before not-null |
| `GV_ID_VARIANT_SUFFIX_CONTRACT_V2` | Active | Identity / Frozen Canon | Identity | Yes | worker: deterministic builders + assignment | Enforced | None in this slice | Keep suffix decisions centralized |
| `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1` | Frozen | Identity / Frozen Canon | Identity | Yes | DB: active identity uniqueness; worker: promotion executor; audit: missing-identity drift | Partially enforced | Missing active identities remain live debt | Finish backfill, then revisit nullability |
| `REPRINT_ANTHOLOGY_SET_CONTRACT_V1` | Active | Identity / Frozen Canon | Identity | Yes | worker: promotion stage / executor; checkpoint: `reprint_anthology_identity_model_v1` | Partially enforced | Runtime trusts upstream identity package | Add richer anthology assertions when more lanes go live |
| `PRINTED_IDENTITY_CONTRACT_V1` | Frozen | Identity / Frozen Canon | Identity | Yes | worker: bridge + stage; audit: printed identity drift | Partially enforced | Missing identity rows prevent blind DB escalation | Keep validation/audit-first |
| `STABILIZATION_CONTRACT_V1` | Active | Stabilization / Checkpoint | System | Yes | worker: backend env + runtime validator; view: compatibility surfaces; audit: view existence + leakage checks | Enforced | Legacy aliases remain for compatibility | Keep new code on canonical env/surfaces only |
| `INGESTION_PIPELINE_CONTRACT_V1` | Active | Ingestion | Ingestion | Yes | worker: bridge + classification; audit: warehouse proof checks | Partially enforced | Raw staging lane intentionally outside scope | Keep raw staging non-canonical |
| `EXTERNAL_SOURCE_INGESTION_MODEL_V1` | Active | Ingestion | Ingestion | Yes | worker: bridge + source-backed mapping writer; audit: mapping drift queries | Partially enforced | Historical source/card duplicates remain | Repair duplicates before tightening DB rules |
| `EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1` | Active | Ingestion | Ingestion | Yes | worker: bridge; audit: quarantine/public leak checks | Enforced | No formal repair playbook | Add one if malformed bridge rows become common |
| `TCGDEX_SOURCE_CONTRACT_V1` | Active | Ingestion | Source | Yes | worker: source image enrichment | Enforced | V1 limited to one audited set lane | Expand only after another audited source lane |
| `SOURCE_IMAGE_ENRICHMENT_V1` | Active | Enrichment | Image | Yes | worker: source image enrichment; audit: image drift checks | Enforced | No dedicated repair tooling | Add repair tooling when enrichment widens |
| `REPRESENTATIVE_IMAGE_CONTRACT_V1` | Active | Enrichment | Image | Yes | worker: representative image writer; audit: exact/representative separation checks | Enforced | No DB-level exact-vs-representative guard | Keep worker-level guard until safe DB rule exists |
| `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1` | Active | Enrichment | Image | Yes | worker: sibling-base fallback logic; audit: fallback drift checks | Enforced | Proof remains worker-scoped | Revisit only after more fallback lanes exist |
| `PRICING_ENGINE_V1` | Active | Pricing | Pricing | Yes | worker: source-backed JustTCG mapping writer; audit: mapping drift queries | Partially enforced | Historical duplicate source/card rows prevent new DB uniqueness | Repair before schema escalation |
| `GV_VAULT_INSTANCE_CONTRACT_V1` | Active | View / UI | Vault | Yes | API: exact-copy owner actions (`archiveVaultItemInstanceAction`, `addCardToVault`, `updateVaultItemQuantity`, `saveVaultItemInstanceIntentAction`, `createSlabInstance`, `executeCardInteractionOutcomeAction`); audit: compatibility/public leak checks | Partially enforced | Several private exact-copy metadata paths remain deferred | Extend the owner-proof helper sweep to remaining exact-copy mutation actions |
| `WALL_SECTIONS_SYSTEM_CONTRACT_V1` | Active | View / UI | Public Wall | Yes | API: `createWallSectionAction`, `updateWallSectionAction`, `assignWallSectionMembershipAction`, `removeWallSectionMembershipAction`; audit: public view leakage checks | Partially enforced | Legacy grouped compatibility actions remain deferred | Keep grouped compatibility non-authoritative and extend proofs only on exact-copy owner writes |

## Traceability Notes

- Enforcement code lives in `backend/lib/contracts/*`.
- Runtime scope registry lives in [backend/lib/contracts/contract_scope_v1.mjs](/C:/grookai_vault/backend/lib/contracts/contract_scope_v1.mjs).
- Shared canon write boundary lives in [backend/lib/contracts/execute_canon_write_v1.mjs](/C:/grookai_vault/backend/lib/contracts/execute_canon_write_v1.mjs).
- Validation, violation logging, and quarantine routing live in [backend/lib/contracts/validate_write_v1.mjs](/C:/grookai_vault/backend/lib/contracts/validate_write_v1.mjs) and [backend/lib/contracts/quarantine_service_v1.mjs](/C:/grookai_vault/backend/lib/contracts/quarantine_service_v1.mjs).
- Post-write proof classification and execution live in [backend/lib/contracts/run_post_write_proofs_v1.mjs](/C:/grookai_vault/backend/lib/contracts/run_post_write_proofs_v1.mjs).
- Drift detection lives in `scripts/contracts/drift_audit_v1.sql` and `scripts/contracts/run_drift_audit_v1.mjs`.
- Contract scope names are checked against `docs/CONTRACT_INDEX.md`; checkpoint names are checked against real files under `docs/checkpoints` and `docs/release`.

## ENFORCEMENT POINTS

### `GROOKAI_GUARDRAILS`

- DB: runtime-owned evidence tables only
- worker: `execute_canon_write_v1`
- API: none in this slice
- audit: `drift_audit_v1.sql`
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: undeclared scope or unknown names hard fail; ambiguous payloads may quarantine
- post-write proof query: execution-specific proof set declared at write site

### `NO_ASSUMPTION_RULE`

- DB: none
- worker: `execute_canon_write_v1`
- API: none in this slice
- audit: `drift_audit_v1.sql`
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: ambiguous-but-preservable writes route to `quarantine_records`
- post-write proof query: quarantine/public leak checks

### `IDENTITY_CONTRACT_SUITE_V1`

- DB: `card_print_identity` active uniqueness
- worker: promotion stage/executor, `gv_id_assignment_worker_v1`
- API: none in this slice
- audit: identity uniqueness and missing-identity drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: identity ambiguity blocks canon writes
- post-write proof query: identity uniqueness + promoted entity existence proofs

### `IDENTITY_PRECEDENCE_RULE_V1`

- DB: none directly; relies on supporting identity constraints
- worker: bridge, stage, executor, classification proof checks
- API: none in this slice
- audit: printed-identity drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: lower-authority source conflicts never auto-promote
- post-write proof query: candidate state and alias mapping ownership proofs

### `GV_ID_ASSIGNMENT_V1`

- DB: unique `card_prints.gv_id`
- worker: `gv_id_assignment_worker_v1`, promotion executor
- API: none in this slice
- audit: `card_prints_missing_gv_id`, duplicate `gv_id` drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: collision/malformed `gv_id` writes hard fail
- post-write proof query: `gv_id` round-trip and uniqueness proofs

### `GV_ID_VARIANT_SUFFIX_CONTRACT_V2`

- DB: piggybacks on `gv_id` uniqueness
- worker: `buildCardPrintGvIdV1`, assignment/executor callers
- API: none in this slice
- audit: duplicate `gv_id` drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: conflicting suffix decisions hard fail
- post-write proof query: `gv_id` uniqueness proof

### `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1`

- DB: `card_print_identity` active uniqueness indexes
- worker: promotion executor, printing upsert
- API: none in this slice
- audit: active-identity drift checks
- checkpoint: `reprint_anthology_identity_model_v1`
- quarantine behavior: writes that bypass identity subsystem fail closed
- post-write proof query: promoted `card_print` / `card_printing` existence proofs

### `REPRINT_ANTHOLOGY_SET_CONTRACT_V1`

- DB: current canonical identity indexes on `card_prints`
- worker: promotion stage and executor
- API: none in this slice
- audit: identity drift queries
- checkpoint: `reprint_anthology_identity_model_v1`
- quarantine behavior: anthology ambiguity blocks promotion
- post-write proof query: promoted `card_print` existence proof

### `PRINTED_IDENTITY_CONTRACT_V1`

- DB: no new blind DB rule in this slice
- worker: bridge and stage identity assertions
- API: none in this slice
- audit: printed identity drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: missing lawful printed identity signals block canon write
- post-write proof query: candidate/staging state proofs tied to printed-identity route

### `STABILIZATION_CONTRACT_V1`

- DB: compatibility/public views remain present
- worker: backend env + contract runtime validator
- API: none in this slice
- audit: compatibility view existence and quarantine leakage checks
- checkpoint: `docs/contracts/STABILIZATION_CONTRACT_V1.md`
- quarantine behavior: compatibility lanes never authorize canon
- post-write proof query: compatibility/public view existence checks

### `INGESTION_PIPELINE_CONTRACT_V1`

- DB: warehouse candidate + staging tables
- worker: bridge, classification, promotion stage
- API: none in this slice
- audit: warehouse candidate/staging drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: malformed staging/candidate payloads block canon flow
- post-write proof query: candidate/event/staging round-trip proofs

### `EXTERNAL_SOURCE_INGESTION_MODEL_V1`

- DB: `external_mappings(source, external_id)` uniqueness
- worker: bridge, alias mapping, JustTCG mapping writer
- API: none in this slice
- audit: external mapping duplicate/orphan checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: conflicting source ownership can quarantine or hard fail depending on lane
- post-write proof query: active mapping owner round-trip proofs

### `EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1`

- DB: `canon_warehouse_candidates`
- worker: bridge
- API: none in this slice
- audit: quarantine/public leak checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: discovery payloads remain non-canonical until explicit promotion lanes
- post-write proof query: warehouse candidate RAW-state proof

### `TCGDEX_SOURCE_CONTRACT_V1`

- DB: none directly
- worker: `source_image_enrichment_worker_v1`
- API: none in this slice
- audit: image drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: ambiguous source matches block enrichment
- post-write proof query: representative image round-trip proof

### `SOURCE_IMAGE_ENRICHMENT_V1`

- DB: `card_prints` image columns only
- worker: `source_image_enrichment_worker_v1`
- API: none in this slice
- audit: image drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: ambiguous image groups quarantine or fail closed
- post-write proof query: representative image write proof

### `REPRESENTATIVE_IMAGE_CONTRACT_V1`

- DB: no exact-vs-representative check constraint yet
- worker: `source_image_enrichment_worker_v1`
- API: none in this slice
- audit: exact/representative separation checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: writes that would overwrite exact image truth hard fail
- post-write proof query: representative image round-trip proof

### `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1`

- DB: none
- worker: `source_image_enrichment_worker_v1`
- API: none in this slice
- audit: fallback drift checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: cross-identity fallback guesses fail closed
- post-write proof query: representative image round-trip proof

### `PRICING_ENGINE_V1`

- DB: `external_mappings` ownership constraints
- worker: `promote_source_backed_justtcg_mapping_v1`, alias mapping execution
- API: none in this slice
- audit: mapping duplicate/orphan checks
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: pricing lanes never override identity truth
- post-write proof query: active mapping owner round-trip proof

### `GV_VAULT_INSTANCE_CONTRACT_V1`

- DB: `vault_item_instances`, `vault_items` compatibility anchor, `admin_vault_instance_create_v1`, `vault_archive_exact_instance_v1`
- worker: none in this slice
- API: `archiveVaultItemInstanceAction`, `addCardToVault`, `updateVaultItemQuantity`, `saveVaultItemInstanceIntentAction`, `createSlabInstance`, `executeCardInteractionOutcomeAction`
- audit: compatibility/public leak checks plus owner-proof helpers in `apps/web/src/lib/contracts/ownershipMutationGuards.ts`
- checkpoint: `CONTRACT_RUNTIME_LAYER_V1`
- quarantine behavior: quarantine rows never surface as exact-copy ownership truth
- post-write proof query: active/archive exact-copy round-trip proofs plus owner card-count proofs

### `WALL_SECTIONS_SYSTEM_CONTRACT_V1`

- DB: `wall_sections`, `wall_section_memberships`, `v_wall_sections_v1`, `v_section_cards_v1`
- worker: none in this slice
- API: `createWallSectionAction`, `updateWallSectionAction`, `assignWallSectionMembershipAction`, `removeWallSectionMembershipAction`
- audit: public wall/section leak checks plus owner-proof helpers in `apps/web/src/lib/contracts/ownershipMutationGuards.ts`
- checkpoint: `docs/contracts/WALL_SECTIONS_SYSTEM_CONTRACT_V1.md`
- quarantine behavior: quarantined payloads must never appear in wall or section rails
- post-write proof query: section owner round-trip and exact-copy membership owner proofs
