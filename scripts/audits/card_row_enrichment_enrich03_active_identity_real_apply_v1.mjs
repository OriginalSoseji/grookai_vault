import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SOURCE_JSON = path.join(OUTPUT_DIR, 'active_identity_backfill_candidates_v1.json');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich03_active_identity_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich03_active_identity_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich03_active_identity_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-03-ACTIVE-IDENTITY-BACKFILL';
const EXPECTED_FINGERPRINT = '84858ac245e12abeb8f8d69ef3d5800af59398fff658ff3b00c8c9e7b69a567e';
const EXPECTED_DRY_RUN_PROOF = '2d5698d3e6ef178d2bb26f681daf97571e4e46d01b413931314f408022b1c858';
const EXPECTED_TARGET_ROWS = 11468;
const APPROVAL_TEXT = 'Approve real ENRICH-03-ACTIVE-IDENTITY-BACKFILL apply only. Fingerprint: 84858ac245e12abeb8f8d69ef3d5800af59398fff658ff3b00c8c9e7b69a567e. Scope: 11468 active card_print_identity inserts from public.card_print_identity_backfill_projection_v1. Dry-run proof: 2d5698d3e6ef178d2bb26f681daf97571e4e46d01b413931314f408022b1c858 == 2d5698d3e6ef178d2bb26f681daf97571e4e46d01b413931314f408022b1c858. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.classification === 'ready_for_active_identity_backfill_dry_run')
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      projected: row.projected,
    }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       null::text as identity_domain,
       null::text as identity_key_version,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'active_identity' as row_type,
       cpi.id::text as row_id,
       cpi.card_print_id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cpi.identity_domain,
       cpi.identity_key_version,
       cpi.identity_key_hash
     from target
     join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, card_name nulls last, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      active_identity_rows: result.rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: result.rows.length,
    },
  };
}

