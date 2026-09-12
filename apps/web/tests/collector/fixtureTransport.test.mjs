import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadTs(relativePath) {
  const filename = path.resolve(webRoot, relativePath);
  const testModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports: testModule.exports, module: testModule, URL, __dirname: path.dirname(filename),
    require: (id) => {
      if (id.startsWith("@/")) return loadTs(`src/${id.slice(2)}.ts`);
      if (id.startsWith(".")) return loadTs(path.relative(webRoot, path.resolve(path.dirname(filename), `${id}.ts`)));
      return require(id);
    },
  }, { filename });
  return testModule.exports;
}

const { collectorFixtureAssets } = loadTs("src/app/visual-fixtures/collector/fixtureAssets.ts");
const { normalizePublicCardImageSrc, shouldBypassNextImageOptimization } = loadTs("src/lib/publicCardImage.ts");
const { createCollectorFixtureRequestHandler } = loadTs("tests/collector/fixtureSetup.ts");
const baseURL = "http://127.0.0.1:3164";
const handle = createCollectorFixtureRequestHandler(baseURL);

function fakeRoute(url, method = "GET") {
  const calls = [];
  return {
    calls,
    request: () => ({ url: () => url, method: () => method }),
    abort: async (reason) => calls.push({ type: "abort", reason }),
    fulfill: async (options) => calls.push({ type: "fulfill", ...options }),
    continue: async () => calls.push({ type: "continue" }),
  };
}

test("fixture props pass the unchanged real image policy and refer to present local WebP artwork", () => {
  assert.equal(collectorFixtureAssets.length, 3);
  for (const asset of collectorFixtureAssets) {
    assert.equal(normalizePublicCardImageSrc(asset.url), asset.url);
    assert.equal(shouldBypassNextImageOptimization(asset.url), true);
    const bytes = readFileSync(path.join(webRoot, "public/visual-fixtures/collector", asset.fileName));
    assert.ok(bytes.length > 1000);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  }
  assert.equal(normalizePublicCardImageSrc("/visual-fixtures/collector/charizard199.jpg"), undefined);
});

test("every exact public fixture URL and optimizer wrapper is fulfilled from its own local file", async () => {
  for (const asset of collectorFixtureAssets) {
    const bytes = readFileSync(path.join(webRoot, "public/visual-fixtures/collector", asset.fileName));
    for (const url of [asset.url, `${baseURL}/_next/image?url=${encodeURIComponent(asset.url)}&w=384&q=75`]) {
      const route = fakeRoute(url);
      await handle(route);
      assert.equal(route.calls.length, 1);
      assert.equal(route.calls[0].type, "fulfill");
      assert.equal(route.calls[0].contentType, "image/webp");
      assert.deepEqual(route.calls[0].body, bytes);
    }
  }
});

test("only the exact same-origin stack-frame devtools POST is silently aborted", async () => {
  const route = fakeRoute(`${baseURL}/__nextjs_original-stack-frames`, "POST");
  await handle(route);
  assert.deepEqual(route.calls, [{ type: "abort", reason: "blockedbyclient" }]);
  for (const [url, method] of [
    [`${baseURL}/api/follows/state`, "POST"],
    [`${baseURL}/visual-fixtures/collector`, "POST"],
    [`${baseURL}/__nextjs_other-endpoint`, "POST"],
    [`${baseURL}/__nextjs_original-stack-frames`, "PUT"],
    ["https://example.test/__nextjs_original-stack-frames", "POST"],
    [collectorFixtureAssets[0].url, "POST"],
  ]) {
    const rejected = fakeRoute(url, method);
    await assert.rejects(handle(rejected), /non-fixture request/);
    assert.deepEqual(rejected.calls, [{ type: "abort", reason: "blockedbyclient" }]);
  }
});

test("unmapped image requests cannot escape to a CDN or trigger optimizer SSRF", async () => {
  for (const url of [
    "https://images.pokemontcg.io/not-a-fixture.png",
    `${collectorFixtureAssets[0].url}?unexpected=1`,
    `${baseURL}/_next/image?url=${encodeURIComponent("http://169.254.169.254/latest/meta-data/")}`,
    `${baseURL}/_next/image?url=${encodeURIComponent("/api/private")}`,
  ]) {
    const route = fakeRoute(url);
    await assert.rejects(handle(route), /non-fixture request|optimizer request/);
    assert.equal(route.calls[0].type, "abort");
    assert.equal(route.calls.length, 1);
  }
  assert.throws(() => createCollectorFixtureRequestHandler("https://grookaivault.com"), /loopback/);
});
