import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_no_child_parent_adjudication_v1.json');
const EXCLUDE_STAMPED_FINISH = process.argv.includes('--exclude-stamped-finish');
const OUTPUT_JSON = path.join(
  OUTPUT_DIR,
  EXCLUDE_STAMPED_FINISH
    ? 'enrich06c2_source_mapped_active_finish_child_insert_guarded_dry_run_v1.json'
    : 'enrich06c_source_mapped_child_insert_guarded_dry_run_v1.json',
);
const OUTPUT_MD = path.join(
  OUTPUT_DIR,
  EXCLUDE_STAMPED_FINISH
    ? 'enrich06c2_source_mapped_active_finish_child_insert_guarded_dry_run_v1.md'
    : 'enrich06c_source_mapped_child_insert_guarded_dry_run_v1.md',
);
const PACKAGE_ID = EXCLUDE_STAMPED_FINISH
  ? 'ENRICH-06C2-SOURCE-MAPPED-ACTIVE-FINISH-CHILD-PRINTING-INSERT'
  : 'ENRICH-06C-SOURCE-MAPPED-CHILD-PRINTING-INSERT';
const TARGET_CLASSIFICATION = 'source_mapped_child_insert_candidate_needs_finish_selection';

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

function buildTargets(adjudication) {
  const rows = (adjudication.rows ?? [])
    .filter((row) => row.adjudication_classification === TARGET_CLASSIFICATION);
  return rows.flatMap((row) => (row.master_finish_keys ?? [])
    .filter((finishKey) => !(EXCLUDE_STAMPED_FINISH && finishKey === 'stamped'))
    .map((finishKey) => ({
    card_print_id: row.card_print_id,
    set_code: row.set_code,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
    finish_key: finishKey,
    provenance_source: 'verified_master_index_v1',
    provenance_ref: `${row.set_code}|${row.number}|${row.card_name}|${finishKey}`,
  })));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select distinct card_print_id
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
       null::text as finish_key
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cpr.card_print_id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cpr.finish_key
     from target
     join public.card_printings cpr on cpr.card_print_id = target.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code, number_plain nulls last, number, card_name, finish_key nulls first`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      child_rows: result.rows.filter((row) => row.row_type === 'child').length,
      total_rows: result.rows.length,
    },
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         finish_key text
       )
     ),
     target_parent as (
       select distinct card_print_id from target
     )
     select
       (select count(*)::int from target) as target_printing_count,
       (select count(distinct card_print_id)::int from target) as target_parent_count,
       (select count(distinct card_print_id::text || '|' || finish_key)::int from target) as distinct_target_printing_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target left join public.finish_keys fk on fk.key = target.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_key_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key) as existing_child_finish_count,
       (select count(*)::int from target_parent join public.card_printings cpr on cpr.card_print_id = target_parent.card_print_id) as existing_child_any_count,
       (select count(*)::int from target_parent left join public.external_mappings em on em.card_print_id = target_parent.card_print_id and em.active = true where em.id is null) as missing_active_mapping_parent_count`,
    [JSON.stringify(targets.map((row) => ({
      card_print_id: row.card_print_id,
      finish_key: row.finish_key,
    })))],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, targetPrintingCount, targetParentCount) {
  return guard.target_printing_count === targetPrintingCount
    && guard.target_parent_count === targetParentCount
    && guard.distinct_target_printing_count === targetPrintingCount
    && guard.missing_parent_count === 0
    && guard.inactive_finish_key_count === 0
    && guard.existing_child_finish_count === 0
    && guard.existing_child_any_count === 0
    && guard.missing_active_mapping_parent_count === 0;
}

