import fs from "node:fs/promises";
import path from "node:path";

import {
  TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1,
} from "../../backend/pricing/tcgplayer_market_product_surface_proof_policy_v1.mjs";

const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/;

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  const captureDir = path.resolve(value("capture-dir") || ".");
  return {
    captureDir,
    deployedCommitSha: value("deployed-commit-sha").toLowerCase(),
    out: path.resolve(
      value("out") || path.join(captureDir, "capture_manifest.json"),
    ),
    requireComplete: argv.includes("--require-complete"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!COMMIT_SHA_PATTERN.test(args.deployedCommitSha)) {
    throw new Error("--deployed-commit-sha must be a 40-character SHA");
  }
  const files = (await fs.readdir(args.captureDir))
    .filter((fileName) => fileName.endsWith(".render.json"))
    .sort();
  const captures = [];
  for (const fileName of files) {
    const renderPath = path.join(args.captureDir, fileName);
    const render = JSON.parse(await fs.readFile(renderPath, "utf8"));
    const captureId = String(render.capture_id ?? "").trim();
    const screenshotCandidates = [".png", ".jpg", ".jpeg"].map(
      (extension) => path.join(args.captureDir, `${captureId}${extension}`),
    );
    let screenshotPath = null;
    for (const candidate of screenshotCandidates) {
      if (await fs.stat(candidate).then(() => true).catch(() => false)) {
        screenshotPath = candidate;
        break;
      }
    }
    if (!screenshotPath) {
      throw new Error(`Screenshot missing for ${captureId}`);
    }
    captures.push({
      capture_id: captureId,
      surface_id: render.surface_id,
      client: render.client,
      proof_kind: render.proof_kind,
      screenshot_path: path
        .relative(path.dirname(args.out), screenshotPath)
        .replaceAll("\\", "/"),
      render_evidence_path: path
        .relative(path.dirname(args.out), renderPath)
        .replaceAll("\\", "/"),
    });
  }

  const requiredIds = new Set(
    TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1.map(
      (surface) => surface.surface_id,
    ),
  );
  const capturedIds = new Set(captures.map((capture) => capture.surface_id));
  const missing = [...requiredIds].filter(
    (surfaceId) => !capturedIds.has(surfaceId),
  );
  const duplicates = [...capturedIds].filter(
    (surfaceId) =>
      captures.filter((capture) => capture.surface_id === surfaceId).length !==
      1,
  );
  const unsupported = [...capturedIds].filter(
    (surfaceId) => !requiredIds.has(surfaceId),
  );
  const manifest = {
    schema_version: "TCGPLAYER_MARKET_PRODUCT_SURFACE_CAPTURE_V1",
    created_at: new Date().toISOString(),
    deployed_commit_sha: args.deployedCommitSha,
    environment: "production",
    auth_lane: "authenticated",
    captures,
    reconciliation: {
      required_surface_count: requiredIds.size,
      captured_surface_count: captures.length,
      missing_surface_ids: missing,
      duplicated_surface_ids: duplicates,
      unsupported_surface_ids: unsupported,
    },
  };
  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest.reconciliation, null, 2));
  if (
    args.requireComplete &&
    (missing.length || duplicates.length || unsupported.length)
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
