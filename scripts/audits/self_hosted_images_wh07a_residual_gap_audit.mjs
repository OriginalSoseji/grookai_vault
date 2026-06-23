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
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh07a_residual_gap_audit_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh07a_residual_gap_audit_summary_v1.md');
const CHILD_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh07a_residual_child_pointer_candidate_plan_v1.jsonl');
const PACKAGE_ID = 'IMG-HOST-WH-07A-RESIDUAL-GAP-AUDIT';

const PRIORITY_SET_CODES = new Set([
  '2021swsh',
  '2023sv',
  '2024sv',
  'mcd11',
  'mcd12',
  'mcd14',
  'mcd15',
  'mcd16',
  'mcd17',
  'mcd18',
  'mcd19',
  'mcd21',
  'mcd22',
]);

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
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 50) {
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

function familyForRow(row) {
  const setCode = clean(row.set_code)?.toLowerCase() ?? '';
  const haystack = [
    row.set_name,
    row.set_code,
    row.variant_key,
    row.printed_identity_modifier,
  ].map((value) => clean(value)?.toLowerCase() ?? '').join(' ');

  if (setCode.startsWith('tk-')) return 'trainer_kit';
  if (PRIORITY_SET_CODES.has(setCode)) return 'mcdonalds';
  if (/(world championship|worlds|signature|signed)/.test(haystack)) return 'world_championship_signature';
  return 'other';
}

function hasAnyImageField(row, prefix = '') {
  return Boolean(
    clean(row[`${prefix}image_path`])
    || clean(row[`${prefix}image_url`])
    || clean(row[`${prefix}image_alt_url`])
    || clean(row[`${prefix}representative_image_url`])
  );
}

function isWeakStatus(value) {
  const normalized = clean(value)?.toLowerCase();
  return !normalized || normalized === 'missing' || normalized === 'unresolved' || normalized === 'blocked';
}

function isSelfHostedPath(value) {
  return clean(value)?.startsWith('warehouse-derived/self-hosted-images-v1/') ?? false;
}

function proposedChildStatus(parentStatus) {
  const normalized = clean(parentStatus)?.toLowerCase();
  if (normalized === 'exact') {
    return 'representative_shared';
  }
  if (normalized?.startsWith('representative_')) {
    return normalized;
  }
  return 'representative_shared';
}

function proposedChildNote(parentRow) {
  return [
    `Representative child image candidate from parent card_prints image_path by ${PACKAGE_ID}.`,
    `Parent status was ${clean(parentRow.parent_image_status) ?? 'unknown'}; exact child finish claim is not changed.`,
  ].join(' ');
}

async function query(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let parentRows;
  let childRows;
  let worldsRows;
  try {
    parentRows = await query(client, `
        select
          cp.id::text,
          cp.gv_id,
          cp.name,
          cp.set_code,
          s.name as set_name,
          cp.number,
          cp.variant_key,
          cp.printed_identity_modifier,
          cp.image_source,
          cp.image_path,
          cp.image_url,
          cp.image_alt_url,
          cp.representative_image_url,
          cp.image_status,
          cp.image_note
        from public.card_prints cp
        left join public.sets s on s.code = cp.set_code
      `);
    childRows = await query(client, `
        select
          cpg.id::text as child_id,
          cpg.printing_gv_id,
          cpg.finish_key,
          cpg.image_source,
          cpg.image_path,
          cpg.image_url,
          cpg.image_alt_url,
          cpg.image_status,
          cpg.image_note,
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
      `);
    worldsRows = await query(client, `
        select
          cp.id::text,
          cp.gv_id,
          cp.name,
          cp.set_code,
          s.name as set_name,
          cp.number,
          cp.variant_key,
          cp.printed_identity_modifier,
          cp.image_source,
          cp.image_path,
          cp.image_url,
          cp.image_alt_url,
          cp.representative_image_url,
          cp.image_status,
          cp.image_note
        from public.card_prints cp
        left join public.sets s on s.code = cp.set_code
        where lower(coalesce(s.name,'') || ' ' || coalesce(cp.set_code,'') || ' ' || coalesce(cp.variant_key,'') || ' ' || coalesce(cp.printed_identity_modifier,'')) ~
          '(world championship|worlds|signature|signed)'
      `);
  } finally {
    await client.end();
  }

  const priorityParents = parentRows.filter((row) => familyForRow(row) !== 'other');
  const priorityChildren = childRows.filter((row) => familyForRow(row) !== 'other');
  const parentNoImageRows = priorityParents.filter((row) => !hasAnyImageField(row));
  const parentWeakStatusRows = priorityParents.filter((row) => isWeakStatus(row.image_status));
  const childNoImageRows = priorityChildren.filter((row) => !hasAnyImageField(row));
  const childWeakStatusRows = priorityChildren.filter((row) => isWeakStatus(row.image_status));
  const mcdonaldsParents = priorityParents.filter((row) => familyForRow(row) === 'mcdonalds');
  const mcdonaldsNotSelfHosted = mcdonaldsParents.filter((row) => !isSelfHostedPath(row.image_path));

  const childPointerCandidates = childNoImageRows
    .filter((row) => isSelfHostedPath(row.parent_image_path))
    .map((row) => ({
      package_id: PACKAGE_ID,
      plan_type: 'child_metadata_pointer_candidate',
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
      family: familyForRow(row),
      current_values: {
        image_source: clean(row.image_source),
        image_path: clean(row.image_path),
        image_url: clean(row.image_url),
        image_alt_url: clean(row.image_alt_url),
        image_status: clean(row.image_status),
        image_note: clean(row.image_note),
      },
      proposed_values: {
        image_source: 'identity',
        image_path: clean(row.parent_image_path),
        image_status: proposedChildStatus(row.parent_image_status),
        image_note: proposedChildNote(row),
      },
      exact_image_claim_change: false,
      storage_write_required: false,
      runtime_public_url_field_write_required: false,
      allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
      blocked_future_columns: ['image_url', 'image_alt_url', 'card_print_id', 'finish_key', 'printing_gv_id'],
    }));

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_gap_audit_no_write',
    parent_rows_scanned: parentRows.length,
    child_rows_scanned: childRows.length,
    priority_parent_rows: priorityParents.length,
    priority_child_rows: priorityChildren.length,
    parent_no_image_fields: parentNoImageRows.length,
    parent_weak_status_rows: parentWeakStatusRows.length,
    child_no_image_fields: childNoImageRows.length,
    child_weak_status_rows: childWeakStatusRows.length,
    mcdonalds_parent_rows: mcdonaldsParents.length,
    mcdonalds_parent_not_self_hosted: mcdonaldsNotSelfHosted.length,
    world_championship_signature_candidate_rows: worldsRows.length,
    child_pointer_candidate_rows: childPointerCandidates.length,
    parent_families: countBy(priorityParents, familyForRow),
    child_gap_families: countBy(childNoImageRows, familyForRow),
    child_pointer_candidate_families: countBy(childPointerCandidates, (row) => row.family),
    child_gap_sets: countBy(childNoImageRows, (row) => row.set_code),
    child_pointer_candidate_sets: countBy(childPointerCandidates, (row) => row.set_code),
    mcdonalds_parent_sources: countBy(mcdonaldsParents, (row) => isSelfHostedPath(row.image_path) ? 'self_hosted_image_path' : clean(row.image_source) ?? 'unknown'),
    worlds_sets: countBy(worldsRows, (row) => row.set_code),
    samples: {
      parent_no_image_fields: parentNoImageRows.slice(0, 25),
      child_no_image_fields: childNoImageRows.slice(0, 25),
      child_pointer_candidates: childPointerCandidates.slice(0, 25),
      mcdonalds_parent_not_self_hosted: mcdonaldsNotSelfHosted.slice(0, 25),
      world_championship_signature_candidates: worldsRows.slice(0, 25),
    },
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };

  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    priority_parent_rows: summary.priority_parent_rows,
    priority_child_rows: summary.priority_child_rows,
    parent_no_image_fields: summary.parent_no_image_fields,
    child_no_image_fields: summary.child_no_image_fields,
    mcdonalds_parent_not_self_hosted: summary.mcdonalds_parent_not_self_hosted,
    world_championship_signature_candidate_rows: summary.world_championship_signature_candidate_rows,
    child_pointer_candidate_rows: summary.child_pointer_candidate_rows,
    child_gap_sets: summary.child_gap_sets,
    child_pointer_candidate_sets: summary.child_pointer_candidate_sets,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(CHILD_PLAN_JSONL, childPointerCandidates.map((row) => JSON.stringify(row)).join('\n') + (childPointerCandidates.length ? '\n' : ''), 'utf8');
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Parent rows scanned: ${summary.parent_rows_scanned}
- Child rows scanned: ${summary.child_rows_scanned}
- Priority parent rows: ${summary.priority_parent_rows}
- Priority child rows: ${summary.priority_child_rows}
- Parent rows with no image fields: ${summary.parent_no_image_fields}
- Parent weak-status rows: ${summary.parent_weak_status_rows}
- Child rows with no image fields: ${summary.child_no_image_fields}
- Child weak-status rows: ${summary.child_weak_status_rows}
- McDonald's parent rows: ${summary.mcdonalds_parent_rows}
- McDonald's parent rows not self-hosted: ${summary.mcdonalds_parent_not_self_hosted}
- World Championship/signature candidate parent rows: ${summary.world_championship_signature_candidate_rows}
- Child pointer candidate rows: ${summary.child_pointer_candidate_rows}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Global apply performed: ${summary.global_apply_performed}

## Parent Families

${markdownTable(topEntries(summary.parent_families))}

## Child Gap Families

${markdownTable(topEntries(summary.child_gap_families))}

## Child Pointer Candidate Families

${markdownTable(topEntries(summary.child_pointer_candidate_families))}

## Child Gap Sets

${markdownTable(topEntries(summary.child_gap_sets))}

## Child Pointer Candidate Sets

${markdownTable(topEntries(summary.child_pointer_candidate_sets))}

## McDonald's Parent Sources

${markdownTable(topEntries(summary.mcdonalds_parent_sources))}

## World Championship/Signature Sets

${markdownTable(topEntries(summary.worlds_sets))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    child_plan_jsonl: path.relative(ROOT, CHILD_PLAN_JSONL),
    fingerprint: summary.fingerprint,
    parent_no_image_fields: summary.parent_no_image_fields,
    child_no_image_fields: summary.child_no_image_fields,
    mcdonalds_parent_not_self_hosted: summary.mcdonalds_parent_not_self_hosted,
    world_championship_signature_candidate_rows: summary.world_championship_signature_candidate_rows,
    child_pointer_candidate_rows: summary.child_pointer_candidate_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
