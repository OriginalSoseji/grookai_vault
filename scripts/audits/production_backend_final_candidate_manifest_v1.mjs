import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

export const PRODUCTION_BACKEND_FINAL_CANDIDATE_MANIFEST_V1 =
  "PRODUCTION_BACKEND_FINAL_CANDIDATE_MANIFEST_V1";

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REQUIRED_PREREQUISITES = Object.freeze([
  "supabase_security",
  "supabase_capacity",
  "backup_restore",
  "load_and_failure",
  "same_candidate_clients",
]);
const REQUIRED_WORKLOADS = Object.freeze([
  "control_plane",
  "tcgplayer_source",
  "mee",
  "pricing_publication",
  "new_set_discovery",
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values) {
  return new Set(values).size === values.length;
}

export function evaluateProductionBackendFinalCandidateManifestV1(manifest) {
  const findings = [];
  const sourceSha = text(manifest?.candidate?.source_commit_sha);

  if (
    manifest?.schema_version !== PRODUCTION_BACKEND_FINAL_CANDIDATE_MANIFEST_V1
  ) {
    findings.push("invalid_schema_version");
  }
  if (!SHA40.test(sourceSha)) findings.push("candidate_source_commit_invalid");
  if (manifest?.candidate?.tracked_worktree_clean !== true) {
    findings.push("candidate_worktree_not_clean");
  }
  if (!text(manifest?.candidate?.branch)) findings.push("candidate_branch_missing");
  if (!text(manifest?.candidate?.frozen_at)) findings.push("candidate_frozen_at_missing");

  for (const prerequisite of REQUIRED_PREREQUISITES) {
    if (manifest?.prerequisites?.[prerequisite] !== "passed") {
      findings.push(`prerequisite_${prerequisite}_not_passed`);
    }
  }

  const migrationHead = text(manifest?.database?.migration_ledger_head);
  if (!/^\d{14}$/.test(migrationHead)) findings.push("migration_ledger_head_invalid");
  const migrations = Array.isArray(manifest?.database?.candidate_migrations)
    ? manifest.database.candidate_migrations
    : [];
  const migrationVersions = migrations.map((row) => text(row?.version));
  if (!unique(migrationVersions)) findings.push("duplicate_candidate_migration");
  for (const row of migrations) {
    if (!/^\d{14}$/.test(text(row?.version))) {
      findings.push("candidate_migration_version_invalid");
    }
    if (!SHA256.test(text(row?.sha256))) {
      findings.push(`candidate_migration_hash_invalid:${text(row?.version)}`);
    }
    if (!["reversible", "forward_fix_only", "no_schema_change"].includes(row?.rollback_class)) {
      findings.push(`candidate_migration_rollback_class_invalid:${text(row?.version)}`);
    }
    if (!text(row?.rollback_proof)) {
      findings.push(`candidate_migration_rollback_proof_missing:${text(row?.version)}`);
    }
  }

  for (const workload of REQUIRED_WORKLOADS) {
    const row = manifest?.workloads?.[workload];
    if (!row) {
      findings.push(`workload_${workload}_missing`);
      continue;
    }
    if (text(row.expected_commit_sha) !== sourceSha) {
      findings.push(`workload_${workload}_commit_mismatch`);
    }
    if (!text(row.rollback_unit)) {
      findings.push(`workload_${workload}_rollback_unit_missing`);
    }
  }

  const rollback = manifest?.rollback;
  if (!rollback || typeof rollback !== "object") {
    findings.push("rollback_manifest_missing");
  } else {
    if (!SHA40.test(text(rollback.previous_source_commit_sha))) {
      findings.push("rollback_previous_source_commit_invalid");
    }
    if (!text(rollback.previous_web_deployment_id)) {
      findings.push("rollback_previous_web_deployment_missing");
    }
    if (!text(rollback.previous_android_build_id)) {
      findings.push("rollback_previous_android_build_missing");
    }
    if (!text(rollback.previous_ios_build_id)) {
      findings.push("rollback_previous_ios_build_missing");
    }
    if (rollback.database_restore_required !== false) {
      findings.push("rollback_requires_database_restore");
    }
    if (rollback.tested !== true) findings.push("rollback_not_tested");
  }

  if (manifest?.boundaries?.public_rollout !== false) {
    findings.push("public_rollout_boundary_not_frozen");
  }
  if (manifest?.boundaries?.destructive_data_action !== false) {
    findings.push("destructive_data_boundary_not_frozen");
  }

  return {
    policy_version: PRODUCTION_BACKEND_FINAL_CANDIDATE_MANIFEST_V1,
    status: findings.length === 0 ? "ready_for_canary" : "blocked",
    candidate_source_commit_sha: sourceSha || null,
    findings,
    canary_start_allowed: findings.length === 0,
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
  const result = evaluateProductionBackendFinalCandidateManifestV1(manifest);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (process.argv.includes("--require-ready") && !result.canary_start_allowed) {
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(`[production-final-candidate] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
