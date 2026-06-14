import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_FIXTURE_DIR = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures');
const SOURCE_EXHAUSTION_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const PRICECHARTING_CSV = path.join(ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17o_league_preserved_evidence_absorption_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17o_league_preserved_evidence_absorption_v1.md');
const GENERATED_FIXTURE_DIR = path.join(SOURCE_FIXTURE_DIR, 'generated_pkg17o_league_preserved_evidence_absorption_v1');
const EXACT_FIXTURE_JSON = path.join(GENERATED_FIXTURE_DIR, 'league_two_source_exact_active_finish_candidates_v1.json');
const REVIEW_FIXTURE_JSON = path.join(GENERATED_FIXTURE_DIR, 'league_crosshatch_alias_review_candidates_v1.json');

const PACKAGE_ID = 'PKG-17O-LEAGUE-PRESERVED-EVIDENCE-ABSORPTION';
const ACTIVE_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);
const FIXTURE_FAMILY_ALLOWLIST = [
  'generated_pokecardvalues_stamped_finish_v1',
  'generated_manual_web_exact_finish_v1',
  'generated_cardtrader_v1',
  'generated_doubleholo_v1',
  'generated_elitefourum_alternate_v1',
  'generated_pkg17l_pricecharting_league_active_finish_acquisition_v1',
  'generated_pkg17m_skarmory_league_active_finish_second_source_v1',
  'generated_pkg17p_pokemonflashfire_league_reverse_source_v1',
];

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+/, '');
}

function evidenceText(record) {
  return [
    record.variant_key,
    record.stamp_label,
    record.finish_key,
    record.evidence_label,
    record.evidence_text_or_label,
    record.notes,
    record.source_url,
    record.raw_snapshot_ref,
  ].filter(Boolean).join(' ');
}

function sourceFamily(record) {
  const sourceKey = String(record.source_key ?? '').toLowerCase();
  const url = String(record.source_url ?? '').toLowerCase();
  if (sourceKey.includes('pricecharting') || url.includes('pricecharting.com')) return 'pricecharting';
  if (sourceKey.includes('pokecardvalues') || url.includes('pokecardvalues.co.uk')) return 'pokecardvalues';
  if (sourceKey.includes('cardtrader') || url.includes('cardtrader.com')) return 'cardtrader';
  if (sourceKey.includes('tcgplayer') || url.includes('tcgplayer.com')) return 'tcgplayer';
  if (sourceKey.includes('bulbapedia') || url.includes('bulbapedia.bulbagarden.net')) return 'bulbapedia';
  if (sourceKey.includes('doubleholo') || url.includes('doubleholo.com')) return 'doubleholo';
  if (sourceKey.includes('elitefourum') || url.includes('elitefourum.com')) return 'elitefourum';
  if (sourceKey.includes('bigorbit') || url.includes('bigorbitcards.co.uk')) return 'bigorbit';
  if (sourceKey.includes('beckett') || url.includes('beckett.com')) return 'beckett';
  if (sourceKey.includes('pokumon') || url.includes('pokumon.com')) return 'pokumon';
  if (sourceKey.includes('tcdb') || url.includes('tcdb.com')) return 'tcdb';
  return sourceKey || 'unknown';
}

