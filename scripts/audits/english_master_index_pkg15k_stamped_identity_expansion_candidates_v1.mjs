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
const POKECARDVALUES_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pokecardvalues_stamped_finish_acquisition_v1', 'pokecardvalues_stamped_finish_acquisition_v1.json');
const CARDTRADER_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'cardtrader_stamped_finish_acquisition_v1', 'cardtrader_stamped_finish_acquisition_v1.json');
const PRICECHARTING_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pricecharting_stamped_active_finish_acquisition_v1', 'pricecharting_stamped_active_finish_acquisition_v1.json');
const MANUAL_WEB_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'manual_web_stamped_finish_review_v1', 'manual_web_stamped_finish_review_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15k_stamped_identity_expansion_candidates_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15k_stamped_identity_expansion_candidates_v1.md');

const PACKAGE_ID = 'PKG-15K-STAMPED-IDENTITY-EXPANSION-CANDIDATES';

const VARIANT_TEXT_RULES = [
  [/^Staff National Championships Promo$/i, ['National Championships Staff Stamp', 'national_championships_staff_stamp']],
  [/^Staff National Championship$/i, ['National Championships Staff Stamp', 'national_championships_staff_stamp']],
  [/^National Championships Promo$/i, ['National Championships Stamp', 'national_championships_stamp']],
  [/^National Championship$/i, ['National Championships Stamp', 'national_championships_stamp']],
  [/^Staff Regional Championships Promo$/i, ['Regional Championships Staff Stamp', 'regional_championships_staff_stamp']],
  [/^Staff Regional Championship$/i, ['Regional Championships Staff Stamp', 'regional_championships_staff_stamp']],
  [/^Regional Championships Promo$/i, ['Regional Championships Stamp', 'regional_championships_stamp']],
  [/^Regional Championship$/i, ['Regional Championships Stamp', 'regional_championships_stamp']],
  [/^Staff City Championships Promo$/i, ['City Championships Staff Stamp', 'city_championships_staff_stamp']],
  [/^Staff City Championship$/i, ['City Championships Staff Stamp', 'city_championships_staff_stamp']],
  [/^City Championships Promo$/i, ['City Championships Stamp', 'city_championships_stamp']],
  [/^City Championship$/i, ['City Championships Stamp', 'city_championships_stamp']],
  [/^Staff States Championships Promo$/i, ['States Championships Staff Stamp', 'states_championships_staff_stamp']],
  [/^State Championship Staff$/i, ['States Championships Staff Stamp', 'states_championships_staff_stamp']],
  [/^State Championship$/i, ['State Championships Stamp', 'state_championships_stamp']],
  [/^Staff Europe Championships Promo$/i, ['Europe Championships Staff Stamp', 'europe_championships_staff_stamp']],
  [/^Championships Staff Europe$/i, ['Europe Championships Staff Stamp', 'europe_championships_staff_stamp']],
  [/^Staff Oceania Championships Promo$/i, ['Oceania Championships Staff Stamp', 'oceania_championships_staff_stamp']],
  [/^Championships Staff Oceania$/i, ['Oceania Championships Staff Stamp', 'oceania_championships_staff_stamp']],
  [/^Staff Prerelease Promo$/i, ['Staff Prerelease Stamp', 'staff_prerelease_stamp']],
  [/^Pre-Release Staff$/i, ['Staff Prerelease Stamp', 'staff_prerelease_stamp']],
  [/^Staff League\s*Promo Promo$/i, ['League Staff Stamp', 'league_staff_stamp']],
  [/^League Promo Promo$/i, ['League Stamp', 'league_stamp']],
  [/^Pokemon League$/i, ['League Stamp', 'league_stamp']],
  [/^GameStop Stamp Promo$/i, ['GameStop Stamp', 'gamestop_stamp']],
  [/^Gamestop$/i, ['GameStop Stamp', 'gamestop_stamp']],
  [/^EB Games Stamp Promo$/i, ['EB Games Stamp', 'eb_games_stamp']],
  [/^EB Games$/i, ['EB Games Stamp', 'eb_games_stamp']],
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
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

function variantFromSourceText(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  for (const [pattern, result] of VARIANT_TEXT_RULES) {
    if (pattern.test(text)) {
      const [stampLabel, variantKey] = result;
      return { stamp_label: stampLabel, variant_key: variantKey, confidence: 'exact_source_variant_label' };
    }
  }
  const slug = normalizeText(text).replace(/_promo$/, '').replace(/_stamp$/, '');
  if (!slug) return { stamp_label: null, variant_key: null, confidence: 'missing_source_variant_label' };
  return {
    stamp_label: text.replace(/\bPromo\b/gi, '').trim(),
    variant_key: `${slug}_stamp`.replace(/_stamp_stamp$/, '_stamp'),
    confidence: 'derived_from_exact_source_variant_label',
  };
}

function cardKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeText(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function sourceIdentityKey(row) {
  return [
    cardKey(row),
    normalizeText(row.expanded_variant_key),
    normalizeText(row.finish_key),
  ].join('|');
}

function cardTraderEvidenceIndex(cardTrader) {
  const index = new Map();
  for (const row of cardTrader.results ?? []) {
    for (const title of row.candidate_titles ?? []) {
      const key = [
        normalizeText(row.set_key),
        normalizeText(row.card_number),
        normalizeText(row.card_name),
      ].join('|');
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({
        source_key: 'cardtrader_stamped_finish',
        source_url: row.source_url,
        evidence_label: title,
        status: row.status,
      });
    }
  }
  return index;
}

function priceChartingEvidenceIndex(priceCharting) {
  const index = new Map();
  for (const row of priceCharting.results ?? []) {
    const baseKey = cardKey(row);
    for (const candidate of row.reviewed_candidates ?? []) {
      const bracketMatch = String(candidate.product_name ?? '').match(/\[([^\]]+)\]/);
      if (!bracketMatch?.[1]) continue;
      const variant = variantFromSourceText(bracketMatch[1]);
      if (!variant.variant_key) continue;
      const key = `${baseKey}|${normalizeText(variant.variant_key)}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({
        source_key: 'pricecharting_csv_product',
        source_url: candidate.source_url,
        evidence_label: candidate.product_name,
        validation_reason: candidate.validation?.reason ?? null,
      });
    }
  }
  return index;
}

function manualWebEvidenceIndex(manualWeb) {
  const index = new Map();
  for (const row of manualWeb.rows ?? []) {
    if (row.match_status !== 'exact_pkg15k_match') continue;
    const key = [
      normalizeText(row.set_key),
      normalizeText(row.card_number).replace(/^0+(?=\d)/, ''),
      normalizeText(row.card_name),
      normalizeText(row.expanded_variant_key),
      normalizeText(row.finish_key),
    ].join('|');
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({
      source_key: row.source_key,
      source_kind: row.source_kind,
      source_url: row.source_url,
      evidence_label: row.evidence_label,
      evidence_type: row.evidence_type,
    });
  }
  return index;
}

function exactExpandedIdentityKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeText(row.card_number).replace(/^0+(?=\d)/, ''),
    normalizeText(row.card_name),
    normalizeText(row.expanded_variant_key),
    normalizeText(row.finish_key),
  ].join('|');
}

function classifyExpansion({ parentRow, match, cardTraderIndex, priceChartingIndex, manualWebIndex }) {
  const variant = variantFromSourceText(match.variant_text);
  const baseKey = cardKey(parentRow);
  const priceChartingIdentityEvidence = priceChartingIndex.get(`${baseKey}|${normalizeText(variant.variant_key)}`) ?? [];
  const manualWebEvidence = manualWebIndex.get(exactExpandedIdentityKey({
    set_key: parentRow.set_key,
    card_number: parentRow.card_number,
    card_name: parentRow.card_name,
    expanded_variant_key: variant.variant_key,
    finish_key: match.finish_key,
  })) ?? [];
  const independentIdentitySources = ['pokecardvalues_stamped_finish'];
  if (priceChartingIdentityEvidence.length > 0) independentIdentitySources.push('pricecharting_csv_product');
  for (const sourceKey of new Set(manualWebEvidence.map((row) => row.source_key))) {
    independentIdentitySources.push(sourceKey);
  }
  const independentFinishSources = ['pokecardvalues_stamped_finish'];
  for (const sourceKey of new Set(manualWebEvidence.map((row) => row.source_key))) {
    independentFinishSources.push(sourceKey);
  }
  const expanded = {
    source_parent_set_key: parentRow.set_key,
    set_key: parentRow.set_key,
    set_name: parentRow.set_name,
    card_number: parentRow.card_number,
    card_name: parentRow.card_name,
    current_master_variant_key: parentRow.proposed_variant_key,
    current_master_stamp_label: parentRow.stamp_label,
    expanded_variant_key: variant.variant_key,
    expanded_stamp_label: variant.stamp_label,
    expanded_variant_confidence: variant.confidence,
    finish_key: match.finish_key,
    source_variant_text: match.variant_text,
    source_title: match.source_title,
    source_url: match.source_url,
    source_key: 'pokecardvalues_stamped_finish',
    source_kind: 'collector_reference',
    identity_source_count_for_exact_expanded_identity: new Set(independentIdentitySources).size,
    finish_source_count_for_exact_expanded_identity: new Set(independentFinishSources).size,
    independent_identity_sources: independentIdentitySources,
    independent_finish_sources: independentFinishSources,
    matching_cardtrader_context: cardTraderIndex.get(baseKey) ?? [],
    matching_pricecharting_identity_context: priceChartingIdentityEvidence,
    matching_manual_web_finish_context: manualWebEvidence,
  };

  if (!variant.variant_key || !match.finish_key) {
    return {
      ...expanded,
      expansion_status: 'blocked_unparseable_source_identity_or_finish',
      recommended_next_action: 'Do not promote. Source product row needs manual parsing before it can enter the Master Index.',
    };
  }

  const matchesCurrent = normalizeText(variant.variant_key) === normalizeText(parentRow.proposed_variant_key);
  const hasMultiIdentity = expanded.identity_source_count_for_exact_expanded_identity >= 2;
  const hasMultiFinish = expanded.finish_source_count_for_exact_expanded_identity >= 2;
  return {
    ...expanded,
    expansion_status: matchesCurrent
      ? (hasMultiIdentity
        ? (hasMultiFinish
          ? 'current_master_identity_multi_source_finish_multi_source_review_ready'
          : 'current_master_identity_multi_source_finish_single_source')
        : 'current_master_identity_single_source_finish_supported')
      : (hasMultiIdentity
        ? (hasMultiFinish
          ? 'candidate_missing_more_specific_identity_multi_source_finish_multi_source_review_ready'
          : 'candidate_missing_more_specific_identity_multi_source_finish_single_source')
        : 'candidate_missing_more_specific_identity_single_source'),
    recommended_next_action: matchesCurrent
      ? (hasMultiFinish
        ? 'Eligible for a later guarded stamped readiness package. Do not write until DB dependency and conflict gates pass.'
        : 'Keep blocked from DB write until a second independent source confirms the exact active finish for this stamped identity.')
      : (hasMultiFinish
        ? 'Review as an expanded stamped identity candidate for a later guarded parent/child package. Do not write until identity split and conflict gates pass.'
        : 'Treat as a Master Index expansion candidate, not DB truth. Acquire a second independent source for this exact stamped identity and finish.'),
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_expansion_status).map(([status, count]) => [status, count]);
  const variantRows = Object.entries(report.summary.by_expanded_variant_key).slice(0, 30).map(([variant, count]) => [variant, count]);
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.expanded_variant_key,
    row.finish_key,
    row.expansion_status,
  ]);

  return `# PKG-15K Stamped Identity Expansion Candidates V1

Audit-only expansion report for Poke Card Values stamped rows that exposed multiple exact source products for the same set/card/number/name.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- parent_rows_reviewed: ${report.summary.parent_rows_reviewed}
- exact_source_products_reviewed: ${report.summary.exact_source_products_reviewed}
- expansion_candidate_rows: ${report.summary.expansion_candidate_rows}
- identity_multi_source_rows: ${report.summary.identity_multi_source_rows}
- finish_multi_source_rows: ${report.summary.finish_multi_source_rows}
- current_identity_single_source_rows: ${report.summary.current_identity_single_source_rows}
- missing_more_specific_identity_rows: ${report.summary.missing_more_specific_identity_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['expansion_status', 'rows'], statusRows)}

## Expanded Variant Keys

${markdownTable(['expanded_variant_key', 'rows'], variantRows)}

## Rows

${markdownTable(['set', 'number', 'name', 'expanded_variant_key', 'finish', 'status'], rows)}

## Rule

These rows are not write authority. Poke Card Values can prove an exact stamped product title and active finish, but Grookai still requires a second independent source before the expanded identity becomes Master Index truth or DB reconciliation authority.
`;
}

async function main() {
  const [pokeCardValues, cardTrader, priceCharting, manualWeb] = await Promise.all([
    readJson(POKECARDVALUES_JSON),
    readJson(CARDTRADER_JSON),
    readJson(PRICECHARTING_JSON),
    readJsonIfExists(MANUAL_WEB_JSON, { rows: [] }),
  ]);
  const cardTraderIndex = cardTraderEvidenceIndex(cardTrader);
  const priceChartingIndex = priceChartingEvidenceIndex(priceCharting);
  const manualWebIndex = manualWebEvidenceIndex(manualWeb);
  const parentRows = (pokeCardValues.results ?? [])
    .filter((row) => row.status === 'blocked_multiple_matching_stamp_variants');
  const rows = parentRows
    .flatMap((row) => (row.reviewed_matches ?? []).map((match) => classifyExpansion({
      parentRow: row,
      match,
      cardTraderIndex,
      priceChartingIndex,
      manualWebIndex,
    })))
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.expanded_variant_key).localeCompare(String(right.expanded_variant_key)));

  const duplicateIdentityKeys = countBy(rows, sourceIdentityKey);
  const duplicateRows = rows.filter((row) => duplicateIdentityKeys[sourceIdentityKey(row)] > 1);
  const fingerprintPayload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: normalizeText(row.card_name),
    expanded_variant_key: row.expanded_variant_key,
    finish_key: row.finish_key,
    source_url: row.source_url,
    expansion_status: row.expansion_status,
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15k_stamped_identity_expansion_candidates_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      pokecardvalues_stamped_finish_acquisition: path.relative(ROOT, POKECARDVALUES_JSON).replaceAll('\\', '/'),
      cardtrader_stamped_finish_acquisition: path.relative(ROOT, CARDTRADER_JSON).replaceAll('\\', '/'),
      pricecharting_stamped_active_finish_acquisition: path.relative(ROOT, PRICECHARTING_JSON).replaceAll('\\', '/'),
      manual_web_stamped_finish_review: path.relative(ROOT, MANUAL_WEB_JSON).replaceAll('\\', '/'),
    },
    summary: {
      parent_rows_reviewed: parentRows.length,
      exact_source_products_reviewed: rows.length,
      expansion_candidate_rows: rows.length,
      identity_multi_source_rows: rows.filter((row) => row.identity_source_count_for_exact_expanded_identity >= 2).length,
      finish_multi_source_rows: rows.filter((row) => row.finish_source_count_for_exact_expanded_identity >= 2).length,
      current_identity_single_source_rows: rows.filter((row) => row.expansion_status === 'current_master_identity_single_source_finish_supported').length,
      missing_more_specific_identity_rows: rows.filter((row) => row.expansion_status.startsWith('candidate_missing_more_specific_identity')).length,
      duplicate_exact_identity_rows: duplicateRows.length,
      by_expansion_status: countBy(rows, (row) => row.expansion_status),
      by_finish_key: countBy(rows, (row) => row.finish_key ?? 'unknown'),
      by_expanded_variant_key: countBy(rows, (row) => row.expanded_variant_key ?? 'unknown'),
      by_set: countBy(rows, (row) => row.set_key),
    },
    governance: {
      rule: 'Do not collapse staff and non-staff event stamp source products into one generic stamped parent. Preserve them as exact identity expansion candidates until a second independent source supports the same set/card/number/name/variant/finish fact.',
      promotion_status: 'blocked_second_source_required',
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson(fingerprintPayload));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    write_ready_now: report.write_ready_now,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
