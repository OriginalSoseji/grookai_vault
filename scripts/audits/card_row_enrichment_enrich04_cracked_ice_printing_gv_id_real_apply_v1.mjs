import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SOURCE_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_residual_blocker_audit_v1.json');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich04_cracked_ice_printing_gv_id_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich04_cracked_ice_printing_gv_id_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich04_cracked_ice_printing_gv_id_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-04-CRACKED-ICE-PRINTING-GV-ID-SUFFIX';
const GOVERNED_SUFFIX = 'CRACKED-ICE';
const EXPECTED_FINGERPRINT = '5d6f8cbe955c4ca31029e440ffff4f2ff521d0ebabfe6c8ab4ffcb664f5734f3';
const EXPECTED_SOURCE_FINGERPRINT = '64164d552ee9017471466b9e3dd378f17048d7d31bc3f39f6c1cf61bdb6e5f65';
const EXPECTED_DRY_RUN_PROOF = '44c149f3dab5ab44142ec68e660e8917d370a1eca372590c60aa048d87a480e8';
const EXPECTED_TARGET_ROWS = 131;
const APPROVAL_TEXT = 'Approve real ENRICH-04-CRACKED-ICE-PRINTING-GV-ID-SUFFIX apply only. Fingerprint: 5d6f8cbe955c4ca31029e440ffff4f2ff521d0ebabfe6c8ab4ffcb664f5734f3. Scope: 131 cracked_ice child card_printing printing_gv_id updates using governed suffix CRACKED-ICE. Dry-run proof: 44c149f3dab5ab44142ec68e660e8917d370a1eca372590c60aa048d87a480e8 == 44c149f3dab5ab44142ec68e660e8917d370a1eca372590c60aa048d87a480e8. No parent writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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
  return (source.child_printing_gv_blockers?.cracked_ice_suffix_governance_rows ?? [])
    .map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      finish_key: row.finish_key,
      parent_gv_id: row.parent_gv_id,
      proposed_printing_gv_id: `${row.parent_gv_id}-${GOVERNED_SUFFIX}`,
    }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_printing_id uuid)
     )
     select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.gv_id as parent_gv_id,
       cpr.finish_key,
       cpr.printing_gv_id
     from target
     join public.card_printings cpr on cpr.id = target.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cpr.id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      captured_rows: result.rows.length,
      rows_with_printing_gv_id: result.rows.filter((row) => row.printing_gv_id).length,
      rows_without_printing_gv_id: result.rows.filter((row) => !row.printing_gv_id).length,
      cracked_ice_rows: result.rows.filter((row) => row.finish_key === 'cracked_ice').length,
    },
  };
}

