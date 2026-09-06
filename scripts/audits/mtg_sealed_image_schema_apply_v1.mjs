import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedImageSchemaApplyPlanV1,
  evaluateMtgSealedImageSchemaReadbackV1,
  MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1,
  MTG_SEALED_IMAGE_SCHEMA_APPLY_VERSION_V1,
  mtgSealedImageSchemaSha256V1,
  stableMtgSealedImageSchemaJsonV1,
  stripSealedMigrationTransactionWrapperV1,
} from '../../backend/pricing/mtg_sealed_image_schema_apply_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations',
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1);
const PREFLIGHT_SCRIPT = path.join(ROOT, 'scripts', 'audits',
  'mtg_sealed_image_migration_preflight_v1.mjs');

function parseArgs(argv) {
  const args = {
    mode: 'plan',
    envFile: DEFAULT_ENV_FILE,
    expectedHeadSha: '',
    expectedPlanFingerprint: '',
    outDir: path.join(ROOT, '.tmp', 'mtg-sealed-image-schema-apply-v1'),
  };
  for (const argument of argv) {
    if (argument === '--plan') args.mode = 'plan';
    else if (argument === '--apply') args.mode = 'apply';
    else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument
        .slice('--expected-plan-fingerprint='.length).trim().toLowerCase();
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  if (args.mode === 'apply' &&
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Apply requires --expected-plan-fingerprint=<SHA-256>');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertLocal(args) {
  const local = {
    branch: git('branch', '--show-current') || '(detached)',
    head_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
  };
  if (local.head_sha !== args.expectedHeadSha || !local.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean execution authority');
  }
  return local;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

async function queryRows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

function numericRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value]));
}

