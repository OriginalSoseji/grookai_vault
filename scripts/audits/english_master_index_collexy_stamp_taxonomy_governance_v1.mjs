import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const SOURCE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'collexy_bw_holofoil_source_acquisition_v1', 'collexy_bw_holofoil_source_acquisition_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const OUT_JSON = path.join(OUT_DIR, 'english_master_index_collexy_stamp_taxonomy_governance_v1.json');
const OUT_MD = path.join(OUT_DIR, 'english_master_index_collexy_stamp_taxonomy_governance_v1.md');

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
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function text(value) {
  return normalizeText(value).replace(/\s+/g, ' ').trim();
}

function inferModifier(row) {
  const evidence = text(row.evidence_label);
  const queued = text(`${row.variant_key} ${row.stamp_label}`);

  if (evidence.includes('city championships') && evidence.includes('staff')) return 'city_championships_staff_stamp';
  if (evidence.includes('city championships')) return 'city_championships_stamp';
  if ((evidence.includes('state championships') || evidence.includes('states championships')) && evidence.includes('staff')) return 'states_championships_staff_stamp';
  if (evidence.includes('state championships') || evidence.includes('states championships')) return 'states_championships_stamp';
  if (evidence.includes('national championships') && evidence.includes('staff')) return 'national_championships_staff_stamp';
  if (evidence.includes('national championships')) return 'national_championships_stamp';
  if (evidence.includes('regional championships') && evidence.includes('staff')) return 'regional_championships_staff_stamp';
  if (evidence.includes('regional championships')) return 'regional_championships_stamp';
  if (evidence.includes('1st place')) return 'first_place_league_stamp';
  if (evidence.includes('2nd place')) return 'second_place_league_stamp';
  if (evidence.includes('3rd place')) return 'third_place_league_stamp';
  if (evidence.includes('4th place')) return 'fourth_place_league_stamp';
  if (evidence.includes('play pokemon logo')) return 'play_pokemon_stamp';
  if (evidence.includes('player rewards program')) return 'player_rewards_crosshatch_stamp';
  if (evidence.includes('pokemon league')) return queued.includes('player rewards') ? 'player_rewards_crosshatch_stamp' : 'league_stamp';
  return row.variant_key;
}

function governingContract(modifier) {
  if (modifier?.includes('championships')) {
    if (modifier.includes('regional')) return 'REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1';
    if (modifier.includes('city') || modifier.includes('states') || modifier.includes('national')) return 'CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1';
  }
  if (modifier?.includes('place')) return 'LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1';
  if (['play_pokemon_stamp', 'player_rewards_crosshatch_stamp', 'league_stamp'].includes(modifier)) {
    return 'PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1';
  }
  return 'STAMPED_IDENTITY_RULE_V1_REVIEW_ONLY';
}

function action(row) {
  const inferred = inferModifier(row);
  const same = inferred === row.variant_key;
  const contract = governingContract(inferred);
  const evidence = text(row.evidence_label);

  if (!same && row.variant_key === 'league_stamp' && inferred?.includes('championships')) {
    return {
      governance_action: 'variant_taxonomy_change_required',
      recommended_variant_key: inferred,
      governing_contract: contract,
      readiness_status: 'not_write_ready_taxonomy_change_required',
      note: 'Source exposes a more specific championship identity than queued generic league_stamp.',
    };
  }
  if (!same && row.variant_key === 'league_stamp' && inferred?.includes('place')) {
    return {
      governance_action: 'placement_identity_split_required',
      recommended_variant_key: inferred,
      governing_contract: contract,
      readiness_status: 'not_write_ready_taxonomy_change_required',
      note: 'Source exposes placement-specific Pokemon League wording.',
    };
  }
  if (!same && ['prize_pack_stamp'].includes(row.variant_key)) {
    return {
      governance_action: 'queued_variant_mismatch',
      recommended_variant_key: inferred,
      governing_contract: contract,
      readiness_status: 'blocked_wrong_family_for_current_queue',
      note: 'Source supports Play/Player Rewards wording, not Prize Pack identity.',
    };
  }
  if (!same) {
    return {
      governance_action: 'variant_synonym_or_taxonomy_review',
      recommended_variant_key: inferred,
      governing_contract: contract,
      readiness_status: 'not_write_ready_governance_review_required',
      note: 'Source wording differs from queued modifier and must be governed before package prep.',
    };
  }
  if (same && evidence.includes('staff') && !String(row.variant_key).includes('staff')) {
    return {
      governance_action: 'staff_split_required',
      recommended_variant_key: inferred,
      governing_contract: contract,
      readiness_status: 'not_write_ready_taxonomy_change_required',
      note: 'Source includes Staff wording but queued modifier is non-Staff.',
    };
  }
  return {
    governance_action: 'synonym_governed_review_candidate',
    recommended_variant_key: inferred,
    governing_contract: contract,
    readiness_status: 'not_write_ready_second_source_delta_required',
    note: 'Source aligns with current modifier strategy, but still needs source-delta guard and package prep before any write.',
  };
}

function renderMarkdown(report) {
  return [
    '# Collexy Stamp Taxonomy Governance V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Audit-only. No DB writes, no migrations, no apply.',
    '',
    'This report converts Collexy source findings into governance actions. It does not prepare or authorize writes.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['source_records', report.summary.source_records],
      ['taxonomy_change_required', report.summary.by_governance_action.variant_taxonomy_change_required ?? 0],
      ['placement_identity_split_required', report.summary.by_governance_action.placement_identity_split_required ?? 0],
      ['variant_synonym_or_taxonomy_review', report.summary.by_governance_action.variant_synonym_or_taxonomy_review ?? 0],
      ['queued_variant_mismatch', report.summary.by_governance_action.queued_variant_mismatch ?? 0],
      ['synonym_governed_review_candidate', report.summary.by_governance_action.synonym_governed_review_candidate ?? 0],
      ['write_ready_now', report.summary.write_ready_now],
      ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
    ]),
    '',
    '## Rows',
    '',
    markdownTable(['set', 'number', 'card', 'queued', 'recommended', 'finish', 'action', 'contract', 'status'], report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.recommended_variant_key,
      row.finish_key,
      row.governance_action,
      row.governing_contract,
      row.readiness_status,
    ])),
    '',
    '## Guardrail',
    '',
    'No row is write-ready from this report. Rows must go through source-delta comparison, collision checks, rollback-only dry-run preparation, and explicit user approval before any DB write.',
    '',
  ].join('\n');
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const rows = (source.rows ?? []).map((row) => ({
    ...row,
    ...action(row),
    write_ready_now: false,
  }));

  const report = {
    package_id: 'COLLEXY-STAMP-TAXONOMY-GOVERNANCE-V1',
    generated_at: new Date().toISOString(),
    input_artifact: rel(SOURCE_JSON),
    input_fingerprint_sha256: source.fingerprint_sha256 ?? null,
    active_contracts: [
      'CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1',
      'PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1',
      'REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1',
      'LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1',
    ],
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
    },
    summary: {
      source_records: rows.length,
      write_ready_now: 0,
      by_governance_action: countBy(rows, (row) => row.governance_action),
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_recommended_variant_key: countBy(rows, (row) => row.recommended_variant_key),
      by_governing_contract: countBy(rows, (row) => row.governing_contract),
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    package_id: report.package_id,
    input_fingerprint_sha256: report.input_fingerprint_sha256,
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      recommended_variant_key: row.recommended_variant_key,
      finish_key: row.finish_key,
      governance_action: row.governance_action,
      readiness_status: row.readiness_status,
    })),
  }));

  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUT_JSON),
    output_md: rel(OUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
