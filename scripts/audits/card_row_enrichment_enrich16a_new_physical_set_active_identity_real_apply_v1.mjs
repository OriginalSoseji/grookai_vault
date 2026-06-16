import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich16a_new_physical_set_active_identity_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich16a_new_physical_set_active_identity_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich16a_new_physical_set_active_identity_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-16A-NEW-PHYSICAL-SET-ACTIVE-IDENTITY-BACKFILL';
const EXPECTED_FINGERPRINT = 'af64f8cbdb4588f47e63e9eaae09cfef42d6869d2878929a842b62b3df2b8a5c';
const EXPECTED_DRY_RUN_PROOF = 'd63bcbc4abdfc3063e7d210fec94e03e02068c6ee96b4d7f88bc2f4650e29a65';
const EXPECTED_TARGET_ROWS = 320;
const TARGET_SET_CODES = ['2023sv', '2024sv', 'me03', 'me04', 'mee', 'mfb'];
const APPROVAL_TEXT = 'Approve real ENRICH-16A-NEW-PHYSICAL-SET-ACTIVE-IDENTITY-BACKFILL apply only. Fingerprint: af64f8cbdb4588f47e63e9eaae09cfef42d6869d2878929a842b62b3df2b8a5c. Scope: 320 active card_print_identity inserts across newly classified English physical sets 2023sv, 2024sv, me03, me04, mee, mfb from public.card_print_identity_backfill_projection_v1. Dry-run proof: d63bcbc4abdfc3063e7d210fec94e03e02068c6ee96b4d7f88bc2f4650e29a65 == d63bcbc4abdfc3063e7d210fec94e03e02068c6ee96b4d7f88bc2f4650e29a65. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

async function loadTargets(client) {
  const result = await client.query(
    `with projected as (
       select
         cp.id::text as card_print_id,
         s.code as set_code,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         public.card_print_identity_backfill_projection_v1(
           s.source,
           cp.set_code,
           s.code,
           cp.number,
           cp.number_plain,
           cp.name,
           cp.variant_key,
           coalesce(cp.printed_total, s.printed_total),
           coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
       from public.card_prints cp
       join public.sets s on s.id = cp.set_id
       where s.code = any($1::text[])
         and s.identity_domain_default = 'pokemon_eng_standard'
         and not exists (
           select 1
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
             and cpi.is_active = true
         )
     )
     select *
     from projected
     order by set_code, number_plain nulls last, number nulls last, card_name nulls last, card_print_id`,
    [TARGET_SET_CODES],
  );
  return result.rows;
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
        ) dup) as batch_duplicate_identity_hash_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        join public.sets s on s.id = cp.set_id
        where s.code <> all($2::text[])
           or s.identity_domain_default is distinct from 'pokemon_eng_standard') as out_of_scope_parent_count`,
    [JSON.stringify(targets), TARGET_SET_CODES],
  );
  return validation.rows[0];
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('before_proof_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('after_proof_mismatch');
  if (dryRun.scope?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeGuard = await validateScope(client, targets);
  let insertedRows = [];
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    await client.query(
      `create temporary table enrich16a_targets (
         card_print_id uuid primary key,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         projected jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich16a_targets
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

    const guard = await validateScope(client, targets);
    if (
      guard.target_count !== EXPECTED_TARGET_ROWS ||
      guard.distinct_target_count !== EXPECTED_TARGET_ROWS ||
      guard.distinct_identity_hash_count !== EXPECTED_TARGET_ROWS ||
      guard.projection_not_ready_count !== 0 ||
      guard.missing_identity_hash_count !== 0 ||
      guard.missing_parent_count !== 0 ||
      guard.target_active_identity_collision_count !== 0 ||
      guard.existing_identity_hash_collision_count !== 0 ||
      guard.batch_duplicate_identity_hash_count !== 0 ||
      guard.out_of_scope_parent_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guard)}`);
    }

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
       from enrich16a_targets target
       returning id::text, card_print_id::text, identity_key_hash`,
    );
    insertedRows = inserted.rows;
    if (inserted.rowCount !== EXPECTED_TARGET_ROWS) {
      throw new Error(`inserted row count mismatch:${inserted.rowCount}`);
    }
    await client.query('commit');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original error.
    }
    throw error;
  }

  const afterGuard = await validateScope(client, targets);
  return {
    before_guard: beforeGuard,
    inserted_rows: insertedRows,
    after_guard: afterGuard,
    proof_hash_sha256: sha256(stableJson({
      package_id: PACKAGE_ID,
      inserted_rows: insertedRows.map((row) => ({
        card_print_id: row.card_print_id,
        identity_key_hash: row.identity_key_hash,
      })),
      after_guard: afterGuard,
    })),
  };
}

function markdown(report) {
  return `# ENRICH-16A New Physical Set Active Identity Real Apply

Generated at: ${report.generated_at}

Package: ${PACKAGE_ID}

## Applied

- Active identity rows inserted: ${report.apply.inserted_rows.length}
- Target sets: ${TARGET_SET_CODES.join(', ')}
- Package fingerprint: \`${EXPECTED_FINGERPRINT}\`
- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF}\`
- Real apply proof: \`${report.apply.proof_hash_sha256}\`

## By Set

${Object.entries(report.by_set).map(([setCode, rows]) => `- ${setCode}: ${rows}`).join('\n')}

## Safety

- parent writes: 0
- child writes: 0
- deletes: 0
- merges: 0
- migrations: 0
- image writes: 0
- global apply: 0
`;
}

const conn = connectionString();
if (!conn) throw new Error('Missing database connection string.');

const dryRun = await readJson(DRY_RUN_JSON);
const dryRunFindings = validateDryRun(dryRun);
if (dryRunFindings.length > 0) {
  throw new Error(`Dry-run validation failed: ${dryRunFindings.join(', ')}`);
}

const client = new Client({ connectionString: conn });
await client.connect();
try {
  const targets = await loadTargets(client);
  if (targets.length !== EXPECTED_TARGET_ROWS) throw new Error(`target_count_drift:${targets.length}`);
  const applied = await applyPackage(client, targets);
  const report = {
    version: 'ENRICH16A_NEW_PHYSICAL_SET_ACTIVE_IDENTITY_REAL_APPLY_V1',
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    db_writes_performed: true,
    migrations_created: false,
    dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
    dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
    approval_text_required: APPROVAL_TEXT,
    by_set: countBy(targets, (row) => row.set_code),
    apply: applied,
    stop_findings: [],
    pass: applied.inserted_rows.length === EXPECTED_TARGET_ROWS,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    package_id: PACKAGE_ID,
    dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
    dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
    inserted_rows: applied.inserted_rows.length,
    proof_hash_sha256: applied.proof_hash_sha256,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, markdown(report));

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    pass: report.pass,
    fingerprint_sha256: report.fingerprint_sha256,
    real_apply_proof_hash_sha256: report.apply.proof_hash_sha256,
    inserted_rows: report.apply.inserted_rows.length,
    stop_findings: report.stop_findings,
  }, null, 2));
} finally {
  await client.end();
}
