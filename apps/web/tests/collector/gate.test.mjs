import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

test("collector fixture retains the existing fail-closed local parity gate", () => {
  const page = source("app/visual-fixtures/collector/page.tsx");
  assert.match(page, /if \(!isLocalVisualParityFixtureMode\(\)\) notFound\(\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  const code = ts.transpileModule(source("lib/visualParity/fixtureMode.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const [env, expected] of [
    [{}, false],
    [{ GROOKAI_VISUAL_TEST_MODE: "1", NODE_ENV: "development" }, true],
    [{ GROOKAI_VISUAL_TEST_MODE: "1", NODE_ENV: "production" }, false],
    [{ GROOKAI_VISUAL_TEST_MODE: "1", VERCEL: "1", NODE_ENV: "development" }, false],
  ]) {
    const exports = {};
    vm.runInNewContext(code, { exports, process: { env }, require: (name) => {
      assert.equal(name, "server-only");
      return {};
    } });
    assert.equal(exports.isLocalVisualParityFixtureMode(), expected);
  }
});

test("collector fixture uses real components and synthetic props, not preview state or readers", () => {
  const page = source("app/visual-fixtures/collector/page.tsx");
  for (const component of ["SiteHeader", "MobileParityDock", "NetworkPageLayout", "NetworkStreamCard", "CollectorListRow", "ExploreDiscoverySections", "PokemonCardGridTile", "PublicSetTile", "BinderSummaryCard"]) {
    assert.match(page, new RegExp(`<${component}\\b`));
  }
  for (const path of ["app/visual-fixtures/collector/page.tsx", "app/visual-fixtures/collector/fixtureData.ts"]) {
    assert.doesNotMatch(source(path), /collector-site-preview|localStorage|useStore|fetch\(|createServer|await get\w+Rows|\.rpc\(/);
  }
  assert.match(page, /isAuthenticated=\{false\} viewerUserId=\{null\}/);
});
