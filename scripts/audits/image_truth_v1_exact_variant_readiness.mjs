import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_exact_variant_readiness_v1.md');
const LANES_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_source_lanes_v1.json');
const LANES_MD = path.join(OUTPUT_DIR, 'image_truth_exact_variant_source_lanes_v1.md');

const FIXTURE_DIRS = [
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_binderbuilder_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_card_pages_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_stamped_finish_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_manual_web_exact_finish_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokellector_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_base_product_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_csv_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_promo_exact_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_reverseholo_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_reverseholo_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcollector_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_identity_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgplayer_price_guide_preservation_v1',
];

const VISUALLY_DISTINCT_FINISHES = new Set([
  'reverse',
  'reverse_holo',
  'pokeball',
  'poke_ball_reverse',
  'masterball',
  'master_ball_reverse',
  'rocket_reverse',
  'cosmos',
  'cosmos_holo',
  'cracked_ice',
  'stamped',
]);
const FINISH_REVIEW_FINISHES = new Set(['holo']);
const NORMALISH_FINISHES = new Set(['normal', 'standard']);
const NON_MEANINGFUL_MODIFIERS = new Set(['', 'base', 'default', 'normal', 'standard', 'none']);
const STAMP_OR_MODIFIER_PATTERN = /(stamp|stamped|staff|league|winner|prerelease|pokemon_together|play_pokemon|first_edition|1st_edition|championship|professor|pokemon_center|eb_games|gamestop)/i;

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function normalizeFinish(value) {
  const normalized = normalizeKey(value);
  if (normalized === 'reverse_holo') return 'reverse';
  if (normalized === 'cosmos_holo') return 'cosmos';
  if (normalized === 'poke_ball_reverse') return 'pokeball';
  if (normalized === 'master_ball_reverse') return 'masterball';
  return normalized;
}

function hasImage(row, prefix) {
  return Boolean(clean(row[`${prefix}_image_path`]) || clean(row[`${prefix}_image_url`]) || clean(row[`${prefix}_image_alt_url`]));
}

function hasRepresentativeImage(row) {
  return Boolean(clean(row.parent_representative_image_url));
}

function isEnglishPhysical(row) {
  const setCode = clean(row.set_code);
  if (!setCode) return false;
  const source = row.set_source && typeof row.set_source === 'object' ? row.set_source : {};
  const domain = normalizeKey(source.domain);
  const identityDomain = normalizeKey(row.set_identity_domain_default);
  if (
    source.digital_only === true ||
    source.exclude_from_physical_pipelines === true ||
    domain === 'tcg_pocket' ||
    identityDomain === 'tcg_pocket_excluded'
  ) return false;
  return identityDomain.startsWith('pokemon_eng');
}

function isModifierVisuallyDistinct(row) {
  const values = [row.variant_key, row.printed_identity_modifier, row.parent_gv_id, row.card_name].map(normalizeKey);
  return values.some((value) => value && !NON_MEANINGFUL_MODIFIERS.has(value) && STAMP_OR_MODIFIER_PATTERN.test(value));
}

function requiresExactChildImage(row) {
  const finishKey = normalizeFinish(row.finish_key);
  if (VISUALLY_DISTINCT_FINISHES.has(finishKey)) return true;
  if (!NORMALISH_FINISHES.has(finishKey) && !FINISH_REVIEW_FINISHES.has(finishKey) && finishKey !== '') return true;
  return isModifierVisuallyDistinct(row);
}

function matchKey(setKey, number, name, finish) {
  return [String(setKey ?? '').toLowerCase(), normalizeNumber(number), normalizeText(name), normalizeFinish(finish)].join('|');
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function listJsonFiles(dir) {
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(fullPath);
  }
  return files;
}

function extractRecords(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.records)) return json.records;
  if (Array.isArray(json.rows)) return json.rows;
  if (Array.isArray(json.evidence_rows)) return json.evidence_rows;
  if (Array.isArray(json.fixtures)) return json.fixtures;
  if (json.source_url && (json.card_number || json.card_name)) return [json];
  return [];
}

