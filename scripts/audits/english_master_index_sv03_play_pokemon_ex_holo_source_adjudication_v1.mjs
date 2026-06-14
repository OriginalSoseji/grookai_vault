import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const REPORT_DIR = path.join(SOURCE_DIR, 'sv03_play_pokemon_ex_holo_source_adjudication_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_collision_audit_v1.json');
const OUTPUT_JSON = path.join(REPORT_DIR, 'sv03_play_pokemon_ex_holo_source_adjudication_v1.json');
const OUTPUT_MD = path.join(REPORT_DIR, 'sv03_play_pokemon_ex_holo_source_adjudication_v1.md');
const MIRROR_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_source_adjudication_v1.json');
const MIRROR_MD = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_source_adjudication_v1.md');

const PACKAGE_ID = 'SV03-PLAY-POKEMON-EX-HOLO-SOURCE-ADJUDICATION-V1';
const EXPECTED_TARGETS = new Map([
  ['22|toedscruel ex', {
    source_url_pokumon: 'https://pokumon.com/card/holofoil-play-pokemon-toedscruel-ex-022-197-play-pokemon-prize-pack-series-4-special-print/',
    source_url_tcgplayer: 'https://www.tcgplayer.com/product/538743/pokemon-prize-pack-series-cards-toedscruel-ex',
    source_url_ebay_product: 'https://www.ebay.com/p/19067890392',
    pokumon_label: 'Holofoil Play Pokemon Toedscruel ex (022/197 Play Pokemon Prize Pack Series 4 Special Print)',
    marketplace_label: 'Toedscruel ex - Prize Pack Series Cards / 022/197 / Double Rare / Holofoil',
  }],
  ['66|tyranitar ex', {
    source_url_pokumon: 'https://pokumon.com/card/holofoil-play-pokemon-tyranitar-ex-066-197-play-pokemon-prize-pack-series-4-special-print/',
    source_url_tcgplayer: 'https://www.tcgplayer.com/product/538744/pokemon-prize-pack-series-cards-tyranitar-ex',
    source_url_ebay_product: 'https://www.ebay.com/p/7067898600',
    pokumon_label: 'Holofoil Play Pokemon Tyranitar ex (066/197 Play Pokemon Prize Pack Series 4 Special Print)',
    marketplace_label: 'Tyranitar ex - Prize Pack Series Cards / 066/197 / Double Rare / Holofoil',
  }],
]);

