// Preparation only: no Docker mutation, service start, migration execution or credentials.
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
assert.equal(process.argv.length, 2, "No target override supported");
const out = path.join(root, ".local/storefront/supabase-verification");
assert(
  !fs.existsSync(out),
  "Preserve existing project; inspect its manifest instead of overwriting",
);
const ports = {
  api: 16421,
  db: 16422,
  studio: 16423,
  mail: 16424,
  shadow: 16428,
};
for (const port of Object.values(ports))
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
const project = "grookai-storefront-verification-20260918";
fs.mkdirSync(path.join(out, "supabase/migrations"), { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const files = fs
  .readdirSync(path.join(root, "supabase/migrations"))
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort();
assert.equal(
  new Set(files.map((f) => f.split("_")[0])).size,
  files.length,
  "Duplicate migration timestamp",
);
const sourceHashes = {};
for (const name of files) {
  const bytes = fs.readFileSync(path.join(root, "supabase/migrations", name));
  sourceHashes[name] = hash(bytes);
  fs.writeFileSync(path.join(out, "supabase/migrations", name), bytes);
}
const config = `project_id = "${project}"
[api]
enabled = true
port = ${ports.api}
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000
[db]
port = ${ports.db}
shadow_port = ${ports.shadow}
major_version = 17
[db.migrations]
enabled = false
schema_paths = []
[db.seed]
enabled = false
sql_paths = []
[studio]
enabled = false
port = ${ports.studio}
[inbucket]
enabled = true
port = ${ports.mail}
[storage]
enabled = true
file_size_limit = "5MiB"
[auth]
enabled = true
site_url = "http://127.0.0.1:15440"
additional_redirect_urls = ["http://127.0.0.1:15440/auth/callback"]
enable_signup = true
[auth.email]
enable_signup = true
enable_confirmations = false
[edge_runtime]
enabled = false
[analytics]
enabled = false
`;
fs.writeFileSync(path.join(out, "supabase/config.toml"), config);
const manifest = {
  project,
  out,
  ports,
  migrationCount: files.length,
  sourceHashes,
  configSha256: hash(config),
  migrationsInitiallyDisabled: true,
  seedDisabled: true,
  credentialsCopied: false,
  createdAt: new Date().toISOString(),
  requiredBeforeReplay: [
    "Healthy local Docker daemon; preserve all shared containers and volumes.",
    "Create a new internal Docker network named for this project; verify Internal=true before start --network-id.",
    "Start only this workdir. Migrations are disabled to prevent legacy scheduling before the safety controls.",
    "Set and verify cron.launch_active_jobs=false on this dedicated PostgreSQL cluster; preserve this setting through local reset.",
    "Only then enable migrations in this isolated copy and replay with explicit --local --no-seed --workdir.",
    "Verify cluster identity, disabled cron, no outbound application route, exact migration ledger and rollout flags before fixture tests.",
    "No linked project, db push, production credentials, edge workers or remote schema audit bypass.",
  ],
};
fs.writeFileSync(
  path.join(out, "preparation.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    project,
    out,
    ports,
    migrationCount: files.length,
    migrationsExecuted: 0,
    containersStarted: 0,
  }),
);
