import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh20a_priority_child_pointer_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh20a_priority_child_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh20a_priority_child_pointer_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-20A-PRIORITY-CHILD-POINTER-DRY-RUN';
const SELF_HOSTED_PREFIX = 'warehouse-derived/self-hosted-images-v1/';

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

function hasChildImageField(row) {
  return Boolean(clean(row.child_image_path) || clean(row.child_image_url) || clean(row.child_image_alt_url));
}

function isSelfHostedPath(value) {
  return clean(value)?.startsWith(SELF_HOSTED_PREFIX) ?? false;
}

function isPriorityFamily(row) {
  const setCode = clean(row.set_code)?.toLowerCase() ?? '';
  const setName = clean(row.set_name)?.toLowerCase() ?? '';
  const variantKey = clean(row.variant_key)?.toLowerCase() ?? '';
  const modifier = clean(row.printed_identity_modifier)?.toLowerCase() ?? '';
  const imageNote = clean(row.child_image_note)?.toLowerCase() ?? '';
  const haystack = [setCode, setName, variantKey, modifier, imageNote].join(' ');
  if (setCode.startsWith('tk') || setName.includes('trainer kit')) return true;
  if (/base.*(shadowless|1st|first|1999-2000)/.test(haystack)) return true;
  return false;
}

function proposedStatus(row) {
  const current = clean(row.child_image_status)?.toLowerCase();
  if (current?.startsWith('representative')) return current;
  return 'representative_shared';
}

function proposedNote(row) {
  const existing = clean(row.child_image_note);
  const prefix = `Representative child image pointer from parent ${row.parent_gv_id} by ${PACKAGE_ID}.`;
  const suffix = 'Exact child/finish image claim is not changed.';
  if (existing) return `${existing} ${prefix} ${suffix}`;
  return `${prefix} ${suffix}`;
}

