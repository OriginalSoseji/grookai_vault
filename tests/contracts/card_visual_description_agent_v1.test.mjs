import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
  aggregateUsageRows,
  buildDescriptionVersionKeyV1,
  buildEmbeddingInputV1,
  buildCostProjection,
  classifyDescriptionReviewStatusV1,
  detectVisualDescriptionReviewFlagDetailsV1,
  detectVisualDescriptionReviewFlagsV1,
  estimateUsageCostUsd,
  evaluateStopBeforeNextCall,
  parseCardVisualDescriptionArgsV1,
  sanitizeSemanticTagsForVisibleArtworkV1,
  validateVisualDescriptionPayloadV1,
} from "../../backend/card_descriptions/card_visual_description_agent_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("card visual description schema is private, versioned, and current-row safe", () => {
  const sql = source("supabase/migrations/20260715120000_card_visual_description_agent_v1.sql");

  assert.match(sql, /create table if not exists public\.card_print_visual_descriptions/i);
  assert.match(sql, /create table if not exists public\.card_visual_description_runs/i);
  assert.match(sql, /card_print_id uuid not null references public\.card_prints\(id\)/i);
  assert.match(sql, /prompt_version text not null/i);
  assert.match(sql, /output_schema_version text not null/i);
  assert.match(sql, /agent_version text not null/i);
  assert.match(sql, /model_version text not null/i);
  assert.match(sql, /response_model_version text null/i);
  assert.match(sql, /response_model_versions text\[\] not null default '\{\}'::text\[\]/i);
  assert.match(sql, /input_tokens integer not null default 0/i);
  assert.match(sql, /output_tokens integer not null default 0/i);
  assert.match(sql, /total_tokens integer not null default 0/i);
  assert.match(sql, /cached_input_tokens integer not null default 0/i);
  assert.match(sql, /reasoning_output_tokens integer not null default 0/i);
  assert.match(sql, /estimated_cost_usd numeric not null default 0/i);
  assert.match(sql, /pricing_snapshot jsonb not null default '\{\}'::jsonb/i);
  assert.match(sql, /image_detail text not null default 'high'/i);
  assert.match(sql, /request_count integer not null default 0/i);
  assert.match(sql, /retry_count integer not null default 0/i);
  assert.match(sql, /review_status = any \(array\['pending'::text, 'approved'::text, 'needs_review'::text, 'rejected'::text\]\)/i);
  assert.match(sql, /on public\.card_print_visual_descriptions \(card_print_id\)[\s\S]*where is_current = true/i);
  assert.match(sql, /card_print_visual_descriptions_version_unique_idx[\s\S]*card_print_id[\s\S]*image_sha256[\s\S]*prompt_version[\s\S]*output_schema_version[\s\S]*agent_version[\s\S]*model_version/i);
  assert.match(sql, /alter table public\.card_visual_description_runs enable row level security/i);
  assert.match(sql, /alter table public\.card_print_visual_descriptions enable row level security/i);
  assert.match(sql, /revoke all on table public\.card_print_visual_descriptions from public, anon, authenticated/i);
  assert.match(sql, /grant all on table public\.card_print_visual_descriptions to service_role/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete|all)[\s\S]*card_print_visual_descriptions[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /alter table public\.card_prints/i);
});

