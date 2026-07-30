export const COLLECTOR_VISUAL_QUERY_DEMAND_VERSION =
  "COLLECTOR_VISUAL_QUERY_DEMAND_V1";

const SOURCES = Object.freeze({
  appearances: "https://www.reddit.com/r/PokemonTCG/comments/10gzylo/",
  counts: "https://www.reddit.com/r/PokemonTCGCollectors/comments/1uhlfaz/favorite_cards_with_multiple_pokemon/",
  actions: "https://www.reddit.com/r/PokemonTCG/comments/1d61m6d/all_sleeping_pokemon_cards_i_could_find/",
  jobs: "https://www.reddit.com/r/PokemonTCG/comments/1ipr8lm/collection_help_trying_to_collect_pokemon_with/",
  relationships: "https://www.reddit.com/r/PokemonTCG/comments/1ihsngf/can_you_recommend_me_some_cards_in_which_a/",
  food: "https://www.reddit.com/r/PokemonTCG/comments/1ta1guv/sweet_treat_eating_pokemon_cards/",
  environment: "https://www.reddit.com/r/PokemonTCG/comments/1r2k3bz/trying_to_find_pokemon_cards_with_pokemon_center/",
  night: "https://www.reddit.com/r/PokemonTCG/comments/1tdis9b/i_wanna_see_real_meant_for_fun_personal/",
  rain: "https://www.reddit.com/r/PokemonTCG/comments/l6c3tq",
  representations: "https://www.reddit.com/r/PokemonTCG/comments/1ujzlxz/a_website_for_finding_pokemon_cards_by_art_details/",
  trainers: "https://www.reddit.com/r/pkmntcgcollections/comments/qerdfj",
  binder: "https://www.reddit.com/r/PokemonTCG/comments/1h4ahtk",
  cozy: "https://www.reddit.com/r/pokemoncardcollectors/comments/1uh0bo3/looking_for_cutecozy_card_recs/",
  altered: "https://www.reddit.com/r/pokemoncardcollectors/comments/1s0jrtl/themed_collection_ideas/",
  budget: "https://www.reddit.com/r/pokemoncardcollectors/comments/1tgr5u3/what_to_add_to_the_collection/",
});

function demandRecord(
  queryText,
  bucket,
  sourceUrl,
  requiredSemantics,
  supportState = "existing_graph_or_metadata",
) {
  return {
    query_text: queryText,
    demand_bucket: bucket,
    source_url: sourceUrl,
    observed_collector_wording: queryText,
    normalized_intent: {
      required_semantics: requiredSemantics,
      hard_constraints_required: true,
      semantic_similarity_may_satisfy_hard_constraints: false,
    },
    expected_result_behavior:
      bucket === "expected_strict_zero"
        ? "strict_zero_without_partial_results"
        : bucket === "compositional_boundary"
          ? "all_hard_constraints_must_bind_in_one_artwork"
          : "return_only_evidence_backed_matches",
    current_support_state: supportState,
    gap_class:
      supportState === "existing_graph_or_metadata"
        ? "calibration"
        : "corpus_or_reconciliation",
  };
}

