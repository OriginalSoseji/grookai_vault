import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const SOURCE_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const OUTPUT_DIR = 'docs/audits/english_master_index_completion_v1';
const FINISH_BLOCKER_CLOSURE_FILE = 'english_master_index_finish_blocker_closure_v1.json';
const GENERATED_FILES = [
  'english_master_index_completion_v1.json',
  'english_master_index_completion_v1.md',
  'english_master_index_set_completion_matrix_v1.json',
  'english_master_index_set_completion_matrix_v1.md',
  'english_master_index_adjudicated_excluded_printings_v1.json',
  'english_master_index_adjudicated_excluded_printings_v1.md',
  'english_master_index_source_gap_queue_v1.json',
  'english_master_index_source_gap_queue_v1.md',
  'english_master_index_source_worklist_v1.json',
  'english_master_index_source_worklist_v1.md',
  'english_master_index_master_admissible_export_v1.json',
  'english_master_index_master_admissible_export_v1.md',
  'english_master_index_reused_scaffold_map_v1.json',
  'english_master_index_reused_scaffold_map_v1.md',
];

const HUMAN_SOURCE_KINDS = new Set([
  'official_gallery',
  'human_readable_checklist',
  'marketplace_checklist',
  'collector_reference',
  'manual_review',
]);
const NON_STANDARD_SINGLE_SOURCE_REFERENCE_SETS = new Map([
  ['jumbo', {
    status: 'non_standard_single_source_reference',
    verification_level: 'not_double_verified',
    policy: 'Jumbo cards are tracked as a non-standard reference lane. They are not required to satisfy normal double-source Master Index completion and are not publishable as complete standard set truth.',
  }],
  ['sp', {
    status: 'non_standard_single_source_reference',
    verification_level: 'not_double_verified',
    policy: 'Sample cards are tracked as a non-standard prototype/reference lane until exact card-level sample coverage has deterministic independent source agreement.',
  }],
]);

function addCount(target, key, count = 1) {
  const normalized = String(key ?? '').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((Number(numerator) / Number(denominator)) * 100).toFixed(2));
}

function topEntries(object, limit = 50) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(SOURCE_DIR, fileName), 'utf8'));
}

