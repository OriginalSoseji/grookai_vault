import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import {
  MTG_SEALED_IMAGE_AUTH_CANDIDATE_SHA256_V1,
  MTG_SEALED_IMAGE_FUNCTIONS_V1,
  MTG_SEALED_IMAGE_INDEXES_V1,
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
  MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
  MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
  MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
  MTG_SEALED_IMAGE_POLICIES_V1,
  MTG_SEALED_IMAGE_PREREQUISITE_FUNCTIONS_V1,
  MTG_SEALED_IMAGE_PREREQUISITE_RELATIONS_V1,
  MTG_SEALED_IMAGE_SCHEMA_CANDIDATE_SHA256_V1,
  MTG_SEALED_SIGNER_CONFIG_SHA256_V1,
  MTG_SEALED_SIGNER_INDEX_SHA256_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
  MTG_SEALED_IMAGE_TRIGGERS_V1,
  validateMtgSealedImageMigrationPreflightV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './japanese_master_index_v4/read_only_guard_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations',
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1);
const IMAGE_SCHEMA_CANDIDATE_PATH = path.join(ROOT, 'docs', 'sql',
  'mtg_sealed_image_evidence_and_release_v1_migration_candidate.sql');
const IMAGE_AUTH_CANDIDATE_PATH = path.join(ROOT, 'docs', 'sql',
  'mtg_sealed_authenticated_image_read_v1_migration_candidate.sql');
const SIGNER_INDEX_PATH = path.join(ROOT, 'supabase', 'functions',
  'mtg-sealed-sign-image-v1', 'index.ts');