async function runRollbackDryRun(client, targets) {
  const parentCount = new Set(targets.map((row) => row.card_print_id)).size;
  const beforeSnapshot = await captureSnapshot(client, targets);
  let guard = null;
  let insideProof = null;
  let caughtError = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    guard = await validateScope(client, targets);

    if (guardPassed(guard, targets.length, parentCount)) {
      await client.query(
        `create temporary table enrich06c_targets (
           card_print_id uuid not null,
           finish_key text not null,
           provenance_source text not null,
           provenance_ref text not null,
           primary key (card_print_id, finish_key)
         ) on commit drop`,
      );
      await client.query(
        `insert into enrich06c_targets
         select card_print_id, finish_key, provenance_source, provenance_ref
         from jsonb_to_recordset($1::jsonb) as t(
           card_print_id uuid,
           finish_key text,
           provenance_source text,
           provenance_ref text
         )`,
        [JSON.stringify(targets.map((row) => ({
          card_print_id: row.card_print_id,
          finish_key: row.finish_key,
          provenance_source: row.provenance_source,
          provenance_ref: row.provenance_ref,
        })))],
      );

      const inserted = await client.query(
        `insert into public.card_printings (card_print_id, finish_key, provenance_source, provenance_ref, created_by)
         select card_print_id, finish_key, provenance_source, provenance_ref, $1::text
         from enrich06c_targets
         returning id::text, card_print_id::text, finish_key`,
        [PACKAGE_ID],
      );

      const proof = await client.query(
        `select
           (select count(*)::int from enrich06c_targets) as target_printing_count,
           (select count(*)::int
            from enrich06c_targets target
            join public.card_printings cpr
              on cpr.card_print_id = target.card_print_id
             and cpr.finish_key = target.finish_key) as matching_child_count`,
      );

      insideProof = {
        inserted_child_rows: inserted.rowCount,
        proof: proof.rows[0],
        inserted_samples: inserted.rows.slice(0, 25),
      };
    } else {
      insideProof = {
        inserted_child_rows: 0,
        guard_blocked: true,
        guard,
      };
    }
  } catch (error) {
    caughtError = {
      message: error.message,
      code: error.code ?? null,
      detail: error.detail ?? null,
      constraint: error.constraint ?? null,
    };
  } finally {
    await client.query('rollback');
  }

  const afterRollbackSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    guard,
    inside_transaction_proof: insideProof,
    caught_error: caughtError,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status: caughtError
      ? 'failed_rolled_back_after_error'
      : guard && !guardPassed(guard, targets.length, parentCount)
        ? 'skipped_guard_blocked_rolled_back_no_durable_change'
        : beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256
          ? 'completed_rolled_back_no_durable_change'
          : 'failed_rollback_hash_mismatch',
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const adjudication = await readJson(INPUT_JSON);
  const targets = buildTargets(adjudication);
  const targetParentCount = new Set(targets.map((row) => row.card_print_id)).size;
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    target_classification: TARGET_CLASSIFICATION,
    targets,
  }));

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const execution = await runRollbackDryRun(client, targets);
    const stopFindings = [];
    if (targets.length === 0) stopFindings.push('no_targets');
    if (!execution.guard) stopFindings.push('missing_guard_result');
    if (execution.guard && !guardPassed(execution.guard, targets.length, targetParentCount)) stopFindings.push('guard_blocked');
    if (execution.caught_error) stopFindings.push('transaction_error');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stopFindings.push(execution.dry_run_status);
    if (!execution.caught_error && !execution.inside_transaction_proof?.guard_blocked && execution.inside_transaction_proof?.inserted_child_rows !== targets.length) stopFindings.push('inserted_child_row_count_mismatch');
    if (!execution.caught_error && !execution.inside_transaction_proof?.guard_blocked && execution.inside_transaction_proof?.proof?.matching_child_count !== targets.length) stopFindings.push('matching_child_count_mismatch');

    const report = {
      version: 'ENRICH06C_SOURCE_MAPPED_CHILD_INSERT_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      source_file: INPUT_JSON,
      scope: {
        target_parent_rows: targetParentCount,
        target_child_printing_inserts: targets.length,
        target_classification: TARGET_CLASSIFICATION,
        excluded_finish_keys: EXCLUDE_STAMPED_FINISH ? ['stamped'] : [],
        writes_simulated_then_rolled_back: ['card_printings inserts'],
        durable_db_writes_performed: false,
        migrations_created: false,
        forbidden: ['parent writes', 'identity writes', 'mapping writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      by_finish: countBy(targets, (row) => row.finish_key),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      execution,
      target_samples: targets.slice(0, 50),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
      recommended_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} child card_printing inserts across ${targetParentCount} source-mapped childless parents using Master Index finish keys. Finishes: ${Object.entries(countBy(targets, (row) => row.finish_key)).map(([finish, count]) => `${finish}=${count}`).join(', ')}. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No identity writes. No mapping writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const guardRows = execution.guard ? Object.entries(execution.guard)
      .filter(([key]) => key.endsWith('_count') || key === 'target_printing_count' || key === 'target_parent_count')
      .map(([metric, value]) => ({ metric, value })) : [];
    const md = [
      '# ENRICH-06C Source-Mapped Child Printing Insert Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target parent rows: ${targetParentCount}`,
      `- Target child inserts: ${targets.length}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Inserted inside transaction: ${execution.inside_transaction_proof?.inserted_child_rows ?? 0}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Guard',
      '',
      markdownTable(guardRows, [
        { label: 'metric', value: (row) => row.metric },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## By Finish',
      '',
      markdownTable(Object.entries(report.by_finish).map(([finish, rows]) => ({ finish, rows })), [
        { label: 'finish', value: (row) => row.finish },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Stop Findings',
      '',
      stopFindings.length ? stopFindings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
      '## Approval Text',
      '',
      report.recommended_approval_text ? `\`${report.recommended_approval_text}\`` : '_Not available; dry-run did not pass._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
