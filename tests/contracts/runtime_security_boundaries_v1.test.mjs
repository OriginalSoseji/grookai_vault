import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const resolverSource = fs.readFileSync("apps/web/src/lib/resolver/normalizeQuery.ts", "utf8");
const discoverSource = fs.readFileSync("apps/web/src/lib/network/getCollectorDiscoverRows.ts", "utf8");
const aiServiceSource = fs.readFileSync("backend/ai_border_service/app.py", "utf8");
const aiClientSource = fs.readFileSync("backend/condition/ai_border_detector_client.mjs", "utf8");
const appleAutomationSource = fs.readFileSync(
  "scripts/app_store_connect/ios_release_automation.rb",
  "utf8",
);

test("collector phrase normalization avoids nested unbounded repetition", () => {
  assert.doesNotMatch(resolverSource, /\(\?:\\s\+\|-\)\+/);
  for (const pattern of [
    String.raw`\bgold[\s-]+star\b`,
    String.raw`\bfelt[\s-]+hat\b`,
    String.raw`\bbaby[\s-]+shiny\b`,
    String.raw`\balt[\s-]+art\b`,
  ]) {
    assert.equal(resolverSource.includes(pattern), true);
  }
  assert.match(resolverSource, /function isResolverTokenCharacter\(code: number\)/);
});

test("collector discovery quotes PostgREST filter values before OR composition", () => {
  assert.match(discoverSource, /function buildQuotedIlikePattern\(value: string\)/);
  assert.match(discoverSource, /character === "\\\\" \|\| character === '\"'/);
  assert.match(discoverSource, /character === "%" \|\| character === "_"/);
  assert.match(discoverSource, /display_name\.ilike\.\$\{quotedPattern\},slug\.ilike\.\$\{quotedPattern\}/);
  assert.doesNotMatch(discoverSource, /replace\(\/\[%_\]\/g/);
});

test("all AI image-processing routes require the shared token and return stable public errors", () => {
  assert.match(aiServiceSource, /hmac\.compare_digest\(got, expected\)/);
  for (const route of ["detect-card-border", "ocr-card-signals", "warp-card-quad", "ai-identify-warp"]) {
    assert.match(
      aiServiceSource,
      new RegExp(`@app\\.post\\(\"/${route}\"\\)[\\s\\S]{0,180}_require_gv_token\\(request\\)`),
    );
  }
  assert.doesNotMatch(aiServiceSource, /traceback\.format_exc\(\)/);
  assert.doesNotMatch(aiServiceSource, /\"error\": str\(e\)/);
  assert.equal((aiClientSource.match(/'x-gv-token': token/g) ?? []).length, 3);
});

test("shared AI client sends the configured token on every protected route", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnable = process.env.GV_AI_BORDER_ENABLE;
  const originalUrl = process.env.GV_AI_BORDER_URL;
  const originalToken = process.env.GV_AI_ENDPOINT_TOKEN;
  const calls = [];

  process.env.GV_AI_BORDER_ENABLE = "1";
  process.env.GV_AI_BORDER_URL = "https://ai.example.test";
  process.env.GV_AI_ENDPOINT_TOKEN = "contract-test-token";
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), headers: options.headers });
    if (String(url).endsWith("/detect-card-border")) {
      return new Response(
        JSON.stringify({ confidence: 0.9, polygon_norm: [[0, 0], [1, 0], [1, 1], [0, 1]] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (String(url).endsWith("/warp-card-quad")) {
      return new Response(
        JSON.stringify({ warped_jpg_b64: Buffer.from("warped-image-bytes").toString("base64") }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ number_raw: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = await import("../../backend/condition/ai_border_detector_client.mjs");
    const imageBuffer = Buffer.from("test-image");
    assert.equal((await client.detectOuterBorderAI({ imageBuffer })).ok, true);
    assert.equal(
      (
        await client.warpCardQuadAI({
          imageBuffer,
          quadNorm: [[0, 0], [1, 0], [1, 1], [0, 1]],
          outW: 10,
          outH: 10,
        })
      ).ok,
      true,
    );
    assert.equal((await client.ocrCardSignalsAI({ imageBuffer })).ok, true);
    assert.equal(calls.length, 3);
    assert.equal(
      calls.every((call) => call.headers["x-gv-token"] === "contract-test-token"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnable === undefined) delete process.env.GV_AI_BORDER_ENABLE;
    else process.env.GV_AI_BORDER_ENABLE = originalEnable;
    if (originalUrl === undefined) delete process.env.GV_AI_BORDER_URL;
    else process.env.GV_AI_BORDER_URL = originalUrl;
    if (originalToken === undefined) delete process.env.GV_AI_ENDPOINT_TOKEN;
    else process.env.GV_AI_ENDPOINT_TOKEN = originalToken;
  }
});

test("App Store asset uploads are restricted to Apple's HTTPS blobstore hosts", () => {
  assert.equal(appleAutomationSource.includes('APPLE_UPLOAD_HOST_SUFFIX = ".blobstore.apple.com"'), true);
  assert.match(appleAutomationSource, /uri = validated_asset_upload_uri\(operation\.fetch\("url"\)\)/);
  assert.match(appleAutomationSource, /uri\.is_a\?\(URI::HTTPS\)/);
  assert.match(appleAutomationSource, /uri\.userinfo\.nil\?/);
  assert.match(appleAutomationSource, /uri\.port == 443/);
  assert.match(appleAutomationSource, /host\.end_with\?\(APPLE_UPLOAD_HOST_SUFFIX\)/);
});
