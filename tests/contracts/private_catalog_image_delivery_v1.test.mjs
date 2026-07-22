import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function readSource(...segments) {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

test("legacy private catalog URLs are routed through the bounded canon proxy", () => {
  const proxy = readSource("apps", "web", "src", "lib", "canon", "canonImageProxy.ts");
  const resolver = readSource("apps", "web", "src", "lib", "publicCardImage.ts");

  assert.match(proxy, /warehouse-derived\/self-hosted-images-v1\//);
  assert.match(proxy, /warehouse-derived\/image-truth-v1\//);
  assert.match(proxy, /storage\/v1\/object\/public\/\$\{PRIVATE_CARD_IMAGE_BUCKET\}/);
  assert.match(proxy, /extractWarehouseCanonImagePathFromStorageUrl/);
  assert.match(proxy, /normalizeWarehouseCanonImagePath\(objectPath\)/);
  assert.match(resolver, /buildCanonImageProxyUrlFromStorageUrl\(unwrapped\)/);
  assert.match(resolver, /isPrivateCardImagePublicUrl\(value\)/);
  assert.match(resolver, /isUsablePublicImageUrl\(normalized\) \? normalized : undefined/);
});

test("the catalog image proxy is CDN-cacheable and remains prefix restricted", () => {
  const proxy = readSource("apps", "web", "src", "lib", "canon", "canonImageProxy.ts");
  const route = readSource("apps", "web", "src", "app", "api", "canon", "image", "route.ts");

  assert.match(proxy, /WAREHOUSE_CANON_IMAGE_PREFIXES\.some/);
  assert.match(route, /normalizeWarehouseCanonImagePath/);
  assert.match(route, /CDN-Cache-Control/);
  assert.match(route, /Vercel-CDN-Cache-Control/);
  assert.match(route, /\.from\(VAULT_INSTANCE_MEDIA_BUCKET\)/);
  assert.match(route, /\.download\(path\)/);
});
