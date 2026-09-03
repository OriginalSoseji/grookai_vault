import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  MTG_SEALED_MIGRATION_SHA256_V1,
  MTG_SEALED_MIGRATION_VERSION_V1,
  validateMtgSealedMigrationReadbackV1,
} from '../../backend/pricing/mtg_sealed_migration_readback_v1.mjs';

function fixture() {
  return {
    migration_file_sha256: MTG_SEALED_MIGRATION_SHA256_V1,
    ledger: [{ version: MTG_SEALED_MIGRATION_VERSION_V1, statement_count: 1 }],
    later_migration_count: 0,
    columns: [
      { table_name: 'sealed_product_release_pointer', column_name: 'game_key',
        data_type: 'text', is_nullable: 'NO' },
      { table_name: 'sealed_product_releases', column_name: 'game_key',
        data_type: 'text', is_nullable: 'NO' },
    ],
    constraints: [
      { constraint_name: 'sealed_product_releases_game_key_check',
        table_name: 'sealed_product_releases', constraint_type: 'c',
        definition: "CHECK (game_key = lower(game_key) AND btrim(game_key) <> ''::text)" },
      { constraint_name: 'sealed_product_releases_id_game_unique',
        table_name: 'sealed_product_releases', constraint_type: 'u',
        definition: 'UNIQUE (id, game_key)' },
      { constraint_name: 'sealed_product_release_pointer_game_key_check',
        table_name: 'sealed_product_release_pointer', constraint_type: 'c',
        definition: "CHECK (game_key = lower(game_key) AND btrim(game_key) <> ''::text)" },
      { constraint_name: 'sealed_product_release_pointer_pkey',
        table_name: 'sealed_product_release_pointer', constraint_type: 'p',
        definition: 'PRIMARY KEY (game_key)' },
      { constraint_name: 'sealed_product_release_pointer_release_game_fk',
        table_name: 'sealed_product_release_pointer', constraint_type: 'f',
        definition: 'FOREIGN KEY (release_id, game_key) REFERENCES sealed_product_releases(id, game_key) ON DELETE RESTRICT' },
      { constraint_name: 'sealed_product_release_pointer_previous_release_game_fk',
        table_name: 'sealed_product_release_pointer', constraint_type: 'f',
        definition: 'FOREIGN KEY (previous_release_id, game_key) REFERENCES sealed_product_releases(id, game_key) ON DELETE RESTRICT' },
    ].map((row) => ({ ...row, validated: true })),
    indexes: [{ index_name: 'sealed_product_releases_game_state_idx', valid: true,
      ready: true, definition: '(game_key, release_state, created_at DESC)' }],
    functions: [
      { function_name: 'sealed_product_set_active_release_v1', volatility: 'v',
        security_definer: true, search_path: ['search_path=pg_catalog, public'],
        public_execute: false, anon_execute: false, authenticated_execute: false,
        service_role_execute: true,
        definition: 'where pointer.game_key = v_release.game_key on conflict (game_key)' },
      { function_name: 'get_active_sealed_product_pricing_v1', volatility: 's',
        security_definer: true, search_path: ['search_path=pg_catalog, public'],
        public_execute: false, anon_execute: false, authenticated_execute: true,
        service_role_execute: true,
        definition: 'release.game_key = pointer.game_key catalog_game_visible_to_request_v1(family.game_key)' },
      { function_name: 'get_active_sealed_product_pricing_v2', volatility: 's',
        security_definer: true, search_path: ['search_path=pg_catalog, public'],
        public_execute: false, anon_execute: false, authenticated_execute: true,
        service_role_execute: true,
        definition: 'family.game_key = lower(btrim(p_game_key)) catalog_game_visible_to_request_v1(family.game_key)' },
    ],
    relations: ['sealed_product_release_pointer', 'sealed_product_releases']
      .map((relation_name) => ({ relation_name, rls_enabled: true, rls_forced: true })),
    policies: ['sealed_product_release_pointer', 'sealed_product_releases']
      .map((relation_name) => ({ relation_name, policy_count: 1,
        service_role_all_count: 1, other_role_policy_count: 0 })),
    table_privileges: [
      { table_name: 'sealed_product_releases', service_select: true,
        service_insert: true, service_update: false, service_delete: false,
        service_truncate: false, service_references: false, service_trigger: false,
        public_any: false, authenticated_any: false, anon_any: false },
      { table_name: 'sealed_product_release_pointer', service_select: true,
        service_insert: false, service_update: false, service_delete: false,
        service_truncate: false, service_references: false, service_trigger: false,
        public_any: false, authenticated_any: false, anon_any: false },
    ],
    data_boundaries: { release_null_game_count: 0, pointer_null_game_count: 0,
      cross_game_member_count: 0, pointer_release_game_mismatch_count: 0,
      pointer_previous_game_mismatch_count: 0, one_piece_pointer_count: 1,
      mtg_release_count: 0, mtg_pointer_count: 0, mtg_visible_rpc_row_count: 0,
      mtg_release_status: 'hidden' },
  };
}

test('complete readback proves migration schema, security, and data boundaries', () => {
  assert.deepEqual(validateMtgSealedMigrationReadbackV1(fixture()), {
    valid: true,
    checks: {
      migration_file_hash: true,
      ledger: true,
      columns: true,
      constraints: true,
      index: true,
      functions: true,
      rls: true,
      policies: true,
      table_privileges: true,
      data_boundaries: true,
    },
  });
});

test('readback fails closed for a grant or cross-game data regression', () => {
  const proof = fixture();
  proof.functions[2].anon_execute = true;
  proof.data_boundaries.cross_game_member_count = 1;
  const validation = validateMtgSealedMigrationReadbackV1(proof);
  assert.equal(validation.valid, false);
  assert.equal(validation.checks.functions, false);
  assert.equal(validation.checks.data_boundaries, false);
});

test('readback rejects a same-name constraint with altered semantics', () => {
  const proof = fixture();
  proof.constraints[0].definition = 'CHECK (true)';
  const validation = validateMtgSealedMigrationReadbackV1(proof);
  assert.equal(validation.valid, false);
  assert.equal(validation.checks.constraints, false);
});

test('readback rejects non-CRUD destructive grants', () => {
  const proof = fixture();
  proof.table_privileges[0].authenticated_any = true;
  proof.table_privileges[0].service_truncate = true;
  const validation = validateMtgSealedMigrationReadbackV1(proof);
  assert.equal(validation.valid, false);
  assert.equal(validation.checks.table_privileges, false);
});

test('runner exposes read-only migration readback without pending-migration push', () => {
  const workflow = fs.readFileSync('.github/workflows/mtg-sealed-world-runner.yml',
    'utf8');
  const playbook = fs.readFileSync('docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md',
    'utf8');
  assert.match(workflow, /- migration_readback/);
  assert.match(workflow,
    /operation == 'migration_dry_run' \|\| inputs\.operation == 'migration_apply'/);
  assert.match(workflow, /mtg_sealed_migration_readback_v1\.mjs/);
  assert.match(playbook,
    /operation=migration_readback -f expected_sha=<merged-main-sha>/);
  assert.match(playbook, /mtg-sealed-migration-readback\/.*migration_readback\.json/s);
});
