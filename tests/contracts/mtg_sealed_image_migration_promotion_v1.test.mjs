import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import {
  MTG_SEALED_IMAGE_FUNCTIONS_V1,
  MTG_SEALED_IMAGE_INDEXES_V1,
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
  MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
  MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
  MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
  MTG_SEALED_IMAGE_POLICIES_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
  MTG_SEALED_IMAGE_TRIGGERS_V1,
  validateMtgSealedImageMigrationPreflightV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';

const migrationPath = `supabase/migrations/${MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1}`;
const migration = fs.readFileSync(migrationPath, 'utf8');

function validProof() {
  const imageCounts = Object.fromEntries(MTG_SEALED_IMAGE_TABLES_V1.map(
    (tableName) => [`${tableName}_count`, 0]));
  return {
    preflight_version: MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
    local: {
      branch: 'agent/mtg-sealed-image-migration-promotion-v1',
      head_sha: 'a'.repeat(40),
      expected_head_sha: 'a'.repeat(40),
      tracked_worktree_clean: true,
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
    },
    production: {
      migration_ledger_count: 0,
      duplicate_repo_migration_versions: 0,
      guard: {
        transaction_read_only: 'on',
        default_transaction_read_only: 'on',
      },
      missing_prerequisite_relations: [],
      missing_prerequisite_functions: [],
      collisions: {
        relations: [], functions: [], indexes: [], triggers: [], policies: [],
        constraints: [],
      },
      roles: ['anon', 'authenticated', 'service_role'],
      data_boundaries: {
        mtg_price_pointer_count: 1,
        mtg_active_price_release_count: 1,
        mtg_active_price_member_count: 2182,
        mtg_catalog_release_status: 'signed_in',
        mtg_sealed_release_status: 'hidden',
        one_piece_price_pointer_count: 1,
        one_piece_active_price_release_count: 1,
        ...imageCounts,
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

test('combined migration has the frozen identity and one transaction', () => {
  assert.equal(crypto.createHash('sha256').update(migration).digest('hex'),
    MTG_SEALED_IMAGE_MIGRATION_SHA256_V1);
  assert.equal((migration.match(/^begin;$/gim) ?? []).length, 1);
  assert.equal((migration.match(/^commit;$/gim) ?? []).length, 1);
  assert.match(migration, /writes schema and migration-ledger state only/i);
});

test('combined migration promotes every reviewed schema object', () => {
  for (const name of MTG_SEALED_IMAGE_TABLES_V1) {
    assert.match(migration, new RegExp(`create table public\\.${name}\\b`, 'i'));
    assert.match(migration, new RegExp(
      `alter table public\\.${name} force row level security`, 'i'));
  }
  for (const signature of MTG_SEALED_IMAGE_FUNCTIONS_V1) {
    assert.match(migration, new RegExp(signature.split('(')[0], 'i'));
  }
  for (const name of [...MTG_SEALED_IMAGE_INDEXES_V1,
    ...MTG_SEALED_IMAGE_TRIGGERS_V1, ...MTG_SEALED_IMAGE_POLICIES_V1]) {
    assert.match(migration, new RegExp(name, 'i'));
  }
});

test('combined migration grants no client Storage authority', () => {
  assert.match(migration,
    /grant execute on function public\.mtg_sealed_image_object_signing_authorized_v1[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*on storage\.objects/i);
  assert.doesNotMatch(migration, /grant [^;]+ on storage\.objects/i);
});

test('valid read-only preflight passes', () => {
  assert.deepEqual(validateMtgSealedImageMigrationPreflightV1(validProof()), {
    valid: true,
    checks: Object.fromEntries(Object.keys(
      validateMtgSealedImageMigrationPreflightV1(validProof()).checks,
    ).map((key) => [key, true])),
  });
});

test('preflight fails closed on collisions, ledger reuse, or boundary drift', () => {
  const collision = validProof();
  collision.production.collisions.functions.push({
    signature: 'public.mtg_sealed_image_object_signing_authorized_v1(text,text)',
  });
  assert.equal(validateMtgSealedImageMigrationPreflightV1(collision).valid, false);

  const ledger = validProof();
  ledger.production.migration_ledger_count = 1;
  assert.equal(validateMtgSealedImageMigrationPreflightV1(ledger).valid, false);

  const drift = validProof();
  drift.production.after_fingerprint = 'c'.repeat(64);
  assert.equal(validateMtgSealedImageMigrationPreflightV1(drift).valid, false);
});

test('preflight fails closed on visibility or prohibited operation changes', () => {
  const visible = validProof();
  visible.production.data_boundaries.mtg_sealed_release_status = 'signed_in';
  assert.equal(validateMtgSealedImageMigrationPreflightV1(visible).valid, false);

  const write = validProof();
  write.boundaries.database_writes = 1;
  assert.equal(validateMtgSealedImageMigrationPreflightV1(write).valid, false);
});
