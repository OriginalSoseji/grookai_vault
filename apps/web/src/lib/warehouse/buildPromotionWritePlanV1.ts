import { isUsablePublicImageUrl } from "../publicCardImage";
import { createServerAdminClient } from "../supabase/admin";
import type { WarehouseInterpreterPackage } from "./buildWarehouseInterpreterV1";
import { validatePerfectOrderVariantIdentity } from "./perfectOrderVariantIdentity";
import {
  asPrintedModifierRecord,
  getPrintedModifierLabel,
  normalizePrintedModifierVariantKey,
} from "./printedIdentityModel";
import { normalizeVariantKey, sameVariantKey } from "./normalizeVariantKey";

type JsonRecord = Record<string, unknown>;
type AdminClient = ReturnType<typeof createServerAdminClient>;

type PromotionWritePlanCandidate = {
  id: string;
  tcgplayer_id: string | null;
  current_staging_id?: string | null;
  current_staging_payload?: JsonRecord | null;
};

type MetadataExtractionInput =
  | {
      normalized_metadata_package?: JsonRecord | null;
      created_at?: string | null;
      event_type?: string | null;
    }
  | JsonRecord
  | null
  | undefined;

type CanonCardPrintRow = {
  id: string;
  set_id: string;
  set_code: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  variant_key: string | null;
  tcgplayer_id: string | null;
  image_url: string | null;
  image_alt_url: string | null;
};

type CanonCardPrintingRow = {
  id: string;
  card_print_id: string;
  finish_key: string | null;
  is_provisional: boolean | null;
  provenance_source: string | null;
  provenance_ref: string | null;
  created_by: string | null;
};

type CanonSetRow = {
  id: string;
  code: string;
  name: string | null;
};

type ExternalMappingRow = {
  id: number;
  card_print_id: string;
  source: string;
  external_id: string;
  meta: JsonRecord | null;
  synced_at: string;
  active: boolean;
};

type SearchCardPrintRow = {
  id: string;
  name: string | null;
  set_code: string | null;
  number: string | null;
  number_plain: string | null;
  variant_key: string | null;
};

export type WriteAction = {
  action: "CREATE" | "REUSE" | "UPDATE" | "NONE";
  target_id: string | null;
  payload: Record<string, any> | null;
  reason?: string | null;
};

export type CanonState = {
  card_prints: Record<string, any> | null;
  card_printings: Record<string, any> | null;
  external_mappings: Record<string, any> | null;
  image_fields: Record<string, any> | null;
};

