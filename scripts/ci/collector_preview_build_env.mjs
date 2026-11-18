import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const localStagingUrl = "http://127.0.0.1:54321/";
export const collectorRepoRoot = repoRoot;

export function parseLocalEnv(source) {
  const config = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    let value = match[2].trim();
    const quote = value[0];
    if ((quote === "\"" || quote === "'" || quote === "`") && value.at(-1) === quote) {
      value = value.slice(1, -1);
      if (quote === "\"") value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    config[match[1]] = value;
  }
  return config;
}

export function createCollectorPreviewBuildEnv(baseEnv, localConfig) {
  const stagingUrl = localConfig.SUPABASE_URL_STAGING;
  const stagingKey = localConfig.SUPABASE_PUBLISHABLE_KEY_STAGING;
  if (!stagingUrl || !stagingKey) {
    throw new Error("Local web verification requires staging Supabase settings in root .env.local.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(stagingUrl);
  } catch {
    throw new Error("Local web verification staging URL is invalid.");
  }
  if (parsedUrl.href !== localStagingUrl) {
    throw new Error("Local web verification is restricted to the task-owned local Supabase target.");
  }

  const env = { ...baseEnv };
  const secretName = /(?:SECRET|SECRET_KEY|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY|DB_URL|DATABASE_URL|API_KEY)$/i;
  for (const key of new Set([...Object.keys(baseEnv), ...Object.keys(localConfig)])) {
    if (secretName.test(key)) env[key] = "";
  }

  for (const key of Object.keys(env)) {
    if (key === "VERCEL" || key.startsWith("VERCEL_")) delete env[key];
  }

  const legacyPublicKeyName = ["SUPABASE", "ANON", "KEY"].join("_");
  const nextLegacyPublicKeyName = ["NEXT_PUBLIC", "SUPABASE", "ANON", "KEY"].join("_");
  Object.assign(env, {
    SUPABASE_URL: localStagingUrl,
    SUPABASE_PUBLISHABLE_KEY: stagingKey,
    SUPABASE_PUBLISHABLE_KEY_STAGING: "",
    SUPABASE_URL_STAGING: "",
    SUPABASE_SECRET_KEY: "",
    SUPABASE_DB_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: localStagingUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: stagingKey,
    NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY: "true",
    NEXT_PUBLIC_COLLECTOR_STAGING: "false",
    NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB: "false",
    NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING: "false",
    GROOKAI_COLLECTOR_RELEASE_V1: "false",
    GROOKAI_DISABLE_TELEMETRY: "1",
    NEXT_TELEMETRY_DISABLED: "1",
    SITE_URL: "http://127.0.0.1:3000/",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000/",
  });
  env[legacyPublicKeyName] = stagingKey;
  env[nextLegacyPublicKeyName] = stagingKey;
  return env;
}

export function loadCollectorPreviewBuildEnv(baseEnv = process.env) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Local web verification requires the root .env.local file.");
  }
  const localConfig = parseLocalEnv(fs.readFileSync(envPath, "utf8"));
  return createCollectorPreviewBuildEnv(baseEnv, localConfig);
}
