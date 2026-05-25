import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const GENERATED_FILES = [
  'english_master_index_physical_recovery_priority_v1.json',
  'english_master_index_physical_recovery_priority_v1.md',
  'english_master_index_physical_recovery_set_queue_v1.json',
  'english_master_index_physical_recovery_set_queue_v1.md',
];

const MODERN_PREFIXES = ['sv', 'swsh', 'me'];
const LEGACY_PREFIXES = ['base', 'gym', 'neo', 'ecard', 'ex', 'dp', 'pl', 'bw', 'xy', 'col'];
const PROMO_OR_SPECIAL_KEYS = new Set(['svp', 'xyp', 'mep', 'mcd21', 'fut2020', 'cel25', 'pgo']);

function normalize(value) {
  return String(value ?? '').trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

function addCount(target, key, count = 1) {
  const normalized = normalize(key) || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 50) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value.toFixed(2))));
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), data);
}

function eraLane(setKey) {
  const normalized = normalizeLower(setKey);
  if (PROMO_OR_SPECIAL_KEYS.has(normalized)) return 'promo_or_special';
  if (MODERN_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return 'modern';
  if (LEGACY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return 'legacy';
  return 'other';
}

function complexityPenalty(setKey, finishProfiles) {
  const era = eraLane(setKey);
  let penalty = 0;
  if (era === 'legacy') penalty += 12;
  if (era === 'promo_or_special') penalty += 8;
  if (finishProfiles.some((profile) => profile.includes('holo|normal|reverse'))) penalty += 8;
  if (finishProfiles.length > 2) penalty += 4;
  return penalty;
}

function recommendationForSet({ setKey, readiness, repair, candidateCount, finishProfiles }) {
  const era = eraLane(setKey);
  const readinessScore = readiness?.readiness_score ?? 0;
  const humanEvidenceScore = readiness?.human_evidence_score ?? 0;
  const masterVerifiedRatio = readiness?.master_verified_ratio ?? 0;
  const recommendation = repair?.recommendation ?? 'not_ranked';

  if (masterVerifiedRatio > 0.8 && readinessScore >= 85) {
    return {
      readiness_lane: 'proof_loop_candidate_after_card_match',
      next_action: 'Run exact card-number/name/finish comparison against the matched master set before any future controlled repair.',
    };
  }
  if (humanEvidenceScore === 0 || masterVerifiedRatio === 0) {
    return {
      readiness_lane: 'source_acquisition_required',
      next_action: 'Acquire human-readable/checklist finish evidence for this set before promoting any recovered row beyond a provenance lead.',
    };
  }
  if (era === 'legacy') {
    return {
      readiness_lane: 'legacy_caution_review',
      next_action: 'Resolve first-edition, holo, reverse, stamped, and legacy finish policy before any proof loop.',
    };
  }
  if (era === 'promo_or_special') {
    return {
      readiness_lane: 'promo_family_caution_review',
      next_action: 'Confirm promo-family numbering and product-exclusive finish evidence before any proof loop.',
    };
  }
  if (candidateCount >= 50 && recommendation !== 'blocked') {
    return {
      readiness_lane: 'high_volume_recovery_candidate',
      next_action: 'Prioritize source acquisition and exact matching because this set has many recoverable missing-set rows.',
    };
  }
  if (finishProfiles.some((profile) => profile.includes('holo|normal|reverse'))) {
    return {
      readiness_lane: 'finish_overgeneration_review_required',
      next_action: 'Verify exact finish matrix before any recovery. Current rows may reflect legacy finish overgeneration.',
    };
  }
  return {
    readiness_lane: 'manual_priority_review',
    next_action: 'Review source evidence manually and keep this row family outside mutation until exact card-level agreement exists.',
  };
}

function scoreSet({ setKey, readiness, repair, candidateCount, printingCount, finishProfiles }) {
  const readinessScore = readiness?.readiness_score ?? 0;
  const sourceCoverage = readiness?.source_coverage_score ?? 0;
  const aliasStability = readiness?.alias_stability_score ?? 0;
  const conflictScore = readiness?.conflict_score ?? 0;
  const repairSafety = repair?.repair_safety_score ?? 0;
  const volumeBoost = Math.min(15, Math.log10(Math.max(1, candidateCount)) * 8);
  const printingBoost = Math.min(8, Math.log10(Math.max(1, printingCount)) * 4);
  const penalty = complexityPenalty(setKey, finishProfiles);

  return clamp(
    readinessScore * 0.3
    + sourceCoverage * 0.2
    + aliasStability * 0.15
    + conflictScore * 0.15
    + repairSafety * 0.1
    + volumeBoost
    + printingBoost
    - penalty,
  );
}

function buildLookup(records, keyField) {
  const lookup = new Map();
  for (const record of records ?? []) {
    lookup.set(normalizeLower(record[keyField]), record);
  }
  return lookup;
}

function groupPhysicalLanes(lanes) {
  const bySet = new Map();
  for (const row of lanes.lanes ?? []) {
    if (row.lane !== 'physical_tcg_alias_recovery_candidate') continue;
    for (const setKey of row.matched_master_index_sets ?? []) {
      const normalizedSetKey = normalize(setKey);
      if (!bySet.has(normalizedSetKey)) {
        bySet.set(normalizedSetKey, {
          set_key: normalizedSetKey,
          candidate_card_print_count: 0,
          printing_row_count: 0,
          source_aliases: new Set(),
          finish_profiles: new Set(),
          sample_cards: [],
          card_prints: [],
        });
      }
      const bucket = bySet.get(normalizedSetKey);
      bucket.candidate_card_print_count += 1;
      bucket.printing_row_count += Number(row.printing_count ?? 0);
      for (const alias of row.source_set_aliases ?? []) bucket.source_aliases.add(alias);
      bucket.finish_profiles.add(row.finish_profile);
      if (bucket.sample_cards.length < 12) {
        bucket.sample_cards.push({
          card_print_id: row.card_print_id,
          card_name: row.card_name,
          finish_profile: row.finish_profile,
          source_set_aliases: row.source_set_aliases,
          source_card_urls: (row.mapping_leads ?? []).map((lead) => lead.source_card_url).filter(Boolean),
        });
      }
      bucket.card_prints.push({
        card_print_id: row.card_print_id,
        card_name: row.card_name,
        finish_profile: row.finish_profile,
        printing_count: row.printing_count,
        source_set_aliases: row.source_set_aliases,
        mapping_leads: row.mapping_leads,
        mutation_authority: 'not mutation authority',
      });
    }
  }
  return [...bySet.values()].map((bucket) => ({
    ...bucket,
    source_aliases: uniqueSorted([...bucket.source_aliases]),
    finish_profiles: uniqueSorted([...bucket.finish_profiles]),
  }));
}

function buildArtifacts({ lanes, sourceAliasMap, truthReadiness, repairPriority }) {
  const readinessBySet = buildLookup(truthReadiness.sets, 'set_key');
  const repairBySet = buildLookup(repairPriority.ranked_sets, 'set_key');
  const sourceAliasBySet = new Map();
  for (const row of sourceAliasMap.source_aliases ?? []) {
    const setKey = row.matched_master_index_set?.internal_set_key;
    if (!setKey) continue;
    if (!sourceAliasBySet.has(normalizeLower(setKey))) sourceAliasBySet.set(normalizeLower(setKey), []);
    sourceAliasBySet.get(normalizeLower(setKey)).push(row);
  }

  const setRows = groupPhysicalLanes(lanes).map((group) => {
    const readiness = readinessBySet.get(normalizeLower(group.set_key)) ?? null;
    const repair = repairBySet.get(normalizeLower(group.set_key)) ?? null;
    const sourceAliases = sourceAliasBySet.get(normalizeLower(group.set_key)) ?? [];
    const recommendation = recommendationForSet({
      setKey: group.set_key,
      readiness,
      repair,
      candidateCount: group.candidate_card_print_count,
      finishProfiles: group.finish_profiles,
    });
    const priorityScore = scoreSet({
      setKey: group.set_key,
      readiness,
      repair,
      candidateCount: group.candidate_card_print_count,
      printingCount: group.printing_row_count,
      finishProfiles: group.finish_profiles,
    });

    return {
      set_key: group.set_key,
      set_name: readiness?.set_name ?? repair?.set_name ?? sourceAliases[0]?.matched_master_index_set?.set_name ?? null,
      era_lane: eraLane(group.set_key),
      physical_recovery_priority_score: priorityScore,
      readiness_lane: recommendation.readiness_lane,
      next_action: recommendation.next_action,
      candidate_card_print_count: group.candidate_card_print_count,
      printing_row_count: group.printing_row_count,
      source_aliases: group.source_aliases,
      finish_profiles: group.finish_profiles,
      readiness_classification: readiness?.classification ?? null,
      readiness_score: readiness?.readiness_score ?? null,
      source_coverage_score: readiness?.source_coverage_score ?? null,
      human_evidence_score: readiness?.human_evidence_score ?? null,
      master_verified_ratio: readiness?.master_verified_ratio ?? null,
      repair_recommendation: repair?.recommendation ?? null,
      repair_priority_score: repair?.priority_score ?? null,
      current_blockers: {
        source_acquisition_required: (readiness?.human_evidence_score ?? 0) === 0 || (readiness?.master_verified_ratio ?? 0) === 0,
        exact_finish_matrix_required: group.finish_profiles.some((profile) => profile.includes('holo|normal|reverse')),
        legacy_or_promo_caution: ['legacy', 'promo_or_special'].includes(eraLane(group.set_key)),
        mutation_safe: false,
      },
      sample_cards: group.sample_cards,
      card_prints: group.card_prints,
    };
  }).sort((left, right) => (
    right.physical_recovery_priority_score - left.physical_recovery_priority_score
    || right.candidate_card_print_count - left.candidate_card_print_count
    || left.set_key.localeCompare(right.set_key)
  ));

  const byReadinessLane = {};
  const byEraLane = {};
  const bySet = {};
  for (const row of setRows) {
    addCount(byReadinessLane, row.readiness_lane, row.candidate_card_print_count);
    addCount(byEraLane, row.era_lane, row.candidate_card_print_count);
    addCount(bySet, row.set_key, row.candidate_card_print_count);
  }

  const summary = {
    physical_candidate_sets: setRows.length,
    physical_candidate_card_prints: setRows.reduce((total, row) => total + row.candidate_card_print_count, 0),
    physical_candidate_printing_rows: setRows.reduce((total, row) => total + row.printing_row_count, 0),
    by_readiness_lane: byReadinessLane,
    by_era_lane: byEraLane,
    top_sets_by_candidate_count: Object.fromEntries(topEntries(bySet, 30)),
  };

  const priority = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_physical_recovery_priority_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    rule: 'This report ranks physical TCG missing-set recovery candidates only. It does not assign set identity or authorize mutation.',
    summary,
    guardrails: [
      'physical recovery candidate is not canonical truth',
      'source aliases are recovery leads only',
      'exact card-number/name/finish agreement is still required',
      'human-readable/checklist evidence is still required for finish truth',
      'no DB writes, migrations, cleanup, quarantine, or apply paths are allowed',
    ],
    ranked_sets: setRows.map(({ card_prints, ...row }) => row),
  };

  const queue = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_physical_recovery_set_queue_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    summary,
    sets: setRows,
  };

  return { priority, queue };
}