test("card visual description args default to dry-run and block fixture apply", () => {
  assert.equal(parseCardVisualDescriptionArgsV1([]).mode, "dry_run");
  assert.equal(parseCardVisualDescriptionArgsV1(["--plan"]).mode, "plan");
  assert.equal(parseCardVisualDescriptionArgsV1(["--dry-run"]).mode, "dry_run");

  assert.throws(
    () => parseCardVisualDescriptionArgsV1(["--apply"]),
    /refusing to apply fixture descriptions/,
  );
  assert.throws(
    () => parseCardVisualDescriptionArgsV1(["--provider=openai"]),
    /--model or CARD_VISUAL_DESCRIPTION_MODEL_VERSION is required/,
  );

  const apply = parseCardVisualDescriptionArgsV1([
    "--apply",
    "--provider=openai",
    "--model=test-vision-model",
    "--image-detail=low",
    "--max-cards=10",
    "--gv-id=GV-PK-JPN-M5-113",
    "--card-print-id=2412563a-c73d-5970-a389-f4c1dc35d8c6",
    "--card-print-ids=22222222-2222-2222-2222-222222222222,11111111-1111-1111-1111-111111111111",
    "--max-run-cost-usd=0.25",
    "--openai-input-cost-per-million=0.15",
    "--openai-output-cost-per-million=0.60",
    "--image-cost-rule-version=gpt-4o-mini-2026-07-15",
  ]);
  assert.equal(apply.mode, "apply");
  assert.equal(apply.provider, "openai");
  assert.equal(apply.modelVersion, "test-vision-model");
  assert.equal(apply.imageDetail, "low");
  assert.equal(apply.maxCards, 10);
  assert.equal(apply.gvId, "GV-PK-JPN-M5-113");
  assert.equal(apply.cardPrintId, "2412563a-c73d-5970-a389-f4c1dc35d8c6");
  assert.deepEqual(apply.cardPrintIds, [
    "22222222-2222-2222-2222-222222222222",
    "11111111-1111-1111-1111-111111111111",
  ]);
  assert.equal(apply.maxRunCostUsd, 0.25);
  assert.equal(apply.openaiInputCostPerMillion, 0.15);
  assert.equal(apply.openaiOutputCostPerMillion, 0.60);
  assert.equal(apply.openaiImageCostRuleVersion, "gpt-4o-mini-2026-07-15");

  assert.throws(
    () => parseCardVisualDescriptionArgsV1(["--image-detail=ultra"]),
    /--image-detail must be low, high, original, or auto/,
  );
});

test("card visual description semantic tags stay visual and exclude metadata", () => {
  const result = sanitizeSemanticTagsForVisibleArtworkV1(
    ["Abyss Eye", "fantasy", "Mega Chandelure", "Pokemon"],
    {
      name: "Mega Chandelure ex",
      set_name: "Abyss Eye",
      set_code: "jpn-m5",
      number: "113",
    },
  );

  assert.deepEqual(result.semantic_tags, ["fantasy", "Mega Chandelure"]);
  assert.deepEqual(result.quality_flags, [
    "semantic_tags_metadata_or_generic_removed",
    "semantic_tags_too_sparse_after_sanitization",
  ]);
  assert.deepEqual(result.quality_flag_details, [
    {
      flag: "semantic_tags_metadata_or_generic_removed",
      matched_text: "Abyss Eye",
      field: "semantic_tags",
    },
    {
      flag: "semantic_tags_metadata_or_generic_removed",
      matched_text: "Pokemon",
      field: "semantic_tags",
    },
  ]);

  const stronger = sanitizeSemanticTagsForVisibleArtworkV1(
    [
      "dark atmosphere",
      "diagonal composition",
      "ghostly chandelier",
      "iridescent background",
      "Mega Chandelure",
      "mystical",
      "ornate",
      "purple flames",
      "spectral wisps",
    ],
    { name: "Mega Chandelure ex", set_name: "Abyss Eye" },
  );

  assert.equal(stronger.quality_flags.length, 0);
  assert.match(stronger.semantic_tags.join(","), /purple flames/);
  assert.match(stronger.semantic_tags.join(","), /Mega Chandelure/);
});

test("card visual description flags Chandelure anatomy described as a held object", () => {
  const flags = detectVisualDescriptionReviewFlagsV1(
    {
      artwork_description:
        "The illustration features a ghostly figure resembling a chandelier. It has a dark body with purple and white accents, and the arms extend upwards, holding a round, glowing orb.",
      visual_attributes: {
        distinguishing_details: ["glowing orb", "swirling energy effects"],
        uncertainty_notes: ["abstract background elements may imply motion or energy"],
      },
      semantic_tags: ["Chandelier-like figure", "glowing orb", "purple flames"],
    },
    { name: "Mega Chandelure ex" },
  );

  assert.deepEqual(flags, ["potential_body_part_as_separate_held_object"]);

  const saferFlags = detectVisualDescriptionReviewFlagsV1(
    {
      artwork_description:
        "Mega Chandelure sweeps diagonally through a dark abstract scene, with its round glass-like body, curled arms, branch-like limbs, and pale violet flames forming one integrated chandelier-shaped figure.",
      visual_attributes: {
        distinguishing_details: ["round glass-like body", "curled arms", "pale violet flames"],
        uncertainty_notes: ["background is abstract and not clearly celestial or architectural"],
      },
      semantic_tags: ["Mega Chandelure", "purple flames", "diagonal composition"],
    },
    { name: "Mega Chandelure ex" },
  );

  assert.equal(saferFlags.length, 0);
});

