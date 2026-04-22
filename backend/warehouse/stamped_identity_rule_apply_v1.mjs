import fs from 'fs';
import path from 'path';

import {
  STAMPED_IDENTITY_STATUS,
  classifyStampedUnderlyingBaseState,
  deriveStampedIdentity,
  stripStampedModifiersFromName,
} from '../identity/stamped_identity_rule_v1.mjs';

const INPUT_AUDIT_JSON_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'warehouse',
  'missing_special_cases_audit_v1.json',
);
const POPULATION_JSON_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'warehouse',
  'stamped_identity_population_v1.json',
);
const APPLY_JSON_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'warehouse',
  'stamped_identity_rule_apply_v1.json',
);
const APPLY_MARKDOWN_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'warehouse',
  'stamped_identity_rule_apply_v1.md',
);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, text) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, text);
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function parseEvidenceSummary(text) {
  const normalized = normalizeTextOrNull(text);
  if (!normalized) {
    return {};
  }

  const result = {};
  for (const segment of normalized.split('|')) {
    const trimmed = segment.trim();
    if (!trimmed.includes('=')) {
      continue;
    }

    const [rawKey, ...rawValue] = trimmed.split('=');
    const key = normalizeTextOrNull(rawKey);
    const value = normalizeTextOrNull(rawValue.join('='));
    if (!key || !value) {
      continue;
    }

    const numericValue = Number(value);
    result[key] = Number.isFinite(numericValue) && String(numericValue) === value ? numericValue : value;
  }

  return result;
}

function incrementCount(map, key) {
  const normalized = normalizeTextOrNull(key) ?? 'UNKNOWN';
  map.set(normalized, normalizeCount(map.get(normalized)) + 1);
}

function mapToSortedObject(map) {
  return Object.fromEntries(
    [...map.entries()].sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return String(left[0]).localeCompare(String(right[0]));
    }),
  );
}

function deriveRepeatedRawPattern(row) {
  const text = `${normalizeTextOrNull(row.candidate_name) ?? ''} ${normalizeTextOrNull(row.source_external_id) ?? ''}`.toLowerCase();

  if (text.includes('prerelease') && text.includes('staff')) return 'prerelease_staff';
  if (text.includes('prerelease')) return 'prerelease';
  if (text.includes('battle road')) return 'battle_road';
  if (text.includes('world championships') || text.includes('worlds')) return 'worlds';
  if (text.includes('city championships')) return 'city_championships';
  if (text.includes('regional championships')) return 'regional_championships';
  if (text.includes('sdcc')) return 'sdcc_stamp';
  if (text.includes('e3')) return 'e3_stamp';
  if (text.includes('pikachu stamped')) return 'pikachu_stamped';
  if (text.includes('cinderace stamped')) return 'cinderace_stamped';
  if (text.includes('charizard stamped')) return 'charizard_stamped';
  if (text.includes('mewtwo stamped')) return 'mewtwo_stamped';
  if (text.includes('eevee stamped')) return 'eevee_stamped';
  if (text.includes('prize pack')) return 'prize_pack';
  if (text.includes('staff')) return 'staff';
  if (text.includes('stamped') || text.includes('stamp')) return 'named_stamp';

  return 'family_only_or_unknown';
}

function classifyStampedResultBucket(ruleResult, baseState) {
  if (ruleResult.status === STAMPED_IDENTITY_STATUS.NOT_STAMPED_IDENTITY) {
    return 'STAMPED_NOT_CANON';
  }

  if (ruleResult.status === STAMPED_IDENTITY_STATUS.UNDERLYING_BASE_MISSING) {
    return 'STAMPED_REQUIRES_BASE_REPAIR';
  }

  if (ruleResult.status === STAMPED_IDENTITY_STATUS.RESOLVED_STAMPED_IDENTITY && baseState === 'PROVEN') {
    return 'STAMPED_READY_FOR_WAREHOUSE';
  }

  return 'STAMPED_MANUAL_REVIEW';
}

