import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("web image resolver blocks the known mismatched Legendary Treasures RC5 image", () => {
  const source = readFileSync(
    new URL(
      "../../apps/web/src/lib/canon/resolveCardImageFieldsV1.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /isKnownWrongLegendaryTreasuresRc5Image/);
  assert.match(source, /LEGENDARY_TREASURES_RC5_CARD_PRINT_ID/);
  assert.match(source, /efa15a49-a1f9-46b0-bd69-85111388328e/);
  assert.match(source, /gv-pk-ltr-rc5-/);
  assert.match(source, /00484a4e28a235d9f4a8edcc/);
  assert.match(source, /images\.pokemontcg\.io\/bw11\/5_hires\.png/);
  assert.match(source, /display_image_kind: "blocked"/);
  assert.doesNotMatch(
    source,
    /images\.pokemontcg\.io\/bw11\/5_hires\.png[\s\S]{0,200}return normalized/i,
    "the Carnivine URL must not be globally blocked outside the RC5 identity guard",
  );
});

test("card page PokemonTCG image fallback does not collapse prefixed numbers", () => {
  const source = readFileSync(
    new URL("../../apps/web/src/app/card/[gv_id]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const printedNumber = card\.number\?\.trim\(\);/);
  assert.match(source, /!\s*\/\^\\d\+\$\/\.test\(printedNumber\)/);
  assert.doesNotMatch(
    source,
    /const cardNumber = \(card\.number_plain \?\? card\.number\)\?\.trim\(\);/,
    "image fallback must not prefer number_plain for RC/TG/GG subset numbers",
  );
});

test("image resolver replaces broken McDonalds 2021 TCGdex URLs with PokemonTCG mcd21 images", () => {
  const source = readFileSync(
    new URL(
      "../../apps/web/src/lib/canon/resolveCardImageFieldsV1.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /assets\.tcgdex\.net\/en\/mc\/2021swsh\//);
  assert.match(source, /images\.pokemontcg\.io\/mcd21/);
  assert.match(source, /setCode === "2021swsh"/);
  assert.match(source, /image_source: "pokemonapi"/);
});

test("image resolver replaces source-backed EX trainer kit aliases and blocks unresolved trainer kit TCGdex URLs", () => {
  const source = readFileSync(
    new URL(
      "../../apps/web/src/lib/canon/resolveCardImageFieldsV1.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /isKnownBrokenTcgdexImageUrl/);
  assert.match(source, /assets\.tcgdex\.net\/en\/tk\//);
  assert.match(source, /POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES/);
  assert.match(source, /"tk-ex-latia": "tk1a"/);
  assert.match(source, /"tk-ex-latio": "tk1b"/);
  assert.match(source, /"tk-ex-m": "tk2b"/);
  assert.match(source, /"tk-ex-p": "tk2a"/);
  assert.match(source, /MALIE_TRAINER_KIT_SET_IMAGE_PLANS/);
  assert.match(source, /"tk-sm-l": \{ series: "SM", code: "TK10A", folder: "TK_Lycanroc" \}/);
  assert.match(source, /"tk-sm-r": \{ series: "SM", code: "TK10B", folder: "TK_AlolanRaichu" \}/);
  assert.match(source, /"tk-xy-b": \{ series: "XY", code: "TK7A", folder: "TK_Bisharp" \}/);
  assert.match(source, /"tk-xy-w": \{ series: "XY", code: "TK7B", folder: "TK_Wigglytuff" \}/);
  assert.match(source, /"tk-xy-n": \{ series: "XY", code: "TK6A", folder: "TK_Noivern" \}/);
  assert.match(source, /"tk-xy-sy": \{ series: "XY", code: "TK6B", folder: "TK_Sylveon" \}/);
  assert.match(source, /"tk-xy-p": \{ series: "XY", code: "TK9A", folder: "TK_PikachuLibre" \}/);
  assert.match(source, /"tk-xy-su": \{ series: "XY", code: "TK9B", folder: "TK_Suicune" \}/);
  assert.match(source, /"tk-xy-latia": \{ series: "XY", code: "TK8B", folder: "TK_Latias" \}/);
  assert.match(source, /"tk-xy-latio": \{ series: "XY", code: "TK8A", folder: "TK_Latios" \}/);
  assert.match(source, /"tk-bw-e": \{ series: "BW", code: "TK5B", folder: "TK_Excadrill" \}/);
  assert.match(source, /"tk-bw-z": \{ series: "BW", code: "TK5A", folder: "TK_Zoroark" \}/);
  assert.match(source, /cdn\.malie\.io\/file\/malie-io\/art\/cards\/jpg\/en_US/);
  assert.match(source, /TCGCOLLECTOR_TRAINER_KIT_IMAGE_URLS/);
  assert.match(source, /"tk-dp-l"/);
  assert.match(source, /"tk-dp-m"/);
  assert.match(source, /"tk-hs-g"/);
  assert.match(source, /"tk-hs-r"/);
  assert.match(source, /static\.tcgcollector\.com\/content\/images/);
  assert.match(source, /getTcgCollectorTrainerKitReplacementImageUrl/);
  assert.match(source, /image_status: "representative_shared"/);
  assert.match(source, /display_image_kind: "representative"/);
  assert.match(source, /KNOWN_BROKEN_TCGDEX_IMAGE_NOTE/);
  assert.match(source, /display_image_kind: "blocked"/);
});

test("public set display normalizes McDonalds and Trainer Kit capitalization", () => {
  const source = readFileSync(
    new URL("../../apps/web/src/lib/publicSets.shared.ts", import.meta.url),
    "utf8",
  );
  const publicSetsSource = readFileSync(
    new URL("../../apps/web/src/lib/publicSets.ts", import.meta.url),
    "utf8",
  );
  const cardDetailSource = readFileSync(
    new URL("../../apps/web/src/lib/getPublicCardByGvId.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /normalizePublicSetDisplayName/);
  assert.match(source, /Macdonald's/);
  assert.match(source, /McDonald's/);
  assert.match(source, /trainer Kit/);
  assert.match(source, /Trainer Kit/);
  assert.match(source, /"2021swsh": "mcd21"/);
  assert.match(publicSetsSource, /normalizePublicSetDisplayName\(row\.name\)/);
  assert.match(cardDetailSource, /normalizePublicSetDisplayName/);
});

test("Dex species detail uses shared child image fallback and does not resurrect blocked legacy URLs", () => {
  const source = readFileSync(
    new URL(
      "../../apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /getChildDisplayImageFallbacks/);
  assert.match(source, /childDisplayImageFallbacks\.get\(cardPrintId\)/);
  assert.match(source, /image_status,image_note/);
  assert.match(source, /imageFields\.display_image_url\s*\?\?/);
  assert.match(source, /fallbackDisplayImage\?\.display_image_url/);
  assert.doesNotMatch(
    source,
    /resolveDisplayImageUrl/,
    "Dex must not fall back to raw legacy image URLs after the image resolver blocks or withholds display imagery",
  );
});

test("public GV ID route lookup preserves mixed-case database identifiers", () => {
  const source = readFileSync(
    new URL("../../apps/web/src/lib/gvIdAlias.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const requested = value\.trim\(\);/);
  assert.match(source, /const candidates = \[requested, normalized\];/);
  assert.match(source, /return uniqueValues\(candidates\);/);
});
