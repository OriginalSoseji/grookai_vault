import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  buildOnePieceSealedIdentityReviewPlanV1,
  validateOnePieceSealedIdentityReviewPlanV1,
} from "../../backend/pricing/one_piece_sealed_identity_review_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANDIDATE_PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_sealed_candidate_v1", "frozen_plan_v1",
  "candidate_plan.json.gz");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_identity_review_v1", "frozen_offline_review_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function report(summary) {
  const forms = Object.entries(summary.counts.package_forms)
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  return `${[
    "# One Piece Sealed Identity Review V1",
    "",
    `- Status: \`${summary.status}\``,
    `- Producer commit: \`${summary.repository.commit_sha}\``,
    `- Candidate rows preserved: \`${summary.counts.candidate_rows}\``,
    `- Proposed family keys: \`${summary.counts.proposed_family_keys}\``,
    `- Package-form proposals unresolved: \`${summary.counts.unresolved_package_forms}\``,
    `- Current English structured-first queue: \`${summary.counts.current_english_structured_first}\``,
    `- Held or unresolved queue: \`${summary.counts.held_or_unresolved}\``,
    "- Database, Storage, network, pricing, publication, and app writes: `0`",
    "",
    "## Proposed Package Forms",
    "",
    ...forms.map(([form, count]) => `- \`${form}\`: ${count}`),
    "",
    "## Authority Boundary",
    "",
    "Every family and variant value is a deterministic review proposal derived from exact source text. No proposal is canonical, mapped, priced, published, or app-visible. Source-name matching alone does not satisfy the sealed promotion contract.",
    "",
    "## Exact Next Gate",
    "",
    "Acquire official English product-page evidence, bind it to these proposals, and produce an image-assisted human review queue for the residual rows. Do not promote any family or variant until exact review evidence exists.",
  ].join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean review-plan producer");
  }
  const candidatePlanBody = await fs.readFile(CANDIDATE_PLAN_PATH);
  const candidatePlan = JSON.parse(gunzipSync(candidatePlanBody));
  const plan = buildOnePieceSealedIdentityReviewPlanV1({
    repository,
    candidatePlan,
  });
  const validation = validateOnePieceSealedIdentityReviewPlanV1(plan);
  if (!validation.valid) {
    throw new Error(`Sealed identity review plan failed: ${validation.findings.join(",")}`);
  }
  const rowsBody = `${plan.payload.rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const rowsGzip = gzipSync(Buffer.from(rowsBody), { level: 9, mtime: 0 });
  const summary = {
    version: plan.version,
    recorded_at: new Date().toISOString(),
    status: "sealed_identity_review_plan_passed_no_writes",
    repository,
    candidate_plan_fingerprint_sha256: plan.candidate_plan_fingerprint_sha256,
    candidate_payload_fingerprint_sha256:
      plan.candidate_payload_fingerprint_sha256,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    counts: plan.counts,
    findings: validation.findings,
    boundaries: plan.boundaries,
    exact_next_gate:
      "official product-page authority acquisition and residual human review packet",
  };
  const artifacts = new Map([
    ["summary.json", Buffer.from(`${JSON.stringify(summary, null, 2)}\n`)],
    ["review_rows.jsonl.gz", rowsGzip],
    ["REPORT.md", Buffer.from(report(summary))],
  ]);
  await fs.mkdir(args.outDir, { recursive: true });
  for (const [name, body] of artifacts) {
    await fs.writeFile(path.join(args.outDir, name), body);
  }
  const hashBody = `${JSON.stringify({
    hash_algorithm: "sha256",
    producer_commit_sha: repository.commit_sha,
    bound_inputs: [{
      path: path.relative(ROOT, CANDIDATE_PLAN_PATH).replaceAll("\\", "/"),
      sha256: sha256(candidatePlanBody),
    }],
    artifacts: Object.fromEntries([...artifacts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, body]) => [name, { sha256: sha256(body), bytes: body.length }])),
  }, null, 2)}\n`;
  await fs.writeFile(path.join(args.outDir, "artifact_hashes.json"), hashBody);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
