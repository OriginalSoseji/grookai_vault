import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
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

const DEFAULT_VIDEO_FOLDER = 'C:\\Users\\Cesar\\OneDrive\\Pictures\\Grookai';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_video_convergence_proof';
const NORMALIZATION_HARNESS = 'backend/scanner_v3/run_universal_tcg_scan_normalization_harness_v1.mjs';
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.avi', '.webm']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DEFAULT_INTERVAL_MS = 500;
const DEFAULT_MAX_FRAMES = 30;
const TOP_CANDIDATES = 5;
const TOP_GROUPS_FOR_LOCK = 3;
const LOCK_MIN_ACCEPTED_FRAMES = 3;
const LOCK_REQUIRED_TOP3_HITS = 3;
const LOCK_SCORE_GAP = 4;

class CleanExitError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function parseArgs(argv) {
  const args = {
    folder: DEFAULT_VIDEO_FOLDER,
    out: DEFAULT_OUTPUT_DIR,
    intervalMs: DEFAULT_INTERVAL_MS,
    maxFrames: DEFAULT_MAX_FRAMES,
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

    if (name === '--folder') {
      args.folder = nextValue();
    } else if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--interval-ms') {
      const parsed = Number.parseInt(nextValue(), 10);
      args.intervalMs = Number.isFinite(parsed) && parsed >= 100 ? parsed : DEFAULT_INTERVAL_MS;
    } else if (name === '--max-frames') {
      const parsed = Number.parseInt(nextValue(), 10);
      args.maxFrames = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FRAMES;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/scanner_v3/run_scanner_v3_video_convergence_harness_v1.mjs [--folder <video_folder>] [--out <output_folder>] [--interval-ms <n>] [--max-frames <n>]',
    '',
    'Defaults:',
    `  --folder ${DEFAULT_VIDEO_FOLDER}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --interval-ms ${DEFAULT_INTERVAL_MS}`,
    `  --max-frames ${DEFAULT_MAX_FRAMES}`,
    '',
    'This proof harness extracts video frames, normalizes them, and simulates convergence only.',
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

async function listVideoFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(folder, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function listImageFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(folder, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function resolveFfmpeg() {
  const candidates = [
    process.env.FFMPEG_PATH,
    'ffmpeg',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(candidate, ['-version'], {
        maxBuffer: 1024 * 1024,
      });
      const firstLine = stdout.split(/\r?\n/).find(Boolean) ?? 'ffmpeg available';
      return {
        ok: true,
        command: candidate,
        version: firstLine,
      };
    } catch (_) {
      // Try the next candidate.
    }
  }

  return {
    ok: false,
    command: null,
    version: null,
    instructions: [
      'Install ffmpeg and ensure ffmpeg.exe is on PATH, or set FFMPEG_PATH to the full executable path.',
      'After that, rerun this harness with --folder pointing at the video folder.',
    ],
  };
}

async function resolvePythonOpenCv() {
  const candidates = [
    process.env.PYTHON_OPENCV_CMD,
    'py',
    'python',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(candidate, ['-c', 'import cv2; print(cv2.__version__)'], {
        maxBuffer: 1024 * 1024,
      });
      return {
        ok: true,
        command: candidate,
        version: `opencv ${stdout.trim()}`,
      };
    } catch (_) {
      // Try the next candidate.
    }
  }

  return {
    ok: false,
    command: null,
    version: null,
    instructions: [
      'Install Python OpenCV or use the backend AI border service Python environment.',
      'Set PYTHON_OPENCV_CMD to a Python executable that can import cv2.',
    ],
  };
}

async function resolveFrameExtractor() {
  const ffmpeg = await resolveFfmpeg();
  if (ffmpeg.ok) {
    return {
      ok: true,
      kind: 'ffmpeg',
      command: ffmpeg.command,
      version: ffmpeg.version,
      ffmpeg,
      opencv: null,
    };
  }

  const opencv = await resolvePythonOpenCv();
  if (opencv.ok) {
    return {
      ok: true,
      kind: 'python_opencv',
      command: opencv.command,
      version: opencv.version,
      ffmpeg,
      opencv,
    };
  }

  return {
    ok: false,
    kind: null,
    command: null,
    version: null,
    ffmpeg,
    opencv,
    instructions: [
      'Install ffmpeg and ensure ffmpeg.exe is on PATH, or set FFMPEG_PATH.',
      'Alternatively, set PYTHON_OPENCV_CMD to a Python executable that can import cv2.',
    ],
  };
}

async function extractFramesWithFfmpeg({ ffmpegCommand, videoPath, framesDir, intervalMs, maxFrames }) {
  await ensureDir(framesDir);
  const fps = 1000 / intervalMs;
  const framePattern = path.join(framesDir, 'frame_%03d.jpg');
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    videoPath,
    '-vf',
    `fps=${fps.toFixed(4)}`,
    '-frames:v',
    String(maxFrames),
    '-q:v',
    '2',
    framePattern,
  ];

  const { stderr } = await execFileAsync(ffmpegCommand, args, {
    maxBuffer: 16 * 1024 * 1024,
  });

  const frames = await listImageFiles(framesDir);
  return {
    frames_dir: framesDir,
    frames,
    frame_count: frames.length,
    extractor: 'ffmpeg',
    interval_ms: intervalMs,
    max_frames: maxFrames,
    stderr_tail: stderr.split(/\r?\n/).filter(Boolean).slice(-5),
  };
}

async function extractFramesWithOpenCv({ pythonCommand, videoPath, framesDir, intervalMs, maxFrames }) {
  await ensureDir(framesDir);
  const script = [
    'import cv2, json, os, sys',
    'video_path = sys.argv[1]',
    'out_dir = sys.argv[2]',
    'interval_ms = int(sys.argv[3])',
    'max_frames = int(sys.argv[4])',
    'os.makedirs(out_dir, exist_ok=True)',
    'cap = cv2.VideoCapture(video_path)',
    'if not cap.isOpened():',
    '    print(json.dumps({"ok": False, "error": "video_open_failed"}))',
    '    sys.exit(2)',
    'fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)',
    'total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)',
    'step = max(1, int(round((interval_ms / 1000.0) * fps))) if fps > 0 else 15',
    'written = 0',
    'attempt = 0',
    'while written < max_frames:',
    '    target = attempt * step',
    '    if total > 0 and target >= total:',
    '        break',
    '    cap.set(cv2.CAP_PROP_POS_FRAMES, target)',
    '    ok, frame = cap.read()',
    '    if not ok:',
    '        break',
    '    out_path = os.path.join(out_dir, f"frame_{written + 1:03d}.jpg")',
    '    cv2.imwrite(out_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])',
    '    written += 1',
    '    attempt += 1',
    'cap.release()',
    'print(json.dumps({"ok": True, "fps": fps, "total_frames": total, "step_frames": step, "written": written}))',
  ].join('\n');

  const { stdout, stderr } = await execFileAsync(
    pythonCommand,
    ['-c', script, videoPath, framesDir, String(intervalMs), String(maxFrames)],
    {
      maxBuffer: 16 * 1024 * 1024,
    }
  );

  let extractorResult = null;
  const stdoutLines = stdout.split(/\r?\n/).filter(Boolean);
  if (stdoutLines.length > 0) {
    try {
      extractorResult = JSON.parse(stdoutLines[stdoutLines.length - 1]);
    } catch (_) {
      extractorResult = null;
    }
  }

  const frames = await listImageFiles(framesDir);
  return {
    frames_dir: framesDir,
    frames,
    frame_count: frames.length,
    extractor: 'python_opencv',
    interval_ms: intervalMs,
    max_frames: maxFrames,
    opencv_result: extractorResult,
    stdout_tail: stdoutLines.slice(-5),
    stderr_tail: stderr.split(/\r?\n/).filter(Boolean).slice(-5),
  };
}

async function extractFramesFromVideo({ extractor, videoPath, framesDir, intervalMs, maxFrames }) {
  if (extractor.kind === 'ffmpeg') {
    return extractFramesWithFfmpeg({
      ffmpegCommand: extractor.command,
      videoPath,
      framesDir,
      intervalMs,
      maxFrames,
    });
  }

  if (extractor.kind === 'python_opencv') {
    return extractFramesWithOpenCv({
      pythonCommand: extractor.command,
      videoPath,
      framesDir,
      intervalMs,
      maxFrames,
    });
  }

  throw new Error(`unsupported_extractor:${extractor.kind ?? 'none'}`);
}

async function runNormalizationForVideo({ videoGroup, framesDir, outputDir }) {
  const normalizationDir = path.join(outputDir, '_normalized', videoGroup);
  await ensureDir(normalizationDir);

  const harnessPath = path.resolve(NORMALIZATION_HARNESS);
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [harnessPath, '--folder', framesDir, '--out', normalizationDir],
    {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 32 * 1024 * 1024,
    }
  );

