import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  validateOnePieceSealedReviewDecisionExportV1,
} from "../../backend/pricing/one_piece_sealed_review_decision_validation_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKET_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_image_review_packet_v1", "frozen_review_packet_v1");
const DEFAULT_AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_review_decision_validation_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = { decisionsFile: "", expectedHeadSha: "", outDir: "" };
  for (const arg of argv) {
    if (arg.startsWith("--decisions-file=")) {
      args.decisionsFile = path.resolve(arg.slice("--decisions-file=".length));
    } else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!args.decisionsFile) throw new Error("--decisions-file=<path> is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function sha256(body) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

async function verifyArtifactHashes(directory) {
  const manifest = JSON.parse(await fs.readFile(
    path.join(directory, "artifact_hashes.json"), "utf8"));
  for (const [name, expected] of Object.entries(manifest.artifacts)) {
    const body = await fs.readFile(path.join(directory, name));
    if (sha256(body) !== expected.sha256 || body.length !== expected.bytes) {
      throw new Error(`Frozen packet artifact mismatch: ${name}`);
    }
  }
}

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

function renderReport(summary) {
  return `# One Piece Sealed Review Decision Validation V1

- Status: \`${summary.status}\`
- Valid: \`${summary.valid}\`
- Complete: \`${summary.complete}\`
- Packet fingerprint: \`${summary.packet_fingerprint_sha256}\`
- Decision export fingerprint: \`${summary.decision_export_fingerprint_sha256}\`
- Expected rows: ${summary.counts.expected_review_items}
- Exported rows: ${summary.counts.exported_decisions}
- Unreviewed rows: ${summary.counts.decisions.unreviewed}
- Exact visual confirmations: ${summary.counts.exact_visual_confirmations}
- Findings: ${summary.findings.length}
- Database writes: 0
- Storage writes: 0
- Promotion authority: 0

## Next Gate

${summary.exact_next_gate}
`;
}

const args = parseArgs(process.argv.slice(2));
const head = git("rev-parse", "HEAD");
if (head !== args.expectedHeadSha) {
  throw new Error(`HEAD mismatch: expected ${args.expectedHeadSha}, found ${head}`);
}
if (git("status", "--porcelain")) {
  throw new Error("Tracked worktree must be clean before validation");
}

await verifyArtifactHashes(PACKET_DIR);
const packetSummary = JSON.parse(await fs.readFile(
  path.join(PACKET_DIR, "summary.json"), "utf8"));
const reviewItems = gunzipSync(await fs.readFile(
  path.join(PACKET_DIR, "review_items.jsonl.gz"))).toString("utf8")
  .trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const rawDecisionExport = await fs.readFile(args.decisionsFile);
const decisionExport = JSON.parse(rawDecisionExport.toString("utf8"));
const validation = validateOnePieceSealedReviewDecisionExportV1({
  packetSummary,
  reviewItems,
  decisionExport,
});
const outDir = args.outDir || path.join(DEFAULT_AUDIT_ROOT, timestamp());
if (!args.outDir) await fs.mkdir(DEFAULT_AUDIT_ROOT, { recursive: true });
await fs.mkdir(outDir, { recursive: false });

const summary = {
  ...validation,
  recorded_at: new Date().toISOString(),
  repository: {
    commit_sha: head,
    branch: git("branch", "--show-current"),
    tracked_worktree_clean: true,
  },
  input: {
    decisions_file_name: path.basename(args.decisionsFile),
    decisions_file_sha256: sha256(rawDecisionExport),
  },
};
const summaryBody = `${JSON.stringify(summary, null, 2)}\n`;
const reportBody = renderReport(summary);
const reconciledRows = decisionExport.decisions ?? [];
const reconciledBody = gzipSync(`${reconciledRows.map((row) =>
  JSON.stringify(row)).join("\n")}\n`);
await fs.writeFile(path.join(outDir, "summary.json"), summaryBody);
await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody);
await fs.writeFile(path.join(outDir, "reconciled_decisions.jsonl.gz"),
  reconciledBody);

const artifacts = {};
for (const name of ["summary.json", "REPORT.md", "reconciled_decisions.jsonl.gz"]) {
  const body = await fs.readFile(path.join(outDir, name));
  artifacts[name] = { sha256: sha256(body), bytes: body.length };
}
await fs.writeFile(path.join(outDir, "artifact_hashes.json"),
  `${JSON.stringify({
    hash_algorithm: "sha256",
    producer_commit_sha: head,
    bound_inputs: {
      packet_fingerprint_sha256: packetSummary.packet_fingerprint_sha256,
      decisions_file_sha256: sha256(rawDecisionExport),
    },
    artifacts,
  }, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
if (!summary.valid) process.exitCode = 1;
