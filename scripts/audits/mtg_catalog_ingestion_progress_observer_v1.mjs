import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MTG_INGESTION_OBSERVER_VERSION =
  "MTG_CATALOG_INGESTION_PROGRESS_OBSERVER_V1";

const INPUT_FILES = [
  "run_plan.json",
  "progress.jsonl",
  "state.json",
  "failure.json",
  "summary.json",
];

const ROW_COUNT_KEYS = [
  "sets",
  "card_prints",
  "card_print_identity",
  "card_printings",
  "external_mappings",
  "external_printing_mappings",
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readFileIfPresent(file) {
  try {
    return await fs.readFile(file);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function readJsonSnapshot(file, { required = false, attempts = 3 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const body = await readFileIfPresent(file);
    if (body === null) {
      if (!required) return { present: false, body: null, value: null };
      if (attempt === attempts) throw new Error(`Required observer input is missing: ${file}`);
    } else {
      try {
        return {
          present: true,
          body,
          value: JSON.parse(body.toString("utf8")),
        };
      } catch (error) {
        if (attempt === attempts) {
          throw new Error(`Unable to parse observer input ${file}: ${error.message}`);
        }
      }
    }
    await delay(20 * attempt);
  }
  throw new Error(`Unable to read observer input: ${file}`);
}

export function parseConcurrentJsonLines(body) {
  const text = Buffer.isBuffer(body) ? body.toString("utf8") : String(body ?? "");
  if (text.length === 0) return { events: [], ignored_partial_line: false };

  const lines = text.split(/\r?\n/);
  const trailingLineIsComplete = /(?:\r?\n)$/.test(text);
  const events = [];
  let ignoredPartialLine = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) continue;
    const isLastPhysicalLine = index === lines.length - 1;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      if (isLastPhysicalLine && !trailingLineIsComplete) {
        ignoredPartialLine = true;
        continue;
      }
      throw new Error(`Malformed completed progress line ${index + 1}: ${error.message}`);
    }
  }

  return { events, ignored_partial_line: ignoredPartialLine };
}

function parseArgs(argv) {
  const args = {
    runDir: null,
    outDir: null,
    inspectProcessLiveness: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--inspect-process-liveness") {
      args.inspectProcessLiveness = true;
    } else if (token.startsWith("--run-dir=")) {
      args.runDir = token.slice("--run-dir=".length);
    } else if (token === "--run-dir") {
      args.runDir = argv[++index];
    } else if (token.startsWith("--out-dir=")) {
      args.outDir = token.slice("--out-dir=".length);
    } else if (token === "--out-dir") {
      args.outDir = argv[++index];
    } else {
      throw new Error(`Unknown observer argument: ${token}`);
    }
  }

  return args;
}

function emptyRowCounts() {
  return Object.fromEntries(ROW_COUNT_KEYS.map((key) => [key, 0]));
}

function addRowCounts(target, rowCounts, warnings, sourceSetId) {
  for (const key of ROW_COUNT_KEYS) {
    const value = Number(rowCounts?.[key]);
    if (!Number.isSafeInteger(value) || value < 0) {
      warnings.push(`Completed set ${sourceSetId} has invalid plan.row_counts.${key}`);
      continue;
    }
    target[key] += value;
  }
}

function dedupeRows(rows, keyFor) {
  const deduped = new Map();
  for (const row of rows.filter(Boolean)) deduped.set(keyFor(row), row);
  return [...deduped.values()];
}

