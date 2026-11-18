import { spawnSync } from "node:child_process";
import {
  collectorRepoRoot,
  loadCollectorPreviewBuildEnv,
} from "./collector_preview_build_env.mjs";

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["--prefix", "apps/web", "run", "typecheck:raw"],
  {
    cwd: collectorRepoRoot,
    env: loadCollectorPreviewBuildEnv(process.env),
    encoding: "utf8",
    shell: process.platform === "win32",
  },
);
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.error) throw result.error;
process.exit(result.status ?? 1);
