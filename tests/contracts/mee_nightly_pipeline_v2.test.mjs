import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findFrozenDryRunPlanForCursorV2,
  pipelineStateIsResumableV2,
  phaseReportSupportsResumeV2,
  selectFrozenDryRunPathV2,
  shouldSkipZeroResultDownstreamV2,
  successfulZeroResultFetchStateV2,
  validateFrozenDryRunPlanV2,
} from "../../scripts/workers/market_listing_nightly_pipeline_v2.mjs";
import {
  buildMarketListingAcquisitionDryRunPlanV1,
} from "../../backend/pricing/market_listing_acquisition_dry_run_plan_v1.mjs";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("V2 pipeline uses exact artifact handoffs and run-scoped projection", () => {
  const script = read("scripts/workers/market_listing_nightly_pipeline_v2.mjs");
  assert.match(script, /--dry-run=\$\{artifactFrom\(state, "dry_run_plan"\)\}/);
  assert.match(script, /--batch-plan=\$\{artifactFrom\(state, "daily_batch_plan"\)\}/);
  assert.match(script, /--fetch=\$\{artifactFrom\(state, "daily_batch_fetch"\)\}/);
  assert.match(script, /--plan=\$\{artifactFrom\(state, "daily_batch_backfill_plan"\)\}/);
  assert.match(script, /source_acquisition_run/);
  assert.match(script, /provider phase was already attempted.*refusing to refetch/);
  assert.match(script, /provider phase previously failed.*refusing to refetch automatically/);
  assert.match(script, /provider phase attempt was recorded without a final local result/);
  assert.match(script, /ledger_status:\s*"started"/);
  assert.match(script, /latestUnfinishedPipeline/);
  assert.match(script, /cursor_recorded/);
  assert.match(script, /--run-key=\$\{acquisitionRunKey\(\)\}/);
  assert.match(script, /phaseReportSupportsResumeV2/);
  assert.match(script, /--frozen-dry-run=/);
  assert.match(script, /--frozen-dry-run-if-incomplete=/);
  assert.match(script, /frozen dry-run plan must be inside the governed MEE artifact root/);
});

test("V2 persists a successful zero-result receipt and skips data-dependent phases", () => {
  const state = {
    phases: {
      daily_batch_fetch: {
        status: 0,
        child_output: {
          summary: {
            successful_zero_result: true,
            acquisition_outcome: "fetched_success_no_results",
          },
        },
      },
      daily_batch_backfill_apply: { status: 0 },
    },
  };

  assert.equal(successfulZeroResultFetchStateV2(state), true);
  assert.equal(shouldSkipZeroResultDownstreamV2({ state, phaseKey: "card_candidate_rollup_plan" }), true);
  assert.equal(shouldSkipZeroResultDownstreamV2({ state, phaseKey: "run_scoped_readback" }), true);
  assert.equal(shouldSkipZeroResultDownstreamV2({ state, phaseKey: "daily_batch_backfill_apply" }), false);
  assert.equal(successfulZeroResultFetchStateV2({
    phases: {
      daily_batch_fetch: {
        status: 0,
        child_output: { summary: { successful_zero_result: true, acquisition_outcome: "fetched_success" } },
      },
    },
  }), false);
});

test("V2 conditionally selects a frozen plan only for an incomplete cursor", () => {
  assert.equal(selectFrozenDryRunPathV2({
    conditionalPath: "/audit/original-plan.json",
    previousCursor: { cycle_complete: false },
  }), "/audit/original-plan.json");
  assert.equal(selectFrozenDryRunPathV2({
    conditionalPath: "/audit/original-plan.json",
    previousCursor: { cycle_complete: true },
  }), null);
  assert.equal(selectFrozenDryRunPathV2({
    conditionalPath: "/audit/original-plan.json",
    previousCursor: null,
  }), null);
  assert.equal(selectFrozenDryRunPathV2({
    strictPath: "/audit/strict-plan.json",
    previousCursor: { cycle_complete: true },
  }), "/audit/strict-plan.json");
  assert.throws(() => selectFrozenDryRunPathV2({
    strictPath: "/audit/strict-plan.json",
    conditionalPath: "/audit/original-plan.json",
    previousCursor: { cycle_complete: false },
  }), /cannot be used together/);
});

