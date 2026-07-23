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
  const bulkCopies = readSource("components", "vault", "VaultManageCardCopiesBulkSection.tsx");

  assert.match(groupedPanel, /Manage copies/);
  assert.match(groupedPanel, /Organize this card from its exact copies below\./);
  assert.match(groupedPanel, /Wall and section placement is managed per copy\./);
  assert.match(groupedPage, /id="manage-card-copies"/);
  assert.match(bulkCopies, /Open copy/);
});

test("grouped card copy rows render exact-copy curation controls", () => {
  const groupedPage = readSource("app", "vault", "card", "[cardId]", "page.tsx");
  const bulkCopies = readSource("components", "vault", "VaultManageCardCopiesBulkSection.tsx");
  const copyControls = readSource("components", "vault", "VaultManageCopyCurationControls.tsx");

  assert.match(groupedPage, /getOwnerWallSectionMembershipsBatch\(/);
  assert.match(groupedPage, /item\.copy_items\.map\(\(copy\) => copy\.instance_id\)/);
  assert.match(groupedPage, /sectionMembershipByInstanceId\.get\(copy\.instance_id\)/);
  assert.match(groupedPage, /VaultManageCardCopiesBulkSection/);
  assert.match(groupedPage, /membershipModels=\{item\.copy_items\.map/);
  assert.match(bulkCopies, /VaultManageCopyCurationControls/);
  assert.match(bulkCopies, /instanceId=\{copy\.instance_id\}/);
  assert.match(bulkCopies, /gvviId=\{copy\.gv_vi_id\}/);
  assert.match(bulkCopies, /initialIntent=\{copy\.intent\}/);
  assert.match(bulkCopies, /Bulk copy management writes only exact-copy instance IDs/);
  assert.match(groupedPage, /publicWallHref=\{publicProfileHref\}/);
  assert.match(copyControls, /saveVaultItemInstanceIntentAction/);
  assert.match(copyControls, /createWallSectionAction/);
  assert.match(copyControls, /assignWallSectionMembershipAction/);
  assert.match(copyControls, /removeWallSectionMembershipAction/);
  assert.match(copyControls, /vault_item_instances\.id/);
});

test("grouped card copy rows expose exact-copy bulk management only", () => {
  const groupedPage = readSource("app", "vault", "card", "[cardId]", "page.tsx");
  const bulkCopies = readSource("components", "vault", "VaultManageCardCopiesBulkSection.tsx");
  const bulkIntentAction = readSource("lib", "network", "saveVaultItemInstancesIntentBulkAction.ts");
  const bulkSectionAction = readSource("lib", "wallSections", "bulkWallSectionMembershipAction.ts");

  assert.match(groupedPage, /VaultManageCardCopiesBulkSection/);
  assert.match(bulkCopies, /selectedInstanceIds/);
  assert.match(bulkCopies, /saveVaultItemInstancesIntentBulkAction/);
  assert.match(bulkCopies, /bulkWallSectionMembershipAction/);
  assert.match(bulkCopies, /Bulk actions/);
  assert.match(bulkCopies, /Add to section/);
  assert.match(bulkCopies, /Remove from section/);

  assert.match(bulkIntentAction, /\.from\("vault_item_instances"\)/);
  assert.match(bulkIntentAction, /\.update\(\{\s*intent: nextIntent/s);
  assert.match(bulkIntentAction, /\.eq\("user_id", user\.id\)/);
  assert.match(bulkIntentAction, /\.is\("archived_at", null\)/);
  assert.match(bulkIntentAction, /\.in\("id", normalizedInstanceIds\)/);
  assert.match(bulkIntentAction, /assertVaultIntentProof/);
  assert.doesNotMatch(bulkIntentAction, /\.from\("vault_items"\)/);
  assert.doesNotMatch(bulkIntentAction, /\.from\("shared_cards"\)/);

  assert.match(bulkSectionAction, /\.from\("wall_section_memberships"\)/);
  assert.match(bulkSectionAction, /vault_item_instance_id/);
  assert.match(bulkSectionAction, /\.from\("vault_item_instances"\)/);
  assert.match(bulkSectionAction, /\.from\("wall_sections"\)/);
  assert.match(bulkSectionAction, /assertWallSectionMembershipProof/);
  assert.doesNotMatch(bulkSectionAction, /\.from\("vault_items"\)/);
  assert.doesNotMatch(bulkSectionAction, /\.from\("shared_cards"\)/);
});

test("grouped card copy rows can create and immediately assign a section", () => {
  const copyControls = readSource("components", "vault", "VaultManageCopyCurationControls.tsx");

  assert.match(copyControls, /handleCreateSection/);
  assert.match(copyControls, /createWallSectionAction\(\{ name \}\)/);
  assert.match(copyControls, /getCreatedSection\(sections, createResult\.sections\)/);
  assert.match(copyControls, /assignWallSectionMembershipAction\(\{/);
  assert.match(copyControls, /sectionId: createdSection\.id/);
  assert.match(copyControls, /vaultItemInstanceId: instanceId/);
  assert.match(copyControls, /Section created and copy added\./);
  assert.match(copyControls, /Create and add/);
  assert.match(copyControls, /Manage all sections/);
});

test("grouped card copy rows expose public owner preview links", () => {
  const groupedPage = readSource("app", "vault", "card", "[cardId]", "page.tsx");
  const copyControls = readSource("components", "vault", "VaultManageCopyCurationControls.tsx");

  assert.match(groupedPage, /publicProfileHref/);
  assert.match(copyControls, /Public Preview/);
  assert.match(copyControls, /visibleOnWall = intent !== "hold"/);
  assert.match(copyControls, /publicGvviHref = visibleOnWall && gvviId/);
  assert.match(copyControls, /View Wall/);
  assert.match(copyControls, /View public copy/);
  assert.match(copyControls, /Enable public Wall/);
  assert.match(copyControls, /assignedSections\.map/);
  assert.match(copyControls, /href=\{\`\$\{publicWallHref\}\/section\/\$\{encodeURIComponent\(section\.id\)\}\`\}/);
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

test("exact-copy curation remains exact-copy scoped on GVVI and grouped copy rows", () => {
  const groupedPanel = readSource("components", "vault", "VaultManageCardSettingsPanel.tsx");
  const groupedPage = readSource("app", "vault", "card", "[cardId]", "page.tsx");
  const bulkCopies = readSource("components", "vault", "VaultManageCardCopiesBulkSection.tsx");
  const copyControls = readSource("components", "vault", "VaultManageCopyCurationControls.tsx");
  const gvviPage = readSource("app", "vault", "gvvi", "[gvvi_id]", "page.tsx");
  const settingsCard = readSource("components", "vault", "VaultInstanceSettingsCard.tsx");
  const assignAction = readSource("lib", "wallSections", "assignWallSectionMembershipAction.ts");
  const removeAction = readSource("lib", "wallSections", "removeWallSectionMembershipAction.ts");

  assert.doesNotMatch(groupedPanel, /assignWallSectionMembershipAction|removeWallSectionMembershipAction|saveVaultItemInstanceIntentAction/);
  assert.match(groupedPage, /copy\.instance_id/);
  assert.match(bulkCopies, /copy\.instance_id/);
  assert.match(copyControls, /instanceId/);
  assert.match(gvviPage, /VaultInstanceSettingsCard/);
  assert.match(settingsCard, /saveVaultItemInstanceIntentAction/);
  assert.match(assignAction, /vault_item_instance_id/);
  assert.match(removeAction, /vault_item_instance_id/);
});
