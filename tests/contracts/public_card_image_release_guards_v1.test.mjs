import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function readSource(...segments) {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

test("public card image URLs unwrap nested Next optimizer sources before rendering", () => {
  const imageHelper = readSource("apps", "web", "src", "lib", "publicCardImage.ts");
  const publicCardImage = readSource("apps", "web", "src", "components", "PublicCardImage.tsx");

  assert.match(imageHelper, /NEXT_IMAGE_PATHNAME = "\/_next\/image"/);
  assert.match(imageHelper, /NEXT_IMAGE_UNWRAP_LIMIT = 3/);
  assert.match(imageHelper, /url\.searchParams\.get\("url"\)/);
  assert.match(imageHelper, /unwrapNextImageUrl\(normalized\)/);
  assert.match(imageHelper, /normalizeCanonCardImageProxyUrl\(normalized\)/);
  assert.match(imageHelper, /if \(canonCardProxyUrl\)/);
  assert.match(publicCardImage, /normalizePublicCardImageSrc\(src\)/);
  assert.match(publicCardImage, /normalizePublicCardImageSrc\(fallbackSrc\)/);
});

test("fragile external image hosts bypass Next image optimization", () => {
  const imageHelper = readSource("apps", "web", "src", "lib", "publicCardImage.ts");
  const publicCardImage = readSource("apps", "web", "src", "components", "PublicCardImage.tsx");

  assert.match(imageHelper, /shouldBypassNextImageOptimization/);
  assert.match(imageHelper, /url\.hostname === "assets\.tcgdex\.net"/);
  assert.match(imageHelper, /url\.hostname === "raw\.githubusercontent\.com"/);
  assert.match(imageHelper, /\/PokeAPI\/sprites\/master\/sprites\/pokemon\//);
  assert.match(publicCardImage, /const renderUnoptimized = unoptimized \|\| shouldBypassNextImageOptimization\(activeSrc\)/);
  assert.match(publicCardImage, /unoptimized=\{renderUnoptimized\}/);
});
