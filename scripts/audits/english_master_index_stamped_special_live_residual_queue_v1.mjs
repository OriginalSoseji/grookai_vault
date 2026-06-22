import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const SOURCE_QUEUE = path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json');
const CONFLICT_ADJUDICATION = path.join(AUDIT_DIR, 'english_master_index_pkg18g2_stamped_conflict_source_adjudication_v1.json');
const REGIONAL_CHAMPIONSHIP_ACTIVE_FINISH = path.join(
  AUDIT_DIR,
  'english_master_index_regional_championship_active_finish_adjudication_v1.json',
);
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_live_residual_queue_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_live_residual_queue_v1.md');

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topEntries(obj, limit = 20) {
  return Object.fromEntries(Object.entries(obj ?? {}).slice(0, limit));
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function parentKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeName(row.card_name),
    row.effective_variant_key ?? row.variant_key ?? '',
  ].join('|');
}

function childKey(row) {
  return [
    parentKey(row),
    row.effective_finish_key ?? row.finish_key ?? '',
  ].join('|');
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function conflictAdjudicationKey(row) {
  return [
    row.set_key ?? '',
    normalizeNumber(row.card_number),
    row.card_name ?? '',
    row.variant_key ?? '',
  ].join('|').toLowerCase();
}

function cardIdentityKey(row) {
  return [
    row.set_key ?? '',
    normalizeNumber(row.card_number),
    row.card_name ?? '',
  ].join('|').toLowerCase();
}

async function fetchLiveRows(client, setCodes) {
  const result = await client.query(
    `
      select
        cp.id as card_print_id,
        cp.set_code,
        cp.number,
        cp.number_plain,
        lower(cp.name) as name_key,
        coalesce(cp.variant_key, '') as variant_key,
        cp.printed_identity_modifier,
        cpi.id as card_printing_id,
        cpi.finish_key
      from public.card_prints cp
      left join public.card_printings cpi on cpi.card_print_id = cp.id
      where cp.set_code = any($1::text[])
    `,
    [setCodes],
  );
  return result.rows;
}

function annotateRows(queueRows, liveRows, adjudicationByKey = new Map(), regionalChampionshipByCard = new Map()) {
  const liveParents = new Set();
  const liveChildren = new Set();
  for (const row of liveRows) {
    const key = [
      row.set_code,
      normalizeNumber(row.number_plain ?? row.number),
      normalizeName(row.name_key),
      row.variant_key ?? '',
    ].join('|');
    liveParents.add(key);
    liveChildren.add([key, row.finish_key ?? ''].join('|'));
  }

  return queueRows.map((row) => {
    const adjudication = adjudicationByKey.get(conflictAdjudicationKey(row));
    const regionalChampionship = regionalChampionshipByCard.get(cardIdentityKey(row));
    const effectiveFinishKey = adjudication?.dry_run_candidate_after_package_builder
      ? adjudication.adjudicated_finish_key
      : regionalChampionship?.dry_run_candidate
        ? regionalChampionship.target_child_finish_key
      : row.finish_key;
    const effectiveVariantKey = regionalChampionship?.dry_run_candidate
      ? regionalChampionship.governed_variant_key
      : row.variant_key;
    const rowWithEffectiveFinish = {
      ...row,
      effective_finish_key: effectiveFinishKey,
      effective_variant_key: effectiveVariantKey,
    };
    const parentPresent = liveParents.has(parentKey(row));
    const childPresent = effectiveFinishKey ? liveChildren.has(childKey(rowWithEffectiveFinish)) : false;
    return {
      ...rowWithEffectiveFinish,
      live_parent_present: parentPresent,
      live_child_present: childPresent,
      live_satisfaction_variant_key: effectiveVariantKey,
      live_satisfied: effectiveFinishKey ? childPresent : parentPresent,
    };
  });
}

function renderMarkdown(report) {
  return `# English Master Index Stamped/Special Live Residual Queue V1

Generated: ${report.generated_at}

This report reconciles the artifact queue against the live DB after recent stamped/special packages. It is read-only and exists to avoid repeating already-satisfied rows.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- apply_performed: ${report.apply_performed}
- cleanup_performed: ${report.cleanup_performed}

## Summary

- source_queue_rows: ${report.summary.source_queue_rows}
- live_satisfied_rows: ${report.summary.live_satisfied_rows}
- remaining_open_rows: ${report.summary.remaining_open_rows}
- remaining_write_possible_rows: ${report.summary.remaining_write_possible_rows}
- remaining_no_write_or_blocked_rows: ${report.summary.remaining_no_write_or_blocked_rows}

## Remaining By Bucket

${markdownTable(Object.entries(report.summary.open_by_execution_bucket).map(([bucket, count]) => ({ bucket, count })), [
  { label: 'bucket', value: (row) => row.bucket },
  { label: 'count', value: (row) => row.count },
])}

## Remaining By Variant Family

${markdownTable(Object.entries(report.summary.open_by_variant_family).map(([family, count]) => ({ family, count })), [
  { label: 'family', value: (row) => row.family },
  { label: 'count', value: (row) => row.count },
])}

## Recommended Next Lanes

${markdownTable(report.recommended_next_lanes, [
  { label: 'lane', value: (row) => row.lane },
  { label: 'open rows', value: (row) => row.open_rows },
  { label: 'reason', value: (row) => row.reason },
  { label: 'next action', value: (row) => row.next_action },
])}

## Sample Open Write-Possible Rows

${markdownTable(report.sample_open_write_possible_rows, [
  { label: 'set', value: (row) => row.set_key },
  { label: 'number', value: (row) => row.card_number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'stamp', value: (row) => row.stamp_label ?? row.variant_key },
  { label: 'finish', value: (row) => row.finish_key ?? '(needs finish)' },
  { label: 'bucket', value: (row) => row.execution_bucket },
])}
`;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const sourceQueue = JSON.parse(await fs.readFile(SOURCE_QUEUE, 'utf8'));
  const conflictAdjudication = readJsonIfExists(CONFLICT_ADJUDICATION);
  const adjudicationByKey = new Map((conflictAdjudication?.rows ?? []).map((row) => [conflictAdjudicationKey(row), row]));
  const regionalChampionshipActiveFinish = readJsonIfExists(REGIONAL_CHAMPIONSHIP_ACTIVE_FINISH);
  const regionalChampionshipByCard = new Map(
    (regionalChampionshipActiveFinish?.rows ?? []).map((row) => [cardIdentityKey(row), row]),
  );
  const queueRows = sourceQueue.rows ?? [];
  const setCodes = Array.from(new Set(queueRows.map((row) => row.set_key).filter(Boolean)));

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const liveRows = await fetchLiveRows(client, setCodes);
    const annotatedRows = annotateRows(queueRows, liveRows, adjudicationByKey, regionalChampionshipByCard);
    const liveSatisfiedRows = annotatedRows.filter((row) => row.live_satisfied);
    const openRows = annotatedRows.filter((row) => !row.live_satisfied);
    const openWritePossibleRows = openRows.filter((row) => (
      row.execution_bucket === 'bucket_04_prize_pack_finish_mapping_bulk' ||
      row.execution_bucket === 'bucket_05_variant_family_source_acquisition_bulk' ||
      row.execution_bucket === 'bucket_06_second_source_acquisition_bulk' ||
      row.execution_bucket === 'bucket_07_conflict_adjudication_manual'
    ));

    const recommendedNextLanes = [
      {
        lane: 'league_exact_finish_source',
        open_rows: openRows.filter((row) => row.variant_family === 'league').length,
        reason: 'Largest remaining active-finish source lane after no-write/display-only rows.',
        next_action: 'Acquire exact set+number+name+League Stamp+finish evidence before building a write package.',
      },
      {
        lane: 'prize_pack_finish_mapping',
        open_rows: openRows.filter((row) => row.variant_family === 'prize_pack').length,
        reason: 'Official PDFs and PriceCharting helped, but remaining rows need exact finish mapping.',
        next_action: 'Continue Prize Pack source acquisition; do not infer Standard Set/Foil labels.',
      },
      {
        lane: 'championship_staff_exact_finish_source',
        open_rows: openRows.filter((row) => row.variant_family === 'championship_or_staff').length,
        reason: 'High collector value and meaningful stamped identities.',
        next_action: 'Acquire event/staff source evidence with exact active finish.',
      },
    ].filter((row) => row.open_rows > 0);

    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_stamped_special_live_residual_queue_v1',
      source_artifact: path.relative(ROOT, SOURCE_QUEUE).replaceAll(path.sep, '/'),
      source_fingerprint_sha256: proofHash(sourceQueue),
      fingerprint_sha256: proofHash({
        source_fingerprint: proofHash(sourceQueue),
        open_rows: openRows.map((row) => ({
          set_key: row.set_key,
          card_number: row.card_number,
          card_name: row.card_name,
          variant_key: row.variant_key,
          effective_variant_key: row.effective_variant_key,
          stamp_label: row.stamp_label,
          finish_key: row.finish_key,
          effective_finish_key: row.effective_finish_key,
          execution_bucket: row.execution_bucket,
          live_parent_present: row.live_parent_present,
          live_child_present: row.live_child_present,
        })),
      }),
      summary: {
        source_queue_rows: queueRows.length,
        live_satisfied_rows: liveSatisfiedRows.length,
        remaining_open_rows: openRows.length,
        remaining_write_possible_rows: openWritePossibleRows.length,
        remaining_no_write_or_blocked_rows: openRows.length - openWritePossibleRows.length,
        satisfied_by_execution_bucket: countBy(liveSatisfiedRows, (row) => row.execution_bucket),
        open_by_execution_bucket: countBy(openRows, (row) => row.execution_bucket),
        open_by_variant_family: countBy(openRows, (row) => row.variant_family),
        top_open_sets: topEntries(countBy(openRows, (row) => row.set_key), 30),
      },
      recommended_next_lanes: recommendedNextLanes,
      sample_open_write_possible_rows: openWritePossibleRows.slice(0, 50),
      open_rows: openRows,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
    };

    await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll(path.sep, '/'),
      output_md: path.relative(ROOT, OUTPUT_MD).replaceAll(path.sep, '/'),
      fingerprint_sha256: report.fingerprint_sha256,
      summary: report.summary,
      recommended_next_lanes: report.recommended_next_lanes,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