const BULBAPEDIA_URL = 'https://bulbapedia.bulbagarden.net/wiki/Obsidian_Flames_(TCG)';
const TCGCOLLECTOR_URL = 'https://www.tcgcollector.com/sets/1220/play-pokemon-prize-pack-series-four';

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

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function keyFor(row) {
  return `${Number(row.source_number_plain ?? row.source_card_number)}|${normalizeName(row.card_name)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function buildEvidenceRows(target) {
  const expected = EXPECTED_TARGETS.get(keyFor(target));
  if (!expected) return [];
  return [
    {
      source_key: 'pokumon',
      source_kind: 'collector_reference',
      source_url: expected.source_url_pokumon,
      evidence_type: 'finish_presence',
      evidence_label: expected.pokumon_label,
      proves_exact_finish: true,
      proves_exact_stamp_identity: true,
      proves_exact_card_identity: true,
      finish_key: 'holo',
    },
    {
      source_key: 'tcgplayer_product',
      source_kind: 'marketplace_checklist',
      source_url: expected.source_url_tcgplayer,
      evidence_type: 'finish_presence',
      evidence_label: expected.marketplace_label,
      proves_exact_finish: true,
      proves_exact_stamp_identity: false,
      proves_exact_card_identity: true,
      finish_key: 'holo',
    },
    {
      source_key: 'bulbapedia_obsidian_flames_additional_cards',
      source_kind: 'human_readable_checklist',
      source_url: BULBAPEDIA_URL,
      evidence_type: 'checklist_entry',
      evidence_label: `${target.card_name} ${target.source_card_number}/197 listed as "Play! Pokemon" Stamp Play! Pokemon Prize Pack Series Four exclusive in Obsidian Flames additional cards.`,
      proves_exact_finish: false,
      proves_exact_stamp_identity: true,
      proves_exact_card_identity: true,
      finish_key: null,
    },
    {
      source_key: 'tcgcollector_prize_pack_series_four',
      source_kind: 'collector_reference',
      source_url: TCGCOLLECTOR_URL,
      evidence_type: 'checklist_entry',
      evidence_label: `${target.card_name} (Obsidian Flames ${target.source_card_number}/197) appears in Play! Pokemon Prize Pack Series Four checklist.`,
      proves_exact_finish: false,
      proves_exact_stamp_identity: true,
      proves_exact_card_identity: true,
      finish_key: null,
    },
    {
      source_key: 'ebay_product_catalog',
      source_kind: 'marketplace_checklist',
      source_url: expected.source_url_ebay_product,
      evidence_type: 'finish_presence',
      evidence_label: expected.marketplace_label,
      proves_exact_finish: true,
      proves_exact_stamp_identity: false,
      proves_exact_card_identity: true,
      finish_key: 'holo',
    },
  ];
}

function classifyTarget(row) {
  const evidenceRows = buildEvidenceRows(row);
  const exactFinishSources = new Set(evidenceRows.filter((item) => item.proves_exact_finish && item.finish_key === row.target_finish_key).map((item) => item.source_key));
  const exactStampSources = new Set(evidenceRows.filter((item) => item.proves_exact_stamp_identity).map((item) => item.source_key));
  const exactCardSources = new Set(evidenceRows.filter((item) => item.proves_exact_card_identity).map((item) => item.source_key));
  const blockers = [];
  if (row.collision_status !== 'existing_parent_missing_target_child_finish_blocked') blockers.push(`unexpected_collision_status:${row.collision_status}`);
  if (row.target_variant_key !== 'play_pokemon_stamp') blockers.push('target_variant_not_play_pokemon_stamp');
  if (row.target_finish_key !== 'holo') blockers.push('target_finish_not_holo');
  if (!row.existing_parent_id) blockers.push('missing_existing_parent_id');
  if (row.active_identity_count !== 1) blockers.push('active_identity_count_not_1');
  if (row.target_child_finish_count !== 0) blockers.push('target_child_already_exists');
  if (row.forbidden_stamped_child_count !== 0) blockers.push('forbidden_stamped_child_present');
  if (exactFinishSources.size < 2) blockers.push('insufficient_exact_finish_sources');
  if (exactStampSources.size < 2) blockers.push('insufficient_exact_stamp_sources');
  if (exactCardSources.size < 2) blockers.push('insufficient_exact_card_sources');

  return {
    ...row,
    prior_blockers: row.blockers ?? [],
    evidence_rows: evidenceRows,
    source_counts: {
      exact_finish_sources: exactFinishSources.size,
      exact_stamp_sources: exactStampSources.size,
      exact_card_sources: exactCardSources.size,
      total_sources: new Set(evidenceRows.map((item) => item.source_key)).size,
    },
    adjudication_status: blockers.length === 0
      ? 'accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run'
      : 'blocked_after_source_adjudication',
    blockers,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# SV03 Play Pokemon ex Holo Source Adjudication V1');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('Audit-only source adjudication for remaining SV03 Play Pokemon stamped ex rows. No database writes, migrations, cleanup, quarantine, or apply SQL were performed.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(markdownTable(['metric', 'value'], Object.entries({
    target_rows: report.summary.target_rows,
    accepted_rows: report.summary.accepted_rows,
    blocked_rows: report.summary.blocked_rows,
    write_ready_now: report.write_ready_now,
    fingerprint_sha256: `\`${report.fingerprint_sha256}\``,
  })));
  lines.push('');
  lines.push('## Rows');
  lines.push('');
  lines.push(markdownTable(
    ['number', 'card', 'variant', 'finish', 'status', 'exact_finish_sources', 'exact_stamp_sources', 'blockers'],
    report.rows.map((row) => [
      row.source_card_number,
      row.card_name,
      row.target_variant_key,
      row.target_finish_key,
      row.adjudication_status,
      row.source_counts.exact_finish_sources,
      row.source_counts.exact_stamp_sources,
      row.blockers.join(', ') || 'none',
    ]),
  ));
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  for (const row of report.rows) {
    lines.push(`### ${row.card_name} ${row.source_card_number}/197`);
    lines.push('');
    lines.push(markdownTable(
      ['source', 'kind', 'type', 'finish', 'label', 'url'],
      row.evidence_rows.map((item) => [
        item.source_key,
        item.source_kind,
        item.evidence_type,
        item.finish_key ?? '',
        item.evidence_label,
        item.source_url,
      ]),
    ));
    lines.push('');
  }
  lines.push('## Boundary');
  lines.push('');
  lines.push('This report only upgrades source adjudication. Child insertion still requires a separate guarded rollback dry-run, real-apply gate, and explicit package approval.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targets = (source.rows ?? [])
    .filter((row) => row.set_key === 'sv03')
    .filter((row) => row.target_variant_key === 'play_pokemon_stamp')
    .filter((row) => row.target_finish_key === 'holo')
    .filter((row) => ['22|toedscruel ex', '66|tyranitar ex'].includes(keyFor(row)));
  const rows = targets.map(classifyTarget);
  const summary = {
    target_rows: rows.length,
    accepted_rows: rows.filter((row) => row.adjudication_status === 'accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run').length,
    blocked_rows: rows.filter((row) => row.adjudication_status !== 'accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run').length,
    by_status: countBy(rows, (row) => row.adjudication_status),
    by_blocker: countBy(rows.flatMap((row) => row.blockers), (blocker) => blocker),
  };
  const fingerprintPayload = {
    package_id: PACKAGE_ID,
    source_collision_audit_fingerprint: source.fingerprint_sha256,
    rows: rows.map((row) => ({
      card: row.card_name,
      number: row.source_card_number,
      parent: row.existing_parent_id,
      finish: row.target_finish_key,
      status: row.adjudication_status,
      evidence: row.evidence_rows.map((item) => [item.source_key, item.source_url, item.finish_key]),
    })),
  };
  const report = {
    version: 1,
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifact: path.relative(ROOT, SOURCE_JSON),
    source_collision_audit_fingerprint: source.fingerprint_sha256,
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary,
    rows,
    safety_confirmation: {
      no_db_writes_performed: true,
      no_migrations_created: true,
      no_cleanup_or_quarantine_performed: true,
      source_adjudication_only: true,
    },
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeJson(MIRROR_JSON, report);
  await writeText(MIRROR_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    mirror_json: path.relative(ROOT, MIRROR_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