test("card visual description flags overconfident celestial settings without uncertainty", () => {
  const flags = detectVisualDescriptionReviewFlagsV1(
    {
      artwork_description:
        "The subject floats through a cosmic galaxy full of stars and celestial energy.",
      visual_attributes: {
        distinguishing_details: ["stars", "cosmic background"],
        uncertainty_notes: [],
      },
      semantic_tags: ["cosmic", "stars", "celestial"],
    },
    { name: "Example Pokemon" },
  );

  assert.deepEqual(flags, [
    "potential_overconfident_ambiguous_setting",
    "potential_speculative_setting_language",
  ]);
});

test("card visual language review flags preserve matched text and force review", () => {
  const payload = {
    artwork_description:
      "Environment: A creature appears in a magical portal. The scene evokes victory and represents hidden lore. The face is not clearly visible, but the subject looks confident and mysterious.",
    card_surface_and_printing_cues:
      "The foil texture is visible with a glossy finish. This appears to be a standard printing treatment.",
    visual_attributes: {
      subjects: {
        primary: ["creature"],
        secondary: [],
      },
      environment: {
        setting: ["portal"],
      },
      mood: ["mysterious"],
      distinguishing_details: ["standard trading card view"],
      uncertainty_notes: [],
    },
    semantic_tags: ["fantasy", "green garden", "mood"],
  };

  const details = detectVisualDescriptionReviewFlagDetailsV1(payload, {
    name: "Fairy Garden",
    supertype: "Trainer",
    card_category: "Stadium",
  });
  const flags = detectVisualDescriptionReviewFlagsV1(payload, {
    name: "Fairy Garden",
    supertype: "Trainer",
    card_category: "Stadium",
  });

  assert.ok(details.some((detail) =>
    detail.flag === "potential_speculative_setting_language"
    && detail.matched_text === "magical"
    && detail.field === "artwork_description"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_claim"
    && detail.matched_text === "evokes"
    && detail.field === "artwork_description"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "foil texture is visible"
    && detail.field === "card_surface_and_printing_cues"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_creature_language_on_non_pokemon_branch"
    && detail.matched_text === "creature"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_generic_filler"
    && detail.matched_text === "standard trading card"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_semantic_tag_nonvisual_concept"
    && detail.matched_text === "fantasy"
    && detail.field === "semantic_tags"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_emotion_or_personality_claim"
    && detail.matched_text === "confident"));
  assert.equal(
    classifyDescriptionReviewStatusV1({
      quality_flags: flags,
      identity_input_confidence: 0.95,
      description_confidence: 0.95,
      attribute_confidence: 0.95,
      image_quality_score: 0.95,
    }),
    "needs_review",
  );
});

test("card visual language review flags interpretive mood false negatives", () => {
  const payload = {
    artwork_description:
      "Symbolic Artwork: The central symbol is a rounded eye motif with radiating lines. Artwork: The mood conveys a sense of mystique and power.",
    card_surface_and_printing_cues: "Printing treatment uncertain.",
    visual_attributes: {
      subjects: {
        primary: [],
        secondary: [],
      },
      environment: {
        setting: [],
      },
      mood: ["mystique"],
      distinguishing_details: ["rounded eye motif", "radiating lines"],
      uncertainty_notes: [],
    },
    semantic_tags: ["psychic symbol", "purple gradients", "radiating lines"],
  };

  const details = detectVisualDescriptionReviewFlagDetailsV1(payload, {
    name: "Psychic Energy",
    supertype: "Energy",
    card_category: "Basic",
  });

  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "mystique"
    && detail.field === "artwork_description"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "mystique"
    && detail.field === "visual_attributes.mood"));
});


