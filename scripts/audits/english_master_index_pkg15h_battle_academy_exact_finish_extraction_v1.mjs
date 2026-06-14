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
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const SETS_JSON = path.join(AUDIT_DIR, 'english_master_index_sets_v1.json');
const CACHE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'bulbapedia_battle_academy_acquisition_v1', 'cache');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15h_battle_academy_exact_finish_extraction_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15h_battle_academy_exact_finish_extraction_v1.md');

const PRODUCT_URLS = {
  Battle_Academy_2020__TCG_: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_2020_(TCG)',
  Battle_Academy_2022__TCG_: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_2022_(TCG)',
  Battle_Academy_2024__TCG_: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_2024_(TCG)',
};

const SET_ALIAS_OVERRIDES = new Map([
  ['sm promo', 'smp'],
  ['sun moon promo', 'smp'],
  ['swsh promo', 'swshp'],
  ['sword shield promo', 'swshp'],
]);
const BATTLE_ACADEMY_VARIANTS = new Set([
  'battle_academy_deck_mark',
  'cinderace_stamp',
  '42_cinderace_stamp',
  '31_cinderace_stamped',
  '17_cinderace_stamped',
  'alolan_raichu_half_deck_14_stamp',
]);

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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function factKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function buildSetAliasIndex(setRows) {
  const index = new Map();
  for (const set of setRows) {
    const aliases = [
      set.key,
      set.set_name,
      set.pokemontcg,
      set.tcgdex,
      ...(set.manual_aliases ?? []),
      ...Object.values(set.source_aliases ?? {}),
    ].filter(Boolean);
    for (const alias of aliases) {
      const normalized = normalizeText(String(alias).replace(/_\(TCG\)$/i, '').replace(/_/g, ' '));
      if (normalized) index.set(normalized, set.key);
    }
  }
  for (const [alias, setKey] of SET_ALIAS_OVERRIDES) index.set(alias, setKey);
  return index;
}

function resolveSetKey(setAliasIndex, ...aliases) {
  for (const alias of aliases.filter(Boolean)) {
    const normalized = normalizeText(String(alias).replace(/_/g, ' '));
    if (SET_ALIAS_OVERRIDES.has(normalized)) return SET_ALIAS_OVERRIDES.get(normalized);
    const direct = setAliasIndex.get(normalized);
    if (direct) return direct;
  }
  return null;
}

function normalizeEvidenceNumber(setKey, tcgIdSetLabel, cardNumber) {
  const normalized = normalizeNumber(cardNumber);
  const setLabel = normalizeText(tcgIdSetLabel);
  if (setKey === 'smp' && setLabel.includes('sm promo') && /^\d+$/i.test(normalized)) return `SM${normalized}`;
  if (setKey === 'swshp' && setLabel.includes('swsh promo') && /^\d+$/i.test(normalized)) return `SWSH${normalized}`;
  return normalized;
}

function sourceKeyFromFile(fileName) {
  return path.basename(fileName, '.txt');
}

function sourceUrlFromFile(fileName) {
  return PRODUCT_URLS[sourceKeyFromFile(fileName)] ?? `cache:${fileName}`;
}

function explicitBulletEvidence(line, context) {
  const match = line.match(/^\*+\s*Non\s+Holofoil\s+print\s*\([^)]*\)\s+of\s+\{\{TCG\|([^}]+)\}\}\s+\{\{TCG ID\|([^|]+)\|([^|]+)\|([^}]+)\}\}/i);
  if (!match) return null;
  const [, namedSet, idSet, cardName, cardNumber] = match;
  return {
    evidence_source_shape: 'explicit_product_non_holo_bullet',
    source_file: context.fileName,
    source_url: sourceUrlFromFile(context.fileName),
    source_line: context.lineNumber,
    source_set_label: namedSet,
    tcg_id_set_label: idSet,
    card_name: cardName,
    card_number: cardNumber,
    target_finish_key: 'normal',
    evidence_label: `Bulbapedia Battle Academy explicit Non Holofoil bullet: ${namedSet} ${cardName} #${cardNumber}`,
  };
}

