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
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-19A-FINAL-IMAGE-HOSTING-STATE-SCAN';
const SELF_HOSTED_PREFIX = 'warehouse-derived/self-hosted-images-v1/';

const MCDONALDS_SET_CODES = new Set([
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
    const key = clean(fn(row)) ?? 'unknown';
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
  return clean(value)?.startsWith(SELF_HOSTED_PREFIX) ?? false;
}

function isExactStatus(value) {
  return clean(value)?.toLowerCase() === 'exact';
}

function isRepresentativeStatus(value) {
  return clean(value)?.toLowerCase().startsWith('representative') ?? false;
}

function familyForRow(row) {
  const setCode = clean(row.set_code)?.toLowerCase() ?? '';
  const haystack = [
    row.set_code,
    row.set_name,
    row.variant_key,
    row.printed_identity_modifier,
  ].map((value) => clean(value)?.toLowerCase() ?? '').join(' ');

  if (setCode.startsWith('wcd') || clean(row.variant_key)?.toLowerCase() === 'world_championship_deck_replica') {
    return 'world_championship_deck';
  }
  if (setCode.startsWith('tk-') || haystack.includes('trainer kit')) return 'trainer_kit';
  if (MCDONALDS_SET_CODES.has(setCode) || haystack.includes('mcdonald') || haystack.includes("mcdonald's")) return 'mcdonalds';
  if (/base.*(shadowless|1st|first|1999-2000)/.test(haystack)) return 'base_set_print_run_lane';
  if (setCode === 'mfb' || haystack.includes('my first battle')) return 'my_first_battle';
  return 'other';
}

function deckQuantity(row) {
  const direct = Number.parseInt(row.deck_quantity ?? '0', 10);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const external = row.external_ids?.grookai?.deck_quantity;
  const parsed = Number.parseInt(external ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function groupSums(rows, keyFn, valueFn) {
  const sums = {};
  for (const row of rows) {
    const key = clean(keyFn(row)) ?? 'unknown';
    sums[key] = (sums[key] ?? 0) + Number(valueFn(row) ?? 0);
  }
  return Object.fromEntries(Object.entries(sums).sort(([a], [b]) => a.localeCompare(b)));
}

function sampleRows(rows, limit = 25) {
  return rows.slice(0, limit).map((row) => ({
    gv_id: row.gv_id ?? row.parent_gv_id ?? row.printing_gv_id ?? null,
    printing_gv_id: row.printing_gv_id ?? null,
    name: row.name ?? null,
    set_code: row.set_code ?? null,
    set_name: row.set_name ?? null,
    number: row.number ?? null,
    finish_key: row.finish_key ?? null,
    variant_key: row.variant_key ?? null,
    image_source: row.image_source ?? null,
    image_path: row.image_path ?? null,
    image_status: row.image_status ?? null,
    image_note: row.image_note ?? null,
  }));
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
  let setRows;
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
        cp.image_note,
        cp.external_ids,
        cp.external_ids->'grookai'->>'deck_quantity' as deck_quantity
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
    setRows = await query(client, `
      select
        s.code,
        s.name,
        s.source,
        s.source->'grookai'->>'deck_year' as deck_year,
        s.source->'grookai'->>'deck_name' as deck_name,
        s.source->'grookai'->>'source_url' as source_url,
        s.source->'grookai'->>'source_index_url' as source_index_url
      from public.sets s
    `);
  } finally {
    await client.end();
  }

  const parentRowsWithImage = parentRows.filter((row) => hasAnyImageField(row));
  const childRowsWithImage = childRows.filter((row) => hasAnyImageField(row));
  const parentRowsWithSelfHostedPath = parentRows.filter((row) => isSelfHostedPath(row.image_path));
  const childRowsWithSelfHostedPath = childRows.filter((row) => isSelfHostedPath(row.image_path));
  const parentRowsWithoutImage = parentRows.filter((row) => !hasAnyImageField(row));
  const childRowsWithoutImage = childRows.filter((row) => !hasAnyImageField(row));
  const parentWeakStatusRows = parentRows.filter((row) => isWeakStatus(row.image_status));
  const childWeakStatusRows = childRows.filter((row) => isWeakStatus(row.image_status));

  const priorityParents = parentRows.filter((row) => familyForRow(row) !== 'other');
  const priorityChildren = childRows.filter((row) => familyForRow(row) !== 'other');
  const priorityParentGaps = priorityParents.filter((row) => !hasAnyImageField(row));
  const priorityChildGaps = priorityChildren.filter((row) => !hasAnyImageField(row));

  const worldParents = parentRows.filter((row) => familyForRow(row) === 'world_championship_deck');
  const worldSets = setRows.filter((row) => clean(row.code)?.toLowerCase().startsWith('wcd'));
  const worldDeckQuantitySum = worldParents.reduce((sum, row) => sum + deckQuantity(row), 0);
  const worldDeckQuantityBySet = groupSums(worldParents, (row) => row.set_code, deckQuantity);
  const worldSetsWithSixtyCardDecklist = Object.values(worldDeckQuantityBySet).filter((value) => value === 60).length;
  const worldSetsWithoutSixtyCardDecklist = Object.entries(worldDeckQuantityBySet)
    .filter(([, value]) => value !== 60)
    .map(([set_code, total_quantity]) => ({ set_code, total_quantity }));

  const mcdonaldsParents = parentRows.filter((row) => familyForRow(row) === 'mcdonalds');
  const trainerKitParents = parentRows.filter((row) => familyForRow(row) === 'trainer_kit');
  const baseLaneParents = parentRows.filter((row) => familyForRow(row) === 'base_set_print_run_lane');

  const metrics = {
    parent_rows_scanned: parentRows.length,
    parent_rows_with_any_image_field: parentRowsWithImage.length,
    parent_rows_with_self_hosted_image_path: parentRowsWithSelfHostedPath.length,
    parent_rows_without_any_image_field: parentRowsWithoutImage.length,
    parent_weak_status_rows: parentWeakStatusRows.length,
    child_rows_scanned: childRows.length,
    child_rows_with_any_image_field: childRowsWithImage.length,
    child_rows_with_self_hosted_image_path: childRowsWithSelfHostedPath.length,
    child_rows_without_any_image_field: childRowsWithoutImage.length,
    child_weak_status_rows: childWeakStatusRows.length,
    priority_parent_rows: priorityParents.length,
    priority_parent_rows_without_any_image_field: priorityParentGaps.length,
    priority_child_rows: priorityChildren.length,
    priority_child_rows_without_any_image_field: priorityChildGaps.length,
    world_championship_parent_rows: worldParents.length,
    world_championship_parent_rows_exact: worldParents.filter((row) => isExactStatus(row.image_status)).length,
    world_championship_parent_rows_representative: worldParents.filter((row) => isRepresentativeStatus(row.image_status)).length,
    world_championship_parent_rows_without_any_image_field: worldParents.filter((row) => !hasAnyImageField(row)).length,
    world_championship_parent_rows_with_self_hosted_image_path: worldParents.filter((row) => isSelfHostedPath(row.image_path)).length,
    world_championship_sets: worldSets.length,
    world_championship_sets_with_60_card_deck_quantity_total: worldSetsWithSixtyCardDecklist,
    world_championship_sets_without_60_card_deck_quantity_total: worldSetsWithoutSixtyCardDecklist.length,
    world_championship_deck_quantity_sum_from_card_rows: worldDeckQuantitySum,
    mcdonalds_parent_rows: mcdonaldsParents.length,
    mcdonalds_parent_rows_without_any_image_field: mcdonaldsParents.filter((row) => !hasAnyImageField(row)).length,
    mcdonalds_parent_rows_without_self_hosted_image_path: mcdonaldsParents.filter((row) => !isSelfHostedPath(row.image_path)).length,
    trainer_kit_parent_rows: trainerKitParents.length,
    trainer_kit_parent_rows_without_any_image_field: trainerKitParents.filter((row) => !hasAnyImageField(row)).length,
    trainer_kit_parent_rows_without_self_hosted_image_path: trainerKitParents.filter((row) => !isSelfHostedPath(row.image_path)).length,
    base_set_print_run_lane_parent_rows: baseLaneParents.length,
    base_set_print_run_lane_parent_rows_without_any_image_field: baseLaneParents.filter((row) => !hasAnyImageField(row)).length,
  };

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_final_state_scan_no_write',
    self_hosted_storage_path_prefix: SELF_HOSTED_PREFIX,
    metrics,
    parent_image_status_counts: countBy(parentRows, (row) => row.image_status),
    child_image_status_counts: countBy(childRows, (row) => row.image_status),
    parent_image_source_counts: countBy(parentRows, (row) => row.image_source),
    child_image_source_counts: countBy(childRows, (row) => row.image_source),
    parent_family_counts: countBy(parentRows, familyForRow),
    child_family_counts: countBy(childRows, familyForRow),
    parent_gap_sets_top_50: topEntries(countBy(parentRowsWithoutImage, (row) => row.set_code), 50),
    child_gap_sets_top_50: topEntries(countBy(childRowsWithoutImage, (row) => row.set_code), 50),
    priority_parent_gap_sets_top_50: topEntries(countBy(priorityParentGaps, (row) => row.set_code), 50),
    priority_child_gap_sets_top_50: topEntries(countBy(priorityChildGaps, (row) => row.set_code), 50),
    world_championship_image_status_counts: countBy(worldParents, (row) => row.image_status),
    world_championship_deck_quantity_by_set: worldDeckQuantityBySet,
    world_championship_sets_without_60_card_deck_quantity_total: worldSetsWithoutSixtyCardDecklist,
    world_championship_gap_sets_top_50: topEntries(countBy(worldParents.filter((row) => !hasAnyImageField(row)), (row) => row.set_code), 50),
    samples: {
      parent_rows_without_any_image_field: sampleRows(parentRowsWithoutImage),
      child_rows_without_any_image_field: sampleRows(childRowsWithoutImage),
      priority_parent_rows_without_any_image_field: sampleRows(priorityParentGaps),
      priority_child_rows_without_any_image_field: sampleRows(priorityChildGaps),
      world_championship_rows_without_any_image_field: sampleRows(worldParents.filter((row) => !hasAnyImageField(row))),
    },
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };

  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    mode: summary.mode,
    metrics: summary.metrics,
    parent_image_status_counts: summary.parent_image_status_counts,
    child_image_status_counts: summary.child_image_status_counts,
    priority_parent_gap_sets_top_50: summary.priority_parent_gap_sets_top_50,
    priority_child_gap_sets_top_50: summary.priority_child_gap_sets_top_50,
    world_championship_image_status_counts: summary.world_championship_image_status_counts,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Self-hosted storage path prefix: \`${SELF_HOSTED_PREFIX}\`
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Global apply performed: ${summary.global_apply_performed}

## Core Coverage

- Parent rows scanned: ${metrics.parent_rows_scanned}
- Parent rows with any image field: ${metrics.parent_rows_with_any_image_field}
- Parent rows with self-hosted image_path: ${metrics.parent_rows_with_self_hosted_image_path}
- Parent rows without any image field: ${metrics.parent_rows_without_any_image_field}
- Parent weak-status rows: ${metrics.parent_weak_status_rows}
- Child rows scanned: ${metrics.child_rows_scanned}
- Child rows with any image field: ${metrics.child_rows_with_any_image_field}
- Child rows with self-hosted image_path: ${metrics.child_rows_with_self_hosted_image_path}
- Child rows without any image field: ${metrics.child_rows_without_any_image_field}
- Child weak-status rows: ${metrics.child_weak_status_rows}

## Priority Lanes

- Priority parent rows: ${metrics.priority_parent_rows}
- Priority parent image gaps: ${metrics.priority_parent_rows_without_any_image_field}
- Priority child rows: ${metrics.priority_child_rows}
- Priority child image gaps: ${metrics.priority_child_rows_without_any_image_field}
- McDonald's parent rows: ${metrics.mcdonalds_parent_rows}
- McDonald's parent image gaps: ${metrics.mcdonalds_parent_rows_without_any_image_field}
- McDonald's parent rows without self-hosted image_path: ${metrics.mcdonalds_parent_rows_without_self_hosted_image_path}
- Trainer Kit parent rows: ${metrics.trainer_kit_parent_rows}
- Trainer Kit parent image gaps: ${metrics.trainer_kit_parent_rows_without_any_image_field}
- Trainer Kit parent rows without self-hosted image_path: ${metrics.trainer_kit_parent_rows_without_self_hosted_image_path}
- Base Set print-run lane parent rows: ${metrics.base_set_print_run_lane_parent_rows}
- Base Set print-run lane parent image gaps: ${metrics.base_set_print_run_lane_parent_rows_without_any_image_field}

## World Championship Decks

- Parent rows: ${metrics.world_championship_parent_rows}
- Exact parent images: ${metrics.world_championship_parent_rows_exact}
- Representative parent images: ${metrics.world_championship_parent_rows_representative}
- Parent image gaps: ${metrics.world_championship_parent_rows_without_any_image_field}
- Parent rows with self-hosted image_path: ${metrics.world_championship_parent_rows_with_self_hosted_image_path}
- WCD sets: ${metrics.world_championship_sets}
- WCD sets with 60-card deck quantity totals: ${metrics.world_championship_sets_with_60_card_deck_quantity_total}
- WCD sets without 60-card deck quantity totals: ${metrics.world_championship_sets_without_60_card_deck_quantity_total}
- Deck quantity sum from card rows: ${metrics.world_championship_deck_quantity_sum_from_card_rows}

## Parent Status Counts

${markdownTable(topEntries(summary.parent_image_status_counts))}

## Child Status Counts

${markdownTable(topEntries(summary.child_image_status_counts))}

## Parent Gap Sets

${markdownTable(summary.parent_gap_sets_top_50)}

## Child Gap Sets

${markdownTable(summary.child_gap_sets_top_50)}

## Priority Parent Gap Sets

${markdownTable(summary.priority_parent_gap_sets_top_50)}

## Priority Child Gap Sets

${markdownTable(summary.priority_child_gap_sets_top_50)}

## World Championship Status Counts

${markdownTable(topEntries(summary.world_championship_image_status_counts))}

## World Championship Gap Sets

${markdownTable(summary.world_championship_gap_sets_top_50)}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    fingerprint: summary.fingerprint,
    metrics,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
