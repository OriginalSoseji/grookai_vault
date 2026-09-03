import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  MTG_SEALED_MIGRATION_SHA256_V1,
  MTG_SEALED_MIGRATION_VERSION_V1,
  MTG_SEALED_VISIBILITY_MIGRATION_SHA256_V1,
  MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1,
  validateMtgSealedMigrationReadbackV1,
} from '../../backend/pricing/mtg_sealed_migration_readback_v1.mjs';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRATION_NAME = 'sealed_product_per_game_release_v2';
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations',
  `${MTG_SEALED_MIGRATION_VERSION_V1}_${MIGRATION_NAME}.sql`);
const VISIBILITY_MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations',
  `${MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1}_sealed_product_visibility_boundary_v1.sql`);

function parseArgs(argv) {
  const args = { expectedHeadSha: '', envFile: 'C:\\grookai_vault\\.env.local',
    outDir: path.join(ROOT, 'docs', 'audits', 'pricing', 'mtg_sealed_world_v1',
      'migration_readback_v1') };
  for (const argument of argv) {
    if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha is required');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function repository(args) {
  const value = { branch: git('branch', '--show-current') || '(detached)',
    commit_sha: git('rev-parse', 'HEAD'), tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '' };
  if (value.commit_sha !== args.expectedHeadSha || !value.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean migration readback producer');
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function numericRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value]));
}