async function fetchPlans(client) {
  const result = await client.query(`
    select
      cpg.id::text as child_id,
      cpg.printing_gv_id,
      cpg.finish_key,
      cpg.image_source as child_image_source,
      cpg.image_path as child_image_path,
      cpg.image_url as child_image_url,
      cpg.image_alt_url as child_image_alt_url,
      cpg.image_status as child_image_status,
      cpg.image_note as child_image_note,
      cp.id::text as parent_id,
      cp.gv_id as parent_gv_id,
      cp.name,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.image_source as parent_image_source,
      cp.image_path as parent_image_path,
      cp.image_status as parent_image_status,
      cp.image_note as parent_image_note
    from public.card_printings cpg
    join public.card_prints cp on cp.id = cpg.card_print_id
    left join public.sets s on s.code = cp.set_code
    order by cp.set_code, cp.number_plain nulls last, cp.number, cp.gv_id, cpg.finish_key
  `);

  const targetRows = result.rows.filter((row) => (
    isPriorityFamily(row)
    && !hasChildImageField(row)
    && isSelfHostedPath(row.parent_image_path)
  ));

  return targetRows.map((row) => {
    const nextStatus = proposedStatus(row);
    const nextNote = proposedNote(row);
    const currentValues = {
      image_source: clean(row.child_image_source),
      image_path: clean(row.child_image_path),
      image_url: clean(row.child_image_url),
      image_alt_url: clean(row.child_image_alt_url),
      image_status: clean(row.child_image_status),
      image_note: clean(row.child_image_note),
    };
    const proposedValues = {
      image_source: 'identity',
      image_path: clean(row.parent_image_path),
      image_status: nextStatus,
      image_note: nextNote,
    };
    const changedColumns = [];
    if (currentValues.image_source !== proposedValues.image_source) changedColumns.push('image_source');
    if (currentValues.image_path !== proposedValues.image_path) changedColumns.push('image_path');
    if (currentValues.image_status !== proposedValues.image_status) changedColumns.push('image_status');
    if (currentValues.image_note !== proposedValues.image_note) changedColumns.push('image_note');

    return {
      package_id: PACKAGE_ID,
      plan_type: 'priority_child_representative_pointer',
      target_table: 'card_printings',
      target_row_id: row.child_id,
      printing_gv_id: row.printing_gv_id,
      finish_key: row.finish_key,
      parent_card_print_id: row.parent_id,
      parent_gv_id: row.parent_gv_id,
      name: row.name,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      parent_image_source: row.parent_image_source,
      parent_image_status: row.parent_image_status,
      current_values: currentValues,
      proposed_values: proposedValues,
      changed_columns: changedColumns,
      exact_image_claim_change: false,
      storage_write_required: false,
      runtime_public_url_field_write_required: false,
      allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
      blocked_future_columns: ['image_url', 'image_alt_url', 'card_print_id', 'finish_key', 'printing_gv_id'],
    };
  });
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

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let plans;
  try {
    plans = await fetchPlans(client);
  } finally {
    await client.end();
  }

  const applySql = applySqlForPlans(plans);
  const sqlHash = sha256Hex(applySql);
  const planHash = proofHash(plans.map((plan) => ({
    target_row_id: plan.target_row_id,
    printing_gv_id: plan.printing_gv_id,
    proposed_values: plan.proposed_values,
  })));

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    plan_rows: plans.length,
    sql_hash: sqlHash,
    plan_hash: planHash,
    target_tables: ['card_printings'],
    writes_if_later_approved: ['card_printings.image_source', 'card_printings.image_path', 'card_printings.image_status', 'card_printings.image_note'],
    set_counts: countBy(plans, (plan) => plan.set_code),
    finish_counts: countBy(plans, (plan) => plan.finish_key),
    status_counts: countBy(plans, (plan) => plan.proposed_values.image_status),
    samples: plans.slice(0, 25),
    db_writes_performed: false,
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
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    mode: summary.mode,
    plan_rows: summary.plan_rows,
    sql_hash: summary.sql_hash,
    plan_hash: summary.plan_hash,
    set_counts: summary.set_counts,
    finish_counts: summary.finish_counts,
    writes_if_later_approved: summary.writes_if_later_approved,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, plans.map((plan) => JSON.stringify(plan)).join('\n') + (plans.length ? '\n' : ''), 'utf8');
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Plan hash: \`${summary.plan_hash}\`
- SQL hash: \`${summary.sql_hash}\`
- Planned rows: ${summary.plan_rows}
- Target table: \`card_printings\`
- Writes if later approved: \`${summary.writes_if_later_approved.join('`, `')}\`
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Parent overwrites performed: ${summary.parent_overwrites_performed}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Runtime public URL field writes performed: ${summary.runtime_public_url_field_writes_performed}
- Global apply performed: ${summary.global_apply_performed}

## Planned Sets

${markdownTable(topEntries(summary.set_counts))}

## Planned Finishes

${markdownTable(topEntries(summary.finish_counts))}

## Proposed Statuses

${markdownTable(topEntries(summary.status_counts))}

## Approval Text

\`\`\`text
Approve real IMG-HOST-WH-20B-PRIORITY-CHILD-POINTER-APPLY. Fingerprint: ${summary.fingerprint}. Plan hash: ${summary.plan_hash}. SQL hash: ${summary.sql_hash}. Scope: ${summary.plan_rows} card_printings metadata pointer updates only for residual priority Trainer Kit and Base print-run/promo child rows, setting image_source, image_path, image_status, and image_note from existing self-hosted parent image paths as representative_shared child display metadata. No storage writes. No runtime public URL field writes. No parent overwrites. No exact image claims. No identity-table writes. No price writes. No deletes. No merges. No migrations. No global apply.
\`\`\`
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    plan_hash: summary.plan_hash,
    sql_hash: summary.sql_hash,
    plan_rows: summary.plan_rows,
    set_counts: summary.set_counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