function buildPriorityMarkdown(artifact) {
  const laneRows = topEntries(artifact.summary.by_readiness_lane, 20).map(([lane, count]) => [lane, count]);
  const eraRows = topEntries(artifact.summary.by_era_lane, 20).map(([lane, count]) => [lane, count]);
  const setRows = artifact.ranked_sets.slice(0, 40).map((row, index) => [
    index + 1,
    row.set_key,
    row.set_name ?? '',
    row.era_lane,
    row.physical_recovery_priority_score,
    row.readiness_lane,
    row.candidate_card_print_count,
    row.printing_row_count,
    row.source_aliases.join(', '),
  ]);

  return `# English Master Index Physical Recovery Priority V1

This is an audit-only priority map for \`missing_set_code\` rows with matched physical TCG source aliases. It does not assign set identity and does not authorize mutation.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}

## Summary

- physical_candidate_sets: ${artifact.summary.physical_candidate_sets}
- physical_candidate_card_prints: ${artifact.summary.physical_candidate_card_prints}
- physical_candidate_printing_rows: ${artifact.summary.physical_candidate_printing_rows}

## Readiness Lanes

${markdownTable(['lane', 'card prints'], laneRows)}

## Era Lanes

${markdownTable(['era_lane', 'card prints'], eraRows)}

## Ranked Sets

${markdownTable(['rank', 'set_key', 'set_name', 'era', 'score', 'readiness_lane', 'card_prints', 'printing_rows', 'source_aliases'], setRows)}

## Guardrails

${artifact.guardrails.map((guardrail) => `- ${guardrail}`).join('\n')}
`;
}