const SIGNER_CONFIG_PATH = path.join(ROOT, 'supabase', 'functions',
  'mtg-sealed-sign-image-v1', 'config.toml');

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  const args = {
    expectedHeadSha: '',
    envFile: DEFAULT_ENV_FILE,
    outDir: path.join(ROOT, '.tmp', 'mtg-sealed-image-migration-preflight-v1'),
  };
  for (const argument of argv) {
    if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

async function localProof(args) {
  const migrationFiles = (await fs.readdir(path.join(ROOT, 'supabase', 'migrations')))
    .filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort();
  const versions = migrationFiles.map((name) => name.slice(0, 14));
  const duplicateVersions = [...new Set(versions.filter((version, index) =>
    versions.indexOf(version) !== index))];
  const [
    migrationBytes,
    imageSchemaCandidateBytes,
    imageAuthCandidateBytes,
    signerIndexBytes,
    signerConfigBytes,
  ] = await Promise.all([
    fs.readFile(MIGRATION_PATH),
    fs.readFile(IMAGE_SCHEMA_CANDIDATE_PATH),
    fs.readFile(IMAGE_AUTH_CANDIDATE_PATH),
    fs.readFile(SIGNER_INDEX_PATH),
    fs.readFile(SIGNER_CONFIG_PATH),
  ]);
  const proof = {
    branch: git('branch', '--show-current'),
    head_sha: git('rev-parse', 'HEAD'),
    expected_head_sha: args.expectedHeadSha,
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
    migration_version: MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
    migration_filename: MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
    migration_path: relative(MIGRATION_PATH),
    migration_sha256: sha256(migrationBytes),
    image_schema_candidate_sha256: sha256(imageSchemaCandidateBytes),
    image_auth_candidate_sha256: sha256(imageAuthCandidateBytes),
    signer_index_sha256: sha256(signerIndexBytes),
    signer_config_sha256: sha256(signerConfigBytes),
    duplicate_repo_migration_versions: duplicateVersions.length,
    latest_repo_migration_version: versions.at(-1) ?? null,
    expected_hashes: {
      migration: MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
      image_schema_candidate: MTG_SEALED_IMAGE_SCHEMA_CANDIDATE_SHA256_V1,
      image_auth_candidate: MTG_SEALED_IMAGE_AUTH_CANDIDATE_SHA256_V1,
      signer_index: MTG_SEALED_SIGNER_INDEX_SHA256_V1,
      signer_config: MTG_SEALED_SIGNER_CONFIG_SHA256_V1,
    },
  };
  if (
    proof.branch !== 'agent/mtg-sealed-image-migration-promotion-v1' ||
    proof.head_sha !== proof.expected_head_sha ||
    !proof.tracked_worktree_clean ||
    proof.duplicate_repo_migration_versions !== 0 ||
    proof.migration_sha256 !== MTG_SEALED_IMAGE_MIGRATION_SHA256_V1 ||
    proof.image_schema_candidate_sha256 !==
      MTG_SEALED_IMAGE_SCHEMA_CANDIDATE_SHA256_V1 ||
    proof.image_auth_candidate_sha256 !==
      MTG_SEALED_IMAGE_AUTH_CANDIDATE_SHA256_V1 ||
    proof.signer_index_sha256 !== MTG_SEALED_SIGNER_INDEX_SHA256_V1 ||
    proof.signer_config_sha256 !== MTG_SEALED_SIGNER_CONFIG_SHA256_V1
  ) {
    throw new Error('Local migration package identity or repository state drifted');
  }
  return proof;
}

async function queryRows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

async function captureRoles(client) {
  const rows = await queryRows(client,
    `select rolname from pg_roles
      where rolname = any($1::text[]) order by rolname`,
    [['anon', 'authenticated', 'service_role']]);
  return rows.map((row) => row.rolname);
}

async function capturePrerequisites(client) {
  const relations = await queryRows(client,
    `select expected.name,
            to_regclass('public.' || expected.name) is not null as present
       from unnest($1::text[]) expected(name)
      order by expected.name`,
    [MTG_SEALED_IMAGE_PREREQUISITE_RELATIONS_V1]);
  const functions = await queryRows(client,
    `select expected.signature,
            to_regprocedure('public.' || expected.signature) is not null as present
       from unnest($1::text[]) expected(signature)
      order by expected.signature`,
    [MTG_SEALED_IMAGE_PREREQUISITE_FUNCTIONS_V1]);
  return {
    missing_prerequisite_relations:
      relations.filter((row) => !row.present).map((row) => row.name),
    missing_prerequisite_functions:
      functions.filter((row) => !row.present).map((row) => row.signature),
    relations,
    functions,
  };
}

async function captureCollisions(client) {
  const functionNames = [...new Set(MTG_SEALED_IMAGE_FUNCTIONS_V1.map((value) =>
    value.slice(0, value.indexOf('('))))];
  const relations = await queryRows(client,
    `select c.relname as name, c.relkind
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = any($1::text[])
      order by c.relname`, [MTG_SEALED_IMAGE_TABLES_V1]);
  const functions = await queryRows(client,
    `select p.oid::regprocedure::text as signature
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = any($1::text[])
      order by signature`, [functionNames]);
  const indexes = await queryRows(client,
    `select c.relname as name
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'i'
        and c.relname = any($1::text[]) order by c.relname`,
    [MTG_SEALED_IMAGE_INDEXES_V1]);
  const triggers = await queryRows(client,
    `select t.tgname as name
       from pg_trigger t where not t.tgisinternal
        and t.tgname = any($1::text[]) order by t.tgname`,
    [MTG_SEALED_IMAGE_TRIGGERS_V1]);
  const policies = await queryRows(client,
    `select policyname as name, schemaname, tablename
       from pg_policies where policyname = any($1::text[])
      order by policyname`, [MTG_SEALED_IMAGE_POLICIES_V1]);
  const constraints = await queryRows(client,
    `select conname as name, conrelid::regclass::text as relation
       from pg_constraint
      where conname = 'sealed_product_release_members_image_binding_unique'`,
  );
  return { relations, functions, indexes, triggers, policies, constraints };
}

async function captureMigrationLedger(client) {
  const presence = (await queryRows(client,
    `select to_regclass('supabase_migrations.schema_migrations')
      is not null as present`))[0];
  if (!presence.present) return { present: false, rows: [], count: 0 };
  const rows = await queryRows(client,
    `select version, name
       from supabase_migrations.schema_migrations
      where version = $1 order by version`, [MTG_SEALED_IMAGE_MIGRATION_VERSION_V1]);
  return { present: true, rows, count: rows.length };
}

async function captureDataBoundary(client) {
  const row = (await queryRows(client, `select
    (select count(*)::bigint from public.sealed_product_families) as families,
    (select count(*)::bigint from public.sealed_product_variants) as variants,
    (select count(*)::bigint from public.sealed_product_candidates) as candidates,
    (select count(*)::bigint from public.sealed_product_candidate_reviews) as reviews,
    (select count(*)::bigint from public.sealed_product_source_mappings) as mappings,
    (select count(*)::bigint from public.sealed_product_variant_evidence) as evidence,
    (select count(*)::bigint from public.sealed_product_pricing_lane_qualifications)
      as qualifications,
    (select count(*)::bigint from public.sealed_product_releases) as releases,
    (select count(*)::bigint from public.sealed_product_release_members) as release_members,
    (select count(*)::bigint from public.sealed_product_release_pointer) as release_pointers,
    (select count(*)::bigint from public.sealed_product_game_release_controls)
      as release_controls,
    (select count(*)::bigint from public.sealed_product_release_pointer
      where game_key = 'mtg') as mtg_price_pointer_count,
    (select count(*)::bigint
       from public.sealed_product_release_pointer pointer
       join public.sealed_product_releases release
         on release.id = pointer.release_id
        and release.game_key = pointer.game_key
        and release.release_state = 'frozen'
      where pointer.game_key = 'mtg') as mtg_active_price_release_count,
    (select count(*)::bigint
       from public.sealed_product_release_pointer pointer
       join public.sealed_product_release_members member
         on member.release_id = pointer.release_id
      where pointer.game_key = 'mtg') as mtg_active_price_member_count,
    (select release_status from public.catalog_game_release_controls
      where game_code = 'mtg') as mtg_catalog_release_status,
    (select release_status from public.sealed_product_game_release_controls
      where game_key = 'mtg') as mtg_sealed_release_status,
    (select count(*)::bigint from public.sealed_product_release_pointer
      where game_key = 'one_piece') as one_piece_price_pointer_count,
    (select count(*)::bigint
       from public.sealed_product_release_pointer pointer
       join public.sealed_product_releases release
         on release.id = pointer.release_id
        and release.game_key = pointer.game_key
        and release.release_state = 'frozen'
      where pointer.game_key = 'one_piece') as one_piece_active_price_release_count`))[0];
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value]));
}

