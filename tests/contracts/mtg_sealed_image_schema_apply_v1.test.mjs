import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedImageSchemaApplyPlanV1,
  buildMtgSealedImageSchemaInventoryV1,
  evaluateMtgSealedImageSchemaReadbackV1,
  MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1,
} from '../../backend/pricing/mtg_sealed_image_schema_apply_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
  MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
  MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
  MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';

const migration = fs.readFileSync(
  `supabase/migrations/${MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1}`, 'utf8');
const applyScript = fs.readFileSync(
  'scripts/audits/mtg_sealed_image_schema_apply_v1.mjs', 'utf8');

function validPreflight() {
  const repositoryVersions = [
    '20251223', '20260214', MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
  ];
  return {
    preflight_version: MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
    local: {
      branch: 'agent/mtg-sealed-image-migration-promotion-v1',
      head_sha: 'a'.repeat(40),
      expected_head_sha: 'a'.repeat(40),
      tracked_worktree_clean: true,
      repository_project_ref: MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
      migration_version: MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
      migration_filename: MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
      migration_sha256: MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
      image_schema_candidate_sha256:
        '6a8143719633193c6d6f0d1ee3da2e95cb933f37194203cb95c7fc5314c5a735',
      image_auth_candidate_sha256:
        '46e0c6d15cebd06d7a4e1299563d483fded19c23a23cb0936ce9a23e7ed4e6b0',
      signer_index_sha256:
        '2dc6c3a6a275214dec9d39b29bd65e7ffc08f344c0ed327a1b5e76852478b30b',
      signer_config_sha256:
        '7551533d8029d2f2ff237c1ff0915b2758a25711aec701d6a5378cc7f7d94e3f',
      duplicate_repo_migration_versions: 0,
      repository_migration_versions: repositoryVersions,
    },
    production: {
      api_project_ref: MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
      database_project_ref: MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
      guard: {
        transaction_read_only: 'on',
        default_transaction_read_only: 'on',
      },
      roles: ['anon', 'authenticated', 'service_role'],
      missing_prerequisite_relations: [],
      missing_prerequisite_functions: [],
      collisions: {
        relations: [], functions: [], indexes: [], triggers: [], policies: [],
        constraints: [],
      },
      migration_ledger_present: true,
      migration_ledger_count: 0,
      duplicate_repo_migration_versions: 0,
      migration_ledger_reconciliation: {
        repository_version_count: 3,
        expected_remote_version_count: 2,
        remote_version_count: 2,
        missing_repository_versions_on_remote: [],
        unexpected_remote_versions: [],
        pending_repository_versions: [MTG_SEALED_IMAGE_MIGRATION_VERSION_V1],
        duplicate_remote_versions: [],
        expected_remote_versions: repositoryVersions.slice(0, 2),
        remote_versions: repositoryVersions.slice(0, 2),
      },
      data_boundaries: {
        canonical_card_prints_count: 40000,
        canonical_sets_count: 150,
        canonical_card_print_traits_count: 5000,
        card_print_traits_orphan_count: 0,
        families: 479,
        variants: 3294,
        candidates: 3307,
        reviews: 3294,
        mappings: 3294,
        evidence: 15801,
        qualifications: 3153,
        releases: 2,
        release_members: 2514,
        release_pointers: 2,
        release_controls: 2,
        mtg_price_pointer_count: 1,
        mtg_active_price_release_count: 1,
        mtg_active_price_member_count: 2182,
        mtg_catalog_release_status: 'signed_in',
        mtg_sealed_release_status: 'hidden',
        one_piece_price_pointer_count: 1,
        one_piece_active_price_release_count: 1,
        ...Object.fromEntries(MTG_SEALED_IMAGE_TABLES_V1.map(
          (table) => [`${table}_count`, 0])),
      },
      before_fingerprint: 'b'.repeat(64),
      after_fingerprint: 'b'.repeat(64),
    },
    boundaries: {
      database_writes: 0,
      storage_reads: 0,
      storage_writes: 0,
      provider_calls: 0,
      pricing_writes: 0,
      release_pointer_writes: 0,
      visibility_changes: 0,
      vault_writes: 0,
      edge_function_deployments: 0,
      client_activations: 0,
    },
  };
}