async function readOptionalJson(fileName, fallback) {
  try {
    return await readJson(fileName);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(fileName, data, options = {}) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const body = options.compact ? JSON.stringify(data) : JSON.stringify(data, null, 2);
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${body}\n`);
}

async function writeMarkdown(fileName, data) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), data);
}

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
  };
}

function isMasterAdmissibleCard(card) {
  return card.status === 'master_verified' || (
    card.source_count >= 2
    && ['api_agreed', 'human_source_verified'].includes(card.status)
  );
}

function isMasterAdmissiblePrinting(printing) {
  return printing.status === 'master_verified'
    && printing.source_count >= 2
    && (printing.source_kinds ?? []).some((kind) => HUMAN_SOURCE_KINDS.has(kind));
}

function identityKey(row) {
  return [
    setKey(row),
    String(row.card_number ?? '').trim(),
    String(row.card_name ?? '').trim().toLowerCase(),
  ].join('|');
}

function hasHumanSource(row) {
  return (row.source_kinds ?? []).some((kind) => HUMAN_SOURCE_KINDS.has(kind));
}

function setKey(row) {
  return String(row?.set_key ?? 'unknown').trim() || 'unknown';
}

function finishFactKey(row) {
  return [
    row.set_key,
    row.card_number ?? '',
    String(row.card_name ?? '').trim().toLowerCase(),
    row.finish_key ?? row.gap_finish_key ?? '',
  ].join('|');
}

function buildFinishBlockerMap(blockerClosure) {
  const map = new Map();
  for (const row of blockerClosure.mapped_blockers ?? []) {
    map.set(finishFactKey(row), row);
  }
  return map;
}

function makeSetBucket(set) {
  return {
    set_key: set.key,
    set_name: set.set_name,
    source_aliases: set.source_aliases ?? {},
    source_status: set.source_status ?? {},
    source_totals: set.source_totals ?? {},
    source_availability: {},
    card_identity: {
      total_working_facts: 0,
      master_admissible: 0,
      api_agreed: 0,
      candidate_unconfirmed: 0,
      master_verified: 0,
      human_supported: 0,
      master_admissible_from_exact_printing: 0,
      manual_review_resolved_by_exact_printing: 0,
      conflicts: 0,
      manual_review: 0,
    },
    printings: {
      total_working_facts: 0,
      master_admissible: 0,
      api_agreed: 0,
      candidate_unconfirmed: 0,
      master_verified: 0,
      human_supported: 0,
      conflicts: 0,
      manual_review: 0,
      finish_absences: 0,
      finish_blocker_boundary: 0,
      adjudicated_excluded: 0,
    },
    finish_counts: {},
    source_keys: {},
    evidence_urls_sample: [],
    completion: null,
  };
}

function ensureBucket(buckets, key, seed = {}) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  if (!buckets.has(normalized)) {
    buckets.set(normalized, makeSetBucket({
      key: normalized,
      set_name: seed.set_name ?? null,
      source_aliases: seed.source_aliases ?? {},
      source_status: seed.source_status ?? {},
      source_totals: seed.source_totals ?? {},
    }));
  }
  return buckets.get(normalized);
}

function collectEvidence(bucket, row) {
  for (const source of row.sources ?? []) addCount(bucket.source_keys, source);
  const urls = Array.isArray(row.evidence_urls)
    ? row.evidence_urls
    : (row.evidence ?? []).map((evidence) => evidence.source_url);
  for (const url of urls) {
    if (bucket.evidence_urls_sample.length >= 8) break;
    if (url) bucket.evidence_urls_sample.push(url);
  }
}

function applySourceAvailability(buckets, availability) {
  for (const row of availability.source_availability ?? []) {
    if (row.set_key === 'human_fixtures') continue;
    const bucket = ensureBucket(buckets, row.set_key, { set_name: row.set_name });
    bucket.source_availability[row.source_key] = {
      source_alias: row.source_alias ?? null,
      configured_status: row.configured_status ?? null,
      runtime_status: row.runtime_status ?? null,
      evidence_rows: row.evidence_rows ?? 0,
      error: row.error ?? null,
    };
  }
}

function applyCards(buckets, cardsArtifact) {
  for (const card of cardsArtifact.cards ?? []) {
    const bucket = ensureBucket(buckets, setKey(card), { set_name: card.set_name });
    bucket.card_identity.total_working_facts += 1;
    if (isMasterAdmissibleCard(card)) bucket.card_identity.master_admissible += 1;
    if (card.status === 'api_agreed') bucket.card_identity.api_agreed += 1;
    if (card.status === 'candidate_unconfirmed') bucket.card_identity.candidate_unconfirmed += 1;
    if (card.status === 'master_verified') bucket.card_identity.master_verified += 1;
    if (hasHumanSource(card)) bucket.card_identity.human_supported += 1;
    collectEvidence(bucket, card);
  }
}

function applyPrintings(buckets, printingsArtifact, finishBlockerMap) {
  for (const printing of printingsArtifact.printings ?? []) {
    const bucket = ensureBucket(buckets, setKey(printing), { set_name: printing.set_name });
    if (finishBlockerMap.has(finishFactKey(printing))) {
      bucket.printings.adjudicated_excluded += 1;
      continue;
    }
    bucket.printings.total_working_facts += 1;
    if (isMasterAdmissiblePrinting(printing)) bucket.printings.master_admissible += 1;
    if (printing.status === 'api_agreed') bucket.printings.api_agreed += 1;
    if (printing.status === 'candidate_unconfirmed') bucket.printings.candidate_unconfirmed += 1;
    if (printing.status === 'master_verified') bucket.printings.master_verified += 1;
    if (hasHumanSource(printing)) bucket.printings.human_supported += 1;
    addCount(bucket.finish_counts, printing.finish_key);
    collectEvidence(bucket, printing);
  }
  for (const absence of printingsArtifact.finish_absences ?? []) {
    const bucket = ensureBucket(buckets, setKey(absence), { set_name: absence.set_name });
    bucket.printings.finish_absences += 1;
    collectEvidence(bucket, absence);
  }
}

function applyPrintingDerivedCardIdentity(buckets, cardsArtifact, printingsArtifact) {
  const printingSupportedIdentities = new Set(
    (printingsArtifact.printings ?? [])
      .filter(isMasterAdmissiblePrinting)
      .map(identityKey),
  );
  const alreadyAdmissible = new Set(
    (cardsArtifact.cards ?? [])
      .filter(isMasterAdmissibleCard)
      .map(identityKey),
  );
  const derivedBySet = new Map();

  for (const card of cardsArtifact.cards ?? []) {
    const key = identityKey(card);
    if (alreadyAdmissible.has(key)) continue;
    if (!printingSupportedIdentities.has(key)) continue;
    const current = derivedBySet.get(setKey(card)) ?? new Set();
    current.add(key);
    derivedBySet.set(setKey(card), current);
    alreadyAdmissible.add(key);
  }

  for (const [key, identities] of derivedBySet.entries()) {
    const bucket = ensureBucket(buckets, key);
    bucket.card_identity.master_admissible += identities.size;
    bucket.card_identity.master_admissible_from_exact_printing += identities.size;
  }
}

function applyManualReview(buckets, manualReviewArtifact) {
  for (const row of manualReviewArtifact.manual_review ?? []) {
    const bucket = ensureBucket(buckets, setKey(row), { set_name: row.set_name });
    if (row.fact_type === 'card_identity') bucket.card_identity.manual_review += 1;
    if (row.fact_type === 'printing_finish') bucket.printings.manual_review += 1;
  }
}

function resolveManualReviewWithPrintingDerivedIdentity(buckets) {
  for (const bucket of buckets.values()) {
    const resolved = Math.min(
      bucket.card_identity.manual_review,
      bucket.card_identity.master_admissible_from_exact_printing,
    );
    bucket.card_identity.manual_review -= resolved;
    bucket.card_identity.manual_review_resolved_by_exact_printing = resolved;
  }
}

function applyConflicts(buckets, conflictsArtifact) {
  for (const row of conflictsArtifact.conflicts ?? []) {
    const bucket = ensureBucket(buckets, setKey(row), { set_name: row.set_name });
    if (row.fact_type === 'card_identity') bucket.card_identity.conflicts += 1;
    if (row.fact_type === 'printing_finish') bucket.printings.conflicts += 1;
  }
}

function completionStatus(bucket) {
  const nonStandardReference = NON_STANDARD_SINGLE_SOURCE_REFERENCE_SETS.get(bucket.set_key);
  if (nonStandardReference) return nonStandardReference.status;

  const cardTotal = bucket.card_identity.total_working_facts;
  const printingTotal = bucket.printings.total_working_facts;
  const cardComplete = cardTotal > 0 && bucket.card_identity.master_admissible === cardTotal;
  const printingComplete = printingTotal > 0 && bucket.printings.master_admissible === printingTotal;
  const hasConflict = bucket.card_identity.conflicts || bucket.printings.conflicts;
  const hasSource = Object.values(bucket.source_availability).some((source) => source.runtime_status === 'collected' || source.evidence_rows > 0);
  const structuredSourceCount = Object.values(bucket.source_availability).filter((source) => source.runtime_status === 'collected' && source.evidence_rows > 0).length;
  const humanEvidenceRows = bucket.card_identity.human_supported + bucket.printings.human_supported;

  if (hasConflict) return 'conflict_blocked';
  if (!cardTotal && !printingTotal && !hasSource) return 'source_unavailable';
  if (cardComplete && printingComplete) return 'complete_master_index_set';
  if (cardComplete && !printingComplete) return 'card_identity_complete_finish_incomplete';
  if (structuredSourceCount >= 2 && cardTotal > 0) return 'source_agreed_card_identity';
  if (humanEvidenceRows === 0 && printingTotal > 0) return 'finish_evidence_missing';
  if (structuredSourceCount < 2) return 'source_limited';
  return 'manual_review_required';
}

function scoreBucket(bucket) {
  const cardPct = pct(bucket.card_identity.master_admissible, bucket.card_identity.total_working_facts);
  const printingPct = pct(bucket.printings.master_admissible, bucket.printings.total_working_facts);
  const sourceCount = Object.values(bucket.source_availability).filter((source) => source.runtime_status === 'collected' && source.evidence_rows > 0).length;
  const sourceScore = Math.min(100, sourceCount * 50);
  const humanScore = bucket.printings.total_working_facts ? pct(bucket.printings.human_supported, bucket.printings.total_working_facts) : 0;
  return Number(((cardPct * 0.35) + (printingPct * 0.4) + (sourceScore * 0.15) + (humanScore * 0.1)).toFixed(2));
}

function finalizeBuckets(buckets) {
  return [...buckets.values()].map((bucket) => {
    const status = completionStatus(bucket);
    const nonStandardReference = NON_STANDARD_SINGLE_SOURCE_REFERENCE_SETS.get(bucket.set_key) ?? null;
    const cardPct = pct(bucket.card_identity.master_admissible, bucket.card_identity.total_working_facts);
    const printingPct = pct(bucket.printings.master_admissible, bucket.printings.total_working_facts);
    const completionScore = scoreBucket(bucket);
    return {
      ...bucket,
      evidence_urls_sample: uniqueSorted(bucket.evidence_urls_sample).slice(0, 8),
      completion: {
        status,
        completion_score: completionScore,
        card_identity_master_admissible_percent: cardPct,
        printing_master_admissible_percent: printingPct,
        master_index_complete: status === 'complete_master_index_set',
        eligible_for_future_downstream_audit: status === 'complete_master_index_set',
        verification_level: nonStandardReference?.verification_level ?? 'normal_double_source_required',
        non_standard_policy: nonStandardReference?.policy ?? null,
        blocker_summary: blockerSummary(bucket, status),
      },
    };
  }).sort((left, right) => (
    left.completion.status.localeCompare(right.completion.status)
    || right.completion.completion_score - left.completion.completion_score
    || left.set_key.localeCompare(right.set_key)
  ));
}

function blockerSummary(bucket, status) {
  if (status === 'complete_master_index_set') return 'No current completion blocker.';
  if (status === 'conflict_blocked') return 'Resolve source conflicts before admission.';
  if (status === 'non_standard_single_source_reference') return 'Non-standard reference lane; not double verified and not normal Master Index completion authority.';
  if (status === 'source_unavailable') return 'No usable source evidence collected for this set.';
  if (bucket.card_identity.master_admissible < bucket.card_identity.total_working_facts) return 'Card identities need second-source agreement.';
  const printingGap = bucket.printings.total_working_facts - bucket.printings.master_admissible;
  if (printingGap > 0 && bucket.printings.finish_blocker_boundary === printingGap) {
    return 'Remaining printing/finish facts are blocker-boundary rows requiring manual finish or number adjudication.';
  }
  if (bucket.printings.master_admissible < bucket.printings.total_working_facts) return 'Printing/finish facts need human-readable checklist evidence and exact card-level support.';
  return 'Manual review required.';
}

function buildGapQueue(setRows) {
  const queue = [];
  for (const set of setRows) {
    if (set.completion.status === 'complete_master_index_set') continue;
    if (set.card_identity.master_admissible < set.card_identity.total_working_facts) {
      queue.push({
        lane: 'card_identity_second_source',
        set_key: set.set_key,
        set_name: set.set_name,
        gap_count: set.card_identity.total_working_facts - set.card_identity.master_admissible,
        priority: priorityForSet(set, 90),
        required_evidence: 'Independent source agreement for set + card_number + card_name.',
        mutation_authority: 'not mutation authority',
      });
    }
    if (set.printings.master_admissible < set.printings.total_working_facts) {
      const finishGapCount = set.printings.total_working_facts - set.printings.master_admissible;
      const blockerOnly = set.printings.finish_blocker_boundary > 0 && set.printings.finish_blocker_boundary === finishGapCount;
      queue.push({
        lane: blockerOnly ? 'finish_blocker_boundary_adjudication' : 'finish_human_checklist_evidence',
        set_key: set.set_key,
        set_name: set.set_name,
        gap_count: finishGapCount,
        priority: priorityForSet(set, 100),
        required_evidence: blockerOnly
          ? 'Manual finish-label or card-number adjudication. Do not promote from broad source acquisition.'
          : 'Human-readable/checklist exact finish evidence with second-source agreement.',
        mutation_authority: 'not mutation authority',
      });
    }
    if (set.completion.status === 'source_unavailable') {
      queue.push({
        lane: 'source_alias_or_adapter_required',
        set_key: set.set_key,
        set_name: set.set_name,
        gap_count: 1,
        priority: priorityForSet(set, 80),
        required_evidence: 'At least one stable source alias and source adapter/fixture.',
        mutation_authority: 'not mutation authority',
      });
    }
  }
  return queue.sort((left, right) => right.priority - left.priority || right.gap_count - left.gap_count || left.set_key.localeCompare(right.set_key));
}

function buildSourceWorklist(setRows, gapQueue) {
  const gapsBySet = new Map();
  for (const gap of gapQueue) {
    const key = setKey(gap);
    const current = gapsBySet.get(key) ?? {
      lanes: [],
      total_gap_count: 0,
      max_priority: 0,
      required_evidence: [],
    };
    current.lanes.push(gap.lane);
    current.total_gap_count += gap.gap_count ?? 0;
    current.max_priority = Math.max(current.max_priority, gap.priority ?? 0);
    current.required_evidence.push(gap.required_evidence);
    gapsBySet.set(key, current);
  }

  return setRows
    .filter((set) => set.completion.status !== 'complete_master_index_set')
    .map((set) => {
      const gaps = gapsBySet.get(set.set_key) ?? {
        lanes: [],
        total_gap_count: 0,
        max_priority: 0,
        required_evidence: [],
      };
      return {
        rank: 0,
        set_key: set.set_key,
        set_name: set.set_name,
        completion_status: set.completion.status,
        completion_score: set.completion.completion_score,
        total_gap_count: gaps.total_gap_count,
        card_identity_gap_count: Math.max(0, set.card_identity.total_working_facts - set.card_identity.master_admissible),
        printing_finish_gap_count: Math.max(0, set.printings.total_working_facts - set.printings.master_admissible),
        finish_blocker_boundary_count: set.printings.finish_blocker_boundary,
        source_alias_gap: set.completion.status === 'source_unavailable',
        lanes: uniqueSorted(gaps.lanes),
        required_evidence: uniqueSorted(gaps.required_evidence),
        card_identity_progress: `${set.card_identity.master_admissible}/${set.card_identity.total_working_facts}`,
        printing_finish_progress: `${set.printings.master_admissible}/${set.printings.total_working_facts}`,
        priority: gaps.max_priority,
        mutation_authority: 'not mutation authority',
        blocker_summary: set.completion.blocker_summary,
      };
    })
    .filter((row) => row.total_gap_count > 0 || row.source_alias_gap)
    .sort((left, right) => (
      statusRank(left.completion_status) - statusRank(right.completion_status)
      || right.priority - left.priority
      || right.total_gap_count - left.total_gap_count
      || left.set_key.localeCompare(right.set_key)
    ))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function statusRank(status) {
  return {
    card_identity_complete_finish_incomplete: 1,
    source_agreed_card_identity: 2,
    finish_evidence_missing: 3,
    source_limited: 4,
    manual_review_required: 5,
    conflict_blocked: 6,
    non_standard_single_source_reference: 7,
    source_unavailable: 7,
  }[status] ?? 99;
}

function priorityForSet(set, base) {
  const volume = Math.min(25, Math.log10(Math.max(1, set.card_identity.total_working_facts + set.printings.total_working_facts)) * 10);
  const blockerPenalty = set.completion.status === 'source_unavailable' ? 20 : 0;
  return Number(Math.max(0, Math.min(100, base + volume - blockerPenalty - set.completion.completion_score / 4)).toFixed(2));
}

function buildSummary(setRows, gapQueue, cardsArtifact, printingsArtifact, finishBlockerMap) {
  const byCompletionStatus = {};
  const cardStatusCounts = {};
  const printingStatusCounts = {};
  for (const set of setRows) addCount(byCompletionStatus, set.completion.status);
  for (const card of cardsArtifact.cards ?? []) addCount(cardStatusCounts, card.status);
  for (const printing of printingsArtifact.printings ?? []) {
    if (finishBlockerMap.has(finishFactKey(printing))) continue;
    addCount(printingStatusCounts, printing.status);
  }
  return {
    sets_in_registry: setRows.length,
    complete_master_index_sets: byCompletionStatus.complete_master_index_set ?? 0,
    incomplete_sets: setRows.length - (byCompletionStatus.complete_master_index_set ?? 0),
    working_card_identity_facts: cardsArtifact.cards?.length ?? 0,
    master_admissible_card_identity_facts: setRows.reduce((total, set) => total + set.card_identity.master_admissible, 0),
    printing_derived_card_identity_facts: setRows.reduce((total, set) => total + set.card_identity.master_admissible_from_exact_printing, 0),
    working_printing_facts: setRows.reduce((total, set) => total + set.printings.total_working_facts, 0),
    master_admissible_printing_facts: setRows.reduce((total, set) => total + set.printings.master_admissible, 0),
    finish_absence_facts: printingsArtifact.finish_absences?.length ?? 0,
    finish_blocker_boundary_facts: setRows.reduce((total, set) => total + set.printings.finish_blocker_boundary, 0),
    adjudicated_excluded_printing_facts: setRows.reduce((total, set) => total + set.printings.adjudicated_excluded, 0),
    by_completion_status: byCompletionStatus,
    by_card_fact_status: cardStatusCounts,
    by_printing_fact_status: printingStatusCounts,
    source_gap_queue_items: gapQueue.length,
    grookai_reconciliation_performed: false,
  };
}

function buildArtifacts({ setsArtifact, cardsArtifact, printingsArtifact, availabilityArtifact, manualReviewArtifact, conflictsArtifact, finishBlockerClosure }) {
  const buckets = new Map();
  const finishBlockerMap = buildFinishBlockerMap(finishBlockerClosure);
  const adjudicatedExcludedPrintings = [];
  for (const set of setsArtifact.sets ?? []) {
    buckets.set(set.key, makeSetBucket(set));
  }
  applySourceAvailability(buckets, availabilityArtifact);
  applyCards(buckets, cardsArtifact);
  for (const printing of printingsArtifact.printings ?? []) {
    const blocker = finishBlockerMap.get(finishFactKey(printing));
    if (!blocker) continue;
    adjudicatedExcludedPrintings.push({
      ...compactPrintingExport(printing),
      blocker_type: blocker.blocker_type,
      reason_not_promoted: blocker.reason_not_promoted,
      next_action: blocker.next_action,
      adjudication_evidence_urls: blocker.evidence_urls ?? [],
      adjudication_evidence_labels: blocker.evidence_labels ?? [],
      exclusion_status: 'excluded_from_master_index_working_truth',
    });
  }
  applyPrintings(buckets, printingsArtifact, finishBlockerMap);
  applyPrintingDerivedCardIdentity(buckets, cardsArtifact, printingsArtifact);
  applyManualReview(buckets, manualReviewArtifact);
  resolveManualReviewWithPrintingDerivedIdentity(buckets);
  applyConflicts(buckets, conflictsArtifact);
  const setRows = finalizeBuckets(buckets);
  const gapQueue = buildGapQueue(setRows);
  const sourceWorklist = buildSourceWorklist(setRows, gapQueue);
  const summary = buildSummary(setRows, gapQueue, cardsArtifact, printingsArtifact, finishBlockerMap);
  const base = {
    generated_at: new Date().toISOString(),
    contract: 'ENGLISH_MASTER_INDEX_COMPLETION_V1',
    ...safety(),
  };

  const masterAdmissiblePrintings = (printingsArtifact.printings ?? []).filter(isMasterAdmissiblePrinting);
  const printingSupportedIdentities = new Set(masterAdmissiblePrintings.map(identityKey));
  const masterAdmissibleCards = (cardsArtifact.cards ?? [])
    .filter((card) => isMasterAdmissibleCard(card) || printingSupportedIdentities.has(identityKey(card)))
    .map((card) => compactCardExport({
      ...card,
      master_admission_basis: isMasterAdmissibleCard(card)
        ? 'source_agreement'
        : 'exact_master_printing',
    }));
  const compactMasterAdmissiblePrintings = masterAdmissiblePrintings.map(compactPrintingExport);

  return {
    completion: {
      ...base,
      version: 'english_master_index_completion_v1',
      purpose: 'Completion-first Master Index report. This is not a Grookai reconciliation report.',
      summary,
      source_standard: {
        card_identity: 'source_count >= 2 and independent agreement on set + card_number + card_name',
        printing_finish: 'source_count >= 2 plus at least one human/checklist-style source supporting exact finish fact',
        finish_blocker_boundary: 'Rows mapped by english_master_index_finish_blocker_closure_v1 require manual finish-label or card-number adjudication and are not broad source-acquisition gaps.',
      },
      set_completion_matrix_ref: 'english_master_index_set_completion_matrix_v1.json',
      source_gap_queue_ref: 'english_master_index_source_gap_queue_v1.json',
      source_worklist_ref: 'english_master_index_source_worklist_v1.json',
      master_admissible_export_ref: 'english_master_index_master_admissible_export_v1.json',
    },
    setMatrix: {
      ...base,
      version: 'english_master_index_set_completion_matrix_v1',
      summary,
      sets: setRows,
    },
    sourceGapQueue: {
      ...base,
      version: 'english_master_index_source_gap_queue_v1',
      summary: {
        total_queue_items: gapQueue.length,
        by_lane: countBy(gapQueue, 'lane'),
        top_sets: Object.fromEntries(topEntries(countRowsBy(gapQueue, 'set_key'), 30)),
      },
      queue: gapQueue,
    },
    sourceWorklist: {
      ...base,
      version: 'english_master_index_source_worklist_v1',
      rule: 'Set-first source acquisition list for completing the Master Index. It is not a Grookai write, cleanup, or reconciliation plan.',
      summary: {
        total_incomplete_sets: sourceWorklist.length,
        by_completion_status: countBy(sourceWorklist, 'completion_status'),
        by_primary_lane: countBy(sourceWorklist.map((row) => ({
          primary_lane: row.lanes[0] ?? 'none',
        })), 'primary_lane'),
      },
      worklist: sourceWorklist,
    },
    masterAdmissibleExport: {
      ...base,
      version: 'english_master_index_master_admissible_export_v1',
      rule: 'This export contains Master Index-admissible facts only. It is still audit-only and is not a Grookai write plan.',
      summary: {
        card_identity_facts: masterAdmissibleCards.length,
        printing_finish_facts: compactMasterAdmissiblePrintings.length,
        sets_with_admissible_cards: new Set(masterAdmissibleCards.map((row) => row.set_key)).size,
        sets_with_admissible_printings: new Set(compactMasterAdmissiblePrintings.map((row) => row.set_key)).size,
      },
      cards: masterAdmissibleCards,
      printings: compactMasterAdmissiblePrintings,
    },
    adjudicatedExcludedPrintings: {
      ...base,
      version: 'english_master_index_adjudicated_excluded_printings_v1',
      rule: 'These printing facts were reviewed at the finish-blocker boundary and excluded from working Master Index truth. They are preserved as audit evidence, not publishable printings and not mutation authority.',
      summary: {
        excluded_printing_facts: adjudicatedExcludedPrintings.length,
        by_set: countBy(adjudicatedExcludedPrintings, 'set_key'),
        by_finish: countBy(adjudicatedExcludedPrintings, 'finish_key'),
        by_blocker_type: countBy(adjudicatedExcludedPrintings, 'blocker_type'),
      },
      printings: adjudicatedExcludedPrintings,
    },
    reusedScaffoldMap: {
      ...base,
      version: 'english_master_index_reused_scaffold_map_v1',
      reused_as_working_evidence: [
        'english_master_index_sets_v1.json',
        'english_master_index_cards_v1.json',
        'english_master_index_printings_v1.json',
        'english_master_index_source_availability_v1.json',
        'english_master_index_manual_review_v1.json',
        'english_master_index_conflicts_v1.json',
      ],
      intentionally_excluded_from_completion_authority: [
        'english_master_index_grookai_audit_v1.json',
        'english_master_index_write_readiness_v1.json',
        'english_master_index_repair_priority_v1.json',
        'english_master_index_unsupported_triage_v1.json',
        'english_master_index_missing_from_grookai_triage_v1.json',
        'finish-blocker rows excluded by english_master_index_adjudicated_excluded_printings_v1.json',
      ],
      rule: 'Existing reconciliation outputs are not Master Index completion authority.',
    },
  };
}

function evidenceUrls(row) {
  if (Array.isArray(row.evidence_urls)) return uniqueSorted(row.evidence_urls);
  return uniqueSorted((row.evidence ?? []).map((evidence) => evidence.source_url));
}

function compactCardExport(card) {
  return {
    set_key: card.set_key,
    set_name: card.set_name,
    card_number: card.card_number,
    card_name: card.card_name,
    language: card.language ?? 'en',
    source_count: card.source_count ?? 0,
    sources: card.sources ?? [],
    source_kinds: card.source_kinds ?? [],
    status: card.status,
    master_admission_basis: card.master_admission_basis,
    evidence_urls: evidenceUrls(card),
  };
}

function compactPrintingExport(printing) {
  return {
    set_key: printing.set_key,
    set_name: printing.set_name,
    card_number: printing.card_number,
    card_name: printing.card_name,
    finish_key: printing.finish_key,
    language: printing.language ?? 'en',
    source_count: printing.source_count ?? 0,
    sources: printing.sources ?? [],
    source_kinds: printing.source_kinds ?? [],
    status: printing.status,
    evidence_urls: evidenceUrls(printing),
  };
}

function countBy(rows, field) {
  const output = {};
  for (const row of rows) addCount(output, row[field]);
  return output;
}

function countRowsBy(rows, field) {
  const output = {};
  for (const row of rows) addCount(output, row[field], row.gap_count ?? 1);
  return output;
}

function buildCompletionMarkdown(artifact) {
  const rows = topEntries(artifact.summary.by_completion_status, 20).map(([status, count]) => [status, count]);
  const cardRows = topEntries(artifact.summary.by_card_fact_status, 20).map(([status, count]) => [status, count]);
  const printingRows = topEntries(artifact.summary.by_printing_fact_status, 20).map(([status, count]) => [status, count]);
  return `# English Master Index Completion V1

Completion-first Master Index report. This is not a Grookai reconciliation report.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}
- grookai_reconciliation_performed: ${artifact.grookai_reconciliation_performed}

## Summary

- sets_in_registry: ${artifact.summary.sets_in_registry}
- complete_master_index_sets: ${artifact.summary.complete_master_index_sets}
- incomplete_sets: ${artifact.summary.incomplete_sets}
- working_card_identity_facts: ${artifact.summary.working_card_identity_facts}
- master_admissible_card_identity_facts: ${artifact.summary.master_admissible_card_identity_facts}
- printing_derived_card_identity_facts: ${artifact.summary.printing_derived_card_identity_facts}
- working_printing_facts: ${artifact.summary.working_printing_facts}
- master_admissible_printing_facts: ${artifact.summary.master_admissible_printing_facts}
- finish_blocker_boundary_facts: ${artifact.summary.finish_blocker_boundary_facts}
- adjudicated_excluded_printing_facts: ${artifact.summary.adjudicated_excluded_printing_facts}
- source_gap_queue_items: ${artifact.summary.source_gap_queue_items}

## Completion Status

${markdownTable(['status', 'sets'], rows)}

## Card Fact Status

${markdownTable(['status', 'facts'], cardRows)}

## Printing Fact Status

${markdownTable(['status', 'facts'], printingRows)}
`;
}

function buildSetMatrixMarkdown(artifact) {
  const rows = artifact.sets.slice(0, 120).map((set) => [
    set.set_key,
    set.set_name ?? '',
    set.completion.status,
    set.completion.completion_score,
    `${set.card_identity.master_admissible}/${set.card_identity.total_working_facts}`,
    `${set.printings.master_admissible}/${set.printings.total_working_facts}`,
    set.completion.blocker_summary,
  ]);
  return `# English Master Index Set Completion Matrix V1

This matrix measures Master Index completion only. It does not compare against Grookai.

${markdownTable(['set_key', 'set_name', 'status', 'score', 'cards', 'printings', 'blocker'], rows)}
`;
}

function buildGapQueueMarkdown(artifact) {
  const rows = artifact.queue.slice(0, 160).map((row) => [
    row.lane,
    row.set_key,
    row.set_name ?? '',
    row.gap_count,
    row.priority,
    row.required_evidence,
  ]);
  return `# English Master Index Source Gap Queue V1

This is the source acquisition queue for completing the Master Index. It is not a write plan.

## Summary

- total_queue_items: ${artifact.summary.total_queue_items}

${markdownTable(['lane', 'set_key', 'set_name', 'gap_count', 'priority', 'required_evidence'], rows)}
`;
}

function buildSourceWorklistMarkdown(artifact) {
  const rows = artifact.worklist.map((row) => [
    row.rank,
    row.set_key,
    row.set_name ?? '',
    row.completion_status,
    row.total_gap_count,
    row.card_identity_gap_count,
    row.printing_finish_gap_count,
    row.finish_blocker_boundary_count,
    row.lanes.join(', '),
    row.blocker_summary,
  ]);
  const statusRows = topEntries(artifact.summary.by_completion_status, 20).map(([status, count]) => [status, count]);
  const laneRows = topEntries(artifact.summary.by_primary_lane, 20).map(([lane, count]) => [lane, count]);
  return `# English Master Index Source Worklist V1

Set-first source acquisition list for completing the English physical Pokemon TCG Master Index.

This is not a Grookai write plan, cleanup plan, quarantine plan, or reconciliation plan.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}
- grookai_reconciliation_performed: ${artifact.grookai_reconciliation_performed}

