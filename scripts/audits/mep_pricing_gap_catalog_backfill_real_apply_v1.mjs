import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const PACKAGE_ID = 'MEP-PRICING-GAP-CATALOG-BACKFILL-20261016';
const EXPECTED_FINGERPRINT = 'd11d0f2b4dc62f9806ccc2abb19ddb733889eac0b37a76109d217bb9d50018e3';
const DRY_RUN_JSON = path.join(
  DEFAULT_OUTPUT_DIR,
  'english_master_index_v1',
  'mep_pricing_gap_catalog_backfill_guarded_dry_run_v1.json',
);

function parseArgs(argv) {
  const args = { apply: false, sourceCommit: null, outputDir: path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1') };
  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg.startsWith('--source-commit=')) args.sourceCommit = arg.slice('--source-commit='.length).trim();
    else if (arg.startsWith('--output-dir=')) args.outputDir = path.resolve(arg.slice('--output-dir='.length));
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function clientOptions(conn, applicationName) {
  return {
    connectionString: conn,
    application_name: applicationName,
    ...(process.env.NODE_EXTRA_CA_CERTS ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function validateDryRun(dryRun) {
  const plan = {
    parentRows: dryRun.scope?.parent_rows ?? [],
    identityRows: dryRun.scope?.identity_rows ?? [],
    childRows: dryRun.scope?.child_rows ?? [],
    mappingRows: dryRun.scope?.external_mapping_rows ?? [],
  };
  const calculatedFingerprint = sha256(stableJson({ package_id: PACKAGE_ID, ...plan }));
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('unexpected_frozen_fingerprint');
  if (calculatedFingerprint !== EXPECTED_FINGERPRINT) findings.push('calculated_fingerprint_mismatch');
  if (dryRun.execution?.status !== 'passed_rolled_back') findings.push('dry_run_not_passed');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== dryRun.execution?.after_snapshot?.hash_sha256) findings.push('rollback_snapshot_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.db_writes_performed !== false || dryRun.migrations_created !== false) findings.push('dry_run_safety_flags_invalid');
  if (plan.parentRows.length !== 4 || plan.identityRows.length !== 4 || plan.childRows.length !== 4 || plan.mappingRows.length !== 4) findings.push('scope_not_4_4_4_4');
  if (new Set(plan.parentRows.map((row) => row.card_print_id)).size !== 4) findings.push('parent_ids_not_unique');
  if (new Set(plan.identityRows.map((row) => row.card_print_id)).size !== 4) findings.push('identity_parent_ids_not_unique');
  if (plan.identityRows.some((row) => row.projected?.status !== 'ready' || !row.projected?.identity_key_hash)) findings.push('identity_projection_invalid');
  if (new Set(plan.identityRows.map((row) => row.projected?.identity_key_hash)).size !== 4) findings.push('identity_hashes_not_unique');
  if (new Set(plan.childRows.map((row) => row.card_printing_id)).size !== 4) findings.push('child_ids_not_unique');
  if (new Set(plan.mappingRows.map((row) => `${row.source}:${row.external_id}`)).size !== 4) findings.push('mapping_keys_not_unique');
  if (plan.mappingRows.some((row) => !row.meta?.mapping_method)) findings.push('mapping_method_missing');
  return { findings, calculatedFingerprint, plan };
}

async function captureSnapshot(client, plan) {
  const result = await client.query(
    `with parent_target as (
       select * from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     ), child_target as (
       select * from jsonb_to_recordset($2::jsonb) as t(card_printing_id uuid)
     ), identity_target as (
       select * from jsonb_to_recordset($3::jsonb) as t(card_print_id uuid)
     ), mapping_target as (
       select * from jsonb_to_recordset($4::jsonb) as t(source text, external_id text)
     )
     select 'parent' as row_type, cp.id::text as row_id, cp.set_code,
            cp.number as card_number, cp.name as card_name, cp.gv_id,
            null::text as finish_key, null::text as source, null::text as external_id,
            null::text as identity_domain, null::text as mapping_method
       from parent_target t join public.card_prints cp on cp.id=t.card_print_id
     union all
     select 'child', cpr.id::text, cp.set_code, cp.number, cp.name, cpr.printing_gv_id,
            cpr.finish_key, null::text, null::text, null::text, null::text
       from child_target t join public.card_printings cpr on cpr.id=t.card_printing_id
       join public.card_prints cp on cp.id=cpr.card_print_id
     union all
     select 'identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.gv_id,
            null::text, null::text, null::text, cpi.identity_domain, null::text
       from identity_target t join public.card_print_identity cpi on cpi.card_print_id=t.card_print_id and cpi.is_active=true
       join public.card_prints cp on cp.id=cpi.card_print_id
     union all
     select 'mapping', em.id::text, cp.set_code, cp.number, cp.name, cp.gv_id,
            null::text, em.source, em.external_id, null::text, em.meta->>'mapping_method'
       from mapping_target t join public.external_mappings em on em.source=t.source and em.external_id=t.external_id
       join public.card_prints cp on cp.id=em.card_print_id
     order by row_type,row_id`,
    [JSON.stringify(plan.parentRows), JSON.stringify(plan.childRows), JSON.stringify(plan.identityRows), JSON.stringify(plan.mappingRows)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: {
      parents: result.rows.filter((row) => row.row_type === 'parent').length,
      identities: result.rows.filter((row) => row.row_type === 'identity').length,
      children: result.rows.filter((row) => row.row_type === 'child').length,
      mappings: result.rows.filter((row) => row.row_type === 'mapping').length,
    },
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function applyPackage(conn, plan) {
  const writer = new Client(clientOptions(conn, 'mep_pricing_gap_catalog_backfill_apply_v1'));
  await writer.connect();
  let committed = false;
  let guard = null;
  let writeCounts = { parents: 0, identities: 0, children: 0, mappings: 0 };
  let writerError = null;
  try {
    await writer.query('begin');
    await writer.query("set local lock_timeout = '5s'");
    await writer.query("set local statement_timeout = '120s'");
    await writer.query('select pg_advisory_xact_lock(hashtext($1))', [PACKAGE_ID]);
    const guardResult = await writer.query(
      `with parent_target as (
         select * from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid,live_set_code text,number_plain text,printed_identity_modifier text,card_name text,gv_id text)
       ), child_target as (
         select * from jsonb_to_recordset($2::jsonb) as t(card_printing_id uuid,printing_gv_id text,finish_key text)
       ), identity_target as (
         select * from jsonb_to_recordset($3::jsonb) as t(card_print_id uuid,projected jsonb)
       ), mapping_target as (
         select * from jsonb_to_recordset($4::jsonb) as t(source text,external_id text,meta jsonb)
       )
       select
         (select count(*)::int from parent_target) parent_rows,
         (select count(*)::int from identity_target) identity_rows,
         (select count(*)::int from child_target) child_rows,
         (select count(*)::int from mapping_target) mapping_rows,
         (select count(*)::int from child_target t left join public.finish_keys fk on fk.key=t.finish_key and fk.is_active=true where fk.key is null) inactive_finishes,
         (select count(*)::int from parent_target t join public.card_prints cp on cp.id=t.card_print_id or cp.gv_id=t.gv_id or (
            lower(coalesce(cp.set_code,''))=lower(t.live_set_code)
            and regexp_replace(coalesce(cp.number_plain,cp.number,''),'^0+','')=regexp_replace(t.number_plain,'^0+','')
            and lower(coalesce(cp.printed_identity_modifier,''))=lower(coalesce(t.printed_identity_modifier,'')))) parent_collisions,
         (select count(*)::int from child_target t join public.card_printings cpr on cpr.id=t.card_printing_id or cpr.printing_gv_id=t.printing_gv_id) child_collisions,
         (select count(*)::int from identity_target where projected->>'status' <> 'ready' or nullif(projected->>'identity_key_hash','') is null) invalid_identity_projections,
         (select count(*)::int from identity_target t join public.card_print_identity cpi on cpi.card_print_id=t.card_print_id and cpi.is_active=true) identity_parent_collisions,
         (select count(*)::int from identity_target t join public.card_print_identity cpi on cpi.is_active=true and cpi.identity_domain=t.projected->>'identity_domain' and cpi.identity_key_version=t.projected->>'identity_key_version' and cpi.identity_key_hash=t.projected->>'identity_key_hash') identity_hash_collisions,
         (select count(*)::int from (select projected->>'identity_key_hash' from identity_target group by projected->>'identity_key_hash' having count(*) > 1) duplicate_hash) duplicate_identity_hashes,
         (select count(*)::int from mapping_target where nullif(meta->>'mapping_method','') is null) missing_mapping_methods,
         (select count(*)::int from mapping_target t join public.external_mappings em on em.source=t.source and em.external_id=t.external_id) mapping_collisions`,
      [JSON.stringify(plan.parentRows), JSON.stringify(plan.childRows), JSON.stringify(plan.identityRows), JSON.stringify(plan.mappingRows)],
    );
    guard = guardResult.rows[0];
    if (guard.parent_rows !== 4 || guard.identity_rows !== 4 || guard.child_rows !== 4 || guard.mapping_rows !== 4 || guard.inactive_finishes || guard.parent_collisions || guard.child_collisions || guard.invalid_identity_projections || guard.identity_parent_collisions || guard.identity_hash_collisions || guard.duplicate_identity_hashes || guard.missing_mapping_methods || guard.mapping_collisions) {
      throw new Error(`guard failed: ${JSON.stringify(guard)}`);
    }
    const parents = await writer.query(
      `insert into public.card_prints
         (id,set_id,set_code,number,name,rarity,variant_key,printed_identity_modifier,gv_id,identity_domain,set_identity_model,external_ids,ai_metadata)
       select x.card_print_id::uuid,x.set_id::uuid,x.live_set_code,x.card_number,x.card_name,x.rarity,x.variant_key,
              x.printed_identity_modifier,x.gv_id,'pokemon_eng_standard','standard',x.external_ids,x.ai_metadata
       from jsonb_to_recordset($1::jsonb) as x(
         card_print_id text,set_id text,live_set_code text,card_number text,number_plain text,card_name text,rarity text,
         variant_key text,printed_identity_modifier text,gv_id text,external_ids jsonb,ai_metadata jsonb)`,
      [JSON.stringify(plan.parentRows)],
    );
    const identities = await writer.query(
      `insert into public.card_print_identity (
         card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,
         source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active
       )
       select x.card_print_id::uuid,x.projected->>'identity_domain',x.projected->>'set_code_identity',
              x.projected->>'printed_number',nullif(x.projected->>'normalized_printed_name',''),
              nullif(x.projected->>'source_name_raw',''),coalesce(x.projected->'identity_payload','{}'::jsonb),
              x.projected->>'identity_key_version',x.projected->>'identity_key_hash',true
         from jsonb_to_recordset($1::jsonb) as x(card_print_id text,projected jsonb)`,
      [JSON.stringify(plan.identityRows)],
    );
    const children = await writer.query(
      `insert into public.card_printings
         (id,card_print_id,finish_key,is_provisional,provenance_source,provenance_ref,created_by,printing_gv_id)
       select x.card_printing_id::uuid,x.card_print_id::uuid,x.finish_key,false,x.provenance_source,x.provenance_ref,x.created_by,x.printing_gv_id
       from jsonb_to_recordset($1::jsonb) as x(
         card_printing_id text,card_print_id text,finish_key text,provenance_source text,provenance_ref text,created_by text,printing_gv_id text)`,
      [JSON.stringify(plan.childRows)],
    );
    const mappings = await writer.query(
      `insert into public.external_mappings(source,external_id,card_print_id,meta)
       select x.source,x.external_id,x.card_print_id::uuid,x.meta
       from jsonb_to_recordset($1::jsonb) as x(source text,external_id text,card_print_id text,meta jsonb)`,
      [JSON.stringify(plan.mappingRows)],
    );
    writeCounts = { parents: parents.rowCount, identities: identities.rowCount, children: children.rowCount, mappings: mappings.rowCount };
    if (parents.rowCount !== 4 || identities.rowCount !== 4 || children.rowCount !== 4 || mappings.rowCount !== 4) throw new Error(`insert count mismatch: ${JSON.stringify(writeCounts)}`);
    await writer.query('commit');
    committed = true;
  } catch (error) {
    writerError = error;
    await writer.query('rollback').catch(() => {});
  } finally {
    await writer.end().catch(() => {});
  }

  const reader = new Client(clientOptions(conn, 'mep_pricing_gap_catalog_backfill_readback_v1'));
  await reader.connect();
  try {
    const readback = await captureSnapshot(reader, plan);
    const findings = [];
    if (readback.counts.parents !== 4) findings.push('parent_readback_not_4');
    if (readback.counts.identities !== 4) findings.push('identity_readback_not_4');
    if (readback.counts.children !== 4) findings.push('child_readback_not_4');
    if (readback.counts.mappings !== 4) findings.push('mapping_readback_not_4');
    const readbackConfirmsCommit = findings.length === 0;
    const readbackConfirmsRollback = readback.counts.parents === 0 && readback.counts.identities === 0 && readback.counts.children === 0 && readback.counts.mappings === 0;
    if (writerError && readbackConfirmsCommit) committed = true;
    if (writerError && !readbackConfirmsCommit && !readbackConfirmsRollback) findings.push('writer_error_with_partial_readback');
    if (writerError && readbackConfirmsRollback) findings.push(`writer_failed_rolled_back: ${String(writerError.message ?? writerError)}`);
    return {
      committed,
      commit_confirmation: writerError && readbackConfirmsCommit ? 'independent_readback_after_writer_error' : committed ? 'writer_and_independent_readback' : 'not_committed',
      writer_error: writerError ? String(writerError.message ?? writerError) : null,
      guard,
      write_counts: writeCounts,
      independent_readback: readback,
      stop_findings: findings,
    };
  } finally {
    await reader.end().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = await readJson(DRY_RUN_JSON);
  const validation = validateDryRun(dryRun);
  if (validation.findings.length) throw new Error(`dry-run validation failed: ${validation.findings.join(', ')}`);

  if (!args.apply) {
    console.log(JSON.stringify({ package_id: PACKAGE_ID, status: 'validated_no_write', fingerprint: validation.calculatedFingerprint, scope: { parents: 4, identities: 4, children: 4, mappings: 4 } }, null, 2));
    return;
  }

  if (!/^[0-9a-f]{40}$/i.test(args.sourceCommit ?? '')) throw new Error('--source-commit=<40 hex sha> is required with --apply');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (head !== args.sourceCommit) throw new Error(`source commit mismatch: HEAD ${head}`);
  if (dirty) throw new Error('production apply requires a clean exact-commit checkout');

  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL');
  const execution = await applyPackage(conn, validation.plan);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'mep_pricing_gap_catalog_backfill_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: validation.calculatedFingerprint,
    source_commit_sha: head,
    db_write_committed: execution.committed,
    migrations_created: false,
    dry_run_proof: {
      status: dryRun.execution.status,
      before_hash: dryRun.execution.before_snapshot.hash_sha256,
      after_hash: dryRun.execution.after_snapshot.hash_sha256,
    },
    execution,
  };
  const outputPath = path.join(args.outputDir, 'mep_pricing_gap_catalog_backfill_real_apply_v1.json');
  await writeJson(outputPath, report);
  console.log(JSON.stringify({ output_path: outputPath, ...report }, null, 2));
  if (execution.stop_findings.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
