export const TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1";

const rows = [
  {
    source_product_id: 84983,
    source_product_name: "Druddigon (Team Plasma) - BW80",
    source_group_id: 1407,
    source_group_name: "Black and White Promos",
    printed_number: "BW80",
    target: {
      card_print_id: "d9860202-8d65-4e9c-92d0-9d74e94b5f36",
      gv_id: "GV-PK-PR-BLW-BW80",
      set_id: "61bceb95-9799-4349-963f-d9e6f8a3c69b",
      set_code: "bwp",
      name: "Druddigon",
      number: "BW80",
      variant_key: "",
    },
    printing: {
      printing_id: "584ca638-390d-491a-94d7-c615d980f1b0",
      finish_key: "holo",
      printing_gv_id: "GV-PK-PR-BLW-BW80-HOLO",
      provenance_source: null,
      provenance_ref: null,
    },
  },
  {
    source_product_id: 88646,
    source_product_name: "Rayquaza EX -BW47",
    source_group_id: 1407,
    source_group_name: "Black and White Promos",
    printed_number: "BW47",
    target: {
      card_print_id: "1fc60a16-b8d9-44b4-8f78-9df83894aa60",
      gv_id: "GV-PK-PR-BLW-BW47",
      set_id: "61bceb95-9799-4349-963f-d9e6f8a3c69b",
      set_code: "bwp",
      name: "Rayquaza-EX",
      number: "BW47",
      variant_key: "",
    },
    printing: {
      printing_id: "1028f3a4-ff44-4e0a-9546-3a76a13299a1",
      finish_key: "holo",
      printing_gv_id: "GV-PK-PR-BLW-BW47-HOLO",
      provenance_source: null,
      provenance_ref: null,
    },
  },
].map((row) => Object.freeze({
  authority_version: TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
  ...row,
  target: Object.freeze(row.target),
  printing: Object.freeze(row.printing),
}));

export const TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

function text(value) { return String(value ?? "").trim(); }

export function reviewedTcgplayerBwpAliasProductIdentityByIdV1(sourceProductId) {
  return rows.find((candidate) => Number(sourceProductId) === candidate.source_product_id) ?? null;
}

export function reviewedTcgplayerBwpAliasProductIdentityV1(source) {
  const row = reviewedTcgplayerBwpAliasProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerBwpAliasProductTargetV1(source, target) {
  const authority = reviewedTcgplayerBwpAliasProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id && target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id && target.set_code === authority.target.set_code &&
    target.name === authority.target.name && text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
