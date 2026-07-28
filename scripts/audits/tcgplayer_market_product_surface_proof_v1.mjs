import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerMarketProductSurfaceProofV1,
  TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1,
} from "../../backend/pricing/tcgplayer_market_product_surface_proof_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION = "TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_AUDIT_V1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "product_surface_proof",
);

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  return {
    captureManifest: value("capture-manifest"),
    expectedCommitSha: value("expected-commit-sha").toLowerCase(),
    deployedCommitSha: value("deployed-commit-sha").toLowerCase(),
    vaultReadback: value("vault-readback"),
    outRoot: path.resolve(value("out-root") || DEFAULT_OUT_ROOT),
    requirePass: argv.includes("--require-pass"),
  };
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
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

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))].sort();
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function materializeCaptures(manifest, manifestPath, outDir) {
  const captureRoot = path.dirname(manifestPath);
  const outputCaptureDir = path.join(outDir, "captures");
  await fs.mkdir(outputCaptureDir, { recursive: true });

  const materialized = [];
  for (const capture of manifest.captures ?? []) {
    const captureId = clean(capture.capture_id);
    if (!captureId || !/^[a-zA-Z0-9_-]+$/.test(captureId)) {
      materialized.push(capture);
      continue;
    }

    const screenshotSource = path.resolve(
      captureRoot,
      clean(capture.screenshot_path),
    );
    const renderEvidenceSource = path.resolve(
      captureRoot,
      clean(capture.render_evidence_path),
    );
    const screenshotBuffer = await fs.readFile(screenshotSource);
    const renderEvidenceBuffer = await fs.readFile(renderEvidenceSource);
    const renderEvidence = JSON.parse(renderEvidenceBuffer.toString("utf8"));
    const renderEvidenceIntegrity =
      clean(renderEvidence.capture_id) === captureId &&
      clean(renderEvidence.surface_id) === clean(capture.surface_id) &&
      clean(renderEvidence.client) === clean(capture.client);
    const screenshotExtension =
      path.extname(screenshotSource).toLowerCase() || ".png";
    const screenshotTarget = path.join(
      outputCaptureDir,
      `${captureId}${screenshotExtension}`,
    );
    const renderEvidenceTarget = path.join(
      outputCaptureDir,
      `${captureId}.render.json`,
    );
    await fs.copyFile(screenshotSource, screenshotTarget);
    await fs.copyFile(renderEvidenceSource, renderEvidenceTarget);

    materialized.push({
      ...capture,
      authenticated: renderEvidence.authenticated === true,
      proof_kind: clean(renderEvidence.proof_kind),
      route: clean(renderEvidence.route),
      captured_at: clean(renderEvidence.captured_at),
      card_print_id: clean(renderEvidence.card_print_id),
      card_printing_id: clean(renderEvidence.card_printing_id) || null,
      rendered: renderEvidence.rendered ?? null,
      screenshot_path: path
        .relative(outDir, screenshotTarget)
        .replaceAll("\\", "/"),
      screenshot_sha256: sha256(screenshotBuffer),
      render_evidence_path: path
        .relative(outDir, renderEvidenceTarget)
        .replaceAll("\\", "/"),
      render_evidence_sha256: sha256(renderEvidenceBuffer),
      render_evidence_integrity: renderEvidenceIntegrity,
    });
  }

  return {
    ...manifest,
    captures: materialized,
  };
}

