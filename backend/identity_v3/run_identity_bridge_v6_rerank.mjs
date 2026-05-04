import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { safeBasename } from './lib/hash_index_v1.mjs';
import {
  RERANK_COMPARATOR_V1,
  rerankCandidates,
} from './lib/rerank_comparator_v1.mjs';

const DEFAULT_V5_DIR = '.tmp/scanner_v3_identity_bridge_v5';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_identity_bridge_v6';
const DEFAULT_TOP_INPUT = 10;
const DEFAULT_TOP_OUTPUT = 10;

function parseArgs(argv) {
  const args = {
    v5: DEFAULT_V5_DIR,
    out: DEFAULT_OUTPUT_DIR,
    topInput: DEFAULT_TOP_INPUT,
    topOutput: DEFAULT_TOP_OUTPUT,
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

    if (name === '--v5' || name === '--input') {
      args.v5 = nextValue();
    } else if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--top-input') {
      args.topInput = positiveInt(nextValue(), DEFAULT_TOP_INPUT);
    } else if (name === '--top-output') {
      args.topOutput = positiveInt(nextValue(), DEFAULT_TOP_OUTPUT);
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_identity_bridge_v6_rerank.mjs [--v5 <v5_output>] [--out <folder>]',
    '',
    'Defaults:',
    `  --v5 ${DEFAULT_V5_DIR}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --top-input ${DEFAULT_TOP_INPUT}`,
    '',
    'Reads V5 top candidates, reranks the top 10 with pixel/edge/layout comparison, and writes proof outputs only.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const v5Dir = path.resolve(args.v5);
  const outputDir = path.resolve(args.out);
  await ensureDir(outputDir);

  const v5Summary = await readJsonIfPresent(path.join(v5Dir, 'summary.json'));
  const sessions = await discoverV5CandidateFiles(v5Dir);
  if (sessions.length === 0) {
    throw new Error(`identity_bridge_v6_no_v5_candidate_files:${v5Dir}`);
  }

  const results = [];
  const skipped = [];
  for (const session of sessions) {
    try {
      const result = await rerankSession({
        session,
        outputDir,
        topInput: args.topInput,
        topOutput: args.topOutput,
      });
      results.push(result);
      console.log(JSON.stringify({
        query: result.query,
        expected_card_id: result.expected_card_id,
        v5_expected_rank: result.v5_evaluation.expected_rank,
        v6_expected_rank: result.evaluation.expected_rank,
        v5_top1: result.v5_candidates[0]?.card_id ?? null,
        v6_top1: result.reranked_candidates[0]?.card_id ?? null,
        top1_improved: result.evaluation.correct_top1 && !result.v5_evaluation.correct_top1,
        top5_improved: result.evaluation.correct_in_top5 && !result.v5_evaluation.correct_in_top5,
      }));
    } catch (error) {
      skipped.push({
        session_id: session.session_id,
        path: session.path,
        reason: error?.message || String(error),
      });
    }
  }

  const summary = buildSummary({
    v5Dir,
    outputDir,
    v5Summary,
    results,
    skipped,
    topInput: args.topInput,
  });
  await writeJson(path.join(outputDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

async function rerankSession({
  session,
  outputDir,
  topInput,
  topOutput,
}) {
  const v5 = await readJson(session.path);
  if (!v5.artwork_region_path) {
    throw new Error(`v5_missing_artwork_region_path:${session.session_id}`);
  }
  if (!Array.isArray(v5.candidates) || v5.candidates.length === 0) {
    throw new Error(`v5_missing_candidates:${session.session_id}`);
  }

  const startedAt = performance.now();
  const v5Candidates = v5.candidates.slice(0, topInput);
  const reranked = await rerankCandidates({
    queryArtworkPath: v5.artwork_region_path,
    candidates: v5Candidates,
    topN: topInput,
  });
  const rerankedCandidates = reranked.reranked_candidates.slice(0, topOutput);
  const elapsedMs = round3(performance.now() - startedAt);
  const v5Evaluation = evaluateCandidates(v5.expected_card_id, v5Candidates);
  const evaluation = evaluateCandidates(v5.expected_card_id, rerankedCandidates);
  const outputSessionDir = path.join(outputDir, safeBasename(v5.query ?? session.session_id));
  await ensureDir(outputSessionDir);

  const result = {
    query: v5.query ?? session.session_id,
    source_name: v5.source_name ?? null,
    expected_card_id: v5.expected_card_id ?? null,
    expected_label: v5.expected_label ?? null,
    artwork_region_path: v5.artwork_region_path,
    comparator_version: RERANK_COMPARATOR_V1.name,
    comparator: RERANK_COMPARATOR_V1,
    input_candidate_count: v5Candidates.length,
    reranked_candidate_count: rerankedCandidates.length,
    rerank_elapsed_ms: elapsedMs,
    v5_candidates: v5Candidates.map((candidate) => ({
      card_id: candidate.card_id,
      name: candidate.name ?? null,
      set_code: candidate.set_code ?? null,
      number: candidate.number ?? null,
      rank: candidate.rank ?? null,
      distance: candidate.distance ?? null,
      similarity: candidate.similarity ?? null,
      source_path: candidate.source_path ?? null,
    })),
    reranked_candidates: rerankedCandidates,
    skipped_candidates: reranked.skipped_candidates,
    v5_evaluation: v5Evaluation,
    evaluation,
    improvement: {
      top1_improved: evaluation.correct_top1 && !v5Evaluation.correct_top1,
      top1_regressed: !evaluation.correct_top1 && v5Evaluation.correct_top1,
      top5_improved: evaluation.correct_in_top5 && !v5Evaluation.correct_in_top5,
      top5_regressed: !evaluation.correct_in_top5 && v5Evaluation.correct_in_top5,
      rank_delta: rankDelta(v5Evaluation.expected_rank, evaluation.expected_rank),
    },
    final_identity_decision: false,
    proof_only: true,
  };

  await writeJson(path.join(outputSessionDir, 'candidates.json'), result);
  return result;
}

async function discoverV5CandidateFiles(v5Dir) {
  const entries = await readdir(v5Dir, { withFileTypes: true });
  const sessions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const filePath = path.join(v5Dir, entry.name, 'candidates.json');
    if (await pathExists(filePath)) {
      sessions.push({
        session_id: entry.name,
        path: filePath,
      });
    }
  }
  return sessions.sort((a, b) => a.session_id.localeCompare(b.session_id));
}

function buildSummary({
  v5Dir,
  outputDir,
  v5Summary,
  results,
  skipped,
  topInput,
}) {
  const evaluated = results.filter((result) => result.evaluation.evaluated);
  const v5Evaluated = results.filter((result) => result.v5_evaluation.evaluated);
  const tyranitarCases = results
    .filter((result) => /tyranitar/i.test(`${result.expected_label ?? ''}`))
    .map((result) => ({
      query: result.query,
      expected_label: result.expected_label,
      expected_card_id: result.expected_card_id,
      v5_expected_rank: result.v5_evaluation.expected_rank,
      v6_expected_rank: result.evaluation.expected_rank,
      v5_top1: candidateSummary(result.v5_candidates[0]),
      v6_top1: candidateSummary(result.reranked_candidates[0]),
      v6_correct_in_top5: result.evaluation.correct_in_top5,
      rank_delta: result.improvement.rank_delta,
    }));

  const summary = {
    generated_at: new Date().toISOString(),
    output_dir: outputDir,
    v5_input_dir: v5Dir,
    proof_only: true,
    final_identity_decision: false,
    comparator_version: RERANK_COMPARATOR_V1.name,
    top_input_candidates_reranked: topInput,
    total_sessions: results.length,
    skipped_sessions: skipped,
    evaluated_sessions: evaluated.length,
    v5_top1_accuracy: accuracy(v5Evaluated, (result) => result.v5_evaluation.correct_top1),
    v6_top1_accuracy: accuracy(evaluated, (result) => result.evaluation.correct_top1),
    top1_improvement: accuracyDelta(
      accuracy(v5Evaluated, (result) => result.v5_evaluation.correct_top1),
      accuracy(evaluated, (result) => result.evaluation.correct_top1),
    ),
    v5_top5_accuracy: accuracy(v5Evaluated, (result) => result.v5_evaluation.correct_in_top5),
    v6_top5_accuracy: accuracy(evaluated, (result) => result.evaluation.correct_in_top5),
    top5_improvement: accuracyDelta(
      accuracy(v5Evaluated, (result) => result.v5_evaluation.correct_in_top5),
      accuracy(evaluated, (result) => result.evaluation.correct_in_top5),
    ),
    v5_correct_top1_count: v5Evaluated.filter((result) => result.v5_evaluation.correct_top1).length,
    v6_correct_top1_count: evaluated.filter((result) => result.evaluation.correct_top1).length,
    v5_correct_top5_count: v5Evaluated.filter((result) => result.v5_evaluation.correct_in_top5).length,
    v6_correct_top5_count: evaluated.filter((result) => result.evaluation.correct_in_top5).length,
    top1_improved_cases: results.filter((result) => result.improvement.top1_improved).map(resultSummary),
    top1_regressed_cases: results.filter((result) => result.improvement.top1_regressed).map(resultSummary),
    top5_improved_cases: results.filter((result) => result.improvement.top5_improved).map(resultSummary),
    top5_regressed_cases: results.filter((result) => result.improvement.top5_regressed).map(resultSummary),
    tyranitar_cases: tyranitarCases,
    average_rank_delta_when_expected_in_top10: average(
      results
        .map((result) => result.improvement.rank_delta)
        .filter(Number.isFinite),
    ),
    average_rerank_elapsed_ms: average(results.map((result) => result.rerank_elapsed_ms)),
    max_rerank_elapsed_ms: maxOrNull(results.map((result) => result.rerank_elapsed_ms)),
    separation_observation: separationObservation({ results, tyranitarCases }),
    v5_summary_snapshot: v5Summary ? {
      reference_count_indexed: v5Summary.reference_count_indexed ?? null,
      v5_top1_accuracy: v5Summary.top1_accuracy ?? null,
      v5_top5_accuracy: v5Summary.top5_accuracy ?? null,
      v5_top20_accuracy: v5Summary.top20_accuracy ?? null,
    } : null,
  };

  return summary;
}

function evaluateCandidates(expectedCardId, candidates) {
  if (!expectedCardId) {
    return {
      evaluated: false,
      reason: 'missing_expected_card_id',
      expected_rank: null,
      correct_top1: false,
      correct_in_top5: false,
    };
  }

  const rankIndex = candidates.findIndex((candidate) => candidate.card_id === expectedCardId);
  return {
    evaluated: true,
    expected_rank: rankIndex >= 0 ? rankIndex + 1 : null,
    correct_top1: rankIndex === 0,
    correct_in_top5: rankIndex >= 0 && rankIndex < 5,
  };
}

function rankDelta(beforeRank, afterRank) {
  if (!Number.isFinite(beforeRank) || !Number.isFinite(afterRank)) return null;
  return beforeRank - afterRank;
}

function resultSummary(result) {
  return {
    query: result.query,
    expected_label: result.expected_label,
    expected_card_id: result.expected_card_id,
    v5_expected_rank: result.v5_evaluation.expected_rank,
    v6_expected_rank: result.evaluation.expected_rank,
    v5_top1: candidateSummary(result.v5_candidates[0]),
    v6_top1: candidateSummary(result.reranked_candidates[0]),
    rank_delta: result.improvement.rank_delta,
  };
}

function candidateSummary(candidate) {
  if (!candidate) return null;
  return {
    card_id: candidate.card_id,
    name: candidate.name ?? null,
    set_code: candidate.set_code ?? null,
    number: candidate.number ?? null,
    rank: candidate.rerank_rank ?? candidate.rank ?? candidate.v5_rank ?? null,
    final_score: candidate.final_score ?? null,
    distance: candidate.distance ?? candidate.v5_distance ?? null,
  };
}

function separationObservation({ results, tyranitarCases }) {
  const top5Improved = results.some((result) => result.improvement.top5_improved);
  const top5Regressed = results.some((result) => result.improvement.top5_regressed);
  const tyranitarImproved = tyranitarCases.some((item) => Number.isFinite(item.rank_delta) && item.rank_delta > 0);
  if (top5Improved && !top5Regressed) {
    return 'rerank_improved_top5_without_top5_regression';
  }
  if (tyranitarImproved) {
    return 'rerank_improved_some_tyranitar_ordering_but_not_enough_for_top5';
  }
  if (top5Regressed) {
    return 'rerank_regressed_at_least_one_top5_case';
  }
  return 'rerank_did_not_materially_improve_separation';
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readJsonIfPresent(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function accuracy(results, predicate) {
  if (results.length === 0) return null;
  return round6(results.filter(predicate).length / results.length);
}

function accuracyDelta(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  return round6(after - before);
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return round6(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

function maxOrNull(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return Math.max(...finite);
}

function round3(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
