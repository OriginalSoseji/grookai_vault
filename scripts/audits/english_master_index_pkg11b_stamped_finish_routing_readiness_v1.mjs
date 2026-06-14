import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const GENERIC_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15b_stamped_generic_variant_adjudication_v1.json');
const BATTLE_ACADEMY_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15d_battle_academy_non_holo_adjudication_v1.json');
const POKECARDVALUES_STAMPED_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pokecardvalues_stamped_finish_acquisition_v1', 'pokecardvalues_stamped_finish_acquisition_v1.json');
const CARDTRADER_STAMPED_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'cardtrader_stamped_finish_acquisition_v1', 'cardtrader_stamped_finish_acquisition_v1.json');
const TCGCSV_STAMPED_SUBTYPE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'tcgcsv_stamped_subtype_acquisition_v1', 'tcgcsv_stamped_subtype_acquisition_v1.json');
const PRICECHARTING_STAMPED_ACTIVE_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pricecharting_stamped_active_finish_acquisition_v1', 'pricecharting_stamped_active_finish_acquisition_v1.json');
const JUSTINBASIL_PRIZE_PACK_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'justinbasil_prize_pack_finish_acquisition_v1', 'justinbasil_prize_pack_finish_acquisition_v1.json');
const BULBAPEDIA_PRIZE_PACK_NORMAL_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'bulbapedia_prize_pack_normal_acquisition_v1', 'bulbapedia_prize_pack_normal_acquisition_v1.json');
const BULBAPEDIA_PRIZE_PACK_FOIL_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'bulbapedia_prize_pack_foil_acquisition_v1', 'bulbapedia_prize_pack_foil_acquisition_v1.json');
const TCGCSV_PRIZE_PACK_TITLE_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'tcgcsv_prize_pack_title_finish_acquisition_v1', 'tcgcsv_prize_pack_title_finish_acquisition_v1.json');
const SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg11b_stamped_finish_routing_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-11B-STAMPED-FINISH-ROUTING-READINESS';
const ROUTABLE_READINESS = new Set([
  'ready_for_guarded_parent_identity_insert',
  'ready_for_guarded_parent_identity_insert_with_dependency_awareness',
]);
const ACTIVE_CHILD_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos']);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
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
    String(row.card_number ?? '').trim(),
    normalizeText(row.card_name),
  ].join('|');
}

function variantFactKey(row) {
  return [
    factKey(row),
    normalizeText(row.proposed_variant_key),
  ].join('|');
}

function buildPokeCardValuesFinishEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_finish_match')) {
    byKey.set(variantFactKey(row), {
      source_key: 'pokecardvalues_stamped_finish',
      source_url: row.accepted_source_url,
      evidence_label: row.accepted_source_title
        ? `Poke Card Values exact stamped finish: ${row.accepted_source_title}`
        : `Poke Card Values exact stamped finish: ${row.accepted_finish_key}`,
      evidence_note: 'Exact active finish evidence accepted only when Poke Card Values had one matching set/card/number/stamp-family product title.',
    });
  }
  return byKey;
}

function buildCardTraderFinishEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_finish_match')) {
    byKey.set(variantFactKey(row), {
      source_key: 'cardtrader_stamped_finish',
      source_url: row.accepted_source_url,
      evidence_label: row.accepted_source_title
        ? `CardTrader exact stamped finish: ${row.accepted_source_title}`
        : `CardTrader exact stamped finish: ${row.accepted_finish_key}`,
      evidence_note: 'Exact stamped active-finish evidence accepted only when CardTrader had one matching set/card/number/stamp-family title with an explicit active finish phrase.',
    });
  }
  return byKey;
}

function buildTcgcsvFinishEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_tcgcsv_subtype_match')) {
    byKey.set(variantFactKey(row), {
      source_key: 'tcgcsv_stamped_subtype',
      source_url: row.accepted_source_url,
      evidence_label: row.accepted_product_name
        ? `TCGCSV/TCGplayer exact stamped subtype: ${row.accepted_product_name} / ${row.accepted_subtype_name}`
        : `TCGCSV/TCGplayer exact stamped subtype: ${row.accepted_finish_key}`,
      evidence_note: 'Exact active-finish evidence accepted only when TCGCSV product matched set/card/number/stamp identity and exactly one TCGplayer subtype mapped to an active child finish.',
    });
  }
  return byKey;
}

function buildPriceChartingStampedActiveFinishEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_pricecharting_stamped_active_finish_match')) {
    byKey.set(variantFactKey(row), {
      source_key: 'pricecharting_stamped_active_finish',
      source_url: row.accepted_source_url,
      evidence_label: row.accepted_product_name
        ? `PriceCharting exact stamped active finish: ${row.accepted_product_name}`
        : `PriceCharting exact stamped active finish: ${row.accepted_finish_key}`,
      evidence_note: 'Exact active-finish evidence accepted only when PriceCharting CSV product matched set/card/number/stamp identity and explicitly named the active finish.',
    });
  }
  return byKey;
}

function buildJustinBasilPrizePackFinishEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_justinbasil_prize_pack_finish')) {
    byKey.set(variantFactKey(row), {
      source_key: 'justinbasil_prize_pack_finish',
      source_url: row.accepted_source_url,
      evidence_label: `JustInBasil Prize Pack Series ${row.accepted_source_series}: ${row.accepted_source_marks.join(', ')} ${row.accepted_source_card_name} ${row.accepted_source_set_code} ${row.accepted_source_card_number}`,
      evidence_note: row.accepted_finish_key === 'normal'
        ? 'Exact Prize Pack active-finish evidence: source mark S means available in non-holo.'
        : 'Exact Prize Pack active-finish evidence: source mark H means available in cosmos holofoil.',
    });
  }
  return byKey;
}

function buildBulbapediaPrizePackNormalEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_bulbapedia_prize_pack_normal')) {
    byKey.set(variantFactKey(row), {
      source_key: 'bulbapedia_prize_pack_normal',
      source_url: row.accepted_source_url,
      evidence_label: `Bulbapedia Prize Pack Series ${row.accepted_source_series}: ${row.card_name} ${row.card_number} Standard Set non-holo normal`,
      evidence_note: 'Exact Prize Pack active-finish evidence: Bulbapedia promotion Standard Set is accepted as normal; alternate promotion labels are excluded from this lane.',
    });
  }
  return byKey;
}

function buildBulbapediaPrizePackFoilEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_bulbapedia_prize_pack_foil_cosmos')) {
    byKey.set(variantFactKey(row), {
      source_key: 'bulbapedia_prize_pack_foil',
      source_url: row.accepted_source_url,
      evidence_label: `Bulbapedia Prize Pack Series ${row.accepted_source_series}: ${row.card_name} ${row.card_number} Standard Set Foil Cosmos Holofoil`,
      evidence_note: `Exact Prize Pack active-finish evidence: Standard Set Foil row plus explicit page rule routes this card to Cosmos Holofoil. Rule: ${row.accepted_foil_rule_text}`,
    });
  }
  return byKey;
}

function buildTcgcsvPrizePackTitleFinishEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.results ?? []).filter((candidate) => candidate.status === 'accepted_exact_tcgcsv_prize_pack_title_finish')) {
    byKey.set(variantFactKey(row), {
      source_key: 'tcgcsv_prize_pack_title_finish',
      source_url: row.accepted_source_url,
      evidence_label: `TCGCSV/TCGplayer Prize Pack title finish: ${row.accepted_product_name}`,
      evidence_note: 'Exact active-finish evidence accepted only when the Prize Pack product title names a finish and the card-number denominator matches the target set printed total.',
    });
  }
  return byKey;
}

function buildSameFinishAmbiguousAdjudicationEvidence(report) {
  const byKey = new Map();
  for (const row of (report?.rows ?? []).filter((candidate) => candidate.adjudication_status === 'ready_for_guarded_battle_academy_deck_mark_display_metadata_route')) {
    byKey.set(variantFactKey(row), {
      source_key: 'pokecardvalues_same_finish_ambiguous_adjudication',
      source_url: row.source_urls?.[0] ?? null,
      evidence_label: `Poke Card Values Battle Academy same-finish adjudication: ${row.source_titles?.join(' | ')}`,
      evidence_note: `Exact active-finish evidence: every matching Battle Academy deck-number product supports ${row.target_finish_key}. Governance: ${row.governance_rule}`,
    });
  }
  return byKey;
}

