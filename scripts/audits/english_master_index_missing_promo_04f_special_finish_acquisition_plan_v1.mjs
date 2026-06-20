import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'remaining_special_gap_source_acquisition_v1.json');
const COMPLETION_JSON = path.join(AUDIT_DIR, 'special_parent_child_completion_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'special_finish_acquisition_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'special_finish_acquisition_plan_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04F-SPECIAL-FINISH-ACQUISITION-PLAN';

const SOURCE_ROUTE_BY_FAMILY = {
  prerelease_stamp: {
    route: 'bulbapedia_prerelease_plus_marketplace_exact_product',
    source_families: ['Bulbapedia card release pages', 'TCGplayer product pages', 'PriceCharting product pages', 'CardTrader exact products'],
    acceptance_rule: 'Exact set + card number + name + prerelease/staff stamp + active finish text.',
  },
  staff_stamp: {
    route: 'bulbapedia_staff_plus_marketplace_exact_product',
    source_families: ['Bulbapedia card release pages', 'TCGplayer product pages', 'PriceCharting product pages', 'CardTrader exact products'],
    acceptance_rule: 'Exact staff/prerelease stamp and finish; no generic staff stamp without finish.',
  },
  championship_stamp: {
    route: 'bulbapedia_championship_plus_marketplace_exact_product',
    source_families: ['Bulbapedia miscellaneous promo pages', 'PSA/auction archives', 'TCGplayer product pages', 'PriceCharting product pages'],
    acceptance_rule: 'Exact City/State/National/Regional championship stamp plus active finish.',
  },
  winner_stamp: {
    route: 'battle_road_winner_marketplace_exact_product',
    source_families: ['Bulbapedia miscellaneous promo pages', 'PSA/auction archives', 'TCGplayer product pages', 'PriceCharting product pages'],
    acceptance_rule: 'Exact Winner/Battle Road stamp and active finish.',
  },
  battle_road_stamp: {
    route: 'battle_road_marketplace_exact_product',
    source_families: ['Bulbapedia miscellaneous promo pages', 'PSA/auction archives', 'TCGplayer product pages', 'PriceCharting product pages'],
    acceptance_rule: 'Exact Battle Road stamp and active finish.',
  },
  league_stamp: {
    route: 'pokemon_league_exact_product',
    source_families: ['Bulbapedia Pokemon League pages', 'TCGplayer product pages', 'PriceCharting product pages', 'Cardmarket/CardTrader exact products'],
    acceptance_rule: 'Exact League stamp and active finish.',
  },
  worlds_stamp: {
    route: 'world_championship_archive_exact_product',
    source_families: ['Bulbapedia World Championships pages', 'PSA/auction archives', 'TCGplayer product pages'],
    acceptance_rule: 'Exact Worlds stamp and active finish.',
  },
  wotc_stamp: {
    route: 'wotc_stamp_exact_product',
    source_families: ['TCGCollector variant page', 'TCGplayer product pages', 'PriceCharting product pages', 'PkmnCards notes'],
    acceptance_rule: 'Exact WOTC stamp and active finish.',
  },
  other_stamp: {
    route: 'variant_family_identification_first',
    source_families: ['existing provenance labels', 'Variant Origin Index', 'TCGplayer exact product pages', 'Bulbapedia card release pages'],
    acceptance_rule: 'First identify stamp family; then require exact finish evidence before child insert.',
  },
  other_variant_or_modifier: {
    route: 'manual_variant_family_governance',
    source_families: ['existing provenance labels', 'collector reference pages', 'auction archives'],
    acceptance_rule: 'Govern variant family before finish acquisition.',
  },
};

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function rowsForFamily(rows, family) {
  return rows.filter((row) => row.family === family);
}

function priorityForFamily(family, rows) {
  const withEvidence = rows.filter((row) => Number(row.evidence_url_count ?? 0) > 0).length;
  const count = rows.length;
  if (family === 'wotc_stamp') return 1;
  if (withEvidence > 0 && count <= 25) return 2;
  if (['winner_stamp', 'battle_road_stamp', 'worlds_stamp', 'league_stamp', 'championship_stamp', 'staff_stamp'].includes(family)) return 3;
  if (family === 'prerelease_stamp') return 4;
  if (family === 'other_stamp') return 5;
  return 6;
}

function buildFamilyPlan(rows) {
  const families = Object.keys(countBy(rows, (row) => row.family));
  return families.map((family) => {
    const familyRows = rowsForFamily(rows, family);
    const withEvidence = familyRows.filter((row) => Number(row.evidence_url_count ?? 0) > 0);
    const route = SOURCE_ROUTE_BY_FAMILY[family] ?? SOURCE_ROUTE_BY_FAMILY.other_variant_or_modifier;
    return {
      family,
      priority: priorityForFamily(family, familyRows),
      rows: familyRows.length,
      rows_with_existing_evidence_urls: withEvidence.length,
      rows_without_existing_evidence_urls: familyRows.length - withEvidence.length,
      top_sets: Object.entries(countBy(familyRows, (row) => row.set_code))
        .sort(([, left], [, right]) => right - left)
        .slice(0, 10)
        .map(([set_code, count]) => ({ set_code, count })),
      route: route.route,
      source_families: route.source_families,
      acceptance_rule: route.acceptance_rule,
      recommended_next_action: withEvidence.length
        ? 'Start with existing evidence URLs and extract exact finish labels only.'
        : 'Acquire exact source pages before any child-printing dry-run.',
      sample_rows: familyRows.slice(0, 20),
    };
  }).sort((left, right) => left.priority - right.priority || right.rows_with_existing_evidence_urls - left.rows_with_existing_evidence_urls || right.rows - left.rows);
}

function buildCandidateQueue(rows) {
  return rows
    .map((row) => {
      const familyRows = rowsForFamily(rows, row.family);
      const priority = priorityForFamily(row.family, familyRows);
      const hasEvidence = Number(row.evidence_url_count ?? 0) > 0;
      return {
        priority,
        parent_id: row.parent_id,
        set_code: row.set_code,
        number: row.number,
        name: row.name,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
        gv_id: row.gv_id,
        family: row.family,
        acquisition_bucket: row.acquisition_bucket,
        evidence_url_count: row.evidence_url_count,
        evidence_urls: row.evidence_urls,
        route: SOURCE_ROUTE_BY_FAMILY[row.family]?.route ?? SOURCE_ROUTE_BY_FAMILY.other_variant_or_modifier.route,
        first_action: hasEvidence ? 'extract_exact_finish_from_existing_sources' : 'find_two_exact_sources',
      };
    })
    .sort((left, right) => left.priority - right.priority || right.evidence_url_count - left.evidence_url_count || left.set_code.localeCompare(right.set_code) || String(left.number).localeCompare(String(right.number)));
}

function renderMarkdown(report) {
  return [
    '# Special Finish Acquisition Plan V1',
    '',
    'Read-only plan for the remaining childless special/stamped parent rows. This does not write to the database, create migrations, insert child printings, or promote any finish claims.',
    '',
    '## Safety',
    '',
    markdownTable(
      ['check', 'value'],
      [
        ['db_writes_performed', String(report.db_writes_performed)],
        ['migrations_created', String(report.migrations_created)],
        ['cleanup_performed', String(report.cleanup_performed)],
        ['real_apply_performed', String(report.real_apply_performed)],
      ],
    ),
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['remaining_childless_special_parent_rows', report.summary.remaining_childless_special_parent_rows],
        ['ready_child_printing_rows_now', report.summary.ready_child_printing_rows_now],
        ['blocked_rows', report.summary.blocked_rows],
        ['rows_with_existing_evidence_urls', report.summary.rows_with_existing_evidence_urls],
        ['rows_without_existing_evidence_urls', report.summary.rows_without_existing_evidence_urls],
      ],
    ),
    '',
    '## Family Execution Plan',
    '',
    markdownTable(
      ['priority', 'family', 'rows', 'with evidence', 'route', 'acceptance rule'],
      report.family_plan.map((row) => [row.priority, row.family, row.rows, row.rows_with_existing_evidence_urls, row.route, row.acceptance_rule]),
    ),
    '',
    '## Recommended Next Move',
    '',
    '- Do not build an apply package yet. Current ready child-printing count is zero.',
    '- Start with the smallest/highest-signal lanes: WOTC stamp, Winner/Battle Road/Worlds, League, Championship, and Staff.',
    '- For each row, require exact set + card number + card name + stamp/variant + active finish evidence.',
    '- Marketplace/title-only evidence is review context unless it explicitly proves the exact finish.',
    '- Generic stamp identity is not enough; exact finish evidence is required before child creation.',
    '',
    '## First 40 Queue Rows',
    '',
    markdownTable(
      ['priority', 'set', 'number', 'name', 'family', 'variant/modifier', 'first action'],
      report.candidate_queue.slice(0, 40).map((row) => [
        row.priority,
        row.set_code,
        row.number,
        row.name,
        row.family,
        row.variant_key || row.printed_identity_modifier || '-',
        row.first_action,
      ]),
    ),
    '',
  ].join('\n');
}