## Summary

- total_incomplete_sets: ${artifact.summary.total_incomplete_sets}

${markdownTable(['completion_status', 'sets'], statusRows)}

${markdownTable(['primary_lane', 'sets'], laneRows)}

## Worklist

${markdownTable(['rank', 'set_key', 'set_name', 'status', 'total_gaps', 'card_gaps', 'finish_gaps', 'finish_blockers', 'lanes', 'blocker'], rows)}
`;
}

function buildMasterAdmissibleMarkdown(artifact) {
  return `# English Master Index Master-Admissible Export V1

This export contains Master Index-admissible facts only. It is audit-only and not a Grookai write plan.

## Summary

- card_identity_facts: ${artifact.summary.card_identity_facts}
- printing_finish_facts: ${artifact.summary.printing_finish_facts}
- sets_with_admissible_cards: ${artifact.summary.sets_with_admissible_cards}
- sets_with_admissible_printings: ${artifact.summary.sets_with_admissible_printings}
`;
}

function buildAdjudicatedExcludedMarkdown(artifact) {
  const rows = artifact.printings.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.blocker_type,
    row.reason_not_promoted,
  ]);
  return `# English Master Index Adjudicated Excluded Printings V1

These printing facts were reviewed at the finish-blocker boundary and excluded from working Master Index truth.

