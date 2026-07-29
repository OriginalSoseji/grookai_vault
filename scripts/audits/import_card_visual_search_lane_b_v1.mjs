import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const IMPORT_VERSION = "CARD_VISUAL_SEARCH_LANE_B_IMPORT_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs/manifests/card_visual_search_v1_selective_source_import_manifest.json",
);
const DEFAULT_AUDIT_DIR = path.join(
  REPO_ROOT,
  "docs/audits/card_visual_search_lane_b_import/2026-07-29_lane_b_import_d3e9042c",
);
const EXPECTED_BRANCH = "feature/visual-search-v1-productization";
const EXPECTED_PRE_IMPORT_SHA = "d3e9042cfd4b0d4432cdb91940d615f2d687aeea";
const EXPECTED_SOURCE_SHA = "c5bbbba5dea998fcd51d0d8602601737356a1494";
const EXPECTED_MANIFEST_HASH = "7bd6f0c7d1f2826c981dde5431d2b9850adea264d6a51d9e24232558fe17658f";

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: options.encoding ?? "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function resolveInsideRepo(relativePath) {
  const resolved = path.resolve(REPO_ROOT, relativePath);
  const relative = path.relative(REPO_ROOT, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe destination path: ${relativePath}`);
  }
  return resolved;
}

async function loadManifest() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  if (manifest.manifest_payload_sha256 !== EXPECTED_MANIFEST_HASH) {
    throw new Error(`Manifest hash changed: ${manifest.manifest_payload_sha256}`);
  }
  if (manifest.governed_source.commit_sha !== EXPECTED_SOURCE_SHA) {
    throw new Error(`Unexpected governed source SHA: ${manifest.governed_source.commit_sha}`);
  }
  return manifest;
}

function laneBFiles(manifest) {
  return manifest.components
    .filter((component) => component.decision === "import_later")
    .flatMap((component) =>
      component.files.map((file) => ({
        ...file,
        component_id: component.component_id,
        governing_contracts: component.governing_contracts,
        focused_tests: component.focused_tests,
      })),
    )
    .sort((left, right) => left.source_path.localeCompare(right.source_path));
}

function verifyGitBoundary() {
  const branch = runGit(["branch", "--show-current"]).trim();
  const headSha = runGit(["rev-parse", "HEAD"]).trim();
  if (branch !== EXPECTED_BRANCH) {
    throw new Error(`Wrong branch: expected ${EXPECTED_BRANCH}, received ${branch}`);
  }
  if (headSha !== EXPECTED_PRE_IMPORT_SHA) {
    throw new Error(`Wrong pre-import SHA: expected ${EXPECTED_PRE_IMPORT_SHA}, received ${headSha}`);
  }
  runGit(["cat-file", "-e", `${EXPECTED_SOURCE_SHA}^{commit}`]);
  return { branch, head_sha: headSha };
}

function sourceBuffer(file) {
  const contents = runGit(["show", `${EXPECTED_SOURCE_SHA}:${file.source_path}`], {
    encoding: "buffer",
  });
  const actualHash = sha256(contents);
  if (actualHash !== file.source_sha256) {
    throw new Error(
      `Source hash mismatch for ${file.source_path}: expected ${file.source_sha256}, received ${actualHash}`,
    );
  }
  return contents;
}

async function buildPlan(auditDir) {
  const git = verifyGitBoundary();
  const manifest = await loadManifest();
  const files = laneBFiles(manifest);
  if (files.length !== 5) {
    throw new Error(`Expected 5 Lane B files, received ${files.length}`);
  }
  for (const file of files) sourceBuffer(file);

  const payload = {
    import_version: IMPORT_VERSION,
    created_on: "2026-07-29",
    branch: git.branch,
    pre_import_head_sha: git.head_sha,
    governed_source_sha: EXPECTED_SOURCE_SHA,
    manifest_payload_sha256: manifest.manifest_payload_sha256,
    selected_file_count: files.length,
    selected_files: files,
    boundaries: {
      exact_source_blobs_only: true,
      manual_source_edits_during_import: false,
      database_writes_authorized: false,
      migration_apply_authorized: false,
      provider_calls_authorized: false,
      embeddings_authorized: false,
      public_search_activation_authorized: false,
      holdout_execution_authorized: false,
      pricing_changes_authorized: false,
    },
  };
  const plan = {
    ...payload,
    plan_payload_sha256: sha256(JSON.stringify(payload)),
  };
  const planPath = path.join(auditDir, "import_plan.json");
  await fs.mkdir(auditDir, { recursive: true });
  await fs.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return { files, plan, planPath };
}

async function loadAndValidatePlan(auditDir, expectedFiles) {
  const plan = JSON.parse(await fs.readFile(path.join(auditDir, "import_plan.json"), "utf8"));
  const { plan_payload_sha256: actualHash, ...payload } = plan;
  if (actualHash !== sha256(JSON.stringify(payload))) {
    throw new Error("Lane B import plan payload hash mismatch");
  }
  if (plan.pre_import_head_sha !== EXPECTED_PRE_IMPORT_SHA) {
    throw new Error(`Import plan was produced from the wrong HEAD: ${plan.pre_import_head_sha}`);
  }
  if (
    JSON.stringify(plan.selected_files.map((file) => file.source_path)) !==
    JSON.stringify(expectedFiles.map((file) => file.source_path))
  ) {
    throw new Error("Lane B import plan paths do not match the manifest");
  }
  return plan;
}

async function applyImport(auditDir) {
  const git = verifyGitBoundary();
  const manifest = await loadManifest();
  const files = laneBFiles(manifest);
  const plan = await loadAndValidatePlan(auditDir, files);
  const outcomes = [];

  for (const file of files) {
    const contents = sourceBuffer(file);
    const destinationPath = resolveInsideRepo(file.destination_path);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, contents);
    const destinationContents = await fs.readFile(destinationPath);
    const destinationHash = sha256(destinationContents);
    outcomes.push({
      source_path: file.source_path,
      destination_path: file.destination_path,
      component_id: file.component_id,
      expected_sha256: file.source_sha256,
      destination_sha256: destinationHash,
      hash_match: destinationHash === file.source_sha256,
      bytes: destinationContents.length,
    });
  }

  const mismatches = outcomes.filter((outcome) => !outcome.hash_match);
  const payload = {
    reconciliation_version: "CARD_VISUAL_SEARCH_LANE_B_IMPORT_RECONCILIATION_V1",
    completed_on: "2026-07-29",
    branch: git.branch,
    pre_import_head_sha: git.head_sha,
    governed_source_sha: EXPECTED_SOURCE_SHA,
    manifest_payload_sha256: manifest.manifest_payload_sha256,
    import_plan_payload_sha256: plan.plan_payload_sha256,
    planned_file_count: files.length,
    written_file_count: outcomes.length,
    matching_file_count: outcomes.length - mismatches.length,
    mismatched_file_count: mismatches.length,
    missing_file_count: files.length - outcomes.length,
    extra_imported_file_count: 0,
    status: mismatches.length === 0 && outcomes.length === files.length ? "reconciled" : "failed",
    outcomes,
  };
  const reconciliation = {
    ...payload,
    reconciliation_payload_sha256: sha256(JSON.stringify(payload)),
  };
  const reconciliationPath = path.join(auditDir, "import_reconciliation.json");
  await fs.writeFile(
    reconciliationPath,
    `${JSON.stringify(reconciliation, null, 2)}\n`,
    "utf8",
  );
  if (reconciliation.status !== "reconciled") {
    throw new Error("Lane B import did not reconcile");
  }
  return { reconciliation, reconciliationPath };
}

function parseArgs(argv) {
  const auditDirArg = argv.find((value) => value.startsWith("--audit-dir="));
  return {
    mode: argv.includes("--apply") ? "apply" : "plan",
    auditDir: auditDirArg
      ? path.resolve(auditDirArg.slice("--audit-dir=".length))
      : DEFAULT_AUDIT_DIR,
  };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === "plan") {
    const result = await buildPlan(args.auditDir);
    console.log(
      JSON.stringify(
        {
          mode: "plan",
          plan: path.relative(REPO_ROOT, result.planPath).replaceAll("\\", "/"),
          selected_files: result.files.length,
          plan_payload_sha256: result.plan.plan_payload_sha256,
        },
        null,
        2,
      ),
    );
  } else {
    const result = await applyImport(args.auditDir);
    console.log(
      JSON.stringify(
        {
          mode: "apply",
          reconciliation: path
            .relative(REPO_ROOT, result.reconciliationPath)
            .replaceAll("\\", "/"),
          status: result.reconciliation.status,
          written_files: result.reconciliation.written_file_count,
          matching_files: result.reconciliation.matching_file_count,
          mismatches: result.reconciliation.mismatched_file_count,
          reconciliation_payload_sha256:
            result.reconciliation.reconciliation_payload_sha256,
        },
        null,
        2,
      ),
    );
  }
}