async function loadSourceRecords() {
  const files = [...new Set((await Promise.all(FIXTURE_DIRS.map(listJsonFiles))).flat())];
  const records = [];
  for (const file of files) {
    let json;
    try {
      json = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      continue;
    }
    for (const record of extractRecords(json)) {
      const sourceUrl = clean(record.source_url ?? json.source_url);
      const setKey = clean(record.set_key ?? record.set_code ?? json.set_key);
      const cardNumber = clean(record.card_number ?? record.number);
      const cardName = clean(record.card_name ?? record.name);
      const finishKey = clean(record.finish_key);
      const evidenceType = clean(record.evidence_type);
      if (!sourceUrl || !setKey || !cardNumber || !cardName || !finishKey) continue;
      if (evidenceType && !['finish_presence', 'checklist_entry', 'parallel_rule'].includes(evidenceType)) continue;
      records.push({
        fixture_file: file.replaceAll('\\', '/'),
        source_key: clean(record.source_key ?? json.source_key) ?? 'unknown',
        source_kind: clean(record.source_kind ?? json.source_kind) ?? 'unknown',
        source_url: sourceUrl,
        set_key: setKey,
        card_number: cardNumber,
        card_name: cardName,
        finish_key: finishKey,
        evidence_type: evidenceType ?? 'finish_presence',
        evidence_label: clean(record.evidence_label),
        raw_snapshot_ref: clean(record.raw_snapshot_ref),
        match_key: matchKey(setKey, cardNumber, cardName, finishKey),
      });
    }
  }
  return records;
}

function classifySource(record) {
  const key = String(record.source_key ?? '').toLowerCase();
  const url = String(record.source_url ?? '').toLowerCase();
  if (key.includes('pricecharting') || url.includes('pricecharting.com/game/')) {
    return {
      readiness_lane: 'exact_asset_probe_candidate',
      image_truth_limit: 'potential_exact_if_page_image_alt_matches_exact_card_finish',
      reason: 'PriceCharting product pages can expose a product image with exact alt/title evidence, but each asset must be probed before promotion.',
    };
  }
  if (key.includes('cardtrader') || url.includes('cardtrader.com/')) {
    return {
      readiness_lane: 'representative_only_unless_visual_manually_verified',
      image_truth_limit: 'representative',
      reason: 'CardTrader blueprint images are useful display coverage, but visual finish texture is not automatically proven.',
    };
  }
  if (key.includes('reverseholo') || url.includes('reverseholo.app/')) {
    return {
      readiness_lane: 'representative_only_unless_rendered_overlay_captured',
      image_truth_limit: 'representative',
      reason: 'ReverseHolo proves checklist finish facts; raw linked images may not contain the rendered finish overlay.',
    };
  }
  if (key.includes('tcgcsv') || key.includes('tcgplayer') || url.includes('tcgplayer.com/')) {
    return {
      readiness_lane: 'representative_only_unless_visual_manually_verified',
      image_truth_limit: 'representative',
      reason: 'TCGplayer catalog/product images are product-associated but not automatically exact finish visual proof.',
    };
  }
  if (key.includes('official') || url.includes('pokemon.com/')) {
    return {
      readiness_lane: 'base_display_only_for_parallel_rows',
      image_truth_limit: 'representative',
      reason: 'Official card pages provide safe card display images, not exact parallel/stamp visuals for these variant rows.',
    };
  }
  return {
    readiness_lane: 'source_evidence_available_no_exact_asset_extractor',
    image_truth_limit: 'unknown',
    reason: 'Source proves or supports finish existence, but no exact visual extraction rule is approved.',
  };
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function loadBacklogRows() {
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.image_path as child_image_path,
        cpi.image_url as child_image_url,
        cpi.image_alt_url as child_image_alt_url,
        cpi.image_status as child_image_status,
        cp.set_code,
        cp.name as card_name,
        cp.number,
        cp.printed_identity_modifier,
        cp.variant_key,
        cp.gv_id as parent_gv_id,
        cp.image_path as parent_image_path,
        cp.image_url as parent_image_url,
        cp.image_alt_url as parent_image_alt_url,
        cp.representative_image_url as parent_representative_image_url,
        s.source as set_source,
        s.identity_domain_default as set_identity_domain_default
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      left join public.sets s on s.code = cp.set_code
    `);
    return result.rows.filter((row) => {
      if (!isEnglishPhysical(row)) return false;
      if (!requiresExactChildImage(row)) return false;
      if (hasImage(row, 'child')) return false;
      return hasImage(row, 'parent') || hasRepresentativeImage(row);
    });
  } finally {
    await client.end();
  }
}

function buildMarkdown(report) {
  const probeRows = report.pricecharting_probe_candidates.slice(0, 40);
  const blockedRows = report.representative_only_examples.slice(0, 40);
  return `# Image Truth Exact Variant Readiness V1

Generated: ${report.generated_at}

This is read-only. It does not upload images, update database rows, create migrations, clean up, quarantine, or change image confidence.

## Summary

- exact_variant_backlog_rows: ${report.exact_variant_backlog_rows}
- exact_asset_probe_candidate_rows: ${report.summary.by_readiness_lane.exact_asset_probe_candidate ?? 0}
- representative_only_or_blocked_rows: ${report.exact_variant_backlog_rows - (report.summary.by_readiness_lane.exact_asset_probe_candidate ?? 0)}
- rows_without_source_evidence: ${report.summary.by_readiness_lane.no_source_evidence_available ?? 0}
- db_writes_performed: false
- migrations_created: false

## By Finish

${markdownTable(Object.entries(report.summary.by_finish).map(([finish, count]) => ({ finish, count })), [
  { label: 'finish', value: (row) => row.finish },
  { label: 'rows', value: (row) => row.count },
])}

## By Readiness Lane

${markdownTable(Object.entries(report.summary.by_readiness_lane).map(([lane, count]) => ({ lane, count })), [
  { label: 'lane', value: (row) => row.lane },
  { label: 'rows', value: (row) => row.count },
])}

## PriceCharting Exact Probe Candidates

These are not approved for apply. They are candidates for a future probe that must fetch the page, verify exact title/alt text, hash the asset, dry-run the child update, and only then request approval.

${markdownTable(probeRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'source', value: (row) => row.best_source?.source_url },
])}

