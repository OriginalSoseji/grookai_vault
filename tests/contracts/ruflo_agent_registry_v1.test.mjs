import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCatalogSetOutcomeAgentV1 } from "../../backend/operations/catalog_founder_outcome_v1.mjs";
import { buildCatalogDiscoveryAgentV1 } from "../../backend/operations/operations_control_plane_v1.mjs";
import { buildTcgplayerPricingCompletionAgentV1 } from "../../backend/operations/tcgplayer_pricing_completion_agent_v1.mjs";
import { buildTkSmRFounderApplyAgentV1 } from "../../backend/operations/tk_sm_r_founder_apply_v1.mjs";
import {
  buildInventoryV1,
  discoverTrackedSurfacesV1,
  discoverWorktreesV1,
  writeInventoryV1,
} from "../../scripts/ruflo/build_readonly_inventory_v1.mjs";
import {
  readRegistryV1,
  validateRegistryV1,
} from "../../scripts/ruflo/validate_agent_registry_v1.mjs";

const repoRoot = process.cwd();
const registryPath = "config/ruflo/agent_registry_v1.json";
const registryRaw = readFileSync(registryPath, "utf8");
const registry = JSON.parse(registryRaw);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function gitFiles(root) {
  const raw = execFileSync("git", ["ls-files", "-z", "--", root], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  return raw.split("\0").filter(Boolean).map((entry) => entry.replaceAll("\\", "/"));
}

function recordByAgentKey(agentKey) {
  return registry.agents.find((agent) => agent.agent_key === agentKey);
}

test("checked-in Ruflo registry validates as a read-only foundation", () => {
  const { summary } = readRegistryV1(registryPath, { repoRoot });
  assert.equal(summary.schema_version, "RUFLO_AGENT_REGISTRY_V1");
  assert.equal(summary.mode, "read_only_foundation");
  assert.equal(summary.agent_count, 15);
  assert.equal(summary.registered_agent_count, 4);
  assert.equal(summary.non_executable_agent_count, 15);
  assert.equal(summary.write_lock_count, 0);
  assert.ok(Object.values(summary.boundaries).every((value) => value === false));
});

test("registered Operations Agent Protocol records reconcile with source builders", () => {
  const sourceAgents = [
    buildCatalogDiscoveryAgentV1(),
    buildTcgplayerPricingCompletionAgentV1(),
    buildCatalogSetOutcomeAgentV1(),
    buildTkSmRFounderApplyAgentV1(),
  ];
  for (const sourceAgent of sourceAgents) {
    const registered = recordByAgentKey(sourceAgent.agent_key);
    assert.ok(registered, `missing registry record for ${sourceAgent.agent_key}`);
    for (const key of [
      "display_name",
      "domain",
      "execution_platform",
      "schedule_kind",
      "schedule_expression",
    ]) {
      assert.equal(registered[key], sourceAgent[key], `${sourceAgent.agent_key}.${key}`);
    }
    assert.deepEqual(registered.allowed_work_item_types, sourceAgent.allowed_work_item_types);
    assert.deepEqual(registered.allowed_command_actions, sourceAgent.allowed_command_actions);
    assert.equal(registered.execution_enabled, false);
    assert.equal(registered.permission_tier, "R0");
  }
});

test("registry fails closed on execution, secrets, traversal, missing contracts, and write locks", () => {
  const executable = clone(registry);
  executable.agents[0].execution_enabled = true;
  assert.throws(() => validateRegistryV1(executable, { repoRoot }), /execution_enabled must remain false/);

  const sensitive = clone(registry);
  sensitive.agents[0].api_key = "prohibited-even-as-a-placeholder";
  assert.throws(() => validateRegistryV1(sensitive, { repoRoot }), /Sensitive registry key is prohibited/);

  const traversal = clone(registry);
  traversal.agents[0].source_locator = "../outside.mjs";
  assert.throws(() => validateRegistryV1(traversal, { repoRoot }), /must not traverse outside/);

  const missingContract = clone(registry);
  missingContract.agents[0].contracts = ["docs/contracts/DOES_NOT_EXIST.md"];
  assert.throws(() => validateRegistryV1(missingContract, { repoRoot }), /does not exist/);

  const writer = clone(registry);
  writer.agents[0].resource_locks = [{ key: "catalog:all:writer", mode: "write" }];
  writer.agents[1].resource_locks = [{ key: "catalog:all:writer", mode: "write" }];
  assert.throws(() => validateRegistryV1(writer, { repoRoot }), /write lock|Duplicate write lock/);
});

test("tracked backend, script-worker, and GitHub workflow surfaces are completely classified", () => {
  const surfaces = discoverTrackedSurfacesV1({ repoRoot, registry });
  const actualByKind = new Map();
  for (const surface of surfaces) {
    if (!actualByKind.has(surface.surface_kind)) actualByKind.set(surface.surface_kind, new Set());
    actualByKind.get(surface.surface_kind).add(surface.source_locator);
    assert.equal(surface.execution_enabled, false);
    assert.equal(surface.permission_tier, "R0");
  }

  const expectedBackend = gitFiles("backend").filter((entry) =>
    /(?:agent|worker|supervisor|orchestrator|control_plane|workflow).*\.mjs$/i.test(entry.slice("backend/".length)));
  const expectedScriptWorkers = gitFiles("scripts/workers");
  const expectedWorkflows = gitFiles(".github/workflows").filter((entry) => /\.ya?ml$/i.test(entry));

  assert.deepEqual([...actualByKind.get("backend_automation")].sort(), expectedBackend.sort());
  assert.deepEqual([...actualByKind.get("script_worker")].sort(), expectedScriptWorkers.sort());
  assert.deepEqual([...actualByKind.get("github_workflow")].sort(), expectedWorkflows.sort());
  assert.equal(surfaces.filter((surface) => surface.classification_source === "host_lane_registry").length, registry.host_lanes.length);
});

test("every discovered worktree is protected even when it is not predeclared", () => {
  const worktrees = discoverWorktreesV1({ repoRoot, registry });
  assert.ok(worktrees.length >= 20);
  assert.ok(worktrees.some((worktree) => /grookai_vault$/i.test(worktree.path)));
  assert.ok(worktrees.some((worktree) => /gv_ruflo_registry_foundation_20261016$/i.test(worktree.path)));
  for (const worktree of worktrees) {
    assert.equal(worktree.protection, "protected");
    assert.equal(worktree.write_allowed, false);
    assert.equal(worktree.cleanup_authorized, false);
    assert.ok(["protected_root_registry", "dynamic_fail_closed_discovery"].includes(worktree.protection_source));
  }
});

test("inventory generation is read-only and artifact hashes reconcile", () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), "ruflo-registry-test-"));
  try {
    const inventory = buildInventoryV1({
      repoRoot,
      registryPath,
      generatedAt: "2026-10-16T23:59:59-06:00",
    });
    const result = writeInventoryV1({ inventory, outDir });
    assert.ok(inventory.counts.surfaces >= 150);
    assert.ok(inventory.counts.worktrees >= 20);
    assert.ok(Object.values(inventory.boundaries).every((value) => value === 0));
    assert.equal(inventory.counts.non_executable_agents, inventory.counts.agents);
    for (const [file, expected] of Object.entries(result.hashes.files)) {
      const actual = createHash("sha256").update(readFileSync(path.join(outDir, file))).digest("hex");
      assert.equal(actual, expected, file);
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("inventory implementation contains no cleanup, dispatch, network, or production executor", () => {
  const source = readFileSync("scripts/ruflo/build_readonly_inventory_v1.mjs", "utf8");
  assert.doesNotMatch(source, /git\s*\(\s*\[\s*["'](?:clean|reset|push|checkout|switch)["']/i);
  assert.doesNotMatch(source, /["']worktree["']\s*,\s*["']remove["']/i);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /workflow\s+run|agent_execute|supabase\s+db\s+push/i);
  assert.match(source, /cleanup_authorized:\s*false/);
  assert.match(source, /write_allowed:\s*false/);
});

test("checked-in inventory snapshot and hashes reconcile", () => {
  const root = "docs/audits/ruflo_agent_registry_v1";
  const inventory = JSON.parse(readFileSync(`${root}/current_inventory_v1.json`, "utf8"));
  const hashes = JSON.parse(readFileSync(`${root}/artifact_hashes.json`, "utf8"));
  assert.equal(inventory.inventory_version, "RUFLO_READONLY_INVENTORY_V1");
  assert.equal(inventory.registry_sha256, createHash("sha256").update(registryRaw).digest("hex"));
  assert.ok(Object.values(inventory.boundaries).every((value) => value === 0));
  assert.ok(inventory.worktrees.every((worktree) => worktree.cleanup_authorized === false));
  for (const [file, expected] of Object.entries(hashes.files)) {
    const actual = createHash("sha256").update(readFileSync(`${root}/${file}`)).digest("hex");
    assert.equal(actual, expected, file);
  }
});

test("registry commands and checkpoint are indexed", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(packageJson.scripts["ruflo:registry:validate"], "node scripts/ruflo/validate_agent_registry_v1.mjs");
  assert.equal(packageJson.scripts["ruflo:inventory:build"], "node scripts/ruflo/build_readonly_inventory_v1.mjs");
  assert.match(packageJson.scripts["ruflo:registry:test"], /ruflo_agent_registry_v1\.test\.mjs/);
  for (const file of [
    "AGENTS.md",
    "docs/INDEX.md",
    "docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md",
    "docs/ops/RUFLO_CODEX_INTEGRATION_20261015.md",
  ]) {
    assert.match(readFileSync(file, "utf8"), /RUFLO_AGENT_REGISTRY_V1_20261016\.md/, file);
  }
});
