import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceRollbackCanaryPlanV1,
  PINNED_ONE_PIECE_MANIFEST_SHA256,
  sha256,
  stableJson,
  verifyOnePieceRollbackCanaryPlanV1,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const READINESS_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "one_piece_canonical_catalog_readiness_v1",
  "2026-08-14T04-53-27-691Z",
);
const DEFAULT_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migration_drafts",
  "20260814010000_one_piece_canonical_import_staging_v1.sql",
);

function parseArgs(argv) {
  const args = {
    manifest: path.join(READINESS_DIR, "source_product_manifest.jsonl.gz"),
    readinessSummary: path.join(READINESS_DIR, "summary.json"),
    migrationDraft: DEFAULT_MIGRATION,
    outDir: path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "one_piece_canonical_import_staging_and_canary_v1",
      PINNED_ONE_PIECE_MANIFEST_SHA256.slice(0, 16),
    ),
  };
  for (const arg of argv) {
    if (arg.startsWith("--manifest=")) args.manifest = path.resolve(arg.slice(11));
    else if (arg.startsWith("--readiness-summary=")) {
      args.readinessSummary = path.resolve(arg.slice(20));
    } else if (arg.startsWith("--migration-draft=")) {
      args.migrationDraft = path.resolve(arg.slice(18));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
  }
  return args;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseManifest(logicalBuffer) {
  const body = logicalBuffer.toString("utf8");
  const lines = body.split(/\r?\n/).filter((line) => line.length > 0);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid manifest JSON on line ${index + 1}: ${error.message}`);
    }
  });
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
}

function buildReport(plan, selectedEvidence) {
  return `# One Piece Immutable Staging And Rollback Canary Plan V1

- Status: **planned only; no database connection or write**
- Producing commit: \`${plan.repository.commit_sha}\`
- Branch: \`${plan.repository.branch}\`
- Manifest logical SHA-256: \`${plan.manifest_logical_sha256}\`
- Migration draft SHA-256: \`${plan.migration_draft_sha256}\`
- Canary plan SHA-256: \`${plan.canary_plan_fingerprint_sha256}\`
- Selected group: **${plan.selected_group.source_group_name}** (\`${plan.selected_group.source_group_id}\`)
- Release date: \`${plan.selected_group.released_on.join(", ")}\`
- Language lanes: \`${plan.selected_group.languages.join(", ")}\`
- Authorized durable rows: \`0\`

## Preserved Rows

| Lane | Count |
|---|---:|
| Numbered singles | ${plan.counts.numbered_cards} |
| DON!! singles | ${plan.counts.don_cards} |
| Sealed products | ${plan.counts.sealed_product_candidates} |
| Quarantine | ${plan.counts.ambiguous_quarantined} |
| Future/presale holds | ${plan.counts.future_or_presale_holds} |
| Source price lanes | ${plan.counts.source_price_lanes} |
| Total source products | ${plan.counts.source_products} |

## Exact Evidence Slice

- File: \`selected_group_source_rows.jsonl.gz\`
- Logical SHA-256: \`${selectedEvidence.logical_sha256}\`
- Compressed SHA-256: \`${selectedEvidence.compressed_sha256}\`
- Rows: \`${selectedEvidence.row_count}\`

## Rollback Boundary

The next gate may execute the exact draft and these 21 rows only inside one
rollback-required transaction. It must independently prove the draft schema and
rows are absent afterward. This artifact does not apply the draft, connect to a
database, create canonical or sealed identities, publish data, access Storage,
change images, deploy code, or touch the active MTG worktree.
`;
}

export async function generateOnePieceCanaryArtifactsV1(args) {
  const [compressedManifest, readinessBody, migrationDraft] = await Promise.all([
    fs.readFile(args.manifest),
    fs.readFile(args.readinessSummary, "utf8"),
    fs.readFile(args.migrationDraft),
  ]);
  const logicalManifest = gunzipSync(compressedManifest);
  const manifestLogicalSha256 = sha256(logicalManifest);
  if (manifestLogicalSha256 !== PINNED_ONE_PIECE_MANIFEST_SHA256) {
    throw new Error("Manifest logical SHA-256 does not match the pinned One Piece authority");
  }
  const readiness = JSON.parse(readinessBody);
  if (readiness.manifest?.logical_sha256 !== manifestLogicalSha256) {
    throw new Error("Readiness summary and manifest fingerprint disagree");
  }
  if (readiness.integrity?.every_source_product_preserved_once !== true) {
    throw new Error("Readiness summary does not prove complete source preservation");
  }
  const manifestRows = parseManifest(logicalManifest);
  if (manifestRows.length !== readiness.manifest?.row_count) {
    throw new Error("Readiness summary and manifest row count disagree");
  }

  const repository = {
    commit_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
  };
  const migrationDraftSha256 = sha256(migrationDraft);
  const plan = buildOnePieceRollbackCanaryPlanV1({
    manifestRows,
    manifestLogicalSha256,
    migrationDraftSha256,
    repository,
    asOfDate: readiness.as_of_date,
  });
  const verification = verifyOnePieceRollbackCanaryPlanV1(plan, {
    manifestLogicalSha256,
    migrationDraftSha256,
  });
  if (!verification.valid) {
    throw new Error(`Canary plan failed validation: ${verification.errors.join("; ")}`);
  }

  await fs.mkdir(args.outDir, { recursive: true });
  const selectedLogical = Buffer.from(
    `${plan.staging_rows.map((row) => stableJson(row.payload)).join("\n")}\n`,
    "utf8",
  );
  const selectedCompressed = gzipSync(selectedLogical, { level: 9, mtime: 0 });
  const selectedEvidence = {
    row_count: plan.staging_rows.length,
    logical_bytes: selectedLogical.byteLength,
    compressed_bytes: selectedCompressed.byteLength,
    logical_sha256: sha256(selectedLogical),
    compressed_sha256: sha256(selectedCompressed),
  };
  const runPlan = {
    plan_version: plan.plan_version,
    repository,
    source_manifest: {
      file: path.relative(ROOT, args.manifest).replaceAll("\\", "/"),
      logical_sha256: manifestLogicalSha256,
      row_count: manifestRows.length,
    },
    migration_draft: {
      file: path.relative(ROOT, args.migrationDraft).replaceAll("\\", "/"),
      sha256: migrationDraftSha256,
      applied: false,
    },
    selected_group: plan.selected_group,
    mode: "local_artifact_generation_only",
    authorized_durable_rows: 0,
    boundaries: plan.boundaries,
  };
  const summary = {
    status: "ready_for_separately_authorized_rollback_only_database_canary",
    repository,
    manifest_logical_sha256: manifestLogicalSha256,
    migration_draft_sha256: migrationDraftSha256,
    canary_plan_fingerprint_sha256: plan.canary_plan_fingerprint_sha256,
    selected_group: plan.selected_group,
    counts: plan.counts,
    selected_evidence: selectedEvidence,
    validation: verification,
    database_connections: 0,
    database_writes: 0,
    authorized_durable_rows: 0,
    exact_next_gate:
      "separately authorize the exact draft and plan for one production transaction that must roll back and leave zero durable schema objects or rows",
  };

  const artifactBuffers = {};
  artifactBuffers["run_plan.json"] = await writeJson(
    path.join(args.outDir, "run_plan.json"),
    runPlan,
  );
  artifactBuffers["canary_plan.json"] = await writeJson(
    path.join(args.outDir, "canary_plan.json"),
    plan,
  );
  artifactBuffers["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"),
    summary,
  );
  await fs.writeFile(
    path.join(args.outDir, "selected_group_source_rows.jsonl.gz"),
    selectedCompressed,
  );
  artifactBuffers["selected_group_source_rows.jsonl.gz"] = selectedCompressed;
  const reportBody = Buffer.from(buildReport(plan, selectedEvidence), "utf8");
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody);
  artifactBuffers["REPORT.md"] = reportBody;
  const artifactHashes = {
    hash_algorithm: "sha256",
    artifacts: Object.fromEntries(
      Object.entries(artifactBuffers)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, body]) => [name, sha256(body)]),
    ),
  };
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), artifactHashes);
  return { out_dir: args.outDir, ...summary };
}

async function main() {
  const result = await generateOnePieceCanaryArtifactsV1(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
