import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich14a_residual_active_identity_split_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich14a_residual_active_identity_split_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich14a_residual_active_identity_split_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-14A-RESIDUAL-ACTIVE-IDENTITY-SPLIT';
const EXPECTED_FINGERPRINT = '76a33fd99b15249014dca57374ae9c04a4c68045a90e1db51c5616cbc6f52723';
const EXPECTED_DRY_RUN_PROOF = 'c1211710a86b17ebe5ad1db6d6fd8e17908cb939b36eec133dd398d8456b4542';
const NORMAL_PIKACHU_ID = '8277ae6a-03d8-4306-aba4-16ae7e7b4e2b';
const FIRST_EDITION_PIKACHU_ID = 'b82829d7-8deb-4e21-8860-989efe798c70';
const APPROVAL_TEXT = 'Approve real ENRICH-14A-RESIDUAL-ACTIVE-IDENTITY-SPLIT apply only. Fingerprint: 76a33fd99b15249014dca57374ae9c04a4c68045a90e1db51c5616cbc6f52723. Scope: 1 active card_print_identity insert for basep/Wizards Black Star Promos Pikachu #1 normal parent 8277ae6a-03d8-4306-aba4-16ae7e7b4e2b; first-edition modifier row b82829d7-8deb-4e21-8860-989efe798c70 remains blocked pending modifier-aware identity projection. Dry-run proof: c1211710a86b17ebe5ad1db6d6fd8e17908cb939b36eec133dd398d8456b4542 == c1211710a86b17ebe5ad1db6d6fd8e17908cb939b36eec133dd398d8456b4542. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function captureSnapshot(client) {
  const rows = await queryRows(client, `
    select
      'parent' as row_type,
      cp.id::text as row_id,
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.printed_identity_modifier,
      null::text as identity_domain,
      null::text as identity_key_version,
      null::text as identity_key_hash
    from public.card_prints cp
    where cp.id = any($1::uuid[])
    union all
    select
      'active_identity' as row_type,
      cpi.id::text as row_id,
      cpi.card_print_id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.printed_identity_modifier,
      cpi.identity_domain,
      cpi.identity_key_version,
      cpi.identity_key_hash
    from public.card_print_identity cpi
    join public.card_prints cp on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.card_print_id = any($1::uuid[])
    order by row_type, printed_identity_modifier nulls first, card_print_id, row_id
  `, [[NORMAL_PIKACHU_ID, FIRST_EDITION_PIKACHU_ID]]);
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      parent_rows: rows.filter((row) => row.row_type === 'parent').length,
      active_identity_rows: rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: rows.length,
    },
  };
}

async function globalIdentityGuards(client) {
  const rows = await queryRows(client, `
    select
      (select count(*)::int from (
        select identity_domain, identity_key_version, identity_key_hash
        from public.card_print_identity
        where is_active = true
        group by identity_domain, identity_key_version, identity_key_hash
        having count(*) > 1
      ) dupes) as active_identity_duplicate_groups,
      (select count(*)::int from public.card_print_identity where card_print_id = $1::uuid and is_active = true) as normal_active_identity_rows,
      (select count(*)::int from public.card_print_identity where card_print_id = $2::uuid and is_active = true) as first_edition_active_identity_rows
  `, [NORMAL_PIKACHU_ID, FIRST_EDITION_PIKACHU_ID]);
  return rows[0];
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.scope?.dry_run_target_rows !== 1) findings.push('target_row_count_mismatch');
  if (dryRun.scope?.blocked_rows !== 1) findings.push('blocked_row_count_mismatch');
  if (dryRun.scope?.target_card_print_id !== NORMAL_PIKACHU_ID) findings.push('target_card_print_id_mismatch');
  if (dryRun.scope?.blocked_card_print_ids?.[0] !== FIRST_EDITION_PIKACHU_ID) findings.push('blocked_card_print_id_mismatch');
  if (dryRun.dry_run?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('before_proof_mismatch');
  if (dryRun.dry_run?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('after_proof_mismatch');
  if (dryRun.dry_run?.rollback_restored_original_state !== true) findings.push('rollback_not_proven');
  if (dryRun.dry_run?.transaction_changed_target_state !== true) findings.push('transaction_not_proven');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.required_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  return findings;
}

function targetRow(dryRun) {
  return (dryRun.candidate_rows ?? []).find((row) => row.card_print_id === NORMAL_PIKACHU_ID);
}

async function applyPackage(client, dryRun) {
  const target = targetRow(dryRun);
  if (!target?.projected || target.projected.status !== 'ready') {
    throw new Error('Target projection is not ready.');
  }

  const beforeSnapshot = await captureSnapshot(client);
  const beforeGuards = await globalIdentityGuards(client);
  let insertedRows = [];

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const projected = target.projected;
    const guardRows = await queryRows(client, `
      select
        (select count(*)::int from public.card_prints where id = $1::uuid) as target_parent_count,
        (select count(*)::int from public.card_print_identity where card_print_id = $1::uuid and is_active = true) as target_active_identity_count,
        (select count(*)::int from public.card_print_identity where card_print_id = $2::uuid and is_active = true) as blocked_active_identity_count,
        (select count(*)::int
         from public.card_print_identity
         where is_active = true
           and identity_domain = $3
           and identity_key_version = $4
           and identity_key_hash = $5) as projected_hash_collision_count
    `, [
      NORMAL_PIKACHU_ID,
      FIRST_EDITION_PIKACHU_ID,
      projected.identity_domain,
      projected.identity_key_version,
      projected.identity_key_hash,
    ]);
    const guard = guardRows[0];
    if (
      guard.target_parent_count !== 1
      || guard.target_active_identity_count !== 0
      || guard.blocked_active_identity_count !== 0
      || guard.projected_hash_collision_count !== 0
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify(guard)}`);
    }

    insertedRows = await queryRows(client, `
      insert into public.card_print_identity (
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
      ) values (
        $1::uuid,
        $2,
        $3,
        $4,
        nullif($5, ''),
        nullif($6, ''),
        $7::jsonb,
        $8,
        $9,
        true
      )
      returning id::text, card_print_id::text, identity_domain, identity_key_version, identity_key_hash
    `, [
      NORMAL_PIKACHU_ID,
      projected.identity_domain,
      projected.set_code_identity,
      projected.printed_number,
      projected.normalized_printed_name,
      projected.source_name_raw,
      JSON.stringify(projected.identity_payload ?? {}),
      projected.identity_key_version,
      projected.identity_key_hash,
    ]);

    await client.query('commit');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ignore rollback failures so the original error is preserved.
    }
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client);
  const afterGuards = await globalIdentityGuards(client);

  return {
    before_snapshot: beforeSnapshot,
    before_guards: beforeGuards,
    inserted_rows: insertedRows,
    after_snapshot: afterSnapshot,
    after_guards: afterGuards,
  };
}

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replaceAll('|', '\\|')).join(' | ')} |`),
  ].join('\n');
}

