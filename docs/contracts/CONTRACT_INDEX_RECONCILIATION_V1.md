# CONTRACT_INDEX_RECONCILIATION_V1

Status: Active runtime support document

Purpose: reconcile contract-like docs in `docs/contracts` against `docs/CONTRACT_INDEX.md` so runtime scope can treat the index as the single source of authority.

Rule applied here: if authority is unclear, classify the doc as `non_authoritative_pending_reconciliation`.

## Decisions

| doc_name | classification | note |
| --- | --- | --- |
| `AI_FEED_AND_INTENT_FOUNDATION_V1` | merge | Domain planning doc; not current runtime contract authority. |
| `ALIAS_VARIANT_COVERAGE_CONTRACT_V1` | merge | Implementation-detail warehouse identity coverage; subsumed by indexed identity suite plus precedence rules. |
| `APP_FACING_DB_CONTRACT_V1` | merge | Application-facing schema guidance; not a runtime-scoped contract authority. |
| `CANON_IMAGE_RESOLUTION_CONTRACT_V1` | merge | Image/domain implementation guidance; indexed representative image contracts are the active authority set. |
| `CANON_WAREHOUSE_APPROVAL_PIPELINE_CONTRACT_V1` | non_authoritative_pending_reconciliation | Looks authoritative, but runtime must not use it until the index explicitly decides. |
| `CANON_WAREHOUSE_CONTRACT_V1` | non_authoritative_pending_reconciliation | Broad warehouse authority doc; unclear whether it should be indexed or split further. |
| `CANON_WAREHOUSE_FOUNDER_GATED_PROMOTION_CONTRACT_V1` | non_authoritative_pending_reconciliation | Founder-gated promotion doctrine is real, but current authority lives through indexed identity/staging contracts. |
| `CANON_WAREHOUSE_INTAKE_CONTRACT_V1` | merge | Intake implementation guidance; indexed ingestion contracts already govern runtime scope. |
| `CARD_INTERACTION_CONTRACT_V1` | non_authoritative_pending_reconciliation | Ownership-transfer authority exists in SQL/runtime behavior, but this doc is not yet indexed. |
| `CENTERING_MEASUREMENT_CONTRACT_V2` | merge | Measurement-domain implementation contract; outside current runtime authority scope. |
| `CHILD_PRINTING_CONTRACT_V1` | non_authoritative_pending_reconciliation | Printing semantics are live, but this doc is not yet indexed. |
| `COMPATIBILITY_IDENTITY_V2` | archive | Compatibility-era planning artifact, not current authority. |
| `COMPATIBILITY_IDENTITY_V2_IMPLEMENTATION_PLAN` | archive | Implementation plan, not contract authority. |
| `CONDITION_MEASUREMENT_CONTRACT_V1` | merge | Private measurement path, not indexed runtime authority. |
| `CONTRACT_ENFORCEMENT_MAP_V1` | merge | Runtime support map, not a contract authority doc. |
| `CONTRACT_PRECEDENCE_MATRIX_V1` | merge | Runtime support matrix, not a contract authority doc. |
| `DB_ENFORCEMENT_CLASSIFICATION_V1` | merge | Runtime support classification, not a contract authority doc. |
| `EDGES_CORNERS_WORKER_V1_TCGPLAYER` | merge | Worker-level implementation doc, not indexed authority. |
| `EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1` | merge | Bridge implementation guidance; indexed ingestion/staging contracts remain authoritative. |
| `FINGERPRINTING_BINDING_PROVENANCE_CONTRACT_V1` | merge | Provenance implementation contract; not in current indexed authority set. |
| `GV_MIGRATION_MAINTENANCE_CONTRACT` | archive | Maintenance/replay guidance, not production runtime authority. |
| `GV_SCHEMA_CONTRACT_V1` | merge | Schema guidance; current runtime uses DB classification plus indexed contracts instead. |
| `GV_SECRETS_CONTRACT_v1` | archive | Operational secrets policy, not runtime contract authority. |
| `GV_SLAB_CERT_CONTRACT_V1` | non_authoritative_pending_reconciliation | Slab identity is live and trust-affecting, but this doc is not indexed yet. |
| `GV_SLAB_PROVENANCE_CONTRACT_V1` | merge | Slab provenance design doc; not current indexed authority. |
| `IDENTITY_SCANNER_V1_CONTRACT` | merge | Scanner-domain implementation contract; outside current runtime scope. |
| `JUSTTCG_BATCH_LOOKUP_CONTRACT_V1` | merge | Source-specific implementation guidance. |
| `JUSTTCG_CANONIZATION_CONTRACT_V2` | merge | Source-specific canonization doc; runtime authority currently comes from indexed ingestion/pricing contracts. |
| `JUSTTCG_DIRECT_STRUCTURE_MAPPING_CONTRACT_V1` | merge | Source-specific mapping implementation doc. |
| `JUSTTCG_DISPLAY_CONTRACT_V1` | merge | Display contract, not runtime canon authority. |
| `JUSTTCG_DOMAIN_CONTRACT_V1` | merge | Source-domain planning doc. |
| `JUSTTCG_DOMAIN_IMPLEMENTATION_PLAN_V1` | archive | Implementation plan, not contract authority. |
| `JUSTTCG_DOMAIN_SCHEMA_SPEC_V1` | archive | Schema/spec doc, not contract authority. |
| `JUSTTCG_REMAINING_MAPPING_CONTRACT_V1` | merge | Source mapping backlog doc. |
| `MARKET_ANALYSIS_FOUNDATION_CONTRACT_V1` | merge | Market analysis planning doc. |
| `MOBILE_JAKOBS_LAW_UX_CONTRACT_V1` | merge | UX guidance, not runtime canon authority. |
| `MOBILE_RESOLVER_PARITY_CONTRACT_V1` | merge | Mobile parity planning doc. |
| `MULTI_SOURCE_ARCHITECTURE_INVARIANTS_V1` | merge | Architecture invariants doc; current runtime authority remains the indexed contract set. |
| `NORMALIZATION_CONTRACT_V1` | merge | Normalization implementation doc; not current runtime authority. |
| `PREMIUM_CHILD_AUTHORITY_CONTRACT_V1` | merge | Domain-specific implementation doc, not indexed authority. |
| `PRICING_CONTRACT_INDEX` | archive | Local pricing-only index; `docs/CONTRACT_INDEX.md` is the only runtime source of truth. |
| `PRICING_FRESHNESS_CONTRACT_V1` | merge | Pricing behavior doc; not current runtime authority. |
| `PRICING_INDEX_V1_CONTRACT` | merge | Pricing/search implementation doc. |
| `PRICING_SCHEDULER_CONTRACT_V1` | merge | Scheduler implementation doc. |
| `PRICING_SURFACE_CONTRACT_V1` | merge | UI/display contract, not runtime canon authority. |
| `PRICING_SURFACE_GUARD_V1` | merge | Surface guard doc; not part of runtime authority set. |
| `PRICING_UI_CONTRACT_V1` | merge | UI contract, not runtime canon authority. |
| `PRINTED_IDENTITY_MODEL_V1` | non_authoritative_pending_reconciliation | Closely related to indexed printed identity authority, but the doc name itself is not indexed. |
| `PRINTING_MODEL_V2` | non_authoritative_pending_reconciliation | Printing model looks authoritative for child printings, but it is not yet indexed. |
| `PROMOTION_EXECUTOR_CONTRACT_V1` | non_authoritative_pending_reconciliation | Executor doctrine is live, but runtime currently derives authority from indexed promotion/identity contracts instead. |
| `PROMOTION_IMAGE_NORMALIZATION_V1` | merge | Implementation detail, not current runtime authority. |
| `PROMO_PREFIX_IDENTITY_RULE_V1` | non_authoritative_pending_reconciliation | Identity-rule shaped doc; unsafe to assume authority until indexed explicitly. |
| `PUBLIC_PROVISIONAL_WAREHOUSE_CARD_CONTRACT_V1` | merge | Public rendering contract outside current canon runtime scope. |
| `REFERENCE_BACKED_IDENTITY_CONTRACT_V1` | non_authoritative_pending_reconciliation | Identity-shaped authority doc; leave out of runtime until reconciled in the index. |
| `RESOLVER_CONTRACT_V2` | merge | Resolver implementation contract; indexed identity/injection contracts stay authoritative for runtime. |
| `RESOLVER_COVERAGE_EXPANSION_V2` | archive | Implementation plan / coverage doc. |
| `RESOLVER_HARDENING_CONTRACT_V1` | merge | Resolver hardening guidance; not indexed authority. |
| `RESOLVER_UX_AMBIGUITY_CONTRACT_V1` | merge | UX ambiguity doc, not runtime canon authority. |
| `SCORING_CONTRACT_V1` | merge | Scoring-domain implementation doc. |
| `SCRATCHES_SURFACE_WORKER_V1` | merge | Worker implementation doc. |
| `SEARCH_CONTRACT_V1` | merge | Search contract outside current canon runtime scope. |
| `SET_CLOSURE_PLAYBOOK_V1` | non_authoritative_pending_reconciliation | Still referenced as contract-like authority in repo surfaces; runtime must keep it out of scope until indexed or retired. |
| `STAMPED_IDENTITY_RULE_V1` | non_authoritative_pending_reconciliation | Still referenced as identity authority in repo surfaces; runtime must keep it out of scope until indexed or retired. |
| `VENDOR_INSIGHT_AND_DEMAND_SIGNAL_CONTRACT_V1` | merge | Demand-signal planning doc. |
| `VERSION_VS_FINISH_CONTRACT_V1` | merge | Domain-specific implementation doc. |
| `WAREHOUSE_CONTRACT_V1` | non_authoritative_pending_reconciliation | Warehouse-wide authority doc; not safe for runtime scope until reconciled in the index. |
| `WAREHOUSE_INTERPRETER_V1` | merge | Interpreter implementation guidance. |
| `WAREHOUSE_NORMALIZATION_CONTRACT_V1` | merge | Normalization implementation guidance. |
| `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1` | non_authoritative_pending_reconciliation | Still referenced in repo reality and previously detected as runtime name drift. Must stay out of scope until indexed or retired. |
| `WEB_PRICING_EXPERIENCE_CONTRACT_V1` | merge | Experience/UI contract, not runtime canon authority. |
| `WEB_PRICING_EXPERIENCE_CONTRACT_V1_AMENDMENT_001` | archive | Amendment doc, not runtime authority. |
| `WEB_PRICING_IMPLEMENTATION_PLAN_V1` | archive | Implementation plan, not contract authority. |

## Runtime Rule Confirmed

Only exact contract names from `docs/CONTRACT_INDEX.md` may appear in runtime scope declarations.

Everything else above remains:

- explicitly excluded from runtime scope
- documented here
- available for later governance reconciliation