function completedTimestamp(row) {
  const timestamp = Date.parse(row?.completed_at ?? row?.recorded_at ?? "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function buildRate(completed, remainingSetCount, now) {
  const timestamps = completed
    .map(completedTimestamp)
    .filter(Number.isFinite)
    .sort((left, right) => left - right);

  if (timestamps.length < 2 || timestamps.at(-1) <= timestamps[0]) {
    return {
      basis: "completed_timestamps",
      sample_completed_sets: timestamps.length,
      sets_per_hour: null,
      average_seconds_per_set: null,
      eta_seconds: null,
      eta_at: null,
    };
  }

  const elapsedSeconds = (timestamps.at(-1) - timestamps[0]) / 1000;
  const completedIntervals = timestamps.length - 1;
  const setsPerHour = completedIntervals / (elapsedSeconds / 3600);
  const etaSeconds = setsPerHour > 0 ? (remainingSetCount / setsPerHour) * 3600 : null;

  return {
    basis: "completed_timestamps",
    sample_completed_sets: timestamps.length,
    sets_per_hour: Number(setsPerHour.toFixed(3)),
    average_seconds_per_set: Number((elapsedSeconds / completedIntervals).toFixed(3)),
    eta_seconds: etaSeconds === null ? null : Math.round(etaSeconds),
    eta_at: etaSeconds === null ? null : new Date(now.getTime() + etaSeconds * 1000).toISOString(),
  };
}

function deriveAutomaticGates(selectedCount, completedCount, events) {
  const targets = [...new Set([1, 25, selectedCount])]
    .filter((value) => value > 0 && value <= selectedCount)
    .sort((left, right) => left - right);
  const observed = new Set(
    events
      .filter((event) => event.event === "automatic_safety_gate_passed")
      .map((event) => Number(event.completed_set_count))
      .filter(Number.isFinite),
  );
  const gates = targets.map((target) => ({
    completed_set_target: target,
    status: observed.has(target) ? "passed" : completedCount >= target ? "missing" : "pending",
  }));
  return {
    gates,
    passed: gates.filter((gate) => gate.status === "passed").map((gate) => gate.completed_set_target),
    missing: gates.filter((gate) => gate.status === "missing").map((gate) => gate.completed_set_target),
    next_pending:
      gates.find((gate) => gate.status === "pending")?.completed_set_target ?? null,
  };
}

function describeLivenessNotInspected() {
  return {
    status: "unknown",
    inspection_performed: false,
    reason: "process inspection not requested",
    matching_processes: [],
  };
}

export async function inspectLocalProcessLiveness(runDir) {
  try {
    let rows;
    if (process.platform === "win32") {
      const script = [
        "$needle=$env:MTG_OBSERVER_RUN_DIR;",
        "$rows=Get-CimInstance Win32_Process | Where-Object {",
        "  $_.CommandLine -and $_.CommandLine -like '*mtg_canonical_catalog_ingestion_orchestrator_v1.mjs*' -and $_.CommandLine.Contains($needle)",
        "} | Select-Object ProcessId,Name,CommandLine;",
        "@($rows) | ConvertTo-Json -Compress",
      ].join(" ");
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { env: { ...process.env, MTG_OBSERVER_RUN_DIR: runDir }, windowsHide: true },
      );
      const parsed = stdout.trim().length === 0 ? [] : JSON.parse(stdout);
      rows = Array.isArray(parsed) ? parsed : [parsed];
      rows = rows.map((row) => ({ pid: row.ProcessId, name: row.Name }));
    } else {
      const { stdout } = await execFileAsync("ps", ["-eo", "pid=,comm=,args="]);
      rows = stdout
        .split("\n")
        .filter(
          (line) =>
            line.includes("mtg_canonical_catalog_ingestion_orchestrator_v1.mjs") &&
            line.includes(runDir),
        )
        .map((line) => {
          const match = line.trim().match(/^(\d+)\s+(\S+)/);
          return { pid: match ? Number(match[1]) : null, name: match?.[2] ?? "unknown" };
        });
    }
    return {
      status: rows.length > 0 ? "running" : "not_found",
      inspection_performed: true,
      reason: rows.length > 0 ? "matching local executor process found" : "no matching local executor process found",
      matching_processes: rows,
    };
  } catch (error) {
    return {
      status: "unknown",
      inspection_performed: true,
      reason: `process inspection failed: ${error.message}`,
      matching_processes: [],
    };
  }
}

