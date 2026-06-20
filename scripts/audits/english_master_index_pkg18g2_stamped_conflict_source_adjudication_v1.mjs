import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const FIXTURE_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'source_fixtures');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18g2_stamped_conflict_source_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18g2_stamped_conflict_source_adjudication_v1.md');
const OUTPUT_FIXTURE_JSON = path.join(FIXTURE_DIR, 'generated_stamped_conflict_adjudication_v1.json');
const INPUT_CONFLICT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18g_stamped_conflict_manual_closure_v1.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? '')).join(' | ')} |`),
  ].join('\n');
}

const sourceEvidence = [
  {
    set_key: 'bw5',
    set_name: 'Dark Explorers',
    card_number: '25',
    card_name: 'Vaporeon',
    variant_key: 'regional_championships_staff_stamp',
    stamp_label: 'Regional Championships Staff Stamp',
    current_finish_key: 'reverse',
    adjudicated_finish_key: null,
    adjudication_status: 'still_blocked_taxonomy_and_event_label_ambiguity',
    confidence: 'blocked',
    recommendation: 'Do not prepare a write package. Sources disagree or use broad Crosshatch/Holo wording, and some comparable sources are State/Province rather than exact Regional staff.',
    evidence_sources: [
      {
        source_key: 'pokecardvalues_same_finish_ambiguous',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/vaporeon-25-108-reverse-holo-staff-regional-championships-dark-explorers/bw5-25-3-83/',
        evidence_label: 'Vaporeon 25/108 Reverse Holo Staff Regional Championships',
        supports_finish_key: 'reverse',
      },
      {
        source_key: 'pokumon_promo_database',
        source_kind: 'collector_reference',
        source_url: 'https://pokumon.com/card/staff-vaporeon-25-108-regional-championships-special-print/',
        evidence_label: 'Staff Vaporeon Regional Championships Special Print; Crosshatch Holo wording',
        supports_finish_key: 'crosshatch_holo_label',
      },
      {
        source_key: 'pricecharting_product_page',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-dark-explorers/vaporeon-championship-25',
        evidence_label: 'Vaporeon Championship page/sales text uses Holo/Crosshatch wording',
        supports_finish_key: 'crosshatch_holo_label',
      },
      {
        source_key: 'tcgplayer_state_staff_comparable',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/211976/pokemon-league-and-championship-cards-vaporeon-25-108-state-championships-staff',
        evidence_label: 'Comparable State Championships Staff Vaporeon has Reverse Holofoil listing; not exact Regional staff row.',
        supports_finish_key: 'reverse_comparable_not_exact',
      },
    ],
  },
  {
    set_key: 'me02',
    set_name: 'Phantasmal Flames',
    card_number: '026',
    card_name: 'Suicune',
    variant_key: 'gamestop_stamp',
    stamp_label: 'GameStop Stamp',
    current_finish_key: 'holo',
    adjudicated_finish_key: 'cosmos',
    adjudication_status: 'resolved_to_cosmos_future_dry_run_candidate',
    confidence: 'high',
    recommendation: 'Prepare a future guarded dry-run package that treats the GameStop stamped Suicune as cosmos, not plain holo. Do not use the old holo candidate.',
    evidence_sources: [
      {
        source_key: 'tcgplayer_product_page',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/666533/pokemon-miscellaneous-cards-and-products-suicune-cosmos-holo-gamestop-exclusive',
        evidence_label: 'Suicune Cosmos Holo GameStop Exclusive product page',
        supports_finish_key: 'cosmos',
      },
      {
        source_key: 'pricecharting_search_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/search-products?q=suicune&type=prices',
        evidence_label: 'Suicune 026/094 Phantasmal Flames Cosmos Holo [Gamestop]',
        supports_finish_key: 'cosmos',
      },
      {
        source_key: 'tag_grading_pop_report',
        source_kind: 'collector_reference',
        source_url: 'https://my.taggrading.com/pop-report/Pok%C3%A9mon/2025/Pok%C3%A9mon%20Mega%20Evolution/Suicune/026%2F094?grades=10&setName=Phantasmal+Flames+%22GameStop%22+Stamp&variation=Pixel+Cosmos+Holo',
        evidence_label: 'Phantasmal Flames GameStop Stamp Suicune 026/094 Pixel Cosmos Holo',
        supports_finish_key: 'cosmos',
      },
      {
        source_key: 'pokescope_variant_page',
        source_kind: 'collector_reference',
        source_url: 'https://pokescope.app/card/me2-26/',
        evidence_label: 'Previously captured PokeScope GameStop Cosmos Holo observation',
        supports_finish_key: 'cosmos',
      },
    ],
  },
  {
    set_key: 'xy1',
    set_name: 'XY',
    card_number: '085',
    card_name: 'Aegislash',
    variant_key: 'regional_championships_stamp',
    stamp_label: 'Regional Championships Stamp',
    current_finish_key: 'reverse',
    adjudicated_finish_key: 'reverse',
    adjudication_status: 'resolved_to_reverse_future_dry_run_candidate',
    confidence: 'high',
    recommendation: 'Prepare a future guarded dry-run package for Regional Championships Aegislash reverse. PriceCharting crosshatch wording is treated as non-blocking marketplace wording after exact reverse evidence from independent sources.',
    evidence_sources: [
      {
        source_key: 'pokecardvalues_same_finish_ambiguous',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/aegislash-85-146-reverse-holo-regional-championships-xy/xy1-85-3-60/',
        evidence_label: 'Aegislash 85/146 Reverse Holo Regional Championships',
        supports_finish_key: 'reverse',
      },
      {
        source_key: 'tcgplayer_product_page',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/209551/pokemon-league-and-championship-cards-aegislash-85-146-regional-championships',
        evidence_label: 'Aegislash 85/146 Regional Championships Reverse Holofoil',
        supports_finish_key: 'reverse',
      },
      {
        source_key: 'gamenerdz_product_page',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.gamenerdz.com/aegislash-85-146-regional-championships-85-league-championship-cards-reverse-holofoil',
        evidence_label: 'Aegislash 85/146 Regional Championships League Championship Cards Reverse Holofoil',
        supports_finish_key: 'reverse',
      },
      {
        source_key: 'nobleknight_product_page',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.nobleknight.com/P/2148463419/Aegislash---85-146-Regional-Championships-P-085-146-Reverse-Holo',
        evidence_label: 'Aegislash 85/146 Regional Championships Reverse Holo',
        supports_finish_key: 'reverse',
      },
    ],
  },
];

function buildReport() {
  const prior = readJson(INPUT_CONFLICT_JSON);
  const rows = sourceEvidence.map((row) => ({
    ...row,
    source_count: row.evidence_sources.length,
    exact_sources_supporting_adjudicated_finish: row.adjudicated_finish_key
      ? row.evidence_sources.filter((source) => source.supports_finish_key === row.adjudicated_finish_key).length
      : 0,
    write_ready_now: 0,
    dry_run_candidate_after_package_builder: row.adjudication_status.endsWith('future_dry_run_candidate'),
    db_write_authorized: false,
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18g2_stamped_conflict_source_adjudication_v1',
    package_id: 'PKG-18G2-STAMPED-CONFLICT-SOURCE-ADJUDICATION',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      prior_conflict_packet: rel(INPUT_CONFLICT_JSON),
    },
    prior_fingerprint_sha256: prior.fingerprint_sha256,
    summary: {
      conflict_rows_reviewed: rows.length,
      resolved_future_dry_run_candidates: rows.filter((row) => row.dry_run_candidate_after_package_builder).length,
      still_blocked_rows: rows.filter((row) => row.adjudication_status.startsWith('still_blocked')).length,
      write_ready_now: 0,
      by_status: countBy(rows, (row) => row.adjudication_status),
      by_adjudicated_finish: countBy(rows, (row) => row.adjudicated_finish_key),
      by_variant_key: countBy(rows, (row) => row.variant_key),
    },
    rows,
  };

  report.fingerprint_sha256 = crypto
    .createHash('sha256')
    .update(JSON.stringify({
      version: report.version,
      prior_fingerprint_sha256: report.prior_fingerprint_sha256,
      summary: report.summary,
      rows: rows.map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        variant_key: row.variant_key,
        current_finish_key: row.current_finish_key,
        adjudicated_finish_key: row.adjudicated_finish_key,
        adjudication_status: row.adjudication_status,
        evidence_sources: row.evidence_sources.map((source) => ({
          source_key: source.source_key,
          source_url: source.source_url,
          supports_finish_key: source.supports_finish_key,
        })),
      })),
    }))
    .digest('hex');

  return report;
}

function buildFixtureRows(report) {
  return report.rows.flatMap((row) => row.evidence_sources.map((source) => ({
    source_key: source.source_key,
    source_kind: source.source_kind,
    source_url: source.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: source.supports_finish_key,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    evidence_type: row.adjudicated_finish_key && source.supports_finish_key === row.adjudicated_finish_key
      ? 'conflict_adjudication_finish_support'
      : 'conflict_adjudication_review_context',
    evidence_label: source.evidence_label,
    adjudication_status: row.adjudication_status,
    retrieved_at: report.generated_at,
    raw_snapshot_ref: rel(OUTPUT_JSON),
  })));
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# PKG-18G2 Stamped Conflict Source Adjudication V1');
  lines.push('');
  lines.push('Audit-only source-backed adjudication packet for the three remaining stamped/special finish conflicts.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- audit_only: true');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- apply_performed: false');
  lines.push('- cleanup_performed: false');
  lines.push('- write_ready_now: 0');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(table(['metric', 'value'], [
    { metric: 'conflict_rows_reviewed', value: report.summary.conflict_rows_reviewed },
    { metric: 'resolved_future_dry_run_candidates', value: report.summary.resolved_future_dry_run_candidates },
    { metric: 'still_blocked_rows', value: report.summary.still_blocked_rows },
    { metric: 'write_ready_now', value: report.summary.write_ready_now },
    { metric: 'fingerprint_sha256', value: `\`${report.fingerprint_sha256}\`` },
  ]));
  lines.push('');
  lines.push('## Adjudication Results');
  lines.push('');
  lines.push(table(
    ['set_key', 'card_number', 'card_name', 'variant_key', 'current_finish_key', 'adjudicated_finish_key', 'adjudication_status', 'recommendation'],
    report.rows.map((row) => ({
      ...row,
      adjudicated_finish_key: row.adjudicated_finish_key ?? 'blocked',
    })),
  ));
  lines.push('');
  lines.push('## Guardrail');
  lines.push('');
  lines.push('This packet does not authorize DB writes. Rows marked as future dry-run candidates still require a separate guarded package builder, rollback-only dry-run proof, fingerprint confirmation, and explicit approval before real apply.');
  lines.push('');
  return lines.join('\n');
}

const report = buildReport();
fs.mkdirSync(FIXTURE_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUTPUT_MD, writeMarkdown(report));
fs.writeFileSync(OUTPUT_FIXTURE_JSON, `${JSON.stringify({
  generated_at: report.generated_at,
  version: 'generated_stamped_conflict_adjudication_v1',
  audit_only: true,
  db_writes_performed: false,
  source_report: rel(OUTPUT_JSON),
  rows: buildFixtureRows(report),
}, null, 2)}\n`);
console.log(JSON.stringify({
  output_json: rel(OUTPUT_JSON),
  output_md: rel(OUTPUT_MD),
  output_fixture_json: rel(OUTPUT_FIXTURE_JSON),
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
}, null, 2));