They are preserved as audit evidence only. This artifact is not deletion authority, not insertion authority, and not a Grookai write plan.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}
- grookai_reconciliation_performed: ${artifact.grookai_reconciliation_performed}

## Summary

- excluded_printing_facts: ${artifact.summary.excluded_printing_facts}

${markdownTable(['set_key', 'number', 'card', 'finish', 'blocker_type', 'reason'], rows)}
`;
}

function buildScaffoldMarkdown(artifact) {
  return `# English Master Index Reused Scaffold Map V1

## Reused As Working Evidence

${artifact.reused_as_working_evidence.map((item) => `- ${item}`).join('\n')}

## Excluded From Completion Authority

${artifact.intentionally_excluded_from_completion_authority.map((item) => `- ${item}`).join('\n')}

## Rule

${artifact.rule}
`;
}

async function main() {
  const inputs = {
    setsArtifact: await readJson('english_master_index_sets_v1.json'),
    cardsArtifact: await readJson('english_master_index_cards_v1.json'),
    printingsArtifact: await readJson('english_master_index_printings_v1.json'),
    availabilityArtifact: await readJson('english_master_index_source_availability_v1.json'),
    manualReviewArtifact: await readJson('english_master_index_manual_review_v1.json'),
    conflictsArtifact: await readJson('english_master_index_conflicts_v1.json'),
    finishBlockerClosure: await readOptionalJson(FINISH_BLOCKER_CLOSURE_FILE, { mapped_blockers: [], summary: {} }),
  };
  const artifacts = buildArtifacts(inputs);

  await writeJson('english_master_index_completion_v1.json', artifacts.completion);
  await writeMarkdown('english_master_index_completion_v1.md', buildCompletionMarkdown(artifacts.completion));
  await writeJson('english_master_index_set_completion_matrix_v1.json', artifacts.setMatrix);
  await writeMarkdown('english_master_index_set_completion_matrix_v1.md', buildSetMatrixMarkdown(artifacts.setMatrix));
  await writeJson('english_master_index_source_gap_queue_v1.json', artifacts.sourceGapQueue);
  await writeMarkdown('english_master_index_source_gap_queue_v1.md', buildGapQueueMarkdown(artifacts.sourceGapQueue));
  await writeJson('english_master_index_source_worklist_v1.json', artifacts.sourceWorklist);
  await writeMarkdown('english_master_index_source_worklist_v1.md', buildSourceWorklistMarkdown(artifacts.sourceWorklist));
  await writeJson('english_master_index_master_admissible_export_v1.json', artifacts.masterAdmissibleExport, { compact: true });
  await writeMarkdown('english_master_index_master_admissible_export_v1.md', buildMasterAdmissibleMarkdown(artifacts.masterAdmissibleExport));
  await writeJson('english_master_index_adjudicated_excluded_printings_v1.json', artifacts.adjudicatedExcludedPrintings);
  await writeMarkdown('english_master_index_adjudicated_excluded_printings_v1.md', buildAdjudicatedExcludedMarkdown(artifacts.adjudicatedExcludedPrintings));
  await writeJson('english_master_index_reused_scaffold_map_v1.json', artifacts.reusedScaffoldMap);
  await writeMarkdown('english_master_index_reused_scaffold_map_v1.md', buildScaffoldMarkdown(artifacts.reusedScaffoldMap));

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    summary: artifacts.completion.summary,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
