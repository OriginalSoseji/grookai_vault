export const MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BATCH_VERSION = "MEE_09I_POKEMONTCG_IO_SECOND_SOURCE_BATCH_V1";
export const POKEMONTCG_SECOND_SOURCE = "pokemontcg_io_reference";

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function inferredPokemonApiId(item) {
  const setCode = compact(item.set_code).toLowerCase();
  const number = compact(item.provider_number ?? item.number_plain);
  if (!setCode || !number) return null;
  return `${setCode}-${number}`;
}

export function buildPokemonTcgSecondSourceBatchV1({
  workItems = [],
  idMappings = new Map(),
  generatedAt = new Date().toISOString(),
  limit = workItems.length,
} = {}) {
  if (!Array.isArray(workItems)) {
    throw new Error("[pokemontcg-second-source-batch] workItems must be an array");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("[pokemontcg-second-source-batch] limit must be a positive integer");
  }

  const selected = workItems
    .filter((item) => item.proposed_sources?.includes(POKEMONTCG_SECOND_SOURCE))
    .slice(0, limit);

  return {
    generated_at: generatedAt,
    contract: "MARKET_EVIDENCE_ENGINE_V1",
    phase: MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BATCH_VERSION,
    mode: "first_wave_second_source_batch",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    summary: {
      input_work_items: workItems.length,
      selected_targets: selected.length,
      source: POKEMONTCG_SECOND_SOURCE,
    },
    items: selected.map((item) => {
      const mapping = idMappings.get(item.card_print_id) ?? {};
      const inferredId = inferredPokemonApiId(item);
      const pokemonapiId = mapping.pokemonapi_id ?? inferredId;
      return {
        card_print_id: item.card_print_id,
        gv_id: item.gv_id,
        name: compact(item.name),
        set_code: compact(item.set_code),
        number_plain: compact(item.number_plain),
        provider_number: compact(item.provider_number ?? item.number_plain),
        rarity: compact(item.rarity),
        source: POKEMONTCG_SECOND_SOURCE,
        source_type: "reference_price",
        query_status: "planned_for_free_api_reference_lookup",
        query_text: compact([item.name, item.set_code, item.number_plain].filter(Boolean).join(" ")),
        pokemonapi_id: pokemonapiId,
        match_basis: mapping.match_basis ?? (inferredId ? "derived_set_code_number" : null),
        priority_score: item.priority_score ?? null,
        worklist_reasons: item.reasons ?? [],
        existing_sources: item.existing_sources ?? [],
        can_publish_price_directly: false,
        needs_review: true,
      };
    }),
  };
}
