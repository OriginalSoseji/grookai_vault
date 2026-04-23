// LOCK: Runtime may enforce only audited contract authority that exists in docs/CONTRACT_INDEX.md.
// LOCK: Runtime precedence must fail closed when lower-authority lanes conflict with higher-authority lanes.

export const CONTRACT_AUTHORITY_CLASS_ORDER_V1 = [
  { rank: 1, authority_class: 'identity_frozen_canon', label: 'Identity / Frozen Canon Contracts' },
  { rank: 2, authority_class: 'stabilization_checkpoint', label: 'Existing Stabilization / Checkpoint Authority' },
  { rank: 3, authority_class: 'schema_db', label: 'Schema / DB Constraints' },
  { rank: 4, authority_class: 'ingestion', label: 'Ingestion Contracts' },
  { rank: 5, authority_class: 'enrichment', label: 'Enrichment Contracts' },
  { rank: 6, authority_class: 'pricing', label: 'Pricing Contracts' },
  { rank: 7, authority_class: 'view_ui', label: 'View / UI Contracts' },
];

const AUTHORITY_CLASS_RANK = new Map(
  CONTRACT_AUTHORITY_CLASS_ORDER_V1.map((entry) => [entry.authority_class, entry.rank]),
);

export const CONTRACT_RUNTIME_DRIFT_REFERENCES_V1 = [
  'WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1',
  'STAMPED_IDENTITY_RULE_V1',
  'SET_CLOSURE_PLAYBOOK_V1',
];

