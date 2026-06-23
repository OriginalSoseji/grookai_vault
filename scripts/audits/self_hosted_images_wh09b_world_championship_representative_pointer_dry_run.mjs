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
const WCD_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_SUMMARY_JSON = path.join(WCD_DIR, 'world_championship_decks_09c_translation_dry_run_summary_v1.json');
const SOURCE_CARDS_JSONL = path.join(WCD_DIR, 'world_championship_decks_09c_proposed_card_prints_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh09b_world_championship_representative_pointer_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh09b_world_championship_representative_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh09b_world_championship_representative_pointer_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-09B-WORLD-CHAMPIONSHIP-REPRESENTATIVE-POINTER-DRY-RUN';
const FUTURE_APPLY_PACKAGE_ID = 'IMG-HOST-WH-09C-WORLD-CHAMPIONSHIP-REPRESENTATIVE-POINTER-APPLY';
const SOURCE_TRANSLATION_FINGERPRINT = 'da7a18fb284b6ba18078a64868c6375a5e15145d37392b4c92da788de69e0594';

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

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/pokemon/g, 'pokemon')
    .replace(/&/g, ' and ')
    .replace(/\bex\b/g, ' ')
    .replace(/['`"._]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberPlain(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits || null;
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

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
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

function hasAnyImageField(row, prefix = '') {
  return Boolean(
    clean(row[`${prefix}image_path`])
    || clean(row[`${prefix}image_url`])
    || clean(row[`${prefix}image_alt_url`])
    || clean(row[`${prefix}representative_image_url`])
  );
}

function isSelfHostedPath(value) {
  return clean(value)?.startsWith('warehouse-derived/self-hosted-images-v1/') ?? false;
}

function isWeakImageStatus(value) {
  const normalized = clean(value)?.toLowerCase();
  return !normalized || normalized === 'missing' || normalized === 'unresolved' || normalized === 'blocked';
}

function sourceKey(setName, name, number) {
  return [
    normalizeText(setName),
    normalizeText(name),
    numberPlain(number) ?? '',
  ].join('|');
}

function indexSourceRows(rows) {
  const byId = new Map();
  const byStrictKey = new Map();
  const byLooseKey = new Map();
  for (const row of rows) {
    byId.set(row.id, row);

    const strictKey = sourceKey(row.set_name, row.name, row.number_plain ?? row.number);
    if (!byStrictKey.has(strictKey)) byStrictKey.set(strictKey, []);
    byStrictKey.get(strictKey).push(row);

    const looseKey = [
      normalizeText(row.set_name),
      numberPlain(row.number_plain ?? row.number) ?? '',
    ].join('|');
    if (!byLooseKey.has(looseKey)) byLooseKey.set(looseKey, []);
    byLooseKey.get(looseKey).push(row);
  }
  return { byId, byStrictKey, byLooseKey };
}

function chooseSourceRow(card, indexes) {
  if (clean(card.source_card_print_id)) {
    const byId = indexes.byId.get(card.source_card_print_id);
    if (byId) return { sourceRow: byId, matchKind: 'manifest_source_card_print_id', matchCount: 1 };
  }

  const strictMatches = indexes.byStrictKey.get(sourceKey(card.source_set_name, card.name, card.source_card_number)) ?? [];
  if (strictMatches.length === 1) {
    return { sourceRow: strictMatches[0], matchKind: 'strict_source_set_name_card_name_number', matchCount: 1 };
  }

  const looseKey = [
    normalizeText(card.source_set_name),
    numberPlain(card.source_card_number) ?? '',
  ].join('|');
  const looseMatches = (indexes.byLooseKey.get(looseKey) ?? [])
    .filter((row) => normalizeText(row.name) === normalizeText(card.name));
  if (looseMatches.length === 1) {
    return { sourceRow: looseMatches[0], matchKind: 'loose_source_set_number_name', matchCount: 1 };
  }

  return {
    sourceRow: null,
    matchKind: strictMatches.length > 1 || looseMatches.length > 1 ? 'ambiguous_source_match' : 'no_source_match',
    matchCount: Math.max(strictMatches.length, looseMatches.length),
  };
}

function proposedNote(row) {
  return [
    `Representative image from ordinary source card ${row.source_gv_id} for World Championship Deck display continuity.`,
    `This is not an exact ${row.deck_year} ${row.deck_name} replica image and may omit World Championship back, border, and player signature treatment.`,
    `Prepared by ${PACKAGE_ID}; exact WCD image remains uncataloged.`,
  ].join(' ');
}

function buildPlanRow({ card, currentRow, sourceRow, matchKind }) {
  const currentValues = {
    image_source: clean(currentRow.image_source),
    image_path: clean(currentRow.image_path),
    image_status: clean(currentRow.image_status),
    image_note: clean(currentRow.image_note),
  };
  const preliminary = {
    package_id: FUTURE_APPLY_PACKAGE_ID,
    source_dry_run_package_id: PACKAGE_ID,
    source_translation_fingerprint: SOURCE_TRANSLATION_FINGERPRINT,
    plan_type: 'metadata_pointer_repoint',
    target_table: 'card_prints',
    target_row_id: currentRow.id,
    gv_id: currentRow.gv_id,
    name: currentRow.name,
    set_code: currentRow.set_code,
    set_name: currentRow.set_name,
    number: currentRow.number,
    number_plain: currentRow.number_plain,
    variant_key: currentRow.variant_key,
    deck_year: card.deck_year,
    deck_name: card.deck_name,
    player_name: card.player_name,
    source_set_name: card.source_set_name,
    source_card_number: card.source_card_number,
    source_match_kind: matchKind,
    representative_source_table: 'card_prints',
    representative_source_row_id: sourceRow.id,
    representative_source_gv_id: sourceRow.gv_id,
    representative_source_set_code: sourceRow.set_code,
    representative_source_set_name: sourceRow.set_name,
    source_image_status: sourceRow.image_status,
    source_image_path: sourceRow.image_path,
    current_values: currentValues,
    proposed_values: {
      image_source: 'identity',
      image_path: clean(sourceRow.image_path),
      image_status: 'representative_shared',
      image_note: null,
    },
    exact_image_claim_change: false,
    db_write_performed: false,
    storage_write_performed: false,
    runtime_public_url_field_write_planned: false,
    allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
  };
  preliminary.source_gv_id = sourceRow.gv_id;
  preliminary.proposed_values.image_note = proposedNote(preliminary);
  preliminary.changed_columns = Object.keys(preliminary.proposed_values).filter((key) =>
    clean(preliminary.current_values[key]) !== clean(preliminary.proposed_values[key]));
  delete preliminary.source_gv_id;
  return preliminary;
}

async function loadDbSnapshot(client) {
  const [currentWcd, sourceRows] = await Promise.all([
    client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
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
      where cp.set_code like 'wcd%'
        and cp.variant_key = 'world_championship_deck_replica'
      order by cp.set_code, cp.number_plain nulls last, cp.gv_id
    `),
    client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
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
      where cp.set_code not like 'wcd%'
    `),
  ]);
  return {
    currentWcdRows: currentWcd.rows,
    sourceRows: sourceRows.rows,
  };
}

async function main() {
  const sourceSummary = await readJson(SOURCE_SUMMARY_JSON);
  const sourceCards = await readJsonl(SOURCE_CARDS_JSONL);
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let db;
  try {
    db = await loadDbSnapshot(client);
  } finally {
    await client.end();
  }

  const currentByGvId = new Map(db.currentWcdRows.map((row) => [row.gv_id, row]));
  const sourceIndexes = indexSourceRows(db.sourceRows);
  const missingCurrentRows = [];
  const unmatchedRows = [];
  const ambiguousRows = [];
  const sourceWithoutImageRows = [];
  const sourceWithoutSelfHostedRows = [];
  const alreadyImagedRows = [];
  const candidates = [];

  for (const card of sourceCards) {
    const currentRow = currentByGvId.get(card.proposed_gv_id);
    if (!currentRow) {
      missingCurrentRows.push(card);
      continue;
    }
    if (hasAnyImageField(currentRow) || !isWeakImageStatus(currentRow.image_status)) {
      alreadyImagedRows.push({ card, currentRow });
      continue;
    }

    const match = chooseSourceRow(card, sourceIndexes);
    if (!match.sourceRow) {
      if (match.matchKind === 'ambiguous_source_match') ambiguousRows.push({ card, match_count: match.matchCount });
      else unmatchedRows.push(card);
      continue;
    }
    if (!hasAnyImageField(match.sourceRow)) {
      sourceWithoutImageRows.push({ card, source_row: match.sourceRow, match_kind: match.matchKind });
      continue;
    }
    if (!isSelfHostedPath(match.sourceRow.image_path)) {
      sourceWithoutSelfHostedRows.push({ card, source_row: match.sourceRow, match_kind: match.matchKind });
      continue;
    }
    candidates.push(buildPlanRow({ card, currentRow, sourceRow: match.sourceRow, matchKind: match.matchKind }));
  }

  const effectiveCandidates = candidates.filter((row) => row.changed_columns.length > 0);
  const noOpCandidates = candidates.filter((row) => row.changed_columns.length === 0);
  const stopFindings = [];
  if (sourceSummary.fingerprint !== SOURCE_TRANSLATION_FINGERPRINT) {
    stopFindings.push(`source_translation_fingerprint_mismatch:${sourceSummary.fingerprint}`);
  }
  if (sourceSummary.proposed_card_print_rows !== sourceCards.length) {
    stopFindings.push('source_card_manifest_count_mismatch');
  }
  if (sourceCards.length !== 1944) {
    stopFindings.push(`unexpected_source_card_count:${sourceCards.length}`);
  }
  if (missingCurrentRows.length) {
    stopFindings.push(`missing_current_wcd_rows:${missingCurrentRows.length}`);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, candidates.map((row) => JSON.stringify(row)).join('\n') + (candidates.length ? '\n' : ''), 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    future_apply_package_id: FUTURE_APPLY_PACKAGE_ID,
    source_translation_fingerprint: SOURCE_TRANSLATION_FINGERPRINT,
    source_translation_summary: path.relative(ROOT, SOURCE_SUMMARY_JSON),
    source_cards_jsonl: path.relative(ROOT, SOURCE_CARDS_JSONL),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    source_card_rows: sourceCards.length,
    current_wcd_rows: db.currentWcdRows.length,
    source_snapshot_rows: db.sourceRows.length,
    missing_current_wcd_rows: missingCurrentRows.length,
    already_imaged_or_nonweak_wcd_rows: alreadyImagedRows.length,
    unmatched_source_rows: unmatchedRows.length,
    ambiguous_source_rows: ambiguousRows.length,
    source_rows_without_any_image_field: sourceWithoutImageRows.length,
    source_rows_without_self_hosted_path: sourceWithoutSelfHostedRows.length,
    representative_candidate_rows: candidates.length,
    effective_metadata_pointer_updates: effectiveCandidates.length,
    no_op_candidate_rows: noOpCandidates.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    child_writes_performed: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    planned_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
    candidate_set_codes: countBy(candidates, (row) => row.set_code),
    candidate_deck_years: countBy(candidates, (row) => String(row.deck_year)),
    source_match_kinds: countBy(candidates, (row) => row.source_match_kind),
    proposed_image_sources: countBy(candidates, (row) => row.proposed_values.image_source),
    proposed_image_statuses: countBy(candidates, (row) => row.proposed_values.image_status),
    changed_column_sets: countBy(candidates, (row) => row.changed_columns.join(',') || 'no_op'),
    unmatched_by_source_set_name: countBy(unmatchedRows, (row) => row.source_set_name ?? 'unknown'),
    source_without_self_hosted_by_status: countBy(sourceWithoutSelfHostedRows, (row) => row.source_row.image_status ?? 'null'),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0 && effectiveCandidates.length > 0,
    samples: {
      representative_candidate_rows: candidates.slice(0, 20).map((row) => ({
        gv_id: row.gv_id,
        set_code: row.set_code,
        name: row.name,
        source_gv_id: row.representative_source_gv_id,
        source_set_code: row.representative_source_set_code,
        source_match_kind: row.source_match_kind,
      })),
      unmatched_source_rows: unmatchedRows.slice(0, 30),
      ambiguous_source_rows: ambiguousRows.slice(0, 30),
      source_rows_without_self_hosted_path: sourceWithoutSelfHostedRows.slice(0, 30).map((row) => ({
        gv_id: row.card.proposed_gv_id,
        source_gv_id: row.source_row.gv_id,
        source_image_status: row.source_row.image_status,
        source_image_path: row.source_row.image_path,
      })),
    },
  };

  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    future_apply_package_id: summary.future_apply_package_id,
    source_translation_fingerprint: summary.source_translation_fingerprint,
    source_card_rows: summary.source_card_rows,
    representative_candidate_rows: summary.representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
    proposed_image_sources: summary.proposed_image_sources,
    proposed_image_statuses: summary.proposed_image_statuses,
    plan_rows: candidates.map((row) => ({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      representative_source_row_id: row.representative_source_row_id,
      representative_source_gv_id: row.representative_source_gv_id,
      proposed_values: row.proposed_values,
      changed_columns: row.changed_columns,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Future apply package: \`${summary.future_apply_package_id}\`
- Source translation fingerprint: \`${summary.source_translation_fingerprint}\`
- Source card rows: ${summary.source_card_rows}
- Current WCD rows: ${summary.current_wcd_rows}
- Missing current WCD rows: ${summary.missing_current_wcd_rows}
- Already imaged or non-weak WCD rows: ${summary.already_imaged_or_nonweak_wcd_rows}
- Unmatched source rows: ${summary.unmatched_source_rows}
- Ambiguous source rows: ${summary.ambiguous_source_rows}
- Source rows without any image field: ${summary.source_rows_without_any_image_field}
- Source rows without self-hosted path: ${summary.source_rows_without_self_hosted_path}
- Representative candidate rows: ${summary.representative_candidate_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Child writes performed: ${summary.child_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}

## Finding

This plan uses ordinary source-card self-hosted images only as representative display images for World Championship Deck replica rows. It does not claim exact WCD imagery. The notes explicitly call out that true WCD visuals can differ by World Championship back, border treatment, and player signature.

## Proposed Image Statuses

${markdownTable(topEntries(summary.proposed_image_statuses))}

## Source Match Kinds

${markdownTable(topEntries(summary.source_match_kinds))}

## Candidate Years

${markdownTable(topEntries(summary.candidate_deck_years, 30))}

## Largest Candidate Sets

${markdownTable(topEntries(summary.candidate_set_codes, 60))}

## Changed Column Sets

${markdownTable(topEntries(summary.changed_column_sets))}

## Unmatched Source Sets

${markdownTable(topEntries(summary.unmatched_by_source_set_name, 40))}

## Apply Boundary

A future apply package, if approved, should update only \`card_prints.image_source\`, \`card_prints.image_path\`, \`card_prints.image_status\`, and \`card_prints.image_note\` for the candidate rows in \`${path.relative(ROOT, PLAN_JSONL)}\`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, deletes, merges, migrations, or exact-image claims.
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    representative_candidate_rows: summary.representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    unmatched_source_rows: summary.unmatched_source_rows,
    source_rows_without_self_hosted_path: summary.source_rows_without_self_hosted_path,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
