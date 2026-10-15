export const TCGPLAYER_MASTER_EVIDENCE_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_MASTER_EVIDENCE_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1";

const setIds = Object.freeze({
  "bw6": "31bab32f-dc83-4a51-b08d-f96256184cf7",
  "sm75": "003fe7e8-ee17-4811-8e68-381fb01f1e09",
  "cel25c": "3be64773-d30e-48af-af8c-3563b57e5e4a",
  "sv10.5b": "b4795cd9-aac4-4717-bf69-824ac4c2128e",
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
      printing_name: master_printing_name }),
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
