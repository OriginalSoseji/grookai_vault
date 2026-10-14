export const TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1";

const SOURCE_GROUP_ID = 24837;
const SOURCE_GROUP_NAME = "ME: 30th Celebration Classic Collection";
const TARGET_SET_ID = "69ee4802-7bfb-52e5-a1f5-4cddac79002d";
const TARGET_SET_CODE = "30c-classic";

const rows = [
  [716158, "Genesect EX (Team Plasma)", "11/101",
    "c15241ae-5958-52a4-b96e-d16388544e7c",
    "GV-PK-30C-CLASSIC-011-101", "Genesect EX", "11/101",
    "GV-PK-30C-CLASSIC-011-101-HOLO",
    "ANNIVERSARY_GENESECT1_PRINTING_REPAIR_20260918",
    "raw_imports:-605783771284354987|master-index:4a3cfb1c0d231e99e95ee4d53a8aec269e1b88f16338454d1c80e5627a41c731"],
  [716198, "Gengar (Prime)", "94/102",
    "62d1f17e-9213-555b-ae54-1534fd52373e",
    "GV-PK-30C-CLASSIC-094-102", "Gengar", "94/102",
    "GV-PK-30C-CLASSIC-094-102-HOLO",
    "ANNIVERSARY_CLASSIC29_PRINTING_REPAIR_20260918",
    "raw_imports:-325635975780378609|master-index:ff2814f3672985819572ba45295e02a3f869a7b8aa0fda94a0ea55daef2f9ef7"],
].map(([sourceProductId, sourceProductName, printedNumber, cardPrintId,
  gvId, targetName, targetNumber, printingGvId, provenanceSource,
  provenanceRef]) => Object.freeze({
  authority_version:
    TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
  source_product_id: sourceProductId,
  source_product_name: sourceProductName,
  source_group_id: SOURCE_GROUP_ID,
  source_group_name: SOURCE_GROUP_NAME,
  printed_number: printedNumber,
  target: Object.freeze({
    card_print_id: cardPrintId,
    gv_id: gvId,
    set_id: TARGET_SET_ID,
    set_code: TARGET_SET_CODE,
    name: targetName,
    number: targetNumber,
    variant_key: "",
  }),
  printing: Object.freeze({
    finish_key: "holo",
    printing_gv_id: printingGvId,
    provenance_source: provenanceSource,
    provenance_ref: provenanceRef,
  }),
}));

export const TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1 =
  Object.freeze(rows);

function text(value) {
  return String(value ?? "").trim();
}

export function reviewedTcgplayer30cClassicAliasProductIdentityByIdV1(
  sourceProductId,
) {
  return rows.find((candidate) =>
    Number(sourceProductId) === candidate.source_product_id,
  ) ?? null;
}

export function reviewedTcgplayer30cClassicAliasProductIdentityV1(source) {
  const row = reviewedTcgplayer30cClassicAliasProductIdentityByIdV1(
    source?.source_product_id,
  );
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number
    ? row
    : null;
}

export function matchesReviewedTcgplayer30cClassicAliasProductTargetV1(
  source,
  target,
) {
  const authority = reviewedTcgplayer30cClassicAliasProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id &&
    target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id &&
    target.set_code === authority.target.set_code &&
    target.name === authority.target.name &&
    text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
