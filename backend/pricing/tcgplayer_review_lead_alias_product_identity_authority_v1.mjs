export const TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1";

const setIds = Object.freeze({
  ex15: "d73bcf8f-d74e-4787-9bc9-fca8295730ad",
  smp: "d1cc00ee-68d1-4f62-9a75-a2bd4f45c693",
  sm10: "6958fc04-24e6-45ff-b729-b0119353f734",
  svp: "082139da-c6d1-4b08-ba00-2b5219bb74d6",
});

const rows = [
  [84198, "Charizard Star (Delta Species)", 1411, "EX Dragon Frontiers", "100/101",
    "e748c02a-420c-4845-a3d3-ca2d9c557cdd", "GV-PK-DF-100", "ex15", "Charizard ★ δ", "100", [
      ["3344ca0b-2e7f-4f43-afaf-ad781c8fb15b", "holo", "GV-PK-DF-100-HOLO",
        "verified_master_index_v1", "ex15|100|Charizard ★ δ|holo", "insert"],
    ]],
  [188320, "Bulbasaur - SM198 (In-Store Event Promo)", 1861, "SM Promos", "SM198",
    "0dff140a-e128-4137-a521-342c9a402c2e", "GV-PK-SM-SM198", "smp", "Bulbasaur", "SM198", [
      ["ecc555c4-7fdf-40d9-b175-b246e7af4d91", "holo", "GV-PK-SM-SM198-HOLO",
        null, null, "insert"],
    ]],
  [189273, "Fairy Charm L", 2420, "SM - Unbroken Bonds", "172/214",
    "bb5e1d7d-19be-47a5-ac52-37f160496952", "GV-PK-UNB-172", "sm10", "Fairy Charm Lightning", "172", [
      ["2b6f660e-cffb-465c-9aae-e55355318b1c", "normal", "GV-PK-UNB-172-STD",
        "ENGLISH_PROVENANCE_REPAIR_V1", "raw_imports:-715474445127010105|master-index:f43e3edc5f38cf5ad37dd050a905bd0c179d3255acd1580b3581495a80595612", "require_existing",
        "129905bd-8d99-5d4e-a0e1-82417cd41a55"],
      ["b306b3cc-6d97-417c-8e0d-c912a818d612", "reverse", "GV-PK-UNB-172-RH",
        "ENGLISH_PROVENANCE_REPAIR_V1", "raw_imports:-715474445127010105|master-index:f43e3edc5f38cf5ad37dd050a905bd0c179d3255acd1580b3581495a80595612", "require_existing",
        "b75bb262-6a33-595d-a39d-eb799c1dc781"],
    ]],
  [518863, "Paradise Resort - 045 (World Championships 2023)", 22872,
    "SV: Scarlet & Violet Promo Cards", "045",
    "51e53f1e-9e4f-4819-8b43-099e6ad3772b", "GV-PK-PR-SV-045", "svp", "Paradise Resort", "045", [
      ["a09c9708-1801-4d59-93db-00220a1bcc47", "normal", "GV-PK-PR-SV-045-STD",
        "tcgdex", "svp-045", "insert"],
    ]],
  [578146, "Paradise Resort - 150 (World Championships 2024)", 22872,
    "SV: Scarlet & Violet Promo Cards", "150",
    "d20a81f0-9205-4669-90f4-ce254b019332", "GV-PK-PR-SV-150", "svp", "Paradise Resort", "150", [
      ["608c1427-2e7a-4f1b-b52b-a1ea27ffbd0f", "normal", "GV-PK-PR-SV-150-STD",
        "tcgdex", "svp-150", "insert"],
    ]],
  [649232, "Paradise Resort - 224 (World Championships 2025)", 22872,
    "SV: Scarlet & Violet Promo Cards", "224",
    "dae7e1ad-487c-4923-84f8-6a2408a51514", "GV-PK-PR-SV-224", "svp", "Paradise Resort", "224", [
      ["dd08ecfc-f6b3-4d51-957e-172eed3965a3", "normal", "GV-PK-PR-SV-224-STD",
        "tcgdex", "svp-224", "insert"],
    ]],
].map(([source_product_id, source_product_name, source_group_id, source_group_name,
  printed_number, card_print_id, gv_id, set_code, name, number, printingRows]) => {
  const printings = printingRows.map(([printing_id, finish_key, printing_gv_id,
    provenance_source, provenance_ref, truth_review_action, expected_review_id = null]) =>
    Object.freeze({ printing_id, finish_key, printing_gv_id, provenance_source, provenance_ref,
      truth_review_action, expected_review_id }));
  return Object.freeze({
    authority_version: TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
    source_product_id, source_product_name, source_group_id, source_group_name, printed_number,
    target: Object.freeze({ card_print_id, gv_id, set_id: setIds[set_code], set_code,
      name, number, variant_key: "" }),
    printing: printings[0],
    printings: Object.freeze(printings),
  });
});

export const TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

function text(value) { return String(value ?? "").trim(); }

export function reviewedTcgplayerReviewLeadAliasProductIdentityByIdV1(sourceProductId) {
  return rows.find((candidate) => Number(sourceProductId) === candidate.source_product_id) ?? null;
}

export function reviewedTcgplayerReviewLeadAliasProductIdentityV1(source) {
  const row = reviewedTcgplayerReviewLeadAliasProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerReviewLeadAliasProductTargetV1(source, target) {
  const authority = reviewedTcgplayerReviewLeadAliasProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id && target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id && target.set_code === authority.target.set_code &&
    target.name === authority.target.name && text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