test("card visual description usage telemetry computes cost, projections, and stop ceilings", () => {
  const pricing = {
    input_per_million: 0.15,
    output_per_million: 0.60,
    cached_input_per_million: 0.075,
  };
  const rowA = {
    request_count: 1,
    retry_count: 0,
    input_tokens: 1000,
    output_tokens: 500,
    total_tokens: 1500,
    cached_input_tokens: 200,
    reasoning_output_tokens: 25,
    estimated_cost_usd: estimateUsageCostUsd({
      input_tokens: 1000,
      output_tokens: 500,
      total_tokens: 1500,
      cached_input_tokens: 200,
      reasoning_output_tokens: 25,
    }, pricing),
  };
  const rowB = { ...rowA, estimated_cost_usd: 0.000435 };
  const aggregate = aggregateUsageRows([rowA, rowB]);

  assert.equal(rowA.estimated_cost_usd, 0.000435);
  assert.equal(aggregate.request_count, 2);
  assert.equal(aggregate.input_tokens, 2000);
  assert.equal(aggregate.estimated_cost_usd, 0.00087);

  const projection = buildCostProjection({
    aggregate,
    validatedCount: 2,
    totalEligibleCatalogCount: 1234,
  });
  assert.equal(projection.estimated_cost_per_validated_card_usd, 0.000435);
  assert.equal(projection.projected_500_cards_usd, 0.2175);
  assert.equal(projection.projected_1000_cards_usd, 0.435);
  assert.equal(projection.projected_full_eligible_catalog_usd, 0.53679);

  assert.equal(
    evaluateStopBeforeNextCall(
      { maxCards: 2, maxRunCostUsd: null },
      [rowA, rowB],
      [],
    ).stop_reason,
    "max_cards_reached",
  );

  assert.equal(
    evaluateStopBeforeNextCall(
      { maxCards: null, maxRunCostUsd: 0.001 },
      [rowA, rowB],
      [],
    ).stop_reason,
    "projected_next_call_cost_exceeds_max_run_cost",
  );
});

test("card visual description payload validation separates shape from review approval", () => {
  const validPayload = {
    artwork_description:
      "Pikachu is shown as the central subject in a grounded visual description with visible scene details, mood, color language, and composition cues written for a blind collector.",
    card_surface_and_printing_cues: "No specific foil, border, or surface treatment is asserted.",
    visual_attributes: {
      subjects: { primary: ["Pikachu"], secondary: [] },
      environment: { setting: ["outdoor"], time_of_day: "day" },
      palette: { dominant: ["yellow", "green"], temperature: "warm" },
      mood: ["cheerful"],
      composition: { framing: "medium" },
    },
    semantic_tags: ["pikachu", "yellow", "cheerful"],
    description_confidence: 0.91,
    attribute_confidence: 0.85,
    quality_flags: [],
  };

  const validation = validateVisualDescriptionPayloadV1(validPayload);
  assert.equal(validation.ok, true);
  assert.equal(validation.normalized.semantic_tags.join(","), "cheerful,pikachu,yellow");

  const blankAttributeValidation = validateVisualDescriptionPayloadV1({
    ...validPayload,
    visual_attributes: {
      ...validPayload.visual_attributes,
      environment: { setting: ["outdoor"], time_of_day: "", weather: "" },
      composition: { framing: "", subject_position: "" },
    },
  });
  assert.equal(blankAttributeValidation.normalized.visual_attributes.environment.time_of_day, "unknown");
  assert.equal(blankAttributeValidation.normalized.visual_attributes.environment.weather, "unknown");
  assert.equal(blankAttributeValidation.normalized.visual_attributes.composition.framing, "unknown");

  const nullishQualityValidation = validateVisualDescriptionPayloadV1({
    ...validPayload,
    card_surface_and_printing_cues: "The card has a flat, printed surface.",
    quality_flags: ["None", "clear", "high detail"],
  });
  assert.equal(nullishQualityValidation.ok, true);
  assert.equal(nullishQualityValidation.normalized.quality_flags.length, 0);
  assert.match(nullishQualityValidation.normalized.card_surface_and_printing_cues, /No reliable additional card-surface/);

  assert.equal(
    classifyDescriptionReviewStatusV1({
      quality_flags: [],
      identity_input_confidence: 0.95,
      description_confidence: 0.91,
      attribute_confidence: 0.85,
      image_quality_score: 0.92,
    }),
    "pending",
  );

  assert.equal(
    classifyDescriptionReviewStatusV1({
      quality_flags: ["fixture_generated"],
      identity_input_confidence: 0.95,
      description_confidence: 0.91,
      attribute_confidence: 0.85,
      image_quality_score: 0.92,
    }),
    "needs_review",
  );
});

