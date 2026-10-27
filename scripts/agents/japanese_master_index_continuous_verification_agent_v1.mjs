#!/usr/bin/env node

import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const ROOT = process.cwd();
const DEFAULT_SOURCES = [
  'tcgdex_ja_cards',
  'limitless_jp_cards',
  'artofpkm_jp_cards',
  'serebii_jp_cards',
  'official_jp_cards',
  'bulbapedia_jp_card_lists',
  'pokeguardian_release_reports',
];
const SOURCES = (process.env.JPN_VERIFY_SOURCES
  || process.env.JPN_VERIFY_SOURCE
  || DEFAULT_SOURCES.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const PROGRESS_PATH = process.env.RUFLO_PROGRESS_FILE
  || path.join(ROOT, 'docs', 'audits', 'ruflo_notifications', 'progress.jsonl');
const REPORT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'japanese_master_index_v4',
  'continuous_verification',
);
const CURSOR_PATH = path.join(REPORT_DIR, 'container_cursors_v1.json');
const ASSERTION_ARTIFACTS = {
  artofpkm_jp_cards: 'artofpkm_jp_card_assertions_v1',
  limitless_jp_cards: 'limitless_jp_card_assertions_v1',
  official_jp_cards: 'official_jp_card_assertions_v1',
  serebii_jp_cards: 'serebii_jp_card_assertions_v1',
  tcgdex_ja_cards: 'tcgdex_ja_card_assertions_v1',
  bulbapedia_jp_card_lists: 'bulbapedia_jp_card_assertions_v1',
  pokeguardian_release_reports: 'pokeguardian_jp_card_assertions_v1',
};

function emit(event) {
  mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
  appendFileSync(PROGRESS_PATH, `${JSON.stringify({
    timestamp: new Date().toISOString(),
    agent_id: 'JPN-MASTER-INDEX-CONTINUOUS-VERIFICATION-AGENT-V1',
    sources: SOURCES,
    ...event,
  })}\n`);
}

function run(command, args) {
  emit({ status: 'started', step: command });
  execFileSync(process.execPath, ['--use-system-ca', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  emit({ status: 'completed', step: command });
}

function readCursors() {
  try {
    return JSON.parse(readFileSync(CURSOR_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeCursor(source, value) {
  const cursors = readCursors();
  cursors[source] = value;
  writeFileSync(CURSOR_PATH, `${JSON.stringify(cursors, null, 2)}\n`);
}

function packageFreshAssertions(source) {
  const stem = ASSERTION_ARTIFACTS[source];
  if (!stem) return;
  const jsonPath = path.join(
    ROOT,
    'docs', 'audits', 'japanese_master_index_v4', 'cards', `${stem}.json`,
  );
  const gzipPath = `${jsonPath}.gz`;
  const raw = readFileSync(jsonPath);
  writeFileSync(gzipPath, gzipSync(raw, { level: 9 }));
  emit({ status: 'completed', step: `package_assertions:${source}`, artifact: path.relative(ROOT, gzipPath).replaceAll('\\', '/') });
}

mkdirSync(REPORT_DIR, { recursive: true });
const startedAt = new Date().toISOString();
emit({ status: 'running', started_at: startedAt, safety: 'read_only_no_promotion' });

try {
  const liveRecheckRoot = path.join(
    'docs',
    'audits',
    'japanese_master_index_v4',
    'continuous_verification',
    'live_recheck',
  );
  let liveBaselineAvailable = true;
  try {
    run('fresh_live_read_only_baseline', [
      'scripts/audits/japanese_master_index_v4/baseline_export_v1.mjs',
      `--output-root=${liveRecheckRoot}`,
    ]);
  } catch (error) {
    liveBaselineAvailable = false;
    emit({
      status: 'deferred',
      step: 'fresh_live_read_only_baseline',
      reason: 'database_unreachable_or_read_only_baseline_unavailable',
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const cursors = readCursors();
  for (const source of SOURCES) {
    const offset = Number.isInteger(cursors[source]) ? cursors[source] : 0;
    run(`card_harvest:${source}`, [
      'scripts/audits/japanese_master_index_v4/card_acquisition_harvest_v1.mjs',
      '--source', source,
      '--resume',
      '--max-containers', '10',
      '--container-offset', String(offset),
      '--source-timeout-seconds', '30',
      '--source-retry-count', '0',
    ]);
    packageFreshAssertions(source);
    writeCursor(source, offset + 10);
  }
  run('candidate_union', [
    'scripts/audits/japanese_master_index_v4/candidate_union_v1.mjs',
  ]);
  run('coverage', [
    'scripts/audits/japanese_master_index_v4/coverage_gap_report_v1.mjs',
  ]);
  run('strict_admission', [
    'scripts/audits/japanese_master_index_v4/final_admission_v1.mjs',
  ]);
  run('complete_adjudication', [
    'scripts/audits/japanese_master_index_v4/complete_adjudication_v1.mjs',
  ]);
  run('promotion_package', [
    'scripts/audits/japanese_master_index_v4/promotion_package_v1.mjs',
  ]);
  if (liveBaselineAvailable) {
    run('finalize_no_write', [
      'scripts/audits/japanese_master_index_v4/finalize_v1.mjs',
      `--live-recheck-root=${liveRecheckRoot}`,
    ]);
  } else {
    emit({
      status: 'deferred',
      step: 'finalize_no_write',
      reason: 'waiting_for_live_read_only_baseline',
    });
  }

  const report = {
    package_id: 'JPN-MASTER-INDEX-CONTINUOUS-VERIFICATION-AGENT-V1',
    generated_at: new Date().toISOString(),
    sources: SOURCES,
    status: liveBaselineAvailable
      ? 'completed_no_write'
      : 'completed_evidence_only_waiting_for_baseline',
    proof_policy: 'two_independent_verified_proofs_required_before_promotion',
    production_writes: false,
    promotion_writes: false,
    next_run_required: true,
    live_baseline_available: liveBaselineAvailable,
  };
  const output = path.join(REPORT_DIR, 'latest_progress_v1.json');
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  emit({ status: report.status, report_path: path.relative(ROOT, output).replaceAll('\\', '/') });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = {
    package_id: 'JPN-MASTER-INDEX-CONTINUOUS-VERIFICATION-AGENT-V1',
    generated_at: new Date().toISOString(),
    sources: SOURCES,
    status: 'blocked_fail_closed',
    production_writes: false,
    promotion_writes: false,
    error: error instanceof Error ? error.message : String(error),
  };
  const output = path.join(REPORT_DIR, 'latest_progress_v1.json');
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  emit({ status: report.status, error: report.error, report_path: path.relative(ROOT, output).replaceAll('\\', '/') });
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
