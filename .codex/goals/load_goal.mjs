import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const GOALS_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(GOALS_DIR, "..", "..");
const REGISTRY_PATH = path.join(GOALS_DIR, "registry.json");

function parseArgs(argv) {
  return {
    list: argv.includes("--list"),
    json: argv.includes("--json"),
    id:
      argv.find((arg) => arg.startsWith("--id="))?.slice("--id=".length) ??
      null,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertGoalContract(goal, specification) {
  const requiredMarkers = [
    "# GOAL: MEE Pricing Platform Production V1",
    "Do not stop for planning approval",
    "# 18. Rollout Gates",
    "# 19. Coverage Acceptance",
    "# 22. Completion Standard",
    "A partial backend, one working endpoint, one card-page price, or an incomplete rollout is not completion.",
    "Continue until the full Production V1 goal is complete or a legitimate blocked condition is proven.",
  ];
  for (const marker of requiredMarkers) {
    if (!specification.includes(marker)) {
      throw new Error(`goal specification is incomplete: missing ${marker}`);
    }
  }
  if (goal.autonomous_execution !== true) {
    throw new Error("goal must require autonomous execution");
  }
  if (goal.micro_approvals_required !== false) {
    throw new Error("goal must not require micro-approvals");
  }
  if (goal.completion_model !== "production_verified") {
    throw new Error("goal completion must require production verification");
  }
}

export async function loadGoal(goalId) {
  const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
  const goal = registry.goals.find((candidate) => candidate.id === goalId);
  if (!goal) throw new Error(`unsupported goal: ${goalId}`);

  const specPath = path.resolve(REPO_ROOT, goal.spec_path);
  if (!specPath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error("goal specification path escapes the repository");
  }
  const specification = await readFile(specPath, "utf8");
  const actualHash = sha256(specification);
  if (actualHash !== goal.spec_sha256) {
    throw new Error(
      `goal specification hash mismatch: expected ${goal.spec_sha256}, received ${actualHash}`,
    );
  }
  assertGoalContract(goal, specification);
  return {
    ...goal,
    specification,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
  if (args.list) {
    process.stdout.write(
      `${JSON.stringify(
        registry.goals.map(({ id, title, status }) => ({
          id,
          title,
          status,
        })),
        null,
        2,
      )}\n`,
    );
    return;
  }
  if (!args.id) {
    throw new Error("use --list or --id=<goal-id>");
  }
  const goal = await loadGoal(args.id);
  if (args.json) {
    process.stdout.write(`${JSON.stringify(goal, null, 2)}\n`);
  } else {
    process.stdout.write(goal.specification);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[goal-registry] ${error.message}`);
    process.exitCode = 1;
  });
}