test("card visual description version and embedding input are deterministic", () => {
  const base = {
    card_print_id: "11111111-1111-1111-1111-111111111111",
    image_sha256: "a".repeat(64),
    prompt_version: "prompt-v1",
    output_schema_version: "schema-v1",
    agent_version: CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
    model_version: "model-v1",
  };

  assert.equal(buildDescriptionVersionKeyV1(base), buildDescriptionVersionKeyV1({ ...base }));
  assert.notEqual(
    buildDescriptionVersionKeyV1(base),
    buildDescriptionVersionKeyV1({ ...base, model_version: "model-v2" }),
  );

  const inputA = buildEmbeddingInputV1({
    artwork_description: "Artwork text",
    card_surface_and_printing_cues: "Printing text",
    visual_attributes: {
      palette: { temperature: "warm", dominant: ["yellow"] },
      subjects: { secondary: [], primary: ["Pikachu"] },
      environment: { weather: "rain", setting: ["street"] },
      mood: ["cozy", "moody"],
    },
    semantic_tags: ["z-tag", "a-tag"],
  });
  const inputB = buildEmbeddingInputV1({
    artwork_description: "Artwork text",
    card_surface_and_printing_cues: "Printing text",
    visual_attributes: {
      environment: { setting: ["street"], weather: "rain" },
      subjects: { primary: ["Pikachu"], secondary: [] },
      palette: { dominant: ["yellow"], temperature: "warm" },
      mood: ["moody", "cozy"],
    },
    semantic_tags: ["a-tag", "z-tag"],
  });

  assert.equal(inputA, inputB);
  assert.match(inputA, /Tags:\na-tag, z-tag/);
});