## Representative-Only Examples

These rows have display coverage but no approved exact visual source. They should remain honestly labeled as missing exact variant visual until better evidence is acquired.

${markdownTable(blockedRows, [
  { label: 'lane', value: (row) => row.readiness_lane },
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'reason', value: (row) => row.readiness_reason },
])}

## Honesty Rule

If an image source cannot prove the exact finish, stamp, parallel, or variant visual, Grookai keeps the row display-covered but not exact. The user-facing state should be equivalent to: "This is the correct printing, but the image is representative and may not show the exact variant visual."
`;
}

function buildLaneMarkdown(report) {
  const sourceRows = report.source_evidence_available_no_exact_asset_extractor.slice(0, 80);
  const visualRows = report.representative_only_unless_visual_manually_verified.slice(0, 80);
  const missingRows = report.no_source_evidence_available.slice(0, 80);
  return `# Image Truth Exact Variant Source Lanes V1

Generated: ${report.generated_at}

This is read-only. It does not upload images, update database rows, create migrations, clean up, quarantine, or change image confidence.

## Summary

- exact_variant_backlog_rows: ${report.exact_variant_backlog_rows}
- db_writes_performed: false
- migrations_created: false
- parent_overwrite_allowed: false

## Source Lane Counts

${markdownTable(Object.entries(report.by_readiness_lane).map(([lane, count]) => ({ lane, count })), [
  { label: 'lane', value: (row) => row.lane },
  { label: 'rows', value: (row) => row.count },
])}

## Source Evidence With No Exact Extractor

These rows have source evidence for the finish/variant fact, but no approved exact visual extractor. They are candidates for future source-adapter design, not direct promotion.

${markdownTable(sourceRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'source', value: (row) => row.best_source?.source_key },
  { label: 'url', value: (row) => row.best_source?.source_url },
])}

## Visual Manual Verification Lane

These rows have source-associated images that may be useful, but require visual/manual confirmation before exact promotion.

${markdownTable(visualRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'source', value: (row) => row.best_source?.source_key },
  { label: 'url', value: (row) => row.best_source?.source_url },
])}

## No Source Evidence Sample

These remain honest representative/missing-variant rows until new evidence is acquired.