async function queryReadModelRows(client, captures) {
  const cardPrintIds = unique(captures.map((capture) => capture.card_print_id));
  const cardPrintingIds = unique(
    captures.map((capture) => capture.card_printing_id),
  );

  await client.query("begin read only");
  try {
    await client.query("set local role authenticated");
    const result = await client.query(
      `select *
       from public.get_market_pricing_read_model_v1(
         $1::uuid[],
         $2::uuid[]
       )`,
      [
        cardPrintIds.length ? cardPrintIds : null,
        cardPrintingIds.length ? cardPrintingIds : null,
      ],
    );
    await client.query("commit");
    return result.rows.map((row) => ({
      ...row,
      market_close:
        row.market_close === null ? null : Number(row.market_close),
      low_price: row.low_price === null ? null : Number(row.low_price),
      mid_price: row.mid_price === null ? null : Number(row.mid_price),
      high_price: row.high_price === null ? null : Number(row.high_price),
      direct_low_price:
        row.direct_low_price === null
          ? null
          : Number(row.direct_low_price),
      lowest_active_ask:
        row.lowest_active_ask === null
          ? null
          : Number(row.lowest_active_ask),
      eligible_printing_count: Number(row.eligible_printing_count ?? 0),
      active_ask_listing_count: Number(
        row.active_ask_listing_count ?? 0,
      ),
    }));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function writeArtifactHashes(outDir, fileNames) {
  const hashes = {};
  for (const fileName of fileNames) {
    const buffer = await fs.readFile(path.join(outDir, fileName));
    hashes[fileName] = sha256(buffer);
  }
  await writeJson(path.join(outDir, "artifact_hashes.json"), hashes);
}

function report(summary) {
  return `# TCGPlayer Market Product Surface Proof V1

- Status: \`${summary.status}\`
- Producing commit: \`${summary.expected_commit_sha}\`
- Deployed commit: \`${summary.deployed_commit_sha}\`
- Required surfaces: \`${summary.required_surface_count}\`
- Captured surfaces: \`${summary.captured_surface_count}\`
- Passed surfaces: \`${summary.passed_surface_count}\`
- Failed surfaces: \`${summary.failed_surface_count}\`
- Authenticated production readback: \`true\`
- Database writes: \`0\`

## Findings

${
  summary.findings.length
    ? summary.findings.map((finding) => `- \`${finding}\``).join("\n")
    : "- None."
}

## Boundary

This audit performs an authenticated, read-only call to
\`get_market_pricing_read_model_v1\`. It reconciles the rendered amount,
scope, exact printing identity, source label, observation timestamp,
publication timestamp, and provenance ID captured from each deployed client.
Screenshots and machine-readable render evidence are copied into the audit
directory and hashed. It does not modify pricing data, Vault data, or customer
state.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.captureManifest) {
    throw new Error("--capture-manifest is required");
  }
  if (!args.expectedCommitSha) {
    throw new Error("--expected-commit-sha is required");
  }
  if (!args.deployedCommitSha) {
    throw new Error("--deployed-commit-sha is required");
  }

  const headSha = git(["rev-parse", "HEAD"]).toLowerCase();
  const branch = git(["branch", "--show-current"]);
  const trackedStatus = git(["status", "--short", "--untracked-files=no"]);
  if (args.requirePass && headSha !== args.expectedCommitSha) {
    throw new Error("HEAD must equal --expected-commit-sha with --require-pass");
  }
  if (args.requirePass && trackedStatus) {
    throw new Error("tracked worktree must be clean with --require-pass");
  }

  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }

  const captureManifestPath = path.resolve(args.captureManifest);
  const sourceManifest = await readJson(captureManifestPath);
  const outDir = path.join(args.outRoot, stamp());
  await fs.mkdir(outDir, { recursive: true });
  const runPlan = {
    audit_version: AUDIT_VERSION,
    created_at: new Date().toISOString(),
    branch,
    head_sha: headSha,
    expected_commit_sha: args.expectedCommitSha,
    deployed_commit_sha: args.deployedCommitSha,
    capture_manifest_source_sha256: sha256(
      await fs.readFile(captureManifestPath),
    ),
    required_surfaces: TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1,
    boundaries: {
      production: true,
      authenticated_read: true,
      database_transaction: "read only",
      database_writes: 0,
      customer_identifiers_in_artifacts: false,
    },
  };
  await writeJson(path.join(outDir, "run_plan.json"), runPlan);

  const captureManifest = await materializeCaptures(
    sourceManifest,
    captureManifestPath,
    outDir,
  );
  await writeJson(
    path.join(outDir, "capture_manifest.json"),
    captureManifest,
  );

  const vaultReadback = args.vaultReadback
    ? await readJson(path.resolve(args.vaultReadback))
    : null;
  if (vaultReadback) {
    await writeJson(
      path.join(outDir, "vault_readback.json"),
      vaultReadback,
    );
  }

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
  });
  await client.connect();
  let readModelRows;
  try {
    readModelRows = await queryReadModelRows(
      client,
      captureManifest.captures ?? [],
    );
  } finally {
    await client.end();
  }
  await writeJson(
    path.join(outDir, "read_model_rows.json"),
    readModelRows,
  );

  const summary = evaluateTcgplayerMarketProductSurfaceProofV1({
    expected_commit_sha: args.expectedCommitSha,
    deployed_commit_sha: args.deployedCommitSha,
    capture_manifest: captureManifest,
    read_model_rows: readModelRows,
    vault_readback: vaultReadback,
  });
  await writeJson(path.join(outDir, "summary.json"), summary);
  await fs.writeFile(path.join(outDir, "REPORT.md"), report(summary));

  const topLevelFiles = [
    "run_plan.json",
    "capture_manifest.json",
    "read_model_rows.json",
    "summary.json",
    "REPORT.md",
    ...(vaultReadback ? ["vault_readback.json"] : []),
  ];
  const captureFiles = await fs.readdir(path.join(outDir, "captures"));
  await writeArtifactHashes(outDir, [
    ...topLevelFiles,
    ...captureFiles.map((fileName) => `captures/${fileName}`),
  ]);

  console.log(
    JSON.stringify(
      {
        status: summary.status,
        findings: summary.findings,
        required_surface_count: summary.required_surface_count,
        captured_surface_count: summary.captured_surface_count,
        passed_surface_count: summary.passed_surface_count,
        failed_surface_count: summary.failed_surface_count,
        artifact_dir: outDir,
      },
      null,
      2,
    ),
  );
  if (args.requirePass && summary.status !== "passed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