async function collectProof(client, migrationFileSha256,
  visibilityMigrationFileSha256) {
  const ledger = (await client.query(`select version,name,
      cardinality(statements)::integer as statement_count
    from supabase_migrations.schema_migrations where version=any($1::text[])
    order by version`, [[MTG_SEALED_MIGRATION_VERSION_V1,
    MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1]])).rows;
  const laterMigrationCount = Number((await client.query(`select count(*)::integer count
    from supabase_migrations.schema_migrations where version>$1`,
  [MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1])).rows[0].count);
  const columns = (await client.query(`select table_name,column_name,data_type,is_nullable
    from information_schema.columns where table_schema='public'
      and column_name='game_key'
      and table_name=any($1::text[]) order by table_name`,
  [['sealed_product_releases', 'sealed_product_release_pointer',
    'sealed_product_game_release_controls']])).rows;
  const constraints = (await client.query(`select relation.relname as table_name,
      constraint_row.conname as constraint_name,
      constraint_row.contype as constraint_type,
      constraint_row.convalidated as validated,
      pg_get_constraintdef(constraint_row.oid,true) as definition
    from pg_constraint constraint_row
    join pg_class relation on relation.oid=constraint_row.conrelid
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public' and constraint_row.conname=any($1::text[])
    order by constraint_row.conname`, [[
    'sealed_product_releases_game_key_check',
    'sealed_product_releases_id_game_unique',
    'sealed_product_release_pointer_game_key_check',
    'sealed_product_release_pointer_pkey',
    'sealed_product_release_pointer_release_game_fk',
    'sealed_product_release_pointer_previous_release_game_fk',
    'sealed_product_game_release_controls_pkey',
    'sealed_product_game_release_controls_game_key_fkey',
    'sealed_product_game_release_controls_release_status_check',
    'sealed_product_game_release_controls_evidence_check',
    'sealed_product_game_release_controls_key_check',
  ]])).rows;
  const indexes = (await client.query(`select index_row.relname as index_name,
      index_state.indisvalid as valid,index_state.indisready as ready,
      pg_get_indexdef(index_state.indexrelid) as definition
    from pg_index index_state
    join pg_class index_row on index_row.oid=index_state.indexrelid
    join pg_namespace namespace on namespace.oid=index_row.relnamespace
    where namespace.nspname='public'
      and index_row.relname='sealed_product_releases_game_state_idx'`)).rows;
  const functions = (await client.query(`select procedure.proname as function_name,
      pg_get_function_identity_arguments(procedure.oid) as identity_arguments,
      procedure.prosecdef as security_definer,procedure.provolatile as volatility,
      coalesce(procedure.proconfig,'{}'::text[]) as search_path,
      exists(select 1
        from aclexplode(coalesce(procedure.proacl,
          acldefault('f',procedure.proowner))) function_acl
        where function_acl.grantee=0 and function_acl.privilege_type='EXECUTE')
        as public_execute,
      has_function_privilege('anon',procedure.oid,'execute') as anon_execute,
      has_function_privilege('authenticated',procedure.oid,'execute')
        as authenticated_execute,
      has_function_privilege('service_role',procedure.oid,'execute')
        as service_role_execute,
      pg_get_functiondef(procedure.oid) as definition
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid=procedure.pronamespace
    where namespace.nspname='public' and procedure.proname=any($1::text[])
    order by procedure.proname`, [[
    'sealed_product_set_active_release_v1',
    'get_active_sealed_product_pricing_v1',
    'get_active_sealed_product_pricing_v2',
    'sealed_product_game_visible_to_request_v1',
  ]])).rows;
  const relations = (await client.query(`select relation.relname as relation_name,
      relation.relrowsecurity as rls_enabled,relation.relforcerowsecurity as rls_forced
    from pg_class relation join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public' and relation.relname=any($1::text[])
    order by relation.relname`,
  [['sealed_product_releases', 'sealed_product_release_pointer',
    'sealed_product_game_release_controls']])).rows;
  const policies = (await client.query(`select tablename as relation_name,
      count(*)::integer as policy_count,
      count(*) filter(where roles::text='{service_role}' and cmd='ALL'
        and qual='true' and with_check='true')::integer as service_role_all_count,
      count(*) filter(where roles::text<>'{service_role}')::integer
        as other_role_policy_count
    from pg_policies where schemaname='public' and tablename=any($1::text[])
    group by tablename order by tablename`,
  [['sealed_product_releases', 'sealed_product_release_pointer',
    'sealed_product_game_release_controls']])).rows.map(numericRow);
  const tablePrivileges = (await client.query(`select table_name,
      has_table_privilege('service_role','public.'||table_name,'select') service_select,
      has_table_privilege('service_role','public.'||table_name,'insert') service_insert,
      has_table_privilege('service_role','public.'||table_name,'update') service_update,
      has_table_privilege('service_role','public.'||table_name,'delete') service_delete,
      has_table_privilege('service_role','public.'||table_name,'truncate')
        service_truncate,
      has_table_privilege('service_role','public.'||table_name,'references')
        service_references,
      has_table_privilege('service_role','public.'||table_name,'trigger') service_trigger,
      exists(select 1 from pg_class relation
        join pg_namespace namespace on namespace.oid=relation.relnamespace
        cross join lateral aclexplode(coalesce(relation.relacl,
          acldefault('r',relation.relowner))) relation_acl
        where namespace.nspname='public' and relation.relname=table_name
          and relation_acl.grantee=0) public_any,
      (has_table_privilege('authenticated','public.'||table_name,'select') or
       has_table_privilege('authenticated','public.'||table_name,'insert') or
       has_table_privilege('authenticated','public.'||table_name,'update') or
       has_table_privilege('authenticated','public.'||table_name,'delete') or
       has_table_privilege('authenticated','public.'||table_name,'truncate') or
       has_table_privilege('authenticated','public.'||table_name,'references') or
       has_table_privilege('authenticated','public.'||table_name,'trigger'))
        authenticated_any,
      (has_table_privilege('anon','public.'||table_name,'select') or
       has_table_privilege('anon','public.'||table_name,'insert') or
       has_table_privilege('anon','public.'||table_name,'update') or
       has_table_privilege('anon','public.'||table_name,'delete') or
       has_table_privilege('anon','public.'||table_name,'truncate') or
       has_table_privilege('anon','public.'||table_name,'references') or
       has_table_privilege('anon','public.'||table_name,'trigger')) anon_any
    from unnest($1::text[]) table_name order by table_name`,
  [['sealed_product_releases', 'sealed_product_release_pointer',
    'sealed_product_game_release_controls']])).rows;
  const dataBoundaries = numericRow((await client.query(`select
      (select count(*) from public.sealed_product_releases) release_count,
      (select count(*) from public.sealed_product_releases where game_key is null)
        release_null_game_count,
      (select count(*) from public.sealed_product_release_pointer) pointer_count,
      (select count(*) from public.sealed_product_release_pointer where game_key is null)
        pointer_null_game_count,
      (select count(*) from public.sealed_product_release_members member
        join public.sealed_product_releases release on release.id=member.release_id
        join public.sealed_product_variants variant on variant.id=member.variant_id
        join public.sealed_product_families family on family.id=variant.family_id
        where family.game_key<>release.game_key) cross_game_member_count,
      (select count(*) from public.sealed_product_release_pointer pointer
        join public.sealed_product_releases release on release.id=pointer.release_id
        where pointer.game_key<>release.game_key) pointer_release_game_mismatch_count,
      (select count(*) from public.sealed_product_release_pointer pointer
        join public.sealed_product_releases release on release.id=pointer.previous_release_id
        where pointer.game_key<>release.game_key) pointer_previous_game_mismatch_count,
      (select count(*) from public.sealed_product_releases where game_key='one_piece')
        one_piece_release_count,
      (select count(*) from public.sealed_product_release_pointer where game_key='one_piece')
        one_piece_pointer_count,
      (select count(*) from public.sealed_product_game_release_controls)
        sealed_control_count,
      (select count(*) from public.sealed_product_releases where game_key='mtg')
        mtg_release_count,
      (select count(*) from public.sealed_product_release_pointer where game_key='mtg')
        mtg_pointer_count,
      (select count(*) from public.get_active_sealed_product_pricing_v2('mtg',null,100,0))
        mtg_visible_rpc_row_count,
      (select release_status from public.catalog_game_release_controls
        where game_code='mtg') mtg_catalog_release_status,
      (select release_status from public.sealed_product_game_release_controls
        where game_key='mtg') mtg_sealed_release_status,
      (select release_status from public.catalog_game_release_controls
        where game_code='one_piece') one_piece_catalog_release_status,
      (select release_status from public.sealed_product_game_release_controls
        where game_key='one_piece') one_piece_sealed_release_status`)).rows[0]);
  return { migration_file_sha256: migrationFileSha256,
    visibility_migration_file_sha256: visibilityMigrationFileSha256, ledger,
    later_migration_count: laterMigrationCount, columns, constraints, indexes,
    functions, relations, policies, table_privileges: tablePrivileges,
    data_boundaries: dataBoundaries };
}