export function buildObserverSnapshot({
  runDir,
  runPlan,
  progress,
  state,
  failure,
  summary,
  sourceFiles,
  now = new Date(),
  processLiveness = describeLivenessNotInspected(),
}) {
  const warnings = [];
  const selectedIds = runPlan.selected_set_ids ?? [];
  const selectedSet = new Set(selectedIds);
  if (selectedSet.size !== selectedIds.length) warnings.push("run_plan contains duplicate selected_set_ids");

  const progressCompleted = progress.events.filter((event) => event.event === "set_completed");
  const stateCompleted = state?.completed ?? [];
  const completed = dedupeRows(
    [...progressCompleted, ...stateCompleted],
    (row) => row.source_set_id,
  ).sort((left, right) => (completedTimestamp(left) ?? 0) - (completedTimestamp(right) ?? 0));

  for (const row of completed) {
    if (!selectedSet.has(row.source_set_id)) {
      warnings.push(`Completed set ${row.source_set_id} is not in the frozen selection`);
    }
    const eventRow = progressCompleted.find((event) => event.source_set_id === row.source_set_id);
    const stateRow = stateCompleted.find((entry) => entry.source_set_id === row.source_set_id);
    if (
      eventRow &&
      stateRow &&
      stableJson(eventRow.plan ?? null) !== stableJson(stateRow.plan ?? null)
    ) {
      warnings.push(`Completed plan mismatch for ${row.source_set_id}`);
    }
  }

  const progressDeferred = progress.events.filter((event) => event.event === "set_deferred");
  const deferred = dedupeRows(
    [...progressDeferred, ...(state?.deferred ?? [])],
    (row) => row.source_set_id,
  );
  const completedIds = new Set(completed.map((row) => row.source_set_id));
  const deferredIds = new Set(deferred.map((row) => row.source_set_id));
  const starts = progress.events.filter((event) => event.event === "set_started");
  const inFlight = dedupeRows(
    starts.filter(
      (event) => !completedIds.has(event.source_set_id) && !deferredIds.has(event.source_set_id),
    ),
    (row) => row.source_set_id,
  );

  const retries = dedupeRows(
    [
      ...progress.events.filter((event) => event.event === "transient_retry"),
      ...(state?.retries ?? []),
    ],
    (row) => `${row.source_set_id}:${row.attempt}:${row.error_code}:${row.error_message}`,
  );
  const failures = dedupeRows(
    [
      ...progress.events.filter((event) => event.event === "execution_stopped"),
      ...(state?.findings ?? []),
      failure,
    ],
    (row) => `${row.recorded_at}:${row.error_code}:${row.error_message}`,
  );

  const completedPlanRowTotals = emptyRowCounts();
  const durableAppliedRowTotals = emptyRowCounts();
  for (const row of completed) {
    addRowCounts(completedPlanRowTotals, row.plan?.row_counts, warnings, row.source_set_id);
    if (row.counts_toward_run_delta === true) {
      addRowCounts(durableAppliedRowTotals, row.plan?.row_counts, warnings, row.source_set_id);
    }
  }

  const remainingSetCount = Math.max(
    0,
    selectedIds.length - completedIds.size - deferredIds.size,
  );
  const lastEvent = progress.events
    .map((event) => ({ event, time: Date.parse(event.recorded_at ?? "") }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((left, right) => left.time - right.time)
    .at(-1);
  const lastEventAgeSeconds = lastEvent
    ? Math.max(0, Math.round((now.getTime() - lastEvent.time) / 1000))
    : null;

  const gates = deriveAutomaticGates(selectedIds.length, completedIds.size, progress.events);
  if (gates.missing.length > 0) {
    warnings.push(`Automatic gates missing at completed counts: ${gates.missing.join(", ")}`);
  }
  if (progress.ignored_partial_line) {
    warnings.push("Ignored an incomplete trailing progress.jsonl line during concurrent append");
  }

  return {
    version: MTG_INGESTION_OBSERVER_VERSION,
    observed_at: now.toISOString(),
    run_dir: runDir,
    source_run: {
      mode: runPlan.mode ?? null,
      created_at: runPlan.created_at ?? null,
      envelope_sha256: runPlan.envelope_sha256 ?? null,
      manifest_sha256: runPlan.manifest_sha256 ?? null,
      governing_commit_sha: runPlan.repository?.governing_commit_sha ?? null,
      state_status: state?.status ?? "not_available",
      summary_status: summary?.status ?? "not_available",
    },
    progress: {
      selected_sets: selectedIds.length,
      completed_sets: completedIds.size,
      in_flight_sets: inFlight.length,
      in_flight: inFlight.map((row) => ({
        source_set_id: row.source_set_id,
        code: row.code,
        execution_ordinal: row.execution_ordinal,
        started_at: row.recorded_at,
      })),
      deferred_sets: deferredIds.size,
      remaining_sets: remainingSetCount,
      retries: retries.length,
      failures: failures.length,
      completed_plan_row_totals: completedPlanRowTotals,
      durable_applied_row_totals: durableAppliedRowTotals,
    },
    timing: {
      ...buildRate(completed, remainingSetCount, now),
      last_event_at: lastEvent ? new Date(lastEvent.time).toISOString() : null,
      last_event: lastEvent?.event?.event ?? null,
      last_event_age_seconds: lastEventAgeSeconds,
    },
    automatic_gates: gates,
    process_liveness: processLiveness,
    concurrent_read: {
      incomplete_trailing_progress_line_ignored: progress.ignored_partial_line,
    },
    source_files: sourceFiles,
    warnings,
    boundaries: {
      database_access: false,
      network_access: false,
      storage_access: false,
      release_changes: false,
      ingestion_writes: false,
      source_artifacts_modified: false,
    },
  };
}

export function renderConsoleSnapshot(snapshot) {
  const progress = snapshot.progress;
  const timing = snapshot.timing;
  const inFlight = progress.in_flight.map((row) => `${row.code} (#${row.execution_ordinal + 1})`).join(", ");
  const gateText = snapshot.automatic_gates.gates
    .map((gate) => `${gate.completed_set_target}:${gate.status}`)
    .join(", ");
  const rows = progress.completed_plan_row_totals;
  return [
    `MTG ingestion observer | ${snapshot.observed_at}`,
    `Run: ${snapshot.source_run.state_status} | selected ${progress.selected_sets} | completed ${progress.completed_sets} | remaining ${progress.remaining_sets}`,
    `In flight: ${progress.in_flight_sets}${inFlight ? ` | ${inFlight}` : ""} | deferred ${progress.deferred_sets} | retries ${progress.retries} | failures ${progress.failures}`,
    `Completed rows: sets ${rows.sets} | parents ${rows.card_prints} | identities ${rows.card_print_identity} | printings ${rows.card_printings} | parent mappings ${rows.external_mappings} | printing mappings ${rows.external_printing_mappings}`,
    `Rate: ${timing.sets_per_hour ?? "n/a"} sets/hour | ETA ${timing.eta_at ?? "n/a"}`,
    `Last event: ${timing.last_event ?? "none"} | age ${timing.last_event_age_seconds ?? "n/a"}s`,
    `Automatic gates: ${gateText || "none"}`,
    `Process liveness: ${snapshot.process_liveness.status} (${snapshot.process_liveness.reason})`,
    `Warnings: ${snapshot.warnings.length}`,
  ].join("\n");
}

export function renderMarkdownSnapshot(snapshot) {
  const progress = snapshot.progress;
  const timing = snapshot.timing;
  const rows = progress.completed_plan_row_totals;
  const gateRows = snapshot.automatic_gates.gates
    .map((gate) => `| ${gate.completed_set_target} | ${gate.status} |`)
    .join("\n");
  const inFlight = progress.in_flight.length
    ? progress.in_flight.map((row) => `- \`${row.code}\` (ordinal ${row.execution_ordinal})`).join("\n")
    : "- None observed";

  return `# MTG Catalog Ingestion Progress Snapshot

- Observed at: \`${snapshot.observed_at}\`
- Source run: \`${snapshot.run_dir}\`
- State: **${snapshot.source_run.state_status}**
- Selected: \`${progress.selected_sets}\`
- Completed: \`${progress.completed_sets}\`
- Remaining: \`${progress.remaining_sets}\`
- Deferred: \`${progress.deferred_sets}\`
- Retries: \`${progress.retries}\`
- Failures: \`${progress.failures}\`
- Process liveness: **${snapshot.process_liveness.status}** (${snapshot.process_liveness.reason})

## Current Work

${inFlight}

## Completed Frozen Plan Rows

| Row class | Count |
| --- | ---: |
| Sets | ${rows.sets} |
| Card parents | ${rows.card_prints} |
| Identity rows | ${rows.card_print_identity} |
| Printings | ${rows.card_printings} |
| Scryfall parent mappings | ${rows.external_mappings} |
| TCGPlayer printing mappings | ${rows.external_printing_mappings} |

## Timing

- Rate basis: \`${timing.basis}\`
- Completed timestamp sample: \`${timing.sample_completed_sets}\`
- Rate: \`${timing.sets_per_hour ?? "not_available"}\` sets/hour
- Average: \`${timing.average_seconds_per_set ?? "not_available"}\` seconds/set
- ETA: \`${timing.eta_at ?? "not_available"}\`
- Last event: \`${timing.last_event ?? "none"}\` at \`${timing.last_event_at ?? "not_available"}\`
- Last event age: \`${timing.last_event_age_seconds ?? "not_available"}\` seconds

## Automatic Gates

| Completed-set target | Status |
| ---: | --- |
${gateRows}

## Observer Boundaries

This snapshot was produced without database, network, Storage, release, or
ingestion writes. Source run artifacts were read only. Process liveness remains
unknown unless the explicit \`--inspect-process-liveness\` flag is supplied.

## Warnings

${snapshot.warnings.length ? snapshot.warnings.map((warning) => `- ${warning}`).join("\n") : "- None"}
`;
}

function ensureOutputOutsideRun(runDir, outDir) {
  const relative = path.relative(path.resolve(runDir), path.resolve(outDir));
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("Observer output directory must be outside the observed run directory");
  }
}

async function atomicWrite(file, body) {
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, body);
  await fs.rename(temporary, file);
}

