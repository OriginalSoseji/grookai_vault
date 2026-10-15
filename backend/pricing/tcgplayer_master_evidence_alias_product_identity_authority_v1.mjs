export const TCGPLAYER_MASTER_EVIDENCE_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_MASTER_EVIDENCE_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1";

const setIds = Object.freeze({
  "dp1": "6f5e00e3-2707-406e-a822-addef33a2ced",
  "dp5": "f72d53bd-2e2a-47b4-b802-882424b650e4",
  "dp6": "74ac5cb4-d64c-451b-9642-18523097609a",
  "bw6": "31bab32f-dc83-4a51-b08d-f96256184cf7",
  "sm75": "003fe7e8-ee17-4811-8e68-381fb01f1e09",
  "cel25c": "3be64773-d30e-48af-af8c-3563b57e5e4a",
  "sv10.5b": "b4795cd9-aac4-4717-bf69-824ac4c2128e",
});

const burgerKingCatalogEvidence = Object.freeze({
  pkg15a: Object.freeze({
    relative_path: "docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg15a_stamped_explicit_finish_real_apply_v1.json",
    sha256: "28d904eff44b1ce16ef9e1aae1f955e544a023b83e8bf044437fd25cf70a687e",
  }),
  pkg15c: Object.freeze({
    relative_path: "docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg15c_stamped_reverse_burger_king_real_apply_v1.json",
    sha256: "3247679fd778699cdf02e75ba26fbd215cb90319800aae474c65543e29d0c807",
  }),
  residual: Object.freeze({
    relative_path: "docs/audits/verified_master_set_index_v1/english_master_index_v1/retailer_stamp_active_finish_route_v1/burger_king_residual_child_insert_real_apply_v1.json",
    sha256: "16bc3a35a08e3ff73b026c1595e14e99f2e4dde0c6ccd3c0dfecd30599ac699c",
  }),
});

const burgerKingEvidenceByProductId = Object.freeze({
  155603: burgerKingCatalogEvidence.residual,
  155605: burgerKingCatalogEvidence.residual,
  155608: burgerKingCatalogEvidence.pkg15c,
  174129: burgerKingCatalogEvidence.pkg15c,
  188132: burgerKingCatalogEvidence.pkg15c,
  191913: burgerKingCatalogEvidence.residual,
  213008: burgerKingCatalogEvidence.pkg15a,
  220666: burgerKingCatalogEvidence.pkg15c,
  224679: burgerKingCatalogEvidence.residual,
  231450: burgerKingCatalogEvidence.residual,
});