function targetRows(pkg17a) {
  return (pkg17a.rows ?? [])
    .filter((row) => row.queue_status === 'active_finish_required')
    .filter((row) => ['league_stamp', 'league_cup_staff_stamp'].includes(row.variant_key))
    .filter((row) => row.card_number && row.card_name && row.set_key)
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

async function walkJsonFiles(dirPath) {
  const files = [];
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectEvidenceObjects(value, filePath, rows = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectEvidenceObjects(item, filePath, rows);
    return rows;
  }
  if (!value || typeof value !== 'object') return rows;
  if (value.set_key && value.card_number && value.card_name && value.source_url) {
    rows.push({ ...value, source_file: rel(filePath) });
  }
  for (const key of ['records', 'rows', 'evidence_records', 'candidate_rows']) {
    if (value[key]) collectEvidenceObjects(value[key], filePath, rows);
  }
  return rows;
}

async function loadFixtureEvidence() {
  const files = (await walkJsonFiles(SOURCE_FIXTURE_DIR))
    .filter((filePath) => FIXTURE_FAMILY_ALLOWLIST.some((family) => filePath.includes(family)));
  const rows = [];
  for (const filePath of files) {
    try {
      rows.push(...collectEvidenceObjects(await readJson(filePath), filePath));
    } catch {
      // Ignore unreadable generated artifacts; the report records source coverage by accepted rows.
    }
  }
  return rows;
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function loadPriceChartingRows() {
  let raw = '';
  try {
    raw = await fs.readFile(PRICECHARTING_CSV, 'utf8');
  } catch {
    return [];
  }
  const rows = parseCsv(raw);
  const headers = rows.shift() ?? [];
  return rows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
    .filter((row) => row.genre === 'Pokemon Card');
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[.:’']/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function priceChartingUrl(row) {
  return `https://www.pricecharting.com/game/${slug(row['console-name'])}/${slug(row['product-name'])}`;
}

function parsePriceChartingProduct(productName) {
  const raw = String(productName ?? '').trim();
  const match = raw.match(/^(?<name>.+?)\s*(?<variants>(?:\[[^\]]+\]\s*)*)#(?<number>[A-Za-z0-9.-]+)(?:\b|$)/);
  if (!match?.groups) return null;
  return {
    card_name: match.groups.name.trim(),
    card_number: normalizeNumber(match.groups.number),
    variant_text: [...match.groups.variants.matchAll(/\[([^\]]+)\]/g)].map((entry) => entry[1].trim()).join(' '),
  };
}

function priceChartingEvidenceRows(csvRows) {
  const rows = [];
  for (const row of csvRows) {
    const parsed = parsePriceChartingProduct(row['product-name']);
    if (!parsed) continue;
    const text = `${row['console-name']} ${row['product-name']} ${parsed.variant_text}`;
    if (!/league|crosshatch/i.test(text)) continue;
    rows.push({
      source_key: 'pricecharting_csv_preserved_league',
      source_kind: 'marketplace_checklist',
      source_url: priceChartingUrl(row),
      set_key: null,
      set_name: String(row['console-name'] ?? '').replace(/^Pokemon\s+/i, '').trim(),
      card_number: parsed.card_number,
      card_name: parsed.card_name,
      finish_key: null,
      variant_key: null,
      stamp_label: /staff/i.test(text) ? 'Staff Stamp' : 'League Stamp',
      evidence_type: 'finish_presence',
      evidence_label: `PriceCharting CSV preserved product title: ${row['product-name']}`,
      evidence_text_or_label: row['product-name'],
      language: 'en',
      retrieved_at: new Date().toISOString(),
      raw_snapshot_ref: `pricecharting_csv_preserved:${row.id}`,
      notes: 'Local PriceCharting CSV row. Accepted only if it exactly matches a current queue row and has explicit active finish text.',
      source_file: rel(PRICECHARTING_CSV),
    });
  }
  return rows;
}

function recordMatchesTarget(record, target) {
  if (record.set_key && record.set_key !== target.set_key) return false;
  if (!record.set_key) {
    const sourceSet = comparable(record.set_name);
    const targetSet = comparable(target.set_name);
    if (!sourceSet.includes(targetSet) && !targetSet.includes(sourceSet)) return false;
  }
  return compactNumber(record.card_number) === compactNumber(target.card_number)
    && comparable(record.card_name) === comparable(target.card_name);
}

function leagueFamilyMatches(record, target) {
  const text = comparable(evidenceText(record));
  if (target.variant_key === 'league_cup_staff_stamp') {
    return /\bleague\b/.test(text) && /\bstaff\b/.test(text);
  }
  if (!/\bleague\b|\be league\b|\bcrosshatch\b|\bplayer rewards\b/.test(text)) return false;
  if (/\bstaff\b|\bprize pack\b|\bprofessor program\b|\bwinner\b/.test(text)) return false;
  return true;
}

function activeFinishObservation(record) {
  const key = String(record.finish_key ?? '').toLowerCase();
  const text = comparable(evidenceText(record));
  if (ACTIVE_FINISHES.has(key)) {
    return {
      finish_key: key,
      observation_status: 'accepted_exact_active_finish',
      observation_note: 'source row already carries an active finish key',
    };
  }
  if (/\breverse holo\b|\breverse holofoil\b|\breverse foil\b/.test(text)) {
    return {
      finish_key: 'reverse',
      observation_status: 'accepted_exact_active_finish',
      observation_note: 'source label explicitly names Reverse Holo/Reverse Holofoil',
    };
  }
  if (/\bcosmos holo\b|\bcosmos\b/.test(text)) {
    return {
      finish_key: 'cosmos',
      observation_status: 'accepted_exact_active_finish',
      observation_note: 'source label explicitly names Cosmos Holo',
    };
  }
  if (/\bcracked ice\b/.test(text)) {
    return {
      finish_key: 'cracked_ice',
      observation_status: 'accepted_exact_active_finish',
      observation_note: 'source label explicitly names Cracked Ice',
    };
  }
  if (/\bnon holo\b|\bnonholo\b|\bnon foil\b|\bnonfoil\b/.test(text)) {
    return {
      finish_key: 'normal',
      observation_status: 'accepted_exact_active_finish',
      observation_note: 'source label explicitly names Non-Holo/Normal',
    };
  }
  if (/\bcrosshatch holo\b|\bcrosshatch holofoil\b/.test(text)) {
    return {
      finish_key: 'reverse',
      observation_status: 'crosshatch_alias_review_required',
      observation_note: 'source label names Crosshatch Holo; this likely maps to the stamped reverse lane but needs explicit governance before write',
    };
  }
  if (/\bholofoil\b|\bholo\b|\bfoil\b/.test(text)) {
    return {
      finish_key: 'holo',
      observation_status: 'accepted_exact_active_finish',
      observation_note: 'source label explicitly names Holo/Holofoil',
    };
  }
  return {
    finish_key: null,
    observation_status: 'blocked_no_explicit_active_finish',
    observation_note: 'source identifies League/stamped identity but does not prove active child finish',
  };
}

function normalizeEvidenceRecord(record, target, observation) {
  return {
    source_key: record.source_key,
    source_family: sourceFamily(record),
    source_kind: record.source_kind,
    source_url: record.source_url,
    source_file: record.source_file,
    set_key: target.set_key,
    set_name: target.set_name,
    card_number: target.card_number,
    card_name: target.card_name,
    finish_key: observation.finish_key,
    variant_key: target.variant_key,
    stamp_label: target.stamp_label,
    evidence_type: 'finish_presence',
    evidence_label: record.evidence_label,
    evidence_text_or_label: record.evidence_text_or_label ?? record.evidence_label,
    language: record.language ?? 'en',
    retrieved_at: record.retrieved_at ?? new Date().toISOString(),
    raw_snapshot_ref: record.raw_snapshot_ref,
    observation_status: observation.observation_status,
    notes: observation.observation_note,
  };
}

function classifyGroupedRows(targets, evidenceRows) {
  const rows = [];
  for (const target of targets) {
    const matched = [];
    for (const record of evidenceRows) {
      if (!recordMatchesTarget(record, target)) continue;
      if (!leagueFamilyMatches(record, target)) continue;
      const observation = activeFinishObservation(record);
      matched.push(normalizeEvidenceRecord(record, target, observation));
    }

    const byFinish = new Map();
    for (const record of matched) {
      const finish = record.finish_key ?? 'unknown';
      byFinish.set(finish, [...(byFinish.get(finish) ?? []), record]);
    }

    if (matched.length === 0) {
      rows.push({
        ...target,
        readiness_status: 'no_preserved_source_match',
        finish_key: null,
        evidence_records: [],
        accepted_exact_source_families: [],
        crosshatch_alias_source_families: [],
        blockers: ['no_preserved_source_match'],
      });
      continue;
    }

    for (const [finishKey, records] of byFinish.entries()) {
      const acceptedExact = records.filter((record) => record.observation_status === 'accepted_exact_active_finish');
      const crosshatchAlias = records.filter((record) => record.observation_status === 'crosshatch_alias_review_required');
      const blocked = records.filter((record) => record.observation_status === 'blocked_no_explicit_active_finish');
      const exactFamilies = [...new Set(acceptedExact.map((record) => record.source_family))].sort();
      const aliasFamilies = [...new Set(crosshatchAlias.map((record) => record.source_family))].sort();
      let readinessStatus = 'blocked_no_explicit_active_finish';
      const blockers = [];

      if (finishKey === 'unknown') {
        blockers.push('no_active_finish_observation');
      } else if (exactFamilies.length >= 2) {
        readinessStatus = 'two_source_exact_active_finish_ready_for_guarded_dry_run';
      } else if (exactFamilies.length === 1 && aliasFamilies.length >= 1) {
        readinessStatus = 'crosshatch_alias_governance_required_before_dry_run';
        blockers.push('crosshatch_alias_governance_required');
      } else if (exactFamilies.length === 1) {
        readinessStatus = 'single_source_exact_active_finish_second_source_needed';
        blockers.push('second_independent_source_needed');
      } else if (aliasFamilies.length > 0) {
        readinessStatus = 'crosshatch_alias_review_only';
        blockers.push('exact_active_finish_source_needed');
        blockers.push('crosshatch_alias_governance_required');
      }

      rows.push({
        ...target,
        finish_key: finishKey === 'unknown' ? null : finishKey,
        readiness_status: readinessStatus,
        evidence_records: records.sort((left, right) => String(left.source_family).localeCompare(String(right.source_family))),
        accepted_exact_source_families: exactFamilies,
        crosshatch_alias_source_families: aliasFamilies,
        blocked_source_count: blocked.length,
        source_count: records.length,
        blockers,
      });
    }
  }
  return rows.sort((left, right) => String(left.readiness_status).localeCompare(String(right.readiness_status))
    || String(left.set_key).localeCompare(String(right.set_key))
    || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name)));
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_readiness_status).map(([status, count]) => [status, count]);
  const readyRows = report.rows
    .filter((row) => row.readiness_status === 'two_source_exact_active_finish_ready_for_guarded_dry_run')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.finish_key, row.accepted_exact_source_families.join(', ')]);
  const aliasRows = report.rows
    .filter((row) => row.readiness_status.includes('crosshatch_alias'))
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.finish_key, row.accepted_exact_source_families.join(', '), row.crosshatch_alias_source_families.join(', ')]);
  const singleRows = report.rows
    .filter((row) => row.readiness_status === 'single_source_exact_active_finish_second_source_needed')
    .slice(0, 60)
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.finish_key, row.accepted_exact_source_families.join(', ')]);

  return `# PKG-17O League Preserved Evidence Absorption V1

Audit-only pass over existing preserved League evidence and the local PriceCharting CSV.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['league_active_finish_targets', report.summary.league_active_finish_targets],
    ['preserved_evidence_rows_scanned', report.summary.preserved_evidence_rows_scanned],
    ['rows_with_any_preserved_match', report.summary.rows_with_any_preserved_match],
    ['two_source_exact_active_finish_ready_for_guarded_dry_run', report.summary.two_source_exact_active_finish_ready_for_guarded_dry_run],
    ['crosshatch_alias_governance_required_before_dry_run', report.summary.crosshatch_alias_governance_required_before_dry_run],
    ['single_source_exact_active_finish_second_source_needed', report.summary.single_source_exact_active_finish_second_source_needed],
    ['no_preserved_source_match', report.summary.no_preserved_source_match],
  ])}

## By Readiness Status

${markdownTable(['status', 'count'], summaryRows)}

## Two-Source Exact Active Finish Ready

${readyRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'finish', 'source families'], readyRows) : 'None.'}

## Crosshatch Alias Governance Required

These are not package-ready until the finish taxonomy explicitly maps the source label to the active child finish.

${aliasRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'finish', 'exact families', 'alias families'], aliasRows) : 'None.'}

## Single-Source Exact Active Finish Rows

${singleRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'finish', 'source families'], singleRows) : 'None.'}

## Guardrail

No row from this report may be written until it has a guarded dry-run package, fresh fingerprint, dry-run proof, and explicit apply approval.
`;
}