async function validateScope(client, targets) {
  const validation = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         projected jsonb
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(distinct projected->>'identity_key_hash')::int from target) as distinct_identity_hash_count,
       (select count(*)::int from target where projected->>'status' <> 'ready') as projection_not_ready_count,
       (select count(*)::int from target where nullif(projected->>'identity_key_hash', '') is null) as missing_identity_hash_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as target_active_identity_collision_count,
       (select count(*)::int
        from target
        join public.card_print_identity cpi
          on cpi.is_active = true
         and cpi.identity_domain = target.projected->>'identity_domain'
         and cpi.identity_key_version = target.projected->>'identity_key_version'
         and cpi.identity_key_hash = target.projected->>'identity_key_hash') as existing_identity_hash_collision_count,
       (select count(*)::int from (
          select projected->>'identity_key_hash' as identity_key_hash
          from target
          group by projected->>'identity_key_hash'
          having count(*) > 1
        ) dup) as batch_duplicate_identity_hash_count`,
    [JSON.stringify(targets)],
  );

  return {
    ...validation.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.scope?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let insertProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");

    const preflight = await validateScope(client, targets);
    if (
      preflight.target_count !== targets.length ||
      preflight.distinct_target_count !== targets.length ||
      preflight.distinct_identity_hash_count !== targets.length ||
      preflight.projection_not_ready_count !== 0 ||
      preflight.missing_identity_hash_count !== 0 ||
      preflight.missing_parent_count !== 0 ||
      preflight.target_active_identity_collision_count !== 0 ||
      preflight.existing_identity_hash_collision_count !== 0 ||
      preflight.batch_duplicate_identity_hash_count !== 0
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify(preflight)}`);
    }

    await client.query(
      `create temporary table enrich03_targets (
         card_print_id uuid primary key,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         projected jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich03_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         projected jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const inserted = await client.query(
      `insert into public.card_print_identity (
         card_print_id,
         identity_domain,
         set_code_identity,
         printed_number,
         normalized_printed_name,
         source_name_raw,
         identity_payload,
         identity_key_version,
         identity_key_hash,
         is_active
       )
       select
         target.card_print_id,
         target.projected->>'identity_domain',
         target.projected->>'set_code_identity',
         target.projected->>'printed_number',
         nullif(target.projected->>'normalized_printed_name', ''),
         nullif(target.projected->>'source_name_raw', ''),
         coalesce(target.projected->'identity_payload', '{}'::jsonb),
         target.projected->>'identity_key_version',
         target.projected->>'identity_key_hash',
         true
       from enrich03_targets target
       returning card_print_id::text, identity_key_hash`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich03_targets) as target_count,
         (select count(*)::int
          from enrich03_targets target
          join public.card_print_identity cpi
            on cpi.card_print_id = target.card_print_id
           and cpi.is_active = true
           and cpi.identity_key_hash = target.projected->>'identity_key_hash') as matching_active_identity_count,
         (select count(*)::int from (
            select identity_domain, identity_key_version, identity_key_hash
            from public.card_print_identity
            where is_active = true
            group by identity_domain, identity_key_version, identity_key_hash
            having count(*) > 1
            limit 1
          ) dup) as duplicate_active_identity_hash_exists`,
    );

    insertProof = {
      inserted_rows: inserted.rowCount,
      proof: proof.rows[0],
    };

    if (insertProof.inserted_rows !== targets.length) throw new Error('inserted_row_count_mismatch');
    if (insertProof.proof.matching_active_identity_count !== targets.length) throw new Error('matching_active_identity_count_mismatch');
    if (insertProof.proof.duplicate_active_identity_hash_exists !== 0) throw new Error('duplicate_active_identity_hash_after_insert');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    insert_proof: insertProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const source = await readJson(SOURCE_JSON);
  const dryRun = await readJson(DRY_RUN_JSON);
  const targets = buildTargets(source);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint_basis: source.fingerprint_basis,
    projection_function: source.projection_function,
    targets,
  }));

  const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
  if (dryRunFindings.length > 0) {
    throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
  }
  if (APPROVAL_TEXT !== dryRun.recommended_approval_text) {
    throw new Error('APPROVAL_TEXT_MISMATCH');
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const execution = await applyPackage(client, targets);
    const stopFindings = [];

    if (targets.length !== EXPECTED_TARGET_ROWS) stopFindings.push(`target_count_drift:${targets.length}`);
    if (execution.before_snapshot.counts.active_identity_rows !== 0) stopFindings.push('before_active_identity_rows_not_zero');
    if (execution.insert_proof.inserted_rows !== targets.length) stopFindings.push('inserted_rows_mismatch');
    if (execution.insert_proof.proof.matching_active_identity_count !== targets.length) stopFindings.push('matching_active_identity_count_mismatch');
    if (execution.insert_proof.proof.duplicate_active_identity_hash_exists !== 0) stopFindings.push('duplicate_active_identity_hash_after_apply');
    if (execution.after_snapshot.counts.active_identity_rows !== targets.length) stopFindings.push('after_active_identity_rows_mismatch');

    const report = {
      version: 'ENRICH03_ACTIVE_IDENTITY_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      approved_text: APPROVAL_TEXT,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
      source_candidate_file: SOURCE_JSON,
      dry_run_file: DRY_RUN_JSON,
      scope: {
        target_rows: targets.length,
        writes_performed: ['card_print_identity inserts'],
        forbidden: ['parent writes', 'child writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        migrations_created: false,
      },
      execution,
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-03 Active Identity Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Inserted rows: ${execution.insert_proof.inserted_rows}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
      `- Before active identity rows: ${execution.before_snapshot.counts.active_identity_rows}`,
      `- After active identity rows: ${execution.after_snapshot.counts.active_identity_rows}`,
      '',
      '## Safety',
      '',
      '- Parent writes: false',
      '- Child writes: false',
      '- Deletes/merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '- Global apply: false',
      '',
      '## By Set',
      '',
      markdownTable(Object.entries(report.by_set_top_25).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      inserted_rows: execution.insert_proof.inserted_rows,
      after_active_identity_rows: execution.after_snapshot.counts.active_identity_rows,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
