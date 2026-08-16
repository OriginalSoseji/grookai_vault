import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  selectMtgCatalogExecutionRangeV1,
} from "../../scripts/audits/mtg_canonical_catalog_ingestion_orchestrator_v1.mjs";

const SOURCE = fs.readFileSync(
  new URL(
    "../../scripts/audits/mtg_canonical_catalog_ingestion_orchestrator_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

const WORKFLOW = fs.readFileSync(
  new URL("../../.github/workflows/mtg-hidden-catalog-runner.yml", import.meta.url),
  "utf8",
);

test("orchestrator freezes plan before database execution", () => {
  assert.match(SOURCE, /run_plan\.json/);
  assert.match(SOURCE, /await atomicWriteJson\(runPlanFile, runPlan\)/);
  assert.match(SOURCE, /acquireExecutionLock/);
  assert.ok(
    SOURCE.indexOf("await atomicWriteJson(runPlanFile, runPlan)") <
      SOURCE.indexOf("let lockLease = await acquireExecutionLock()"),
  );
});

test("orchestrator survives idle advisory-lock connection termination safely", () => {
  assert.match(SOURCE, /keepAlive: true/);
  assert.match(SOURCE, /client\.on\("error"/);
  assert.match(SOURCE, /lease\.lostError/);
  assert.match(SOURCE, /setInterval\(async \(\) =>/);
  assert.match(SOURCE, /await client\.query\("select 1"\)/);
  assert.match(SOURCE, /ensureExecutionLock/);
  assert.match(SOURCE, /execution_lock_reacquired/);
});

test("orchestrator uses isolated stage and promotion transactions", () => {
  assert.match(SOURCE, /async function stageSetDurably/);
  assert.match(SOURCE, /async function promoteSetDurably/);
  assert.match(SOURCE, /await client\.query\("commit"\)/);
  assert.match(SOURCE, /await client\.query\("rollback"\)/);
  assert.match(SOURCE, /complete_exact/);
  assert.match(SOURCE, /partial_or_drifted/);
  assert.match(SOURCE, /repeatable read read only/);
  assert.match(SOURCE, /separate_connection: true/);
});

test("orchestrator defers future releases before loading or writing the set", () => {
  assert.match(SOURCE, /isMtgCatalogBatchEligibleAsOfV1/);
  assert.match(SOURCE, /future_release_date/);
  assert.match(SOURCE, /set_deferred/);
});

test("orchestrator does not expose destructive or release operations", () => {
  assert.doesNotMatch(SOURCE, /delete\s+from\s+public\./i);
  assert.doesNotMatch(SOURCE, /update\s+public\./i);
  assert.doesNotMatch(SOURCE, /truncate\s+/i);
  assert.doesNotMatch(SOURCE, /insert\s+into\s+public\.catalog_game_release_controls/i);
  assert.doesNotMatch(SOURCE, /update\s+public\.catalog_game_release_controls/i);
});

test("orchestrator preserves evidence after every transition", () => {
  assert.match(SOURCE, /progress\.jsonl/);
  assert.match(SOURCE, /state\.json/);
  assert.match(SOURCE, /set_started/);
  assert.match(SOURCE, /set_completed/);
  assert.match(SOURCE, /automatic_safety_gate_passed/);
  assert.match(SOURCE, /failure\.json/);
  assert.match(SOURCE, /stopped_before_next_set/);
});

test("image boundary uses only deployed parent and printing columns", () => {
  assert.match(SOURCE, /parent_image_alt_url_count/);
  assert.match(SOURCE, /printing_image_path_count/);
  assert.match(SOURCE, /printing_image_alt_url_count/);
  assert.doesNotMatch(SOURCE, /image_source_ref/);
});

test("apply requires one exact manifest-level approval", () => {
  assert.match(SOURCE, /MTG_CATALOG_INGESTION_APPROVAL_ENV/);
  assert.match(SOURCE, /Exact catalog envelope approval missing/);
  assert.doesNotMatch(SOURCE, /MTG_CANONICAL_SET_PROMOTION_APPROVAL/);
  assert.doesNotMatch(SOURCE, /MTG_CANONICAL_CANARY_STAGE_APPROVAL/);
});

test("remote runner exports the orchestrator's exact approval variable", () => {
  assert.match(WORKFLOW, /export MTG_CANONICAL_CATALOG_INGESTION_APPROVAL=/);
  assert.doesNotMatch(WORKFLOW, /export MTG_CATALOG_INGESTION_APPROVAL=/);
});

test("orchestrator selects deterministic non-overlapping execution ranges", () => {
  const executionOrder = Array.from({ length: 10 }, (_, index) => ({
    execution_ordinal: index,
    source_set_id: `set-${index}`,
  }));

  const first = selectMtgCatalogExecutionRangeV1(executionOrder, {
    startIndex: 0,
    maxSets: 4,
  });
  const second = selectMtgCatalogExecutionRangeV1(executionOrder, {
    startIndex: 4,
    maxSets: 4,
  });
  const final = selectMtgCatalogExecutionRangeV1(executionOrder, {
    startIndex: 8,
    maxSets: 4,
  });

  assert.deepEqual(first.selected.map((row) => row.source_set_id), [
    "set-0",
    "set-1",
    "set-2",
    "set-3",
  ]);
  assert.deepEqual(second.selected.map((row) => row.source_set_id), [
    "set-4",
    "set-5",
    "set-6",
    "set-7",
  ]);
  assert.deepEqual(final.selected.map((row) => row.source_set_id), ["set-8", "set-9"]);
  assert.equal(final.end_index_exclusive, 10);
});

test("orchestrator rejects an execution range outside the frozen order", () => {
  assert.throws(
    () => selectMtgCatalogExecutionRangeV1([{ source_set_id: "set-0" }], {
      startIndex: 1,
      maxSets: 1,
    }),
    /outside execution order length/,
  );
});