async function validateScope(client, targets) {
  const validation = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         finish_key text,
         parent_gv_id text,
         proposed_printing_gv_id text
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_printing_id)::int from target) as distinct_target_count,
       (select count(distinct proposed_printing_gv_id)::int from target) as distinct_proposed_printing_gv_count,
       (select count(*)::int from target where finish_key <> 'cracked_ice') as non_cracked_ice_count,
       (select count(*)::int from target where parent_gv_id is null or btrim(parent_gv_id) = '') as missing_parent_gv_id_count,
       (select count(*)::int from target where proposed_printing_gv_id is null or btrim(proposed_printing_gv_id) = '') as missing_proposed_printing_gv_count,
       (select count(*)::int from target left join public.card_printings cpr on cpr.id = target.card_printing_id where cpr.id is null) as missing_child_count,
       (select count(*)::int
        from target
        join public.card_printings cpr on cpr.id = target.card_printing_id
        join public.card_prints cp on cp.id = cpr.card_print_id
        where cpr.card_print_id <> target.card_print_id
           or cp.set_code is distinct from target.set_code
           or cp.number is distinct from target.number
           or cp.number_plain is distinct from target.number_plain
           or cp.name is distinct from target.card_name
           or cp.gv_id is distinct from target.parent_gv_id
           or cpr.finish_key is distinct from target.finish_key) as target_identity_drift_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.id = target.card_printing_id where cpr.printing_gv_id is not null) as target_already_has_printing_gv_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.printing_gv_id = target.proposed_printing_gv_id and cpr.id <> target.card_printing_id) as existing_printing_gv_collision_count,
       (select count(*)::int from (
          select proposed_printing_gv_id
          from target
          group by proposed_printing_gv_id
          having count(*) > 1
        ) dup) as batch_duplicate_printing_gv_count`,
    [JSON.stringify(targets)],
  );

  return {
    ...validation.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function validateDryRun(dryRun, packageFingerprint, source) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.source_fingerprint !== EXPECTED_SOURCE_FINGERPRINT) findings.push('dry_run_source_fingerprint_mismatch');
  if (source.fingerprint_sha256 !== EXPECTED_SOURCE_FINGERPRINT) findings.push('source_fingerprint_mismatch');
  if (dryRun.scope?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.governed_suffix !== GOVERNED_SUFFIX) findings.push('governed_suffix_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let updateProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const preflight = await validateScope(client, targets);
    if (
      preflight.target_count !== targets.length ||
      preflight.distinct_target_count !== targets.length ||
      preflight.distinct_proposed_printing_gv_count !== targets.length ||
      preflight.non_cracked_ice_count !== 0 ||
      preflight.missing_parent_gv_id_count !== 0 ||
      preflight.missing_proposed_printing_gv_count !== 0 ||
      preflight.missing_child_count !== 0 ||
      preflight.target_identity_drift_count !== 0 ||
      preflight.target_already_has_printing_gv_count !== 0 ||
      preflight.existing_printing_gv_collision_count !== 0 ||
      preflight.batch_duplicate_printing_gv_count !== 0
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify(preflight)}`);
    }

    await client.query(
      `create temporary table enrich04_targets (
         card_printing_id uuid primary key,
         card_print_id uuid,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         finish_key text,
         parent_gv_id text,
         proposed_printing_gv_id text not null
       ) on commit drop`,
    );

    await client.query(
      `insert into enrich04_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         finish_key text,
         parent_gv_id text,
         proposed_printing_gv_id text
       )`,
      [JSON.stringify(targets)],
    );

    const updated = await client.query(
      `update public.card_printings cpr
       set printing_gv_id = target.proposed_printing_gv_id
       from enrich04_targets target
       where cpr.id = target.card_printing_id
       returning cpr.id::text as card_printing_id, cpr.printing_gv_id`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich04_targets) as target_count,
         (select count(*)::int
          from enrich04_targets target
          join public.card_printings cpr on cpr.id = target.card_printing_id
          where cpr.printing_gv_id = target.proposed_printing_gv_id) as matching_printing_gv_count,
         (select count(*)::int
          from enrich04_targets target
          join public.card_printings cpr on cpr.id = target.card_printing_id
          where cpr.finish_key = 'cracked_ice') as cracked_ice_target_count,
         (select count(*)::int from (
            select printing_gv_id
            from public.card_printings
            where printing_gv_id is not null
            group by printing_gv_id
            having count(*) > 1
            limit 1
          ) dup) as duplicate_printing_gv_id_exists`,
    );

    updateProof = {
      updated_rows: updated.rowCount,
      proof: proof.rows[0],
    };

    if (updateProof.updated_rows !== targets.length) throw new Error('updated_row_count_mismatch');
    if (updateProof.proof.matching_printing_gv_count !== targets.length) throw new Error('matching_printing_gv_count_mismatch');
    if (updateProof.proof.cracked_ice_target_count !== targets.length) throw new Error('cracked_ice_target_count_mismatch');
    if (updateProof.proof.duplicate_printing_gv_id_exists !== 0) throw new Error('duplicate_printing_gv_id_after_update');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    update_proof: updateProof,
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
    source_fingerprint: source.fingerprint_sha256,
    governed_suffix: GOVERNED_SUFFIX,
    targets,
  }));

  const dryRunFindings = validateDryRun(dryRun, packageFingerprint, source);
  if (dryRunFindings.length > 0) {
    throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const execution = await applyPackage(client, targets);
    const stopFindings = [];

    if (targets.length !== EXPECTED_TARGET_ROWS) stopFindings.push(`target_count_drift:${targets.length}`);
    if (execution.before_snapshot.counts.captured_rows !== targets.length) stopFindings.push('before_captured_rows_mismatch');
    if (execution.before_snapshot.counts.rows_without_printing_gv_id !== targets.length) stopFindings.push('before_rows_without_printing_gv_id_mismatch');
    if (execution.before_snapshot.counts.cracked_ice_rows !== targets.length) stopFindings.push('before_cracked_ice_rows_mismatch');
    if (execution.update_proof.updated_rows !== targets.length) stopFindings.push('updated_rows_mismatch');
    if (execution.update_proof.proof.matching_printing_gv_count !== targets.length) stopFindings.push('matching_printing_gv_count_mismatch');
    if (execution.update_proof.proof.cracked_ice_target_count !== targets.length) stopFindings.push('cracked_ice_target_count_mismatch');
    if (execution.update_proof.proof.duplicate_printing_gv_id_exists !== 0) stopFindings.push('duplicate_printing_gv_id_after_apply');
    if (execution.after_snapshot.counts.captured_rows !== targets.length) stopFindings.push('after_captured_rows_mismatch');
    if (execution.after_snapshot.counts.rows_with_printing_gv_id !== targets.length) stopFindings.push('after_rows_with_printing_gv_id_mismatch');
    if (execution.after_snapshot.counts.rows_without_printing_gv_id !== 0) stopFindings.push('after_rows_without_printing_gv_id_not_zero');
    if (execution.after_snapshot.counts.cracked_ice_rows !== targets.length) stopFindings.push('after_cracked_ice_rows_mismatch');

    const report = {
      version: 'ENRICH04_CRACKED_ICE_PRINTING_GV_ID_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      approved_text: APPROVAL_TEXT,
      package_fingerprint_sha256: packageFingerprint,
      source_fingerprint: source.fingerprint_sha256,
      governed_suffix: GOVERNED_SUFFIX,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
      source_file: SOURCE_JSON,
      dry_run_file: DRY_RUN_JSON,
      scope: {
        target_rows: targets.length,
        writes_performed: ['card_printings.printing_gv_id'],
        durable_db_writes_performed: true,
        parent_writes: false,
        identity_writes: false,
        deletes: false,
        merges: false,
        migrations_created: false,
        image_writes: false,
        global_apply: false,
      },
      execution,
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-04 Cracked Ice Printing GV-ID Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Updated rows: ${execution.update_proof.updated_rows}`,
      `- Governed suffix: \`${GOVERNED_SUFFIX}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
      `- Before rows without printing_gv_id: ${execution.before_snapshot.counts.rows_without_printing_gv_id}`,
      `- After rows with printing_gv_id: ${execution.after_snapshot.counts.rows_with_printing_gv_id}`,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: true',
      '- Writes performed: `card_printings.printing_gv_id` only',
      '- Parent writes: false',
      '- Identity writes: false',
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
      updated_rows: execution.update_proof.updated_rows,
      after_rows_with_printing_gv_id: execution.after_snapshot.counts.rows_with_printing_gv_id,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