const conn = connectionString();
if (!conn) throw new Error('Missing database connection string.');

const dryRun = await readJson(DRY_RUN_JSON);
const validationFindings = validateDryRun(dryRun);
if (validationFindings.length) {
  throw new Error(`ENRICH-14A dry-run validation failed: ${validationFindings.join(', ')}`);
}

const client = new Client({ connectionString: conn });
await client.connect();

let execution;
try {
  execution = await applyPackage(client, dryRun);
} finally {
  await client.end();
}

const stopFindings = [];
if (execution.inserted_rows.length !== 1) stopFindings.push('insert_count_mismatch');
if (execution.after_guards.active_identity_duplicate_groups !== 0) stopFindings.push('active_identity_duplicate_groups_after_apply');
if (execution.after_guards.normal_active_identity_rows !== 1) stopFindings.push('normal_active_identity_count_after_apply_mismatch');
if (execution.after_guards.first_edition_active_identity_rows !== 0) stopFindings.push('blocked_first_edition_identity_was_written');

const reportCore = {
  version: 'ENRICH_14A_RESIDUAL_ACTIVE_IDENTITY_SPLIT_REAL_APPLY_V1',
  package_id: PACKAGE_ID,
  approved_text: APPROVAL_TEXT,
  package_fingerprint_sha256: EXPECTED_FINGERPRINT,
  db_writes_performed: true,
  migrations_created: false,
  cleanup_performed: false,
  image_writes_performed: false,
  global_apply_performed: false,
  scope: {
    active_identity_inserts: 1,
    target_card_print_id: NORMAL_PIKACHU_ID,
    blocked_card_print_id: FIRST_EDITION_PIKACHU_ID,
  },
  execution,
  stop_findings: stopFindings,
};

const report = {
  ...reportCore,
  generated_at: new Date().toISOString(),
  proof_hash_sha256: sha256(stableJson(reportCore)),
  pass: stopFindings.length === 0,
};

const md = `# ENRICH-14A Residual Active Identity Split Real Apply V1

Generated: ${report.generated_at}

## Summary

- Active identity inserts: ${report.scope.active_identity_inserts}
- Target card print: \`${report.scope.target_card_print_id}\`
- Blocked first-edition card print preserved: \`${report.scope.blocked_card_print_id}\`
- Pass: ${report.pass}
- Proof hash: \`${report.proof_hash_sha256}\`
- DB writes performed: true
- Migrations created: false
- Parent writes: false
- Child writes: false
- Deletes: false
- Image writes: false

## Inserted Rows

${table(report.execution.inserted_rows, [
  { label: 'id', value: (row) => row.id },
  { label: 'card_print_id', value: (row) => row.card_print_id },
  { label: 'identity_domain', value: (row) => row.identity_domain },
  { label: 'identity_key_version', value: (row) => row.identity_key_version },
  { label: 'identity_key_hash', value: (row) => row.identity_key_hash },
])}

## Guards After

\`\`\`json
${JSON.stringify(report.execution.after_guards, null, 2)}
\`\`\`

## Stop Findings

${report.stop_findings.length === 0 ? 'None.' : report.stop_findings.map((finding) => `- ${finding}`).join('\n')}
`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  pass: report.pass,
  proof_hash_sha256: report.proof_hash_sha256,
  inserted_rows: report.execution.inserted_rows.length,
  after_guards: report.execution.after_guards,
  stop_findings: report.stop_findings,
}, null, 2));

if (!report.pass) process.exitCode = 1;