function buildQueueKey(row, evidence, ruleResult) {
  if (!ruleResult.variant_key) {
    return null;
  }

  const setIdentity = normalizeTextOrNull(evidence.set_hint) ?? normalizeTextOrNull(row.source_set_id);
  const baseName = normalizeTextOrNull(evidence.base_name) ?? stripStampedModifiersFromName(row.candidate_name);
  const printedNumber = normalizeTextOrNull(row.printed_number);

  if (!setIdentity || !baseName || !printedNumber) {
    return null;
  }

  return `${setIdentity}::${baseName}::${printedNumber}::${ruleResult.variant_key}`;
}

function buildReadyBatch(appliedRows) {
  const grouped = new Map();

  for (const row of appliedRows.filter((candidate) => candidate.result_bucket === 'STAMPED_READY_FOR_WAREHOUSE')) {
    if (!row.canonical_queue_key) {
      continue;
    }

    if (!grouped.has(row.canonical_queue_key)) {
      grouped.set(row.canonical_queue_key, {
        canonical_queue_key: row.canonical_queue_key,
        stamp_label: row.stamp_label,
        variant_key: row.variant_key,
        source_set_id: row.source_set_id,
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        source_rows: [],
        repeat_count: 0,
        set_hint: row.set_hint,
        blocking_reason: row.blocking_reason,
      });
    }

    const target = grouped.get(row.canonical_queue_key);
    target.source_rows.push({
      source_external_id: row.source_external_id,
      candidate_name: row.candidate_name,
      source_set_id: row.source_set_id,
    });
    target.repeat_count += 1;
  }

  return [...grouped.values()]
    .sort((left, right) => {
      if (right.repeat_count !== left.repeat_count) {
        return right.repeat_count - left.repeat_count;
      }
      if (Boolean(right.set_hint) !== Boolean(left.set_hint)) {
        return Number(Boolean(right.set_hint)) - Number(Boolean(left.set_hint));
      }
      return `${left.source_set_id}:${left.printed_number}:${left.variant_key}`.localeCompare(
        `${right.source_set_id}:${right.printed_number}:${right.variant_key}`,
      );
    })
    .slice(0, 25);
}

function buildPopulationArtifact(stampedRows) {
  const countsBySource = new Map();
  const countsBySetFamily = new Map();
  const repeatedPatterns = new Map();
  const underlyingGroups = {
    obvious_underlying_base_match: [],
    insufficient_or_ambiguous_underlying: [],
    likely_product_noise_or_non_stamped: [],
  };

  for (const row of stampedRows) {
    const evidence = parseEvidenceSummary(row.evidence_summary);
    const baseState = classifyStampedUnderlyingBaseState({
      blockingReason: row.blocking_reason,
      evidence,
    });

    incrementCount(countsBySource, row.source);
    incrementCount(countsBySetFamily, row.source_set_id);
    incrementCount(repeatedPatterns, deriveRepeatedRawPattern(row));

    if (baseState === 'PROVEN' || baseState === 'ROUTE_MISSING') {
      underlyingGroups.obvious_underlying_base_match.push(row);
    } else {
      underlyingGroups.insufficient_or_ambiguous_underlying.push(row);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    total_stamped_rows: stampedRows.length,
    counts_by_source: mapToSortedObject(countsBySource),
    counts_by_set_family: mapToSortedObject(countsBySetFamily),
    top_repeated_stamp_patterns: [...repeatedPatterns.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        return String(left[0]).localeCompare(String(right[0]));
      })
      .slice(0, 20)
      .map(([pattern, row_count]) => ({ pattern, row_count })),
    rows_with_obvious_underlying_base_match: {
      count: underlyingGroups.obvious_underlying_base_match.length,
      examples: underlyingGroups.obvious_underlying_base_match.slice(0, 20),
    },
    rows_with_insufficient_underlying_or_base_match: {
      count: underlyingGroups.insufficient_or_ambiguous_underlying.length,
      examples: underlyingGroups.insufficient_or_ambiguous_underlying.slice(0, 20),
    },
    rows_likely_product_noise_misclassified_as_stamped: {
      count: underlyingGroups.likely_product_noise_or_non_stamped.length,
      examples: [],
    },
  };
}

