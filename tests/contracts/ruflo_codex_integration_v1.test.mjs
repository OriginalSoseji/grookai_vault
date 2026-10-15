import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const config = read(".codex/config.toml");
const agents = read("AGENTS.md");
const playbook = read("docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md");
const runbook = read("docs/ops/RUFLO_CODEX_INTEGRATION_20261015.md");
const gitignore = read(".gitignore");

test("Ruflo remains pinned to a project-scoped stdio MCP server", () => {
  assert.match(config, /^\[mcp_servers\.ruflo\]$/m);
  assert.match(config, /"ruflo@3\.56\.9"/);
  assert.doesNotMatch(config, /ruflo@latest/);
  assert.match(config, /"--transport",\s*\n\s*"stdio"/);
  assert.doesNotMatch(config, /"(?:http|websocket|daemon)"/i);
  assert.match(config, /^startup_timeout_sec = 120$/m);
  assert.match(config, /^tool_timeout_sec = 120$/m);
  assert.match(config, /^NODE_OPTIONS = "--use-system-ca"$/m);
});

test("Ruflo tool advertisement excludes broad external and shell surfaces", () => {
  const allowlist = config.match(/"--tools",\s*\n\s*"([^"]+)"/u)?.[1];
  assert.ok(allowlist, "expected an explicit Ruflo tool allowlist");

  const selectors = new Set(allowlist.split(","));
  for (const required of [
    "agent_spawn",
    "agent_execute",
    "swarm",
    "task",
    "memory_store",
    "memory_retrieve",
    "memory_search",
    "coordination",
    "progress",
    "guidance",
  ]) {
    assert.ok(selectors.has(required), `missing required selector: ${required}`);
  }

  for (const forbidden of [
    "terminal",
    "github",
    "browser",
    "federation",
    "managed_agent",
    "http_fetch",
  ]) {
    assert.ok(
      ![...selectors].some(
        (selector) => selector === forbidden || selector.startsWith(`${forbidden}_`),
      ),
      `forbidden selector advertised: ${forbidden}`,
    );
  }
});

test("Ruflo operating boundary is indexed and runtime state stays untracked", () => {
  assert.match(agents, /RUFLO_CODEX_INTEGRATION_20261015\.md/);
  assert.match(playbook, /RUFLO_CODEX_INTEGRATION_20261015\.md/);
  assert.match(runbook, /do not run\s+`ruflo init`/i);
  assert.match(runbook, /zero `terminal_\*`, `github_\*`, `browser_\*`, `federation_\*`, or\s+`managed_agent_\*` tools/i);
  assert.match(gitignore, /^\.claude-flow\/data\/$/m);
  assert.match(gitignore, /^\.claude-flow\/logs\/$/m);
  assert.doesNotMatch(gitignore, /^\.codex\/$/m);
});
