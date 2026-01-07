// run_centering_regression_border_v2.mjs
// Compares baseline vs border V2 (when available) on a saved dataset.
// Usage (PowerShell example):
//   node backend/tools/run_centering_regression_border_v2.mjs --dataset backend/_datasets/border_not_detected/manifest.json --debug

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = {
    dataset: path.join(__dirname, '..', '_datasets', 'border_not_detected', 'manifest.json'),
    debug: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dataset') {
      out.dataset = argv[i + 1] || out.dataset;
      i += 1;
    } else if (arg === '--debug') {
      out.debug = true;
    }
  }
  return out;
}

async function loadManifest(manifestPath) {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function runWorkerCLI(snapshotId, useV2, debug) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      [
        'condition/centering_measurement_worker_v2.mjs',
        '--snapshot-id',
        snapshotId,
        '--analysis-version',
        'v2_centering',
        '--dry-run',
        'true',
        ...(debug ? ['--debug', 'true'] : []),
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CENTERING_BORDER_V2: useV2 ? 'true' : 'false',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function runWorkerModule(snapshotId, useV2, debug) {
  // Will be wired in Commit 2 when worker exports a programmatic API.
  try {
    const mod = await import(pathToFileURL(path.join(__dirname, '..', 'condition', 'centering_measurement_worker_v2.mjs')));
    if (typeof mod.runCenteringOnSnapshot !== 'function') {
      return { supported: false, reason: 'runCenteringOnSnapshot not exported yet' };
    }
    const res = await mod.runCenteringOnSnapshot({
      snapshotId,
      analysisVersion: 'v2_centering',
      dryRun: true,
      debug,
      useBorderV2: useV2,
    });
    return { supported: true, result: res };
  } catch (err) {
    return { supported: false, reason: err.message };
  }
}

function parseStatusFromLogs(stdout) {
  // Best-effort parser for logStatus JSON lines.
  const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  let analysisStatus = null;
  let failureReason = null;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.event === 'done' || obj.event === 'dry_run') {
        analysisStatus = obj.analysis_status || obj.analysisStatus || analysisStatus;
      }
      if (obj.event === 'error' && obj.reason) {
        failureReason = obj.reason;
      }
    } catch {
      // ignore non-JSON
    }
  }
  return { analysisStatus, failureReason };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.dataset);
  const manifest = await loadManifest(manifestPath);
  const rows = [];

  for (const entry of manifest) {
    const snapshotId = entry.snapshot_id;

    // Prefer programmatic API if available (Commit 2), else fall back to CLI dry-run.
    let baselineStatus = null;
    let baselineReason = null;
    let v2Status = null;
    let v2Reason = null;

    const modBaseline = await runWorkerModule(snapshotId, false, args.debug);
    if (modBaseline.supported && modBaseline.result) {
      baselineStatus = modBaseline.result.analysis_status || null;
      baselineReason = modBaseline.result.failure_reason || null;
    } else {
      const run = await runWorkerCLI(snapshotId, false, args.debug);
      const parsed = parseStatusFromLogs(run.stdout);
      baselineStatus = parsed.analysisStatus;
      baselineReason = parsed.failureReason;
    }

    const modV2 = await runWorkerModule(snapshotId, true, args.debug);
    if (modV2.supported && modV2.result) {
      v2Status = modV2.result.analysis_status || null;
      v2Reason = modV2.result.failure_reason || null;
    } else {
      const run = await runWorkerCLI(snapshotId, true, args.debug);
      const parsed = parseStatusFromLogs(run.stdout);
      v2Status = parsed.analysisStatus;
      v2Reason = parsed.failureReason;
    }

    rows.push({
      snapshot_id: snapshotId,
      baseline_status: baselineStatus,
      baseline_reason: baselineReason,
      v2_status: v2Status,
      v2_reason: v2Reason,
    });
  }

  const reportDir = path.join(__dirname, '..', 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  const outCsv = path.join(reportDir, 'border_v2_regression.csv');
  const header = 'snapshot_id,baseline_status,baseline_reason,v2_status,v2_reason';
  const body = rows
    .map((r) =>
      [
        r.snapshot_id,
        r.baseline_status ?? '',
        r.baseline_reason ?? '',
        r.v2_status ?? '',
        r.v2_reason ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  await fs.writeFile(outCsv, `${header}\n${body}\n`);
  console.log(`[regression] wrote ${outCsv} (${rows.length} rows)`);
}

main().catch((err) => {
  console.error('[regression] failed', err);
  process.exit(1);
});
