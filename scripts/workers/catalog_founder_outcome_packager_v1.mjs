import fs from "node:fs/promises";
import path from "node:path";

import {
  buildCatalogFounderOutcomePackageV1,
  CATALOG_FOUNDER_OUTCOME_PACKAGE_VERSION,
  CATALOG_OUTCOME_WRITER_REGISTRY_V1,
} from "../../backend/operations/catalog_founder_outcome_v1.mjs";
import { operationsSha256V1 } from "../../backend/operations/operations_control_plane_v1.mjs";

function parseArgs(argv) {
  const options = {
    supervisorDir: null,
    outDir: null,
    sourceCommitSha: process.env.GITHUB_SHA ?? null,
    sourceRunId: process.env.GITHUB_RUN_ID ?? null,
  };
  for (const token of argv) {
    if (token.startsWith("--supervisor-dir=")) options.supervisorDir = path.resolve(token.slice(17));
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else if (token.startsWith("--source-commit-sha=")) options.sourceCommitSha = token.slice(20);
    else if (token.startsWith("--source-run-id=")) options.sourceRunId = token.slice(16);
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.supervisorDir || !options.outDir) {
    throw new Error("--supervisor-dir and --out-dir are required");
  }
  if (!/^[a-f0-9]{40}$/.test(String(options.sourceCommitSha ?? ""))) {
    throw new Error("A valid --source-commit-sha is required");
  }
  if (!/^\d+$/.test(String(options.sourceRunId ?? ""))) {
    throw new Error("A numeric --source-run-id is required");
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function expectedArtifactHash(artifactHashes, artifactName) {
  if (Array.isArray(artifactHashes?.artifacts)) {
    return artifactHashes.artifacts.find((row) => row.path === artifactName)?.sha256 ?? null;
  }
  return artifactHashes?.[artifactName] ?? null;
}

async function readVerifiedJson(directory, artifactName, artifactHashes) {
  const bytes = await fs.readFile(path.join(directory, artifactName));
  const expected = expectedArtifactHash(artifactHashes, artifactName);
  if (!/^[a-f0-9]{64}$/.test(String(expected ?? "")) ||
      operationsSha256V1(bytes) !== expected) {
    throw new Error(`Catalog writer artifact hash mismatch: ${artifactName}`);
  }
  return JSON.parse(bytes.toString("utf8"));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [plan, results] = await Promise.all([
    readJson(path.join(options.supervisorDir, "supervisor_plan.json")),
    readJson(path.join(options.supervisorDir, "execution_results.json")),
  ]);
  if (plan.mode !== "plan" || plan.expected_head_sha !== options.sourceCommitSha) {
    throw new Error("Catalog outcome packages require an exact source-commit plan run");
  }
  const resultByTarget = new Map(results.map((result) => [result.target, result]));
  const packages = [];
  const held = [];
  for (const target of plan.targets ?? []) {
    const writer = CATALOG_OUTCOME_WRITER_REGISTRY_V1[target.writer_key];
    if (!writer || target.founder_outcome_eligible !== true) {
      held.push({ target_key: target.key, reason: "writer_not_outcome_enabled" });
      continue;
    }
    const result = resultByTarget.get(target.key);
    if (!result || Number(result.exit_code) !== 0) {
      held.push({
        target_key: target.key,
        reason: "writer_preflight_failed",
        exit_code: result?.exit_code ?? null,
      });
      continue;
    }
    try {
      const artifactHashes = await readJson(
        path.join(result.artifact_directory, "artifact_hashes.json"),
      );
      const summary = await readVerifiedJson(
        result.artifact_directory,
        writer.summary_file,
        artifactHashes,
      );
      const preflightProof = writer.preflight_file === writer.summary_file
        ? summary
        : await readVerifiedJson(
          result.artifact_directory,
          writer.preflight_file,
          artifactHashes,
        );
      packages.push(buildCatalogFounderOutcomePackageV1({
        target,
        result,
        summary,
        preflightProof,
        artifactHashes,
        sourceCommitSha: options.sourceCommitSha,
        sourceRunId: options.sourceRunId,
        asOf: plan.as_of,
      }));
    } catch (error) {
      held.push({
        target_key: target.key,
        reason: "writer_preflight_not_executable",
        error_class: error instanceof Error ? error.name : "UnknownError",
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  packages.sort((left, right) => left.target_key.localeCompare(right.target_key));
  held.sort((left, right) => left.target_key.localeCompare(right.target_key));
  const packagesBody = await writeJson(
    path.join(options.outDir, "founder_outcome_packages.json"),
    packages,
  );
  const heldBody = await writeJson(path.join(options.outDir, "held_targets.json"), held);
  const summary = {
    version: CATALOG_FOUNDER_OUTCOME_PACKAGE_VERSION,
    source_commit_sha: options.sourceCommitSha,
    source_run_id: options.sourceRunId,
    selected_target_count: plan.targets?.length ?? 0,
    executable_outcome_count: packages.length,
    held_target_count: held.length,
    canonical_writes: false,
    database_writes: false,
  };
  const summaryBody = await writeJson(path.join(options.outDir, "summary.json"), summary);
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    "founder_outcome_packages.json": operationsSha256V1(packagesBody),
    "held_targets.json": operationsSha256V1(heldBody),
    "summary.json": operationsSha256V1(summaryBody),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
