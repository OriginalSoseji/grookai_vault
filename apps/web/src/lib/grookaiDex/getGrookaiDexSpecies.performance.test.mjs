import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "getGrookaiDexSpecies.ts"), "utf8");

test("Dex pages use aggregate public totals and hydrate mappings only for signed-in progress", () => {
  assert.match(source, /\.from\("v_grookai_dex_species_v1"\)/);
  assert.match(source, /total_print_count/);
  assert.doesNotMatch(source, /\.from\("pokemon_species"\)/);
  assert.match(source, /\.from\("card_print_species"\)/);
  assert.match(source, /\.range\(from, to\)/);
  assert.match(source, /SUPABASE_MAPPING_PAGE_SIZE\s*=\s*1_000/);
  assert.match(source, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(source, /\.range\(mappingFrom, mappingTo\)/);
  assert.match(source, /mappingPage\.length < SUPABASE_MAPPING_PAGE_SIZE/);
  assert.match(source, /unstable_cache/);
  assert.match(source, /revalidate:\s*300/);
  const anonymousReturn = source.indexOf("if (!userId || publicPage.species.length === 0)");
  const mappingHydration = source.indexOf(
    "const mappings = await getCachedGrookaiDexMappings",
    anonymousReturn,
  );
  assert.ok(anonymousReturn >= 0 && anonymousReturn < mappingHydration);
});
