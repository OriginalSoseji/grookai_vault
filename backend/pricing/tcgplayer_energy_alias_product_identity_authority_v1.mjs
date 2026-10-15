export const TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1";

const setIds = Object.freeze({
  sm5: "0ccab8fe-5cb3-4535-860b-c051d1f0cf73",
  swsh3: "b9aebbf0-31c9-40d3-a878-f1d8a1c44f14",
});

const rows = [
  [157753, "Unit Energy GRW", 2178, "SM - Ultra Prism", "137/156", "ca85bcf1-98c6-497a-8c70-9e43a3a6a0a6", "GV-PK-UPR-137", "sm5", "Unit Energy GrassFireWater", [
    ["effeb2af-3d3e-4ac2-875a-c0f014f6dfdc", "normal", "GV-PK-UPR-137-STD", null, null],
    ["c4018839-c3e8-4682-a95f-773cf700c596", "reverse", "GV-PK-UPR-137-RH", null, null],
  ]],
  [157754, "Unit Energy LPM", 2178, "SM - Ultra Prism", "138/156", "6843626f-ee9b-42c4-8641-fe7eaf2bddf9", "GV-PK-UPR-138", "sm5", "Unit Energy LightningPsychicMetal", [
    ["b985f136-db69-4b70-975e-7fee9335cced", "normal", "GV-PK-UPR-138-STD", null, null],
    ["3bfa8c81-0f47-4fb8-909c-18f34d510be7", "reverse", "GV-PK-UPR-138-RH", null, null],
  ]],
  [157786, "Unit Energy GRW (Secret Rare)", 2178, "SM - Ultra Prism", "170/156", "55302490-c74d-40a7-8afc-68ea70e4b37c", "GV-PK-UPR-170", "sm5", "Unit Energy GrassFireWater", [
    ["ccf51864-31f4-4aa3-8933-ec6f545ecd3b", "holo", "GV-PK-UPR-170-HOLO", null, null],
  ]],
  [157787, "Unit Energy LPM (Secret Rare)", 2178, "SM - Ultra Prism", "171/156", "f5037b3d-2f54-4dc4-b771-90991f06c5f4", "GV-PK-UPR-171", "sm5", "Unit Energy LightningPsychicMetal", [
    ["730573e1-1884-42e6-8ec0-91f49f3857e5", "holo", "GV-PK-UPR-171-HOLO", null, null],
  ]],
  [219291, "Heat R Energy", 2675, "SWSH03: Darkness Ablaze", "174/189", "079bf483-22c3-4a06-9c68-a3d6663c6752", "GV-PK-DAA-174", "swsh3", "Heat Fire Energy", [
    ["cb9ab375-fd74-4088-94ee-114bf1a97278", "normal", "GV-PK-DAA-174-STD", "tcgdex", "swsh3-174"],
    ["9c568928-61bd-4281-bd1f-cac8486d30fe", "reverse", "GV-PK-DAA-174-RH", "tcgdex", "swsh3-174"],
  ]],
  [219293, "Hiding D Energy", 2675, "SWSH03: Darkness Ablaze", "175/189", "88437e62-6274-49f6-a0f9-fef53ca4ca49", "GV-PK-DAA-175", "swsh3", "Hiding Darkness Energy", [
    ["9c04e98f-ca87-4829-a4de-6ae24b74f643", "normal", "GV-PK-DAA-175-STD", "tcgdex", "swsh3-175"],
    ["014b4e3d-43a1-4023-afd1-49da904033f3", "reverse", "GV-PK-DAA-175-RH", "tcgdex", "swsh3-175"],
  ]],
  [219294, "Powerful C Energy", 2675, "SWSH03: Darkness Ablaze", "176/189", "6cbc0611-4438-41db-aeee-215e59e6bbb1", "GV-PK-DAA-176", "swsh3", "Powerful Colorless Energy", [
    ["e4197c3d-6a1a-43c8-aacc-6767df0b342e", "normal", "GV-PK-DAA-176-STD", "tcgdex", "swsh3-176"],
    ["a25f7ca0-ceef-4c36-8a7d-238ce5e17b79", "reverse", "GV-PK-DAA-176-RH", "tcgdex", "swsh3-176"],
  ]],
].map(([source_product_id, source_product_name, source_group_id, source_group_name,
  printed_number, card_print_id, gv_id, set_code, name, printingRows]) => {
  const printings = printingRows.map(([printing_id, finish_key, printing_gv_id,
    provenance_source, provenance_ref]) => Object.freeze({ printing_id, finish_key,
    printing_gv_id, provenance_source, provenance_ref }));
  return Object.freeze({
    authority_version: TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
    source_product_id, source_product_name, source_group_id, source_group_name,
    printed_number,
    target: Object.freeze({ card_print_id, gv_id, set_id: setIds[set_code], set_code,
      name, number: String(Number(printed_number.split("/", 1)[0])), variant_key: "" }),
    printing: printings[0],
    printings: Object.freeze(printings),
  });
});

export const TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

function text(value) { return String(value ?? "").trim(); }

export function reviewedTcgplayerEnergyAliasProductIdentityByIdV1(sourceProductId) {
  return rows.find((candidate) => Number(sourceProductId) === candidate.source_product_id) ?? null;
}

export function reviewedTcgplayerEnergyAliasProductIdentityV1(source) {
  const row = reviewedTcgplayerEnergyAliasProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerEnergyAliasProductTargetV1(source, target) {
  const authority = reviewedTcgplayerEnergyAliasProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id && target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id && target.set_code === authority.target.set_code &&
    target.name === authority.target.name && text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