const POSITIVE = [
  ["every card with Pikachu in the artwork", SOURCES.appearances, ["identity_any_role"]],
  ["hidden Raichu cards", SOURCES.appearances, ["identity", "scene_layer"]],
  ["Mimikyu as a plush", SOURCES.representations, ["identity", "character_representation", "plush"]],
  ["Pikachu on a poster", SOURCES.appearances, ["identity", "depicted_subject", "poster"]],
  ["Gengar reflected in a window", SOURCES.appearances, ["identity", "reflection", "window"]],
  ["cards with 3 or more Pokemon", SOURCES.counts, ["pokemon_count_gte"]],
  ["cards with exactly 2 Pokemon", SOURCES.counts, ["pokemon_count_exact"]],
  ["multiple Pikachu on one card", SOURCES.counts, ["identity_count_gte"]],
  ["herds of the same Pokemon", SOURCES.counts, ["repeated_identity", "group"]],
  ["cards where every Pokemon is sleeping", SOURCES.counts, ["all_subjects", "sleeping"]],
  ["sleeping Pokemon", SOURCES.actions, ["pokemon", "sleeping"]],
  ["Pokemon sleeping in the background", SOURCES.actions, ["pokemon", "sleeping", "background"]],
  ["flying Pokemon over a city", SOURCES.actions, ["pokemon", "flying", "city"]],
  ["Pokemon swimming underwater", SOURCES.actions, ["pokemon", "swimming", "underwater"]],
  ["Pokemon doing construction work", SOURCES.jobs, ["pokemon", "working", "construction"]],
  ["Pokemon playing music for other Pokemon", SOURCES.jobs, ["pokemon", "playing_music", "recipient"]],
  ["Pokemon reading a book", SOURCES.jobs, ["pokemon", "reading", "book"]],
  ["Pokemon holding a Poke Ball", SOURCES.relationships, ["pokemon", "holding", "poke_ball"]],
  ["Pokemon looking at one flower", SOURCES.relationships, ["pokemon", "looking_at", "flower", "count_exact"]],
  ["Pokemon eating berries", SOURCES.food, ["pokemon", "eating", "berries"]],
  ["Pokemon eating trash", SOURCES.food, ["pokemon", "eating", "trash"]],
  ["Pokemon with their trainer", SOURCES.trainers, ["pokemon", "human_trainer", "cooccurrence"]],
  ["parent and baby Pokemon together", SOURCES.relationships, ["pokemon_count_gte", "parent_child_visual_relationship"]],
  ["Pokemon in a forest", SOURCES.environment, ["pokemon", "forest"]],
  ["cards with a Pokemon Center in the background", SOURCES.environment, ["pokemon_center", "background"]],
  ["night sky cards with a visible moon", SOURCES.night, ["night_sky", "moon"]],
  ["Pokemon in the rain", SOURCES.rain, ["pokemon", "rain"]],
  ["Pokemon at home", SOURCES.environment, ["pokemon", "home_interior"]],
  ["underwater cards", SOURCES.environment, ["underwater"]],
  ["cards set in a city at night", SOURCES.night, ["city", "night"]],
  ["Pikachu-shaped cookie", SOURCES.representations, ["pikachu", "character_representation", "cookie"]],
  ["Pokemon as food", SOURCES.representations, ["pokemon", "character_representation", "food_shape"]],
  ["Pokemon eating dessert", SOURCES.food, ["pokemon", "eating", "dessert"]],
  ["cards with Pokemon plushies", SOURCES.representations, ["pokemon", "character_representation", "plush"]],
  ["Eevee statue", SOURCES.appearances, ["eevee", "character_representation", "statue"]],
  ["Pokemon logos in the artwork", SOURCES.appearances, ["pokemon", "character_representation", "logo"]],
  ["Pokemon cards with trainers in the artwork", SOURCES.trainers, ["pokemon_card", "human_trainer", "scene_subject"]],
  ["full arts with a trainer interacting with the Pokemon", SOURCES.trainers, ["full_art", "human_trainer", "pokemon", "relationship"]],
  ["Pikachu with Red", SOURCES.trainers, ["pikachu", "red", "cooccurrence"]],
  ["Pokemon and trainer relaxing together", SOURCES.trainers, ["pokemon", "human_trainer", "resting"]],
  ["purple and black night-sky cards", SOURCES.binder, ["purple", "black", "night_sky"]],
  ["watercolor forest cards", SOURCES.binder, ["watercolor", "forest"]],
  ["cards by sowsow with a space theme", SOURCES.binder, ["artist", "space_theme"]],
  ["pink cute full arts", SOURCES.binder, ["pink", "cute_alias", "full_art"]],
  ["cozy Pokemon cards", SOURCES.cozy, ["pokemon", "cozy_alias"]],
  ["dark spooky artwork", SOURCES.cozy, ["dark", "spooky_alias"]],
  ["Pokemon with goofy faces", SOURCES.cozy, ["pokemon", "goofy_alias", "facial_evidence"]],
  ["happy Pokemon", SOURCES.cozy, ["pokemon", "happy", "facial_evidence"]],
  ["stoner-looking Pokemon", SOURCES.altered, ["pokemon", "altered_state_query_alias"]],
  ["cute illustration rares under $10", SOURCES.budget, ["cute_alias", "illustration_rare", "price_lte"]],
];

