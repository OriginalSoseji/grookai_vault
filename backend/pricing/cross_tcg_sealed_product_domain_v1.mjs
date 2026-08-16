import { createHash } from "node:crypto";

export const CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1 =
  "CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1";

export const SEALED_PACKAGE_FORMS_V1 = Object.freeze([
  "pack",
  "sleeved_pack",
  "booster_box",
  "display",
  "case",
  "deck",
  "deck_display",
  "kit",
  "tin",
  "collection",
  "bundle",
  "promo_pack",
]);

export const SEALED_EVIDENCE_DIMENSIONS_V1 = Object.freeze([
  "product_line",
  "manufacturer",
  "package_form",
  "language",
  "region",
  "edition",
  "wave",
  "quantity",
  "contents",
  "release_date",
  "presale_state",
]);

const PROHIBITED_CARD_KEYS = new Set([
  "card_print_id",
  "card_printing_id",
  "card_print_ids",
  "card_printing_ids",
]);

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function slug(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function stableJsonV1(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256V1(value) {
  return createHash("sha256").update(value).digest("hex");
}

function required(value, field) {
  const normalized = clean(value);
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function assertNoCardDomainKeys(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoCardDomainKeys(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (PROHIBITED_CARD_KEYS.has(key)) {
      throw new Error(`sealed domain cannot contain ${path}.${key}`);
    }
    assertNoCardDomainKeys(entry, `${path}.${key}`);
  }
}

export function buildSealedFamilyIdentityV1(input = {}) {
  assertNoCardDomainKeys(input);
  const identity = {
    identity_contract_version: CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1,
    game_key: slug(required(input.game_key ?? input.game, "game_key")),
    family_key: slug(required(input.family_key ?? input.canonical_name, "family_key")),
    canonical_name: required(input.canonical_name, "canonical_name"),
    manufacturer_name: required(input.manufacturer_name, "manufacturer_name"),
    product_line_key: input.product_line_key ? slug(input.product_line_key) : null,
  };
  return { ...identity, identity_fingerprint: sha256V1(stableJsonV1(identity)) };
}

function normalizeContents(contents) {
  if (contents === undefined || contents === null) return [];
  if (!Array.isArray(contents)) throw new Error("explicit_contents must be an array");
  return contents.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("each content entry must be an object");
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("content quantity must be a positive integer");
    }
    return { unit: slug(required(entry.unit, "content unit")), quantity };
  }).sort((a, b) => `${a.unit}:${a.quantity}`.localeCompare(`${b.unit}:${b.quantity}`));
}

