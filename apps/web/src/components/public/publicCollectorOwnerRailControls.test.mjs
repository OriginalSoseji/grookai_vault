import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("owner profile rail exposes Add Section only after owner verification", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");
  const ownerSectionsApi = readSource("app", "api", "wall", "owner-sections", "route.ts");

  assert.match(profileContent, /useClientViewer\(viewerUserId\)/);
  assert.match(profileContent, /fetch\(`\/api\/wall\/owner-sections\?collectorUserId=/);
  assert.match(profileContent, /canManageSections \? \(/);
  assert.match(profileContent, /\+ Add Section/);
  assert.match(ownerSectionsApi, /createRouteHandlerClient/);
  assert.match(ownerSectionsApi, /user\.id !== collectorUserId/);
  assert.match(ownerSectionsApi, /Cache-Control": "private, no-store"/);
});

test("public viewers fail closed and do not receive owner rail controls", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");
  const ownerSectionsApi = readSource("app", "api", "wall", "owner-sections", "route.ts");

  assert.match(profileContent, /clientViewer\.userId !== collectorUserId/);
  assert.match(profileContent, /isOwner: false/);
  assert.match(profileContent, /Owner controls must not appear for public viewers/);
  assert.match(ownerSectionsApi, /if \(!user \|\| !collectorUserId \|\| user\.id !== collectorUserId\)/);
  assert.match(ownerSectionsApi, /sections: \[\]/);
});

test("profile rail creates sections inline and selects the created section route", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");

  assert.match(profileContent, /createWallSectionAction/);
  assert.match(profileContent, /function handleCreateSection/);
  assert.match(profileContent, /getCreatedSection\(previousSections, result\.sections\)/);
  assert.match(profileContent, /mergeOwnerSectionsIntoProfileSections\(current, result\.sections \?\? \[\]\)/);
  assert.match(profileContent, /router\.push\(getPublicSectionShareHref\(slug, createdSection\.id\)\)/);
  assert.match(profileContent, /placeholder="New section name"/);
});

test("selected custom section can be renamed from the profile surface", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");

  assert.match(profileContent, /updateWallSectionAction/);
  assert.match(profileContent, /const selectedCustomSection = activeSection\?\.kind === "custom" \? activeSection : null/);
  assert.match(profileContent, /function handleRenameSection/);
  assert.match(profileContent, /updateWallSectionAction\(\{ sectionId, name \}\)/);
  assert.match(profileContent, />\s*Rename\s*<\/button>/);
});

test("Wall remains fixed while custom sections come from route state on both profile routes", () => {
  const profileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");
  const profilePage = readSource("app", "u", "[slug]", "page.tsx");
  const sectionPage = readSource("app", "u", "[slug]", "section", "[section_id]", "page.tsx");

  assert.match(profileContent, /Wall is fixed and not renameable/);
  assert.doesNotMatch(profileContent, /sectionId:\s*PUBLIC_WALL_SECTION_ID/);
  assert.match(profilePage, /PublicCollectorProfileContent/);
  assert.match(profilePage, /selectedSectionId=\{PUBLIC_WALL_SECTION_ID\}/);
  assert.match(sectionPage, /PublicCollectorProfileContent/);
  assert.match(sectionPage, /selectedSectionId=\{model\.section\.id\}/);
});
