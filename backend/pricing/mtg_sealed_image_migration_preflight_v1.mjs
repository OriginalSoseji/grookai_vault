export const MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1 =
  'MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_V1';

export const MTG_SEALED_IMAGE_MIGRATION_VERSION_V1 = '20260904130000';
export const MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1 =
  '20260904130000_mtg_sealed_image_evidence_and_signing_authorization_v1.sql';
export const MTG_SEALED_IMAGE_MIGRATION_SHA256_V1 =
  '0efd90e3291731f153afd901f23b51c264f4a0b0d27236c10bb34f82938c8406';
export const MTG_SEALED_IMAGE_SCHEMA_CANDIDATE_SHA256_V1 =
  '6a8143719633193c6d6f0d1ee3da2e95cb933f37194203cb95c7fc5314c5a735';
export const MTG_SEALED_IMAGE_AUTH_CANDIDATE_SHA256_V1 =
  '46e0c6d15cebd06d7a4e1299563d483fded19c23a23cb0936ce9a23e7ed4e6b0';
export const MTG_SEALED_SIGNER_INDEX_SHA256_V1 =
  '2dc6c3a6a275214dec9d39b29bd65e7ffc08f344c0ed327a1b5e76852478b30b';
export const MTG_SEALED_SIGNER_CONFIG_SHA256_V1 =
  '7551533d8029d2f2ff237c1ff0915b2758a25711aec701d6a5378cc7f7d94e3f';

export const MTG_SEALED_IMAGE_TABLES_V1 = Object.freeze([
  'sealed_product_image_evidence',
  'sealed_product_image_objects',
  'sealed_product_variant_image_assertions',
  'sealed_product_image_releases',
  'sealed_product_image_release_members',
  'sealed_product_image_release_pointer',
]);

export const MTG_SEALED_IMAGE_FUNCTIONS_V1 = Object.freeze([
  'sealed_product_guard_variant_image_assertion_insert_v1()',
  'sealed_product_guard_image_release_insert_v1()',
  'sealed_product_guard_image_release_mutation_v1()',
  'sealed_product_guard_image_release_member_insert_v1()',
  'sealed_product_freeze_image_release_v1(uuid,text,uuid)',
  'sealed_product_set_active_image_release_v1(uuid,uuid,uuid)',
  'mtg_sealed_image_object_signing_authorized_v1(text,text)',
]);

export const MTG_SEALED_IMAGE_INDEXES_V1 = Object.freeze([
  'sealed_product_image_evidence_variant_idx',
  'sealed_product_image_evidence_source_idx',
  'sealed_product_variant_image_assertions_variant_idx',
  'sealed_product_image_release_members_release_idx',
  'sealed_product_image_releases_game_state_idx',
]);

export const MTG_SEALED_IMAGE_TRIGGERS_V1 = Object.freeze([
  'sealed_product_image_evidence_append_only',
  'sealed_product_image_objects_append_only',
  'sealed_product_variant_image_assertions_append_only',
  'sealed_product_variant_image_assertions_guard_insert',
  'sealed_product_image_releases_guard_insert',
  'sealed_product_image_releases_guard_mutation',
  'sealed_product_image_release_members_append_only',
  'sealed_product_image_release_members_guard_insert',
]);

export const MTG_SEALED_IMAGE_POLICIES_V1 = Object.freeze([
  'sealed_product_image_evidence_service_role_all',
  'sealed_product_image_objects_service_role_all',
  'sealed_product_variant_image_assertions_service_role_all',
  'sealed_product_image_releases_service_role_all',
  'sealed_product_image_release_members_service_role_all',
  'sealed_product_image_release_pointer_service_role_all',
]);

export const MTG_SEALED_IMAGE_PREREQUISITE_RELATIONS_V1 = Object.freeze([
  'games',
  'catalog_game_release_controls',
  'sealed_product_game_release_controls',
  'sealed_product_families',
  'sealed_product_variants',
  'sealed_product_source_mappings',
  'sealed_product_pricing_lane_qualifications',
  'sealed_product_releases',
  'sealed_product_release_members',
  'sealed_product_release_pointer',
]);

export const MTG_SEALED_IMAGE_PREREQUISITE_FUNCTIONS_V1 = Object.freeze([
  'sealed_product_reject_row_mutation_v1()',
  'catalog_game_visible_to_request_v1(text)',
  'sealed_product_game_visible_to_request_v1(text)',
]);

function zeroCollisionCounts(collisions = {}) {
  return [
    'relations',
    'functions',
    'indexes',
    'triggers',
    'policies',
    'constraints',
  ].every((key) => Array.isArray(collisions[key]) &&
    collisions[key].length === 0);
}

export function validateMtgSealedImageMigrationPreflightV1(proof) {
  const local = proof?.local ?? {};
  const production = proof?.production ?? {};
  const boundary = production.data_boundaries ?? {};
  const checks = {
    preflight_version:
      proof?.preflight_version === MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
    repository:
      local.branch === 'agent/mtg-sealed-image-migration-promotion-v1' &&
      local.head_sha === local.expected_head_sha &&
      local.tracked_worktree_clean === true,
    migration_identity:
      local.migration_version === MTG_SEALED_IMAGE_MIGRATION_VERSION_V1 &&
      local.migration_filename === MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1 &&
      local.migration_sha256 === MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
    candidate_identity:
      local.image_schema_candidate_sha256 ===
        MTG_SEALED_IMAGE_SCHEMA_CANDIDATE_SHA256_V1 &&
      local.image_auth_candidate_sha256 ===
        MTG_SEALED_IMAGE_AUTH_CANDIDATE_SHA256_V1,
    signer_identity:
      local.signer_index_sha256 === MTG_SEALED_SIGNER_INDEX_SHA256_V1 &&
      local.signer_config_sha256 === MTG_SEALED_SIGNER_CONFIG_SHA256_V1,
    migration_history:
      production.migration_ledger_count === 0 &&
      production.duplicate_repo_migration_versions === 0,
    read_only:
      production.guard?.transaction_read_only === 'on' &&
      production.guard?.default_transaction_read_only === 'on',
    prerequisites:
      Array.isArray(production.missing_prerequisite_relations) &&
      production.missing_prerequisite_relations.length === 0 &&
      Array.isArray(production.missing_prerequisite_functions) &&
      production.missing_prerequisite_functions.length === 0,
    collisions: zeroCollisionCounts(production.collisions),
    roles:
      ['anon', 'authenticated', 'service_role'].every((role) =>
        production.roles?.includes(role)),
    mtg_price_authority:
      Number(boundary.mtg_price_pointer_count) === 1 &&
      Number(boundary.mtg_active_price_release_count) === 1 &&
      Number(boundary.mtg_active_price_member_count) === 2182,
    visibility_unchanged:
      ['signed_in', 'public'].includes(boundary.mtg_catalog_release_status) &&
      boundary.mtg_sealed_release_status === 'hidden',
    cross_game_unchanged:
      Number(boundary.one_piece_price_pointer_count) === 1 &&
      Number(boundary.one_piece_active_price_release_count) === 1,
    no_image_state:
      MTG_SEALED_IMAGE_TABLES_V1.every((table) =>
        Number(boundary[`${table}_count`] ?? 0) === 0),
    boundary_reconciliation:
      production.before_fingerprint === production.after_fingerprint,
    prohibited_activity:
      Object.values(proof?.boundaries ?? {}).every((value) => value === 0),
  };
  return {
    valid: Object.values(checks).every(Boolean),
    checks,
  };
}
