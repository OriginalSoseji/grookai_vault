import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const execFileAsync = promisify(execFile);
const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const DRY_RUN_SCRIPT = path.join(ROOT, 'scripts', 'audits', 'self_hosted_images_wh20a_priority_child_pointer_dry_run.mjs');
const DRY_RUN_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh20a_priority_child_pointer_dry_run_summary_v1.json');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh20a_priority_child_pointer_plan_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh20b_priority_child_pointer_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh20b_priority_child_pointer_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-20B-PRIORITY-CHILD-POINTER-APPLY';
const APPROVED_FINGERPRINT = '5289d8a570ab8f235f8f5fe5e72dcc0a44f7f3d564d50ea842c47318fb8179f3';
const APPROVED_PLAN_HASH = '3f63896c0a4439e1f992d9749c4e8bd7b37ec424bff96c44bb970a434417385d';
const APPROVED_SQL_HASH = '571fa148cbd92ec88df84dfbf56e98e843f2d86e9e9cd925b1cc81a54b48f028';
const APPROVED_ROW_COUNT = 50;

const APPLY_SQL_TEMPLATE = `
with updates(id, image_source, image_path, image_status, image_note) as (
  values %VALUES%
)
update public.card_printings cpg
set
  image_source = updates.image_source,
  image_path = updates.image_path,
  image_status = updates.image_status,
  image_note = updates.image_note
from updates
where cpg.id = updates.id::uuid
  and cpg.image_url is null
  and cpg.image_alt_url is null
  and (
    cpg.image_source is distinct from updates.image_source
    or cpg.image_path is distinct from updates.image_path
    or cpg.image_status is distinct from updates.image_status
    or cpg.image_note is distinct from updates.image_note
  );
`.trim();

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = clean(fn(row)) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 30) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function applySqlForPlans(plans) {
  const values = plans.map((plan) => `(
    ${sqlLiteral(plan.target_row_id)}::uuid,
    ${sqlLiteral(plan.proposed_values.image_source)},
    ${sqlLiteral(plan.proposed_values.image_path)},
    ${sqlLiteral(plan.proposed_values.image_status)},
    ${sqlLiteral(plan.proposed_values.image_note)}
  )`);
  return APPLY_SQL_TEMPLATE.replace('%VALUES%', values.join(',\n'));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readPlans() {
  const text = await fs.readFile(PLAN_JSONL, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

async function fetchPostApplyRows(client, plans) {
  const ids = plans.map((plan) => plan.target_row_id);
  const result = await client.query(`
    select
      cpg.id::text as target_row_id,
      cpg.printing_gv_id,
      cpg.finish_key,
      cpg.image_source,
      cpg.image_path,
      cpg.image_url,
      cpg.image_alt_url,
      cpg.image_status,
      cpg.image_note,
      cp.gv_id as parent_gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.variant_key,
      cp.printed_identity_modifier
    from public.card_printings cpg
    join public.card_prints cp on cp.id = cpg.card_print_id
    where cpg.id = any($1::uuid[])
    order by cp.set_code, cp.number_plain nulls last, cp.number, cp.gv_id, cpg.finish_key
  `, [ids]);
  return result.rows;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  await execFileAsync(process.execPath, [DRY_RUN_SCRIPT], { cwd: ROOT, maxBuffer: 20 * 1024 * 1024 });
  const dryRunSummary = await readJson(DRY_RUN_SUMMARY_JSON);
  const plans = await readPlans();
  const applySql = applySqlForPlans(plans);
  const sqlHash = sha256Hex(applySql);

  assertEqual(dryRunSummary.fingerprint, APPROVED_FINGERPRINT, 'fingerprint');
  assertEqual(dryRunSummary.plan_hash, APPROVED_PLAN_HASH, 'plan_hash');
  assertEqual(dryRunSummary.sql_hash, APPROVED_SQL_HASH, 'dry_run_sql_hash');
  assertEqual(sqlHash, APPROVED_SQL_HASH, 'apply_sql_hash');
  assertEqual(plans.length, APPROVED_ROW_COUNT, 'plan row count');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let updateRowCount = 0;
  let postApplyRows = [];
  try {
    await client.query('begin');
    const updateResult = await client.query(applySql);
    updateRowCount = updateResult.rowCount;
    postApplyRows = await fetchPostApplyRows(client, plans);

    const mismatches = [];
    const proposedById = new Map(plans.map((plan) => [plan.target_row_id, plan.proposed_values]));
    for (const row of postApplyRows) {
      const proposed = proposedById.get(row.target_row_id);
      if (!proposed) {
        mismatches.push({ target_row_id: row.target_row_id, issue: 'unexpected_post_apply_row' });
        continue;
      }
      for (const column of ['image_source', 'image_path', 'image_status', 'image_note']) {
        if ((row[column] ?? null) !== (proposed[column] ?? null)) {
          mismatches.push({
            target_row_id: row.target_row_id,
            printing_gv_id: row.printing_gv_id,
            column,
            expected: proposed[column] ?? null,
            actual: row[column] ?? null,
          });
        }
      }
      if (row.image_url !== null || row.image_alt_url !== null) {
        mismatches.push({
          target_row_id: row.target_row_id,
          printing_gv_id: row.printing_gv_id,
          issue: 'runtime_public_url_field_changed_or_present',
          image_url: row.image_url,
          image_alt_url: row.image_alt_url,
        });
      }
    }
    if (mismatches.length) {
      throw new Error(`Post-apply verification failed: ${JSON.stringify(mismatches.slice(0, 5))}`);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  const result = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'real_apply',
    approved_fingerprint: APPROVED_FINGERPRINT,
    approved_plan_hash: APPROVED_PLAN_HASH,
    approved_sql_hash: APPROVED_SQL_HASH,
    regenerated_fingerprint: dryRunSummary.fingerprint,
    regenerated_plan_hash: dryRunSummary.plan_hash,
    regenerated_sql_hash: dryRunSummary.sql_hash,
    apply_sql_hash: sqlHash,
    planned_rows: plans.length,
    updated_rows: updateRowCount,
    target_tables: ['card_printings'],
    writes_performed: ['card_printings.image_source', 'card_printings.image_path', 'card_printings.image_status', 'card_printings.image_note'],
    set_counts: countBy(plans, (plan) => plan.set_code),
    finish_counts: countBy(plans, (plan) => plan.finish_key),
    status_counts: countBy(plans, (plan) => plan.proposed_values.image_status),
    samples: postApplyRows.slice(0, 25),
    db_writes_performed: true,
    storage_writes_performed: false,
    migrations_created: false,
    parent_overwrites_performed: false,
    exact_image_claim_changes_performed: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_performed: false,
    merges_performed: false,
    runtime_public_url_field_writes_performed: false,
    global_apply_performed: false,
  };
  result.result_hash = proofHash({
    package_id: result.package_id,
    approved_fingerprint: result.approved_fingerprint,
    approved_plan_hash: result.approved_plan_hash,
    approved_sql_hash: result.approved_sql_hash,
    planned_rows: result.planned_rows,
    updated_rows: result.updated_rows,
    set_counts: result.set_counts,
    finish_counts: result.finish_counts,
    status_counts: result.status_counts,
    writes_performed: result.writes_performed,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, `# ${PACKAGE_ID}

- Generated: ${result.generated_at}
- Mode: ${result.mode}
- Result hash: \`${result.result_hash}\`
- Approved fingerprint: \`${result.approved_fingerprint}\`
- Approved plan hash: \`${result.approved_plan_hash}\`
- Approved SQL hash: \`${result.approved_sql_hash}\`
- Planned rows: ${result.planned_rows}
- Updated rows: ${result.updated_rows}
- Target table: \`card_printings\`
- Writes performed: \`${result.writes_performed.join('`, `')}\`
- DB writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Parent overwrites performed: ${result.parent_overwrites_performed}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
- Runtime public URL field writes performed: ${result.runtime_public_url_field_writes_performed}
- Global apply performed: ${result.global_apply_performed}

## Updated Sets

${markdownTable(topEntries(result.set_counts))}

## Updated Finishes

${markdownTable(topEntries(result.finish_counts))}

## Applied Statuses

${markdownTable(topEntries(result.status_counts))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    result_json: path.relative(ROOT, RESULT_JSON),
    result_md: path.relative(ROOT, RESULT_MD),
    result_hash: result.result_hash,
    planned_rows: result.planned_rows,
    updated_rows: result.updated_rows,
    set_counts: result.set_counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
