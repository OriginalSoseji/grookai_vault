import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';

import {
  EMBEDDING_INDEX_V1,
  embedImageBuffer,
  rankEmbeddingViewCandidates,
} from './lib/embedding_index_v1.mjs';
import { extractArtworkRegionBuffer, safeBasename } from './lib/hash_index_v1.mjs';
import {
  MULTICROP_GENERATOR_V1,
  generateQueryCrops,
} from './lib/multicrop_generator_v1.mjs';

const DEFAULT_INDEX_CACHE = '.tmp/scanner_v3_embedding_index_v7.json';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_v8_known_reference_validation';
const DEFAULT_LIMIT = 20;
const DEFAULT_FRAME_COUNT = 5;
const DEFAULT_TOP_PER_CROP = 50;
const DEFAULT_TOP_UNIFIED = 50;
const DEFAULT_TOP_RERANK_INPUT = 10;
const DEFAULT_TOP_OUTPUT = 5;

const V8_VOTE_GUARD = {
  decayFactor: 0.72,
  lockScoreGap: 1.2,
  identityAcceptScoreGap: 1.2,
  identityAcceptFrameScoreGap: 0.015,
  minScoreThreshold: 2.0,
  maxAcceptedDistance: 0.165,
  minCropTypesToLock: 2,
  minCropTypesToAccept: 2,
  minTopFiveFramesToLock: 3,
  minRecentTopFiveFramesToAccept: 3,
  recentFrameWindow: 5,
};

