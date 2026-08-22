import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyTcgplayerMarketIntegrationPathV1,
  evaluateTcgplayerMarketPostCanaryReadinessV1,
  summarizeTcgplayerMarketIntegrationPathsV1,
  TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1,
  TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1,
} from "../../backend/pricing/tcgplayer_market_post_canary_readiness_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..");
const AUDIT_VERSION = "TCGPLAYER_MARKET_POST_CANARY_INTEGRATION_INVENTORY_V1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "post_canary_integration_inventory",
);

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  return {
    mainRef: value("main-ref") || "origin/main",
    pricingRef:
      value("pricing-ref") || "origin/pricing/mee-productization-v1",
    outRoot: path.resolve(value("out-root") || DEFAULT_OUT_ROOT),
  };
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: options.encoding ?? "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseNameStatus(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const fields = line.split("\t");
      const status = fields[0];
      const filePath = fields.at(-1);
      return {
        status,
        path: filePath,
        previous_path: fields.length > 2 ? fields[1] : null,
        classification: classifyTcgplayerMarketIntegrationPathV1(filePath),
      };
    });
}

function parseCommits(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [sha, subject] = line.split("\u0000");
      return { sha, subject };
    });
}

function mergeTree(mainRef, pricingRef) {
  const result = spawnSync(
    "git",
    ["merge-tree", "--write-tree", "--name-only", mainRef, pricingRef],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const conflictFiles = [
    ...output.matchAll(/CONFLICT \([^)]*\): .* in (.+)$/gm),
  ]
    .map((match) => match[1].trim())
    .filter(Boolean)
    .sort();
  return {
    clean: result.status === 0,
    exit_code: result.status,
    conflict_files: [...new Set(conflictFiles)],
  };
}

