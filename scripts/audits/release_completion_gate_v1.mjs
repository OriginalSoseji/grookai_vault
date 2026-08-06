import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "release_completion_v1",
  "completion_manifest_v1.json",
);
const ALLOWED_STATUSES = new Set(["proven", "partial", "in_progress", "open"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function evaluateReleaseCompletionManifestV1(
  manifestPath = DEFAULT_MANIFEST_PATH,
) {
  const absoluteManifestPath = path.resolve(manifestPath);
  const manifestRaw = await fs.readFile(absoluteManifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const findings = [];

  if (
    manifest.schema_version !==
    "GROOKAI_8_WEEK_RELEASE_COMPLETION_MANIFEST_V1"
  ) {
    findings.push("invalid_schema_version");
  }

  const planPath = path.resolve(REPO_ROOT, String(manifest.plan?.repository_path ?? ""));
  let actualPlanHash = null;
  try {
    actualPlanHash = sha256(await fs.readFile(planPath));
    if (actualPlanHash !== manifest.plan?.sha256) {
      findings.push("plan_fingerprint_mismatch");
    }
  } catch {
    findings.push("plan_file_missing");
  }

  const gates = Array.isArray(manifest.gates) ? manifest.gates : [];
  if (gates.length === 0) findings.push("no_gates_defined");
  const gateIds = new Set();
  const missingEvidencePaths = [];
  for (const gate of gates) {
    const id = String(gate?.id ?? "").trim();
    if (!id) findings.push("gate_id_missing");
    if (gateIds.has(id)) findings.push(`duplicate_gate_id:${id}`);
    gateIds.add(id);
    if (!ALLOWED_STATUSES.has(gate?.status)) {
      findings.push(`invalid_gate_status:${id}`);
    }
    for (const evidencePath of gate?.evidence ?? []) {
      const normalized = String(evidencePath ?? "").trim();
      if (!normalized) {
        findings.push(`empty_evidence_path:${id}`);
        continue;
      }
      try {
        await fs.access(path.resolve(REPO_ROOT, normalized));
      } catch {
        missingEvidencePaths.push({ gate_id: id, path: normalized });
      }
    }
    if (
      gate?.status === "proven" &&
      (!Array.isArray(gate.evidence) || gate.evidence.length === 0)
    ) {
      findings.push(`proven_gate_without_evidence:${id}`);
    }
  }

  if (missingEvidencePaths.length > 0) {
    findings.push("missing_evidence_paths");
  }

  const nonProvenGates = gates
    .filter((gate) => gate.status !== "proven")
    .map((gate) => gate.id);
  const calculatedCompletionAllowed =
    findings.length === 0 && nonProvenGates.length === 0;
  if (Boolean(manifest.completion_allowed) !== calculatedCompletionAllowed) {
    findings.push("completion_flag_does_not_match_gate_truth");
  }
  if (
    (manifest.status === "COMPLETE") !== calculatedCompletionAllowed
  ) {
    findings.push("manifest_status_does_not_match_gate_truth");
  }

  return {
    audit_version: "GROOKAI_8_WEEK_RELEASE_COMPLETION_GATE_V1",
    manifest_path: path.relative(REPO_ROOT, absoluteManifestPath).replaceAll("\\", "/"),
    manifest_sha256: sha256(manifestRaw),
    plan_sha256_expected: manifest.plan?.sha256 ?? null,
    plan_sha256_actual: actualPlanHash,
    gate_count: gates.length,
    proven_gate_count: gates.length - nonProvenGates.length,
    non_proven_gate_ids: nonProvenGates,
    missing_evidence_paths: missingEvidencePaths,
    findings,
    completion_allowed: calculatedCompletionAllowed,
    status: calculatedCompletionAllowed ? "COMPLETE" : "IN_PROGRESS",
  };
}

async function main() {
  const manifestArgument = process.argv.find((argument) =>
    argument.startsWith("--manifest="),
  );
  const manifestPath = manifestArgument
    ? manifestArgument.slice("--manifest=".length)
    : DEFAULT_MANIFEST_PATH;
  const result = await evaluateReleaseCompletionManifestV1(manifestPath);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.findings.length > 0) process.exitCode = 1;
  if (process.argv.includes("--require-complete") && !result.completion_allowed) {
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(`[release-completion] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
