// Admission ceiling only. Mapping writes still require fresh Master Mapping
// Authority and publication still requires a reconciled, fresh market observation.
export const TCGPLAYER_TRAINER_KIT_PILOT_V1 = "TCGPLAYER_TRAINER_KIT_PILOT_V1";

export const TCGPLAYER_TRAINER_KIT_PILOT_CARDS_V1 = Object.freeze([
  Object.freeze({
    source_product_id: 88393,
    source_product_name: "Professor Elm's Training Method",
    printed_number: "25/30",
    card_print_id: "560e87f1-ad9a-5053-a237-84a0c69f9c86",
    gv_id: "GV-PK-TK-tk-hs-g-25",
    set_id: "958be79a-216a-4739-a65e-61feee3dc9cc",
    set_code: "tk-hs-g",
    canonical_number: "25",
    card_printing_id: "22bc5bf7-34b7-525f-ab49-46b2e3c52982",
    printing_gv_id: "GV-PK-TK-tk-hs-g-25-STD",
    original_manifest_sha256: "2e3f7c28ba0e83a85efbad390eb2f21b5bb2aa90d536058e67f7c8dd923d8cc2",
    identity_source_sha256: "b9a081634f0271fda763c28878b0ddec0b0a4efa12ab6f81de92e4537c6f3408",
  }),
  Object.freeze({
    source_product_id: 84427,
    source_product_name: "Copycat",
    printed_number: "21/30",
    card_print_id: "884fa7e7-98b4-5128-922c-a0629f4a090b",
    gv_id: "GV-PK-TK-tk-hs-r-21",
    set_id: "15e86a10-229f-497f-8051-cbc0153d01d9",
    set_code: "tk-hs-r",
    canonical_number: "21",
    card_printing_id: "648e4557-72fb-5d04-a6a5-3e7967d08a8e",
    printing_gv_id: "GV-PK-TK-tk-hs-r-21-STD",
    original_manifest_sha256: "3c589196311ee01cd80e5ca72ac5f59dd6c0b8e7bcfd80b8c1f776bd8e7c0948",
    identity_source_sha256: "99cb8290bcc053756f2a22aa67f7da3f311e087ed96fc80f360b8d468822a8fd",
  }),
]);

export function trainerKitPilotCardV1(source = {}) {
  return TCGPLAYER_TRAINER_KIT_PILOT_CARDS_V1.find(
    (card) => card.source_product_id === Number(source.source_product_id),
  ) ?? null;
}

export function matchesTrainerKitPilotSourceV1(source = {}) {
  const card = trainerKitPilotCardV1(source);
  return Boolean(card &&
    (source.category_id == null || Number(source.category_id) === 3) &&
    Number(source.source_group_id ?? source.group_id) === 1540 &&
    source.source_group_name === "HGSS Trainer Kit: Gyarados & Raichu" &&
    source.source_product_name === card.source_product_name &&
    source.printed_number === card.printed_number);
}

export function matchesTrainerKitPilotTargetV1(source, target = {}) {
  const card = trainerKitPilotCardV1(source);
  return Boolean(card &&
    ["card_print_id", "gv_id", "set_id", "set_code"].every(
      (key) => target[key] === card[key],
    ) &&
    (target.canonical_name ?? target.name) === card.source_product_name &&
    (target.name === undefined || target.name === card.source_product_name) &&
    (target.canonical_number ?? target.number) === card.canonical_number &&
    (target.number === undefined || target.number === card.canonical_number) &&
    target.variant_key === "");
}

export function matchesTrainerKitPilotMappingV1(source, target) {
  return matchesTrainerKitPilotSourceV1(source) &&
    Array.isArray(source.source_subtypes) &&
    source.source_subtypes.length === 1 && source.source_subtypes[0] === "Normal" &&
    matchesTrainerKitPilotTargetV1(source, target);
}

export function matchesTrainerKitPilotPublicationV1(row = {}) {
  const fields = Array.isArray(row.source_product_extended_data)
    ? row.source_product_extended_data.filter(
      (field) => String(field?.name ?? "").trim().toLowerCase() === "number",
    ) : [];
  const source = { ...row, printed_number: fields.length === 1 ? fields[0].value : null };
  const card = trainerKitPilotCardV1(source);
  return Boolean(card && Number(row.category_id) === 3 &&
    matchesTrainerKitPilotSourceV1(source) &&
    matchesTrainerKitPilotTargetV1(source, row) &&
    row.canonical_name === card.source_product_name &&
    row.canonical_number === card.canonical_number &&
    row.card_printing_id === card.card_printing_id &&
    row.printing_gv_id === card.printing_gv_id &&
    row.source_subtype_name === "Normal" && row.finish_key === "normal" &&
    row.normalized_finish_key === "normal" &&
    row.printing_is_provisional === false && row.printing_truth_verified === true);
}

export function applyTrainerKitPilotPublicationScopeV1(scope, row) {
  // Revalidate even if the group label was changed to evade the generic rule.
  if (trainerKitPilotCardV1(row) && !matchesTrainerKitPilotPublicationV1(row)) {
    return { ...scope, in_scope: false, scope_result: "special_variant_v1_1",
      reason_code: "trainer_kit_pilot_identity_mismatch", rule_id: "trainer_kit_pilot_identity_mismatch" };
  }
  if (scope.rule_id !== "deck_exclusive_special_variant" ||
      !matchesTrainerKitPilotPublicationV1(row)) return scope;
  return { ...scope, in_scope: true, scope_result: "in_scope", reason_code: null,
    rule_id: "reviewed_trainer_kit_two_card_pilot", pilot_policy_version: TCGPLAYER_TRAINER_KIT_PILOT_V1 };
}
