import assert from "node:assert/strict";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildObserverSnapshot,
  observeRun,
  parseConcurrentJsonLines,
} from "../../scripts/audits/mtg_catalog_ingestion_progress_observer_v1.mjs";

const SOURCE = fsSync.readFileSync(
  new URL(
    "../../scripts/audits/mtg_catalog_ingestion_progress_observer_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

function fixture(overrides = {}) {
  const runPlan = {
    mode: "apply",
    created_at: "2026-08-14T00:00:00.000Z",
    envelope_sha256: "envelope",
    manifest_sha256: "manifest",
    repository: { governing_commit_sha: "commit" },
    selected_set_ids: ["set-1", "set-2", "set-3"],
  };
  const completed = {
    recorded_at: "2026-08-14T00:02:00.000Z",
    event: "set_completed",
    source_set_id: "set-1",
    code: "one",
    completed_at: "2026-08-14T00:02:00.000Z",
    counts_toward_run_delta: true,
    plan: {
      row_counts: {
        sets: 1,
        card_prints: 10,
        card_print_identity: 10,
        card_printings: 12,
        external_mappings: 10,
        external_printing_mappings: 11,
      },
      promotion_plan_sha256: "plan-1",
    },
  };
  const progress = {
    events: [
      { recorded_at: "2026-08-14T00:00:00.000Z", event: "set_started", source_set_id: "set-1", code: "one", execution_ordinal: 0 },
      completed,
      { recorded_at: "2026-08-14T00:02:30.000Z", event: "automatic_safety_gate_passed", completed_set_count: 1 },
      { recorded_at: "2026-08-14T00:02:31.000Z", event: "set_started", source_set_id: "set-2", code: "two", execution_ordinal: 1 },
    ],
    ignored_partial_line: false,
  };
  const state = {
    status: "running",
    completed: [completed],
    deferred: [],
    retries: [],
    findings: [],
  };
  return {
    runDir: "C:\\source-run",
    runPlan,
    progress,
    state,
    failure: null,
    summary: null,
    sourceFiles: {},
    now: new Date("2026-08-14T00:03:00.000Z"),
    ...overrides,
  };
}

test("tolerates one concurrently appended partial JSONL line", () => {
  const parsed = parseConcurrentJsonLines(
    '{"event":"set_started","source_set_id":"one"}\n{"event":"set_comp',
  );
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.ignored_partial_line, true);
});

test("rejects malformed completed JSONL lines", () => {
  assert.throws(
    () => parseConcurrentJsonLines('{"event":"set_started"}\nnot-json\n'),
    /Malformed completed progress line 2/,
  );
});

test("reconciles progress and state without double-counting completed sets", () => {
  const snapshot = buildObserverSnapshot(fixture());
  assert.equal(snapshot.progress.selected_sets, 3);
  assert.equal(snapshot.progress.completed_sets, 1);
  assert.equal(snapshot.progress.in_flight_sets, 1);
  assert.equal(snapshot.progress.remaining_sets, 2);
  assert.equal(snapshot.progress.completed_plan_row_totals.card_prints, 10);
  assert.equal(snapshot.progress.durable_applied_row_totals.card_printings, 12);
  assert.deepEqual(snapshot.automatic_gates.passed, [1]);
  assert.equal(snapshot.process_liveness.status, "unknown");
});

test("derives rate and ETA only from completed timestamps", () => {
  const first = fixture().state.completed[0];
  const second = {
    ...first,
    source_set_id: "set-2",
    code: "two",
    recorded_at: "2026-08-14T00:04:00.000Z",
    completed_at: "2026-08-14T00:04:00.000Z",
    plan: { ...first.plan, promotion_plan_sha256: "plan-2" },
  };
  const input = fixture();
  input.progress.events.push(second);
  input.state.completed.push(second);
  input.now = new Date("2026-08-14T00:05:00.000Z");
  const snapshot = buildObserverSnapshot(input);
  assert.equal(snapshot.timing.sets_per_hour, 30);
  assert.equal(snapshot.timing.average_seconds_per_set, 120);
  assert.equal(snapshot.timing.eta_seconds, 120);
});

test("accepts absent active-run summary and failure files and writes hashed artifacts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mtg-observer-"));
  const runDir = path.join(root, "run");
  const outDir = path.join(root, "output");
  await fs.mkdir(runDir);
  const input = fixture();
  await fs.writeFile(path.join(runDir, "run_plan.json"), JSON.stringify(input.runPlan));
  await fs.writeFile(
    path.join(runDir, "progress.jsonl"),
    `${input.progress.events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  await fs.writeFile(path.join(runDir, "state.json"), JSON.stringify(input.state));

  const result = await observeRun({ runDir, outDir, now: input.now });
  assert.equal(result.snapshot.source_run.summary_status, "not_available");
  assert.equal(result.snapshot.progress.failures, 0);
  const hashes = JSON.parse(await fs.readFile(path.join(outDir, "artifact_hashes.json"), "utf8"));
  assert.match(hashes.artifacts["snapshot.json"], /^[a-f0-9]{64}$/);
  assert.match(hashes.artifacts["REPORT.md"], /^[a-f0-9]{64}$/);
});

test("refuses to write observer output into the observed run directory", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mtg-observer-boundary-"));
  const runDir = path.join(root, "run");
  await fs.mkdir(runDir);
  const input = fixture();
  await fs.writeFile(path.join(runDir, "run_plan.json"), JSON.stringify(input.runPlan));
  await fs.writeFile(path.join(runDir, "progress.jsonl"), "");

  await assert.rejects(
    observeRun({ runDir, outDir: path.join(runDir, "observer") }),
    /must be outside the observed run directory/,
  );
});

test("observer source has no database, network, Storage, or process-control dependency", () => {
  assert.doesNotMatch(SOURCE, /from ["'](?:pg|postgres|@supabase\/supabase-js)["']/);
  assert.doesNotMatch(SOURCE, /https?:\/\//);
  assert.doesNotMatch(SOURCE, /\b(?:fetch|delete|truncate|kill|taskkill|Stop-Process)\s*\(/i);
  assert.match(SOURCE, /process inspection not requested/);
  assert.match(SOURCE, /source_artifacts_modified: false/);
});
