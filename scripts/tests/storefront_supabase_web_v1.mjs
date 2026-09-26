// Starts/builds only a loopback Next candidate with an allowlist of inherited OS env.
import fs from "node:fs";
import net from "node:net";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (process.argv.length > 3 ||
    (process.argv[2] && !["--build", "--start"].includes(process.argv[2])))
    throw new Error("Only --build or --start is supported");
const build = process.argv[2] === "--build";
const start = process.argv[2] === "--start";
const cfg = JSON.parse(fs.readFileSync(path.join(root, '.local/storefront/supabase-verification/status-private.json')));
assert.equal(cfg.API_URL, 'http://127.0.0.1:16421');
const relay = net.createServer(socket => {
    const upstream = net.connect(16421, '127.0.0.1');
    socket.pipe(upstream);
    upstream.pipe(socket);
    socket.on('error', () => upstream.destroy());
    upstream.on('error', () => socket.destroy());
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
});
await new Promise((resolve, reject) => { relay.once('error', reject); relay.listen(15439, '127.0.0.1', resolve); });
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
    if (process.env[k])
        env[k] = process.env[k];
Object.assign(env, {
    NEXT_PUBLIC_COLLECTOR_STAGING: "true",
    NEXT_PUBLIC_STOREFRONT_LOCAL_TEST: "true",
    SUPABASE_URL: "http://127.0.0.1:15439",
    SUPABASE_PUBLISHABLE_KEY: cfg.PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: cfg.SECRET_KEY,
    GROOKAI_DISABLE_TELEMETRY: "1",
    NEXT_TELEMETRY_DISABLED: "1",
    GVVI_REFERRAL_COOKIE_SECRET: "isolated-storefront-referral-test-key-at-least-32",
    SITE_URL: "http://127.0.0.1:15440",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:15440",
    NODE_OPTIONS: `--require=${path.join(root, "scripts/tests/vendor_storefront_network_guard.cjs")}`,
});
const child = spawn(process.execPath, [
    "node_modules/next/dist/bin/next",
    ...(build
        ? ["build", "--webpack"]
        : start ? ["start", "--hostname", "127.0.0.1", "--port", "15440"]
        : ["dev", "--webpack", "--hostname", "127.0.0.1", "--port", "15440"]),
], {
    cwd: path.join(root, "apps/web"),
    env,
    stdio: "inherit",
    windowsHide: true,
});
process.on("SIGTERM", () => { relay.close(); child.kill(); });
child.on("exit", (code) => process.exit(code ?? 1));