export type PromotionWritePlanV1 = {
  status: "READY" | "BLOCKED";
  reason: string;
  actions: {
    card_prints: WriteAction;
    card_printings: WriteAction;
    external_mappings: WriteAction;
    image_fields: WriteAction;
  };
  preview: {
    before: CanonState | null;
    after: CanonState | null;
  };
  missing_requirements: string[];
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function normalizeTextOrNull(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNameKey(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeNumberPlain(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  if (normalized.includes("/")) {
    const [left] = normalized.split("/", 1);
    const digits = left?.replace(/[^0-9]/g, "") ?? "";
    return digits.length > 0 ? digits : null;
  }

  const digits = normalized.replace(/[^0-9]/g, "");
  return digits.length > 0 ? digits : null;
}

function buildEmptyAction(reason?: string | null): WriteAction {
  return {
    action: "NONE",
    target_id: null,
    payload: null,
    reason: reason ?? null,
  };
}

function buildPreview(before: CanonState | null, after: CanonState | null) {
  return { before, after };
}

function buildBlockedPlan(
  reason: string,
  missingRequirements: string[],
  preview: { before: CanonState | null; after: CanonState | null } = buildPreview(null, null),
): PromotionWritePlanV1 {
  return {
    status: "BLOCKED",
    reason,
    actions: {
      card_prints: buildEmptyAction(reason),
      card_printings: buildEmptyAction(reason),
      external_mappings: buildEmptyAction("Promotion Executor V1 does not write external_mappings."),
      image_fields: buildEmptyAction(reason),
    },
    preview,
    missing_requirements: missingRequirements,
  };
}

function getNormalizedMetadataPackage(metadataExtraction: MetadataExtractionInput) {
  const envelope = asRecord(metadataExtraction);
  const normalizedFromEnvelope = asRecord(envelope?.normalized_metadata_package);
  if (normalizedFromEnvelope) {
    return normalizedFromEnvelope;
  }
  return envelope;
}

function getMetadataIdentity(metadataExtraction: MetadataExtractionInput) {
  return asRecord(getNormalizedMetadataPackage(metadataExtraction)?.identity);
}

function getPrintedModifier(metadataExtraction: MetadataExtractionInput) {
  return asPrintedModifierRecord(getNormalizedMetadataPackage(metadataExtraction)?.printed_modifier);
}

function extractStagedPublicImageUrl(candidate: PromotionWritePlanCandidate) {
  const payload = asRecord(candidate.current_staging_payload);
  if (!payload) {
    return null;
  }

  const evidenceSummary = asRecord(payload.evidence_summary);
  const evidenceRows = Array.isArray(evidenceSummary?.evidence_rows) ? evidenceSummary.evidence_rows : [];
  for (const row of evidenceRows) {
    const record = asRecord(row);
    const candidateUrl = normalizeTextOrNull(record?.storage_path);
    if (isUsablePublicImageUrl(candidateUrl)) {
      return candidateUrl;
    }
  }

  const normalizedPackage = asRecord(payload.latest_normalized_package);
  const refs = [
    normalizedPackage?.primary_front_image_ref,
    normalizedPackage?.secondary_back_image_ref,
    ...(Array.isArray(normalizedPackage?.normalized_image_refs) ? normalizedPackage.normalized_image_refs : []),
  ];

  for (const value of refs) {
    const candidateUrl = normalizeTextOrNull(value);
    if (isUsablePublicImageUrl(candidateUrl)) {
      return candidateUrl;
    }
  }

  return null;
}

async function fetchSetRowsByCode(admin: AdminClient, setCode: string) {
  const normalizedSetCode = normalizeLowerOrNull(setCode);
  if (!normalizedSetCode) {
    return [];
  }

  const { data, error } = await admin
    .from("sets")
    .select("id,code,name")
    .eq("game", "pokemon")
    .ilike("code", normalizedSetCode)
    .limit(5);

  if (error) {
    throw new Error(`Promotion write plan set lookup failed: ${error.message}`);
  }

  return (((data ?? []) as CanonSetRow[]) ?? []).filter((row) => normalizeLowerOrNull(row.code) === normalizedSetCode);
}

async function resolveCardPrintMatches(
  admin: AdminClient,
  name: string,
  setCode: string,
  number: string,
  variantKey: string | null,
) {
  const { data, error } = await admin.rpc("search_card_prints_v1", {
    q: name,
    set_code_in: setCode,
    number_in: number,
    limit_in: 10,
    offset_in: 0,
  });

  if (error) {
    throw new Error(`Promotion write plan resolver failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  const normalizedName = normalizeNameKey(name);
  const normalizedSetCode = normalizeLowerOrNull(setCode);
  const normalizedNumber = normalizeNumberPlain(number);
  const normalizedVariantKey = normalizeVariantKey(variantKey);

  const exactMatches = rows
    .map((row) => asRecord(row))
    .filter(Boolean)
    .map((row) => ({
      id: normalizeTextOrNull(row?.card_print_id) ?? normalizeTextOrNull(row?.id) ?? "",
      name: normalizeTextOrNull(row?.name),
      set_code: normalizeTextOrNull(row?.set_code),
      number: normalizeTextOrNull(row?.number),
      number_plain: normalizeTextOrNull(row?.number_plain),
      variant_key: normalizeTextOrNull(row?.variant_key),
    }))
    .filter((row): row is SearchCardPrintRow => Boolean(row.id))
    .filter(
      (row) =>
        normalizeNameKey(row.name) === normalizedName &&
        normalizeLowerOrNull(row.set_code) === normalizedSetCode &&
        normalizeNumberPlain(row.number_plain ?? row.number) === normalizedNumber &&
        sameVariantKey(row.variant_key, normalizedVariantKey),
    );

  return exactMatches;
}

async function fetchCardPrintById(admin: AdminClient, cardPrintId: string | null) {
  const normalizedId = normalizeTextOrNull(cardPrintId);
  if (!normalizedId) {
    return null;
  }

  const { data, error } = await admin
    .from("card_prints")
    .select("id,set_id,set_code,name,number,number_plain,variant_key,tcgplayer_id,image_url,image_alt_url")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new Error(`Promotion write plan card_print lookup failed: ${error.message}`);
  }

  return (data as CanonCardPrintRow | null) ?? null;
}

async function fetchExistingCardPrinting(admin: AdminClient, cardPrintId: string, finishKey: string) {
  const { data, error } = await admin
    .from("card_printings")
    .select("id,card_print_id,finish_key,is_provisional,provenance_source,provenance_ref,created_by")
    .eq("card_print_id", cardPrintId)
    .eq("finish_key", finishKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Promotion write plan card_printing lookup failed: ${error.message}`);
  }

  return (data as CanonCardPrintingRow | null) ?? null;
}

async function fetchExistingExternalMapping(
  admin: AdminClient,
  cardPrintId: string | null,
  externalId: string | null,
) {
  const normalizedCardPrintId = normalizeTextOrNull(cardPrintId);
  const normalizedExternalId = normalizeTextOrNull(externalId);
  if (!normalizedCardPrintId || !normalizedExternalId) {
    return null;
  }

  const { data, error } = await admin
    .from("external_mappings")
    .select("id,card_print_id,source,external_id,meta,synced_at,active")
    .eq("card_print_id", normalizedCardPrintId)
    .eq("source", "tcgplayer")
    .eq("external_id", normalizedExternalId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Promotion write plan external mapping lookup failed: ${error.message}`);
  }

  return (data as ExternalMappingRow | null) ?? null;
}

function deriveVariantKey(
  interpreterPackage: WarehouseInterpreterPackage,
  printedModifier: JsonRecord | null,
) {
  const explicitVariantKey = normalizeTextOrNull(interpreterPackage.canon_context.variant_key);
  if (explicitVariantKey) {
    return explicitVariantKey;
  }

  const stampVariantKey = normalizePrintedModifierVariantKey(printedModifier);
  if (stampVariantKey) {
    return stampVariantKey;
  }

  if (interpreterPackage.decision === "NEW_CANONICAL_REQUIRED") {
    return null;
  }

  return null;
}

function deriveFinishKey(interpreterPackage: WarehouseInterpreterPackage) {
  return normalizeTextOrNull(interpreterPackage.canon_context.finish_key);
}

function buildCanonState(params: {
  cardPrint: Record<string, any> | null;
  cardPrinting: Record<string, any> | null;
  externalMapping: Record<string, any> | null;
  imageFields: Record<string, any> | null;
}): CanonState {
  return {
    card_prints: params.cardPrint,
    card_printings: params.cardPrinting,
    external_mappings: params.externalMapping,
    image_fields: params.imageFields,
  };
}

export async function buildPromotionWritePlanV1({
  candidate,
  metadataExtraction,
  interpreterPackage,
}: {
  candidate: PromotionWritePlanCandidate;
  metadataExtraction: MetadataExtractionInput;
  interpreterPackage: WarehouseInterpreterPackage | null;
}): Promise<PromotionWritePlanV1> {
  if (!interpreterPackage) {
    return buildBlockedPlan("Interpreter package is required before a promotion write plan can be computed.", [
      "Interpreter package",
    ]);
  }

  const printedModifier = getPrintedModifier(metadataExtraction);
  const printedModifierLabel = getPrintedModifierLabel(printedModifier);
  const desiredVariantKey = deriveVariantKey(interpreterPackage, printedModifier);
  const variantIdentityValidation = validatePerfectOrderVariantIdentity(
    interpreterPackage.variant_identity,
    desiredVariantKey,
  );

  if (interpreterPackage.status !== "READY") {
    return buildBlockedPlan(interpreterPackage.founder_explanation, [
      ...interpreterPackage.missing_fields,
    ]);
  }

  if (!variantIdentityValidation.ok) {
    return buildBlockedPlan(
      variantIdentityValidation.reason ??
        "Collision-resolved promotion target requires a deterministic variant_key.",
      variantIdentityValidation.missingRequirements,
    );
  }

  const normalizedMetadata = getNormalizedMetadataPackage(metadataExtraction);
  const identity = getMetadataIdentity(metadataExtraction);
  const setCode = normalizeLowerOrNull(identity?.set_code);
  const setName = normalizeTextOrNull(identity?.set_name);
  const name = normalizeTextOrNull(identity?.name);
  const number = normalizeTextOrNull(identity?.number) ?? normalizeTextOrNull(identity?.printed_number);
  const numberPlain = normalizeNumberPlain(number);

  if (!name || !numberPlain || !setCode) {
    const missingRequirements = [
      !setCode ? "Valid set_code required before promotion" : null,
      !name ? "Card name required before promotion" : null,
      !numberPlain ? "Printed number required before promotion" : null,
    ].filter(Boolean) as string[];

    const reason = !setCode
      ? "UNKNOWN_SET"
      : "Missing required identity fields (set, name, number)";

    return buildBlockedPlan(reason, missingRequirements);
  }

  const admin = createServerAdminClient();
  const exactMatches = await resolveCardPrintMatches(
    admin,
    name,
    setCode,
    numberPlain,
    desiredVariantKey,
  );

  if (exactMatches.length > 1) {
    return buildBlockedPlan("AMBIGUOUS_TARGET", [
      "Single canonical target required before promotion",
    ]);
  }

  const exactMatchId = exactMatches[0]?.id ?? null;
  const exactMatch = await fetchCardPrintById(admin, exactMatchId);
  const matchedCardPrint = await fetchCardPrintById(
    admin,
    normalizeTextOrNull(interpreterPackage.canon_context.matched_card_print_id),
  );
  const existingExternalMapping = await fetchExistingExternalMapping(
    admin,
    matchedCardPrint?.id ?? exactMatch?.id ?? null,
    normalizeTextOrNull(candidate.tcgplayer_id),
  );

  const beforeBase = buildCanonState({
    cardPrint: exactMatch ?? matchedCardPrint,
    cardPrinting: null,
    externalMapping: existingExternalMapping,
    imageFields: (exactMatch ?? matchedCardPrint)
      ? {
          image_url: normalizeTextOrNull((exactMatch ?? matchedCardPrint)?.image_url),
          image_alt_url: normalizeTextOrNull((exactMatch ?? matchedCardPrint)?.image_alt_url),
        }
      : null,
  });

  if (interpreterPackage.decision === "HOLD_FOR_REVIEW" || interpreterPackage.decision === "UNRESOLVED") {
    return buildBlockedPlan(interpreterPackage.founder_explanation, [
      ...interpreterPackage.missing_fields,
    ], buildPreview(beforeBase, beforeBase));
  }

  if (interpreterPackage.decision === "DUPLICATE_EXISTING") {
    if (!exactMatch) {
      return buildBlockedPlan("Interpreter decision is inconsistent with canon match resolution.", [
        "Resolved canonical match required for duplicate decision",
      ]);
    }

    return {
      status: "READY",
      reason: "Canon already covers this submission. No identity rows would be written.",
      actions: {
        card_prints: {
          action: "NONE",
          target_id: exactMatch.id,
          payload: null,
          reason: "Existing canonical card already satisfies the submission.",
        },
        card_printings: buildEmptyAction("No child printing change is required."),
        external_mappings: buildEmptyAction("Promotion Executor V1 does not write external_mappings."),
        image_fields: buildEmptyAction("No canon image change is required."),
      },
      preview: buildPreview(beforeBase, beforeBase),
      missing_requirements: [],
    };
  }

  if (interpreterPackage.decision === "NEW_CANONICAL_REQUIRED") {
    if (exactMatches.length === 1 || exactMatch) {
      return buildBlockedPlan("Interpreter decision is inconsistent with canon match resolution.", [
        "Single no-match resolver result required for CREATE",
      ], buildPreview(beforeBase, beforeBase));
    }

    const setRows = await fetchSetRowsByCode(admin, setCode);
    if (setRows.length !== 1) {
      return buildBlockedPlan(setRows.length === 0 ? "UNKNOWN_SET" : "AMBIGUOUS_TARGET", [
        "Valid set_code required before promotion",
      ]);
    }

    const variantKey = desiredVariantKey;
    if (variantKey === null) {
      return buildBlockedPlan("Missing required variant_key for CREATE_CARD_PRINT.", [
        "variant_key",
      ]);
    }

    const cardPrintPayload = {
      set_id: setRows[0].id,
      set_code: setRows[0].code,
      name,
      number: normalizeTextOrNull(identity?.printed_number) ?? numberPlain,
      number_plain: numberPlain,
      variant_key: variantKey,
      rarity: normalizeTextOrNull(asRecord(normalizedMetadata)?.rarity_hint),
      tcgplayer_id: normalizeTextOrNull(candidate.tcgplayer_id),
      image_url: null,
      image_alt_url: null,
    };

    const afterState = buildCanonState({
      cardPrint: cardPrintPayload,
      cardPrinting: null,
      externalMapping: null,
      imageFields: null,
    });

    return {
      status: "READY",
      reason: printedModifierLabel
        ? `Promotion would create one new canonical parent row for the stamped identity ${printedModifierLabel}.`
        : "Promotion would create one new canonical parent row.",
      actions: {
        card_prints: {
          action: "CREATE",
          target_id: null,
          payload: cardPrintPayload,
          reason: printedModifierLabel
            ? `No exact canonical parent row exists for this set, number, and variant_key ${variantKey}.`
            : "No exact canonical parent row exists for this set, number, and name.",
        },
        card_printings: buildEmptyAction("This action path does not create a child printing."),
        external_mappings: buildEmptyAction("Promotion Executor V1 does not write external_mappings."),
        image_fields: buildEmptyAction("Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT."),
      },
      preview: buildPreview(null, afterState),
      missing_requirements: [],
    };
  }

  if (interpreterPackage.decision === "NEW_CHILD_PRINTING_REQUIRED") {
    if (!exactMatch) {
      return buildBlockedPlan("Parent card_print could not be resolved for child printing.", [
        "Resolved parent card_print",
      ], buildPreview(beforeBase, beforeBase));
    }

    const finishKey = deriveFinishKey(interpreterPackage);
    if (!finishKey) {
      return buildBlockedPlan("Missing required finish_key for CREATE_CARD_PRINTING.", [
        "finish_key",
      ], buildPreview(beforeBase, beforeBase));
    }

    const existingPrinting = await fetchExistingCardPrinting(admin, exactMatch.id, finishKey);

    const afterState = buildCanonState({
      cardPrint: exactMatch,
      cardPrinting:
        existingPrinting ??
        {
          card_print_id: exactMatch.id,
          finish_key: finishKey,
          is_provisional: false,
          provenance_source: "contract",
          provenance_ref: candidate.current_staging_id
            ? `warehouse_staging:${candidate.current_staging_id}`
            : null,
          created_by: "promotion_executor_v1",
        },
      externalMapping: existingExternalMapping,
      imageFields: {
        image_url: normalizeTextOrNull(exactMatch.image_url),
        image_alt_url: normalizeTextOrNull(exactMatch.image_alt_url),
      },
    });

    return {
      status: "READY",
      reason: existingPrinting
        ? "Parent card exists and the requested child printing already exists."
        : "Promotion would reuse the parent card and create one child printing.",
      actions: {
        card_prints: {
          action: "REUSE",
          target_id: exactMatch.id,
          payload: null,
          reason: "Existing canonical parent row would be reused.",
        },
        card_printings: existingPrinting
          ? {
              action: "REUSE",
              target_id: existingPrinting.id,
              payload: null,
              reason: "Existing child printing already satisfies the requested finish.",
            }
          : {
              action: "CREATE",
              target_id: null,
              payload: afterState.card_printings,
              reason: "A new child printing would be inserted under the resolved parent.",
            },
        external_mappings: buildEmptyAction("Promotion Executor V1 does not write external_mappings."),
        image_fields: buildEmptyAction("This action path does not update canon image fields."),
      },
      preview: buildPreview(
        buildCanonState({
          cardPrint: exactMatch,
          cardPrinting: existingPrinting,
          externalMapping: existingExternalMapping,
          imageFields: {
            image_url: normalizeTextOrNull(exactMatch.image_url),
            image_alt_url: normalizeTextOrNull(exactMatch.image_alt_url),
          },
        }),
        afterState,
      ),
      missing_requirements: [],
    };
  }

  if (interpreterPackage.decision === "IMAGE_REPAIR_ONLY") {
    if (!exactMatch) {
      return buildBlockedPlan("Resolved canon image target is required before image repair can be planned.", [
        "Resolved card_print target",
      ], buildPreview(beforeBase, beforeBase));
    }

    const desiredImageUrl = extractStagedPublicImageUrl(candidate);
    const currentPrimaryImage = normalizeTextOrNull(exactMatch.image_url);
    const currentAltImage = normalizeTextOrNull(exactMatch.image_alt_url);
    const hasUsablePrimary = isUsablePublicImageUrl(currentPrimaryImage);
    const hasUsableAlt = isUsablePublicImageUrl(currentAltImage);

    if (!desiredImageUrl) {
      return buildBlockedPlan("Image repair cannot be planned until a public staged image URL exists.", [
        "Public image URL required before promotion",
      ], buildPreview(beforeBase, beforeBase));
    }

    if (desiredImageUrl === currentPrimaryImage || desiredImageUrl === currentAltImage) {
      return {
        status: "READY",
        reason: "Canon already has the staged image URL. No image field update would be written.",
        actions: {
          card_prints: {
            action: "REUSE",
            target_id: exactMatch.id,
            payload: null,
            reason: "Existing canonical target would be reused.",
          },
          card_printings: buildEmptyAction("This action path does not create or update child printings."),
          external_mappings: buildEmptyAction("Promotion Executor V1 does not write external_mappings."),
          image_fields: buildEmptyAction("The staged image already matches a canon image field."),
        },
        preview: buildPreview(beforeBase, beforeBase),
        missing_requirements: [],
      };
    }

    if (hasUsablePrimary && hasUsableAlt) {
      return buildBlockedPlan("Resolved target already has distinct primary and alternate images.", [
        "Lawful image delta required before promotion",
      ], buildPreview(beforeBase, beforeBase));
    }

    const imagePayload = !hasUsablePrimary
      ? { image_url: desiredImageUrl }
      : { image_alt_url: desiredImageUrl };

    const afterCardPrint = {
      ...exactMatch,
      ...imagePayload,
    };
    const afterState = buildCanonState({
      cardPrint: afterCardPrint,
      cardPrinting: null,
      externalMapping: existingExternalMapping,
      imageFields: imagePayload,
    });

    return {
      status: "READY",
      reason: "Promotion would update canon image fields and leave identity rows untouched.",
      actions: {
        card_prints: {
          action: "REUSE",
          target_id: exactMatch.id,
          payload: null,
          reason: "Existing canonical target would be reused.",
        },
        card_printings: buildEmptyAction("This action path does not create or update child printings."),
        external_mappings: buildEmptyAction("Promotion Executor V1 does not write external_mappings."),
        image_fields: {
          action: "UPDATE",
          target_id: exactMatch.id,
          payload: imagePayload,
          reason: !hasUsablePrimary
            ? "Primary canon image would be updated from the staged payload."
            : "Secondary canon image would be updated from the staged payload.",
        },
      },
      preview: buildPreview(beforeBase, afterState),
      missing_requirements: [],
    };
  }

  return buildBlockedPlan("Interpreter decision is inconsistent or unsupported for promotion planning.", [
    "Lawful interpreter decision required before promotion",
  ], buildPreview(beforeBase, beforeBase));
}
