import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("grouped card page no longer renders grouped wall-category controls", () => {
  const groupedPanel = readSource("components", "vault", "VaultManageCardSettingsPanel.tsx");
  const groupedPage = readSource("app", "vault", "card", "[cardId]", "page.tsx");
  const source = `${groupedPanel}\n${groupedPage}`;

  for (const forbidden of [
    "Wall Category",
    "WALL_CATEGORY_OPTIONS",
    "No category",
    "saveSharedCardWallCategoryAction",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("grouped card page no longer renders add or remove Wall controls", () => {
  const groupedPanel = readSource("components", "vault", "VaultManageCardSettingsPanel.tsx");

  for (const forbidden of [
    "Add to Wall",
    "Remove from Wall",
    "toggleSharedCardAction",
    "handleShareToggle",
  ]) {
    assert.equal(groupedPanel.includes(forbidden), false, forbidden);
  }
});

test("grouped card page keeps copy-management path", () => {
  const groupedPanel = readSource("components", "vault", "VaultManageCardSettingsPanel.tsx");
  const groupedPage = readSource("app", "vault", "card", "[cardId]", "page.tsx");

  assert.match(groupedPanel, /Manage copies/);
  assert.match(groupedPanel, /Organize this card from its exact copies below\./);
  assert.match(groupedPanel, /Wall and section placement is managed per copy\./);
  assert.match(groupedPage, /id="manage-card-copies"/);
  assert.match(groupedPage, /Open copy/);
});

test("GVVI page renders exact-copy section membership controls", () => {
  const gvviPage = readSource("app", "vault", "gvvi", "[gvvi_id]", "page.tsx");
  const sectionCard = readSource("components", "vault", "VaultInstanceSectionMembershipCard.tsx");

  assert.match(gvviPage, /VaultInstanceSectionMembershipCard/);
  assert.match(sectionCard, /Sections/);
  assert.match(sectionCard, /Add to section/);
  assert.match(sectionCard, /Added/);
  assert.match(sectionCard, /Not in any sections yet\./);
  assert.match(sectionCard, /assignWallSectionMembershipAction/);
  assert.match(sectionCard, /removeWallSectionMembershipAction/);
});

test("legacy grouped compatibility data does not appear as section UI", () => {
  const publicGrid = readSource("components", "public", "PublicCollectionGrid.tsx");
  const featuredWall = readSource("components", "public", "FeaturedWallSection.tsx");
  const vaultPrimitives = readSource("components", "vault", "VaultCardPrimitives.tsx");
  const publicWallTypes = readSource("lib", "sharedCards", "publicWall.shared.ts");
  const sharedCards = readSource("lib", "getSharedCardsBySlug.ts");

  for (const source of [publicGrid, featuredWall, vaultPrimitives, publicWallTypes]) {
    assert.equal(source.includes("wall_category"), false);
    assert.equal(source.includes("WALL_CATEGORY_OPTIONS"), false);
    assert.equal(source.includes("getWallCategoryLabel"), false);
  }

  assert.equal(/^\s*wall_category\s*,/m.test(sharedCards), false);
  assert.match(sharedCards, /Legacy grouped wall_category must not surface as the section system/);
});

test("exact-copy curation remains available only on GVVI surfaces", () => {
  const groupedPanel = readSource("components", "vault", "VaultManageCardSettingsPanel.tsx");
  const groupedPage = readSource("app", "vault", "card", "[cardId]", "page.tsx");
  const gvviPage = readSource("app", "vault", "gvvi", "[gvvi_id]", "page.tsx");
  const settingsCard = readSource("components", "vault", "VaultInstanceSettingsCard.tsx");
  const assignAction = readSource("lib", "wallSections", "assignWallSectionMembershipAction.ts");
  const removeAction = readSource("lib", "wallSections", "removeWallSectionMembershipAction.ts");

  assert.doesNotMatch(`${groupedPanel}\n${groupedPage}`, /assignWallSectionMembershipAction|removeWallSectionMembershipAction|saveVaultItemInstanceIntentAction/);
  assert.match(gvviPage, /VaultInstanceSettingsCard/);
  assert.match(settingsCard, /saveVaultItemInstanceIntentAction/);
  assert.match(assignAction, /vault_item_instance_id/);
  assert.match(removeAction, /vault_item_instance_id/);
});
