export const TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITY_AUTHORITY_V1 =
  "TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITY_AUTHORITY_V1";

const rows = [
  [87394, "Mew (8)", 1418, "WoTC Promo", "08/53",
    "295f2bd1-cfa5-4648-a1fc-09b355665ecc", "GV-PK-PR-8",
    "915c6517-a6b5-418f-8bc7-c05cae51e0ff", "basep", "Mew", "8",
    "49acad98-91e9-440c-bec3-9c0f264c4a7c", "normal", "GV-PK-PR-8-STD",
    "tcgdex", "basep-8"],
  [162270, "Torchic - 3/5", 2214, "Kids WB Promos", "003/005",
    "bd16f36d-f0e8-4eec-bc9d-d61cc6a4413a", "GV-PK-CC-3",
    "074b63d4-5018-44ec-bf3c-d1eff6a92234", "ex5.5", "Torchic", "3",
    "5790b606-5611-47f9-bed5-d6977a36b5e9", "normal", "GV-PK-CC-3-STD",
    "ENGLISH_PROVENANCE_REPAIR_V1",
    "raw_imports:-756926107043547345|master-index:c5346e3d5c7cb3de0661cc75c74e048cfa9c08a3936ecc36285a9e4b629ac2bb"],
  [246275, "Professor's Research [Professor Willow] - SWSH178 (with Pokemon Go Code)",
    2545, "SWSH: Sword & Shield Promo Cards", "SWSH178",
    "176e4e24-a575-468f-893c-76fc350c2f55", "GV-PK-PR-SW-SWSH178",
    "fb3eedc5-7234-49b5-b95b-8a9286c27daf", "swshp", "Professor's Research", "SWSH178",
    "c6a871e3-1361-42e3-8aec-db3ea171e7da", "normal", "GV-PK-PR-SW-SWSH178-STD",
    "verified_master_set_index_v1", "swshp:SWSH178:normal"],
].map(([source_product_id, source_product_name, source_group_id, source_group_name,
  printed_number, card_print_id, gv_id, set_id, set_code, name, number,
  printing_id, finish_key, printing_gv_id, provenance_source, provenance_ref]) => {
  const printing = Object.freeze({
    printing_id,
    finish_key,
    printing_gv_id,
    provenance_source,
    provenance_ref,
  });
  return Object.freeze({
    authority_version: TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITY_AUTHORITY_V1,
    source_product_id,
    source_product_name,
    source_group_id,
    source_group_name,
    printed_number,
    target: Object.freeze({ card_print_id, gv_id, set_id, set_code, name, number, variant_key: "" }),
    printing,
    printings: Object.freeze([printing]),
  });
});

export const TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1 = Object.freeze(rows);

function text(value) {
  return String(value ?? "").trim();
}

export function reviewedTcgplayerFounderReviewBatchProductIdentityByIdV1(sourceProductId) {
  return rows.find((row) => Number(sourceProductId) === row.source_product_id) ?? null;
}

export function reviewedTcgplayerFounderReviewBatchProductIdentityV1(source) {
  const row = reviewedTcgplayerFounderReviewBatchProductIdentityByIdV1(source?.source_product_id);
  if (!row) return null;
  return Number(source?.source_group_id) === row.source_group_id &&
    text(source?.source_group_name) === row.source_group_name &&
    text(source?.source_product_name) === row.source_product_name &&
    text(source?.printed_number) === row.printed_number ? row : null;
}

export function matchesReviewedTcgplayerFounderReviewBatchProductTargetV1(source, target) {
  const authority = reviewedTcgplayerFounderReviewBatchProductIdentityV1(source);
  if (!authority || !target) return false;
  return target.card_print_id === authority.target.card_print_id &&
    target.gv_id === authority.target.gv_id &&
    target.set_id === authority.target.set_id &&
    target.set_code === authority.target.set_code &&
    target.name === authority.target.name &&
    text(target.number) === authority.target.number &&
    text(target.variant_key) === authority.target.variant_key;
}
