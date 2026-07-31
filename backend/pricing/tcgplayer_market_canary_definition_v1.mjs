import fs from "node:fs/promises";
import path from "node:path";

export const TCGPLAYER_MARKET_CANARY_DEFINITION_SCHEMA_V1 =
  "TCGPLAYER_MARKET_CANARY_DEFINITION_V1";
export const TCGPLAYER_MARKET_CANARY_EXPECTED_COUNT_V1 = 100;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FINISH_BY_SOURCE_SUBTYPE = new Map([
  ["Holofoil", "holo"],
  ["Reverse Holofoil", "reverse"],
  ["Normal", "normal"],
]);

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requireUuid(value, field) {
  const normalized = requireText(value, field);
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${field} must be a UUID`);
  }
  return normalized;
}

function requirePassed(result, field) {
  if (!result || result.status !== "passed") {
    throw new Error(`${field}.status must be passed`);
  }
}

export function validateTcgplayerMarketCanaryDefinitionV1(
  definition,
  {
    expectedCount = TCGPLAYER_MARKET_CANARY_EXPECTED_COUNT_V1,
    requireVerified = true,
  } = {},
) {
  if (
    definition?.schema_version !==
    TCGPLAYER_MARKET_CANARY_DEFINITION_SCHEMA_V1
  ) {
    throw new Error(
      `canary schema_version must be ${TCGPLAYER_MARKET_CANARY_DEFINITION_SCHEMA_V1}`,
    );
  }
  requireText(definition.canary_id, "canary_id");
  requireUuid(definition.source_shadow_run_id, "source_shadow_run_id");
  requireText(definition.source_sync_run_id, "source_sync_run_id");
  if (definition.expected_count !== expectedCount) {
    throw new Error(`canary expected_count must be ${expectedCount}`);
  }
  if (!Array.isArray(definition.printings)) {
    throw new Error("canary printings must be an array");
  }
  if (definition.printings.length !== expectedCount) {
    throw new Error(
      `canary must contain exactly ${expectedCount} printings`,
    );
  }
  if (requireVerified && definition.verification_status !== "verified") {
    throw new Error("canary verification_status must be verified");
  }

  const printingIds = new Set();
  const sourceKeys = new Set();
  definition.printings.forEach((printing, index) => {
    const field = `printings[${index}]`;
    if (printing.ordinal !== index + 1) {
      throw new Error(`${field}.ordinal must be ${index + 1}`);
    }
    const cardPrintingId = requireUuid(
      printing.card_printing_id,
      `${field}.card_printing_id`,
    );
    requireUuid(printing.card_print_id, `${field}.card_print_id`);
    requireText(printing.gv_id, `${field}.gv_id`);
    requireText(printing.printing_gv_id, `${field}.printing_gv_id`);
    requireText(printing.canonical_name, `${field}.canonical_name`);
    requireText(printing.canonical_number, `${field}.canonical_number`);
    requireText(printing.canonical_set_name, `${field}.canonical_set_name`);
    requireText(printing.canonical_set_code, `${field}.canonical_set_code`);
    requireText(printing.source_product_name, `${field}.source_product_name`);
    if (
      !Number.isInteger(printing.source_product_id) ||
      printing.source_product_id < 1
    ) {
      throw new Error(`${field}.source_product_id must be a positive integer`);
    }
    const sourceSubtypeName = requireText(
      printing.source_subtype_name,
      `${field}.source_subtype_name`,
    );
    const expectedFinish = requireText(
      printing.expected_finish,
      `${field}.expected_finish`,
    );
    if (FINISH_BY_SOURCE_SUBTYPE.get(sourceSubtypeName) !== expectedFinish) {
      throw new Error(
        `${field} source subtype and expected finish do not agree`,
      );
    }
    if (printing.expected_language !== "English") {
      throw new Error(`${field}.expected_language must be English`);
    }
    if (printing.expected_publication_state !== "publish") {
      throw new Error(
        `${field}.expected_publication_state must be publish`,
      );
    }
    if (
      typeof printing.expected_headline_usd !== "number" ||
      !Number.isFinite(printing.expected_headline_usd) ||
      printing.expected_headline_usd <= 0
    ) {
      throw new Error(
        `${field}.expected_headline_usd must be a positive number`,
      );
    }
    if (printing.expected_quarantine_reason !== null) {
      throw new Error(`${field}.expected_quarantine_reason must be null`);
    }
    requireText(printing.image_url, `${field}.image_url`);
    if (requireVerified) {
      requirePassed(
        printing.provenance_verification,
        `${field}.provenance_verification`,
      );
      requirePassed(
        printing.visual_data_verification,
        `${field}.visual_data_verification`,
      );
    }

    if (printingIds.has(cardPrintingId)) {
      throw new Error(`duplicate card_printing_id ${cardPrintingId}`);
    }
    printingIds.add(cardPrintingId);
    const sourceKey = [
      printing.source_product_id,
      sourceSubtypeName,
      cardPrintingId,
    ].join(":");
    if (sourceKeys.has(sourceKey)) {
      throw new Error(`duplicate canary source identity ${sourceKey}`);
    }
    sourceKeys.add(sourceKey);
  });

  return definition;
}

export async function loadTcgplayerMarketCanaryDefinitionV1(
  definitionPath,
  options,
) {
  const absolutePath = path.resolve(definitionPath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const definition = validateTcgplayerMarketCanaryDefinitionV1(
    JSON.parse(raw),
    options,
  );
  return { absolutePath, raw, definition };
}

export function tcgplayerMarketCanarySourceKeyV1(value) {
  return [
    Number(value.source_product_id),
    value.source_subtype_name,
    value.card_printing_id,
  ].join(":");
}