function parseArgs(argv) {
  const args = {
    indexCache: DEFAULT_INDEX_CACHE,
    out: DEFAULT_OUTPUT_DIR,
    limit: DEFAULT_LIMIT,
    frames: DEFAULT_FRAME_COUNT,
    topPerCrop: DEFAULT_TOP_PER_CROP,
    topUnified: DEFAULT_TOP_UNIFIED,
    topRerankInput: DEFAULT_TOP_RERANK_INPUT,
    topOutput: DEFAULT_TOP_OUTPUT,
    cardIds: [],
    model: EMBEDDING_INDEX_V1.model,
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

    if (name === '--index-cache') {
      args.indexCache = nextValue() || DEFAULT_INDEX_CACHE;
    } else if (name === '--out') {
      args.out = nextValue() || DEFAULT_OUTPUT_DIR;
    } else if (name === '--limit') {
      args.limit = positiveInt(nextValue(), DEFAULT_LIMIT);
    } else if (name === '--frames') {
      args.frames = positiveInt(nextValue(), DEFAULT_FRAME_COUNT);
    } else if (name === '--top-per-crop') {
      args.topPerCrop = positiveInt(nextValue(), DEFAULT_TOP_PER_CROP);
    } else if (name === '--top-unified') {
      args.topUnified = positiveInt(nextValue(), DEFAULT_TOP_UNIFIED);
    } else if (name === '--top-rerank-input') {
      args.topRerankInput = positiveInt(nextValue(), DEFAULT_TOP_RERANK_INPUT);
    } else if (name === '--top-output') {
      args.topOutput = positiveInt(nextValue(), DEFAULT_TOP_OUTPUT);
    } else if (name === '--card-ids') {
      args.cardIds = splitCsv(nextValue());
    } else if (name === '--model') {
      args.model = nextValue() || EMBEDDING_INDEX_V1.model;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_scanner_v3_v8_known_reference_validation.mjs [--limit 20] [--frames 5]',
    '',
    'This harness uses indexed reference images as known queries, runs V8 multicrop candidate generation,',
    'then simulates the Scanner V3 temporal voting and confidence guard without app/device scanning.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const indexCachePath = path.resolve(args.indexCache);
  const outputDir = path.resolve(args.out);
  await ensureDir(outputDir);

  const index = normalizeIndex(JSON.parse(await readFile(indexCachePath, 'utf8')));
  if (index.references.length === 0) {
    throw new Error(`scanner_v3_v8_known_reference_index_empty:${indexCachePath}`);
  }

  const references = selectReferences(index.references, {
    limit: args.limit,
    cardIds: args.cardIds,
  });
  if (references.length === 0) {
    throw new Error('scanner_v3_v8_known_reference_selection_empty');
  }

  const sessions = [];
  for (const reference of references) {
    const session = await validateReference({
      reference,
      index,
      outputDir,
      args,
    });
    sessions.push(session);
    console.log(JSON.stringify({
      card_id: reference.card_id,
      name: reference.name,
      final_state: session.final_state,
      locked_card_id: session.locked_card_id,
      correct_lock: session.correct_lock,
      frames_to_lock: session.frames_to_lock,
      first_correct_rank: session.correct_candidate_rank_by_frame[0] ?? null,
    }));
  }

  const summary = buildSummary({
    sessions,
    index,
    outputDir,
    indexCachePath,
    args,
  });
  await writeJson(path.join(outputDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

async function validateReference({
  reference,
  index,
  outputDir,
  args,
}) {
  const startedAt = performance.now();
  const cardDir = path.join(outputDir, safeBasename(reference.card_id));
  await ensureDir(cardDir);
  const artifacts = await writeReferenceQueryArtifacts(reference, cardDir);
  const crops = await generateQueryCrops({
    normalizedFullCardPath: artifacts.fullCardPath,
    artworkRegionPath: artifacts.artworkPath,
  });

  const baseFrame = await resolveFrameCandidates({
    crops,
    references: index.references,
    model: args.model,
    topPerCrop: args.topPerCrop,
    topUnified: args.topUnified,
    topRerankInput: args.topRerankInput,
    topOutput: args.topOutput,
  });

  const voteState = new CandidateVoteStateMirror();
  const frames = [];
  let lockFrame = null;

  for (let frameIndex = 1; frameIndex <= args.frames; frameIndex += 1) {
    const candidates = deterministicFrameCandidates(baseFrame.candidates, frameIndex);
    const snapshot = voteState.update({
      candidates,
      frameIndex,
    });
    if (snapshot.acceptedCandidate && lockFrame === null) {
      lockFrame = frameIndex;
    }
    frames.push({
      frame_index: frameIndex,
      candidates: candidates.map(candidateForOutput),
      correct_candidate_rank: rankOf(reference.card_id, candidates),
      vote_snapshot: snapshotForOutput(snapshot),
    });
  }

  const finalSnapshot = voteState.snapshot({ frameIndex: args.frames });
  const finalState = finalSnapshot.identityDecisionState;
  const lockedCardId = finalSnapshot.acceptedCandidate;
  const correctLock = lockedCardId === reference.card_id;
  const unifiedCorrectRank = rankOf(reference.card_id, baseFrame.unifiedCandidates);
  const session = {
    generated_at: new Date().toISOString(),
    expected_card_id: reference.card_id,
    expected: referenceForOutput(reference),
    query_artifacts: artifacts,
    crop_types: crops.map((crop) => crop.type),
    reference_count: index.reference_count,
    reference_view_count: index.reference_view_count,
    top_per_crop: args.topPerCrop,
    top_unified: args.topUnified,
    top_output: args.topOutput,
    simulated_frames: args.frames,
    deterministic_augmentation: 'none_repeated_reference_query',
    top_candidates_per_frame: frames.map((frame) => ({
      frame_index: frame.frame_index,
      top_candidates: frame.candidates,
    })),
    correct_candidate_rank_by_frame: frames.map((frame) => frame.correct_candidate_rank),
    frames,
    final_vote_scores: finalSnapshot.rankedCandidates.slice(0, 10).map(recordForOutput),
    final_state: finalState,
    visual_locked_card_id: finalSnapshot.lockedCandidate,
    locked_card_id: lockedCardId,
    correct_lock: correctLock,
    wrong_lock: Boolean(lockedCardId && lockedCardId !== reference.card_id),
    frames_to_lock: lockFrame,
    final_guard_reason: finalSnapshot.identityDecisionReason,
    recall: {
      in_top5: frames.some((frame) => Number.isFinite(frame.correct_candidate_rank) && frame.correct_candidate_rank <= 5),
      in_top10: Number.isFinite(unifiedCorrectRank) && unifiedCorrectRank <= 10,
      in_top50: Number.isFinite(unifiedCorrectRank) && unifiedCorrectRank <= 50,
    },
    crop_results: baseFrame.cropResults.map((cropResult) => ({
      crop_type: cropResult.crop_type,
      embedding_ms: cropResult.embedding_ms,
      correct_rank: cropResult.top_candidates.findIndex((candidate) => candidate.card_id === reference.card_id) + 1 || null,
      top_candidates: cropResult.top_candidates.slice(0, 5),
    })),
    elapsed_ms: round3(performance.now() - startedAt),
  };

  await writeJson(path.join(cardDir, 'session.json'), session);
  return session;
}

async function writeReferenceQueryArtifacts(reference, cardDir) {
  const sourcePath = reference.source_path;
  if (!sourcePath) {
    throw new Error(`scanner_v3_v8_reference_missing_source_path:${reference.card_id}`);
  }
  const sourceBuffer = await readFile(sourcePath);
  const fullCardPath = path.join(cardDir, 'query_normalized_full_card.png');
  const artworkPath = path.join(cardDir, 'query_artwork_region.png');
  const normalizedFull = await sharp(sourceBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: 733,
      height: 1024,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255 },
    })
    .removeAlpha()
    .png()
    .toBuffer();
  const artwork = await extractArtworkRegionBuffer(sourceBuffer);
  await writeFile(fullCardPath, normalizedFull);
  await writeFile(artworkPath, await sharp(artwork, { failOn: 'none' }).rotate().png().toBuffer());
  return {
    source_path: sourcePath,
    fullCardPath,
    artworkPath,
  };
}

async function resolveFrameCandidates({
  crops,
  references,
  model,
  topPerCrop,
  topUnified,
  topRerankInput,
  topOutput,
}) {
  const cropResults = [];
  for (const crop of crops) {
    const embedResult = await embedImageBuffer(crop.buffer, { model });
    const candidates = rankEmbeddingViewCandidates({
      queryEmbedding: embedResult.embedding,
      references,
      topN: topPerCrop,
      queryCropType: crop.type,
    });
    cropResults.push({
      crop_type: crop.type,
      source: crop.source,
      embedding_ms: embedResult.elapsed_ms,
      top_candidates: candidates,
    });
  }

  const unifiedCandidates = unionCandidatesV8({
    cropResults,
    topUnified,
  });
  const reranked = rerankTopCandidatesV8({
    unified: unifiedCandidates,
    topRerankInput,
  });
  return {
    cropResults,
    unifiedCandidates,
    candidates: reranked.slice(0, topOutput),
  };
}

function unionCandidatesV8({ cropResults, topUnified }) {
  const byCard = new Map();
  for (const cropResult of cropResults) {
    for (const candidate of cropResult.top_candidates) {
      const current = byCard.get(candidate.card_id) ?? {
        bestCandidate: candidate,
        bestDistance: candidate.distance,
        bestSimilarity: similarityOf(candidate),
        bestQueryCropType: candidate.query_crop_type ?? cropResult.crop_type,
        bestReferenceViewType: candidate.reference_view_type ?? null,
        rankSignal: 0,
        cropTypes: new Set(),
        referenceViewTypes: new Set(),
      };
      current.cropTypes.add(cropResult.crop_type);
      if (Array.isArray(candidate.contributing_crop_types)) {
        for (const type of candidate.contributing_crop_types) {
          if (type) current.cropTypes.add(type);
        }
      }
      if (candidate.reference_view_type) {
        current.referenceViewTypes.add(candidate.reference_view_type);
      }
      current.rankSignal += 1 / Math.max(1, candidate.rank);
      const candidateSimilarity = similarityOf(candidate);
      if (candidate.distance < current.bestDistance || candidateSimilarity > current.bestSimilarity) {
        current.bestCandidate = candidate;
        current.bestDistance = candidate.distance;
        current.bestSimilarity = Math.max(current.bestSimilarity, candidateSimilarity);
        current.bestQueryCropType = candidate.query_crop_type ?? cropResult.crop_type;
        current.bestReferenceViewType = candidate.reference_view_type ?? null;
      }
      byCard.set(candidate.card_id, current);
    }
  }

  return [...byCard.values()]
    .map((accumulator) => {
      const cropCount = accumulator.cropTypes.size;
      const frequencyBonus = Math.min(0.12, Math.max(0, cropCount - 1) * 0.025);
      const rankConsensusBonus = Math.min(0.08, accumulator.rankSignal * 0.015);
      const aggregateScore = clamp01(accumulator.bestSimilarity + frequencyBonus + rankConsensusBonus);
      return {
        card_id: accumulator.bestCandidate.card_id,
        gv_id: accumulator.bestCandidate.gv_id ?? null,
        name: accumulator.bestCandidate.name ?? null,
        set_code: accumulator.bestCandidate.set_code ?? null,
        number: accumulator.bestCandidate.number ?? null,
        variant_key: accumulator.bestCandidate.variant_key ?? null,
        image_url: accumulator.bestCandidate.image_url ?? null,
        source_path: accumulator.bestCandidate.source_path ?? null,
        distance: round6(accumulator.bestDistance),
        similarity: round6(aggregateScore),
        aggregate_score: round6(aggregateScore),
        crop_contribution_count: cropCount,
        reference_view_contribution_count: accumulator.referenceViewTypes.size,
        best_query_crop_type: accumulator.bestQueryCropType,
        best_reference_view_type: accumulator.bestReferenceViewType,
        contributing_crop_types: [...accumulator.cropTypes].sort(),
      };
    })
    .sort((a, b) => {
      if (a.aggregate_score !== b.aggregate_score) return b.aggregate_score - a.aggregate_score;
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.crop_contribution_count !== b.crop_contribution_count) {
        return b.crop_contribution_count - a.crop_contribution_count;
      }
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topUnified)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

function rerankTopCandidatesV8({ unified, topRerankInput }) {
  const top = unified.slice(0, topRerankInput);
  if (top.length === 0) return [];
  const maxCropCount = Math.max(1, ...top.map((candidate) => candidate.crop_contribution_count ?? 1));
  return top
    .map((candidate) => {
      const aggregate = candidate.aggregate_score ?? similarityOf(candidate);
      const cropScore = clamp01((candidate.crop_contribution_count ?? 1) / maxCropCount);
      const finalScore = clamp01((aggregate * 0.60) + (cropScore * 0.40));
      return {
        ...candidate,
        similarity: round6(finalScore),
        rerank_score: round6(finalScore),
      };
    })
    .sort((a, b) => {
      const aScore = a.rerank_score ?? a.aggregate_score ?? similarityOf(a);
      const bScore = b.rerank_score ?? b.aggregate_score ?? similarityOf(b);
      if (aScore !== bScore) return bScore - aScore;
      if ((a.crop_contribution_count ?? 0) !== (b.crop_contribution_count ?? 0)) {
        return (b.crop_contribution_count ?? 0) - (a.crop_contribution_count ?? 0);
      }
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

function deterministicFrameCandidates(candidates, frameIndex) {
  // No existing deterministic augmentation helper exists for this pipeline.
  // Keep frame input stable so this validates the temporal guard itself.
  return candidates.map((candidate) => ({
    ...candidate,
    rank: candidate.rank,
    frame_index: frameIndex,
  }));
}

class CandidateVoteStateMirror {
  constructor(config = V8_VOTE_GUARD) {
    this.config = config;
    this.scores = new Map();
    this.lockedCandidate = null;
    this.updates = 0;
  }

  update({ candidates, frameIndex }) {
    this.updates += 1;
    this.decayAll();

    const topEvidenceScore = candidates.length === 0 ? 0 : candidateEvidenceScore(candidates[0]);
    const secondEvidenceScore = candidates.length > 1 ? candidateEvidenceScore(candidates[1]) : 0;
    const frameScoreGap = topEvidenceScore > secondEvidenceScore
      ? topEvidenceScore - secondEvidenceScore
      : 0;

    for (const candidate of candidates) {
      const record = this.scores.get(candidate.card_id) ?? newVoteRecord(candidate.card_id);
      const inTopFive = candidate.rank <= 5;
      const rankSignal = 3.0 / (candidate.rank + 1);
      const cropCount = candidate.crop_contribution_count ?? 1;
      const cropConsistencyBoost = Math.min(7, Math.max(0, cropCount - 1)) * 0.12;
      const rerankSignal = clamp01(candidate.rerank_score ?? 0);
      const evidenceScore = candidateEvidenceScore(candidate);
      const reward = rankSignal +
        (inTopFive ? 0.95 : 0.15) +
        cropConsistencyBoost +
        (rerankSignal * 0.35);

      record.score += reward;
      record.occurrences += 1;
      record.lastSeenFrame = frameIndex;
      record.bestRank = record.bestRank == null ? candidate.rank : Math.min(candidate.rank, record.bestRank);
      record.lastDistance = candidate.distance;
      record.lastEvidenceScore = evidenceScore;
      record.bestDistance = record.bestDistance == null ? candidate.distance : Math.min(candidate.distance, record.bestDistance);
      record.bestSimilarity = Math.max(record.bestSimilarity, similarityOf(candidate));
      if (candidate.aggregate_score != null) record.bestAggregateScore = Math.max(record.bestAggregateScore, candidate.aggregate_score);
      if (candidate.rerank_score != null) record.bestRerankScore = Math.max(record.bestRerankScore, candidate.rerank_score);
      if (candidate.rank === 1) {
        record.lastTopOneScoreGap = frameScoreGap;
        record.bestTopOneScoreGap = Math.max(record.bestTopOneScoreGap, frameScoreGap);
      }
      record.bestCropContributionCount = Math.max(record.bestCropContributionCount, cropCount);
      if (inTopFive) {
        record.topFiveOccurrences += 1;
        record.lastTopFiveFrame = frameIndex;
        recordTopFiveFrame(record, frameIndex, this.config.recentFrameWindow);
      }
      this.scores.set(candidate.card_id, record);
    }

    this.removeStale(frameIndex);
    this.tryLock(frameIndex);
    return this.snapshot({ frameIndex });
  }

  snapshot({ frameIndex } = {}) {
    const ranked = [...this.scores.values()].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.topFiveOccurrences !== b.topFiveOccurrences) {
        return b.topFiveOccurrences - a.topFiveOccurrences;
      }
      return String(a.cardId).localeCompare(String(b.cardId));
    });
    const best = ranked[0] ?? null;
    const lockedRecord = this.lockedCandidate == null
      ? null
      : ranked.find((candidate) => candidate.cardId === this.lockedCandidate) ?? null;
    const decisionCandidate = lockedRecord ?? best;
    const topScore = best?.score ?? 0;
    const secondScore = ranked.length > 1 ? ranked[1].score : 0;
    const gap = best == null ? 0 : topScore - secondScore;
    const occurrenceSignal = best == null
      ? 0
      : clamp01(best.topFiveOccurrences / this.config.minTopFiveFramesToLock);
    const gapSignal = clamp01(gap / this.config.lockScoreGap);
    const recentSignal = best == null || frameIndex == null
      ? 0
      : clamp01(recentTopFiveCount(best, frameIndex, this.config.recentFrameWindow) / this.config.minTopFiveFramesToLock);
    const cropSignal = decisionCandidate == null
      ? 0
      : clamp01(decisionCandidate.bestCropContributionCount / this.config.minCropTypesToAccept);
    const distanceSignal = decisionCandidate == null || decisionCandidate.bestDistance == null
      ? 0
      : clamp01((this.config.maxAcceptedDistance - decisionCandidate.bestDistance) / this.config.maxAcceptedDistance);
    const frameGapSignal = decisionCandidate == null
      ? 0
      : clamp01(decisionCandidate.bestTopOneScoreGap / this.config.identityAcceptFrameScoreGap);
    const decision = this.evaluateIdentityDecision({
      candidate: decisionCandidate,
      visualLocked: this.lockedCandidate != null,
      voteGap: gap,
      bestCandidateId: best?.cardId ?? null,
      frameIndex,
    });
    const confidence = decision.acceptedCandidate != null
      ? 1.0
      : clamp01(
        (occurrenceSignal * 0.22) +
        (gapSignal * 0.18) +
        (recentSignal * 0.18) +
        (cropSignal * 0.17) +
        (distanceSignal * 0.15) +
        (frameGapSignal * 0.10),
      );

    return {
      lockedCandidate: this.lockedCandidate,
      acceptedCandidate: decision.acceptedCandidate,
      bestCandidate: best,
      decisionCandidate,
      rankedCandidates: ranked,
      scoreGap: gap,
      topCandidateScore: topScore,
      secondCandidateScore: secondScore,
      candidateFrameScoreGap: decisionCandidate?.bestTopOneScoreGap ?? 0,
      candidateCropSupportCount: decisionCandidate?.bestCropContributionCount ?? 0,
      candidateRecentTopFiveCount: decisionCandidate == null
        ? 0
        : recentTopFiveCount(decisionCandidate, frameIndex, this.config.recentFrameWindow),
      candidateDistance: decisionCandidate?.bestDistance ?? null,
      candidateSimilarity: decisionCandidate?.bestSimilarity ?? null,
      confidence,
      identityDecisionState: decision.state,
      identityDecisionReason: decision.reason,
      updates: this.updates,
    };
  }

  decayAll() {
    for (const record of this.scores.values()) {
      record.score *= this.config.decayFactor;
    }
  }

  removeStale(frameIndex) {
    for (const [id, record] of this.scores.entries()) {
      if (this.lockedCandidate === record.cardId) continue;
      if (frameIndex - record.lastSeenFrame > 16 && record.score < 0.8) {
        this.scores.delete(id);
      }
    }
  }

  tryLock(frameIndex) {
    if (this.lockedCandidate != null) return;
    const ranked = this.snapshot({ frameIndex }).rankedCandidates;
    if (ranked.length === 0) return;
    const best = ranked[0];
    const secondScore = ranked.length > 1 ? ranked[1].score : 0;
    const gap = best.score - secondScore;
    const stableRecent = recentTopFiveCount(best, frameIndex, this.config.recentFrameWindow) >= this.config.minTopFiveFramesToLock;
    const stableCrops = best.bestCropContributionCount >= this.config.minCropTypesToLock;
    const scoreReady = best.score > this.config.minScoreThreshold;
    if (
      best.topFiveOccurrences >= this.config.minTopFiveFramesToLock &&
      gap >= this.config.lockScoreGap &&
      stableRecent &&
      stableCrops &&
      scoreReady
    ) {
      this.lockedCandidate = best.cardId;
    }
  }

  evaluateIdentityDecision({
    candidate,
    visualLocked,
    voteGap,
    bestCandidateId,
    frameIndex,
  }) {
    if (candidate == null) {
      return {
        state: 'scanning',
        reason: 'no_candidates',
        acceptedCandidate: null,
      };
    }

    const recentCount = recentTopFiveCount(candidate, frameIndex, this.config.recentFrameWindow);
    if (!visualLocked) {
      if (
        candidate.topFiveOccurrences < this.config.minTopFiveFramesToLock ||
        recentCount < this.config.minRecentTopFiveFramesToAccept
      ) {
        return {
          state: 'candidate_unstable',
          reason: `visual_convergence_pending:top5=${candidate.topFiveOccurrences};recent=${recentCount}`,
          acceptedCandidate: null,
        };
      }
      if (candidate.score <= this.config.minScoreThreshold) {
        return {
          state: 'candidate_unstable',
          reason: `visual_convergence_pending:top1_score=${candidate.score.toFixed(2)}`,
          acceptedCandidate: null,
        };
      }
      if (candidate.bestCropContributionCount < this.config.minCropTypesToLock) {
        return {
          state: 'candidate_unknown',
          reason: `visual_convergence_pending:crop_support=${candidate.bestCropContributionCount}`,
          acceptedCandidate: null,
        };
      }
      if (voteGap < this.config.lockScoreGap) {
        return {
          state: 'candidate_ambiguous',
          reason: `visual_convergence_pending:vote_gap=${voteGap.toFixed(2)}`,
          acceptedCandidate: null,
        };
      }
      return {
        state: 'candidate_unstable',
        reason: 'visual_convergence_pending',
        acceptedCandidate: null,
      };
    }

    const failures = [];
    let failureState = 'candidate_unstable';
    if (bestCandidateId != null && bestCandidateId !== candidate.cardId) {
      failures.push(`visual_lock_not_top_vote:${bestCandidateId}`);
      failureState = 'candidate_ambiguous';
    }
    if (candidate.topFiveOccurrences < this.config.minTopFiveFramesToLock) {
      failures.push(`top5_frames_below_min:${candidate.topFiveOccurrences}`);
      failureState = 'candidate_unstable';
    }
    if (recentCount < this.config.minRecentTopFiveFramesToAccept) {
      failures.push(`recent_support_below_min:${recentCount}`);
      failureState = 'candidate_unstable';
    }
    if (candidate.bestCropContributionCount < this.config.minCropTypesToAccept) {
      failures.push(`crop_support_below_min:${candidate.bestCropContributionCount}`);
      failureState = 'candidate_unknown';
    }
    if (candidate.bestDistance == null) {
      failures.push('distance_missing');
      failureState = 'candidate_unknown';
    } else if (candidate.bestDistance > this.config.maxAcceptedDistance) {
      failures.push(`distance_above_threshold:${candidate.bestDistance.toFixed(3)}`);
      failureState = 'candidate_unknown';
    }
    if (voteGap < this.config.identityAcceptScoreGap) {
      failures.push(`vote_gap_below_guard:${voteGap.toFixed(2)}`);
      if (failureState !== 'candidate_unknown') failureState = 'candidate_ambiguous';
    }
    if (candidate.score <= this.config.minScoreThreshold) {
      failures.push(`top1_score_below_min:${candidate.score.toFixed(2)}`);
      failureState = 'candidate_unstable';
    }
    if (failures.length > 0) {
      return {
        state: failureState,
        reason: failures.join(','),
        acceptedCandidate: null,
      };
    }
    return {
      state: 'identity_locked',
      reason: 'confidence_guard_passed',
      acceptedCandidate: candidate.cardId,
    };
  }
}

function newVoteRecord(cardId) {
  return {
    cardId,
    score: 0,
    occurrences: 0,
    topFiveOccurrences: 0,
    lastSeenFrame: 0,
    lastTopFiveFrame: 0,
    bestRank: null,
    lastDistance: null,
    bestDistance: null,
    lastEvidenceScore: 0,
    bestSimilarity: 0,
    bestAggregateScore: 0,
    bestRerankScore: 0,
    lastTopOneScoreGap: 0,
    bestTopOneScoreGap: 0,
    bestCropContributionCount: 0,
    recentTopFiveFrames: [],
  };
}

function recordTopFiveFrame(record, frameIndex, window) {
  if (record.recentTopFiveFrames.length === 0 || record.recentTopFiveFrames.at(-1) !== frameIndex) {
    record.recentTopFiveFrames.push(frameIndex);
  }
  record.recentTopFiveFrames = record.recentTopFiveFrames.filter((seenFrame) => frameIndex - seenFrame <= window);
}

function recentTopFiveCount(record, frameIndex, window) {
  if (frameIndex == null) return 0;
  return record.recentTopFiveFrames.filter((seenFrame) => frameIndex - seenFrame <= window).length;
}

function candidateEvidenceScore(candidate) {
  return clamp01(candidate.rerank_score ?? candidate.aggregate_score ?? similarityOf(candidate));
}

function buildSummary({
  sessions,
  index,
  outputDir,
  indexCachePath,
  args,
}) {
  const correctLocks = sessions.filter((session) => session.correct_lock);
  const wrongLocks = sessions.filter((session) => session.wrong_lock);
  const unknownOrAmbiguous = sessions.filter((session) => (
    session.final_state === 'candidate_unknown' ||
    session.final_state === 'candidate_ambiguous'
  ));
  const lockedFrames = sessions
    .map((session) => session.frames_to_lock)
    .filter(Number.isFinite);
  const guardReasonCounts = countBy(sessions.map((session) => session.final_guard_reason));
  const recallAt = (k) => round6(
    sessions.filter((session) => session.correct_candidate_rank_by_frame.some((rank) => Number.isFinite(rank) && rank <= k)).length /
    Math.max(1, sessions.length),
  );

  return {
    generated_at: new Date().toISOString(),
    output_dir: outputDir,
    index_cache_path: indexCachePath,
    proof_only: true,
    app_runtime_modified: false,
    scanner_detector_modified: false,
    embedding_model: index.model,
    reference_count: index.reference_count,
    reference_view_count: index.reference_view_count,
    tested_count: sessions.length,
    selected_card_ids: sessions.map((session) => session.expected_card_id),
    simulated_frames_per_card: args.frames,
    vote_guard: V8_VOTE_GUARD,
    crop_generator: MULTICROP_GENERATOR_V1.name,
    query_crop_types: MULTICROP_GENERATOR_V1.query_crop_types,
    reference_view_types: MULTICROP_GENERATOR_V1.reference_view_types,
    correct_locks: correctLocks.length,
    wrong_locks: wrongLocks.length,
    unknown_ambiguous_count: unknownOrAmbiguous.length,
    unstable_count: sessions.filter((session) => session.final_state === 'candidate_unstable').length,
    average_frames_to_lock: average(lockedFrames),
    recall_at_5: recallAt(5),
    recall_at_10: recallAt(10),
    recall_at_50: recallAt(50),
    guard_pass_fail_reasons: guardReasonCounts,
    examples_correct_locks: correctLocks.slice(0, 5).map(sessionSummary),
    examples_wrong_locks: wrongLocks.slice(0, 5).map(sessionSummary),
    examples_blocked_locks: unknownOrAmbiguous.slice(0, 5).map(sessionSummary),
    v8_guard_assessment: wrongLocks.length > 0
      ? 'too_loose'
      : correctLocks.length >= Math.ceil(sessions.length * 0.8)
        ? 'acceptable'
        : 'too_strict_for_known_reference_queries',
    next_blocker: wrongLocks.length > 0
      ? 'guard allowed wrong known-reference lock; inspect scoring and reject thresholds before more live tests'
      : correctLocks.length === sessions.length
        ? 'move from self-reference validation to real captured known in-index cards'
        : 'guard blocks some known references; inspect blocked session files before changing thresholds',
  };
}

function sessionSummary(session) {
  return {
    expected_card_id: session.expected_card_id,
    expected_name: session.expected.name,
    expected_set_code: session.expected.set_code,
    expected_number: session.expected.number,
    final_state: session.final_state,
    locked_card_id: session.locked_card_id,
    correct_lock: session.correct_lock,
    frames_to_lock: session.frames_to_lock,
    final_guard_reason: session.final_guard_reason,
    first_frame_correct_rank: session.correct_candidate_rank_by_frame[0],
    final_top_candidate: session.final_vote_scores[0] ?? null,
  };
}

function selectReferences(references, { limit, cardIds }) {
  const withImages = references.filter((reference) => reference.source_path);
  if (cardIds.length > 0) {
    const wanted = new Set(cardIds);
    return withImages.filter((reference) => wanted.has(reference.card_id)).slice(0, limit);
  }

  const groups = new Map();
  for (const reference of withImages) {
    const key = reference.set_code || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(reference);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => compareReferenceOrder(a, b));
  }

  const selected = [];
  const groupKeys = [...groups.keys()].sort();
  while (selected.length < limit) {
    let added = false;
    for (const key of groupKeys) {
      const group = groups.get(key);
      if (!group || group.length === 0) continue;
      const next = group.shift();
      if (!selected.some((reference) => reference.card_id === next.card_id)) {
        selected.push(next);
        added = true;
        if (selected.length >= limit) break;
      }
    }
    if (!added) break;
  }

  if (selected.length < limit) {
    for (const reference of withImages.sort((a, b) => compareReferenceOrder(a, b))) {
      if (selected.some((item) => item.card_id === reference.card_id)) continue;
      selected.push(reference);
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

function compareReferenceOrder(a, b) {
  const setCompare = String(a.set_code ?? '').localeCompare(String(b.set_code ?? ''));
  if (setCompare !== 0) return setCompare;
  const numberCompare = naturalNumberKey(a.number).localeCompare(naturalNumberKey(b.number));
  if (numberCompare !== 0) return numberCompare;
  const nameCompare = String(a.name ?? '').localeCompare(String(b.name ?? ''));
  if (nameCompare !== 0) return nameCompare;
  return String(a.card_id).localeCompare(String(b.card_id));
}

function naturalNumberKey(value) {
  const text = String(value ?? '');
  const number = Number.parseInt(text.match(/\d+/)?.[0] ?? '999999', 10);
  return `${String(number).padStart(6, '0')}:${text}`;
}

function normalizeIndex(parsed) {
  const references = Array.isArray(parsed.references) ? parsed.references : [];
  const referenceViewCount = references.reduce((sum, reference) => sum + (reference.views?.length ?? 0), 0);
  return {
    version: parsed.version ?? 'unknown',
    source: parsed.source ?? null,
    model: parsed.model ?? EMBEDDING_INDEX_V1.model,
    dimensions: parsed.dimensions ?? EMBEDDING_INDEX_V1.dimensions,
    reference_count: references.length,
    reference_view_count: referenceViewCount,
    references,
  };
}

function referenceForOutput(reference) {
  return {
    card_id: reference.card_id,
    gv_id: reference.gv_id ?? null,
    name: reference.name ?? null,
    set_code: reference.set_code ?? null,
    number: reference.number ?? null,
    variant_key: reference.variant_key ?? null,
    image_url: reference.image_url ?? null,
    source_path: reference.source_path ?? null,
  };
}

function candidateForOutput(candidate) {
  return {
    card_id: candidate.card_id,
    gv_id: candidate.gv_id ?? null,
    name: candidate.name ?? null,
    set_code: candidate.set_code ?? null,
    number: candidate.number ?? null,
    rank: candidate.rank,
    distance: candidate.distance,
    similarity: similarityOf(candidate),
    aggregate_score: candidate.aggregate_score ?? null,
    rerank_score: candidate.rerank_score ?? null,
    crop_contribution_count: candidate.crop_contribution_count ?? null,
    reference_view_contribution_count: candidate.reference_view_contribution_count ?? null,
    best_query_crop_type: candidate.best_query_crop_type ?? null,
    best_reference_view_type: candidate.best_reference_view_type ?? null,
  };
}

function snapshotForOutput(snapshot) {
  return {
    locked_candidate: snapshot.lockedCandidate,
    accepted_candidate: snapshot.acceptedCandidate,
    best_candidate: snapshot.bestCandidate?.cardId ?? null,
    decision_candidate: snapshot.decisionCandidate?.cardId ?? null,
    score_gap: round6(snapshot.scoreGap),
    top_candidate_score: round6(snapshot.topCandidateScore),
    second_candidate_score: round6(snapshot.secondCandidateScore),
    candidate_frame_score_gap: round6(snapshot.candidateFrameScoreGap),
    candidate_crop_support_count: snapshot.candidateCropSupportCount,
    candidate_recent_top5_count: snapshot.candidateRecentTopFiveCount,
    candidate_distance: snapshot.candidateDistance == null ? null : round6(snapshot.candidateDistance),
    candidate_similarity: snapshot.candidateSimilarity == null ? null : round6(snapshot.candidateSimilarity),
    confidence: round6(snapshot.confidence),
    identity_decision_state: snapshot.identityDecisionState,
    identity_decision_reason: snapshot.identityDecisionReason,
    ranked_candidates: snapshot.rankedCandidates.slice(0, 10).map(recordForOutput),
  };
}

function recordForOutput(record) {
  return {
    card_id: record.cardId,
    score: round6(record.score),
    occurrences: record.occurrences,
    top_five_occurrences: record.topFiveOccurrences,
    recent_top_five_count: record.recentTopFiveFrames.length,
    best_rank: record.bestRank,
    best_distance: record.bestDistance == null ? null : round6(record.bestDistance),
    best_similarity: round6(record.bestSimilarity),
    best_aggregate_score: round6(record.bestAggregateScore),
    best_rerank_score: round6(record.bestRerankScore),
    best_top_one_score_gap: round6(record.bestTopOneScoreGap),
    best_crop_contribution_count: record.bestCropContributionCount,
  };
}

function rankOf(cardId, candidates) {
  const index = candidates.findIndex((candidate) => candidate.card_id === cardId);
  return index < 0 ? null : index + 1;
}

function similarityOf(candidate) {
  return clamp01(candidate.similarity ?? (1 - candidate.distance));
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = String(value ?? 'none');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return round6(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
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
