import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  MTG_SEALED_IMAGE_FUNCTIONS_V1,
  MTG_SEALED_IMAGE_INDEXES_V1,
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
  MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
  MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
  MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
  MTG_SEALED_IMAGE_POLICIES_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
  MTG_SEALED_IMAGE_TRIGGERS_V1,
  reconcileMigrationLedgerVersionsV1,
  supabaseProjectRefFromUrlV1,
  validateMtgSealedImageMigrationPreflightV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';

const migrationPath = `supabase/migrations/${MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1}`;
const migration = fs.readFileSync(migrationPath, 'utf8');
const preflightScript = fs.readFileSync(
  'scripts/audits/mtg_sealed_image_migration_preflight_v1.mjs',
  'utf8',
);

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
    },
    production: {
      migration_ledger_count: 0,
      migration_ledger_present: true,
      migration_ledger_reconciliation: {
        repository_version_count: 3,
        expected_remote_version_count: 2,
        remote_version_count: 2,
        missing_repository_versions_on_remote: [],
        unexpected_remote_versions: [],
        pending_repository_versions: [MTG_SEALED_IMAGE_MIGRATION_VERSION_V1],
        duplicate_remote_versions: [],
        expected_remote_versions: ['20251223', '20260214'],
        remote_versions: ['20251223', '20260214'],
      },
      duplicate_repo_migration_versions: 0,
      api_project_ref: MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
      database_project_ref: MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
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
        canonical_card_prints_count: 40000,
        canonical_sets_count: 150,
        canonical_card_print_traits_count: 5000,
        card_print_traits_orphan_count: 0,
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

test('eligible image evidence fails closed when required fields are null', () => {
  assert.match(migration,
    /sealed_product_image_evidence_eligible_fields_check[\s\S]*or coalesce\(\([\s\S]*selected_source_role is not null[\s\S]*http_status between 200 and 299[\s\S]*\), false\)/i);
});

test('image object path is canonically bound to game, hash, and MIME', () => {
  assert.match(migration,
    /object_path ~ '\^sealed\/\[a-z0-9_\]\+\/sha256\//i);
  assert.match(migration,
    /and object_path = 'sealed\/' \|\| game_key \|\| '\/sha256\/'[\s\S]*left\(content_sha256, 2\)[\s\S]*content_sha256[\s\S]*case image_mime[\s\S]*when 'image\/jpeg' then '\.jpg'[\s\S]*when 'image\/png' then '\.png'[\s\S]*when 'image\/gif' then '\.gif'[\s\S]*when 'image\/webp' then '\.webp'/i);
});

test('member insertion locks the parent release against concurrent freeze', () => {
  assert.match(migration,
    /sealed_product_guard_image_release_member_insert_v1[\s\S]*from public\.sealed_product_image_releases image_release[\s\S]*for share[\s\S]*image release does not exist for member insertion/i);
});

test('image evidence source identity is bound to its selected mapping', () => {
  assert.match(migration,
    /sealed_product_source_mappings_image_evidence_binding_unique[\s\S]*id, variant_id, source_provider, source_category_id, source_group_id,[\s\S]*source_product_id/i);
  assert.match(migration,
    /sealed_product_image_evidence_mapping_fk foreign key \([\s\S]*source_mapping_id, variant_id, source_provider, source_category_id,[\s\S]*source_group_id, source_product_id[\s\S]*references public\.sealed_product_source_mappings \([\s\S]*id, variant_id, source_provider, source_category_id, source_group_id,[\s\S]*source_product_id/i);
});

test('image release members use evidence from the declared coverage audit', () => {
  assert.match(migration,
    /evidence\.source_plan_fingerprint = image_release\.source_plan_fingerprint/i);
  assert.match(migration,
    /evidence\.coverage_fingerprint = image_release\.coverage_fingerprint/i);
});

test('image release activation is bound to the active price release', () => {
  assert.match(migration,
    /lock table public\.sealed_product_release_pointer in share mode[\s\S]*select price_pointer\.release_id into v_current_price_release_id[\s\S]*for share/i);
  assert.match(migration,
    /v_current_price_release_id is distinct from v_release\.source_price_release_id[\s\S]*target image release is not bound to the active price release/i);
});

test('migration ledger reconciliation requires one exact pending target', () => {
  const target = MTG_SEALED_IMAGE_MIGRATION_VERSION_V1;
  const clean = reconcileMigrationLedgerVersionsV1(
    ['20251223', '20260214', target],
    [{ version: '20251223' }, { version: '20260214' }],
  );
  assert.deepEqual(clean.pending_repository_versions, [target]);
  assert.deepEqual(clean.missing_repository_versions_on_remote, []);
  assert.deepEqual(clean.unexpected_remote_versions, []);

  const drift = reconcileMigrationLedgerVersionsV1(
    ['20251223', '20260214', target],
    [{ version: '20251223' }, { version: '20250101' }],
  );
  assert.deepEqual(drift.missing_repository_versions_on_remote, ['20260214']);
  assert.deepEqual(drift.unexpected_remote_versions, ['20250101']);
});

test('valid read-only preflight passes', () => {
  assert.deepEqual(validateMtgSealedImageMigrationPreflightV1(validProof()), {
    valid: true,
    checks: Object.fromEntries(Object.keys(
      validateMtgSealedImageMigrationPreflightV1(validProof()).checks,
    ).map((key) => [key, true])),
  });
});

test('project identity resolves direct API, direct DB, and pooler URLs', () => {
  const ref = MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1;
  assert.equal(supabaseProjectRefFromUrlV1(`https://${ref}.supabase.co`), ref);
  assert.equal(supabaseProjectRefFromUrlV1(
    `postgresql://postgres:secret@db.${ref}.supabase.co:5432/postgres`,
  ), ref);
  assert.equal(supabaseProjectRefFromUrlV1(
    `postgresql://postgres.${ref}:secret@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  ), ref);
  assert.equal(supabaseProjectRefFromUrlV1('postgresql://localhost/postgres'), null);
});

test('preflight is commit-bound but can run from main or detached HEAD', () => {
  const main = validProof();
  main.local.branch = 'main';
  assert.equal(validateMtgSealedImageMigrationPreflightV1(main).valid, true);

  const detached = validProof();
  detached.local.branch = '';
  assert.equal(validateMtgSealedImageMigrationPreflightV1(detached).valid, true);
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

  const missingLedger = validProof();
  missingLedger.production.migration_ledger_present = false;
  assert.equal(
    validateMtgSealedImageMigrationPreflightV1(missingLedger).valid,
    false,
  );

  const ledgerVersionDrift = validProof();
  ledgerVersionDrift.production.migration_ledger_reconciliation
    .unexpected_remote_versions.push('20250101');
  assert.equal(
    validateMtgSealedImageMigrationPreflightV1(ledgerVersionDrift).valid,
    false,
  );

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

test('preflight fails closed on environment identity or canonical-count drift', () => {
  const wrongProject = validProof();
  wrongProject.production.database_project_ref = 'z'.repeat(20);
  assert.equal(validateMtgSealedImageMigrationPreflightV1(wrongProject).valid, false);

  const immatureCanon = validProof();
  immatureCanon.production.data_boundaries.canonical_card_prints_count = 39999;
  assert.equal(validateMtgSealedImageMigrationPreflightV1(immatureCanon).valid, false);

  const orphanedTraits = validProof();
  orphanedTraits.production.data_boundaries.card_print_traits_orphan_count = 1;
  assert.equal(validateMtgSealedImageMigrationPreflightV1(orphanedTraits).valid, false);
});

test('production boundary snapshot uses the deployed sealed table names', () => {
  assert.match(preflightScript, /public\.sealed_product_candidates/);
  assert.match(preflightScript, /public\.sealed_product_variant_evidence/);
  assert.doesNotMatch(preflightScript, /sealed_product_source_candidates/);
  assert.doesNotMatch(preflightScript, /sealed_product_source_evidence/);
  assert.match(preflightScript, /SUPABASE_CONFIG_PATH/);
  assert.match(preflightScript, /'supabase', 'config\.toml'/);
  assert.match(preflightScript, /\\d\{8\}/);
  assert.match(preflightScript, /repository_migration_versions/);
});
