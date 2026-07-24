import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function source(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("full Dex ownership is read once and resolves direct copies plus slabs", () => {
  const ownershipSource = source(
    "apps/web/src/lib/vault/getOwnedCountsByCardPrintIds.ts",
  );
  const allOwnedStart = ownershipSource.indexOf(
    "export async function getAllOwnedCountsForUser",
  );
  assert.ok(allOwnedStart >= 0);
  const allOwnedSource = ownershipSource.slice(allOwnedStart);

  assert.match(allOwnedSource, /\.from\("vault_item_instances"\)/);
  assert.equal(
    (allOwnedSource.match(/\.from\("vault_item_instances"\)/g) ?? []).length,
    1,
  );
  assert.match(
    allOwnedSource,
    /\.select\("id,card_print_id,slab_cert_id"\)/,
  );
  assert.match(allOwnedSource, /\.from\("slab_certs"\)/);
  assert.match(allOwnedSource, /addCount\(counts, cardPrintId\)/);
  assert.match(
    allOwnedSource,
    /addCount\(counts, cardPrintIdBySlabCertId\.get\(slabCertId\)\)/,
  );
  assert.match(
    ownershipSource,
    /getOwnedCardPrintIdsForUser[\s\S]*getAllOwnedCountsForUser\(userId\)/,
  );
});

test("Dex overview is global while private mapping reads are owned-card scoped", () => {
  const dexSource = source(
    "apps/web/src/lib/grookaiDex/getGrookaiDexSpecies.ts",
  );
  const pageSource = source("apps/web/src/app/dex/page.tsx");

  assert.match(dexSource, /getCachedGrookaiDexOverviewBase/);
  assert.match(dexSource, /getAllOwnedCountsForUser/);
  assert.match(dexSource, /\.in\("card_print_id", chunk\)/);
  assert.doesNotMatch(dexSource, /\.in\("species_id", chunk\)/);
  assert.match(dexSource, /overview:\s*buildGrookaiDexOverview/);
  assert.match(pageSource, /const overview = speciesPage\.overview/);
  assert.match(pageSource, />Full Dex</);
  assert.match(
    pageSource,
    /overview\.ownedPrintCount}\/{overview\.totalPrintCount/,
  );
  assert.doesNotMatch(pageSource, /Completion reflects the visible page/);
});

test("finish ownership exposes explicit null assignments without inference", () => {
  const printingSource = source(
    "apps/web/src/lib/vault/getOwnedPrintingCountsByCardPrintIds.ts",
  );
  const detailSource = source(
    "apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts",
  );
  const detailPageSource = source(
    "apps/web/src/app/dex/[speciesSlug]/page.tsx",
  );

  assert.match(
    printingSource,
    /getOwnedPrintingOwnershipByCardPrintIds/,
  );
  assert.match(
    printingSource,
    /unassignedCountsByCardPrintId\.set/,
  );
  assert.match(printingSource, /\.from\("slab_certs"\)/);
  assert.match(
    printingSource,
    /\.is\("card_print_id", null\)/,
  );
  assert.match(
    printingSource,
    /\.not\("slab_cert_id", "is", null\)/,
  );
  assert.match(printingSource, /\.range\(from, from \+ SUPABASE_PRINTING_COUNT_PAGE_SIZE - 1\)/);
  assert.match(printingSource, /\.in\("id", slabCertIdChunk\)/);
  assert.match(printingSource, /read-owned-slab-only-printing-counts/);
  assert.match(detailSource, /unassignedPrintingCount/);
  assert.doesNotMatch(
    detailSource,
    /printings\.length === 1 && printings\[0\]\?\.ownedCount === 0/,
  );
  assert.match(detailPageSource, /finish selection/);
  assert.match(
    detailPageSource,
    /\/vault\/card\/\$\{encodeURIComponent\(card\.cardPrintId\)\}/,
  );
});
