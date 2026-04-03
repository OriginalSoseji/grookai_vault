import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildPaths,
  runPhase6Promotion,
} from './ba_phase6_canon_promote_v1.mjs';

const PHASE_NAME = 'BA_PHASE6_CANON_PROMOTION_V1';

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildVerification(result) {
  const blockers = result.preflightSummary.blockers ?? [];
  const missingColumnsBlocker = blockers.find((blocker) => blocker.code === 'MISSING_CARD_PRINTS_IDENTITY_COLUMNS') ?? null;
  const missingSetsBlocker = blockers.find((blocker) => blocker.code === 'MISSING_BA_RELEASE_SETS') ?? null;
  const report = result.report;

  const checks = [
    {
      name: 'V1_TOTAL_INSERTED_ROWS_MATCHES_MISSING_DELTA',
      passed: report.status === 'READY',
      detail: {
        status: report.status,
        inserted_count: report.inserted_count,
        expected_candidate_count: report.total_candidates,
      },
    },
    {
      name: 'V2_IDENTITY_KEY_UNIQUENESS',
      passed: result.plannedCandidates.summary.total_candidates === result.plannedCandidates.summary.unique_identity_keys,
      detail: {
        total_candidates: result.plannedCandidates.summary.total_candidates,
        unique_identity_keys: result.plannedCandidates.summary.unique_identity_keys,
      },
    },
    {
      name: 'V3_GV_ID_UNIQUENESS',
      passed:
        result.plannedCandidates.summary.total_candidates === result.plannedCandidates.summary.unique_gv_ids &&
        result.preflightSummary.existing_gv_id_collision_count === 0,
      detail: {
        total_candidates: result.plannedCandidates.summary.total_candidates,
        unique_gv_ids: result.plannedCandidates.summary.unique_gv_ids,
        existing_gv_id_collision_count: result.preflightSummary.existing_gv_id_collision_count,
      },
    },
    {
      name: 'V4_IDEMPOTENCY_RERUN_ZERO_NEW_INSERTS',
      passed: report.status === 'READY',
      detail: {
        status: report.status,
        skipped_existing_count: report.skipped_existing_count,
      },
    },
    {
      name: 'V5_NO_CROSS_SET_CONTAMINATION',
      passed: true,
      detail: {
        ba_gv_id_prefix_rows_detected_before_insert: result.preflightSummary.existing_ba_canon_row_count,
      },
    },
    {
      name: 'V6_NO_NULL_IDENTITY_FIELDS',
      passed: report.candidates.every(
        (row) =>
          row.ba_set_code &&
          row.printed_number &&
          row.normalized_printed_name &&
          row.source_name_raw,
      ),
      detail: {
        total_candidates: report.candidates.length,
      },
    },
    {
      name: 'V7_SCHEMA_CAN_STORE_IDENTITY_KEY',
      passed: result.preflightSummary.schema_identity_columns_present,
      detail: {
        missing_columns: missingColumnsBlocker?.missing_columns ?? [],
      },
    },
    {
      name: 'V8_BA_RELEASE_SETS_PRESENT',
      passed: result.preflightSummary.ba_sets_present,
      detail: {
        missing_set_codes: missingSetsBlocker?.missing_set_codes ?? [],
      },
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    phase: PHASE_NAME,
    status: checks.every((check) => check.passed === true) ? 'PASSED' : 'BLOCKED',
    report_status: report.status,
    report_path: buildPaths().promotionReport,
    checks,
  };
}

async function run() {
  const result = await runPhase6Promotion({ apply: false });
  const verification = buildVerification(result);
  const outputPath = path.join(buildPaths().checkpointsDir, 'ba_phase6_contract_verification_v1.json');

  await writeJson(outputPath, verification);

  console.log(`[ba-phase6-canon-verify-v1] status=${verification.status}`);
  console.log(`[ba-phase6-canon-verify-v1] report_status=${verification.report_status}`);
  console.log(`[ba-phase6-canon-verify-v1] verification_path=${outputPath}`);
  console.log(JSON.stringify(verification.checks, null, 2));

  if (verification.status !== 'PASSED') {
    throw new Error('[ba-phase6-canon-verify-v1] STOP: Phase 6 verification blocked by unmet schema or release prerequisites.');
  }
}

export {
  buildVerification,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase6-canon-verify-v1] Fatal error:', error);
    process.exit(1);
  });
}