function explicitDecklistEvidence(line, context) {
  if (!/\bNon\s+Holofoil\b/i.test(line)) return null;
  const match = line.match(/\{\{TCG ID\|([^|]+)\|([^|]+)\|([^}]+)\}\}.*?\[\s*([^;\]]+)(?:;|\])\s*Non\s+Holofoil/i);
  if (!match) return null;
  const [, idSet, cardName, cardNumber, bracketSetLabel] = match;
  return {
    evidence_source_shape: 'explicit_decklist_non_holo_label',
    source_file: context.fileName,
    source_url: sourceUrlFromFile(context.fileName),
    source_line: context.lineNumber,
    source_set_label: bracketSetLabel.replace(/\s+\d+.*$/, '').trim() || idSet,
    tcg_id_set_label: idSet,
    card_name: cardName,
    card_number: cardNumber,
    target_finish_key: 'normal',
    evidence_label: `Bulbapedia Battle Academy decklist explicit Non Holofoil label: ${idSet} ${cardName} #${cardNumber}`,
  };
}

async function extractEvidence(setAliasIndex) {
  const files = (await fs.readdir(CACHE_DIR)).filter((fileName) => fileName.endsWith('.txt')).sort();
  const evidenceRows = [];
  for (const fileName of files) {
    const fullPath = path.join(CACHE_DIR, fileName);
    const lines = (await fs.readFile(fullPath, 'utf8')).split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const context = { fileName, lineNumber: index + 1 };
      const evidence = explicitBulletEvidence(line, context) ?? explicitDecklistEvidence(line, context);
      if (!evidence) continue;
      const setKey = resolveSetKey(setAliasIndex, evidence.source_set_label, evidence.tcg_id_set_label);
      const cardNumber = normalizeEvidenceNumber(setKey, evidence.tcg_id_set_label, evidence.card_number);
      evidenceRows.push({
        ...evidence,
        set_key: setKey,
        card_number: cardNumber,
        status: setKey ? 'extracted_exact_non_holo_finish' : 'blocked_source_set_unmapped',
        raw_snapshot_ref: `bulbapedia_battle_academy_cache:${fileName}:${index + 1}`,
      });
    }
  }
  const deduped = new Map();
  for (const row of evidenceRows) {
    const key = [
      row.set_key ?? normalizeText(row.source_set_label),
      normalizeNumber(row.card_number),
      normalizeText(row.card_name),
      row.target_finish_key,
      row.source_url,
    ].join('|');
    const existing = deduped.get(key);
    if (!existing || row.evidence_source_shape === 'explicit_product_non_holo_bullet') deduped.set(key, row);
  }
  return [...deduped.values()].sort((left, right) => (
    String(left.set_key).localeCompare(String(right.set_key))
    || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
  ));
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const evidenceRows = report.extracted_evidence.map((row) => [
    row.status,
    row.set_key ?? 'unmapped',
    row.card_number,
    row.card_name,
    row.target_finish_key,
    row.evidence_source_shape,
    row.source_url,
  ]);
  const acceptedRows = report.rows
    .filter((row) => row.status === 'accepted_exact_non_holo_bulbapedia_battle_academy')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.target_finish_key, row.source_url]);
  const blockedRows = report.rows.slice(0, 80).map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.status,
    row.blocked_reason,
  ]);

  return `# English Master Index PKG-15H Battle Academy Exact Finish Extraction V1

Audit-only extraction for Battle Academy active-finish evidence. This report only accepts explicit card-level Non Holofoil wording from cached Bulbapedia Battle Academy product pages. Deck membership, colored silhouettes, deck numbers, and stamp identity are not treated as active-finish proof.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- battle_academy_rows_reviewed: ${report.summary.battle_academy_rows_reviewed}
- extracted_exact_non_holo_facts: ${report.summary.extracted_exact_non_holo_facts}
- accepted_rows_still_in_queue: ${report.summary.accepted_rows_still_in_queue}
- exhausted_rows: ${report.summary.exhausted_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Extracted Exact Evidence

${markdownTable(['status', 'set', 'number', 'name', 'finish', 'source_shape', 'url'], evidenceRows)}

## Accepted Rows

${markdownTable(['set', 'number', 'name', 'finish', 'url'], acceptedRows)}

## Reviewed Queue Sample

${markdownTable(['set', 'number', 'name', 'variant', 'status', 'blocked_reason'], blockedRows)}
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const setData = await readJson(SETS_JSON);
  const setAliasIndex = buildSetAliasIndex(setData.sets ?? []);
  const extractedEvidence = await extractEvidence(setAliasIndex);
  const evidenceByFact = new Map(extractedEvidence
    .filter((row) => row.status === 'extracted_exact_non_holo_finish')
    .map((row) => [factKey(row), row]));
  const battleRows = (input.rows ?? [])
    .filter((row) => row.routing_status === 'blocked_missing_exact_finish_phrase')
    .filter((row) => BATTLE_ACADEMY_VARIANTS.has(row.proposed_variant_key)
      || (row.preserved_evidence_sources ?? []).includes('bulbapedia_battle_academy_product'))
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
  const rows = battleRows.map((row) => {
    const evidence = evidenceByFact.get(factKey(row));
    if (!evidence) {
      return {
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        proposed_variant_key: row.proposed_variant_key,
        status: 'blocked_decklist_membership_only',
        blocked_reason: 'Bulbapedia Battle Academy source proves deck/stamp identity for this row but does not provide explicit card-level active-finish wording.',
        preserved_evidence_urls: row.preserved_evidence_urls ?? [],
      };
    }
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      proposed_variant_key: row.proposed_variant_key,
      target_finish_key: evidence.target_finish_key,
      status: 'accepted_exact_non_holo_bulbapedia_battle_academy',
      source_key: 'bulbapedia_battle_academy_exact_finish',
      source_url: evidence.source_url,
      evidence_label: evidence.evidence_label,
      raw_snapshot_ref: evidence.raw_snapshot_ref,
    };
  });
  const extractedNotInQueue = extractedEvidence
    .filter((row) => row.status === 'extracted_exact_non_holo_finish')
    .filter((row) => !battleRows.some((candidate) => factKey(candidate) === factKey(row)))
    .map((row) => ({
      ...row,
      status: 'exact_evidence_not_in_remaining_queue',
    }));
  const accepted = rows.filter((row) => row.status === 'accepted_exact_non_holo_bulbapedia_battle_academy');
  const fingerprintPayload = {
    accepted: accepted.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: row.target_finish_key,
    })),
    extracted_not_in_queue: extractedNotInQueue.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: row.target_finish_key,
    })),
    reviewed: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      status: row.status,
    })),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15h_battle_academy_exact_finish_extraction_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      pkg11b_stamped_finish_routing_readiness: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
      english_master_index_sets: path.relative(ROOT, SETS_JSON).replaceAll('\\', '/'),
      bulbapedia_battle_academy_cache: path.relative(ROOT, CACHE_DIR).replaceAll('\\', '/'),
    },
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary: {
      battle_academy_rows_reviewed: rows.length,
      extracted_exact_non_holo_facts: extractedEvidence.filter((row) => row.status === 'extracted_exact_non_holo_finish').length,
      accepted_rows_still_in_queue: accepted.length,
      extracted_exact_facts_not_in_remaining_queue: extractedNotInQueue.length,
      exhausted_rows: rows.length - accepted.length,
      by_status: countBy([...rows, ...extractedNotInQueue], (row) => row.status),
    },
    extracted_evidence: extractedEvidence.map((row) => {
      if (row.status !== 'extracted_exact_non_holo_finish') return row;
      const inQueue = battleRows.some((candidate) => factKey(candidate) === factKey(row));
      return {
        ...row,
        status: inQueue ? 'exact_evidence_matches_remaining_queue' : 'exact_evidence_not_in_remaining_queue',
      };
    })
      .sort((left, right) => String(left.status).localeCompare(String(right.status))
        || String(left.set_key).localeCompare(String(right.set_key))
        || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })),
    rows,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
