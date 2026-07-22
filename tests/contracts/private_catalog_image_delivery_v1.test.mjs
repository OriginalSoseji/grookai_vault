import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeCanonCardImageProxyUrl } from "../../apps/web/src/lib/canon/canonImageProxy.ts";

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
  const cardRoute = readSource(
    "apps",
    "web",
    "src",
    "app",
    "api",
    "canon",
    "cards",
    "[gv_id]",
    "image",
    "route.ts",
  );

  assert.match(proxy, /WAREHOUSE_CANON_IMAGE_PREFIXES\.some/);
  assert.match(route, /normalizeWarehouseCanonImagePath/);
  assert.match(route, /CDN-Cache-Control/);
  assert.match(route, /Vercel-CDN-Cache-Control/);
  assert.match(route, /\.from\(VAULT_INSTANCE_MEDIA_BUCKET\)/);
  assert.match(route, /\.download\(path\)/);
  assert.match(cardRoute, /CDN-Cache-Control/);
  assert.match(cardRoute, /Vercel-CDN-Cache-Control/);
  assert.match(cardRoute, /s-maxage=300, stale-while-revalidate=600/);
  assert.doesNotMatch(cardRoute, /31536000, immutable/);
});

test("stable card image proxy URLs survive the public image safety boundary", () => {
  const proxy = readSource("apps", "web", "src", "lib", "canon", "canonImageProxy.ts");
  const resolver = readSource("apps", "web", "src", "lib", "publicCardImage.ts");

  assert.match(proxy, /normalizeCanonCardImageProxyUrl/);
  assert.match(proxy, /buildCanonCardImageProxyUrl\(decodeURIComponent\(match\[1\]\)\)/);
  assert.match(resolver, /normalizeCanonCardImageProxyUrl\(normalized\)/);
  assert.match(resolver, /if \(canonCardProxyUrl\)/);

  assert.equal(
    normalizeCanonCardImageProxyUrl("/api/canon/cards/GV-PK-OBF-001/image"),
    "/api/canon/cards/GV-PK-OBF-001/image",
  );
  assert.equal(
    normalizeCanonCardImageProxyUrl("/api/canon/cards/gv-pk-obf-001/image"),
    "/api/canon/cards/GV-PK-OBF-001/image",
  );

  for (const rejected of [
    "/api/canon/cards/GV-PK-OBF-001/image?download=1",
    "/api/canon/cards/GV-PK-OBF-001/image#fragment",
    "https://grookaivault.com/api/canon/cards/GV-PK-OBF-001/image",
    "/api/canon/card/GV-PK-OBF-001/image",
    "/api/canon/cards/GV-PK-OBF-001/extra/image",
    "/api/canon/cards/GV-PK-OBF-001%2FEXTRA/image",
    "/api/canon/cards/not-a-gv-id/image",
    `/api/canon/cards/GV-${"A".repeat(100)}/image`,
  ]) {
    assert.equal(normalizeCanonCardImageProxyUrl(rejected), null, rejected);
  }
});