  return {
    normalization_dir: normalizationDir,
    stdout_tail: stdout.split(/\r?\n/).filter(Boolean).slice(-3),
    stderr_tail: stderr.split(/\r?\n/).filter(Boolean).slice(-3),
  };
}

async function discoverNormalizedVideoFrames({ videoGroup, videoPath, normalizationDir, intervalMs }) {
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
    const bottomBandPath = path.join(dir, 'normalized_bottom_band.jpg');
    const metrics = await readJsonIfPresent(path.join(dir, 'metrics.json'));
    const frameNumber = index + 1;
    const frameId = `${videoGroup}_frame_${String(frameNumber).padStart(3, '0')}`;

    frames.push({
      frame_id: frameId,
      group_id: videoGroup,
      frame_index: frameNumber,
      frame_time_ms: (frameNumber - 1) * intervalMs,
      frame_time_seconds: Math.round(((frameNumber - 1) * intervalMs / 1000) * 1000) / 1000,
      video_path: videoPath,
      source_image_path: metrics?.input_path ?? null,
      normalized_dir: dir,
      normalized_full_card_path: fullCardPath,
      normalized_artwork_region_path: artworkPath,
      normalized_bottom_band_path: bottomBandPath,
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
    candidate_frame_time_seconds: candidate.frame_time_seconds,
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

function simulateSession({ groupId, videoPath, frames, referencePool }) {
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
      frame_time_ms: frame.frame_time_ms,
      frame_time_seconds: frame.frame_time_seconds,
      source_image_path: frame.source_image_path,
      capture_accepted: frame.capture_accepted,
      rejection_reasons: frame.rejection_reasons,
      normalized_full_card_path: frame.normalized_full_card_path,
      normalized_artwork_region_path: frame.normalized_artwork_region_path,
      normalized_bottom_band_path: frame.normalized_bottom_band_path,
      metrics: frame.normalization_metrics,
      top_candidates: topCandidates,
      top_candidate_group: topCandidates[0]?.candidate_group ?? null,
      top_candidate_distance: topCandidates[0]?.distance ?? null,
      correct_group_in_top3: topCandidates.slice(0, 3).some((candidate) => candidate.candidate_group === groupId),
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
        frame_time_seconds: frame.frame_time_seconds,
        accepted_frame_number: acceptedFrameCount,
        scores: scoreSnapshot,
        lock_check: lockCheck,
      });

      if (!lock && lockCheck.locked) {
        lock = {
          lock_occurred: true,
          lock_frame_id: frame.frame_id,
          lock_frame_index: frame.frame_index,
          lock_frame_time_seconds: frame.frame_time_seconds,
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
        frame_time_seconds: frame.frame_time_seconds,
        accepted_frame_number: acceptedFrameCount,
        scores: snapshotScores(scoreMap),
        lock_check: frame.capture_accepted
          ? { locked: false, reason: 'no_reference_candidates', top: null, second: null, score_gap: null }
          : { locked: false, reason: 'frame_rejected', top: null, second: null, score_gap: null },
      });
    }

    frameResults.push(frameResult);
  }

  const lockPayload = lock ?? {
    lock_occurred: false,
    lock_frame_id: null,
    lock_frame_index: null,
    lock_frame_time_seconds: null,
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
    video_group: groupId,
    video_path: videoPath,
    proof_only: true,
    final_identity_decision: false,
    total_extracted_frames: frames.length,
    accepted_frames: frames.filter((frame) => frame.capture_accepted).length,
    rejected_frames: frames.filter((frame) => !frame.capture_accepted).length,
    per_frame: frameResults,
    rolling_scores: rollingScoreTimeline,
    final_scores: snapshotScores(scoreMap),
    lock: {
      ...lockPayload,
      lock_correct_by_video_group: lockPayload.lock_occurred
        ? lockPayload.locked_candidate_group === groupId
        : null,
    },
    no_lock_reasons: lockPayload.lock_occurred ? [] : buildNoLockReasons({
      acceptedFrameCount,
      scoreMap,
    }),
  };
}