function validReadback(plan) {
  const functionSecurity = {
    sealed_product_image_release_manifest_fingerprint_v1: ['s', false],
    sealed_product_assert_image_release_complete_v1: ['s', false],
    sealed_product_guard_image_evidence_insert_v1: ['v', false],
    sealed_product_guard_variant_image_assertion_insert_v1: ['v', false],
    sealed_product_guard_image_release_insert_v1: ['v', false],
    sealed_product_guard_image_release_mutation_v1: ['v', false],
    sealed_product_guard_image_release_member_insert_v1: ['v', false],
    sealed_product_freeze_image_release_v1: ['v', true],
    sealed_product_set_active_image_release_v1: ['v', true],
    mtg_sealed_image_object_signing_authorized_v1: ['s', true],
  };
  return {
    transaction_read_only: 'on',
    transaction_closed_before_artifacts: true,
    tables: plan.inventory.tables.map((table_name) => ({
      table_name, rls_enabled: true, rls_forced: true, row_count: 0,
    })),
    constraints: plan.inventory.constraints.map((row) => ({
      ...row, validated: true,
    })),
    indexes: plan.inventory.indexes.map((row) => ({
      ...row, valid: true, ready: true,
    })),
    functions: plan.inventory.functions.map((signature) => {
      const functionName = signature.slice(0, signature.indexOf('('));
      return {
        signature,
        volatility: functionSecurity[functionName][0],
        security_definer: functionSecurity[functionName][1],
        configuration: ['search_path=pg_catalog, public'],
      };
    }),
    triggers: plan.inventory.triggers.map((trigger_name) => ({ trigger_name })),
    policies: plan.inventory.policies.map((row) => ({
      ...row,
      command: 'ALL',
      roles: '{service_role}',
      using_expression: 'true',
      check_expression: 'true',
    })),
    table_grants: plan.inventory.tables.flatMap((table_name) =>
      (table_name === 'sealed_product_image_release_pointer'
        ? ['SELECT'] : ['INSERT', 'SELECT']).map((privilege_type) => ({
        table_name, grantee: 'service_role', privilege_type,
      }))),
    routine_grants: [
      ['sealed_product_freeze_image_release_v1', 'service_role'],
      ['sealed_product_set_active_image_release_v1', 'service_role'],
      ['mtg_sealed_image_object_signing_authorized_v1', 'authenticated'],
      ['mtg_sealed_image_object_signing_authorized_v1', 'service_role'],
    ].map(([routine_name, grantee]) => ({
      routine_name, grantee, privilege_type: 'EXECUTE',
    })),
    app_table_privileges: plan.inventory.tables.flatMap((table_name) =>
      ['anon', 'authenticated'].map((role_name) => ({
        role_name, table_name, has_any_privilege: false,
      }))),
    signing_authorization: {
      anon_execute: false,
      authenticated_execute: true,
      service_role_execute: true,
      empty_state_result: false,
    },
    migration_ledger: [{
      version: plan.migration.version,
      name: plan.migration.name,
      statement_count: plan.ledger_statement_count,
      ledger_fingerprint_sha256: plan.ledger_fingerprint_sha256,
    }],
    all_migration_ledger: plan.repository_migration_versions.map((version) => ({
      version,
      name: 'migration',
    })),
    data_boundaries: structuredClone(plan.baseline),
  };
}

test('inventory exactly derives the frozen image package surface', () => {
  const inventory = buildMtgSealedImageSchemaInventoryV1(migration);
  assert.deepEqual(inventory.tables, [...MTG_SEALED_IMAGE_TABLES_V1].sort());
  assert.equal(inventory.functions.length, 10);
  assert.equal(inventory.triggers.length, 9);
  assert.equal(inventory.policies.length, 6);
  assert.equal(inventory.constraints.length, 72);
  assert.equal(inventory.indexes.length, 29);
  assert.ok(inventory.constraints.some((row) =>
    row.constraint_name === 'sealed_product_source_mappings_image_evidence_binding_unique'));
});

test('apply plan is bound to migration, preflight, commit, and ledger', () => {
  const plan = buildMtgSealedImageSchemaApplyPlanV1({
    migrationSql: migration,
    preflight: validPreflight(),
  });
  assert.equal(plan.migration.sha256, MTG_SEALED_IMAGE_MIGRATION_SHA256_V1);
  assert.equal(plan.producer_commit_sha, 'a'.repeat(40));
  assert.match(plan.apply_plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(plan.required_approval_message,
    new RegExp(plan.apply_plan_fingerprint_sha256));
  assert.equal(plan.approval_env, MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1);
  assert.equal(plan.boundaries.migration_ledger_rows, 1);
  assert.equal(plan.boundaries.image_or_release_rows, 0);
});

test('valid exact schema/security/ledger readback passes', () => {
  const plan = buildMtgSealedImageSchemaApplyPlanV1({
    migrationSql: migration,
    preflight: validPreflight(),
  });
  assert.deepEqual(evaluateMtgSealedImageSchemaReadbackV1({
    plan,
    readback: validReadback(plan),
  }), []);
});

test('readback fails closed on omitted objects, data, privilege, or boundary drift', () => {
  const plan = buildMtgSealedImageSchemaApplyPlanV1({
    migrationSql: migration,
    preflight: validPreflight(),
  });
  const omitted = validReadback(plan);
  omitted.triggers.pop();
  assert.ok(evaluateMtgSealedImageSchemaReadbackV1({ plan, readback: omitted })
    .includes('trigger_inventory_mismatch'));

  const data = validReadback(plan);
  data.tables[0].row_count = 1;
  assert.ok(evaluateMtgSealedImageSchemaReadbackV1({ plan, readback: data })
    .some((finding) => finding.startsWith('schema_gate_wrote_data:')));

  const privilege = validReadback(plan);
  privilege.signing_authorization.anon_execute = true;
  assert.ok(evaluateMtgSealedImageSchemaReadbackV1({ plan, readback: privilege })
    .includes('signing_authorization_boundary_mismatch'));

  const boundary = validReadback(plan);
  boundary.data_boundaries.mtg_sealed_release_status = 'signed_in';
  assert.ok(evaluateMtgSealedImageSchemaReadbackV1({ plan, readback: boundary })
    .includes('protected_data_boundary_changed'));
});

test('operator script has no rollback execution mode and gates the sole apply path', () => {
  assert.match(applyScript, /argument === '--apply'/);
  assert.doesNotMatch(applyScript, /argument === '--dry-run'/);
  assert.match(applyScript, /runFreshPreflight\(args\)/);
  assert.match(applyScript, /expectedPlanFingerprint/);
  assert.match(applyScript, /MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1/);
  assert.match(applyScript, /Inside-transaction readback failed/);
  assert.match(applyScript, /independent_post_apply_readback/);
});