async function captureInput(runDir, name, required = false) {
  const file = path.join(runDir, name);
  if (name === "progress.jsonl") {
    const body = await readFileIfPresent(file);
    if (body === null && required) throw new Error(`Required observer input is missing: ${file}`);
    return {
      present: body !== null,
      body,
      value: parseConcurrentJsonLines(body),
    };
  }
  return readJsonSnapshot(file, { required });
}

export async function observeRun({
  runDir,
  outDir = null,
  inspectProcess = false,
  now = new Date(),
}) {
  const absoluteRunDir = path.resolve(runDir);
  const inputs = {};
  for (const name of INPUT_FILES) {
    inputs[name] = await captureInput(
      absoluteRunDir,
      name,
      name === "run_plan.json" || name === "progress.jsonl",
    );
  }

  const sourceFiles = Object.fromEntries(
    INPUT_FILES.map((name) => {
      const input = inputs[name];
      return [
        name,
        {
          present: input.present,
          byte_length: input.body?.length ?? null,
          sha256: input.body ? sha256(input.body) : null,
        },
      ];
    }),
  );
  const processLiveness = inspectProcess
    ? await inspectLocalProcessLiveness(absoluteRunDir)
    : describeLivenessNotInspected();
  const snapshot = buildObserverSnapshot({
    runDir: absoluteRunDir,
    runPlan: inputs["run_plan.json"].value,
    progress: inputs["progress.jsonl"].value,
    state: inputs["state.json"].value,
    failure: inputs["failure.json"].value,
    summary: inputs["summary.json"].value,
    sourceFiles,
    now,
    processLiveness,
  });

  const consoleText = renderConsoleSnapshot(snapshot);
  let artifacts = null;
  if (outDir) {
    const absoluteOutDir = path.resolve(outDir);
    ensureOutputOutsideRun(absoluteRunDir, absoluteOutDir);
    await fs.mkdir(absoluteOutDir, { recursive: true });
    const jsonBody = `${JSON.stringify(snapshot, null, 2)}\n`;
    const markdownBody = renderMarkdownSnapshot(snapshot);
    await atomicWrite(path.join(absoluteOutDir, "snapshot.json"), jsonBody);
    await atomicWrite(path.join(absoluteOutDir, "REPORT.md"), markdownBody);
    const hashes = {
      version: MTG_INGESTION_OBSERVER_VERSION,
      hash_algorithm: "sha256",
      artifacts: {
        "snapshot.json": sha256(jsonBody),
        "REPORT.md": sha256(markdownBody),
      },
    };
    await atomicWrite(
      path.join(absoluteOutDir, "artifact_hashes.json"),
      `${JSON.stringify(hashes, null, 2)}\n`,
    );
    artifacts = { out_dir: absoluteOutDir, ...hashes };
  }

  return { snapshot, consoleText, artifacts };
}

function usage() {
  return `Usage:
  node scripts/audits/mtg_catalog_ingestion_progress_observer_v1.mjs --run-dir <path> [--out-dir <path>] [--inspect-process-liveness]

The observer is read-only. It never accesses the database, network, Storage, or
release controls and never modifies the observed run directory.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  if (!args.runDir) throw new Error("--run-dir is required");
  const result = await observeRun({
    runDir: args.runDir,
    outDir: args.outDir,
    inspectProcess: args.inspectProcessLiveness,
  });
  process.stdout.write(`${result.consoleText}\n`);
  if (result.artifacts) process.stdout.write(`Artifacts: ${result.artifacts.out_dir}\n`);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
