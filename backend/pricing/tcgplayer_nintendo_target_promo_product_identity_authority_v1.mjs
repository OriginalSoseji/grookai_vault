export const TCGPLAYER_NINTENDO_TARGET_PROMO_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_NINTENDO_TARGET_PROMO_PRODUCT_IDENTITY_AUTHORITY_V1";

const rows = [
  {
    source_product_id: 145343,
    source_product_name: "Whismur - 019 (Target Promo)",
    source_group_id: 1423,
    source_group_name: "Nintendo Promos",
    printed_number: "019",
    target: {
      card_print_id: "e678f2d5-dc95-41bb-9b35-3f5d0955c1fd",
      gv_id: "GV-PK-PR-NP-19",
      set_id: "a68e47d4-8c29-43d2-ade1-728cbefce64c",
      set_code: "np",
      name: "Whismur",
      number: "19",
      variant_key: "",
    },
    printing: {
      printing_id: "63ed4d09-58e7-4100-8338-64eb0f945e73",
      finish_key: "normal",
      printing_gv_id: "GV-PK-PR-NP-19-STD",
      provenance_source: "EXISTING_PRINTING_SCOPED_PROVENANCE_V1",
      provenance_ref: "raw_imports:-562970277523425846|printing-scope:7d0127c12e30a3632f1d99a07f56e0e8baf54075d2c5390f33dba0a0fee070f4",
    },
  },
  {
    source_product_id: 153316,
    source_product_name: "Treecko - 016 (Target Promo)",
    source_group_id: 1423,
    source_group_name: "Nintendo Promos",
    printed_number: "016",
    target: {
      card_print_id: "c355dd34-d755-48eb-8c9a-cbd5009066e0",
      gv_id: "GV-PK-PR-NP-16",
      set_id: "a68e47d4-8c29-43d2-ade1-728cbefce64c",
      set_code: "np",
      name: "Treecko",
      number: "16",
      variant_key: "",
    },
    printing: {
      printing_id: "f71eeea2-da75-4300-8f8b-2e18f467b832",
      finish_key: "normal",
      printing_gv_id: "GV-PK-PR-NP-16-STD",
      provenance_source: "EXISTING_PRINTING_SCOPED_PROVENANCE_V1",
      provenance_ref: "raw_imports:-562970277523425846|printing-scope:7d0127c12e30a3632f1d99a07f56e0e8baf54075d2c5390f33dba0a0fee070f4",
    },
  },
  {
    source_product_id: 153317,
    source_product_name: "Torchic - 017 (Target Promo)",
    source_group_id: 1423,
    source_group_name: "Nintendo Promos",
    printed_number: "017",
    target: {
      card_print_id: "d040dd6f-4e7d-466f-b1d6-8bfdccae8a2f",
      gv_id: "GV-PK-PR-NP-17",
      set_id: "a68e47d4-8c29-43d2-ade1-728cbefce64c",
      set_code: "np",
      name: "Torchic",
      number: "17",
      variant_key: "",
    },
    printing: {
      printing_id: "53aecc49-f334-486c-81e2-94987b5addb6",
      finish_key: "normal",
      printing_gv_id: "GV-PK-PR-NP-17-STD",
      provenance_source: "EXISTING_PRINTING_SCOPED_PROVENANCE_V1",
      provenance_ref: "raw_imports:-562970277523425846|printing-scope:7d0127c12e30a3632f1d99a07f56e0e8baf54075d2c5390f33dba0a0fee070f4",
    },
  },
  {
    source_product_id: 153319,
    source_product_name: "Mudkip - 018 (Target Promo)",
    source_group_id: 1423,
    source_group_name: "Nintendo Promos",
    printed_number: "018",
    target: {
      card_print_id: "2d6b2362-f87a-4c61-92dd-55c70fd3f0c3",
      gv_id: "GV-PK-PR-NP-18",
      set_id: "a68e47d4-8c29-43d2-ade1-728cbefce64c",
      set_code: "np",
      name: "Mudkip",
      number: "18",
      variant_key: "",
    },
    printing: {
      printing_id: "cc696bf5-18c6-481c-90dd-5a74158bd70d",
      finish_key: "normal",
      printing_gv_id: "GV-PK-PR-NP-18-STD",
      provenance_source: "EXISTING_PRINTING_SCOPED_PROVENANCE_V1",
      provenance_ref: "raw_imports:-562970277523425846|printing-scope:7d0127c12e30a3632f1d99a07f56e0e8baf54075d2c5390f33dba0a0fee070f4",
    },
  },
].map((row) => Object.freeze({
  authority_version: TCGPLAYER_NINTENDO_TARGET_PROMO_PRODUCT_IDENTITY_AUTHORITY_V1,
  ...row,
  target: Object.freeze(row.target),
  printing: Object.freeze(row.printing),
}));

export const TCGPLAYER_NINTENDO_TARGET_PROMO_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

function text(value) { return String(value ?? "").trim(); }

export function reviewedTcgplayerNintendoTargetPromoProductIdentityByIdV1(sourceProductId) {
  return rows.find((candidate) => Number(sourceProductId) === candidate.source_product_id) ?? null;
}

export function reviewedTcgplayerNintendoTargetPromoProductIdentityV1(source) {
  const row = reviewedTcgplayerNintendoTargetPromoProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerNintendoTargetPromoProductTargetV1(source, target) {
  const authority = reviewedTcgplayerNintendoTargetPromoProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id && target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id && target.set_code === authority.target.set_code &&
    target.name === authority.target.name && text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
