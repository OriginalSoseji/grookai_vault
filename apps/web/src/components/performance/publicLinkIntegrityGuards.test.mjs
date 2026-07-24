import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const webSourceRoot = path.resolve(currentDirectory, "..", "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(webSourceRoot, ...segments), "utf8");
}

test("canon image route keeps indexed exact lookups hot and falls back for stale case", () => {
  const imageRoute = readSource("app", "api", "canon", "cards", "[gv_id]", "image", "route.ts");

  assert.match(imageRoute, /\.eq\("gv_id", gvId\)/);
  assert.match(imageRoute, /\.eq\("printing_gv_id", gvId\)/);
  assert.match(imageRoute, /\.ilike\("gv_id", gvId\)/);
  assert.match(imageRoute, /\.ilike\("printing_gv_id", gvId\)/);
  assert.ok(
    imageRoute.indexOf('.eq("gv_id", gvId)') < imageRoute.indexOf('.ilike("gv_id", gvId)'),
  );
  assert.ok(
    imageRoute.indexOf('.eq("printing_gv_id", gvId)') <
      imageRoute.indexOf('.ilike("printing_gv_id", gvId)'),
  );
});

test("profile social image is deterministic and cannot fail on remote card artwork", () => {
  const socialImage = readSource("app", "u", "[slug]", "opengraph-image.tsx");
  const nextConfig = fs.readFileSync(path.resolve(webSourceRoot, "..", "next.config.mjs"), "utf8");

  assert.match(socialImage, /getPublicProfileBySlug/);
  assert.match(socialImage, /grookai-logo-512\.png/);
  assert.match(socialImage, /new Response\(new Uint8Array\(image\)/);
  assert.doesNotMatch(socialImage, /getPublicCollectorWallViewBySlug/);
  assert.doesNotMatch(socialImage, /<img/);
  assert.doesNotMatch(socialImage, /normalizePublicCardImageSrc/);
  assert.doesNotMatch(socialImage, /from "next\/og"/);
  assert.match(nextConfig, /"\/u\/\[slug\]\/opengraph-image"[\s\S]*grookai-logo-512\.png/);
});

test("invalid public resource metadata terminates with a real not-found response", () => {
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");
  const setPage = readSource("app", "sets", "[set_code]", "page.tsx");
  const pokemonPage = readSource("app", "u", "[slug]", "pokemon", "[pokemon]", "page.tsx");

  assert.match(cardPage, /export async function generateMetadata[\s\S]*if \(!card\) \{\s*notFound\(\);/);
  assert.match(setPage, /export async function generateMetadata[\s\S]*if \(!setDetail\) \{\s*notFound\(\);/);
  assert.match(pokemonPage, /if \(matchingCards\.length === 0\) \{\s*notFound\(\);/);
});

test("card and set routes validate before opening a streaming loading boundary", () => {
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");
  const setPage = readSource("app", "sets", "[set_code]", "page.tsx");

  assert.equal(
    fs.existsSync(path.join(webSourceRoot, "app", "card", "[gv_id]", "loading.tsx")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(webSourceRoot, "app", "sets", "[set_code]", "loading.tsx")),
    false,
  );
  assert.match(cardPage, /if \(!card\) \{\s*notFound\(\);[\s\S]*<Suspense/);
  assert.match(setPage, /if \(!setDetail\) \{\s*notFound\(\);[\s\S]*<Suspense/);
});

test("GVVI sharing distinguishes the public link from the exact-copy ID", () => {
  const gvviPage = readSource("app", "gvvi", "[gvvi_id]", "page.tsx");

  assert.match(gvviPage, /label="Copy public link"/);
  assert.match(gvviPage, /label="Copy GVVI ID"/);
  assert.match(gvviPage, /alternates: \{ canonical: canonicalUrl \}/);
});

test("root metadata supplies a non-empty title and canonical metadata base", () => {
  const rootLayout = readSource("app", "layout.tsx");
  const homePage = readSource("app", "page.tsx");
  const dexPage = readSource("app", "dex", "page.tsx");

  assert.match(rootLayout, /metadataBase: new URL\(GROOKAI_VAULT_ORIGIN\)/);
  assert.match(rootLayout, /title: "Grookai Vault"/);
  assert.match(homePage, /alternates: \{ canonical: "\/" \}/);
  assert.match(homePage, /openGraph: \{ url: "\/" \}/);
  assert.match(dexPage, /title: "Grookai Dex \| Grookai Vault"/);
  assert.match(dexPage, /alternates: \{ canonical: "\/dex" \}/);
  assert.match(dexPage, /url: "\/dex"/);
});
