import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const filterSource = readFileSync(
  new URL("./getGrookaiDexSpeciesVaultFilter.ts", import.meta.url),
  "utf8",
);
const vaultPageSource = readFileSync(
  new URL("../../app/vault/page.tsx", import.meta.url),
  "utf8",
);
const speciesPageSource = readFileSync(
  new URL("../../app/dex/[speciesSlug]/page.tsx", import.meta.url),
  "utf8",
);
const ownerVaultSource = readFileSync(
  new URL("../vault/getOwnerVaultItems.ts", import.meta.url),
  "utf8",
);

test("web Dex-to-Vault filtering uses canonical species mappings", () => {
  assert.match(filterSource, /\.from\("pokemon_species"\)/);
  assert.match(filterSource, /\.from\("card_print_species"\)/);
  assert.match(filterSource, /\.eq\("species_id", speciesId\)/);
  assert.match(filterSource, /\.eq\("active", true\)/);
  assert.doesNotMatch(filterSource, /\.ilike\(/);
  assert.doesNotMatch(filterSource, /card name/i);
});

test("Vault accepts an exact species scope, including an empty exact result", () => {
  assert.match(vaultPageSource, /searchParams\?\.\s*species/);
  assert.match(vaultPageSource, /getGrookaiDexSpeciesVaultFilter/);
  assert.match(vaultPageSource, /cardPrintIds: exactCardPrintIds/);
  assert.match(vaultPageSource, /Exact Dex species filter/);
  assert.match(
    ownerVaultSource,
    /requestedCardPrintIds != null && requestedCardPrintIds\.length === 0/,
  );
});

test("species detail links directly to the canonical Vault scope", () => {
  assert.match(
    speciesPageSource,
    /href=\{`\/vault\?species=\$\{encodeURIComponent\(detail\.slug\)\}`\}/,
  );
  assert.match(speciesPageSource, /View exact species in Vault/);
});
