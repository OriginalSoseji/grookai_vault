import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerMarketCompletionV1,
  TCGPLAYER_MARKET_COMPLETION_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_completion_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_STATE = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "pricing",
  "mee_pricing_platform_production_v1",
  "production_completion_matrix_v1",
  "state.json",
);
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "production_completion",
);
const AUDIT_VERSION = "TCGPLAYER_MARKET_COMPLETION_AUDIT_V1";

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((arg) => arg.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  return {
    statePath: path.resolve(value("state") || DEFAULT_STATE),
    outRoot: path.resolve(value("out-root") || DEFAULT_OUT_ROOT),
    requireComplete: argv.includes("--require-complete"),
  };
}

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function evidenceFindings(rows) {
  const findings = [];
  for (const row of rows) {
    for (const evidencePath of row.evidence ?? []) {
      const resolved = path.resolve(REPO_ROOT, evidencePath);
      const relative = path.relative(REPO_ROOT, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        findings.push(
          `evidence_outside_repository:${row.requirement_id}:${evidencePath}`,
        );
        continue;
      }
      try {
        await fs.access(resolved);
      } catch {
        findings.push(
          `evidence_missing:${row.requirement_id}:${evidencePath}`,
        );
      }
    }
  }
  return findings;
}

function markdown(report) {
  const lines = [
    "# TCGPlayer Market Production V1 Completion Matrix",
    "",
    `- Audit: \`${AUDIT_VERSION}\``,
    `- Policy: \`${report.policy_version}\``,
    `- Status: \`${report.status}\``,
    `- Completion allowed: \`${report.completion_allowed}\``,
    `- Passed: \`${report.counts.passed}/${report.counts.required}\``,
    `- Pending: \`${report.counts.pending}\``,
    `- External blockers: \`${report.counts.blocked_external}\``,
    "",
    "## Requirements",
    "",
    "| Requirement | Status | Current truth / next gate |",
    "|---|---|---|",
    ...report.requirements.map((row) => {
      const detail =
        row.status === "passed" ? row.current_truth : row.next_gate;
      return `| \`${row.requirement_id}\` | \`${row.status}\` | ${detail} |`;
    }),
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => `- \`${finding}\``)
      : ["- none"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const state = JSON.parse(await fs.readFile(args.statePath, "utf8"));
  const commitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const trackedWorktreeClean =
    !git(["status", "--porcelain", "--untracked-files=no"]);
  const evaluation = evaluateTcgplayerMarketCompletionV1(
    state.requirements,
  );
  const evidenceIssues = await evidenceFindings(evaluation.requirements);
  const findings = [...evaluation.findings, ...evidenceIssues].sort();
  const report = {
    audit_version: AUDIT_VERSION,
    policy_version: TCGPLAYER_MARKET_COMPLETION_POLICY_V1,
    status: findings.length > 0 ? "invalid" : evaluation.status,
    completion_allowed:
      findings.length === 0 && evaluation.completion_allowed,
    as_of: new Date().toISOString(),
    commit_sha: commitSha,
    branch,
    tracked_worktree_clean: trackedWorktreeClean,
    counts: evaluation.counts,
    findings,
    requirements: evaluation.requirements,
    boundaries: {
      repository_reads_only: true,
      database_reads: false,
      database_writes: false,
      deployment_changes: false,
      goal_status_update: false,
    },
  };
  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const stateRelative = path
    .relative(REPO_ROOT, args.statePath)
    .replace(/\\/g, "/");
  const runPlan = {
    audit_version: AUDIT_VERSION,
    policy_version: TCGPLAYER_MARKET_COMPLETION_POLICY_V1,
    state_path: stateRelative,
    require_complete: args.requireComplete,
    commit_sha: report.commit_sha,
    branch: report.branch,
    tracked_worktree_clean: report.tracked_worktree_clean,
    boundaries: report.boundaries,
  };
  const files = {
    "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
    "summary.json": `${JSON.stringify(report, null, 2)}\n`,
    "REPORT.md": markdown(report),
  };
  const hashes = {};
  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(runDir, name), contents);
    hashes[name] = sha256(contents);
  }
  await fs.writeFile(
    path.join(runDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        status: report.status,
        completion_allowed: report.completion_allowed,
        counts: report.counts,
        findings: report.findings,
        artifact_root: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
      },
      null,
      2,
    )}\n`,
  );
  if (
    report.status === "invalid" ||
    (args.requireComplete && !report.completion_allowed)
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-market-completion] ${error.stack || error.message}`);
  process.exitCode = 1;
});