const BOUNDARY = [
  ["Mimikyu and Pikachu together", SOURCES.counts, ["mimikyu", "pikachu", "independent_cooccurrence"]],
  ["Gengar and either Haunter or Gastly", SOURCES.counts, ["gengar", "haunter_or_gastly", "independent_cooccurrence"]],
  ["cards with exactly 2 Pokemon, not 3", SOURCES.counts, ["pokemon_count_exact", "negative_count"]],
  ["cards where every Pokemon is sleeping", SOURCES.counts, ["all_subjects", "sleeping"]],
  ["Pokemon holding a Poke Ball", SOURCES.relationships, ["subject_bound_relationship"]],
  ["Pokemon playing music for other Pokemon", SOURCES.jobs, ["subject", "action", "recipient"]],
  ["Pikachu-shaped cookie, not Pikachu eating a cookie", SOURCES.representations, ["representation_vs_action"]],
  ["Pokemon cards with trainers, excluding Supporter cards", SOURCES.trainers, ["scene_human", "branch_exclusion"]],
  ["Pokemon as food, not Pokemon surrounded by food", SOURCES.representations, ["representation_vs_environment"]],
  ["purple forest cards I do not own", SOURCES.binder, ["palette", "environment", "ownership_negative"]],
  ["Japanese Pokemon working cards", SOURCES.jobs, ["language", "pokemon", "working"]],
  ["common cards with 3 or more Pokemon", SOURCES.counts, ["rarity", "pokemon_count_gte"]],
  ["night-sky cards by sowsow", SOURCES.binder, ["environment", "artist"]],
  ["sleeping Pokemon without a Trainer", SOURCES.actions, ["pokemon", "sleeping", "negative_human"]],
  ["Pikachu on a poster, not a Pikachu plush", SOURCES.appearances, ["depicted_subject", "poster", "negative_representation"]],
];

const STRICT_ZERO = [
  ["Pikachu plush", SOURCES.representations, ["pikachu", "character_representation", "plush"]],
  ["Pikachu pillow", SOURCES.representations, ["pikachu", "character_representation", "pillow"]],
  ["Pikachu statue", SOURCES.appearances, ["pikachu", "character_representation", "statue"]],
  ["Pikachu poster", SOURCES.appearances, ["pikachu", "depicted_subject", "poster"]],
  ["Pikachu on a screen", SOURCES.appearances, ["pikachu", "depicted_subject", "screen"]],
  ["Mimikyu and Pikachu independently visible", SOURCES.counts, ["mimikyu", "pikachu", "independent_cooccurrence"]],
  ["Gengar and either Haunter or Gastly together", SOURCES.counts, ["gengar", "haunter_or_gastly", "independent_cooccurrence"]],
  ["exactly 20 Pokemon all sleeping", SOURCES.counts, ["pokemon_count_exact", "all_subjects_sleeping"]],
  ["Raichu reflected in a window with no scene subjects", SOURCES.appearances, ["raichu", "reflection", "negative_scene_subject"]],
  ["Pokemon Center in the background during rain", SOURCES.environment, ["pokemon_center", "background", "rain"]],
];

export function buildCollectorVisualQueryDemandV1() {
  const records = [
    ...POSITIVE.map((row) =>
      demandRecord(row[0], "demonstrated_positive", row[1], row[2]),
    ),
    ...BOUNDARY.map((row) =>
      demandRecord(row[0], "compositional_boundary", row[1], row[2]),
    ),
    ...STRICT_ZERO.map((row) =>
      demandRecord(
        row[0],
        "expected_strict_zero",
        row[1],
        row[2],
        "current_expected_zero",
      ),
    ),
  ];
  if (records.length !== 75) {
    throw new Error(`collector demand suite must contain 75 queries, found ${records.length}`);
  }
  return records.map((row, index) => ({
    demand_query_id: `cvqd_${String(index + 1).padStart(3, "0")}`,
    demand_version: COLLECTOR_VISUAL_QUERY_DEMAND_VERSION,
    ...row,
  }));
}