function appendFinishEvidence(row, evidenceByKey) {
  const evidence = evidenceByKey.get(variantFactKey(row));
  if (!evidence) return row;
  return {
    ...row,
    preserved_evidence_sources: [...new Set([...(row.preserved_evidence_sources ?? []), evidence.source_key])],
    preserved_evidence_urls: [...new Set([...(row.preserved_evidence_urls ?? []), evidence.source_url].filter(Boolean))],
    preserved_evidence_labels: [...new Set([...(row.preserved_evidence_labels ?? []), evidence.evidence_label])],
    preserved_evidence_notes: [...new Set([...(row.preserved_evidence_notes ?? []), evidence.evidence_note])],
  };
}

function evidenceTexts(row) {
  return [
    ...(row.preserved_evidence_labels ?? []),
    ...(row.preserved_evidence_notes ?? []),
    ...(row.preserved_evidence_snapshot_refs ?? []),
    ...(row.preserved_evidence_urls ?? []),
    row.stamp_label,
  ].filter(Boolean).map(String);
}

function detectFinishClaims(texts) {
  const claims = [];
  for (const text of texts) {
    const normalized = normalizeText(text);
    const compact = normalized.replace(/[^a-z0-9]+/g, ' ').trim();

    if (/^tcgcsv tcgplayer exact stamped subtype\b/.test(compact) && /\bnormal\b/.test(compact)) {
      claims.push({ finish_key: 'normal', reason: 'explicit_tcgcsv_normal_subtype', evidence_text: text });
      continue;
    }
    if (/^bulbapedia prize pack series\b/.test(compact) && /\bstandard set\b/.test(compact) && /\bnormal\b/.test(compact)) {
      claims.push({ finish_key: 'normal', reason: 'explicit_bulbapedia_prize_pack_standard_set', evidence_text: text });
      continue;
    }
    if (/\bnon\s*holo\b|\bnonholo\b|\bnon\s*foil\b|\bnonfoil\b/.test(compact)) {
      claims.push({ finish_key: 'normal', reason: 'explicit_non_holo_label', evidence_text: text });
      continue;
    }
    if (/\bcosmos\b/.test(compact)) {
      claims.push({ finish_key: 'cosmos', reason: 'explicit_cosmos_label', evidence_text: text });
      continue;
    }
    if (/\breverse\b/.test(compact)) {
      claims.push({ finish_key: 'reverse', reason: 'explicit_reverse_label', evidence_text: text });
      continue;
    }
    if (/\bholo\b|\bholofoil\b|\bholographic\b|\bfoil\b/.test(compact)) {
      claims.push({ finish_key: 'holo', reason: 'explicit_holo_label', evidence_text: text });
    }
  }
  return claims;
}