export const CONTRACT_RUNTIME_CATALOG_V1 = {
  GROOKAI_GUARDRAILS: {
    status: 'Active',
    authority_class: 'stabilization_checkpoint',
    domain: 'governance',
    canon_affecting: true,
    conflict_behavior: 'Fail closed on undeclared scope, unknown names, or missing enforcement metadata.',
    enforcement_points: {
      worker: ['backend/lib/contracts/validate_write_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/checkpoints/contracts/CONTRACT_RUNTIME_LAYER_V1.md'],
      quarantine_behavior: 'Ambiguous canon-affecting writes are quarantined, not promoted.',
      post_write_proof_query: 'Execution-specific proof queries declared at write sites.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'No automatic migration scoping yet.',
    next_action: 'Extend scope declarations to canon-affecting migration replay lanes when those scripts are formalized.',
  },
  NO_ASSUMPTION_RULE: {
    status: 'Active',
    authority_class: 'stabilization_checkpoint',
    domain: 'governance',
    canon_affecting: true,
    conflict_behavior: 'Any guessed identity or unresolved conflict blocks the write.',
    enforcement_points: {
      worker: ['backend/lib/contracts/validate_write_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/checkpoints/contracts/CONTRACT_RUNTIME_LAYER_V1.md'],
      quarantine_behavior: 'Ambiguous-but-preservable inputs route to quarantine.',
      post_write_proof_query: 'No quarantine row may leak into compatibility or public views.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'Human review remains external to this layer.',
    next_action: 'Add repair flows that resolve ledger/quarantine entries without mutating evidence.',
  },
  IDENTITY_CONTRACT_SUITE_V1: {
    status: 'Frozen',
    authority_class: 'identity_frozen_canon',
    domain: 'identity',
    canon_affecting: true,
    conflict_behavior: 'Identity writes lose to no lower-precedence lane.',
    enforcement_points: {
      db: ['public.card_print_identity', 'public.card_prints'],
      worker: [
        'backend/warehouse/promotion_stage_worker_v1.mjs',
        'backend/warehouse/promotion_executor_v1.mjs',
        'backend/warehouse/gv_id_assignment_worker_v1.mjs',
      ],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/checkpoints/contracts/CONTRACT_RUNTIME_LAYER_V1.md'],
      quarantine_behavior: 'Ambiguous identity-bearing payloads are blocked from canon and preserved in quarantine.',
      post_write_proof_query:
        'Active identity uniqueness and missing-identity drift queries in drift_audit_v1.sql.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'Legacy card_prints rows still exist without active identity rows.',
    next_action: 'Backfill remaining active identities before promoting required-identity constraints to DB.',
  },
  IDENTITY_PRECEDENCE_RULE_V1: {
    status: 'Frozen',
    authority_class: 'identity_frozen_canon',
    domain: 'identity',
    canon_affecting: true,
    conflict_behavior: 'Printed identity outranks external/source identity and route guesses.',
    enforcement_points: {
      worker: [
        'backend/warehouse/promotion_stage_worker_v1.mjs',
        'backend/warehouse/promotion_executor_v1.mjs',
      ],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/checkpoints/contracts/CONTRACT_RUNTIME_LAYER_V1.md'],
      quarantine_behavior: 'Conflicting external identity claims quarantine instead of silently remapping canon.',
      post_write_proof_query:
        'Promotion-stage proof queries require one active staging row and one candidate owner after staging.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'Some upstream docs still reference non-index alias names.',
    next_action: 'Retire drifted alias names from worker READMEs and playbooks.',
  },
  GV_ID_ASSIGNMENT_V1: {
    status: 'Frozen',
    authority_class: 'identity_frozen_canon',
    domain: 'identity',
    canon_affecting: true,
    conflict_behavior: 'Reject collisions and malformed gv_id assignments.',
    enforcement_points: {
      db: ['public.card_prints.gv_id unique indexes'],
      worker: ['backend/warehouse/gv_id_assignment_worker_v1.mjs', 'backend/warehouse/promotion_executor_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/checkpoints/contracts/CONTRACT_RUNTIME_LAYER_V1.md'],
      quarantine_behavior: 'Collision-safe failures hard fail; no quarantine promotion path exists for gv_id writes.',
      post_write_proof_query:
        'Assigned row must round-trip with the planned gv_id and remain unique across card_prints.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'Legacy rows without gv_id remain deferred debt.',
    next_action: 'Finish gv_id backfill before considering required-not-null enforcement.',
  },
  GV_ID_VARIANT_SUFFIX_CONTRACT_V2: {
    status: 'Active',
    authority_class: 'identity_frozen_canon',
    domain: 'identity',
    canon_affecting: true,
    conflict_behavior: 'Variant suffix routes win over loose namespace guesses.',
    enforcement_points: {
      worker: ['backend/warehouse/gv_id_assignment_worker_v1.mjs', 'backend/warehouse/promotion_executor_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/checkpoints/contracts/CONTRACT_RUNTIME_LAYER_V1.md'],
      quarantine_behavior: 'Conflicting suffix decisions block canon assignment.',
      post_write_proof_query: 'gv_id collision proof queries in drift_audit_v1.sql.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'None in V1 runtime scope.',
    next_action: 'Keep suffix namespace decisions inside deterministic builders only.',
  },
  CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1: {
    status: 'Frozen',
    authority_class: 'identity_frozen_canon',
    domain: 'identity',
    canon_affecting: true,
    conflict_behavior: 'card_prints stays canonical object owner; identity uniqueness lives in card_print_identity.',
    enforcement_points: {
      db: ['public.card_print_identity active uniqueness indexes'],
      worker: ['backend/warehouse/promotion_executor_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['reprint_anthology_identity_model_v1'],
      quarantine_behavior: 'Writes that would bypass the identity subsystem hard fail.',
      post_write_proof_query:
        'Identity uniqueness proof queries and active-identity-missing drift counts in drift_audit_v1.sql.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'Missing active identity rows still prevent required identity coverage at DB level.',
    next_action: 'Close the missing-identity debt before tightening nullability.',
  },
  REPRINT_ANTHOLOGY_SET_CONTRACT_V1: {
    status: 'Active',
    authority_class: 'identity_frozen_canon',
    domain: 'identity',
    canon_affecting: true,
    conflict_behavior: 'Set-level identity model outranks set-code carve-outs.',
    enforcement_points: {
      db: ['public.card_prints unique identity indexes'],
      worker: ['backend/warehouse/promotion_executor_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['reprint_anthology_identity_model_v1'],
      quarantine_behavior: 'Anthology ambiguity blocks promotion.',
      post_write_proof_query:
        'Promotion proof queries validate promoted card_print linkage after CREATE_CARD_PRINT.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'Runtime currently trusts upstream identity resolution output for anthology cases.',
    next_action: 'Thread explicit anthology assertions into promotion-stage preflight when more anthology lanes go live.',
  },
  STABILIZATION_CONTRACT_V1: {
    status: 'Active',
    authority_class: 'stabilization_checkpoint',
    domain: 'system',
    canon_affecting: true,
    conflict_behavior: 'Canonical tables outrank compatibility projections and env aliases.',
    enforcement_points: {
      worker: [
        'backend/supabase_backend_client.mjs',
        'backend/lib/contracts/validate_write_v1.mjs',
      ],
      view: ['public.v_vault_items_web', 'public.v_best_prices_all_gv_v1'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/contracts/STABILIZATION_CONTRACT_V1.md'],
      quarantine_behavior: 'Compatibility drift never authorizes canon writes.',
      post_write_proof_query:
        'Compatibility view existence and quarantine-leak checks in drift_audit_v1.sql.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'Legacy env aliases still exist for compatibility.',
    next_action: 'Continue removing new writes that depend on legacy compatibility aliases.',
  },
  INGESTION_PIPELINE_CONTRACT_V1: {
    status: 'Active',
    authority_class: 'ingestion',
    domain: 'ingestion',
    canon_affecting: true,
    conflict_behavior: 'Raw-first staging wins over direct canon mutation.',
    enforcement_points: {
      worker: [
        'backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs',
        'backend/warehouse/classification_worker_v1.mjs',
      ],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Ambiguous discovery payloads are preserved outside canon.',
      post_write_proof_query:
        'Warehouse candidate and staging proof queries validate one owner row and one active staging row.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'Controlled-growth raw staging remains outside runtime scope because it is non-canonical.',
    next_action: 'Keep raw discovery staging non-canonical until a later explicit scope is needed.',
  },
  EXTERNAL_SOURCE_INGESTION_MODEL_V1: {
    status: 'Active',
    authority_class: 'ingestion',
    domain: 'ingestion',
    canon_affecting: true,
    conflict_behavior: 'External source rows may stage evidence, but cannot self-authorize canon truth.',
    enforcement_points: {
      worker: [
        'backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs',
        'backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs',
      ],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Conflicting external mappings quarantine or hard fail depending on preservability.',
      post_write_proof_query:
        'External mapping proof queries validate one active mapping owner per source/external_id.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'One-source-to-many-card historical mappings remain live debt.',
    next_action: 'Handle historical many-to-one source/card rows through repair flows instead of blind constraints.',
  },
  EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1: {
    status: 'Active',
    authority_class: 'ingestion',
    domain: 'ingestion',
    canon_affecting: true,
    conflict_behavior: 'Discovery staging stays non-canon until explicit founder-approved promotion lanes.',
    enforcement_points: {
      worker: ['backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Non-canonical preservation remains outside canonical views and mappings.',
      post_write_proof_query:
        'Bridge proof queries validate warehouse candidate existence plus event trail.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'Repair workflow for malformed staged rows is not formalized here.',
    next_action: 'Add an explicit repair checkpoint for malformed bridge payloads if that lane becomes frequent.',
  },
  TCGDEX_SOURCE_CONTRACT_V1: {
    status: 'Active',
    authority_class: 'ingestion',
    domain: 'source',
    canon_affecting: true,
    conflict_behavior: 'Only deterministic source-backed TCGdex enrichments may write image surfaces.',
    enforcement_points: {
      worker: ['backend/images/source_image_enrichment_worker_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Source ambiguity blocks enrichment instead of writing guessed images.',
      post_write_proof_query:
        'Representative image proof queries require updated rows to hold the selected representative image URL.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'V1 still targets one set at a time.',
    next_action: 'Keep the one-set safety gate until source-backed coverage is audited for expansion.',
  },
  PRINTED_IDENTITY_CONTRACT_V1: {
    status: 'Frozen',
    authority_class: 'identity_frozen_canon',
    domain: 'identity',
    canon_affecting: true,
    conflict_behavior: 'Printed-number truth beats loose textual matches.',
    enforcement_points: {
      worker: [
        'backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs',
        'backend/warehouse/promotion_stage_worker_v1.mjs',
      ],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Rows missing lawful printed identity signals block canon writes.',
      post_write_proof_query:
        'Identity drift checks in drift_audit_v1.sql flag null or duplicate printed identity paths.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'Backfill debt prevents blind not-null enforcement.',
    next_action: 'Use validation layer and drift audit until the backfill is complete.',
  },
  SOURCE_IMAGE_ENRICHMENT_V1: {
    status: 'Active',
    authority_class: 'enrichment',
    domain: 'image',
    canon_affecting: true,
    conflict_behavior: 'Exact-match-first image writes beat fallback or guessed imagery.',
    enforcement_points: {
      worker: ['backend/images/source_image_enrichment_worker_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Ambiguous image groups hard fail or quarantine before public surfaces change.',
      post_write_proof_query:
        'Representative image proof queries validate representative_image_url writes only where exact image remains absent.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'No generalized quarantine repair flow for image batches yet.',
    next_action: 'Add repair tooling once more source image sets are enabled.',
  },
  REPRESENTATIVE_IMAGE_CONTRACT_V1: {
    status: 'Active',
    authority_class: 'enrichment',
    domain: 'image',
    canon_affecting: true,
    conflict_behavior: 'Representative imagery must stay distinct from exact imagery.',
    enforcement_points: {
      db: ['public.card_prints image_url / representative_image_url columns'],
      worker: ['backend/images/source_image_enrichment_worker_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Writes that would overwrite exact images hard fail.',
      post_write_proof_query:
        'Representative image proof queries require exact image columns to remain untouched when already populated.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'No DB check constraint distinguishes exact vs representative ownership yet.',
    next_action: 'Keep worker-level enforcement until a safe DB rule exists.',
  },
  REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1: {
    status: 'Active',
    authority_class: 'enrichment',
    domain: 'image',
    canon_affecting: true,
    conflict_behavior: 'Fallback can only borrow from lawful sibling-base representatives.',
    enforcement_points: {
      worker: ['backend/images/source_image_enrichment_worker_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Cross-identity fallback guesses fail closed.',
      post_write_proof_query:
        'Drift audit flags missing or leaked representative image references after enrichment.',
    },
    current_enforcement_status: 'enforced',
    gaps: 'Proof remains worker-scoped, not schema-scoped.',
    next_action: 'Promote to a DB-safe derived proof only after coverage stabilizes.',
  },
  PRICING_ENGINE_V1: {
    status: 'Active',
    authority_class: 'pricing',
    domain: 'pricing',
    canon_affecting: true,
    conflict_behavior: 'Pricing mappings cannot override identity truth or staging boundaries.',
    enforcement_points: {
      worker: ['backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['CONTRACT_RUNTIME_LAYER_V1'],
      quarantine_behavior: 'Pricing-related mapping ambiguity blocks write rather than mutating canon mappings.',
      post_write_proof_query:
        'External mapping proof queries validate one active mapping per source/external_id after upsert.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'Historical source/card duplicates prevent blind uniqueness expansion.',
    next_action: 'Repair historical mapping debt before tightening DB rules beyond source/external_id.',
  },
  GV_VAULT_INSTANCE_CONTRACT_V1: {
    status: 'Active',
    authority_class: 'view_ui',
    domain: 'vault',
    canon_affecting: true,
    conflict_behavior: 'Exact-copy ownership anchors outrank grouped compatibility surfaces.',
    enforcement_points: {
      db: ['public.vault_item_instances'],
      worker: ['backend/lib/contracts/validate_write_v1.mjs'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/contracts/STABILIZATION_CONTRACT_V1.md'],
      quarantine_behavior: 'No quarantine row may surface as a vault instance.',
      post_write_proof_query: 'Compatibility view existence checks prevent quarantine/canon leakage into public vault reads.',
    },
    current_enforcement_status: 'partially_enforced',
    gaps: 'V1 runtime does not yet instrument private vault mutation workers.',
    next_action: 'Extend contract runtime to owner-write vault APIs in a follow-up.',
  },
  WALL_SECTIONS_SYSTEM_CONTRACT_V1: {
    status: 'Active',
    authority_class: 'view_ui',
    domain: 'public_wall',
    canon_affecting: true,
    conflict_behavior: 'Exact-copy section membership cannot be inferred from grouped or quarantined data.',
    enforcement_points: {
      db: ['public.wall_sections', 'public.wall_section_memberships', 'public.v_wall_sections_v1'],
      audit: ['scripts/contracts/drift_audit_v1.sql'],
      checkpoint: ['docs/contracts/WALL_SECTIONS_SYSTEM_CONTRACT_V1.md'],
      quarantine_behavior: 'Quarantined rows must never surface in wall or section views.',
      post_write_proof_query: 'Drift audit validates view existence and quarantine-view isolation.',
    },
    current_enforcement_status: 'audit_only',
    gaps: 'No owner-write wall mutation path is instrumented by this runtime slice yet.',
    next_action: 'Cover wall/section owner mutation APIs in a follow-up runtime slice.',
  },
};

export function getContractPrecedenceRankV1(contractName) {
  const entry = CONTRACT_RUNTIME_CATALOG_V1[contractName];
  return entry ? AUTHORITY_CLASS_RANK.get(entry.authority_class) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
}

export function getContractRuntimeEntryV1(contractName) {
  return CONTRACT_RUNTIME_CATALOG_V1[contractName] ?? null;
}