${markdownTable(missingRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
])}
`;
}

async function main() {
  const [backlogRows, sourceRecords] = await Promise.all([loadBacklogRows(), loadSourceRecords()]);
  const sourceIndex = new Map();
  for (const record of sourceRecords) {
    const bucket = sourceIndex.get(record.match_key) ?? [];
    bucket.push(record);
    sourceIndex.set(record.match_key, bucket);
  }

  const rows = backlogRows.map((row) => {
    const sources = sourceIndex.get(matchKey(row.set_code, row.number, row.card_name, row.finish_key)) ?? [];
    const classifiedSources = sources.map((source) => ({ ...source, ...classifySource(source) }));
    const pricecharting = classifiedSources.find((source) => source.readiness_lane === 'exact_asset_probe_candidate');
    const bestSource = pricecharting ?? classifiedSources[0] ?? null;
    const classification = bestSource
      ? classifySource(bestSource)
      : {
          readiness_lane: 'no_source_evidence_available',
          image_truth_limit: 'missing_source',
          reason: 'No preserved source evidence matched set + number + name + finish.',
        };
    return {
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      printed_identity_modifier: row.printed_identity_modifier,
      variant_key: row.variant_key,
      readiness_lane: classification.readiness_lane,
      image_truth_limit: classification.image_truth_limit,
      readiness_reason: classification.reason,
      source_count: sources.length,
      best_source: bestSource ? {
        source_key: bestSource.source_key,
        source_kind: bestSource.source_kind,
        source_url: bestSource.source_url,
        evidence_label: bestSource.evidence_label,
        fixture_file: bestSource.fixture_file,
      } : null,
      sources: classifiedSources.slice(0, 5),
    };
  });

  const pricechartingProbeCandidates = rows
    .filter((row) => row.readiness_lane === 'exact_asset_probe_candidate')
    .sort((a, b) => String(a.set_code).localeCompare(String(b.set_code)) || String(a.number).localeCompare(String(b.number)));
  const representativeOnlyExamples = rows
    .filter((row) => row.readiness_lane !== 'exact_asset_probe_candidate')
    .sort((a, b) => String(a.readiness_lane).localeCompare(String(b.readiness_lane)) || String(a.set_code).localeCompare(String(b.set_code)))
    .slice(0, 500);
  const lanes = {
    exact_asset_probe_candidate: pricechartingProbeCandidates,
    source_evidence_available_no_exact_asset_extractor: rows.filter((row) => row.readiness_lane === 'source_evidence_available_no_exact_asset_extractor'),
    representative_only_unless_visual_manually_verified: rows.filter((row) => row.readiness_lane === 'representative_only_unless_visual_manually_verified'),
    representative_only_unless_rendered_overlay_captured: rows.filter((row) => row.readiness_lane === 'representative_only_unless_rendered_overlay_captured'),
    no_source_evidence_available: rows.filter((row) => row.readiness_lane === 'no_source_evidence_available'),
  };

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    exact_variant_backlog_rows: rows.length,
    source_records_loaded: sourceRecords.length,
    summary: {
      by_finish: countBy(rows, (row) => row.finish_key),
      by_set_top_40: Object.fromEntries(Object.entries(countBy(rows, (row) => row.set_code)).slice(0, 40)),
      by_readiness_lane: countBy(rows, (row) => row.readiness_lane),
      pricecharting_probe_candidates_by_finish: countBy(pricechartingProbeCandidates, (row) => row.finish_key),
    },
    pricecharting_probe_candidates: pricechartingProbeCandidates,
    representative_only_examples: representativeOnlyExamples,
  };
  const laneReport = {
    generated_at: report.generated_at,
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    exact_variant_backlog_rows: rows.length,
    by_readiness_lane: report.summary.by_readiness_lane,
    by_source_key: countBy(rows.filter((row) => row.best_source), (row) => row.best_source.source_key),
    by_source_kind: countBy(rows.filter((row) => row.best_source), (row) => row.best_source.source_kind),
    ...lanes,
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  await fs.writeFile(LANES_JSON, `${JSON.stringify(laneReport, null, 2)}\n`);
  await fs.writeFile(LANES_MD, buildLaneMarkdown(laneReport));
  console.log(JSON.stringify({
    generated: [OUTPUT_JSON, OUTPUT_MD, LANES_JSON, LANES_MD],
    exact_variant_backlog_rows: report.exact_variant_backlog_rows,
    by_readiness_lane: report.summary.by_readiness_lane,
    pricecharting_probe_candidates: report.pricecharting_probe_candidates.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
