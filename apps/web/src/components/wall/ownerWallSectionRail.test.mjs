import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("owner Wall page loads owner sections and renders the owner rail", () => {
  const wallPage = readSource("app", "wall", "page.tsx");

  assert.match(wallPage, /getOwnerWallSections/);
  assert.match(wallPage, /getOwnerWallSections\(user\.id\)/);
  assert.match(wallPage, /OwnerWallSectionRail/);
  assert.match(wallPage, /initialModel=\{wallSectionsModel\}/);
});

test("owner rail keeps Wall first and exposes owner-only Add Section", () => {
  const ownerRail = readSource("components", "wall", "OwnerWallSectionRail.tsx");

  assert.match(ownerRail, /PUBLIC_WALL_SECTION_ID/);
  assert.match(ownerRail, /<nav aria-label="Wall sections"/);
  assert.match(ownerRail, /Wall is always first\./);
  assert.match(ownerRail, /sections\.map\(\(section\)/);
  assert.match(ownerRail, /\+ Add Section/);
  assert.match(ownerRail, /Owner Wall rail keeps Wall fixed first/);
});

test("owner rail creates sections inline and selects the created section", () => {
  const ownerRail = readSource("components", "wall", "OwnerWallSectionRail.tsx");

  assert.match(ownerRail, /createWallSectionAction/);
  assert.match(ownerRail, /function handleCreate/);
  assert.match(ownerRail, /getCreatedSection\(previousSections, result\.sections\)/);
  assert.match(ownerRail, /setSelectedSectionId\(createdSection\.id\)/);
  assert.match(ownerRail, /setIsCreating\(false\)/);
});

test("owner rail exposes rename and active controls from the Wall context", () => {
  const ownerRail = readSource("components", "wall", "OwnerWallSectionRail.tsx");

  assert.match(ownerRail, /updateWallSectionAction/);
  assert.match(ownerRail, /function handleRename/);
  assert.match(ownerRail, /function handleToggleActive/);
  assert.match(ownerRail, /Rename/);
  assert.match(ownerRail, /Deactivate/);
  assert.match(ownerRail, /Activate/);
});

test("owner section links do not depend on is_public", () => {
  const ownerRail = readSource("components", "wall", "OwnerWallSectionRail.tsx");
  const accountCard = readSource("components", "account", "WallSectionsSettingsCard.tsx");

  assert.doesNotMatch(`${ownerRail}\n${accountCard}`, /section\.is_public/);
  assert.match(ownerRail, /publicProfileSlug && selectedSection\.is_active/);
  assert.match(accountCard, /publicProfileSlug && section\.is_active/);
});

test("public profile rendering remains read-only", () => {
  const publicProfileContent = readSource("components", "public", "PublicCollectorProfileContent.tsx");

  assert.doesNotMatch(publicProfileContent, /createWallSectionAction|updateWallSectionAction|\+ Add Section|Rename|Deactivate|Activate/);
});

test("section mutations revalidate the owner Wall page", () => {
  const revalidation = readSource("lib", "wallSections", "revalidateWallSectionPaths.ts");

  assert.match(revalidation, /revalidatePath\("\/wall"\)/);
});

test("owner Wall section language does not reintroduce old labels", () => {
  const wallPage = readSource("app", "wall", "page.tsx");
  const ownerRail = readSource("components", "wall", "OwnerWallSectionRail.tsx");
  const userFacingLiterals = [...`${wallPage}\n${ownerRail}`.matchAll(/"([^"]+)"|'([^']+)'/g)]
    .map((match) => match[1] ?? match[2] ?? "")
    .filter(Boolean);

  assert.equal(userFacingLiterals.includes("Collection"), false);
  assert.equal(userFacingLiterals.includes("Visible"), false);
});
