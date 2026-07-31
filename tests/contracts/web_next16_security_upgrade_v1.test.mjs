import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const rootUrl = new URL("../../", import.meta.url);

function source(relativePath) {
  return readFileSync(new URL(relativePath, rootUrl), "utf8").replaceAll("\r\n", "\n");
}

function json(relativePath) {
  return JSON.parse(source(relativePath));
}

test("web runtime is pinned to the governed Next 16 and React 19 baseline", () => {
  const packageJson = json("apps/web/package.json");

  assert.equal(packageJson.dependencies.next, "16.2.12");
  assert.equal(packageJson.dependencies.react, "19.2.8");
  assert.equal(packageJson.dependencies["react-dom"], "19.2.8");
  assert.equal(packageJson.devDependencies["eslint-config-next"], "16.2.12");
  assert.equal(packageJson.devDependencies.eslint, "9.39.5");
  assert.equal(packageJson.scripts.lint, "eslint . --max-warnings=0");
});

test("web dependency overrides retain the audited transitive security floor", () => {
  const packageJson = json("apps/web/package.json");

  assert.equal(packageJson.overrides.postcss, "$postcss");
  assert.equal(packageJson.overrides.sharp, "0.35.3");
  assert.equal(packageJson.overrides["brace-expansion"], "5.0.9");
  assert.equal(packageJson.overrides.minimatch, "10.2.6");
});

test("Next 16 request interception uses proxy and no legacy middleware entrypoint", () => {
  assert.equal(existsSync(new URL("apps/web/src/middleware.ts", rootUrl)), false);
  assert.equal(existsSync(new URL("apps/web/src/proxy.ts", rootUrl)), true);

  const proxy = source("apps/web/src/proxy.ts");
  assert.match(proxy, /export async function proxy\(/);
  assert.match(proxy, /export const config\s*=\s*\{/);
  assert.match(proxy, /matcher:/);
});

test("strict production build deliberately retains the verified webpack engine", () => {
  const buildWrapper = source("scripts/ci/run_next_build_with_system_ca.mjs");

  assert.match(buildWrapper, /"build",\s*"--webpack"/);
});