function markdown(summary, conflictFiles, migrationResults) {
  const categoryRows = Object.entries(summary.integration_file_counts)
    .map(([category, count]) => `| ${category} | ${count} |`)
    .join("\n");
  const migrationRows = migrationResults
    .map(
      (migration) =>
        `| \`${migration.id}\` | ${migration.exists ? "yes" : "no"} | ${
          migration.hash_matches ? "yes" : "no"
        } | \`${migration.sha256 ?? ""}\` |`,
    )
    .join("\n");
  const conflictRows = conflictFiles.length
    ? conflictFiles.map((filePath) => `- \`${filePath}\``).join("\n")
    : "- none";

  return `# TCGPlayer Market Post-Canary Integration Inventory

- Audit: \`${AUDIT_VERSION}\`
- Status: \`${summary.status}\`
- Current main: \`${summary.main_sha}\`
- Pricing branch: \`${summary.pricing_sha}\`
- Merge base: \`${summary.merge_base_sha}\`
- Pricing-only commits: \`${summary.pricing_only_commit_count}\`
- Main-only commits: \`${summary.main_only_commit_count}\`
- Manual merge conflicts: \`${summary.manual_conflict_count}\`

## Decision

A wholesale merge is not authorized. Integrate reviewed Production V1 files
from current main, resolve every conflict explicitly, and rerun all release
gates from the resulting candidate.

## File Inventory

| Classification | Files |
| --- | ---: |
${categoryRows}

## Pending Migration Package

| Migration | Exists | Hash matches | SHA-256 |
| --- | --- | --- | --- |
${migrationRows}

The original two-migration manifest remains immutable historical evidence.
The post-canary candidate must explicitly include the later parent-summary
runtime repair as a third pending migration.

## Manual Conflict Files

${conflictRows}

## Product Surface Contract

- Required surfaces: \`${summary.required_surface_count}\`
- Captures are deployment evidence and remain pending until the integrated
  clients are deployed.

## Boundaries

- database writes: \`false\`
- production deployment: \`false\`
- migration apply: \`false\`
- publication activation: \`false\`
- canary configuration changes: \`false\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mainSha = git(["rev-parse", args.mainRef]);
  const pricingSha = git(["rev-parse", args.pricingRef]);
  const mergeBaseSha = git(["merge-base", args.mainRef, args.pricingRef]);
  const trackedStatus = git(["status", "--short", "--untracked-files=no"]);
  const files = parseNameStatus(
    git(["diff", "--name-status", `${args.mainRef}...${args.pricingRef}`]),
  );
  const pricingOnlyCommits = parseCommits(
    git([
      "log",
      "--format=%H%x00%s",
      "--no-merges",
      `${args.mainRef}..${args.pricingRef}`,
    ]),
  );
  const mainOnlyCommits = parseCommits(
    git([
      "log",
      "--format=%H%x00%s",
      "--no-merges",
      `${args.pricingRef}..${args.mainRef}`,
    ]),
  );
  const merge = mergeTree(args.mainRef, args.pricingRef);

  const migrationResults = TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1.map(
    (migration) => {
      try {
        const content = execFileSync(
          "git",
          ["show", `${args.pricingRef}:${migration.path}`],
          {
            cwd: REPO_ROOT,
            maxBuffer: 32 * 1024 * 1024,
          },
        );
        const actualHash = sha256(content);
        return {
          ...migration,
          exists: true,
          actual_sha256: actualHash,
          hash_matches: actualHash === migration.sha256,
        };
      } catch {
        return {
          ...migration,
          exists: false,
          actual_sha256: null,
          hash_matches: false,
        };
      }
    },
  );

  const evaluation = evaluateTcgplayerMarketPostCanaryReadinessV1({
    migrationResults,
    conflictFiles: merge.conflict_files,
    requiredSurfaces: TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1,
  });
  const createdAt = new Date().toISOString();
  const outDir = path.join(args.outRoot, stamp());
  await fs.mkdir(outDir, { recursive: true });

  const runPlan = {
    audit_version: AUDIT_VERSION,
    created_at: createdAt,
    main_ref: args.mainRef,
    main_sha: mainSha,
    pricing_ref: args.pricingRef,
    pricing_sha: pricingSha,
    merge_base_sha: mergeBaseSha,
    producing_worktree_tracked_clean: !trackedStatus,
    boundaries: evaluation.boundaries,
  };
  const summary = {
    ...evaluation,
    audit_version: AUDIT_VERSION,
    created_at: createdAt,
    main_sha: mainSha,
    pricing_sha: pricingSha,
    merge_base_sha: mergeBaseSha,
    pricing_only_commit_count: pricingOnlyCommits.length,
    main_only_commit_count: mainOnlyCommits.length,
    integration_file_count: files.length,
    integration_file_counts:
      summarizeTcgplayerMarketIntegrationPathsV1(files),
    required_surface_count:
      TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1.length,
    migration_results: migrationResults,
  };

  const artifacts = {
    "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
    "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
    "integration_files.jsonl": files.length
      ? `${files.map((entry) => JSON.stringify(entry)).join("\n")}\n`
      : "",
    "pricing_only_commits.jsonl": pricingOnlyCommits.length
      ? `${pricingOnlyCommits.map((entry) => JSON.stringify(entry)).join("\n")}\n`
      : "",
    "main_only_commits.jsonl": mainOnlyCommits.length
      ? `${mainOnlyCommits.map((entry) => JSON.stringify(entry)).join("\n")}\n`
      : "",
    "merge_conflicts.json": `${JSON.stringify(merge, null, 2)}\n`,
    "surface_checklist.json": `${JSON.stringify(
      {
        schema_version: "TCGPLAYER_MARKET_PRODUCT_SURFACE_CHECKLIST_V1",
        required_surfaces: TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1,
        capture_status: "pending_deployment",
      },
      null,
      2,
    )}\n`,
    "REPORT.md": markdown(summary, merge.conflict_files, migrationResults),
  };
  for (const [fileName, content] of Object.entries(artifacts)) {
    await fs.writeFile(path.join(outDir, fileName), content);
  }
  const hashes = {};
  for (const [fileName, content] of Object.entries(artifacts)) {
    hashes[fileName] = sha256(content);
  }
  await fs.writeFile(
    path.join(outDir, "artifact_hashes.json"),
    `${JSON.stringify({ algorithm: "sha256", files: hashes }, null, 2)}\n`,
  );
  console.log(
    JSON.stringify({ ...summary, artifact_root: outDir }, null, 2),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