export function buildSealedVariantIdentityV1(input = {}) {
  assertNoCardDomainKeys(input);
  const packageForm = slug(required(input.package_form, "package_form"));
  if (!SEALED_PACKAGE_FORMS_V1.includes(packageForm)) {
    throw new Error(`unsupported package_form: ${packageForm}`);
  }
  const familyFingerprint = required(input.family_identity_fingerprint, "family_identity_fingerprint");
  if (!/^[0-9a-f]{64}$/.test(familyFingerprint)) {
    throw new Error("family_identity_fingerprint must be SHA-256");
  }
  const identity = {
    identity_contract_version: CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1,
    family_identity_fingerprint: familyFingerprint,
    variant_key: slug(required(input.variant_key ?? input.canonical_name, "variant_key")),
    canonical_name: required(input.canonical_name, "canonical_name"),
    package_form: packageForm,
    language_code: input.language_code ? clean(input.language_code).toLowerCase() : null,
    region_code: input.region_code ? clean(input.region_code).toUpperCase() : null,
    edition: input.edition ? clean(input.edition) : null,
    wave: input.wave ? clean(input.wave) : null,
    explicit_contents: normalizeContents(input.explicit_contents),
    manufacturer_sku: input.manufacturer_sku ? clean(input.manufacturer_sku) : null,
    upc: input.upc ? clean(input.upc) : null,
    release_date: input.release_date ? clean(input.release_date) : null,
  };
  return { ...identity, identity_fingerprint: sha256V1(stableJsonV1(identity)) };
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

export function validateSealedPromotionCandidateV1(input = {}) {
  const errors = [];
  try {
    assertNoCardDomainKeys(input);
  } catch (error) {
    errors.push(error.message);
  }
  if (input.classification !== "sealed_candidate") {
    errors.push("classification must be sealed_candidate");
  }
  if (input.review?.decision !== "confirmed_sealed" || input.review?.promotion_authorized !== true) {
    errors.push("confirmed_sealed authorized review is required");
  }
  if (input.source_mapping?.source_provider !== "tcgplayer") {
    errors.push("source provider must be tcgplayer");
  }
  for (const key of ["source_category_id", "source_group_id", "source_product_id"]) {
    if (!positiveInteger(input.source_mapping?.[key])) errors.push(`${key} must be a positive integer`);
  }
  if (!/^[0-9a-f]{64}$/.test(clean(input.source_mapping?.source_payload_hash))) {
    errors.push("source_payload_hash must be SHA-256");
  }
  const dimensions = new Set((input.evidence ?? []).map((entry) => entry?.dimension));
  if (!dimensions.has("package_form")) errors.push("package_form evidence is required");
  for (const [field, dimension] of [
    ["language_code", "language"],
    ["region_code", "region"],
    ["edition", "edition"],
    ["wave", "wave"],
    ["release_date", "release_date"],
  ]) {
    if (input.variant?.[field] && !dimensions.has(dimension)) {
      errors.push(`${dimension} evidence is required when ${field} is present`);
    }
  }
  if ((input.variant?.explicit_contents ?? []).length > 0 && !dimensions.has("contents")) {
    errors.push("contents evidence is required when explicit_contents is present");
  }
  for (const dimension of dimensions) {
    if (!SEALED_EVIDENCE_DIMENSIONS_V1.includes(dimension)) {
      errors.push(`unsupported evidence dimension: ${dimension}`);
    }
  }
  return {
    contract_version: CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1,
    valid: errors.length === 0,
    errors,
    canonical_authority: errors.length === 0,
    publication_authority: false,
  };
}

export function validateFutureSealedCanaryPlanV1(plan = {}) {
  const errors = [];
  const candidates = Array.isArray(plan.candidates) ? plan.candidates : [];
  const variants = Array.isArray(plan.variants) ? plan.variants : [];
  if (candidates.length < 1 || candidates.length > 20) errors.push("candidate count must be 1 through 20");
  if (variants.length < 1 || variants.length > 10) errors.push("variant count must be 1 through 10");
  const games = new Set(variants.map((entry) => slug(entry.game_key)));
  for (const game of ["pokemon", "pokemon_japan", "magic", "one_piece"]) {
    if (!games.has(game)) errors.push(`missing required game: ${game}`);
  }
  const forms = new Set(variants.map((entry) => slug(entry.package_form)));
  if (!forms.has("pack")) errors.push("canary requires a pack");
  if (!["booster_box", "display"].some((form) => forms.has(form))) errors.push("canary requires a box or display");
  if (!forms.has("deck")) errors.push("canary requires a deck");
  if (!["collection", "bundle"].some((form) => forms.has(form))) errors.push("canary requires a collection or bundle");
  if (plan.release_state !== "draft") errors.push("release must remain draft");
  if (plan.change_active_release_pointer !== false) errors.push("active release pointer must remain unchanged");
  if (plan.publication_authority !== false) errors.push("publication authority must remain false");
  try {
    assertNoCardDomainKeys(plan);
  } catch (error) {
    errors.push(error.message);
  }
  return { valid: errors.length === 0, errors };
}

export function migrationPlanFingerprintV1(input) {
  assertNoCardDomainKeys(input);
  return sha256V1(stableJsonV1(input));
}