test("card visual description agent entrypoints stay guarded and non-identity-authoritative", () => {
  const agent = source("backend/card_descriptions/card_visual_description_agent_v1.mjs");
  const script = source("scripts/audits/card_visual_description_agent_v1.mjs");
  const pkg = source("package.json");
  const visualLanguage = source("docs/contracts/CARD_VISUAL_LANGUAGE_V1.md");
  const contractIndex = source("docs/CONTRACT_INDEX.md");

  assert.match(agent, /refusing to apply fixture descriptions without --allow-fixture-apply/);
  assert.match(agent, /card_print_visual_descriptions/);
  assert.match(agent, /card_visual_description_runs/);
  assert.match(agent, /type: "input_image"/);
  assert.match(agent, /CARD_VISUAL_DESCRIPTION_PROMPT_V6/);
  assert.match(agent, /CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1/);
  assert.match(agent, /CARD_VISUAL_LANGUAGE_V1/);
  assert.match(agent, /Visual Language Contract/);
  assert.match(agent, /museum curator, accessibility specialist, and collector/);
  assert.match(agent, /Observation hierarchy: first subject, then structure, pose, composition, environment, lighting, palette, and finally mood/);
  assert.match(agent, /Use the same vocabulary for the same visible forms across cards/);
  assert.match(agent, /Avoid broad praise or marketing language/);
  assert.match(agent, /Do not use the words magical, enchanted, enchanting, mystical, ethereal, dreamlike, stars, starry, dusk, or night/);
  assert.match(agent, /avoid these exact words in artwork_description, visual_attributes, and semantic_tags/);
  assert.match(agent, /Do not say foil texture visible, glossy finish, gloss present, or standard print/);
  assert.match(agent, /Do not encode nested JSON/);
  assert.match(agent, /Card-Type Aware Visual Description System/);
  assert.match(agent, /Use canonical card-type metadata before image interpretation/);
  assert.match(agent, /resolved_prompt_branch/);
  assert.match(agent, /Branch 1 - Pokemon/);
  assert.match(agent, /Branch 2 - Trainer/);
  assert.match(agent, /Do NOT describe the trainer as a humanoid creature/);
  assert.match(agent, /Branch 3 - Stadium/);
  assert.match(agent, /No character section/);
  assert.match(agent, /Branch 4 - Energy/);
  assert.match(agent, /Do NOT invent creatures/);
  assert.match(agent, /Branch 5 - Item \/ Tool \/ Supporter/);
  assert.match(agent, /Object\/Scene/);
  assert.match(agent, /explicitly describe where the face, eyes, and defining species features are located/);
  assert.match(agent, /rather than implying they do not exist/);
  assert.match(agent, /Do not invent tails, wings, hands, facial expressions/);
  assert.match(agent, /Pokemon tag examples/);
  assert.match(agent, /Trainer tag examples/);
  assert.match(agent, /trainer portrait/);
  assert.match(agent, /Stadium tag examples/);
  assert.match(agent, /Energy tag examples/);
  assert.match(agent, /psychic symbol/);
  assert.match(agent, /Do not describe a body part/);
  assert.match(agent, /For Chandelure-family subjects/);
  assert.match(agent, /Do not assign a specific setting/);
  assert.match(agent, /Prefer objective visual observations over artistic interpretation/);
  assert.match(agent, /Do not say scattered light points suggest stars, magic, energy, or an aura/);
  assert.match(agent, /do not write generic statements such as standard trading card borders/);
  assert.match(agent, /semantic_tags must describe visible artwork only/);
  assert.match(agent, /ghostly chandelier/);
  assert.match(agent, /target_gv_id/);
  assert.match(agent, /target_card_print_ids/);
  assert.match(agent, /--card-print-ids=/);
  assert.match(agent, /OPENAI_INPUT_COST_PER_MILLION/);
  assert.match(agent, /OPENAI_OUTPUT_COST_PER_MILLION/);
  assert.match(agent, /OPENAI_IMAGE_COST_RULE_VERSION/);
  assert.match(agent, /input_tokens/);
  assert.match(agent, /projected_500_cards_usd/);
  assert.match(agent, /projected_1000_cards_usd/);
  assert.match(agent, /projected_full_eligible_catalog_usd/);
  assert.match(agent, /projected_next_call_cost_exceeds_max_run_cost/);
  assert.match(agent, /card_print_traits/);
  assert.match(agent, /exact_trait/);
  assert.match(agent, /source_trait/);
  assert.match(agent, /same_name_trait/);
  assert.match(agent, /card_type_metadata_source/);
  assert.match(agent, /prompt_branch/);
  assert.doesNotMatch(agent, /additionalProperties: true/);
  assert.match(agent, /function formatFetchError/);
  assert.match(agent, /function tcgdexHighImageUrl/);
  assert.match(agent, /assets\\.tcgdex\\.net/);
  assert.match(agent, /high\.webp/);
  assert.match(agent, /CANON_IMAGE_STORAGE_BUCKET = "user-card-images"/);
  assert.match(agent, /WAREHOUSE_CANON_IMAGE_PREFIXES/);
  assert.match(agent, /warehouse-derived\/self-hosted-images-v1\//);
  assert.match(agent, /warehouse-derived\/image-truth-v1\//);
  assert.match(agent, /function normalizeWarehouseCanonImagePath/);
  assert.match(agent, /function warehouseCanonImagePathFromPublicStorageUrl/);
  assert.match(agent, /\.storage\s*\n\s*\.from\(candidate\.storage_bucket\)\s*\n\s*\.download\(candidate\.storage_path\)/);
  assert.match(agent, /image_candidates_exhausted/);
  assert.match(agent, /image_storage_not_configured/);
  assert.match(agent, /image_storage_download_failed/);
  assert.match(agent, /reason: "image_fetch_failed"/);
  assert.match(agent, /error: image\.error \?\? null/);
  assert.match(agent, /card_prints_mutation: false/);
  assert.match(script, /card_visual_description_agent_v1/);
  assert.match(pkg, /"card-desc:plan"/);
  assert.match(pkg, /"card-desc:dry-run"/);
  assert.match(pkg, /"card-desc:apply"/);
  assert.match(visualLanguage, /# CARD_VISUAL_LANGUAGE_V1/);
  assert.match(visualLanguage, /Grookai should describe artwork like:/);
  assert.match(visualLanguage, /Observation Hierarchy/);
  assert.match(visualLanguage, /Semantic Tag Standards/);
  assert.match(visualLanguage, /Future Expansion Placeholders/);
  assert.match(contractIndex, /CARD_VISUAL_LANGUAGE_V1/);
});