test("V2 auto recovery resolves the preserved plan matching the incomplete cursor", () => {
  const auditRoot = mkdtempSync(path.join(os.tmpdir(), "mee-frozen-plan-auto-"));
  try {
    const target = (id, name) => ({
      card_print_id: `00000000-0000-0000-0000-${id.padStart(12, "0")}`,
      card_printing_id: `10000000-0000-0000-0000-${id.padStart(12, "0")}`,
      gv_id: `GV-TEST-${id}`,
      printing_gv_id: `GV-TEST-${id}-HOLO`,
      name,
      set_code: "test",
      finish_key: "holo",
      ebay_query_text: `Pokemon ${name} holo`,
      acquisition_priority: "priority_variant_finish",
    });
    const matchingPlan = buildMarketListingAcquisitionDryRunPlanV1({
      targets: [target("1", "Test Card")],
      setShelfPageBudget: 0,
    });
    const unrelatedPlan = buildMarketListingAcquisitionDryRunPlanV1({
      targets: [target("2", "Other Card")],
      setShelfPageBudget: 0,
    });
    const matchingPath = path.join(
      auditRoot,
      "mee_11d_market_listing_acquisition_dry_run_plan_2026-08-10T00-00-00-000Z.json",
    );
    writeFileSync(matchingPath, `${JSON.stringify(matchingPlan)}\n`);
    writeFileSync(
      path.join(auditRoot, "mee_11d_market_listing_acquisition_dry_run_plan_2026-08-09T00-00-00-000Z.json"),
      `${JSON.stringify(unrelatedPlan)}\n`,
    );

    const previousCursor = {
      cycle_complete: false,
      source_manifest_hash: matchingPlan.request_manifest_hash_sha256,
      source_request_count: matchingPlan.acquisition_requests.length,
    };
    assert.equal(findFrozenDryRunPlanForCursorV2({ auditRoot, previousCursor }), matchingPath);
    assert.throws(() => findFrozenDryRunPlanForCursorV2({
      auditRoot,
      previousCursor: { ...previousCursor, source_manifest_hash: "missing" },
    }), /no governed frozen plan matches incomplete cursor/);
  } finally {
    rmSync(auditRoot, { recursive: true, force: true });
  }
});

test("V2 resumes interrupted work but never carries a terminal failure into the next daily run", () => {
  assert.equal(pipelineStateIsResumableV2({ status: "started" }), true);
  assert.equal(pipelineStateIsResumableV2({ status: "failed" }), false);
  assert.equal(pipelineStateIsResumableV2({ status: "succeeded" }), false);
  assert.equal(pipelineStateIsResumableV2(null), false);
});

test("V2 accepts only a frozen manifest that exactly matches the incomplete cursor", () => {
  const plan = buildMarketListingAcquisitionDryRunPlanV1({
    targets: [{
      card_print_id: "00000000-0000-0000-0000-000000000001",
      card_printing_id: "00000000-0000-0000-0000-000000000011",
      gv_id: "GV-TEST-1",
      printing_gv_id: "GV-TEST-1-HOLO",
      name: "Test Card",
      set_code: "test",
      finish_key: "holo",
      ebay_query_text: "Pokemon Test Card holo",
      acquisition_priority: "priority_variant_finish",
    }],
    setShelfPageBudget: 0,
  });
  const previousCursor = {
    cycle_complete: false,
    source_manifest_hash: plan.request_manifest_hash_sha256,
    source_request_count: plan.acquisition_requests.length,
  };

  assert.deepEqual(validateFrozenDryRunPlanV2({ plan, previousCursor }), {
    request_manifest_hash: plan.request_manifest_hash_sha256,
    request_count: plan.acquisition_requests.length,
  });
  assert.throws(() => validateFrozenDryRunPlanV2({
    plan,
    previousCursor: { ...previousCursor, source_manifest_hash: "different" },
  }), /cursor_manifest_mismatch/);
  assert.throws(() => validateFrozenDryRunPlanV2({
    plan: {
      ...plan,
      acquisition_requests: plan.acquisition_requests.map((request, index) => (
        index === 0 ? { ...request, query_text: `${request.query_text} changed` } : request
      )),
    },
    previousCursor,
  }), /manifest_hash_mismatch/);
});

