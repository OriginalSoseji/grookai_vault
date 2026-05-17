#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ARTIFACT_ROOT = path.resolve(
  '.tmp',
  'scanner_live_watch',
  'device_locks_fast_vote',
);

const CONTRACT = {
  maxIdentityPipelineMs: 2000,
  maxIdentityToLockMs: 2000,
  maxFastCropCount: 2,
  minSuccessfulFastCrops: 2,
  minVoteUpdates: 2,
  maxAcceptedDistance: 0.195,
  minCropSupport: 2,
};

const args = parseArgs(process.argv.slice(2));
const artifactRoot = path.resolve(args.path ?? DEFAULT_ARTIFACT_ROOT);

try {
  const metricPaths = findMetricPaths(artifactRoot);
  if (metricPaths.length === 0) {
    throw new Error(`no metrics.json files found under ${artifactRoot}`);
  }

  const rows = metricPaths.map((metricPath) => {
    const metric = readJson(metricPath);
    return evaluateMetric(metricPath, metric);
  });
  const failed = rows.filter((row) => row.status === 'FAIL');
  const warnings = rows.filter((row) => row.warnings.length > 0);

  console.log('[scanner_v3_identity_perf] artifact_summary');
  for (const row of rows) {
    console.log(
      [
        `${row.status}:`,
        path.basename(path.dirname(row.path)),
        `candidate=${row.candidateId}`,
        row.name ? `name=${quoteValue(row.name)}` : null,
        row.setCode ? `set=${row.setCode}` : null,
        `signal=${row.signal}`,
        `reason=${row.reason}`,
        `crops=${row.cropCount}/${row.successfulCropCount}`,
        `pipeline_ms=${row.pipelineMs}`,
        `to_lock_ms=${row.identityToLockMs}`,
        row.cropTransport ? `transport=${row.cropTransport}` : null,
        row.cropSize ? `crop_size=${row.cropSize}` : null,
        row.cropEncodeMs ? `crop_encode_ms=${row.cropEncodeMs}` : null,
        row.batchRequestMs ? `batch_request_ms=${row.batchRequestMs}` : null,
        `embedding_ms=${row.embeddingMs}`,
        `vector_ms=${row.vectorMs}`,
        `vote_updates=${row.voteUpdates}`,
        `distance=${row.topDistance}`,
        `crop_support=${row.cropSupport}`,
        row.failures.length > 0 ? `failures=${row.failures.join(',')}` : null,
        row.warnings.length > 0 ? `warnings=${row.warnings.join(',')}` : null,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  console.log(
    [
      '[scanner_v3_identity_perf] overall:',
      `total=${rows.length}`,
      `pass=${rows.length - failed.length}`,
      `fail=${failed.length}`,
      `warnings=${warnings.length}`,
      `max_identity_pipeline_ms=${CONTRACT.maxIdentityPipelineMs}`,
      `max_identity_to_lock_ms=${CONTRACT.maxIdentityToLockMs}`,
      `max_fast_crop_count=${CONTRACT.maxFastCropCount}`,
      `min_vote_updates=${CONTRACT.minVoteUpdates}`,
    ].join(' '),
  );

  process.exit(failed.length > 0 ? 1 : 0);
} catch (error) {
  console.error(`scanner_v3_lock_artifact_parse_failed: ${error.message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    path: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--path') {
      parsed.path = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (!token.startsWith('--') && parsed.path == null) {
      parsed.path = token;
      continue;
    }
    throw new Error(`unknown_argument:${token}`);
  }
  return parsed;
}

function findMetricPaths(root) {
  if (!fs.existsSync(root)) return [];
  const stat = fs.statSync(root);
  if (stat.isFile()) {
    return path.basename(root) === 'metrics.json' ? [root] : [];
  }
  const results = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name === 'metrics.json') {
        results.push(fullPath);
      }
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function evaluateMetric(metricPath, metric) {
  const failures = [];
  const warnings = [];
  const signal = text(metric.identity_signal_source);
  const reason = text(metric.identity_decision_reason);
  const cropCount = numberOrNull(metric.identity_crop_count);
  const successfulCropCount = numberOrNull(metric.identity_successful_crop_count);
  const pipelineMs = numberOrNull(metric.identity_pipeline_elapsed_ms);
  const identityToLockMs = numberOrNull(metric.identity_to_lock_elapsed_ms);
  const voteUpdates = numberOrNull(metric.identity_vote_updates);
  const topDistance = numberOrNull(metric.identity_top_distance);
  const cropSupport = numberOrNull(metric.identity_crop_support_count);

  requireField(failures, metric.candidate_id, 'candidate_id');
  requireField(failures, metric.identity_decision_state, 'identity_decision_state');
  requireField(failures, metric.identity_decision_reason, 'identity_decision_reason');
  requireField(failures, metric.identity_signal_source, 'identity_signal_source');
  requireField(failures, metric.identity_crop_count, 'identity_crop_count');
  requireField(failures, metric.identity_successful_crop_count, 'identity_successful_crop_count');
  requireField(failures, metric.identity_pipeline_elapsed_ms, 'identity_pipeline_elapsed_ms');
  requireField(failures, metric.identity_to_lock_elapsed_ms, 'identity_to_lock_elapsed_ms');
  requireField(failures, metric.embedding_elapsed_ms, 'embedding_elapsed_ms');
  requireField(failures, metric.vector_search_elapsed_ms, 'vector_search_elapsed_ms');
  requireField(failures, metric.identity_vote_updates, 'identity_vote_updates');
  requireField(failures, metric.identity_top_distance, 'identity_top_distance');
  requireField(failures, metric.identity_crop_support_count, 'identity_crop_support_count');
  requireField(failures, metric.frames_seen, 'frames_seen');
  requireField(failures, metric.frames_accepted, 'frames_accepted');

  if (text(metric.identity_decision_state) !== 'identity_locked') {
    failures.push(`not_identity_locked:${text(metric.identity_decision_state)}`);
  }
  if (pipelineMs == null || pipelineMs > CONTRACT.maxIdentityPipelineMs) {
    failures.push(`pipeline_ms_over_target:${valueText(pipelineMs)}`);
  }
  if (identityToLockMs == null || identityToLockMs > CONTRACT.maxIdentityToLockMs) {
    failures.push(`identity_to_lock_ms_over_target:${valueText(identityToLockMs)}`);
  }
  if (voteUpdates == null || voteUpdates < CONTRACT.minVoteUpdates) {
    failures.push(`one_frame_or_missing_vote_updates:${valueText(voteUpdates)}`);
  }
  if (topDistance == null || topDistance > CONTRACT.maxAcceptedDistance) {
    failures.push(`distance_guard_failed:${valueText(topDistance)}`);
  }
  if (cropSupport == null || cropSupport < CONTRACT.minCropSupport) {
    failures.push(`crop_support_below_min:${valueText(cropSupport)}`);
  }

  if (signal === 'v8_fast_full_card_vector') {
    if (cropCount == null || cropCount > CONTRACT.maxFastCropCount) {
      failures.push(`fast_crop_count_over_target:${valueText(cropCount)}`);
    }
    if (
      successfulCropCount == null ||
      successfulCropCount < CONTRACT.minSuccessfulFastCrops
    ) {
      failures.push(`successful_fast_crops_below_min:${valueText(successfulCropCount)}`);
    }
  } else if (signal === 'v8_multicrop_vector_rerank') {
    warnings.push('fallback_multicrop_path_used');
  } else {
    failures.push(`unexpected_identity_signal:${signal}`);
  }

  if (voteUpdates != null && voteUpdates > 3) {
    warnings.push(`slow_vote_convergence:${voteUpdates}`);
  }

  return {
    path: metricPath,
    status: failures.length > 0 ? 'FAIL' : 'PASS',
    failures,
    warnings,
    candidateId: text(metric.candidate_id),
    name: text(metric.identity_best_candidate_name ?? metric.name),
    setCode: text(metric.identity_best_candidate_set_code ?? metric.set_code),
    signal,
    reason,
    cropCount: valueText(cropCount),
    successfulCropCount: valueText(successfulCropCount),
    pipelineMs: valueText(pipelineMs),
    identityToLockMs: valueText(identityToLockMs),
    cropTransport: text(metric.identity_crop_transport_format),
    cropSize: valueText(numberOrNull(metric.identity_crop_output_size)),
    cropEncodeMs: valueText(numberOrNull(metric.identity_crop_encode_elapsed_ms)),
    batchRequestMs: valueText(numberOrNull(metric.identity_batch_request_elapsed_ms)),
    embeddingMs: valueText(numberOrNull(metric.embedding_elapsed_ms)),
    vectorMs: valueText(numberOrNull(metric.vector_search_elapsed_ms)),
    voteUpdates: valueText(voteUpdates),
    topDistance: valueText(topDistance),
    cropSupport: valueText(cropSupport),
  };
}

function requireField(failures, value, field) {
  if (value == null || value === '') failures.push(`missing_${field}`);
}

function numberOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

function valueText(value) {
  return value == null ? 'missing' : String(value);
}

function quoteValue(value) {
  return JSON.stringify(value);
}
