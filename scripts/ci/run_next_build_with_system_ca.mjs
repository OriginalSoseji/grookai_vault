import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureStorefrontBuildConfig } from "./preserve_storefront_build_config.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const webRoot = path.join(repoRoot, "apps", "web");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const nodeOptions = existingNodeOptions
  ? `${existingNodeOptions} --use-system-ca`
  : "--use-system-ca";

const restoreConfig = captureStorefrontBuildConfig(webRoot, process.env);

const result = spawnSync(
  process.execPath,
  [
    path.join("node_modules", "next", "dist", "bin", "next"),
    "build",
    "--webpack",
  ],
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

restoreConfig();

process.exit(result.status ?? 1);
