import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "getGrookaiDexSpecies.ts"), "utf8");

test("Dex pages bound species before calculating completion counts", () => {
  assert.doesNotMatch(source, /\.from\("v_grookai_dex_species_v1"\)/);
  assert.match(source, /\.from\("pokemon_species"\)/);
  assert.match(source, /\.from\("card_print_species"\)/);
  assert.match(source, /\.range\(from, to\)/);
  assert.match(source, /unstable_cache/);
  assert.match(source, /revalidate:\s*300/);
});
