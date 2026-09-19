// Starts/builds only a loopback Next candidate with an allowlist of inherited OS env.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
if (
  process.argv.length > 3 ||
  (process.argv[2] && process.argv[2] !== "--build")
)
  throw new Error("Only --build is supported");
const build = process.argv[2] === "--build";
const env = {};
for (const k of [
  "PATH",
  "Path",
  "SystemRoot",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "COMSPEC",
])
  if (process.env[k]) env[k] = process.env[k];
Object.assign(env, {
  NEXT_PUBLIC_COLLECTOR_STAGING: "true",
  NEXT_PUBLIC_STOREFRONT_LOCAL_TEST: "true",
  SUPABASE_URL: "http://127.0.0.1:15439",
  SUPABASE_PUBLISHABLE_KEY: "storefront-local-anon-only",
  SUPABASE_SECRET_KEY: "storefront-local-service-only",
  GROOKAI_DISABLE_TELEMETRY: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  GVVI_REFERRAL_COOKIE_SECRET:
    "isolated-storefront-referral-test-key-at-least-32",
  SITE_URL: "http://127.0.0.1:15440",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:15440",
  NODE_OPTIONS: `--require=${path.join(root, "scripts/tests/vendor_storefront_network_guard.cjs")}`,
});
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    ...(build
      ? ["build", "--webpack"]
      : ["dev", "--webpack", "--hostname", "127.0.0.1", "--port", "15440"]),
  ],
  {
    cwd: path.join(root, "apps/web"),
    env,
    stdio: "inherit",
    windowsHide: true,
  },
);
process.on("SIGTERM", () => child.kill());
child.on("exit", (code) => process.exit(code ?? 1));
