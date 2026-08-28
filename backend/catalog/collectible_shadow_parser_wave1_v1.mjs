import {
  COLLECTIBLE_SHADOW_ADAPTERS,
  normalizeCollectibleShadowCandidateV1,
} from "./collectible_shadow_adapter_registry_v1.mjs";

export const COLLECTIBLE_SHADOW_PARSER_WAVE1_VERSION =
  "COLLECTIBLE_SHADOW_PARSER_WAVE1_V1";
export const COLLECTIBLE_SHADOW_CANDIDATE_SCHEMA_VERSION =
  "COLLECTIBLE_SHADOW_CANDIDATE_V1";
export const COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_VERSION =
  "COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_V1";

const WAVE1_SOURCE_IDS = Object.freeze([
  "yugioh_ygoprodeck_api_v7",
  "gundam_gcg_api_v1",
]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sourceBinding(sourceId) {
  for (const adapter of COLLECTIBLE_SHADOW_ADAPTERS) {
    const source = (adapter.candidate_sources ?? []).find((row) =>
      row.source_id === sourceId);
    if (source) return { adapter, source };
  }
  throw new Error(`Unknown parser source: ${sourceId}`);
}

export function collectibleShadowParserWave1SourcesV1() {
  return WAVE1_SOURCE_IDS.map((sourceId) => sourceBinding(sourceId));
}

function candidateEnvelope(binding, input) {
  return {
    ...normalizeCollectibleShadowCandidateV1(binding.adapter, {
      source_candidate_id: input.sourceCandidateId,
      source_evidence_sha256: input.sourceEvidenceSha256,
      source_url: binding.source.data_url,
      label: input.label,
      identity_coordinates: input.identityCoordinates,
    }),
    candidate_schema_version: COLLECTIBLE_SHADOW_CANDIDATE_SCHEMA_VERSION,
    parser_version: COLLECTIBLE_SHADOW_PARSER_WAVE1_VERSION,
    candidate_source: {
      source_id: binding.source.source_id,
      operator: binding.source.operator,
      source_authority: binding.source.source_authority,
      data_license: binding.source.data_license,
      attribution_required: binding.source.attribution_required,
      allowed_persistence: binding.source.allowed_persistence,
    },
  };
}

function addCandidate(candidateMap, candidate, failures, duplicateCounter) {
  const existing = candidateMap.get(candidate.shadow_candidate_id);
  if (!existing) {
    candidateMap.set(candidate.shadow_candidate_id, candidate);
    return;
  }
  if (stableJson(existing) === stableJson(candidate)) {
    duplicateCounter.count += 1;
    return;
  }
  failures.push({
    source_candidate_id: candidate.source_candidate_id,
    failure_class: "conflicting_source_identity",
    message: "The same source candidate ID produced different identity coordinates",
  });
}

function finish(candidateMap, failures, metrics) {
  const candidates = [...candidateMap.values()].sort((left, right) =>
    left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
  failures.sort((left, right) =>
    stableJson(left).localeCompare(stableJson(right)));
  return { candidates, failures, metrics };
}

export function parseYugiohYgoprodeckCandidatesV1(
  payload,
  sourceEvidenceSha256,
) {
  const binding = sourceBinding("yugioh_ygoprodeck_api_v7");
  if (!Array.isArray(payload?.data)) {
    throw new Error("YGOPRODeck payload must contain a data array");
  }
  const candidateMap = new Map();
  const failures = [];
  const duplicateCounter = { count: 0 };
  let sourcePrintingEntries = 0;
  let cardsWithoutPrintingEvidence = 0;
  let cardsWithUnresolvedAlternativeArtwork = 0;

  for (const card of payload.data) {
    const sourceCardId = clean(card?.id);
    const cardName = clean(card?.name);
    const printings = Array.isArray(card?.card_sets) ? card.card_sets : [];
    if (printings.length === 0) cardsWithoutPrintingEvidence += 1;
    if (Array.isArray(card?.card_images) && card.card_images.length > 1) {
      cardsWithUnresolvedAlternativeArtwork += 1;
    }
    for (const printing of printings) {
      sourcePrintingEntries += 1;
      const setName = clean(printing?.set_name);
      const setCode = clean(printing?.set_code);
      const rarity = clean(printing?.set_rarity);
      const sourceCandidateId = `${sourceCardId}|${setCode}|${rarity || "unspecified"}`;
      try {
        if (!sourceCardId || !cardName || !setName || !setCode) {
          throw new Error("missing card ID, card name, set name, or set code");
        }
        const candidate = candidateEnvelope(binding, {
          sourceCandidateId,
          sourceEvidenceSha256,
          label: `${cardName} - ${setCode}${rarity ? ` (${rarity})` : ""}`,
          identityCoordinates: {
            game: "yugioh",
            language: "en",
            set_or_product: setName,
            collector_number: setCode,
            card_name: cardName,
            source_card_id: sourceCardId,
            rarity: rarity || null,
          },
        });
        addCandidate(candidateMap, candidate, failures, duplicateCounter);
      } catch (error) {
        failures.push({
          source_candidate_id: sourceCandidateId,
          failure_class: "invalid_source_printing",
          message: String(error?.message ?? error),
        });
      }
    }
  }

  return finish(candidateMap, failures, {
    source_card_count: payload.data.length,
    source_printing_entry_count: sourcePrintingEntries,
    candidate_count: candidateMap.size,
    exact_duplicate_count: duplicateCounter.count,
    failure_count: failures.length,
    cards_without_printing_evidence: cardsWithoutPrintingEvidence,
    cards_with_unresolved_alternative_artwork: cardsWithUnresolvedAlternativeArtwork,
  });
}

export function extractYugiohAlternativeArtworkEvidenceV1(
  payload,
  sourceEvidenceSha256,
  candidates,
) {
  if (!Array.isArray(payload?.data)) {
    throw new Error("YGOPRODeck payload must contain a data array");
  }
  if (!/^[0-9a-f]{64}$/.test(clean(sourceEvidenceSha256))) {
    throw new Error("alternative-artwork evidence requires a source response SHA-256");
  }
  if (!Array.isArray(candidates)) {
    throw new Error("alternative-artwork evidence requires parsed candidates");
  }

  const candidateIdsBySourceCard = new Map();
  for (const candidate of candidates) {
    const sourceCardId = clean(candidate?.identity_coordinates?.source_card_id);
    if (!sourceCardId) continue;
    if (!candidateIdsBySourceCard.has(sourceCardId)) {
      candidateIdsBySourceCard.set(sourceCardId, []);
    }
    candidateIdsBySourceCard.get(sourceCardId).push(candidate.shadow_candidate_id);
  }

  const rows = [];
  for (const card of payload.data) {
    const images = Array.isArray(card?.card_images) ? card.card_images : [];
    if (images.length <= 1) continue;
    const sourceCardId = clean(card?.id);
    const sourceImageIds = unique(images.map((image) => clean(image?.id)));
    if (!sourceCardId) {
      throw new Error("alternative-artwork source card is missing its source ID");
    }
    if (sourceImageIds.length !== images.length) {
      throw new Error(
        `alternative-artwork source card ${sourceCardId} lacks distinct stable image IDs`,
      );
    }
    const printingCandidateIds = unique(candidateIdsBySourceCard.get(sourceCardId) ?? []);
    rows.push({
      variant_evidence_version: COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_VERSION,
      variant_evidence_id:
        `yugioh_ygoprodeck_api_v7:${sourceCardId}:alternative_artwork`,
      source_id: "yugioh_ygoprodeck_api_v7",
      source_card_id: sourceCardId,
      source_evidence_sha256: sourceEvidenceSha256,
      source_image_ids: sourceImageIds,
      source_image_count: sourceImageIds.length,
      source_printing_candidate_ids: printingCandidateIds,
      source_printing_candidate_count: printingCandidateIds.length,
      candidate_scope_status: printingCandidateIds.length > 0
        ? "source_card_printing_candidates_identified"
        : "source_card_has_no_printing_candidates",
      mapping_status: "unresolved_artwork_to_printing",
      canonical_authority: false,
      write_authority: false,
      image_content_accessed: false,
      image_republication_authorized: false,
    });
  }
  return rows.sort((left, right) =>
    left.variant_evidence_id.localeCompare(right.variant_evidence_id));
}

export function parseGundamGcgApiCandidatesV1(
  rows,
  sourceEvidenceSha256,
) {
  const binding = sourceBinding("gundam_gcg_api_v1");
  if (!Array.isArray(rows)) {
    throw new Error("Gundam payload must be an array");
  }
  const candidateMap = new Map();
  const failures = [];
  const duplicateCounter = { count: 0 };

  for (const row of rows) {
    const productId = clean(row?.product_id);
    const cardNumber = clean(row?.card_number);
    const cardName = clean(row?.name);
    const setCode = clean(row?.set_code);
    const setName = clean(row?.set_name);
    const rarity = clean(row?.rarity);
    try {
      if (!productId || !cardNumber || !cardName || !setCode || !setName) {
        throw new Error("missing product ID, card number, card name, set code, or set name");
      }
      const candidate = candidateEnvelope(binding, {
        sourceCandidateId: productId,
        sourceEvidenceSha256,
        label: `${cardName} - ${cardNumber}${rarity ? ` (${rarity})` : ""}`,
        identityCoordinates: {
          game: "gundam",
          language: "en",
          set_or_product: setName,
          collector_number: cardNumber,
          card_name: cardName,
          source_product_id: productId,
          set_code: setCode,
          rarity: rarity || null,
        },
      });
      addCandidate(candidateMap, candidate, failures, duplicateCounter);
    } catch (error) {
      failures.push({
        source_candidate_id: productId,
        failure_class: "invalid_source_printing",
        message: String(error?.message ?? error),
      });
    }
  }

  return finish(candidateMap, failures, {
    source_card_count: rows.length,
    candidate_count: candidateMap.size,
    exact_duplicate_count: duplicateCounter.count,
    failure_count: failures.length,
  });
}
