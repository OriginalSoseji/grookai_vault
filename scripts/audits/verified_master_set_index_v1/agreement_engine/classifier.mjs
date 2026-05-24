import {
  cardFactKey,
  printingFactKey,
  HUMAN_SOURCE_KINDS,
  normalizeNumber,
  normalizeText,
  sourceAuthorityKey,
  uniqueSorted,
} from '../shared.mjs';

function classifyRows(rows, { finishTruth = false } = {}) {
  const sourceKeys = uniqueSorted(rows.map(sourceAuthorityKey));
  const structuredSources = uniqueSorted(
    rows.filter((row) => row.source_kind === 'structured_api').map(sourceAuthorityKey),
  );
  const humanSources = uniqueSorted(
    rows.filter((row) => HUMAN_SOURCE_KINDS.has(row.source_kind)).map(sourceAuthorityKey),
  );

  if (sourceKeys.length < 2) {
    return humanSources.length > 0 ? 'human_source_verified' : 'candidate_unconfirmed';
  }

  if (finishTruth) {
    return humanSources.length > 0 ? 'master_verified' : 'api_agreed';
  }

  if (humanSources.length > 0) return 'master_verified';
  if (structuredSources.length >= 2) return 'api_agreed';
  return 'candidate_unconfirmed';
}

function classifyAbsentRows(rows) {
  const sourceKeys = uniqueSorted(rows.map(sourceAuthorityKey));
  return {
    status: 'finish_absent_source_backed',
    source_count: sourceKeys.length,
  };
}

function evidenceSummary(row) {
  return {
    source_key: row.source_key,
    source_kind: row.source_kind,
    source_url: row.source_url,
    evidence_type: row.evidence_type,
    evidence_label: row.evidence_label,
    finish_key_raw: row.finish_key_raw ?? null,
    notes: row.notes ?? null,
    rarity: row.rarity,
    retrieved_at: row.retrieved_at,
    raw_snapshot_ref: row.raw_snapshot_ref,
  };
}

function isAmbiguousCardRows(rows) {
  const names = uniqueSorted(rows.map((row) => normalizeText(row.card_name)));
  const numbers = uniqueSorted(rows.map((row) => normalizeNumber(row.card_number)));
  const sets = uniqueSorted(rows.map((row) => normalizeText(row.set_name)));
  return names.length > 1 || numbers.length > 1 || sets.length > 1;
}

function buildFactRecord(rows, status, { finishTruth = false } = {}) {
  const first = rows[0];
  return {
    status,
    set_key: first.set_key,
    set_name: first.set_name,
    card_number: first.card_number,
    card_name: first.card_name,
    finish_key: finishTruth ? first.finish_key : null,
    rarity_values: uniqueSorted(rows.map((row) => row.rarity)),
    source_count: uniqueSorted(rows.map(sourceAuthorityKey)).length,
    sources: uniqueSorted(rows.map((row) => row.source_key)),
    source_authorities: uniqueSorted(rows.map(sourceAuthorityKey)),
    source_kinds: uniqueSorted(rows.map((row) => row.source_kind)),
    evidence: rows.map(evidenceSummary),
  };
}

export function classifyEvidence(records) {
  const identityRows = records.filter((record) => (
    record.language === 'en' && !record.finish_key && record.card_number && record.card_name
  ));
  const printingRows = records.filter((record) => (
    record.language === 'en'
    && record.finish_key
    && record.card_number
    && record.card_name
    && ['finish_presence', 'finish_absence'].includes(record.evidence_type)
  ));
  const nonExactPrintingRows = records.filter((record) => (
    record.language === 'en'
    && record.finish_key
    && record.card_number
    && record.card_name
    && !['finish_presence', 'finish_absence'].includes(record.evidence_type)
  ));
  const setLevelRows = records.filter((record) => record.language === 'en' && (!record.card_number || !record.card_name));

  const cardGroups = new Map();
  for (const row of identityRows) {
    const key = cardFactKey(row);
    if (!cardGroups.has(key)) cardGroups.set(key, []);
    cardGroups.get(key).push(row);
  }

  const printingGroups = new Map();
  for (const row of printingRows) {
    const key = printingFactKey(row);
    if (!printingGroups.has(key)) printingGroups.set(key, []);
    printingGroups.get(key).push(row);
  }

  const cards = [];
  const printings = [];
  const finishAbsences = [];
  const conflicts = [];
  const manualReview = [];

  for (const [key, rows] of cardGroups.entries()) {
    if (isAmbiguousCardRows(rows)) {
      conflicts.push({ fact_type: 'card_identity', key, ...buildFactRecord(rows, 'conflicting') });
      continue;
    }
    const status = classifyRows(rows);
    const record = { fact_type: 'card_identity', key, ...buildFactRecord(rows, status) };
    if (status === 'candidate_unconfirmed') manualReview.push({ ...record, status: 'needs_manual_review' });
    cards.push(record);
  }

  for (const [key, rows] of printingGroups.entries()) {
    const presenceRows = rows.filter((row) => row.evidence_type !== 'finish_absence');
    const absenceRows = rows.filter((row) => row.evidence_type === 'finish_absence');

    if (presenceRows.length > 0 && absenceRows.length > 0) {
      conflicts.push({ fact_type: 'printing_finish', key, ...buildFactRecord(rows, 'conflicting', { finishTruth: true }) });
      continue;
    }

    if (absenceRows.length > 0) {
      const absence = classifyAbsentRows(absenceRows);
      const record = {
        fact_type: 'printing_finish',
        key,
        ...buildFactRecord(absenceRows, absence.status, { finishTruth: true }),
        source_count: absence.source_count,
      };
      finishAbsences.push(record);
      continue;
    }

    const status = classifyRows(presenceRows, { finishTruth: true });
    const record = { fact_type: 'printing_finish', key, ...buildFactRecord(presenceRows, status, { finishTruth: true }) };
    if (status === 'candidate_unconfirmed') manualReview.push({ ...record, status: 'needs_manual_review' });
    printings.push(record);
  }

  const setLevelManualReview = setLevelRows.map((row) => ({
    fact_type: 'set_level_evidence',
    key: `${normalizeText(row.set_name)}|${row.evidence_type}|${row.finish_key ?? ''}`,
    status: 'needs_manual_review',
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number ?? null,
    card_name: row.card_name ?? null,
    finish_key: row.finish_key ?? null,
    source_count: 1,
    sources: [row.source_key],
    source_authorities: uniqueSorted([sourceAuthorityKey(row)]),
    source_kinds: [row.source_kind],
    evidence: [evidenceSummary(row)],
  }));

  const nonExactManualReview = nonExactPrintingRows.map((row) => ({
    fact_type: 'printing_finish',
    key: printingFactKey(row),
    status: 'needs_manual_review',
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    source_count: 1,
    sources: [row.source_key],
    source_authorities: uniqueSorted([sourceAuthorityKey(row)]),
    source_kinds: [row.source_kind],
    evidence: [evidenceSummary(row)],
  }));

  return {
    cards,
    printings,
    finish_absences: finishAbsences,
    conflicts,
    manual_review: [...manualReview, ...setLevelManualReview, ...nonExactManualReview],
  };
}
