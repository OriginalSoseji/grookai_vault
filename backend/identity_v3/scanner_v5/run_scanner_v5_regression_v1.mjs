import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { rectifyCardStillBuffer } from './rectify_card_still_v1.mjs';
import { ocrCardNumberBuffer } from './ocr_card_number_v1.mjs';
import {
  embedAndSearchFullCard,
  loadScannerV5Artifact,
} from './scanner_v5_artifact_v1.mjs';

const DEFAULT_CASES = 'backend/identity_v3/scanner_v5/scanner_v5_regression_cases_v1.json';
const DEFAULT_ARTIFACT = '.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1';
const DEFAULT_OUT = '.tmp/scanner_v5_regression_v1/latest.json';
const GATES = {
  top1: 0.85,
  top3: 0.95,
  ocrP50Ms: 1000,
  embeddingP50Ms: 2000,
};

function parseArgs(argv) {
  const args = {
    cases: DEFAULT_CASES,
    artifactDir: process.env.SCANNER_V5_ARTIFACT_DIR || DEFAULT_ARTIFACT,
    out: DEFAULT_OUT,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inline] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const next = () => {
      if (inline !== null) return inline;
      i += 1;
      return argv[i] ?? '';
    };
    if (name === '--cases') args.cases = next() || DEFAULT_CASES;
    else if (name === '--artifact-dir') args.artifactDir = next() || DEFAULT_ARTIFACT;
    else if (name === '--out') args.out = next() || DEFAULT_OUT;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = JSON.parse(await readFile(args.cases, 'utf8'));
  const artifact = await loadScannerV5Artifact(args.artifactDir);
  const rows = [];
  for (const testCase of cases) {
    if (!existsSync(testCase.image)) {
      rows.push({
        id: testCase.id,
        skipped: true,
        reason: 'fixture_missing',
        expected_gv_id: testCase.expected_gv_id,
      });
      continue;
    }
    rows.push(await runCase({ testCase, artifact, artifactDir: args.artifactDir }));
  }
  const activeRows = rows.filter((row) => !row.skipped && !row.optional);
  const scoredRows = activeRows.length === 0
    ? rows.filter((row) => !row.skipped)
    : activeRows;
  const top1 = ratio(scoredRows.filter((row) => row.true_rank === 1).length, scoredRows.length);
  const top3 = ratio(scoredRows.filter((row) => row.true_rank != null && row.true_rank <= 3).length, scoredRows.length);
  const ocrP50 = percentile(scoredRows.map((row) => row.latency_ms?.ocr_ms).filter(Number.isFinite), 0.5);
  const embeddingP50 = percentile(scoredRows.map((row) => row.latency_ms?.embedding_ms).filter(Number.isFinite), 0.5);
  const summary = {
    generated_at: new Date().toISOString(),
    gates: GATES,
    case_count: cases.length,
    scored_case_count: scoredRows.length,
    skipped_count: rows.filter((row) => row.skipped).length,
    top1,
    top3,
    ocr_p50_ms: ocrP50,
    embedding_p50_ms: embeddingP50,
    pass:
      scoredRows.length > 0 &&
      top1 >= GATES.top1 &&
      top3 >= GATES.top3 &&
      (ocrP50 == null || ocrP50 <= GATES.ocrP50Ms) &&
      (embeddingP50 == null || embeddingP50 <= GATES.embeddingP50Ms),
  };
  const report = { summary, rows };
  await mkdir(path.dirname(args.out), { recursive: true });
  await writeFile(args.out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!summary.pass) process.exitCode = 1;
}

async function runCase({ testCase, artifact, artifactDir }) {
  const startedAt = performance.now();
  const input = await readFile(testCase.image);
  const rectifyStartedAt = performance.now();
  const rectified = await rectifyCardStillBuffer(input, { sourcePath: testCase.image });
  const rectifyMs = roundMs(performance.now() - rectifyStartedAt);
  const ocrStartedAt = performance.now();
  const ocr = await ocrCardNumberBuffer(rectified.png, {
    artifact,
    artifactDir,
    sourcePath: testCase.image,
  });
  const ocrMs = roundMs(performance.now() - ocrStartedAt);
  const embedding = await embedAndSearchFullCard({
    imageBuffer: rectified.png,
    artifact,
    topK: 10,
  });
  const fused = fuseCandidates(ocr.matches, embedding.candidates);
  const trueRank = rankOf(fused, testCase.expected_gv_id);
  return {
    id: testCase.id,
    label: testCase.label ?? null,
    optional: testCase.optional === true,
    image: testCase.image,
    expected_gv_id: testCase.expected_gv_id,
    mode: modeFor(ocr.matches, embedding.candidates),
    true_rank: trueRank,
    latency_ms: {
      rectify_ms: rectifyMs,
      ocr_ms: ocrMs,
      embedding_ms: embedding.embedding_ms,
      total_ms: roundMs(performance.now() - startedAt),
    },
    top_candidates: fused.slice(0, 5),
  };
}

function fuseCandidates(ocrMatches, embeddingCandidates) {
  const rows = [];
  const seen = new Set();
  for (const row of [...(ocrMatches ?? []), ...(embeddingCandidates ?? [])]) {
    const id = row.gv_id ?? row.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      name: row.name ?? null,
      set: row.set ?? row.set_code ?? null,
      number: row.number ?? null,
      distance: row.distance ?? null,
    });
  }
  return rows;
}

function modeFor(ocrMatches, embeddingCandidates) {
  if ((ocrMatches?.length ?? 0) === 1) return 'ocr_exact';
  if ((ocrMatches?.length ?? 0) > 1) return 'fused';
  if ((embeddingCandidates?.length ?? 0) > 0) return 'embedding_only';
  return 'unreadable';
}

function rankOf(candidates, expectedGvId) {
  const expected = String(expectedGvId ?? '').trim().toUpperCase();
  const index = candidates.findIndex((row) => String(row.id ?? row.gv_id ?? '').toUpperCase() === expected);
  return index < 0 ? null : index + 1;
}

function ratio(count, total) {
  return total <= 0 ? 0 : Math.round((count / total) * 10000) / 10000;
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function roundMs(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