const rows = [
  [83916, "Blend Energy GFPD", 1394, "Dragons Exalted", "117/124",
    "f96a24f3-962c-40f3-83a0-83383b742dda", "GV-PK-DRX-117", "bw6",
    "Blend Energy GrassFirePsychicDarkness", "117", "", "bw6",
    "Blend Energy GrassFirePsychicDarkness", "Blend Energy GrassFirePsychicDarkness", [
      ["9e6e0c7f-8258-4ad3-bced-24e794e078a9", "normal", "GV-PK-DRX-117-STD", "tcgdex", "bw6-117"],
      ["2d67b786-d7cd-471e-921f-2ea4c9a2f0c8", "reverse", "GV-PK-DRX-117-RH", "tcgdex", "bw6-117"],
    ]],
  [83917, "Blend Energy WLFM", 1394, "Dragons Exalted", "118/124",
    "13101167-6c6b-4cbb-86a8-472cbc2402b8", "GV-PK-DRX-118", "bw6",
    "Blend Energy WaterLightningFightingMetal", "118", "", "bw6",
    "Blend Energy WaterLightningFightingMetal", "Blend Energy WaterLightningFightingMetal", [
      ["1742d906-279c-4773-a5ae-9fe8a2e0bc56", "normal", "GV-PK-DRX-118-STD", "tcgdex", "bw6-118"],
      ["279cf80e-af67-4b15-be93-392395da4fad", "reverse", "GV-PK-DRX-118-RH", "tcgdex", "bw6-118"],
    ]],
  [175275, "Victini Prism Star", 2295, "Dragon Majesty", "7/70",
    "cab17723-75ff-405c-b5c6-b41cb627cf6a", "GV-PK-DRM-7", "sm75",
    "Victini ◇", "7", "", "sm7.5", "Victini ◇", "Victini ◇", [
      ["115782a8-76f8-4c22-94b4-75becc7b679f", "holo", "GV-PK-DRM-7-HOLO", "tcgdex", "sm7.5-7"],
    ]],
  [175491, "Lance Prism Star", 2295, "Dragon Majesty", "61/70",
    "7a95b59f-18b4-4673-97ea-1b1ca89e182a", "GV-PK-DRM-61", "sm75",
    "Lance ◇", "61", "", "sm7.5", "Lance ◇", "Lance ◇", [
      ["9ac3bdcc-7581-4532-99a0-8b8535128641", "holo", "GV-PK-DRM-61-HOLO", "tcgdex", "sm7.5-61"],
    ]],
  [175499, "Blaine's Last Stand (Full Art)", 2295, "Dragon Majesty", "69/70",
    "aa5cc30b-eb91-4956-9a51-31a66eab9c35", "GV-PK-DRM-69", "sm75",
    "Blaine's Last Stand", "69", "", "sm7.5", "Blaine's Last Stand",
    "Blaine's Last Stand", [
      ["d9bc1486-4334-4297-9d13-dfa613421edb", "holo", "GV-PK-DRM-69-HOLO", "tcgdex", "sm7.5-69"],
    ]],
  [250332, "Umbreon Star", 2931, "Celebrations: Classic Collection", "17/17",
    "c9c1a789-a686-4541-99b7-ac7d4de7be30", "GV-PK-CEL-17CC", "cel25c",
    "Umbreon ★", "17", "cc", "cel25c", "Umbreon Star", "Umbreon ★", [
      ["6c7b6af4-de6f-46ae-ba09-bd07efe96d78", "holo", "GV-PK-CEL-17CC-HOLO", "tcgdex", "cel25-17A"],
    ]],
  [642533, "Professor's Research [Professor Juniper]", 24325, "SV: Black Bolt", "085/086",
    "0595b8a4-c397-4868-84ef-ab588b1e4052", "GV-PK-BLK-085", "sv10.5b",
    "Professor's Research", "085", "", "sv10.5b", "Professor's Research",
    "Professor's Research", [
      ["9a5fc810-ca36-4038-af42-fc8e8fe365a9", "normal", "GV-PK-BLK-085-STD", "tcgdex", "sv10.5b-085"],
      ["c47728fc-099c-4fde-ad2d-6c6f4bddc888", "reverse", "GV-PK-BLK-085-RH", "tcgdex", "sv10.5b-085"],
    ]],
  [155603, "Chimchar - 56/100 [Platinum]", 2175, "Burger King Promos", "056/100",
    "006b48c2-45af-486e-9059-ebf0c2a4f329", "GV-PK-DP5-56-PLATINUM-STAMPED-BURGER-KING-2009", "dp5",
    "Chimchar", "56", "platinum_stamped_burger_king_2009", "dp5", "Chimchar", "Chimchar", [
      ["7b63ea82-e888-47be-9d23-96810c96e544", "reverse", "GV-PK-DP5-56-PLATINUM-STAMPED-BURGER-KING-2009-RH", "verified_master_set_index_v1", "dp5:56:burger_king_platinum:reverse"],
    ]],
  [155605, "Eevee - 62/100 [Platinum]", 2175, "Burger King Promos", "062/100",
    "5d43f0d8-0fb3-4a0d-bcef-999fd40e67af", "GV-PK-DP5-62-PLATINUM-STAMPED-BURGER-KING-2009", "dp5",
    "Eevee", "62", "platinum_stamped_burger_king_2009", "dp5", "Eevee", "Eevee", [
      ["6d4b7093-9427-4581-951d-d3204a5e60f7", "reverse", "GV-PK-DP5-62-PLATINUM-STAMPED-BURGER-KING-2009-RH", "verified_master_set_index_v1", "dp5:62:burger_king_platinum:reverse"],
    ]],
  [155608, "Grotle - 49/130 [Diamond & Pearl]", 2175, "Burger King Promos", "049/130",
    "b6b3c332-aeb6-4a6a-9653-b7a66680009d", "GV-PK-DP1-49-DIAMOND-PEARL-STAMP", "dp1",
    "Grotle", "49", "diamond_pearl_stamp", "dp1", "Grotle", "Grotle", [
      ["4ac8916d-3a0a-4cfd-a673-1afd011559d7", "reverse", "GV-PK-DP1-49-DIAMOND-PEARL-STAMP-RH", "verified_master_index_v1", "dp1:49:diamond_pearl_stamp:reverse"],
    ]],
  [174129, "Monferno - 56/130 [Diamond & Pearl]", 2175, "Burger King Promos", "056/130",
    "e9d4ab93-6433-4172-960a-5d8cf180edf4", "GV-PK-DP1-56-DIAMOND-PEARL-STAMP", "dp1",
    "Monferno", "56", "diamond_pearl_stamp", "dp1", "Monferno", "Monferno", [
      ["28bffdea-1003-46c5-97c8-6502da04d936", "reverse", "GV-PK-DP1-56-DIAMOND-PEARL-STAMP-RH", "verified_master_index_v1", "dp1:56:diamond_pearl_stamp:reverse"],
    ]],
  [188132, "Piplup - 71/100 [Platinum]", 2175, "Burger King Promos", "071/100",
    "2df55ec4-c010-4a01-b468-d1da7270e9d2", "GV-PK-DP5-71-PLATINUM-STAMPED-BURGER-KING-2009", "dp5",
    "Piplup", "71", "platinum_stamped_burger_king_2009", "dp5", "Piplup", "Piplup", [
      ["69df0f74-07d7-4faf-b5de-a1779a33fc4b", "reverse", "GV-PK-DP5-71-PLATINUM-STAMPED-BURGER-KING-2009-RH", "verified_master_set_index_v1", "dp5:71:burger_king_platinum:reverse"],
    ]],
  [191913, "Meowth - 106/146 [Platinum]", 2175, "Burger King Promos", "106/146",
    "ca2d8167-7a79-4069-b112-9268e2da6ac0", "GV-PK-DP6-106-PLATINUM-STAMPED-BURGER-KING-2009", "dp6",
    "Meowth", "106", "platinum_stamped_burger_king_2009", "dp6", "Meowth", "Meowth", [
      ["393c4b88-002f-4cc8-b43b-82edd2d871af", "reverse", "GV-PK-DP6-106-PLATINUM-STAMPED-BURGER-KING-2009-RH", "verified_master_set_index_v1", "dp6:106:burger_king_platinum:reverse"],
    ]],
  [213008, "Prinplup - 58/130 [Diamond & Pearl]", 2175, "Burger King Promos", "058/130",
    "4e007c58-5b91-4110-af5b-c274eaa694c0", "GV-PK-DP1-58-DIAMOND-PEARL-STAMP", "dp1",
    "Prinplup", "58", "diamond_pearl_stamp", "dp1", "Prinplup", "Prinplup", [
      ["6be5d985-17f7-4615-b875-d286b0e6ec4f", "holo", "GV-PK-DP1-58-DIAMOND-PEARL-STAMP-HOLO", "verified_master_index_v1", "dp1:58:diamond_pearl_stamp:holo"],
    ]],
  [220666, "Pachirisu - 35/130 [Diamond & Pearl]", 2175, "Burger King Promos", "035/130",
    "d9051f0b-5fe3-4a6c-9195-bdc3aa7cad45", "GV-PK-DP1-35-DIAMOND-PEARL-STAMP", "dp1",
    "Pachirisu", "35", "diamond_pearl_stamp", "dp1", "Pachirisu", "Pachirisu", [
      ["2e253893-efce-4eaa-8edd-e5a2b5e2e014", "reverse", "GV-PK-DP1-35-DIAMOND-PEARL-STAMP-RH", "verified_master_index_v1", "dp1:35:diamond_pearl_stamp:reverse"],
    ]],
  [224679, "Pikachu - 70/100 [Platinum]", 2175, "Burger King Promos", "070/100",
    "41c3c346-edf5-4306-9dd9-992823418994", "GV-PK-DP5-70-PLATINUM-STAMPED-BURGER-KING-2009", "dp5",
    "Pikachu", "70", "platinum_stamped_burger_king_2009", "dp5", "Pikachu", "Pikachu", [
      ["210886b2-8058-465d-bf87-3fe1d93b3047", "reverse", "GV-PK-DP5-70-PLATINUM-STAMPED-BURGER-KING-2009-RH", "verified_master_set_index_v1", "dp5:70:burger_king_platinum:reverse"],
    ]],
  [231450, "Turtwig - 77/100 [Platinum]", 2175, "Burger King Promos", "077/100",
    "d47a7931-82b8-42ba-a6dc-4137642c2f78", "GV-PK-DP5-77-PLATINUM-STAMPED-BURGER-KING-2009", "dp5",
    "Turtwig", "77", "platinum_stamped_burger_king_2009", "dp5", "Turtwig", "Turtwig", [
      ["82a0c5ab-c4e7-440b-9cee-320499342139", "reverse", "GV-PK-DP5-77-PLATINUM-STAMPED-BURGER-KING-2009-RH", "verified_master_set_index_v1", "dp5:77:burger_king_platinum:reverse"],
    ]],
].map(([source_product_id, source_product_name, source_group_id, source_group_name,
  printed_number, card_print_id, gv_id, set_code, name, number, variant_key,
  master_set_key, master_card_name, master_printing_name, printingRows]) => {
  const printings = printingRows.map(([printing_id, finish_key, printing_gv_id,
    provenance_source, provenance_ref]) => Object.freeze({ printing_id, finish_key,
    printing_gv_id, provenance_source, provenance_ref }));
  return Object.freeze({
    authority_version: TCGPLAYER_MASTER_EVIDENCE_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
    source_product_id, source_product_name, source_group_id, source_group_name,
    printed_number,
    target: Object.freeze({ card_print_id, gv_id, set_id: setIds[set_code], set_code,
      name, number, variant_key }),
    master_evidence: Object.freeze({ master_set_key, card_name: master_card_name,
      printing_name: master_printing_name,
      printing_finish_key: burgerKingEvidenceByProductId[source_product_id] ? "stamped" : null }),
    catalog_evidence: burgerKingEvidenceByProductId[source_product_id] ?? null,
    printing: printings[0],
    printings: Object.freeze(printings),
  });
});

export const TCGPLAYER_MASTER_EVIDENCE_ALIAS_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

function text(value) { return String(value ?? "").trim(); }

export function reviewedTcgplayerMasterEvidenceAliasProductIdentityByIdV1(sourceProductId) {
  return rows.find((candidate) => Number(sourceProductId) === candidate.source_product_id) ?? null;
}

export function reviewedTcgplayerMasterEvidenceAliasProductIdentityV1(source) {
  const row = reviewedTcgplayerMasterEvidenceAliasProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerMasterEvidenceAliasProductTargetV1(source, target) {
  const authority = reviewedTcgplayerMasterEvidenceAliasProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id && target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id && target.set_code === authority.target.set_code &&
    target.name === authority.target.name && text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
