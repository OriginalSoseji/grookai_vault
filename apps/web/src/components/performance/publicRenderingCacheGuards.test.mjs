import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("root chrome does not perform server auth reads during public render", () => {
  const appChrome = readSource("components", "layout", "AppChrome.tsx");
  const layout = readSource("app", "layout.tsx");

  assert.match(appChrome, /Public routes must not depend on global auth\/session reads/);
  assert.doesNotMatch(appChrome, /createServerComponentClient|getUnreadCardInteractionGroupCount/);
  assert.match(appChrome, /supabase\.auth\.getSession/);
  assert.match(layout, /<AppChrome \/>/);
});

test("primary public routes use bounded revalidation instead of force-dynamic", () => {
  const publicRouteSources = [
    readSource("app", "page.tsx"),
    readSource("app", "explore", "page.tsx"),
    readSource("app", "network", "page.tsx"),
    readSource("app", "network", "discover", "page.tsx"),
    readSource("app", "u", "[slug]", "page.tsx"),
    readSource("app", "u", "[slug]", "section", "[section_id]", "page.tsx"),
    readSource("app", "card", "[gv_id]", "page.tsx"),
    readSource("app", "gvvi", "[gvvi_id]", "page.tsx"),
    readSource("app", "sets", "page.tsx"),
    readSource("app", "sets", "[set_code]", "page.tsx"),
    readSource("app", "compare", "page.tsx"),
  ].join("\n");

  assert.doesNotMatch(publicRouteSources, /force-dynamic|revalidate\s*=\s*0/);
  assert.match(publicRouteSources, /export const revalidate = 60/);
  assert.match(publicRouteSources, /export const revalidate = 120/);
  assert.match(publicRouteSources, /export const revalidate = 300/);
});

test("public read helpers use the anonymous public server client", () => {
  const publicClient = readSource("lib", "supabase", "publicServer.ts");
  const wallCards = readSource("lib", "wallSections", "getPublicWallCardsBySlug.ts");
  const wallSections = readSource("lib", "wallSections", "getPublicWallSectionsBySlug.ts");
  const sectionCards = readSource("lib", "wallSections", "getPublicSectionCardsBySlug.ts");
  const streamRows = readSource("lib", "network", "getCardStreamRows.ts");

  assert.match(publicClient, /Public read helpers should be cacheable by default/);
  assert.doesNotMatch(`${wallCards}\n${wallSections}\n${sectionCards}\n${streamRows}`, /createServerComponentClient/);
  assert.match(`${wallCards}\n${wallSections}\n${sectionCards}\n${streamRows}`, /createPublicServerClient/);
});

test("Wall route does not eagerly fetch every custom section card grid", () => {
  const wallRoute = readSource("app", "u", "[slug]", "page.tsx");
  const wallViewHelper = readSource("lib", "wallSections", "getPublicCollectorWallViewBySlug.ts");
  const allSectionsHelper = readSource("lib", "wallSections", "getPublicCollectorWallSectionsBySlug.ts");

  assert.match(wallRoute, /getPublicCollectorWallViewBySlug/);
  assert.doesNotMatch(wallRoute, /getPublicCollectorWallSectionsBySlug/);
  assert.match(wallViewHelper, /section rail summaries only/);
  assert.doesNotMatch(wallViewHelper, /getPublicSectionCardsBySlug/);
  assert.match(allSectionsHelper, /getPublicSectionCardsBySlug/);
});

test("public card image chooses an initial source before hydration", () => {
  const publicCardImage = readSource("components", "PublicCardImage.tsx");

  assert.match(publicCardImage, /const initialSrc = normalizedPrimary \?\? normalizedFallback/);
  assert.match(publicCardImage, /useState<string \| undefined>\(initialSrc\)/);
  assert.match(publicCardImage, /Hydration must not be required just to choose the first image source/);
  assert.match(publicCardImage, /sizes=\{sizes\}/);
});
