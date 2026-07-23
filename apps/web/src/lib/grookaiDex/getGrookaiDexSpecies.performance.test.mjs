import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "getGrookaiDexSpecies.ts"), "utf8");
const ownedCountsSource = fs.readFileSync(
  path.join(here, "..", "vault", "getOwnedCountsByCardPrintIds.ts"),
  "utf8",
);

test("Dex pages use cached full totals and hydrate progress from owned cards only", () => {
  assert.match(source, /\.from\("v_grookai_dex_species_v1"\)/);
  assert.match(source, /total_print_count/);
  assert.doesNotMatch(source, /\.from\("pokemon_species"\)/);
  assert.match(source, /\.from\("card_print_species"\)/);
  assert.match(source, /\.range\(from, to\)/);
  assert.match(source, /getCachedGrookaiDexOverviewBase/);
  assert.match(source, /getAllOwnedCountsForUser/);
  assert.match(source, /getOwnedCompletionMappings/);
  assert.match(source, /\.in\("card_print_id", chunk\)/);
  assert.doesNotMatch(source, /\.in\("species_id", chunk\)/);
  assert.match(source, /overview:\s*buildGrookaiDexOverview/);
  assert.match(source, /SUPABASE_MAPPING_PAGE_SIZE\s*=\s*1_000/);
  assert.match(source, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(source, /\.range\(mappingFrom, mappingTo\)/);
  assert.match(source, /page\.length < SUPABASE_MAPPING_PAGE_SIZE/);
  assert.match(source, /unstable_cache/);
  assert.match(source, /revalidate:\s*300/);
  assert.match(
    source,
    /normalizedUserId\s*\?\s*getAllOwnedCountsForUser\(normalizedUserId\)\s*:\s*Promise\.resolve\(new Map<string, number>\(\)\)/,
  );
  assert.match(source, /Full Dex overview spans every species/);
});

test("the complete owned-identity read is paged and maps only owned parents", () => {
  assert.match(ownedCountsSource, /select\("id,card_print_id,slab_cert_id"\)/);
  assert.match(ownedCountsSource, /fetchAllOwnershipPages<AllOwnedInstanceRow>/);
  assert.match(ownedCountsSource, /\.range\(from, to\)/);
  assert.match(source, /ownedCountsByCardPrintId\.size > 0/);
  assert.match(source, /Array\.from\(ownedCountsByCardPrintId\.keys\(\)\)/);
});

test("out-of-range Dex requests refetch the effective last page", () => {
  assert.match(source, /const \[requestedPublicPage,/);
  assert.match(source, /getEffectiveGrookaiDexPage\(\s*page,\s*requestedPublicPage\.totalPages/);
  assert.match(source, /effectivePage === requestedPublicPage\.page/);
  assert.match(
    source,
    /await getCachedGrookaiDexBaseSpeciesPage\(\s*effectivePage,\s*pageSize,\s*searchQuery/,
  );
});