function classifyRoute(row) {
  const baseFinishes = [...new Set(row.base_parent_child_finishes ?? [])].sort();
  const texts = evidenceTexts(row);
  const finishClaims = detectFinishClaims(texts)
    .filter((claim) => ACTIVE_CHILD_FINISHES.has(claim.finish_key));
  const claimFinishes = [...new Set(finishClaims.map((claim) => claim.finish_key))].sort();
  const routedInBase = claimFinishes.filter((finish) => baseFinishes.includes(finish));

  let routing_status = 'blocked_finish_routing_manual_review';
  let target_finish_key = null;
  const blockers = [];

  if (!ROUTABLE_READINESS.has(row.readiness_status)) {
    blockers.push(`source_readiness_${row.readiness_status}`);
  }
  if (baseFinishes.length < 1) blockers.push('base_parent_has_no_child_finishes');
  if (baseFinishes.length === 1 && ACTIVE_CHILD_FINISHES.has(baseFinishes[0])) {
    target_finish_key = baseFinishes[0];
    routing_status = blockers.length === 0
      ? 'ready_single_base_finish'
      : 'blocked_source_readiness';
  } else if (claimFinishes.length === 0) {
    blockers.push('missing_exact_finish_phrase');
    routing_status = 'blocked_missing_exact_finish_phrase';
  } else if (claimFinishes.length > 1) {
    blockers.push(`conflicting_finish_phrases_${claimFinishes.join('_')}`);
    routing_status = 'blocked_conflicting_finish_phrase';
  } else if (routedInBase.length !== 1) {
    target_finish_key = claimFinishes[0];
    routing_status = blockers.length === 0
      ? 'ready_finish_routed_exact_label_external_finish'
      : 'blocked_source_readiness';
  } else if (blockers.length === 0) {
    target_finish_key = routedInBase[0];
    routing_status = 'ready_finish_routed_exact_label';
  } else {
    routing_status = 'blocked_source_readiness';
  }

  if (normalizeText(row.proposed_variant_key) === 'stamped') {
    blockers.push('generic_stamped_variant_key_requires_identity_adjudication');
    routing_status = 'blocked_generic_stamped_variant_key';
    target_finish_key = null;
  }

  const supportingClaims = target_finish_key
    ? finishClaims.filter((claim) => claim.finish_key === target_finish_key)
    : finishClaims;

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    stamp_label: row.stamp_label,
    source_readiness_status: row.readiness_status,
    base_parent_ids: row.base_parent_ids ?? [],
    base_parent_child_finishes: baseFinishes,
    target_finish_key,
    routing_status,
    blockers,
    finish_claims: finishClaims,
    supporting_finish_claims: supportingClaims,
    preserved_evidence_sources: row.preserved_evidence_sources ?? [],
    preserved_evidence_urls: row.preserved_evidence_urls ?? [],
    preserved_evidence_labels: row.preserved_evidence_labels ?? [],
    preserved_evidence_notes: row.preserved_evidence_notes ?? [],
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_routing_status).map(([status, count]) => [status, count]);
  const finishRows = Object.entries(report.summary.by_target_finish_key).map(([finish, count]) => [finish, count]);
  const readyRows = report.rows
    .filter((row) => row.routing_status === 'ready_finish_routed_exact_label'
      || row.routing_status === 'ready_finish_routed_exact_label_external_finish'
      || row.routing_status === 'ready_single_base_finish')
    .slice(0, 40)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label ?? 'unknown',
      row.target_finish_key ?? 'blocked',
      row.routing_status,
    ]);
  const blockedRows = report.rows
    .filter((row) => !row.target_finish_key)
    .slice(0, 40)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label ?? 'unknown',
      row.base_parent_child_finishes.join(', '),
      row.routing_status,
    ]);

  return `# English Master Index PKG-11B Stamped Finish Routing Readiness V1

Read-only routing audit for stamped canonical parent candidates after PKG-11A. This report does not write to the database and does not activate \`stamped\` as a child finish.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- candidate_rows_reviewed: ${report.summary.candidate_rows_reviewed}
- exact_label_routed_rows: ${report.summary.exact_label_routed_rows}
- single_base_finish_rows: ${report.summary.single_base_finish_rows}
- blocked_rows: ${report.summary.blocked_rows}
- already_adjudicated_rows_suppressed: ${report.summary.already_adjudicated_rows_suppressed}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['routing_status', 'rows'], statusRows)}

## Target Finishes

${markdownTable(['target_finish_key', 'rows'], finishRows)}

## Ready Sample

${markdownTable(['set', 'number', 'name', 'stamp_label', 'target_finish', 'status'], readyRows)}

## Blocked Sample

${markdownTable(['set', 'number', 'name', 'stamp_label', 'base_finishes', 'status'], blockedRows)}

## Next Safe Work

- Build a guarded dry-run package only from \`ready_finish_routed_exact_label\`, \`ready_finish_routed_exact_label_external_finish\`, and \`ready_single_base_finish\` rows.
- Do not route rows with missing or conflicting finish phrases.
- Do not infer finish from rarity, era, or generic stamped labels.
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const genericAdjudication = await readOptionalJson(GENERIC_ADJUDICATION_JSON);
  const battleAcademyAdjudication = await readOptionalJson(BATTLE_ACADEMY_ADJUDICATION_JSON);
  const pokeCardValuesStampedFinish = await readOptionalJson(POKECARDVALUES_STAMPED_FINISH_JSON);
  const cardTraderStampedFinish = await readOptionalJson(CARDTRADER_STAMPED_FINISH_JSON);
  const tcgcsvStampedSubtype = await readOptionalJson(TCGCSV_STAMPED_SUBTYPE_JSON);
  const pricechartingStampedActiveFinish = await readOptionalJson(PRICECHARTING_STAMPED_ACTIVE_FINISH_JSON);
  const justinBasilPrizePackFinish = await readOptionalJson(JUSTINBASIL_PRIZE_PACK_FINISH_JSON);
  const bulbapediaPrizePackNormal = await readOptionalJson(BULBAPEDIA_PRIZE_PACK_NORMAL_JSON);
  const bulbapediaPrizePackFoil = await readOptionalJson(BULBAPEDIA_PRIZE_PACK_FOIL_JSON);
  const tcgcsvPrizePackTitleFinish = await readOptionalJson(TCGCSV_PRIZE_PACK_TITLE_FINISH_JSON);
  const sameFinishAmbiguousAdjudication = await readOptionalJson(SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON);
  const pokeCardValuesFinishEvidence = buildPokeCardValuesFinishEvidence(pokeCardValuesStampedFinish);
  const cardTraderFinishEvidence = buildCardTraderFinishEvidence(cardTraderStampedFinish);
  const tcgcsvFinishEvidence = buildTcgcsvFinishEvidence(tcgcsvStampedSubtype);
  const pricechartingStampedActiveFinishEvidence = buildPriceChartingStampedActiveFinishEvidence(pricechartingStampedActiveFinish);
  const justinBasilPrizePackFinishEvidence = buildJustinBasilPrizePackFinishEvidence(justinBasilPrizePackFinish);
  const bulbapediaPrizePackNormalEvidence = buildBulbapediaPrizePackNormalEvidence(bulbapediaPrizePackNormal);
  const bulbapediaPrizePackFoilEvidence = buildBulbapediaPrizePackFoilEvidence(bulbapediaPrizePackFoil);
  const tcgcsvPrizePackTitleFinishEvidence = buildTcgcsvPrizePackTitleFinishEvidence(tcgcsvPrizePackTitleFinish);
  const sameFinishAmbiguousAdjudicationEvidence = buildSameFinishAmbiguousAdjudicationEvidence(sameFinishAmbiguousAdjudication);
  const alreadyAdjudicatedFactKeys = new Set((genericAdjudication?.rows ?? [])
    .filter((row) => row.adjudication_status === 'ready_for_guarded_reverse_stamped_identity_route')
    .map(factKey));
  for (const row of (battleAcademyAdjudication?.rows ?? [])
    .filter((candidate) => candidate.adjudication_status === 'ready_for_guarded_normal_stamped_identity_route')) {
    alreadyAdjudicatedFactKeys.add(factKey(row));
  }
  const sourceRows = (readiness.rows ?? []).filter((row) => (
    ROUTABLE_READINESS.has(row.readiness_status)
    && !alreadyAdjudicatedFactKeys.has(factKey(row))
  ));
  const rows = sourceRows
    .map((row) => appendFinishEvidence(row, pokeCardValuesFinishEvidence))
    .map((row) => appendFinishEvidence(row, cardTraderFinishEvidence))
    .map((row) => appendFinishEvidence(row, tcgcsvFinishEvidence))
    .map((row) => appendFinishEvidence(row, pricechartingStampedActiveFinishEvidence))
    .map((row) => appendFinishEvidence(row, justinBasilPrizePackFinishEvidence))
    .map((row) => appendFinishEvidence(row, bulbapediaPrizePackNormalEvidence))
    .map((row) => appendFinishEvidence(row, bulbapediaPrizePackFoilEvidence))
    .map((row) => appendFinishEvidence(row, tcgcsvPrizePackTitleFinishEvidence))
    .map((row) => appendFinishEvidence(row, sameFinishAmbiguousAdjudicationEvidence))
    .map(classifyRoute);
  const readyExact = rows.filter((row) => row.routing_status === 'ready_finish_routed_exact_label');
  const readyExternalFinish = rows.filter((row) => row.routing_status === 'ready_finish_routed_exact_label_external_finish');
  const readySingle = rows.filter((row) => row.routing_status === 'ready_single_base_finish');
  const readyRows = [...readyExact, ...readyExternalFinish, ...readySingle];
  const payload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    target_finish_key: row.target_finish_key,
    routing_status: row.routing_status,
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: readyRows.length,
    source_artifacts: {
      stamped_identity_readiness: path.relative(ROOT, READINESS_JSON).replaceAll('\\', '/'),
      generic_variant_adjudication: path.relative(ROOT, GENERIC_ADJUDICATION_JSON).replaceAll('\\', '/'),
      battle_academy_non_holo_adjudication: path.relative(ROOT, BATTLE_ACADEMY_ADJUDICATION_JSON).replaceAll('\\', '/'),
      pokecardvalues_stamped_finish_acquisition: path.relative(ROOT, POKECARDVALUES_STAMPED_FINISH_JSON).replaceAll('\\', '/'),
      cardtrader_stamped_finish_acquisition: path.relative(ROOT, CARDTRADER_STAMPED_FINISH_JSON).replaceAll('\\', '/'),
      tcgcsv_stamped_subtype_acquisition: path.relative(ROOT, TCGCSV_STAMPED_SUBTYPE_JSON).replaceAll('\\', '/'),
      pricecharting_stamped_active_finish_acquisition: path.relative(ROOT, PRICECHARTING_STAMPED_ACTIVE_FINISH_JSON).replaceAll('\\', '/'),
      justinbasil_prize_pack_finish_acquisition: path.relative(ROOT, JUSTINBASIL_PRIZE_PACK_FINISH_JSON).replaceAll('\\', '/'),
      bulbapedia_prize_pack_normal_acquisition: path.relative(ROOT, BULBAPEDIA_PRIZE_PACK_NORMAL_JSON).replaceAll('\\', '/'),
      bulbapedia_prize_pack_foil_acquisition: path.relative(ROOT, BULBAPEDIA_PRIZE_PACK_FOIL_JSON).replaceAll('\\', '/'),
      tcgcsv_prize_pack_title_finish_acquisition: path.relative(ROOT, TCGCSV_PRIZE_PACK_TITLE_FINISH_JSON).replaceAll('\\', '/'),
      same_finish_ambiguous_adjudication: path.relative(ROOT, SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON).replaceAll('\\', '/'),
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      candidate_rows_reviewed: rows.length,
      exact_label_routed_rows: readyExact.length,
      exact_label_external_finish_rows: readyExternalFinish.length,
      single_base_finish_rows: readySingle.length,
      blocked_rows: rows.length - readyRows.length,
      already_adjudicated_rows_suppressed: alreadyAdjudicatedFactKeys.size,
      by_routing_status: countBy(rows, (row) => row.routing_status),
      by_target_finish_key: countBy(rows.filter((row) => row.target_finish_key), (row) => row.target_finish_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    recommended_next_package: {
      package_id: 'PKG-11B-STAMPED-CANONICAL-PARENT-IDENTITY-ROUTED',
      candidate_rows: readyRows.length,
      allowed_write_shape: 'insert stamped canonical parent rows with child finish only when routed by exact evidence label or a single existing base finish',
      forbidden_write_shape: 'do not activate stamped finish; do not route generic stamped labels; do not delete or merge base rows',
      status: readyRows.length > 0 ? 'ready_for_guarded_dry_run' : 'blocked_no_routable_rows',
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# PKG-11B Stamped Finish Routing Readiness Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${report.fingerprint_sha256}\`
- Candidate rows reviewed: ${report.summary.candidate_rows_reviewed}
- Exact label routed rows: ${report.summary.exact_label_routed_rows}
- Single base finish rows: ${report.summary.single_base_finish_rows}
- Blocked rows: ${report.summary.blocked_rows}
- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