async function writeArtifacts(outDir, files, producer) {
  await fs.mkdir(outDir, { recursive: true });
  const artifacts = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.from(name.endsWith('.json')
      ? `${JSON.stringify(value, null, 2)}\n` : String(value));
    await fs.writeFile(path.join(outDir, name), body);
    artifacts[name] = { bytes: body.length, sha256: sha256(body) };
  }
  const manifest = { hash_algorithm: 'sha256', producer_commit_sha: producer,
    artifacts };
  await fs.writeFile(path.join(outDir, 'artifact_hashes.json'),
    `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const migrationBody = await fs.readFile(MIGRATION_PATH);
  const migrationFileSha256 = sha256(migrationBody);
  if (migrationFileSha256 !== MTG_SEALED_MIGRATION_SHA256_V1) {
    throw new Error('Migration file hash does not match the governed authority');
  }
  const visibilityMigrationBody = await fs.readFile(VISIBILITY_MIGRATION_PATH);
  const visibilityMigrationFileSha256 = sha256(visibilityMigrationBody);
  if (visibilityMigrationFileSha256 !==
      MTG_SEALED_VISIBILITY_MIGRATION_SHA256_V1) {
    throw new Error('Visibility migration hash does not match the governed source');
  }
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is required');
  const client = new Client({ connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 30_000, query_timeout: 120_000,
    statement_timeout: 120_000,
    application_name: 'mtg-sealed-migration-readback-v1' });
  await client.connect();
  let proof;
  try {
    await client.query('begin transaction isolation level repeatable read read only');
    proof = await collectProof(client, migrationFileSha256,
      visibilityMigrationFileSha256);
    await client.query('commit');
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end().catch(() => {});
  }
  const validation = validateMtgSealedMigrationReadbackV1(proof);
  const summary = { status: validation.valid
    ? 'mtg_sealed_migration_readback_passed'
    : 'mtg_sealed_migration_readback_failed', repository: repo,
  migration_version: MTG_SEALED_MIGRATION_VERSION_V1,
  migration_file_sha256: migrationFileSha256,
  visibility_migration_version: MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1,
  visibility_migration_file_sha256: visibilityMigrationFileSha256,
  validation, database_writes: 0 };
  const report = `# MTG Sealed Migration Readback V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer: \`${repo.commit_sha}\`\n` +
    `- Migration: \`${MTG_SEALED_MIGRATION_VERSION_V1}\`\n` +
    `- Database writes: \`0\`\n`;
  await writeArtifacts(args.outDir, {
    'run_plan.json': { operation: 'migration_readback', repository: repo,
      migration_version: MTG_SEALED_MIGRATION_VERSION_V1,
      migration_file_sha256: migrationFileSha256,
      visibility_migration_version: MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1,
      visibility_migration_file_sha256: visibilityMigrationFileSha256,
      transaction: 'repeatable read, read only', database_writes: 0 },
    'migration_readback.json': proof,
    'summary.json': summary,
    'REPORT.md': report,
  }, repo.commit_sha);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!validation.valid) process.exitCode = 1;
}

await main();
