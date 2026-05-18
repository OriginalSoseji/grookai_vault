import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const scannedFiles = [
  "pubspec.yaml",
  "android/app/build.gradle.kts",
  "ios/Runner.xcodeproj/project.pbxproj",
  ".github/workflows/release.yml",
  ".github/workflows/flutter-build-apk.yml",
  ".github/workflows/flutter-ci.yml",
  "package.json",
];

const secretAssetPatterns = [
  /^\s*-\s+\.env(?:\.[A-Za-z0-9_-]+)?\s*$/m,
  /\.env\.local\b/,
  /\.env\.\*\b/,
  /supabase\/functions\/[^/\s]+\/\.env\b/,
  /google-services\.json\b/,
  /GoogleService-Info\.plist\b/,
  /service[-_]?account/i,
  /service[-_]?role/i,
];

const allowedReleaseSecretReferences = [
  /secrets\.ANDROID_KEYSTORE_BASE64/,
  /secrets\.ANDROID_KEYSTORE_PASSWORD/,
  /secrets\.ANDROID_KEY_ALIAS/,
  /secrets\.ANDROID_KEY_PASSWORD/,
  /SUPABASE_DB_URL/,
  /PROD_SUPABASE_URL/,
  /PROD_PUBLISHABLE_KEY/,
  /GITHUB_TOKEN/,
];

const artifactPathPatterns = [
  /path:\s*\|?[\s\S]{0,240}\.env\b/i,
];

function readRelative(file) {
  const absolute = path.join(repoRoot, file);
  if (!fs.existsSync(absolute)) {
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}

const failures = [];

for (const file of scannedFiles) {
  const source = readRelative(file);
  if (!source) {
    continue;
  }

  for (const pattern of secretAssetPatterns) {
    for (const match of source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))) {
      const matched = match[0];
      if (file.endsWith(".yml") && allowedReleaseSecretReferences.some((allowed) => allowed.test(matched))) {
        continue;
      }
      failures.push(`${file}:${lineForOffset(source, match.index ?? 0)} packages or references secret-like release input: ${matched.trim()}`);
    }
  }

  if (file.endsWith(".yml")) {
    for (const pattern of artifactPathPatterns) {
      for (const match of source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))) {
        failures.push(`${file}:${lineForOffset(source, match.index ?? 0)} uploads secret-like release artifact path: ${match[0].trim()}`);
      }
    }
  }
}

const webPublicDir = path.join(repoRoot, "apps", "web", "public");
if (fs.existsSync(webPublicDir)) {
  const stack = [webPublicDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (/^\.env(?:\.|$)|secret|service[-_]?account|service[-_]?role|\.pem$|\.key$/i.test(entry.name)) {
        failures.push(`${path.relative(repoRoot, absolute)} must not live under apps/web/public`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("[release-secret-packaging] FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[release-secret-packaging] PASS");