function applyPlan(local, production) {
  return {
    version: 'MTG_SEALED_IMAGE_MIGRATION_APPLY_PLAN_V1',
    status: 'not_authorized',
    producer_commit_sha: local.head_sha,
    migration: {
      version: local.migration_version,
      filename: local.migration_filename,
      sha256: local.migration_sha256,
    },
    preconditions: {
      migration_ledger_count: production.migration_ledger_count,
      missing_prerequisite_relations: production.missing_prerequisite_relations,
      missing_prerequisite_functions: production.missing_prerequisite_functions,
      collisions: production.collisions,
      before_fingerprint: production.before_fingerprint,
      after_fingerprint: production.after_fingerprint,
    },
    future_authority_limit: {
      migration_ledger_rows: 1,
      schema_only: true,
      tables_created: MTG_SEALED_IMAGE_TABLES_V1.length,
      image_or_release_rows: 0,
      storage_operations: 0,
      pricing_operations: 0,
      visibility_changes: 0,
      vault_operations: 0,
      client_activation: 0,
    },
  };
}

function signerPlan(local) {
  return {
    version: 'MTG_SEALED_TRUSTED_SIGNER_DEPLOYMENT_PLAN_V1',
    status: 'not_authorized',
    producer_commit_sha: local.head_sha,
    function_name: 'mtg-sealed-sign-image-v1',
    source_sha256: local.signer_index_sha256,
    config_sha256: local.signer_config_sha256,
    authentication: 'manual_jwt_validation_then_authenticated_rpc',
    signing: 'service_role_exact_object_after_authorization',
    signed_url_ttl_seconds: 3600,
    direct_client_storage_select: false,
    anonymous_access: false,
    deployed_by_this_gate: false,
  };
}

