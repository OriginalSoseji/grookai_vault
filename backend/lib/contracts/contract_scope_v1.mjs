import {
  assertAuthoritativeContractNamesV1,
  assertCheckpointNamesV1,
} from './contract_index_v1.mjs';

// LOCK: Runtime scope names must match docs/CONTRACT_INDEX.md exactly.
// LOCK: Contract scope is required for canon-affecting execution and must stay local to the write path.

export const CONTRACT_EXECUTION_SCOPES_V1 = {
  external_discovery_to_warehouse_bridge_v1: {
    execution_name: 'external_discovery_to_warehouse_bridge_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'PRINTED_IDENTITY_CONTRACT_V1',
      'STABILIZATION_CONTRACT_V1',
      'INGESTION_PIPELINE_CONTRACT_V1',
      'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
      'EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1', 'PRODUCTION_READINESS_GATE_V1'],
  },
  classification_apply_write_plan_v1: {
    execution_name: 'classification_apply_write_plan_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'STABILIZATION_CONTRACT_V1',
      'INGESTION_PIPELINE_CONTRACT_V1',
      'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1'],
  },
  classification_apply_reclassification_result_v1: {
    execution_name: 'classification_apply_reclassification_result_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'STABILIZATION_CONTRACT_V1',
      'INGESTION_PIPELINE_CONTRACT_V1',
      'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1'],
  },
  promotion_stage_create_stage_v1: {
    execution_name: 'promotion_stage_create_stage_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
      'REPRINT_ANTHOLOGY_SET_CONTRACT_V1',
      'PRINTED_IDENTITY_CONTRACT_V1',
      'STABILIZATION_CONTRACT_V1',
      'INGESTION_PIPELINE_CONTRACT_V1',
      'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1', 'reprint_anthology_identity_model_v1'],
  },
  alias_mapping_execution_v1: {
    execution_name: 'alias_mapping_execution_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'STABILIZATION_CONTRACT_V1',
      'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
      'PRICING_ENGINE_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1'],
  },
  promotion_executor_execute_claimed_stage_v1: {
    execution_name: 'promotion_executor_execute_claimed_stage_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
      'GV_ID_ASSIGNMENT_V1',
      'GV_ID_VARIANT_SUFFIX_CONTRACT_V2',
      'REPRINT_ANTHOLOGY_SET_CONTRACT_V1',
      'PRINTED_IDENTITY_CONTRACT_V1',
      'STABILIZATION_CONTRACT_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1', 'reprint_anthology_identity_model_v1'],
  },
  gv_id_assignment_worker_v1: {
    execution_name: 'gv_id_assignment_worker_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'GV_ID_ASSIGNMENT_V1',
      'GV_ID_VARIANT_SUFFIX_CONTRACT_V2',
      'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
      'STABILIZATION_CONTRACT_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1'],
  },
  source_image_enrichment_worker_v1: {
    execution_name: 'source_image_enrichment_worker_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'TCGDEX_SOURCE_CONTRACT_V1',
      'SOURCE_IMAGE_ENRICHMENT_V1',
      'REPRESENTATIVE_IMAGE_CONTRACT_V1',
      'REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1',
      'STABILIZATION_CONTRACT_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1'],
  },
  promote_source_backed_justtcg_mapping_v1: {
    execution_name: 'promote_source_backed_justtcg_mapping_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
      'PRICING_ENGINE_V1',
      'STABILIZATION_CONTRACT_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1'],
  },
  printing_upsert_v1: {
    execution_name: 'printing_upsert_v1',
    canon_affecting: true,
    active_contracts: [
      'GROOKAI_GUARDRAILS',
      'NO_ASSUMPTION_RULE',
      'IDENTITY_CONTRACT_SUITE_V1',
      'IDENTITY_PRECEDENCE_RULE_V1',
      'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
      'STABILIZATION_CONTRACT_V1',
    ],
    checkpoints: ['CONTRACT_RUNTIME_LAYER_V1'],
  },
};

export function getContractScopeV1(executionName) {
  return CONTRACT_EXECUTION_SCOPES_V1[executionName] ?? null;
}

export async function assertContractScopeRegistryV1() {
  for (const scope of Object.values(CONTRACT_EXECUTION_SCOPES_V1)) {
    await assertAuthoritativeContractNamesV1(scope.active_contracts, scope.execution_name);
    await assertCheckpointNamesV1(scope.checkpoints, scope.execution_name);
  }
}
