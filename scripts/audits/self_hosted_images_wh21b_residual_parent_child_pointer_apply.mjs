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
const DRY_RUN_SCRIPT = path.join(ROOT, 'scripts', 'audits', 'self_hosted_images_wh21a_residual_parent_child_pointer_dry_run.mjs');
const DRY_RUN_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh21a_residual_parent_child_pointer_dry_run_summary_v1.json');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh21a_residual_parent_child_pointer_plan_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh21b_residual_parent_child_pointer_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh21b_residual_parent_child_pointer_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-21B-RESIDUAL-PARENT-CHILD-POINTER-APPLY';
const APPROVED_FINGERPRINT = '842aa08cd9dc514293088f58df5908aa754bc60f715a0dd12f74bf9ba6ad268c';
const APPROVED_PLAN_HASH = '19d516ef32c08c7e46ec89e65a41d185fab1dacdb79e6145147588c1d4e5f038';
const APPROVED_SQL_HASH = '4423d05aa86aec549e82542d41afcb4c35211432378754a4d4d7e18004fea677';
const APPROVED_ROW_COUNT = 41;

const APPLY_SQL_TEMPLATE = `
with updates(id, image_source, image_path, image_status, image_note) as (
  values %VALUES%
)
update public.card_prints cp
set
  image_source = updates.image_source,
  image_path = updates.image_path,
  image_status = updates.image_status,
  image_note = updates.image_note
from updates
where cp.id = updates.id::uuid
  and (
    cp.image_source is distinct from updates.image_source
    or cp.image_path is distinct from updates.image_path
    or cp.image_status is distinct from updates.image_status
    or cp.image_note is distinct from updates.image_note
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

function validatePlanRows(plans) {
  const stopFindings = [];
  for (const plan of plans) {
    if (plan.target_table !== 'card_prints') stopFindings.push(`unsupported_table:${plan.target_row_id}`);
    if (plan.plan_type !== 'residual_parent_representative_child_pointer') stopFindings.push(`unsupported_plan_type:${plan.target_row_id}`);
    if (plan.exact_image_claim_change === true) stopFindings.push(`exact_image_claim_change:${plan.target_row_id}`);
    if (!clean(plan.proposed_values?.image_path)) stopFindings.push(`missing_image_path:${plan.target_row_id}`);
    const status = clean(plan.proposed_values?.image_status);
    if (!['representative_shared', 'representative_shared_stamp'].includes(status)) {
      stopFindings.push(`unsupported_status:${plan.target_row_id}:${status}`);
    }
    for (const column of plan.changed_columns ?? []) {
      if (!['image_source', 'image_path', 'image_status', 'image_note'].includes(column)) {
        stopFindings.push(`unsupported_changed_column:${plan.target_row_id}:${column}`);
      }
    }
  }
  if (stopFindings.length) {
    throw new Error(`Plan validation failed: ${stopFindings.slice(0, 10).join(', ')}`);
  }
}

async function fetchPostApplyRows(client, plans) {
  const ids = plans.map((plan) => plan.target_row_id);
  const result = await client.query(`
    select
      cp.id::text as target_row_id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.variant_key,
      cp.image_source,
      cp.image_path,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url,
      cp.image_status,
      cp.image_note
    from public.card_prints cp
    left join public.sets s on s.code = cp.set_code
    where cp.id = any($1::uuid[])
    order by coalesce(cp.set_code, 'unknown'), cp.number, cp.gv_id
  `, [ids]);
  return result.rows;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  await execFileAsync(process.execPath, [DRY_RUN_SCRIPT], { cwd: ROOT, maxBuffer: 30 * 1024 * 1024 });
  const dryRunSummary = await readJson(DRY_RUN_SUMMARY_JSON);
  const plans = await readPlans();
  validatePlanRows(plans);
  const applySql = applySqlForPlans(plans);
  const sqlTemplateHash = sha256Hex(APPLY_SQL_TEMPLATE);
  const concreteApplySqlHash = sha256Hex(applySql);

  assertEqual(dryRunSummary.fingerprint, APPROVED_FINGERPRINT, 'fingerprint');
  assertEqual(dryRunSummary.plan_hash, APPROVED_PLAN_HASH, 'plan_hash');
  assertEqual(dryRunSummary.sql_hash, APPROVED_SQL_HASH, 'dry_run_sql_hash');
  assertEqual(sqlTemplateHash, APPROVED_SQL_HASH, 'apply_sql_template_hash');
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
            gv_id: row.gv_id,
            column,
            expected: proposed[column] ?? null,
            actual: row[column] ?? null,
          });
        }
      }
      if (row.image_url !== null || row.image_alt_url !== null || row.representative_image_url !== null) {
        mismatches.push({
          target_row_id: row.target_row_id,
          gv_id: row.gv_id,
          issue: 'runtime_public_url_or_representative_url_field_present',
          image_url: row.image_url,
          image_alt_url: row.image_alt_url,
          representative_image_url: row.representative_image_url,
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
    apply_sql_template_hash: sqlTemplateHash,
    concrete_apply_sql_hash: concreteApplySqlHash,
    planned_rows: plans.length,
    updated_rows: updateRowCount,
    target_tables: ['card_prints'],
    writes_performed: ['card_prints.image_source', 'card_prints.image_path', 'card_prints.image_status', 'card_prints.image_note'],
    set_counts: countBy(plans, (plan) => plan.set_code),
    source_finish_counts: countBy(plans, (plan) => plan.source_finish_key),
    status_counts: countBy(plans, (plan) => plan.proposed_values.image_status),
    samples: postApplyRows.slice(0, 25),
    db_writes_performed: true,
    storage_writes_performed: false,
    migrations_created: false,
    child_writes_performed: false,
    parent_identity_overwrites_performed: false,
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
    source_finish_counts: result.source_finish_counts,
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
- Target table: \`card_prints\`
- Writes performed: \`${result.writes_performed.join('`, `')}\`
- DB writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Child writes performed: ${result.child_writes_performed}
- Parent identity overwrites performed: ${result.parent_identity_overwrites_performed}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
- Runtime public URL field writes performed: ${result.runtime_public_url_field_writes_performed}
- Global apply performed: ${result.global_apply_performed}

## Updated Sets

${markdownTable(topEntries(result.set_counts))}

## Source Finishes

${markdownTable(topEntries(result.source_finish_counts))}

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
