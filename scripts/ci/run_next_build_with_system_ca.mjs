import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const webRoot = path.join(repoRoot, "apps", "web");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const nodeOptions = existingNodeOptions
  ? `${existingNodeOptions} --use-system-ca`
  : "--use-system-ca";

const result = spawnSync(
  process.execPath,
  [path.join("node_modules", "next", "dist", "bin", "next"), "build"],
  {
    cwd: webRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
    encoding: "utf8",
    shell: false,
  },
);

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

process.exit(result.status ?? 1);
