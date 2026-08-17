import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

const PATHS = Object.freeze({
  apple: "docs/release/app_store_connect_ios_1_0.json",
  applePrivacy: "docs/release/app_store_privacy_ios_1_0.md",
  google: "docs/release/google_play_android_1_0.json",
  googleSafety: "docs/release/google_play_data_safety_android_1_0.md",
  external: "docs/audits/store_release_readiness_v1/external_console_status.json",
  pubspec: "pubspec.yaml",
  androidBuild: "android/app/build.gradle.kts",
});

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), "utf8");
}

async function exists(relativePath) {
  try {
    const stat = await fs.stat(path.join(ROOT, relativePath));
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function isPublicHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "grookaivault.com";
  } catch {
    return false;
  }
}

export async function evaluateStoreReleaseReadinessV1() {
  const [appleRaw, applePrivacy, googleRaw, googleSafety, externalRaw, pubspec, androidBuild] =
    await Promise.all([
      read(PATHS.apple),
      read(PATHS.applePrivacy),
      read(PATHS.google),
      read(PATHS.googleSafety),
      read(PATHS.external),
      read(PATHS.pubspec),
      read(PATHS.androidBuild),
    ]);

  const apple = JSON.parse(appleRaw);
  const google = JSON.parse(googleRaw);
  const external = JSON.parse(externalRaw);
  const findings = [];
  const blockers = [];

  const build = pubspec.match(/^version:\s*1\.0\.0\+(\d+)$/m)?.[1] ?? null;
  if (!build || String(apple.build_number) !== build) {
    findings.push("ios_build_number_mismatch");
  }
  if (!androidBuild.includes('applicationId = "com.grookai.vault"')) {
    findings.push("android_package_contract_mismatch");
  }
  if (google.package_name !== "com.grookai.vault") {
    findings.push("google_listing_package_mismatch");
  }

  for (const [name, value] of Object.entries({
    apple_privacy: apple.app_info_localization?.privacyPolicyUrl,
    apple_support: apple.version_localization?.supportUrl,
    google_privacy: google.store_listing?.privacy_policy_url,
    google_support: google.store_listing?.support_url,
    google_deletion: google.store_listing?.account_deletion_url,
  })) {
    if (!isPublicHttps(value)) findings.push(`invalid_public_url:${name}`);
  }

  if (!/Crash Data/.test(applePrivacy) || !/Device ID/.test(applePrivacy)) {
    findings.push("apple_privacy_answers_incomplete");
  }
  if (!/encrypted in transit/i.test(googleSafety) || !/request deletion/i.test(googleSafety)) {
    findings.push("google_data_safety_answers_incomplete");
  }
  if (apple.review_detail?.demoAccountRequired !== true) {
    findings.push("apple_review_account_not_required");
  }
  if (google.app_access?.restricted_features !== true) {
    findings.push("google_review_account_not_required");
  }

  const assetPaths = [
    ...(apple.screenshot_sets ?? []).flatMap((set) => set.paths ?? []),
    google.asset_requirements?.app_icon_512,
    google.asset_requirements?.feature_graphic_1024x500,
    ...(google.asset_requirements?.phone_screenshots ?? []),
  ].filter(Boolean);
  const missingAssets = [];
  for (const assetPath of assetPaths) {
    if (!(await exists(assetPath))) missingAssets.push(assetPath);
  }
  if (missingAssets.length > 0) blockers.push("store_assets_missing");

  if (external.apple_app_store_connect?.listing_verified !== true) {
    blockers.push("apple_console_not_verified");
  }
  if (external.apple_app_store_connect?.review_credentials_configured !== true) {
    blockers.push("apple_review_credentials_not_verified");
  }
  if (external.google_play_console?.developer_account_available !== true) {
    blockers.push("google_play_developer_account_unavailable");
  }
  if (external.google_play_console?.listing_verified !== true) {
    blockers.push("google_play_listing_not_verified");
  }

  return {
    audit_version: "GROOKAI_STORE_RELEASE_READINESS_V1",
    repository_contract_valid: findings.length === 0,
    release_submission_ready: findings.length === 0 && blockers.length === 0,
    build_number: build,
    missing_assets: missingAssets,
    findings,
    blockers: [...new Set(blockers)],
    status:
      findings.length > 0
        ? "INVALID"
        : blockers.length > 0
          ? "EXTERNAL_OR_ASSET_BLOCKED"
          : "READY",
  };
}

async function main() {
  const result = await evaluateStoreReleaseReadinessV1();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.findings.length > 0) process.exitCode = 1;
  if (process.argv.includes("--require-ready") && !result.release_submission_ready) {
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