async function captureDataBoundaries(client) {
  const row = (await queryRows(client, `select
    (select count(*)::bigint from public.card_prints)
      as canonical_card_prints_count,
    (select count(*)::bigint from public.sets) as canonical_sets_count,
    (select count(*)::bigint from public.card_print_traits)
      as canonical_card_print_traits_count,
    (select count(*)::bigint
       from public.card_print_traits trait
       left join public.card_prints card on card.id = trait.card_print_id
      where card.id is null) as card_print_traits_orphan_count,
    (select count(*)::bigint from public.sealed_product_families) as families,
    (select count(*)::bigint from public.sealed_product_variants) as variants,
    (select count(*)::bigint from public.sealed_product_candidates) as candidates,
    (select count(*)::bigint from public.sealed_product_candidate_reviews) as reviews,
    (select count(*)::bigint from public.sealed_product_source_mappings) as mappings,
    (select count(*)::bigint from public.sealed_product_variant_evidence) as evidence,
    (select count(*)::bigint from public.sealed_product_pricing_lane_qualifications)
      as qualifications,
    (select count(*)::bigint from public.sealed_product_releases) as releases,
    (select count(*)::bigint from public.sealed_product_release_members)
      as release_members,
    (select count(*)::bigint from public.sealed_product_release_pointer)
      as release_pointers,
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
  const boundary = numericRow(row);
  for (const table of MTG_SEALED_IMAGE_TABLES_V1) {
    const present = (await queryRows(client,
      `select to_regclass($1) is not null as present`, [`public.${table}`]))[0]
      .present;
    boundary[`${table}_count`] = present
      ? Number((await queryRows(client,
        `select count(*)::integer as count from public.${table}`))[0].count)
      : 0;
  }
  return boundary;
}

async function captureReadback(client, plan, {
  transactionClosedBeforeArtifacts = false,
} = {}) {
  const tableNames = plan.inventory.tables;
  const tables = await queryRows(client, `select relation.relname as table_name,
      relation.relrowsecurity as rls_enabled,
      relation.relforcerowsecurity as rls_forced
    from pg_class relation
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public' and relation.relname=any($1::text[])
      and relation.relkind in ('r','p') order by relation.relname`, [tableNames]);
  for (const table of tables) {
    const result = await client.query(
      `select count(*)::integer as row_count from public.${table.table_name}`);
    table.row_count = Number(result.rows[0].row_count);
  }

  const constraintNames = plan.inventory.constraints.map((row) => row.constraint_name);
  const constraints = await queryRows(client, `select relation.relname as table_name,
      constraint_row.conname as constraint_name,
      constraint_row.contype as constraint_type,
      constraint_row.convalidated as validated,
      pg_get_constraintdef(constraint_row.oid,true) as definition
    from pg_constraint constraint_row
    join pg_class relation on relation.oid=constraint_row.conrelid
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public'
      and constraint_row.conname=any($1::text[])
    order by relation.relname,constraint_row.conname`, [constraintNames]);
  const indexNames = plan.inventory.indexes.map((row) => row.index_name);
  const indexes = await queryRows(client, `select table_row.relname as table_name,
      index_row.relname as index_name,index_state.indisvalid as valid,
      index_state.indisready as ready,pg_get_indexdef(index_state.indexrelid) definition
    from pg_index index_state
    join pg_class index_row on index_row.oid=index_state.indexrelid
    join pg_class table_row on table_row.oid=index_state.indrelid
    join pg_namespace namespace on namespace.oid=index_row.relnamespace
    where namespace.nspname='public' and index_row.relname=any($1::text[])
    order by table_row.relname,index_row.relname`, [indexNames]);
  const functionNames = plan.inventory.functions.map((signature) =>
    signature.slice(0, signature.indexOf('(')));
  const functions = await queryRows(client, `select
      procedure.proname || '(' || replace(oidvectortypes(procedure.proargtypes),
        ', ', ',') || ')' as signature,
      procedure.proname as function_name,procedure.prosecdef as security_definer,
      procedure.provolatile as volatility,
      coalesce(procedure.proconfig,array[]::text[]) as configuration,
      pg_get_functiondef(procedure.oid) as definition
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid=procedure.pronamespace
    where namespace.nspname='public' and procedure.proname=any($1::text[])
    order by signature`, [functionNames]);
  const triggers = await queryRows(client, `select relation.relname as table_name,
      trigger.tgname as trigger_name,pg_get_triggerdef(trigger.oid,true) definition
    from pg_trigger trigger
    join pg_class relation on relation.oid=trigger.tgrelid
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public' and trigger.tgname=any($1::text[])
      and not trigger.tgisinternal order by trigger.tgname`,
  [plan.inventory.triggers]);
  const policies = await queryRows(client, `select tablename as table_name,
      policyname as policy_name,permissive,roles::text,cmd as command,
      qual as using_expression,with_check as check_expression
    from pg_policies where schemaname='public' and tablename=any($1::text[])
    order by tablename,policyname`, [tableNames]);
  const tableGrants = await queryRows(client, `select table_name,grantee,
      privilege_type,is_grantable from information_schema.role_table_grants
    where table_schema='public' and table_name=any($1::text[])
      and grantee=any(array['PUBLIC','anon','authenticated','service_role'])
    order by table_name,grantee,privilege_type`, [tableNames]);
  const routineGrants = await queryRows(client, `select routine_name,grantee,
      privilege_type,is_grantable from information_schema.role_routine_grants
    where specific_schema='public' and routine_name=any($1::text[])
      and grantee=any(array['PUBLIC','anon','authenticated','service_role'])
    order by routine_name,grantee,privilege_type`, [functionNames]);
  const appTablePrivileges = await queryRows(client, `select roles.role_name,
      tables.table_name,
      has_table_privilege(roles.role_name,
        'public.'||quote_ident(tables.table_name),
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        as has_any_privilege
    from unnest(array['anon','authenticated']) as roles(role_name)
    cross join unnest($1::text[]) as tables(table_name)
    order by roles.role_name,tables.table_name`, [tableNames]);
  const signingAuthorization = (await queryRows(client, `select
      has_function_privilege('anon',
        'public.mtg_sealed_image_object_signing_authorized_v1(text,text)',
        'execute') as anon_execute,
      has_function_privilege('authenticated',
        'public.mtg_sealed_image_object_signing_authorized_v1(text,text)',
        'execute') as authenticated_execute,
      has_function_privilege('service_role',
        'public.mtg_sealed_image_object_signing_authorized_v1(text,text)',
        'execute') as service_role_execute,
      public.mtg_sealed_image_object_signing_authorized_v1(
        'user-card-images',
        'sealed/mtg/sha256/00/'||repeat('0',64)||'.jpg') as empty_state_result`))[0];
  const migrationLedger = await queryRows(client, `select version,name,
      cardinality(statements)::integer as statement_count,statements
    from supabase_migrations.schema_migrations where version=$1`,
  [plan.migration.version]);
  for (const row of migrationLedger) {
    row.ledger_fingerprint_sha256 = mtgSealedImageSchemaSha256V1(
      stableMtgSealedImageSchemaJsonV1({
        version: row.version,
        name: row.name,
        statements: row.statements,
      }));
    delete row.statements;
  }
  const allMigrationLedger = await queryRows(client,
    `select version,name from supabase_migrations.schema_migrations order by version`);
  const transactionReadOnly = (await client.query('show transaction_read_only'))
    .rows[0].transaction_read_only;
  return {
    transaction_read_only: transactionReadOnly,
    transaction_closed_before_artifacts: transactionClosedBeforeArtifacts,
    tables,
    constraints,
    indexes,
    functions,
    triggers,
    policies,
    table_grants: tableGrants,
    routine_grants: routineGrants,
    app_table_privileges: appTablePrivileges,
    signing_authorization: signingAuthorization,
    migration_ledger: migrationLedger,
    all_migration_ledger: allMigrationLedger,
    data_boundaries: await captureDataBoundaries(client),
  };
}

async function freshReadback(connectionString, plan) {
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: 'mtg-sealed-image-schema-independent-readback-v1',
  });
  await client.connect();
  let readback;
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin read only');
    readback = await captureReadback(client, plan);
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  readback.transaction_closed_before_artifacts = true;
  return readback;
}

async function runFreshPreflight(args) {
  const outDir = path.join(args.outDir,
    `fresh_preflight_${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await fs.mkdir(outDir, { recursive: true });
  execFileSync(process.execPath, [PREFLIGHT_SCRIPT,
    `--expected-head-sha=${args.expectedHeadSha}`,
    `--env-file=${args.envFile}`,
    `--out-dir=${outDir}`], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(await fs.readFile(path.join(outDir, 'preflight.json'), 'utf8'));
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, 'utf8');
  return body;
}

async function writePlanArtifacts(args, plan, local) {
  await fs.mkdir(args.outDir, { recursive: true });
  const planBody = await writeJson(path.join(args.outDir, 'apply_plan.json'), plan);
  const reportBody = `# MTG Sealed Image Schema Apply Plan V1\n\n` +
    `- Status: **READY; NOT AUTHORIZED OR APPLIED**\n` +
    `- Execution commit: \`${local.head_sha}\`\n` +
    `- Migration SHA-256: \`${plan.migration.sha256}\`\n` +
    `- Apply-plan fingerprint: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
    `- Database writes: \`0\`\n\n` +
    `## Required Exact Authority\n\n\`\`\`text\n` +
    `${plan.required_approval_message}\n\`\`\`\n`;
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'), reportBody, 'utf8');
  await writeJson(path.join(args.outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256',
    artifacts: {
      'apply_plan.json': mtgSealedImageSchemaSha256V1(planBody),
      'REPORT.md': mtgSealedImageSchemaSha256V1(reportBody),
    },
  });
}

async function executeApply(args, plan, migrationSql, connectionString, local) {
  if (plan.apply_plan_fingerprint_sha256 !== args.expectedPlanFingerprint) {
    throw new Error('Fresh apply plan does not match the authorized fingerprint');
  }
  if (process.env[MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1] !==
      plan.guard_token) {
    throw new Error(`Exact authority missing from ` +
      MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1);
  }
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: 'mtg-sealed-image-schema-apply-v1',
  });
  await client.connect();
  let inside;
  let committed = false;
  try {
    const immediateBaseline = await captureDataBoundaries(client);
    if (stableMtgSealedImageSchemaJsonV1(immediateBaseline) !==
        stableMtgSealedImageSchemaJsonV1(plan.baseline)) {
      throw new Error('Protected production state changed after fresh preflight');
    }
    const collision = (await queryRows(client, `select
      (select count(*)::integer from pg_class relation
        join pg_namespace namespace on namespace.oid=relation.relnamespace
        where namespace.nspname='public'
          and relation.relname=any($1::text[])) as relation_count,
      (select count(*)::integer from supabase_migrations.schema_migrations
        where version=$2) as ledger_count`,
    [plan.inventory.tables, plan.migration.version]))[0];
    if (Number(collision.relation_count) !== 0 ||
        Number(collision.ledger_count) !== 0) {
      throw new Error('Schema or ledger collision appeared after preflight');
    }

    await client.query('begin');
    try {
      await client.query(`set local lock_timeout='${plan.timeouts.lock_timeout}'`);
      await client.query(
        `set local statement_timeout='${plan.timeouts.statement_timeout}'`);
      await client.query(`set local idle_in_transaction_session_timeout=` +
        `'${plan.timeouts.idle_in_transaction_session_timeout}'`);
      await client.query(stripSealedMigrationTransactionWrapperV1(migrationSql));
      await client.query(`insert into supabase_migrations.schema_migrations
        (version,statements,name) values($1,$2::text[],$3)`, [
        plan.ledger_row.version,
        plan.ledger_row.statements,
        plan.ledger_row.name,
      ]);
      inside = await captureReadback(client, plan);
      const findings = evaluateMtgSealedImageSchemaReadbackV1({
        plan,
        readback: inside,
        requireReadOnly: false,
        requireClosed: false,
      });
      if (findings.length) {
        throw new Error(`Inside-transaction readback failed: ${findings.join(',')}`);
      }
      await client.query('commit');
      committed = true;
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
  if (!committed) throw new Error('Schema transaction did not commit');

  const independent = await freshReadback(connectionString, plan);
  const findings = evaluateMtgSealedImageSchemaReadbackV1({
    plan,
    readback: independent,
  });
  if (findings.length) {
    throw new Error(`Independent readback failed: ${findings.join(',')}`);
  }
  return {
    version: MTG_SEALED_IMAGE_SCHEMA_APPLY_VERSION_V1,
    recorded_at: new Date().toISOString(),
    status: 'schema_only_applied_and_independently_read_back',
    local,
    migration: plan.migration,
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    preflight_fingerprint_sha256: plan.preflight_fingerprint_sha256,
    committed,
    inside_transaction_readback: inside,
    independent_post_apply_readback: independent,
    findings,
    boundaries: {
      migration_ledger_rows_written: 1,
      image_or_release_rows_written: 0,
      storage_operations: 0,
      pricing_operations: 0,
      release_pointer_operations: 0,
      visibility_changes: 0,
      vault_operations: 0,
      signer_deployments: 0,
      client_activations: 0,
    },
  };
}

async function writeExecutionArtifacts(args, result) {
  await fs.mkdir(args.outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(args.outDir, 'summary.json'), result);
  const readbackBody = await writeJson(path.join(args.outDir,
    'independent_post_apply_readback.json'), result.independent_post_apply_readback);
  const reportBody = `# MTG Sealed Image Schema Apply V1\n\n` +
    `- Status: **PASS**\n` +
    `- Execution commit: \`${result.local.head_sha}\`\n` +
    `- Migration SHA-256: \`${result.migration.sha256}\`\n` +
    `- Apply-plan fingerprint: \`${result.apply_plan_fingerprint_sha256}\`\n` +
    `- Migration-ledger rows written: \`1\`\n` +
    `- Image/data/Storage/pricing/visibility/Vault/deployment writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'), reportBody, 'utf8');
  await writeJson(path.join(args.outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256',
    artifacts: {
      'summary.json': mtgSealedImageSchemaSha256V1(summaryBody),
      'independent_post_apply_readback.json':
        mtgSealedImageSchemaSha256V1(readbackBody),
      'REPORT.md': mtgSealedImageSchemaSha256V1(reportBody),
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const local = assertLocal(args);
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error('Production database URL is missing');
  const databaseProjectRef = supabaseProjectRefFromUrlV1(connectionString);
  if (databaseProjectRef !== MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1) {
    throw new Error('Database target is not canonical production');
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const migrationSql = await fs.readFile(MIGRATION_PATH, 'utf8');
  const preflight = await runFreshPreflight(args);
  const plan = buildMtgSealedImageSchemaApplyPlanV1({ migrationSql, preflight });
  if (args.mode === 'plan') {
    await writePlanArtifacts(args, plan, local);
    process.stdout.write(`${JSON.stringify({
      status: 'ready_not_authorized_or_applied',
      execution_commit_sha: local.head_sha,
      migration_sha256: plan.migration.sha256,
      apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
      required_approval_message: plan.required_approval_message,
      output_directory: path.relative(ROOT, args.outDir).replaceAll('\\', '/'),
    }, null, 2)}\n`);
    return;
  }
  const result = await executeApply(
    args, plan, migrationSql, connectionString, local);
  await writeExecutionArtifacts(args, result);
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    execution_commit_sha: local.head_sha,
    migration_sha256: result.migration.sha256,
    apply_plan_fingerprint_sha256: result.apply_plan_fingerprint_sha256,
    output_directory: path.relative(ROOT, args.outDir).replaceAll('\\', '/'),
  }, null, 2)}\n`);
}

await main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
