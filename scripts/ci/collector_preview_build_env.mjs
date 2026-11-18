import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const localStagingUrl = "http://127.0.0.1:54321/";
export const collectorRepoRoot = repoRoot;

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

  Object.assign(env, {
    SUPABASE_URL: localStagingUrl,
    SUPABASE_PUBLISHABLE_KEY: stagingKey,
    SUPABASE_PUBLISHABLE_KEY_STAGING: "",
    SUPABASE_URL_STAGING: "",
    SUPABASE_ANON_KEY: stagingKey,
    SUPABASE_SECRET_KEY: "",
    SUPABASE_DB_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: localStagingUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: stagingKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: stagingKey,
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
  return env;
}

export function loadCollectorPreviewBuildEnv(baseEnv = process.env) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Local web verification requires the root .env.local file.");
  }
  const localConfig = dotenv.parse(fs.readFileSync(envPath));
  return createCollectorPreviewBuildEnv(baseEnv, localConfig);
}
