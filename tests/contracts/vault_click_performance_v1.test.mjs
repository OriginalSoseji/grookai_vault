import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const groupedVaultPagePath = "apps/web/src/app/vault/card/[cardId]/page.tsx";
const gvviVaultPagePath = "apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx";
const ownerVaultItemsPath = "apps/web/src/lib/vault/getOwnerVaultItems.ts";
const canonicalVaultRowsPath = "apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts";
const wallMembershipPath = "apps/web/src/lib/wallSections/getOwnerWallSectionMemberships.ts";
const gridTilePath = "apps/web/src/components/cards/PokemonCardGridTile.tsx";
const vaultTilePath = "apps/web/src/components/vault/VaultCardTile.tsx";
const vaultMobileViewsPath = "apps/web/src/components/vault/VaultMobileViews.tsx";
const vaultCollectionViewPath = "apps/web/src/components/vault/VaultCollectionView.tsx";

test("grouped vault card clicks use targeted read model instead of full vault load", () => {
  const page = read(groupedVaultPagePath);
  const ownerHelper = read(ownerVaultItemsPath);
  const canonicalHelper = read(canonicalVaultRowsPath);

  assert.match(page, /getOwnerVaultItem\(user\.id,\s*decodedCardId\)/);
  assert.doesNotMatch(page, /getOwnerVaultItems\(user\.id\)/);
  assert.match(ownerHelper, /export async function getOwnerVaultItem/);
  assert.match(ownerHelper, /getCanonicalVaultCollectorRows\(userId,\s*\{\s*cardPrintIds:\s*\[normalizedCardPrintId\]\s*\}\)/);
  assert.match(canonicalHelper, /type CanonicalVaultCollectorReadOptions/);
  assert.match(canonicalHelper, /requestedCardPrintIdSet/);
  assert.match(canonicalHelper, /filter\(\(cardPrintId\) => requestedCardPrintIdSet\.size === 0 \|\| requestedCardPrintIdSet\.has\(cardPrintId\)\)/);
});

test("grouped vault card page batches section membership reads", () => {
  const page = read(groupedVaultPagePath);
  const membership = read(wallMembershipPath);

  assert.match(page, /getOwnerWallSectionMembershipsBatch/);
  assert.doesNotMatch(page, /item\.copy_items\.map\(async \(copy\)/);
  assert.match(membership, /export async function getOwnerWallSectionMembershipsBatch/);
  assert.match(membership, /\.from\("wall_sections"\)/);
  assert.match(membership, /\.from\("wall_section_memberships"\)/);
  assert.match(membership, /\.in\("vault_item_instance_id", normalizedInstanceIds\)/);
});

test("vault tile and mobile links do not prefetch heavy dynamic card routes", () => {
  const gridTile = read(gridTilePath);
  const vaultTile = read(vaultTilePath);
  const mobileViews = read(vaultMobileViewsPath);
  const collectionView = read(vaultCollectionViewPath);
  const groupedVaultPage = read(groupedVaultPagePath);

  assert.match(gridTile, /imagePrefetch\?: boolean/);
  assert.match(gridTile, /<Link href=\{imageHref\} prefetch=\{imagePrefetch\}>/);
  assert.match(vaultTile, /imagePrefetch=\{false\}/);
  assert.match(vaultTile, /href=\{`\/card\/\$\{item\.gv_id\}`\}\s+prefetch=\{false\}/);
  assert.match(vaultTile, /href=\{manageCardHref\}\s+prefetch=\{false\}/);
  assert.match(mobileViews, /imagePrefetch=\{false\}/);
  assert.match(mobileViews, /href=\{`\/card\/\$\{item\.gv_id\}`\}\s+prefetch=\{false\}/);
  assert.match(collectionView, /imagePrefetch=\{false\}/);
  assert.match(groupedVaultPage, /href=\{primaryActionHref\}\s+prefetch=\{false\}/);
});

test("exact copy page parallelizes secondary reads after the primary copy load", () => {
  const gvviPage = read(gvviVaultPagePath);

  assert.match(gvviPage, /Promise\.all\(\[/);
  assert.match(gvviPage, /getOwnerWallSectionMemberships\(user\.id,\s*detail\.instanceId\)/);
  assert.match(gvviPage, /getOwnedCardMessageSummaries\(user\.id,\s*\[detail\.cardPrintId\]\)/);
  assert.match(gvviPage, /prefetch=\{false\}/);
});
