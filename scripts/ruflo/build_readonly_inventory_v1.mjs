import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  normalizeAbsolutePath,
  normalizeRepoPath,
  readRegistryV1,
} from "./validate_agent_registry_v1.mjs";

export const INVENTORY_VERSION = "RUFLO_READONLY_INVENTORY_V1";

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function command(binary, args, { cwd, allowFailure = false } = {}) {
  try {
    return execFileSync(binary, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function git(args, options = {}) {
  return command("git", args, options);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = String(row[key] ?? "unknown");
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function parseWorktreesV1(value) {
  const rows = [];
  let row = null;
  for (const line of `${value}\n`.split(/\r?\n/)) {
    if (!line) {
      if (row) rows.push(row);
      row = null;
      continue;
    }
    const space = line.indexOf(" ");
    const key = space === -1 ? line : line.slice(0, space);
    const data = space === -1 ? true : line.slice(space + 1);
    if (key === "worktree") row = { path: data, detached: false };
    else if (row && key === "HEAD") row.head = data;
    else if (row && key === "branch") row.branch = data.replace("refs/heads/", "");
    else if (row && key === "detached") row.detached = true;
    else if (row && key === "prunable") row.prunable = data;
  }
  return rows;
}

function inferDomain(sourceLocator) {
  const source = sourceLocator.toLowerCase();
  const directBackend = source.match(/^backend\/([^/]+)\//)?.[1];
  if (directBackend) return directBackend;
  const rules = [
    ["mee", "market_evidence"],
    ["tcgplayer", "pricing"],
    ["pricing", "pricing"],
    ["market", "pricing"],
    ["pokemon", "catalog"],
    ["catalog", "catalog"],
    ["mtg", "catalog"],
    ["one_piece", "catalog"],
    ["collectible", "catalog"],
    ["image", "images"],
    ["founder", "operations"],
    ["operations", "operations"],
    ["release", "release"],
    ["flutter", "client"],
    ["mobile", "client"],
    ["supabase", "infrastructure"],
    ["migration", "infrastructure"],
    ["contract", "governance"],
    ["probe", "observability"],
  ];
  return rules.find(([needle]) => source.includes(needle))?.[1] ?? "automation";
}

function surfaceKey(kind, sourceLocator) {
  const readable = sourceLocator
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(-80);
  return `${kind}.${readable}.${sha256(sourceLocator).slice(0, 10)}`;
}

export function discoverTrackedSurfacesV1({ repoRoot, registry }) {
  const trackedRaw = git(
    ["ls-files", "-z", "--", ...registry.surface_rules.map((rule) => rule.root)],
    { cwd: repoRoot },
  );
  const tracked = trackedRaw.split("\0").filter(Boolean).map(normalizeRepoPath);
  const surfaces = [];
  const classifiedPaths = new Set();

  for (const rule of registry.surface_rules) {
    const root = normalizeRepoPath(rule.root).replace(/\/$/, "");
    const pattern = new RegExp(rule.pattern, "i");
    for (const sourceLocator of tracked) {
      if (!(sourceLocator === root || sourceLocator.startsWith(`${root}/`))) continue;
      const relative = sourceLocator === root ? "" : sourceLocator.slice(root.length + 1);
      if (!pattern.test(relative)) continue;
      const collisionKey = `${rule.surface_kind}:${sourceLocator}`;
      if (classifiedPaths.has(collisionKey)) continue;
      classifiedPaths.add(collisionKey);
      surfaces.push({
        surface_key: surfaceKey(rule.surface_kind, sourceLocator),
        surface_kind: rule.surface_kind,
        domain: inferDomain(sourceLocator),
        source_locator: sourceLocator,
        integration_class: rule.integration_class,
        permission_tier: rule.permission_tier,
        execution_enabled: false,
        classification_source: "surface_rule",
      });
    }
  }

  for (const lane of registry.host_lanes) {
    surfaces.push({
      ...lane,
      domain: inferDomain(lane.source_locator),
      classification_source: "host_lane_registry",
    });
  }

  return surfaces.sort((left, right) =>
    left.surface_kind.localeCompare(right.surface_kind)
      || left.source_locator.localeCompare(right.source_locator));
}

function collectWorktreeStatus(worktree) {
  const raw = git(
    ["-C", worktree.path, "status", "--porcelain=v1", "--untracked-files=normal"],
    { allowFailure: true },
  );
  if (raw === null) {
    return { status_available: false, dirty: null, change_count: null };
  }
  const records = raw.split(/\r?\n/).filter(Boolean);
  return { status_available: true, dirty: records.length > 0, change_count: records.length };
}

export function discoverWorktreesV1({ repoRoot, registry }) {
  const declared = new Map(
    registry.protected_roots.map((entry) => [normalizeAbsolutePath(entry.path), entry]),
  );
  const worktrees = parseWorktreesV1(git(["worktree", "list", "--porcelain"], { cwd: repoRoot }));
  return worktrees.map((worktree) => {
    const normalized = normalizeAbsolutePath(worktree.path);
    const configured = declared.get(normalized) ?? null;
    return {
      path: worktree.path.replaceAll("\\", "/"),
      branch: worktree.branch ?? null,
      head: worktree.head ?? null,
      detached: worktree.detached === true,
      prunable: worktree.prunable ?? null,
      ...collectWorktreeStatus(worktree),
      protection: "protected",
      protection_source: configured ? "protected_root_registry" : "dynamic_fail_closed_discovery",
      configured_reason: configured?.reason ?? "Unknown or newly discovered worktree is protected by default.",
      write_allowed: false,
      cleanup_authorized: false,
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
}

function markdownCountTable(counts) {
  const rows = Object.entries(counts).map(([name, count]) => `| ${name} | ${count} |`).join("\n");
  return `| Value | Count |\n|---|---:|\n${rows || "| none | 0 |"}`;
}

function buildMarkdown(inventory) {
  const worktreeRows = inventory.worktrees.map((worktree) =>
    `| \`${worktree.path}\` | ${worktree.branch ? `\`${worktree.branch}\`` : "detached"} | ${worktree.status_available ? String(worktree.dirty) : "unreadable"} | ${worktree.change_count ?? "unknown"} | protected |`,
  ).join("\n");
  return `# Ruflo Read-Only Inventory V1\n\n`
    + `- Generated: \`${inventory.generated_at}\`\n`
    + `- Source commit: \`${inventory.source_commit_sha}\`\n`
    + `- Inventory fingerprint: \`${inventory.inventory_fingerprint_sha256}\`\n\n`
    + `## Boundary\n\n`
    + `This inventory is read-only. It authorizes zero agent executions, workflow dispatches, production writes, external actions, branch/worktree cleanup operations, or cross-worktree writes. Every discovered worktree is protected.\n\n`
    + `## Counts\n\n`
    + `- Registry agents: ${inventory.counts.agents}\n`
    + `- Automation surfaces: ${inventory.counts.surfaces}\n`
    + `- Host lanes: ${inventory.counts.host_lanes}\n`
    + `- Discovered worktrees: ${inventory.counts.worktrees}\n`
    + `- Dirty worktrees: ${inventory.counts.dirty_worktrees}\n`
    + `- Unreadable worktrees: ${inventory.counts.unreadable_worktrees}\n\n`
    + `### Surfaces By Kind\n\n${markdownCountTable(inventory.counts.surfaces_by_kind)}\n\n`
    + `### Surfaces By Domain\n\n${markdownCountTable(inventory.counts.surfaces_by_domain)}\n\n`
    + `## Worktrees\n\n`
    + `| Path | Branch | Dirty | Changes | Policy |\n|---|---|---:|---:|---|\n${worktreeRows}\n\n`
    + `## Runtime Qualification\n\n`
    + `Configured host lanes are classified from checked-in source and contracts. This inventory does not assert that a Windows task, systemd timer, GitHub schedule, or production runtime is currently installed, enabled, healthy, or authorized. Those facts require direct readback from the owning system.\n`;
}

export function buildInventoryV1({ repoRoot, registryPath, generatedAt = new Date().toISOString() }) {
  const relativeRegistryPath = normalizeRepoPath(registryPath);
  const registryRaw = readFileSync(path.resolve(repoRoot, relativeRegistryPath), "utf8");
  const { registry, summary: registrySummary } = readRegistryV1(relativeRegistryPath, { repoRoot });
  const surfaces = discoverTrackedSurfacesV1({ repoRoot, registry });
  const worktrees = discoverWorktreesV1({ repoRoot, registry });
  const sourceCommitSha = git(["rev-parse", "HEAD"], { cwd: repoRoot });
  const sourceBranch = git(["symbolic-ref", "--quiet", "--short", "HEAD"], {
    cwd: repoRoot,
    allowFailure: true,
  });
  const inventoryCore = {
    inventory_version: INVENTORY_VERSION,
    registry_version: registry.schema_version,
    registry_sha256: sha256(registryRaw),
    source_commit_sha: sourceCommitSha,
    source_branch: sourceBranch,
    agents: registry.agents,
    surfaces,
    worktrees,
    declared_protected_roots: registry.protected_roots.map((entry) => ({
      ...entry,
      exists_on_inventory_host: existsSync(entry.path),
    })),
    counts: {
      agents: registry.agents.length,
      registered_agents: registrySummary.registered_agent_count,
      non_executable_agents: registrySummary.non_executable_agent_count,
      surfaces: surfaces.length,
      host_lanes: registry.host_lanes.length,
      worktrees: worktrees.length,
      dirty_worktrees: worktrees.filter((worktree) => worktree.dirty === true).length,
      unreadable_worktrees: worktrees.filter((worktree) => worktree.status_available === false).length,
      surfaces_by_kind: countBy(surfaces, "surface_kind"),
      surfaces_by_domain: countBy(surfaces, "domain"),
    },
    boundaries: {
      agent_executions: 0,
      workflow_dispatches: 0,
      production_writes: 0,
      external_actions: 0,
      branch_cleanups: 0,
      worktree_cleanups: 0,
      cross_worktree_writes: 0,
    },
  };
  return {
    ...inventoryCore,
    generated_at: generatedAt,
    inventory_fingerprint_sha256: sha256(stableJson(inventoryCore)),
  };
}

export function writeInventoryV1({ inventory, outDir }) {
  mkdirSync(outDir, { recursive: true });
  const jsonName = "current_inventory_v1.json";
  const markdownName = "RUFLO_READONLY_INVENTORY_V1.md";
  const hashesName = "artifact_hashes.json";
  const json = `${JSON.stringify(inventory, null, 2)}\n`;
  const markdown = buildMarkdown(inventory);
  writeFileSync(path.join(outDir, jsonName), json);
  writeFileSync(path.join(outDir, markdownName), markdown);
  const hashes = {
    inventory_version: inventory.inventory_version,
    inventory_fingerprint_sha256: inventory.inventory_fingerprint_sha256,
    files: {
      [jsonName]: sha256(json),
      [markdownName]: sha256(markdown),
    },
  };
  writeFileSync(path.join(outDir, hashesName), `${JSON.stringify(hashes, null, 2)}\n`);
  return { out_dir: outDir, files: [jsonName, markdownName, hashesName], hashes };
}

function main() {
  const repoRoot = path.resolve(argument("repo-root", git(["rev-parse", "--show-toplevel"], { cwd: process.cwd() })));
  const registryPath = argument("registry", "config/ruflo/agent_registry_v1.json");
  const outDir = path.resolve(repoRoot, argument("out-dir", "docs/audits/ruflo_agent_registry_v1"));
  const generatedAt = argument("as-of", new Date().toISOString());
  const inventory = buildInventoryV1({ repoRoot, registryPath, generatedAt });
  const written = writeInventoryV1({ inventory, outDir });
  process.stdout.write(`${JSON.stringify({ status: "pass", counts: inventory.counts, boundaries: inventory.boundaries, ...written }, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main();