async function main() {
  const [sourceReport, completionReport] = await Promise.all([
    readJson(SOURCE_JSON),
    readJson(COMPLETION_JSON),
  ]);

  const rows = sourceReport.remaining_childless_special_parents ?? [];
  const familyPlan = buildFamilyPlan(rows);
  const candidateQueue = buildCandidateQueue(rows);
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint: sourceReport.source_acquisition_fingerprint_sha256,
    completion_fingerprint: completionReport.package_fingerprint_sha256,
    row_ids: rows.map((row) => row.parent_id).sort(),
    family_plan: familyPlan.map((row) => ({ family: row.family, rows: row.rows, priority: row.priority })),
  }));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_execution_plan',
    fingerprint_sha256: fingerprint,
    input_artifacts: {
      remaining_special_gap_source_acquisition: rel(SOURCE_JSON),
      special_parent_child_completion_guarded_dry_run: rel(COMPLETION_JSON),
    },
    summary: {
      remaining_childless_special_parent_rows: rows.length,
      ready_child_printing_rows_now: completionReport.ready_target_count ?? completionReport.summary?.ready_target_count ?? null,
      blocked_rows: completionReport.blocked_count ?? completionReport.summary?.blocked_count ?? rows.length,
      rows_with_existing_evidence_urls: rows.filter((row) => Number(row.evidence_url_count ?? 0) > 0).length,
      rows_without_existing_evidence_urls: rows.filter((row) => Number(row.evidence_url_count ?? 0) === 0).length,
      by_family: countBy(rows, (row) => row.family),
      by_acquisition_bucket: countBy(rows, (row) => row.acquisition_bucket),
    },
    family_plan: familyPlan,
    candidate_queue: candidateQueue,
    acceptance_contract: {
      required_fields: ['set_code', 'card_number', 'card_name', 'variant_or_stamp', 'finish_key', 'source_url'],
      disallowed: ['finish inference from era', 'generic stamp identity without finish', 'single ambiguous marketplace listing', 'stamped as child finish'],
      allowed_finish_keys: ['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice', 'rocket_reverse', 'poke_ball_reverse', 'master_ball_reverse'],
    },
    recommended_next_package: {
      package_id: 'MISSING-PROMO-04G-SPECIAL-FINISH-SOURCE-EXTRACTION',
      mode: 'read_only_source_extraction',
      scope: 'Extract exact finish claims from existing evidence URLs first; no DB writes.',
      expected_apply_ready_now: false,
    },
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_performed: false,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    fingerprint_sha256: fingerprint,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    summary: report.summary,
    top_family_plan: familyPlan.slice(0, 8).map((row) => ({
      priority: row.priority,
      family: row.family,
      rows: row.rows,
      rows_with_existing_evidence_urls: row.rows_with_existing_evidence_urls,
      route: row.route,
    })),
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
