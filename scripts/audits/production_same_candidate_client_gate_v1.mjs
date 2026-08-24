import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export const PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1 =
  "PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1";

export const REQUIRED_CLIENT_JOURNEYS_V1 = Object.freeze([
  "authentication",
  "search",
  "pricing",
  "vault",
  "images",
  "sharing",
  "memory_links",
]);

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const PLATFORMS = Object.freeze(["web", "android", "ios"]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function timestamp(value) {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function add(findings, code) {
  if (!findings.includes(code)) findings.push(code);
}

function sourceCommitFor(manifest, platform) {
  return text(manifest?.artifacts?.[platform]?.source_commit_sha);
}

export async function evaluateProductionSameCandidateClientGateV1(
  manifest,
  { repoRoot = REPO_ROOT, verifyEvidencePaths = true } = {},
) {
  const findings = [];
  const candidateSha = text(manifest?.candidate?.source_commit_sha);
  const frozenAt = timestamp(manifest?.candidate?.frozen_at);

  if (manifest?.schema_version !== PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1) {
    add(findings, "invalid_schema_version");
  }
  if (!SHA40.test(candidateSha)) add(findings, "invalid_candidate_source_commit");
  if (frozenAt === null) add(findings, "invalid_candidate_frozen_at");
  if (manifest?.boundaries?.production_database_writes !== false) {
    add(findings, "production_database_write_boundary_not_frozen");
  }
  if (manifest?.boundaries?.public_rollout !== false) {
    add(findings, "public_rollout_boundary_not_frozen");
  }

  const missingEvidencePaths = [];
  for (const platform of PLATFORMS) {
    const artifact = manifest?.artifacts?.[platform];
    if (!artifact || typeof artifact !== "object") {
      add(findings, `missing_${platform}_artifact`);
      continue;
    }
    if (sourceCommitFor(manifest, platform) !== candidateSha) {
      add(findings, `${platform}_source_commit_mismatch`);
    }
    if (!text(artifact.build_id)) add(findings, `${platform}_build_id_missing`);
    if (timestamp(artifact.built_at) === null) {
      add(findings, `${platform}_built_at_invalid`);
    }
    if (platform !== "web" && !SHA256.test(text(artifact.binary_sha256))) {
      add(findings, `${platform}_binary_sha256_invalid`);
    }
    if (platform === "web" && !text(artifact.deployment_url)) {
      add(findings, "web_deployment_url_missing");
    }

    const journey = manifest?.journeys?.[platform];
    if (!journey || typeof journey !== "object") {
      add(findings, `missing_${platform}_journey`);
      continue;
    }
    if (text(journey.source_commit_sha) !== candidateSha) {
      add(findings, `${platform}_journey_source_commit_mismatch`);
    }
    const observedAt = timestamp(journey.observed_at);
    if (observedAt === null) {
      add(findings, `${platform}_journey_observed_at_invalid`);
    } else if (frozenAt !== null && observedAt < frozenAt) {
      add(findings, `${platform}_journey_predates_candidate`);
    }
    if (journey.database_reconciliation !== "passed") {
      add(findings, `${platform}_database_reconciliation_not_passed`);
    }
    for (const requiredJourney of REQUIRED_CLIENT_JOURNEYS_V1) {
      if (journey?.checks?.[requiredJourney] !== "passed") {
        add(findings, `${platform}_${requiredJourney}_not_passed`);
      }
    }

    const evidencePaths = Array.isArray(journey.evidence_paths)
      ? journey.evidence_paths.map(text).filter(Boolean)
      : [];
    if (evidencePaths.length === 0) {
      add(findings, `${platform}_evidence_missing`);
    }
    if (verifyEvidencePaths) {
      for (const evidencePath of evidencePaths) {
        try {
          await fs.access(path.resolve(repoRoot, evidencePath));
        } catch {
          missingEvidencePaths.push({ platform, path: evidencePath });
        }
      }
    }
  }

  if (missingEvidencePaths.length > 0) add(findings, "evidence_paths_missing");

  return {
    policy_version: PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1,
    status: findings.length === 0 ? "passed" : "blocked",
    candidate_source_commit_sha: candidateSha || null,
    required_platforms: [...PLATFORMS],
    required_journeys: [...REQUIRED_CLIENT_JOURNEYS_V1],
    missing_evidence_paths: missingEvidencePaths,
    findings,
    gate_passed: findings.length === 0,
  };
}

function argument(name) {
  return process.argv
    .find((entry) => entry.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

async function main() {
  const manifestPath = argument("manifest");
  if (!manifestPath) throw new Error("--manifest is required");
  const manifest = JSON.parse(await fs.readFile(path.resolve(manifestPath), "utf8"));
  const result = await evaluateProductionSameCandidateClientGateV1(manifest);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (process.argv.includes("--require-pass") && !result.gate_passed) {
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(`[same-candidate-client-gate] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