function buildMarkdown(summary) {
  const lines = [];
  lines.push('# stamped_identity_rule_apply_v1');
  lines.push('');
  lines.push('## context');
  lines.push('');
  lines.push('- Read-only stamped identity rule pass over the stamped slice from `missing_special_cases_audit_v1`.');
  lines.push('- No canon writes, mapping writes, promotion, image, or pricing mutation were performed.');
  lines.push('');
  lines.push('## total stamped rows processed');
  lines.push('');
  lines.push(`- ${summary.totalStampedRows}`);
  lines.push('');
  lines.push('## counts by stamped result bucket');
  lines.push('');
  for (const [bucket, count] of Object.entries(summary.stampedResultBucketCounts)) {
    lines.push(`- ${bucket}: ${count}`);
  }
  lines.push('');
  lines.push('## top normalized stamp labels');
  lines.push('');
  for (const item of summary.topNormalizedStampLabels) {
    lines.push(`- ${item.stamp_label}: ${item.row_count}`);
  }
  lines.push('');
  lines.push('## top variant keys');
  lines.push('');
  for (const item of summary.topVariantKeys) {
    lines.push(`- ${item.variant_key}: ${item.row_count}`);
  }
  lines.push('');
  lines.push('## rows ready for warehouse now');
  lines.push('');
  for (const row of summary.topReadyExamples) {
    lines.push(
      `- ${row.source} | ${row.source_set_id} | ${row.candidate_name} | ${row.variant_key} | ${row.stamp_label} | ${row.result_bucket}`,
    );
  }
  lines.push('');
  lines.push('## rows blocked by missing base');
  lines.push('');
  for (const row of summary.topBaseRepairExamples) {
    lines.push(
      `- ${row.source} | ${row.source_set_id} | ${row.candidate_name} | ${row.variant_key ?? 'null'} | ${row.stamped_rule_status} | ${row.result_bucket}`,
    );
  }
  lines.push('');
  lines.push('## rows requiring manual review');
  lines.push('');
  for (const row of summary.topManualReviewExamples) {
    lines.push(
      `- ${row.source} | ${row.source_set_id} | ${row.candidate_name} | ${row.stamped_rule_status} | ${row.result_bucket}`,
    );
  }
  lines.push('');
  lines.push('## rows rejected as non-canon for stamped intake');
  lines.push('');
  for (const row of summary.topRejectedExamples) {
    lines.push(
      `- ${row.source} | ${row.source_set_id} | ${row.candidate_name} | ${row.stamped_rule_status} | ${row.result_bucket}`,
    );
  }
  lines.push('');
  lines.push('## first ready batch');
  lines.push('');
  for (const row of summary.firstReadyBatch) {
    lines.push(
      `- ${row.source_set_id} | ${row.candidate_name} | ${row.variant_key} | repeat_count=${row.repeat_count} | ${row.stamp_label}`,
    );
  }
  lines.push('');
  lines.push('## recommended next execution pass');
  lines.push('');
  lines.push(`- ${summary.recommendedNextExecutionPass}`);
  lines.push('');
  lines.push('## verification');
  lines.push('');
  lines.push('- local rule/helper/tests only');
  lines.push('- local checkpoint artifacts only');
  lines.push('- no canon writes occurred');
  lines.push('- no warehouse promotion ran');
  lines.push('- no mappings, images, or pricing writes occurred');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const audit = JSON.parse(fs.readFileSync(INPUT_AUDIT_JSON_PATH, 'utf8'));
  const stampedRows = audit.backlog.filter((row) => row.identity_bucket === 'STAMPED_IDENTITY');
  const population = buildPopulationArtifact(stampedRows);

  const resultBucketCounts = new Map();
  const stampLabelCounts = new Map();
  const variantKeyCounts = new Map();
  const patternFamilyCounts = new Map();
  const appliedRows = stampedRows.map((row) => {
    const evidence = parseEvidenceSummary(row.evidence_summary);
    const underlyingBaseState = classifyStampedUnderlyingBaseState({
      blockingReason: row.blocking_reason,
      evidence,
    });
    const ruleResult = deriveStampedIdentity({
      candidateName: row.candidate_name,
      sourceExternalId: row.source_external_id,
      sourceSetId: row.source_set_id,
      underlyingBaseState,
    });
    const resultBucket = classifyStampedResultBucket(ruleResult, underlyingBaseState);
    const canonicalQueueKey = buildQueueKey(row, evidence, ruleResult);

    incrementCount(resultBucketCounts, resultBucket);
    incrementCount(patternFamilyCounts, ruleResult.pattern_family);
    if (ruleResult.stamp_label) {
      incrementCount(stampLabelCounts, ruleResult.stamp_label);
    }
    if (ruleResult.variant_key) {
      incrementCount(variantKeyCounts, ruleResult.variant_key);
    }

    return {
      ...row,
      set_hint: normalizeTextOrNull(evidence.set_hint),
      base_name: normalizeTextOrNull(evidence.base_name) ?? stripStampedModifiersFromName(row.candidate_name),
      underlying_base_state: underlyingBaseState,
      stamped_rule_status: ruleResult.status,
      stamp_label: ruleResult.stamp_label ?? null,
      variant_key: ruleResult.variant_key ?? null,
      stamp_pattern_family: ruleResult.pattern_family ?? null,
      result_bucket: resultBucket,
      canonical_queue_key: canonicalQueueKey,
    };
  });

  const topReadyExamples = appliedRows.filter((row) => row.result_bucket === 'STAMPED_READY_FOR_WAREHOUSE').slice(0, 20);
  const topBaseRepairExamples = appliedRows
    .filter((row) => row.result_bucket === 'STAMPED_REQUIRES_BASE_REPAIR')
    .slice(0, 20);
  const topManualReviewExamples = appliedRows.filter((row) => row.result_bucket === 'STAMPED_MANUAL_REVIEW').slice(0, 20);
  const topRejectedExamples = appliedRows.filter((row) => row.result_bucket === 'STAMPED_NOT_CANON').slice(0, 20);
  const firstReadyBatch = buildReadyBatch(appliedRows);
  const recommendedNextExecutionPass =
    firstReadyBatch.length > 0 ? 'STAMPED_READY_BATCH_WAREHOUSE_INTAKE_V1' : 'STAMPED_BASE_REPAIR_V1';

  const summary = {
    generatedAt: new Date().toISOString(),
    totalStampedRows: stampedRows.length,
    stampedResultBucketCounts: mapToSortedObject(resultBucketCounts),
    topNormalizedStampLabels: [...stampLabelCounts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        return String(left[0]).localeCompare(String(right[0]));
      })
      .slice(0, 20)
      .map(([stamp_label, row_count]) => ({ stamp_label, row_count })),
    topVariantKeys: [...variantKeyCounts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        return String(left[0]).localeCompare(String(right[0]));
      })
      .slice(0, 20)
      .map(([variant_key, row_count]) => ({ variant_key, row_count })),
    stampPatternFamilyCounts: mapToSortedObject(patternFamilyCounts),
    topReadyExamples,
    topBaseRepairExamples,
    topManualReviewExamples,
    topRejectedExamples,
    firstReadyBatch,
    recommendedNextExecutionPass,
    rows: appliedRows,
  };

  writeJson(POPULATION_JSON_PATH, population);
  writeJson(APPLY_JSON_PATH, summary);
  writeText(APPLY_MARKDOWN_PATH, buildMarkdown(summary));

  console.log(
    JSON.stringify(
      {
        total_stamped_rows: summary.totalStampedRows,
        population_output: POPULATION_JSON_PATH,
        apply_json_output: APPLY_JSON_PATH,
        apply_markdown_output: APPLY_MARKDOWN_PATH,
        stamped_result_bucket_counts: summary.stampedResultBucketCounts,
        recommended_next_execution_pass: summary.recommendedNextExecutionPass,
      },
      null,
      2,
    ),
  );
}

main();