function countReasons(sessions) {
  const counts = new Map();
  for (const session of sessions) {
    for (const frame of session.per_frame) {
      for (const reason of frame.rejection_reasons ?? []) {
        const key = String(reason).split(':')[0];
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    for (const reason of session.no_lock_reasons ?? []) {
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

function buildExamples(sessions) {
  const successes = [];
  const failures = [];
  for (const session of sessions) {
    if (session.lock.lock_occurred && session.lock.lock_correct_by_video_group === true) {
      successes.push({
        video_group: session.video_group,
        lock_frame_index: session.lock.lock_frame_index,
        lock_frame_time_seconds: session.lock.lock_frame_time_seconds,
        accepted_frames: session.accepted_frames,
        locked_candidate_group: session.lock.locked_candidate_group,
        score_gap: session.lock.score_gap,
      });
    } else {
      failures.push({
        video_group: session.video_group,
        accepted_frames: session.accepted_frames,
        rejected_frames: session.rejected_frames,
        lock_occurred: session.lock.lock_occurred,
        locked_candidate_group: session.lock.locked_candidate_group,
        lock_correct_by_video_group: session.lock.lock_correct_by_video_group,
        no_lock_reasons: session.no_lock_reasons,
      });
    }
  }
  return {
    convergence_successes: successes.slice(0, 8),
    convergence_failures: failures.slice(0, 8),
  };
}

function isPromisingForPrototype({ sessions, correctLocks, wrongLocks, acceptedFrameRatio }) {
  if (sessions.length === 0) return false;
  const lockRate = correctLocks.length / sessions.length;
  return wrongLocks.length === 0 && lockRate >= 0.6 && acceptedFrameRatio >= 0.5;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const inputFolder = path.resolve(args.folder || DEFAULT_VIDEO_FOLDER);
  if (!(await pathExists(inputFolder))) {
    throw new CleanExitError(
      'video_folder_not_found',
      `Video input folder not found: ${inputFolder}`,
      {
        input_folder: inputFolder,
        expected_default: DEFAULT_VIDEO_FOLDER,
        next_step: 'Create the folder, sync OneDrive locally, or pass --folder <video_folder>.',
      }
    );
  }

  const videos = await listVideoFiles(inputFolder);
  if (videos.length === 0) {
    throw new CleanExitError(
      'no_video_files_found',
      `No supported video files found in: ${inputFolder}`,
      {
        input_folder: inputFolder,
        supported_extensions: [...VIDEO_EXTENSIONS],
      }
    );
  }

  const extractor = await resolveFrameExtractor();
  if (!extractor.ok) {
    throw new CleanExitError(
      'frame_extractor_unavailable',
      'No supported frame extractor is available.',
      extractor
    );
  }

  const outputDir = path.resolve(args.out || DEFAULT_OUTPUT_DIR);
  await ensureDir(outputDir);

  const extractionRuns = [];
  const normalizedFrames = [];
  const videoGroups = [];

  for (const videoPath of videos) {
    const videoGroup = sanitizeSegment(path.basename(videoPath), `video_${videoGroups.length + 1}`);
    const videoOutDir = path.join(outputDir, videoGroup);
    const framesDir = path.join(videoOutDir, 'frames');
    await ensureDir(videoOutDir);

    const extraction = await extractFramesFromVideo({
      extractor,
      videoPath,
      framesDir,
      intervalMs: args.intervalMs,
      maxFrames: args.maxFrames,
    });
    extractionRuns.push({
      video_group: videoGroup,
      video_path: videoPath,
      ...extraction,
    });
    videoGroups.push({
      video_group: videoGroup,
      video_path: videoPath,
      frames_dir: framesDir,
      extracted_frame_count: extraction.frame_count,
    });

    if (extraction.frame_count === 0) {
      continue;
    }

    const normalization = await runNormalizationForVideo({
      videoGroup,
      framesDir,
      outputDir,
    });
    const frames = await discoverNormalizedVideoFrames({
      videoGroup,
      videoPath,
      normalizationDir: normalization.normalization_dir,
      intervalMs: args.intervalMs,
    });
    normalizedFrames.push(...frames.map((frame) => ({
      ...frame,
      extraction,
      normalization_run: normalization,
    })));
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
  for (const group of videoGroups) {
    const frames = hashedFrames
      .filter((frame) => frame.group_id === group.video_group)
      .sort((a, b) => a.frame_index - b.frame_index);
    const session = simulateSession({
      groupId: group.video_group,
      videoPath: group.video_path,
      frames,
      referencePool: acceptedReferencePool,
    });
    const sessionDir = path.join(outputDir, group.video_group);
    await ensureDir(sessionDir);
    await writeJson(path.join(sessionDir, 'session.json'), session);
    sessions.push(session);
  }

  const lockedSessions = sessions.filter((session) => session.lock.lock_occurred);
  const correctLocks = lockedSessions.filter((session) => session.lock.lock_correct_by_video_group === true);
  const wrongLocks = lockedSessions.filter((session) => session.lock.lock_correct_by_video_group === false);
  const noLockSessions = sessions.filter((session) => !session.lock.lock_occurred);
  const totalExtractedFrames = extractionRuns.reduce((sum, run) => sum + run.frame_count, 0);
  const totalAcceptedFrames = sessions.reduce((sum, session) => sum + session.accepted_frames, 0);
  const acceptedFrameRatio = totalExtractedFrames > 0
    ? Math.round((totalAcceptedFrames / totalExtractedFrames) * 1_000_000) / 1_000_000
    : null;
  const examples = buildExamples(sessions);

  const summary = {
    generated_at: new Date().toISOString(),
    harness: 'scanner_v3_video_convergence_harness_v1',
    proof_only: true,
    final_identity_decision: false,
    input_folder: inputFolder,
    output_dir: outputDir,
    extractor,
    extraction: {
      interval_ms: args.intervalMs,
      max_frames_per_video: args.maxFrames,
    },
    hash_algorithm: DHASH_V1.algorithm,
    reference_pool: {
      accepted_normalized_frames: acceptedReferencePool.length,
      exact_query_frame_excluded: true,
      video_basename_is_evaluation_group_only: true,
    },
    simulated_lock_rule: {
      minimum_accepted_frames: LOCK_MIN_ACCEPTED_FRAMES,
      required_top3_hits: LOCK_REQUIRED_TOP3_HITS,
      top_candidate_groups_considered: TOP_GROUPS_FOR_LOCK,
      score_gap_threshold: LOCK_SCORE_GAP,
    },
    total_videos: videos.length,
    videos_discovered: videos,
    frames_extracted_per_video: extractionRuns.map((run) => ({
      video_group: run.video_group,
      video_path: run.video_path,
      frame_count: run.frame_count,
      frames_dir: run.frames_dir,
    })),
    total_frames_extracted: totalExtractedFrames,
    total_accepted_frames: totalAcceptedFrames,
    total_rejected_frames: totalExtractedFrames - totalAcceptedFrames,
    accepted_frame_ratio: acceptedFrameRatio,
    sessions_locked: lockedSessions.length,
    correct_locks: correctLocks.length,
    wrong_locks: wrongLocks.length,
    no_lock_sessions: noLockSessions.length,
    average_frames_to_lock: average(lockedSessions.map((session) => session.lock.lock_frame_index)),
    average_seconds_to_lock: average(lockedSessions.map((session) => session.lock.lock_frame_time_seconds)),
    most_common_rejection_reasons: countReasons(sessions),
    ...examples,
    promising_enough_for_live_scanner_prototype: isPromisingForPrototype({
      sessions,
      correctLocks,
      wrongLocks,
      acceptedFrameRatio: acceptedFrameRatio ?? 0,
    }),
    extraction_runs: extractionRuns,
    sessions: sessions.map((session) => ({
      video_group: session.video_group,
      video_path: session.video_path,
      total_extracted_frames: session.total_extracted_frames,
      accepted_frames: session.accepted_frames,
      rejected_frames: session.rejected_frames,
      lock: session.lock,
      no_lock_reasons: session.no_lock_reasons,
      session_path: path.join(outputDir, session.video_group, 'session.json'),
    })),
  };

  await writeJson(path.join(outputDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  const payload = error instanceof CleanExitError
    ? {
        ok: false,
        error: error.code,
        message: error.message,
        details: error.details,
      }
    : {
        ok: false,
        error: 'unexpected_error',
        message: error?.message ?? String(error),
        stack: error?.stack ?? null,
      };
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});