function report(summary) {
  const c = summary.validation.checks;
  return `# MTG Sealed Image Migration Promotion Preflight V1

- Status: **${summary.status}**
- Producer commit: \`${summary.repository.head_sha}\`
- Migration: \`${summary.repository.migration_filename}\`
- Migration SHA-256: \`${summary.repository.migration_sha256}\`
- Environment key: \`${summary.production.guard.environment_key_sha256}\`

## Proof

- Read-only session and transaction: ${c.read_only ? 'PASS' : 'FAIL'}
- Migration-ledger absence: ${c.migration_history ? 'PASS' : 'FAIL'}
- Prerequisites: ${c.prerequisites ? 'PASS' : 'FAIL'}
- Object collisions: ${c.collisions ? 'PASS' : 'FAIL'}
- MTG price authority: ${c.mtg_price_authority ? 'PASS' : 'FAIL'}
- Visibility unchanged: ${c.visibility_unchanged ? 'PASS' : 'FAIL'}
- One Piece unchanged: ${c.cross_game_unchanged ? 'PASS' : 'FAIL'}
- Before/after reconciliation: ${c.boundary_reconciliation ? 'PASS' : 'FAIL'}
- Prohibited operations: ${c.prohibited_activity ? 'PASS' : 'FAIL'}

## Boundary

This preflight made no database, Storage, pricing, release, visibility, Vault,
deployment, or client-activation write. The migration and signer remain
unapplied and undeployed. A separate exact authority is required.
`;
}

async function writeArtifacts(args, proof) {
  await fs.mkdir(args.outDir, { recursive: true });
  const validation = validateMtgSealedImageMigrationPreflightV1(proof);
  const summary = {
    version: 'MTG_SEALED_IMAGE_MIGRATION_PROMOTION_SUMMARY_V1',
    generated_at: new Date().toISOString(),
    status: validation.valid ? 'PASS' : 'FAIL',
    repository: proof.local,
    production: proof.production,
    boundaries: proof.boundaries,
    validation,
  };
  const artifacts = {
    'preflight.json': stableJson(proof),
    'summary.json': stableJson(summary),
    'migration_apply_plan.json': stableJson(
      applyPlan(proof.local, proof.production)),
    'signer_deployment_plan.json': stableJson(signerPlan(proof.local)),
    'MTG_SEALED_IMAGE_MIGRATION_PROMOTION_PREFLIGHT_V1.md': report(summary),
  };
  for (const [name, bytes] of Object.entries(artifacts)) {
    await fs.writeFile(path.join(args.outDir, name), bytes);
  }
  const hashes = {
    version: 'MTG_SEALED_IMAGE_MIGRATION_PROMOTION_ARTIFACT_HASHES_V1',
    artifacts: Object.fromEntries(Object.entries(artifacts).map(([name, bytes]) =>
      [name, { bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) }])),
  };
  await fs.writeFile(path.join(args.outDir, 'artifact_hashes.json'),
    stableJson(hashes));
  return { summary, hashes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  dotenv.config({ path: args.envFile, override: false });
  const local = await localProof(args);
  const url = databaseUrl();
  if (!url) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL');

  const databaseProof = await withReadOnlyClient({
    connectionString: url,
    environmentLabel: 'production-mtg-sealed-image-migration-preflight-v1',
  }, async (client, guard) => {
    const before = await captureDataBoundary(client);
    const [
      roles,
      prerequisites,
      collisions,
      ledger,
    ] = await Promise.all([
      captureRoles(client),
      capturePrerequisites(client),
      captureCollisions(client),
      captureMigrationLedger(client),
    ]);
    const after = await captureDataBoundary(client);
    const beforeFingerprint = sha256(stableJson(before));
    const afterFingerprint = sha256(stableJson(after));
    const imageCounts = Object.fromEntries(MTG_SEALED_IMAGE_TABLES_V1.map(
      (table) => [`${table}_count`,
        collisions.relations.some((row) => row.name === table) ? -1 : 0]));
    return {
      guard,
      roles,
      ...prerequisites,
      collisions,
      migration_ledger_present: ledger.present,
      migration_ledger_rows: ledger.rows,
      migration_ledger_count: ledger.count,
      duplicate_repo_migration_versions: local.duplicate_repo_migration_versions,
      data_boundaries: { ...before, ...imageCounts },
      before_fingerprint: beforeFingerprint,
      after_fingerprint: afterFingerprint,
    };
  });

  const proof = {
    preflight_version: MTG_SEALED_IMAGE_MIGRATION_PREFLIGHT_VERSION_V1,
    local,
    production: databaseProof,
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
  const { summary } = await writeArtifacts(args, proof);
  process.stdout.write(stableJson({
    status: summary.status,
    output_directory: relative(args.outDir),
    migration_sha256: local.migration_sha256,
    validation: summary.validation,
  }));
  if (!summary.validation.valid) process.exitCode = 1;
}

await main();
