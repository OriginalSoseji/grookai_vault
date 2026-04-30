import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import '../env.mjs';
import {
  DHASH_V1,
  computeDHashV1,
  hammingDistanceBits,
} from './lib/image_hash_v1.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_FRAME_DATASET_DIR = '.tmp/scanner_v3_frame_dataset';
const DEFAULT_REPEAT_DATASET_DIR = '.tmp/scanner_v3_repeat_dataset';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_frame_convergence_proof';
const NORMALIZATION_HARNESS = 'backend/scanner_v3/run_universal_tcg_scan_normalization_harness_v1.mjs';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DATASET_SOURCE_FILE = '_dataset_source.json';
const TOP_CANDIDATES = 5;
const TOP_GROUPS_FOR_LOCK = 3;
const LOCK_MIN_ACCEPTED_FRAMES = 3;
const LOCK_REQUIRED_TOP3_HITS = 3;
const LOCK_SCORE_GAP = 4;

function parseArgs(argv) {
  const args = {
    dataset: DEFAULT_FRAME_DATASET_DIR,
    out: DEFAULT_OUTPUT_DIR,
    bootstrap: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inlineValue] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const nextValue = () => {
      if (inlineValue !== null) return inlineValue;
      i += 1;
      return argv[i] ?? '';
    };

    if (name === '--dataset' || name === '--folder') {
      args.dataset = nextValue();
    } else if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--no-bootstrap') {
      args.bootstrap = false;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/scanner_v3/run_scanner_v3_frame_convergence_harness_v1.mjs [--dataset <path>] [--out <path>] [--no-bootstrap]',
    '',
    'Defaults:',
    `  --dataset ${DEFAULT_FRAME_DATASET_DIR}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    '',
    'This proof harness simulates frame convergence only. It does not make production identity decisions.',
  ].join('\n');
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJsonIfPresent(filePath) {
  if (!(await pathExists(filePath))) return null;
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function sanitizeSegment(value, fallback = 'item') {
  const clean = String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return clean || fallback;
}

async function listImageFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(folder, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function datasetHasFrames(datasetDir) {
  if (!(await pathExists(datasetDir))) return false;
  const entries = await readdir(datasetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const frames = await listImageFiles(path.join(datasetDir, entry.name));
    if (frames.length > 0) return true;
  }
  return false;
}

async function bootstrapFrameDatasetIfNeeded(datasetDir) {
  const resolvedDataset = path.resolve(datasetDir);
  const sourceInfoPath = path.join(resolvedDataset, DATASET_SOURCE_FILE);

  if (await datasetHasFrames(resolvedDataset)) {
    const sourceInfo = await readJsonIfPresent(sourceInfoPath);
    return {
      bootstrapped: false,
      dataset_dir: resolvedDataset,
      dataset_type: sourceInfo?.dataset_type ?? 'unknown_existing_frame_dataset',
      proxy_dataset: sourceInfo?.proxy_dataset ?? null,
      source_dir: sourceInfo?.source_dir ?? null,
      notes: sourceInfo?.notes ?? ['existing_frame_dataset_used'],
      groups: [],
    };
  }

  const repeatDatasetDir = path.resolve(DEFAULT_REPEAT_DATASET_DIR);
  if (!(await pathExists(repeatDatasetDir))) {
    return {
      bootstrapped: false,
      dataset_dir: resolvedDataset,
      dataset_type: 'missing',
      proxy_dataset: null,
      source_dir: repeatDatasetDir,
      notes: ['frame_dataset_missing', 'repeat_dataset_missing'],
      groups: [],
    };
  }

  await ensureDir(resolvedDataset);
  const repeatGroups = await readdir(repeatDatasetDir, { withFileTypes: true });
  const groups = [];

  for (const groupEntry of repeatGroups.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const sourceGroupDir = path.join(repeatDatasetDir, groupEntry.name);
    const frames = await listImageFiles(sourceGroupDir);
    if (frames.length === 0) continue;

    const targetGroupDir = path.join(resolvedDataset, sanitizeSegment(groupEntry.name));
    await ensureDir(targetGroupDir);
    const copied = [];
    for (let i = 0; i < frames.length; i += 1) {
      const sourcePath = frames[i];
      const ext = path.extname(sourcePath).toLowerCase() || '.jpg';
      const targetPath = path.join(targetGroupDir, `frame_${String(i + 1).padStart(3, '0')}${ext}`);
      await copyFile(sourcePath, targetPath);
      copied.push({
        source_path: sourcePath,
        dataset_path: targetPath,
      });
    }
    groups.push({
      card_group: sanitizeSegment(groupEntry.name),
      copied_count: copied.length,
      frames: copied,
    });
  }

  const sourceInfo = {
    generated_at: new Date().toISOString(),
    dataset_type: 'proxy_frame_dataset',
    proxy_dataset: true,
    source_dir: repeatDatasetDir,
    notes: [
      'bootstrapped_from_scanner_v3_repeat_dataset',
      'frames_are_ordered_repeat_capture_images_not_true_video_frames',
      'folder_labels_are_evaluation_labels_not_production_identity',
    ],
    groups,
  };
  await writeJson(sourceInfoPath, sourceInfo);

  return {
    bootstrapped: true,
    dataset_dir: resolvedDataset,
    dataset_type: sourceInfo.dataset_type,
    proxy_dataset: true,
    source_dir: repeatDatasetDir,
    notes: sourceInfo.notes,
    groups,
  };
}

async function discoverFrameDataset(datasetDir) {
  const resolved = path.resolve(datasetDir);
  const rootStat = await stat(resolved);
  if (!rootStat.isDirectory()) {
    throw new Error(`frame_dataset_not_directory:${resolved}`);
  }

  const entries = await readdir(resolved, { withFileTypes: true });
  const groups = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const groupDir = path.join(resolved, entry.name);
    const framePaths = await listImageFiles(groupDir);
    if (framePaths.length === 0) continue;
    groups.push({
      group_id: sanitizeSegment(entry.name),
      input_dir: groupDir,
      frame_paths: framePaths,
    });
  }

  if (groups.length === 0) {
    throw new Error(`frame_dataset_has_no_grouped_frames:${resolved}`);
  }

  return {
    dataset_dir: resolved,
    source_info: await readJsonIfPresent(path.join(resolved, DATASET_SOURCE_FILE)),
    groups,
  };
}

async function runNormalizationForGroup({ group, outputDir }) {
  const normalizationDir = path.join(outputDir, '_normalized', group.group_id);
  await ensureDir(normalizationDir);

  const harnessPath = path.resolve(NORMALIZATION_HARNESS);
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [harnessPath, '--folder', group.input_dir, '--out', normalizationDir],
    {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 24 * 1024 * 1024,
    }
  );

  return {
    normalization_dir: normalizationDir,
    stdout_tail: stdout.split(/\r?\n/).filter(Boolean).slice(-3),
    stderr_tail: stderr.split(/\r?\n/).filter(Boolean).slice(-3),
  };
}

async function discoverNormalizedFrames({ group, normalizationDir }) {
  const entries = await readdir(normalizationDir, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(normalizationDir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const frames = [];
  for (let index = 0; index < dirs.length; index += 1) {
    const dir = dirs[index];
    const fullCardPath = path.join(dir, 'normalized_full_card.jpg');
    const artworkPath = path.join(dir, 'normalized_artwork_region.jpg');
    const metrics = await readJsonIfPresent(path.join(dir, 'metrics.json'));
    const sourcePath = metrics?.input_path ?? group.frame_paths[index] ?? null;
    const frameNumber = index + 1;
    const frameId = `${group.group_id}_frame_${String(frameNumber).padStart(3, '0')}`;

    frames.push({
      frame_id: frameId,
      group_id: group.group_id,
      frame_index: frameNumber,
      source_image_path: sourcePath,
      normalized_dir: dir,
      normalized_full_card_path: fullCardPath,
      normalized_artwork_region_path: artworkPath,
      normalization_metrics: metrics,
      capture_accepted: metrics?.capture_accepted === true,
      rejection_reasons: metrics?.rejection_reasons ?? [],
      normalized_artifacts_exist: (await pathExists(fullCardPath)) && (await pathExists(artworkPath)),
    });
  }

  return frames;
}

async function hashFrame(frame) {
  if (!frame.normalized_artifacts_exist) {
    return {
      ...frame,
      full_card_hash: null,
      artwork_hash: null,
      hash_error: 'normalized_artifacts_missing',
    };
  }

  const [fullCardBuffer, artworkBuffer] = await Promise.all([
    readFile(frame.normalized_full_card_path),
    readFile(frame.normalized_artwork_region_path),
  ]);
  const [fullCardHash, artworkHash] = await Promise.all([
    computeDHashV1(fullCardBuffer),
    computeDHashV1(artworkBuffer),
  ]);

  return {
    ...frame,
    full_card_hash: fullCardHash,
    artwork_hash: artworkHash,
    hash_error: null,
  };
}

function combinedDistance(query, candidate) {
  const fullCardDistance = hammingDistanceBits(query.full_card_hash.bits, candidate.full_card_hash.bits);
  const artworkDistance = hammingDistanceBits(query.artwork_hash.bits, candidate.artwork_hash.bits);
  return {
    candidate_frame_id: candidate.frame_id,
    candidate_group: candidate.group_id,
    candidate_frame_index: candidate.frame_index,
    candidate_source_image_path: candidate.source_image_path,
    distance: fullCardDistance + artworkDistance,
    full_card_distance: fullCardDistance,
    artwork_distance: artworkDistance,
    candidate_capture_accepted: candidate.capture_accepted,
  };
}

function rankFrameCandidates({ query, referencePool, topN = TOP_CANDIDATES }) {
  if (!query.capture_accepted || !query.full_card_hash || !query.artwork_hash) return [];

  return referencePool
    .filter((candidate) =>
      candidate.frame_id !== query.frame_id &&
      candidate.capture_accepted &&
      candidate.full_card_hash &&
      candidate.artwork_hash
    )
    .map((candidate) => combinedDistance(query, candidate))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.artwork_distance !== b.artwork_distance) return a.artwork_distance - b.artwork_distance;
      if (a.full_card_distance !== b.full_card_distance) return a.full_card_distance - b.full_card_distance;
      return a.candidate_frame_id.localeCompare(b.candidate_frame_id);
    })
    .slice(0, topN)
    .map((candidate, index) => ({
      rank: index + 1,
      ...candidate,
    }));
}

function perGroupBestCandidates(topCandidates) {
  const bestByGroup = new Map();
  for (const candidate of topCandidates) {
    const current = bestByGroup.get(candidate.candidate_group);
    if (!current || candidate.rank < current.rank || candidate.distance < current.distance) {
      bestByGroup.set(candidate.candidate_group, candidate);
    }
  }
  return [...bestByGroup.values()].sort((a, b) => a.rank - b.rank || a.distance - b.distance);
}

function scoreForRank(rank) {
  if (rank === 1) return 4;
  if (rank === 2) return 3;
  if (rank === 3) return 2;
  if (rank === 4) return 1;
  if (rank === 5) return 0.5;
  return 0;
}

function snapshotScores(scoreMap) {
  return [...scoreMap.entries()]
    .map(([candidateGroup, state]) => ({
      candidate_group: candidateGroup,
      score: Math.round(state.score * 1000) / 1000,
      top3_hits: state.top3_hits,
      top1_hits: state.top1_hits,
      observed_frames: state.observed_frames,
      missing_top3_after_seen: state.missing_top3_after_seen,
      last_seen_accepted_frame: state.last_seen_accepted_frame,
      best_distance: state.best_distance,
    }))
    .sort((a, b) => b.score - a.score || b.top3_hits - a.top3_hits || a.candidate_group.localeCompare(b.candidate_group));
}

function updateRollingScores({ scoreMap, acceptedFrameNumber, topCandidates }) {
  const groupCandidates = perGroupBestCandidates(topCandidates);
  const top3Groups = new Set(groupCandidates.filter((candidate) => candidate.rank <= TOP_GROUPS_FOR_LOCK).map((candidate) => candidate.candidate_group));
  const seenGroups = new Set(groupCandidates.map((candidate) => candidate.candidate_group));

  for (const candidate of groupCandidates) {
    const existing = scoreMap.get(candidate.candidate_group) ?? {
      score: 0,
      top3_hits: 0,
      top1_hits: 0,
      observed_frames: 0,
      missing_top3_after_seen: 0,
      last_seen_accepted_frame: null,
      best_distance: null,
    };

    existing.score += scoreForRank(candidate.rank);
    existing.observed_frames += 1;
    existing.last_seen_accepted_frame = acceptedFrameNumber;
    existing.best_distance = existing.best_distance === null
      ? candidate.distance
      : Math.min(existing.best_distance, candidate.distance);
    if (candidate.rank <= TOP_GROUPS_FOR_LOCK) existing.top3_hits += 1;
    if (candidate.rank === 1) existing.top1_hits += 1;
    scoreMap.set(candidate.candidate_group, existing);
  }

  for (const [candidateGroup, state] of scoreMap.entries()) {
    if (!seenGroups.has(candidateGroup)) {
      state.score -= 1;
      state.missing_top3_after_seen += 1;
    } else if (!top3Groups.has(candidateGroup)) {
      state.score -= 0.5;
      state.missing_top3_after_seen += 1;
    }
  }
}

function evaluateLock({ scoreMap, acceptedFrameCount, currentTopCandidates }) {
  const scores = snapshotScores(scoreMap);
  const first = scores[0] ?? null;
  const second = scores[1] ?? null;
  const currentTop3Groups = new Set(
    perGroupBestCandidates(currentTopCandidates)
      .filter((candidate) => candidate.rank <= TOP_GROUPS_FOR_LOCK)
      .map((candidate) => candidate.candidate_group)
  );

  if (!first) {
    return { locked: false, reason: 'no_candidates', top: null, second: null, score_gap: null };
  }

  const scoreGap = second ? first.score - second.score : first.score;
  if (acceptedFrameCount < LOCK_MIN_ACCEPTED_FRAMES) {
    return { locked: false, reason: 'min_accepted_frames_not_met', top: first, second, score_gap: scoreGap };
  }
  if (first.top3_hits < LOCK_REQUIRED_TOP3_HITS) {
    return { locked: false, reason: 'top3_hits_not_met', top: first, second, score_gap: scoreGap };
  }
  if (!currentTop3Groups.has(first.candidate_group)) {
    return { locked: false, reason: 'leading_candidate_not_recent_top3', top: first, second, score_gap: scoreGap };
  }
  if (scoreGap < LOCK_SCORE_GAP) {
    return { locked: false, reason: 'score_gap_below_threshold', top: first, second, score_gap: scoreGap };
  }

  return {
    locked: true,
    reason: 'simulated_lock_rule_met',
    top: first,
    second,
    score_gap: scoreGap,
  };
}

function buildNoLockReasons({ acceptedFrameCount, scoreMap }) {
  const scores = snapshotScores(scoreMap);
  const first = scores[0] ?? null;
  const second = scores[1] ?? null;
  const reasons = [];
  if (acceptedFrameCount < LOCK_MIN_ACCEPTED_FRAMES) {
    reasons.push(`accepted_frames_below_minimum:${acceptedFrameCount}`);
  }
  if (!first) {
    reasons.push('no_candidate_scores');
  } else {
    if (first.top3_hits < LOCK_REQUIRED_TOP3_HITS) {
      reasons.push(`top3_hits_below_minimum:${first.top3_hits}`);
    }
    const gap = second ? first.score - second.score : first.score;
    if (gap < LOCK_SCORE_GAP) {
      reasons.push(`score_gap_below_threshold:${gap.toFixed(3)}`);
    }
  }
  return reasons;
}

function simulateSession({ group, frames, referencePool }) {
  const scoreMap = new Map();
  const frameResults = [];
  const rollingScoreTimeline = [];
  let acceptedFrameCount = 0;
  let lock = null;

  for (const frame of frames.sort((a, b) => a.frame_index - b.frame_index)) {
    const topCandidates = rankFrameCandidates({ query: frame, referencePool, topN: TOP_CANDIDATES });
    const frameResult = {
      frame_id: frame.frame_id,
      frame_index: frame.frame_index,
      source_image_path: frame.source_image_path,
      capture_accepted: frame.capture_accepted,
      rejection_reasons: frame.rejection_reasons,
      normalized_full_card_path: frame.normalized_full_card_path,
      normalized_artwork_region_path: frame.normalized_artwork_region_path,
      top_candidates: topCandidates,
      top_candidate_group: topCandidates[0]?.candidate_group ?? null,
      top_candidate_distance: topCandidates[0]?.distance ?? null,
      correct_group_in_top3: topCandidates.slice(0, 3).some((candidate) => candidate.candidate_group === group.group_id),
    };

    if (frame.capture_accepted && topCandidates.length > 0) {
      acceptedFrameCount += 1;
      updateRollingScores({
        scoreMap,
        acceptedFrameNumber: acceptedFrameCount,
        topCandidates,
      });
      const scoreSnapshot = snapshotScores(scoreMap);
      const lockCheck = evaluateLock({
        scoreMap,
        acceptedFrameCount,
        currentTopCandidates: topCandidates,
      });
      rollingScoreTimeline.push({
        frame_id: frame.frame_id,
        frame_index: frame.frame_index,
        accepted_frame_number: acceptedFrameCount,
        scores: scoreSnapshot,
        lock_check: lockCheck,
      });

      if (!lock && lockCheck.locked) {
        lock = {
          lock_occurred: true,
          lock_frame_id: frame.frame_id,
          lock_frame_index: frame.frame_index,
          accepted_frame_number: acceptedFrameCount,
          locked_candidate_group: lockCheck.top.candidate_group,
          score_gap: lockCheck.score_gap,
          lock_reason: lockCheck.reason,
          lock_rule: {
            minimum_accepted_frames: LOCK_MIN_ACCEPTED_FRAMES,
            required_top3_hits: LOCK_REQUIRED_TOP3_HITS,
            score_gap_threshold: LOCK_SCORE_GAP,
          },
        };
      }
    } else {
      rollingScoreTimeline.push({
        frame_id: frame.frame_id,
        frame_index: frame.frame_index,
        accepted_frame_number: acceptedFrameCount,
        scores: snapshotScores(scoreMap),
        lock_check: frame.capture_accepted
          ? { locked: false, reason: 'no_reference_candidates', top: null, second: null, score_gap: null }
          : { locked: false, reason: 'frame_rejected', top: null, second: null, score_gap: null },
      });
    }

    frameResults.push(frameResult);
  }

  const finalScores = snapshotScores(scoreMap);
  const lockPayload = lock ?? {
    lock_occurred: false,
    lock_frame_id: null,
    lock_frame_index: null,
    accepted_frame_number: acceptedFrameCount,
    locked_candidate_group: null,
    score_gap: null,
    lock_reason: 'no_simulated_lock',
    lock_rule: {
      minimum_accepted_frames: LOCK_MIN_ACCEPTED_FRAMES,
      required_top3_hits: LOCK_REQUIRED_TOP3_HITS,
      score_gap_threshold: LOCK_SCORE_GAP,
    },
  };

  return {
    card_group: group.group_id,
    proof_only: true,
    final_identity_decision: false,
    frames_processed: frames.length,
    accepted_frames: frames.filter((frame) => frame.capture_accepted).length,
    rejected_frames: frames.filter((frame) => !frame.capture_accepted).length,
    frame_results: frameResults,
    rolling_scores: rollingScoreTimeline,
    final_scores: finalScores,
    lock: {
      ...lockPayload,
      lock_correct_by_folder_label: lockPayload.lock_occurred
        ? lockPayload.locked_candidate_group === group.group_id
        : null,
    },
    instability_reasons: lockPayload.lock_occurred ? [] : buildNoLockReasons({
      acceptedFrameCount,
      scoreMap,
    }),
  };
}

function countReasons(sessions) {
  const counts = new Map();
  for (const session of sessions) {
    for (const frame of session.frame_results) {
      for (const reason of frame.rejection_reasons ?? []) {
        const key = String(reason).split(':')[0];
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    for (const reason of session.instability_reasons ?? []) {
      const key = String(reason).split(':')[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 1_000_000) / 1_000_000;
}

function convergenceExamples(sessions) {
  const successes = [];
  const fixedWeak = [];
  const failures = [];

  for (const session of sessions) {
    if (session.lock.lock_occurred && session.lock.lock_correct_by_folder_label) {
      successes.push({
        card_group: session.card_group,
        lock_frame_index: session.lock.lock_frame_index,
        accepted_frames: session.accepted_frames,
        locked_candidate_group: session.lock.locked_candidate_group,
        score_gap: session.lock.score_gap,
      });

      const weakFrames = session.frame_results.filter((frame) =>
        frame.capture_accepted &&
        frame.correct_group_in_top3 &&
        (frame.top_candidate_group !== session.card_group || Number(frame.top_candidate_distance) >= 50)
      );
      if (weakFrames.length > 0) {
        fixedWeak.push({
          card_group: session.card_group,
          lock_frame_index: session.lock.lock_frame_index,
          weak_frames: weakFrames.map((frame) => ({
            frame_id: frame.frame_id,
            frame_index: frame.frame_index,
            top_candidate_group: frame.top_candidate_group,
            top_candidate_distance: frame.top_candidate_distance,
            correct_group_in_top3: frame.correct_group_in_top3,
          })),
        });
      }
    } else {
      failures.push({
        card_group: session.card_group,
        accepted_frames: session.accepted_frames,
        rejected_frames: session.rejected_frames,
        lock_occurred: session.lock.lock_occurred,
        locked_candidate_group: session.lock.locked_candidate_group,
        lock_correct_by_folder_label: session.lock.lock_correct_by_folder_label,
        instability_reasons: session.instability_reasons,
      });
    }
  }

  return {
    convergence_successes: successes.slice(0, 5),
    examples_where_convergence_fixed_weak_single_frame_result: fixedWeak.slice(0, 5),
    convergence_failures: failures.slice(0, 5),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const outputDir = path.resolve(args.out || DEFAULT_OUTPUT_DIR);
  await ensureDir(outputDir);

  const datasetDir = path.resolve(args.dataset || DEFAULT_FRAME_DATASET_DIR);
  const bootstrap = args.bootstrap
    ? await bootstrapFrameDatasetIfNeeded(datasetDir)
    : {
        bootstrapped: false,
        dataset_dir: datasetDir,
        dataset_type: 'provided_frame_dataset',
        proxy_dataset: null,
        source_dir: null,
        notes: ['bootstrap_disabled'],
        groups: [],
      };

  const dataset = await discoverFrameDataset(datasetDir);
  const normalizedFrames = [];
  const normalizationRuns = [];

  for (const group of dataset.groups) {
    const normalization = await runNormalizationForGroup({ group, outputDir });
    normalizationRuns.push({
      group_id: group.group_id,
      input_dir: group.input_dir,
      frame_count: group.frame_paths.length,
      ...normalization,
    });
    normalizedFrames.push(...await discoverNormalizedFrames({
      group,
      normalizationDir: normalization.normalization_dir,
    }));
  }

  const hashedFrames = [];
  for (const frame of normalizedFrames) {
    hashedFrames.push(await hashFrame(frame));
  }

  const acceptedReferencePool = hashedFrames.filter((frame) =>
    frame.capture_accepted &&
    frame.full_card_hash &&
    frame.artwork_hash
  );

  const sessions = [];
  for (const group of dataset.groups) {
    const frames = hashedFrames
      .filter((frame) => frame.group_id === group.group_id)
      .sort((a, b) => a.frame_index - b.frame_index);
    const session = simulateSession({
      group,
      frames,
      referencePool: acceptedReferencePool,
    });
    const sessionDir = path.join(outputDir, group.group_id);
    await ensureDir(sessionDir);
    await writeJson(path.join(sessionDir, 'session.json'), session);
    sessions.push(session);
  }

  const lockedSessions = sessions.filter((session) => session.lock.lock_occurred);
  const correctLocks = lockedSessions.filter((session) => session.lock.lock_correct_by_folder_label === true);
  const wrongLocks = lockedSessions.filter((session) => session.lock.lock_correct_by_folder_label === false);
  const noLockSessions = sessions.filter((session) => !session.lock.lock_occurred);
  const totalFrames = sessions.reduce((sum, session) => sum + session.frames_processed, 0);
  const acceptedFrames = sessions.reduce((sum, session) => sum + session.accepted_frames, 0);
  const examples = convergenceExamples(sessions);

  const summary = {
    generated_at: new Date().toISOString(),
    harness: 'scanner_v3_frame_convergence_harness_v1',
    proof_only: true,
    final_identity_decision: false,
    dataset_dir: dataset.dataset_dir,
    dataset_type: bootstrap.dataset_type ?? dataset.source_info?.dataset_type ?? 'unknown',
    proxy_dataset: bootstrap.proxy_dataset ?? dataset.source_info?.proxy_dataset ?? null,
    dataset_notes: bootstrap.notes ?? dataset.source_info?.notes ?? [],
    output_dir: outputDir,
    normalization_output_dir: path.join(outputDir, '_normalized'),
    hash_algorithm: DHASH_V1.algorithm,
    reference_pool: {
      accepted_normalized_frames: acceptedReferencePool.length,
      exact_query_frame_excluded: true,
      candidate_groups_are_evaluation_labels_only: true,
    },
    simulated_lock_rule: {
      minimum_accepted_frames: LOCK_MIN_ACCEPTED_FRAMES,
      required_top3_hits: LOCK_REQUIRED_TOP3_HITS,
      top_candidate_groups_considered: TOP_GROUPS_FOR_LOCK,
      score_gap_threshold: LOCK_SCORE_GAP,
    },
    total_sessions: sessions.length,
    total_frames: totalFrames,
    accepted_frames: acceptedFrames,
    rejected_frames: totalFrames - acceptedFrames,
    sessions_locked: lockedSessions.length,
    correct_locks: correctLocks.length,
    wrong_locks: wrongLocks.length,
    no_lock_sessions: noLockSessions.length,
    average_frames_to_lock: average(lockedSessions.map((session) => session.lock.lock_frame_index)),
    accepted_frame_ratio: totalFrames > 0
      ? Math.round((acceptedFrames / totalFrames) * 1_000_000) / 1_000_000
      : null,
    most_common_rejection_reasons: countReasons(sessions),
    ...examples,
    normalization_runs: normalizationRuns,
    sessions: sessions.map((session) => ({
      card_group: session.card_group,
      frames_processed: session.frames_processed,
      accepted_frames: session.accepted_frames,
      rejected_frames: session.rejected_frames,
      lock: session.lock,
      instability_reasons: session.instability_reasons,
      session_path: path.join(outputDir, session.card_group, 'session.json'),
    })),
  };

  await writeJson(path.join(outputDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
