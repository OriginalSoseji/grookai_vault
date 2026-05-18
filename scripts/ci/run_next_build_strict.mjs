import { spawnSync } from "node:child_process";

const tlsFailurePattern = /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT|CERT_HAS_EXPIRED|DEPTH_ZERO_SELF_SIGNED_CERT|ERR_TLS_CERT_ALTNAME_INVALID/i;
const result = spawnSync("npm", ["--prefix", "apps/web", "run", "build"], {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
  shell: process.platform === "win32",
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (tlsFailurePattern.test(output)) {
  console.error("[next-build-strict] TLS certificate failure detected during production build.");
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("[next-build-strict] PASS");
