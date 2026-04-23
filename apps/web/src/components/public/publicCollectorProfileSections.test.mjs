import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("public profile rail renders Wall first and active custom sections after it", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");
  const publicSectionsQuery = readSource("lib", "wallSections", "getPublicWallSectionsBySlug.ts");

  assert.match(profileContent, /return \[wall, \.\.\.customSections\]/);
  assert.match(profileContent, /Public profile rail must render Wall first, then active custom sections only/);
  assert.match(publicSectionsQuery, /\.eq\("is_active", true\)/);
  assert.doesNotMatch(publicSectionsQuery, /\.eq\("is_public"/);
  assert.match(publicSectionsQuery, /is_public is not a product visibility gate/);
});

test("inactive public sections fail closed and is_public does not gate normal visibility", () => {
  const publicSectionsQuery = readSource("lib", "wallSections", "getPublicWallSectionsBySlug.ts");
  const sectionShareQuery = readSource("lib", "wallSections", "getPublicSectionBySlugAndId.ts");
  const migration = readSource("..", "..", "..", "supabase", "migrations", "20260423000000_wall_sections_remove_public_gating_v1.sql");
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");

  assert.match(publicSectionsQuery, /row\.is_active !== true/);
  assert.doesNotMatch(publicSectionsQuery, /row\.is_public|eq\("is_public"/);
  assert.match(sectionShareQuery, /\.eq\("is_active", true\)/);
  assert.doesNotMatch(sectionShareQuery, /is_public/);
  assert.doesNotMatch(migration, /ws\.is_public = true/);
  assert.match(profileContent, /section\.kind === "custom"/);
  assert.match(profileContent, /section\.id !== PUBLIC_WALL_SECTION_ID/);
});

test("created custom sections default to surfaced compatibility state", () => {
  const createAction = readSource("lib", "wallSections", "createWallSectionAction.ts");

  assert.match(createAction, /Created custom sections surface automatically/);
  assert.match(createAction, /is_public: true/);
  assert.doesNotMatch(createAction, /is_public: false/);
});

test("section route keeps the public profile rail and selected section state", () => {
  const sectionPage = readSource("app", "u", "[slug]", "section", "[section_id]", "page.tsx");

  assert.match(sectionPage, /getPublicCollectorWallSectionsBySlug/);
  assert.match(sectionPage, /PublicCollectorProfileContent/);
  assert.match(sectionPage, /selectedSectionId=\{model\.section\.id\}/);
  assert.match(sectionPage, /section\.kind === "custom" && section\.id === model\.section\.id/);
});

test("Wall tab returns to the profile route and custom tabs use canonical section routes", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");

  assert.match(profileContent, /getPublicWallHref\(slug\)/);
  assert.match(profileContent, /getPublicSectionShareHref\(slug, section\.id\)/);
  assert.match(profileContent, /aria-current=\{active \? "page" : undefined\}/);
});

test("selected section cards and Wall cards do not render together", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");

  assert.match(profileContent, /activeSection\.kind === "wall" \?/);
  assert.match(profileContent, /cards=\{activeSection\.cards\}/);
  assert.match(profileContent, /\[\.\.\.\(activeSection\?\.cards \?\? \[\]\)\]\.filter\(isWallCard\)/);
});

test("public profile section UI keeps old Collection and Visible labels out", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");
  const routePage = readSource("app", "u", "[slug]", "page.tsx");
  const sectionPage = readSource("app", "u", "[slug]", "section", "[section_id]", "page.tsx");
  const userFacingLiterals = [...`${profileContent}\n${routePage}\n${sectionPage}`.matchAll(/"([^"]+)"|'([^']+)'/g)]
    .map((match) => match[1] ?? match[2] ?? "")
    .filter(Boolean);

  assert.equal(userFacingLiterals.includes("Collection"), false);
  assert.equal(userFacingLiterals.includes("Visible"), false);
});

test("empty selected public section renders the clean empty state", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");

  assert.match(profileContent, /<PublicCollectionEmptyState title="Nothing to show right now\." \/>/);
});