function buildSetQueueMarkdown(artifact) {
  const rows = artifact.sets.flatMap((set) => (
    set.sample_cards.slice(0, 8).map((card) => [
      set.set_key,
      set.set_name ?? '',
      set.readiness_lane,
      card.card_print_id,
      card.card_name,
      card.finish_profile,
      card.source_set_aliases.join(', '),
    ])
  )).slice(0, 160);

  return `# Physical Recovery Set Queue V1

This report keeps the recoverable physical TCG rows grouped by matched master set. It is a queue for source acquisition and exact comparison, not mutation.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}

## Summary

- physical_candidate_sets: ${artifact.summary.physical_candidate_sets}
- physical_candidate_card_prints: ${artifact.summary.physical_candidate_card_prints}
- physical_candidate_printing_rows: ${artifact.summary.physical_candidate_printing_rows}

## Sample Card Queue

${markdownTable(['set_key', 'set_name', 'readiness_lane', 'card_print_id', 'card_name', 'finish_profile', 'source_aliases'], rows)}
`;
}

async function main() {
  const lanes = await readJson('english_master_index_missing_set_code_recovery_lanes_v1.json');
  const sourceAliasMap = await readJson('english_master_index_provenance_source_alias_map_v1.json');
  const truthReadiness = await readJson('english_master_index_truth_readiness_v1.json');
  const repairPriority = await readJson('english_master_index_repair_priority_v1.json');
  const artifacts = buildArtifacts({ lanes, sourceAliasMap, truthReadiness, repairPriority });

  await writeJson('english_master_index_physical_recovery_priority_v1.json', artifacts.priority);
  await writeMarkdown('english_master_index_physical_recovery_priority_v1.md', buildPriorityMarkdown(artifacts.priority));
  await writeJson('english_master_index_physical_recovery_set_queue_v1.json', artifacts.queue);
  await writeMarkdown('english_master_index_physical_recovery_set_queue_v1.md', buildSetQueueMarkdown(artifacts.queue));

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    summary: artifacts.priority.summary,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