test("request ordering is deterministic for otherwise tied printing targets", () => {
  const target = (cardPrintingId, finishKey, queryText = `Pokemon Test Card ${finishKey}`) => ({
    card_print_id: "00000000-0000-0000-0000-000000000001",
    card_printing_id: cardPrintingId,
    gv_id: "GV-TEST-1",
    printing_gv_id: `GV-TEST-1-${finishKey}`,
    name: "Test Card",
    set_code: "test",
    finish_key: finishKey,
    ebay_query_text: queryText,
    acquisition_priority: "priority_variant_finish",
  });
  const targets = [
    target("00000000-0000-0000-0000-000000000012", "reverse_holo"),
    target("00000000-0000-0000-0000-000000000011", "holo"),
    target("00000000-0000-0000-0000-000000000011", "holo", "Pokemon Test Card alternate holo"),
  ];
  const left = buildMarketListingAcquisitionDryRunPlanV1({ targets, setShelfPageBudget: 0 });
  const right = buildMarketListingAcquisitionDryRunPlanV1({ targets: [...targets].reverse(), setShelfPageBudget: 0 });

  assert.equal(left.request_manifest_hash_sha256, right.request_manifest_hash_sha256);
  assert.deepEqual(
    left.acquisition_requests.map((request) => request.query_key),
    right.acquisition_requests.map((request) => request.query_key),
  );
});

test("V2 resume rejects mismatched strict versions and readback findings", () => {
  const sourceAcquisitionRunKey = "MEE-11L-DAILY-BATCH-b040d39fa851";
  assert.equal(phaseReportSupportsResumeV2({
    phase: "strict_filtered_rollup_apply",
    sourceAcquisitionRunKey,
    report: {
      rollup_versions: [
        "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_11L_DAILY_BATCH_B040D39FA851",
      ],
    },
  }), true);
  assert.equal(phaseReportSupportsResumeV2({
    phase: "strict_filtered_rollup_apply",
    sourceAcquisitionRunKey,
    report: {
      rollup_versions: [
        "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_V2_CANARY_50_20260803T0415Z",
      ],
    },
  }), false);
  assert.equal(phaseReportSupportsResumeV2({
    phase: "run_scoped_readback",
    sourceAcquisitionRunKey,
    report: { run_key: sourceAcquisitionRunKey, findings: [] },
  }), true);
  assert.equal(phaseReportSupportsResumeV2({
    phase: "run_scoped_readback",
    sourceAcquisitionRunKey,
    report: { run_key: sourceAcquisitionRunKey, findings: ["strict_filtered_rollups_missing"] },
  }), false);
});

test("V2 pipeline preserves non-public and non-destructive boundaries", () => {
  const script = read("scripts/workers/market_listing_nightly_pipeline_v2.mjs");
  assert.match(script, /public_pricing_writes:\s*false/);
  assert.match(script, /app_visible_pricing_writes:\s*false/);
  assert.match(script, /canonical_identity_writes:\s*false/);
  assert.match(script, /deletes:\s*false/);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\btruncate\b/i);
});

test("disk capacity refusal is terminal, persisted, and provider-free", () => {
  const script = read("scripts/workers/market_listing_nightly_pipeline_v2.mjs");
  assert.match(script, /state\.outcome = "failed_preflight"/);
  assert.match(script, /saveState\(statePath, state\)/);
  assert.match(script, /phase: "disk_capacity_preflight"/);
  assert.match(script, /provider_calls_attempted: false/);
  assert.match(script, /database_writes_attempted: false/);
});

test("immutable release installer leaves the timer disabled by default", () => {
  const installer = read("deploy/scripts/install-mee-nightly-release-v2.sh");
  assert.match(installer, /ENABLE_TIMER="\$\{ENABLE_TIMER:-0\}"/);
  assert.match(installer, /status --porcelain --untracked-files=no/);
  assert.match(installer, /ln -sfn/);
  assert.match(installer, /systemctl disable --now/);
  assert.match(installer, /if \[\[ "\$\{ENABLE_TIMER\}" == "1" \]\]/);
});

test("nightly service writes artifacts outside the release checkout", () => {
  const service = read("deploy/systemd/grookai-mee-nightly.service");
  assert.match(service, /MEE_RUNTIME_ARTIFACT_ROOT=\/var\/lib\/grookai\/mee\/audits/);
});