async function main() {
  const pkg17a = await readJson(PKG17A_JSON);
  const targets = targetRows(pkg17a);
  const fixtureEvidence = await loadFixtureEvidence();
  const priceChartingEvidence = priceChartingEvidenceRows(await loadPriceChartingRows());
  const evidenceRows = [...fixtureEvidence, ...priceChartingEvidence];
  const rows = classifyGroupedRows(targets, evidenceRows);

  const exactReadyRows = rows.filter((row) => row.readiness_status === 'two_source_exact_active_finish_ready_for_guarded_dry_run');
  const aliasReviewRows = rows.filter((row) => row.readiness_status.includes('crosshatch_alias'));

  const exactFixture = exactReadyRows.flatMap((row) => row.evidence_records);
  const aliasFixture = aliasReviewRows.flatMap((row) => row.evidence_records);

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17o_league_preserved_evidence_absorption_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: rel(PKG17A_JSON),
      source_fixture_dir: rel(SOURCE_FIXTURE_DIR),
      source_exhaustion_dir: rel(SOURCE_EXHAUSTION_DIR),
      pricecharting_csv: rel(PRICECHARTING_CSV),
      exact_fixture: rel(EXACT_FIXTURE_JSON),
      crosshatch_alias_review_fixture: rel(REVIEW_FIXTURE_JSON),
    },
    fingerprint_sha256: sha256(stableJson(rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      readiness_status: row.readiness_status,
      source_families: row.accepted_exact_source_families,
      alias_source_families: row.crosshatch_alias_source_families,
    })))),
    summary: {
      league_active_finish_targets: targets.length,
      preserved_evidence_rows_scanned: evidenceRows.length,
      rows_with_any_preserved_match: rows.filter((row) => row.evidence_records.length > 0).length,
      two_source_exact_active_finish_ready_for_guarded_dry_run: exactReadyRows.length,
      crosshatch_alias_governance_required_before_dry_run: rows.filter((row) => row.readiness_status === 'crosshatch_alias_governance_required_before_dry_run').length,
      single_source_exact_active_finish_second_source_needed: rows.filter((row) => row.readiness_status === 'single_source_exact_active_finish_second_source_needed').length,
      no_preserved_source_match: rows.filter((row) => row.readiness_status === 'no_preserved_source_match').length,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_set: countBy(rows, (row) => row.set_key),
      by_finish: countBy(rows.filter((row) => row.finish_key), (row) => row.finish_key),
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeJson(EXACT_FIXTURE_JSON, exactFixture);
  await writeJson(REVIEW_FIXTURE_JSON, aliasFixture);
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
