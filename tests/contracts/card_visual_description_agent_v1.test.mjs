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
  evaluateVisualDescriptionPolicyV1,
  estimateUsageCostUsd,
  evaluateStopBeforeNextCall,
  parseCardVisualDescriptionArgsV1,
  resolveCardPromptMetadata,
  sanitizeSemanticTagsForVisibleArtworkV1,
  selectBranchStratifiedCardsV1,
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

  const branchSample = parseCardVisualDescriptionArgsV1([
    "--dry-run",
    "--provider=openai",
    "--model=test-vision-model",
    "--limit=25",
    "--branch-stratified-sample",
    "--branch-targets=pokemon:5,trainer:5,stadium:5,energy:5,item_tool_supporter:5",
    "--branch-candidate-limit=60000",
  ]);
  assert.equal(branchSample.branchStratifiedSample, true);
  assert.equal(branchSample.branchCandidateLimit, 60000);
  assert.deepEqual(branchSample.branchTargets, {
    pokemon: 5,
    trainer: 5,
    stadium: 5,
    energy: 5,
    item_tool_supporter: 5,
  });
  assert.throws(
    () => parseCardVisualDescriptionArgsV1([
      "--provider=openai",
      "--model=test-vision-model",
      "--branch-stratified-sample",
      "--gv-id=GV-PK-JPN-M5-113",
    ]),
    /branch-stratified sampling cannot be combined with explicit card targets/,
  );

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
        subjects: { primary: ["Mega Chandelure"], secondary: [] },
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
        subjects: { primary: ["Mega Chandelure"], secondary: [] },
        distinguishing_details: ["round glass-like body", "curled arms", "pale violet flames"],
        uncertainty_notes: ["background is abstract and not clearly celestial or architectural"],
      },
      semantic_tags: ["ghostly chandelier", "purple flames", "diagonal composition"],
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
        subjects: { primary: ["Example Pokemon"], secondary: [] },
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

test("card visual language enforcement catches narrow post-run false negatives", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The diagonal pose may evoke motion, with the two figures symbolizing a staged rivalry. The scene is evocative and carries a tranquil sense of enchantment.",
      card_surface_and_printing_cues:
        "A visible layer of gloss, clear gloss finish, clean, reflective finish, and higher quality print are present. The printing quality appears unusually sharp.",
      visual_attributes: {
        subjects: { primary: ["two figures"], secondary: [] },
        environment: { setting: ["plain background"] },
        mood: ["intrigue"],
        distinguishing_details: ["diagonal pose"],
        uncertainty_notes: [],
      },
      semantic_tags: ["diagonal pose", "two figures", "plain background"],
    },
    { name: "Example Pokemon" },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_claim"
    && detail.matched_text === "evoke"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_claim"
    && detail.matched_text === "symbolizing"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_claim"
    && detail.matched_text === "evocative"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "tranquil"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "enchantment"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "intrigue"
    && detail.field === "visual_attributes.mood"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "layer of gloss"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "clear gloss finish"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "clean, reflective finish"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "higher quality print"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "printing quality appears"));
});

test("card visual language enforcement flags unsupported emotion after unclear face language", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "Facial features are not explicitly visible due to the angle, but the expression conveys determination.",
      card_surface_and_printing_cues: "No reliable card-surface or printing treatment can be determined.",
      visual_attributes: {
        subjects: { primary: ["trainer"], secondary: [] },
        environment: { setting: ["plain background"] },
        mood: [],
        distinguishing_details: ["angled face"],
        uncertainty_notes: [],
      },
      semantic_tags: ["trainer portrait", "angled face", "plain background"],
    },
    { name: "Example Trainer", supertype: "Trainer", card_category: "Supporter" },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_emotion_or_personality_claim"
    && detail.matched_text === "determination"));
});

test("card visual language enforcement separates franchise language from creature language on non-Pokemon branches", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The gym environment appears in the Pokemon universe, with benches and a central battle floor.",
      card_surface_and_printing_cues: "No reliable card-surface or printing treatment can be determined.",
      visual_attributes: {
        subjects: { primary: [], secondary: [] },
        environment: { setting: ["gym interior"] },
        mood: [],
        distinguishing_details: ["battle floor", "benches"],
        uncertainty_notes: [],
      },
      semantic_tags: ["gym interior", "battle floor", "benches"],
    },
    { name: "Cinnabar City Gym", supertype: "Trainer", card_category: "Stadium" },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_generic_franchise_language_on_non_pokemon_branch"
    && detail.matched_text === "Pokemon universe"));
  assert.equal(details.some((detail) =>
    detail.flag === "potential_creature_language_on_non_pokemon_branch"
    && detail.matched_text === "Pokemon"), false);
});

test("card visual language enforcement flags canonical name visual conflicts", () => {
  const mewDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The artwork shows two small mushroom-like creatures standing together against a simple background.",
      card_surface_and_printing_cues: "No reliable card-surface or printing treatment can be determined.",
      visual_attributes: {
        subjects: { primary: ["mushroom-like creatures"], secondary: [] },
        environment: { setting: ["plain background"] },
        mood: [],
        distinguishing_details: ["two small mushroom-like creatures"],
        uncertainty_notes: [],
      },
      semantic_tags: ["mushroom-like creatures", "plain background", "small figures"],
    },
    { name: "Mew ex", supertype: "Pokemon" },
  );

  assert.ok(mewDetails.some((detail) => detail.flag === "potential_primary_subject_mismatch"));
  assert.ok(mewDetails.some((detail) => detail.flag === "potential_subject_count_mismatch"));
  assert.ok(mewDetails.some((detail) =>
    detail.flag === "potential_canonical_name_visual_conflict"
    && /mushroom/.test(detail.matched_text)));

  const tagTeamDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "A single hybrid creature combines Lucario and Melmetal into one merged form.",
      card_surface_and_printing_cues: "No reliable card-surface or printing treatment can be determined.",
      visual_attributes: {
        subjects: { primary: ["Lucario and Melmetal hybrid creature"], secondary: [] },
        environment: { setting: ["plain background"] },
        mood: [],
        distinguishing_details: ["single hybrid creature"],
        uncertainty_notes: [],
      },
      semantic_tags: ["Lucario", "Melmetal", "hybrid creature"],
    },
    { name: "Lucario & Melmetal-GX", supertype: "Pokemon" },
  );

  assert.ok(tagTeamDetails.some((detail) => detail.flag === "potential_subject_count_mismatch"));
  assert.ok(tagTeamDetails.some((detail) => detail.flag === "potential_canonical_name_visual_conflict"));

  const gengarDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "Gengar is shown as a round purple ghost without limbs against a dark backdrop.",
      card_surface_and_printing_cues: "No reliable card-surface or printing treatment can be determined.",
      visual_attributes: {
        subjects: { primary: ["Gengar"], secondary: [] },
        environment: { setting: ["dark backdrop"] },
        mood: [],
        distinguishing_details: ["round purple ghost without limbs"],
        uncertainty_notes: [],
      },
      semantic_tags: ["Gengar", "purple ghost", "dark backdrop"],
    },
    { name: "Gengar", supertype: "Pokemon" },
  );

  assert.ok(gengarDetails.some((detail) =>
    detail.flag === "potential_canonical_name_visual_conflict"
    && detail.matched_text === "without limbs"));
});

test("card visual language enforcement catches subject-repair dry-run false negatives", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description: [
        "Mega Excadrill has a fierce expression and aggressive demeanor.",
        "This Pokemon's design emphasizes strength and aggression, characteristic of its species.",
        "Gwynn's expression conveys concentration or contemplation, with a serious demeanor.",
        "The overall mood suggests a blend of introspection and determination.",
        "The bomb suggests impending action, excitement and tension, and something dramatic is about to occur.",
        "The badge has a glossy, reflective surface.",
      ].join(" "),
      card_surface_and_printing_cues:
        "Standard card border visible, foil texture cannot be determined, printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["Mega Excadrill"], secondary: ["Gwynn", "bomb", "badge"] },
        environment: { setting: ["abstract background"] },
        mood: [],
        distinguishing_details: ["contemplative pose"],
        uncertainty_notes: [],
      },
      semantic_tags: ["celebratory theme", "contemplative pose", "dynamic composition"],
    },
    { name: "Mega Excadrill ex", supertype: "Pokemon" },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "aggressive demeanor"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "strength and aggression"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "characteristic of its species"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "concentration or contemplation"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "serious demeanor"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "introspection and determination"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "contemplative pose"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "impending action"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "excitement and tension"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "something dramatic is about to occur"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "glossy, reflective surface"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_generic_filler"
    && detail.matched_text === "Standard card border visible"
    && detail.field === "card_surface_and_printing_cues"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_semantic_tag_nonvisual_concept"
    && detail.matched_text === "celebratory"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_semantic_tag_nonvisual_concept"
    && detail.matched_text === "theme"));
});

test("card visual language enforcement catches broader false-negative families", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description: [
        "Mega Zeraora's predatory nature exudes a sense of agility and strength, speed and power, and excitement associated with this Pokemon.",
        "Its Electric-type nature makes it look ready to spring into action.",
        "Gladion appears to be summoning power or command, and the final battle is suggested by the name of the card.",
        "Gwynn has a contemplative or calculated demeanor, a positive emotional tone, and a warm and inviting tone.",
        "The gym has a hot, energetic atmosphere and an aggressive mood.",
        "The valley is a fantastical landscape with a cheerful mood, playful atmosphere, and whimsical touch.",
        "The bomb has a glossy black body, glossy black exterior, shiny surfaces, and imminent detonation.",
        "The badge has a shiny reflective surface and smooth silver appearance.",
      ].join(" "),
      card_surface_and_printing_cues: "Foil texture cannot be determined.",
      visual_attributes: {
        subjects: { primary: ["Mega Zeraora"], secondary: ["Gladion", "Gwynn", "bomb", "badge"] },
        environment: { setting: ["fantastical valley"] },
        mood: ["whimsical"],
        distinguishing_details: ["shiny badge", "glossy bomb"],
        uncertainty_notes: [],
      },
      semantic_tags: ["Cinnabar City Gym", "award", "Electric-type", "whimsical"],
    },
    {
      name: "Cinnabar City Gym",
      set_name: "Gym Challenge",
      supertype: "Trainer",
      card_category: "Stadium",
    },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "predatory nature"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "exudes a sense of agility and strength"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "speed and power"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "excitement associated with this Pokemon"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_metadata_or_identity_language"
    && detail.matched_text === "Electric-type"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "ready to spring into action"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "summoning power or command"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "final battle is suggested by the name of the card"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "contemplative or calculated demeanor"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "positive emotional tone"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "warm and inviting tone"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "hot, energetic atmosphere"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "aggressive mood"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_speculative_setting_language"
    && detail.matched_text === "fantastical"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "cheerful mood"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "playful atmosphere"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "whimsical touch"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "glossy black body"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "glossy black exterior"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "shiny surfaces"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "imminent detonation"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "shiny reflective surface"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "smooth silver appearance"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "shiny badge"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_metadata_or_identity_language"
    && detail.matched_text === "Cinnabar City Gym"
    && detail.field === "semantic_tags"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_semantic_tag_nonvisual_concept"
    && detail.matched_text === "award"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_semantic_tag_nonvisual_concept"
    && detail.matched_text === "whimsical"
    && detail.field === "semantic_tags"));
});

test("card visual language enforcement catches broad-repair dry-run false negatives by claim class", () => {
  const pokemonDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description: [
        "Mega Excadrill has an aggressive stance and readiness for action or attack.",
        "Mega Zeraora's electric type is emphasized by lightning motifs, hinting at its power.",
      ].join(" "),
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["Mega Excadrill"], secondary: [] },
        environment: { setting: ["abstract background"] },
        mood: [],
        distinguishing_details: ["drill-shaped head"],
        uncertainty_notes: [],
      },
      semantic_tags: ["Mega Excadrill", "drill-shaped head", "dynamic pose"],
    },
    { name: "Mega Excadrill ex", supertype: "Pokemon" },
  );

  assert.ok(pokemonDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "aggressive stance"));
  assert.ok(pokemonDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "readiness for action or attack"));
  assert.ok(pokemonDetails.some((detail) =>
    detail.flag === "potential_canonical_metadata_in_visual_output"
    && detail.matched_text === "electric type"));
  assert.ok(pokemonDetails.some((detail) =>
    detail.flag === "potential_primary_subject_anatomy_overclaim"
    && detail.matched_text === "hinting at its power"));
  assert.ok(pokemonDetails.some((detail) =>
    detail.flag === "potential_canonical_metadata_in_visual_output"
    && detail.matched_text === "Mega Excadrill"
    && detail.field === "semantic_tags"));

  const trainerDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The trainer has a calm, contemplative expression that creates an emotional charge of the moment and quiet confidence.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["Gwynn"], secondary: [] },
        environment: { setting: ["stone pathway"] },
        mood: ["contemplation"],
        distinguishing_details: ["high-collared coat"],
        uncertainty_notes: [],
      },
      semantic_tags: ["trainer portrait", "quiet confidence", "stone pathway"],
    },
    { name: "Gwynn", supertype: "Trainer", card_category: "Supporter" },
  );

  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "contemplative expression"));
  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "emotional charge of the moment"));
  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "quiet confidence"));
  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "contemplation"
    && detail.field === "visual_attributes.mood"));

  const energyDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description: [
        "The symbolic design includes a reflective dark orb with glossy finish, matte textures, and a uniform finish.",
        "The background is interpreted as a night cityscape with buildings and a leaf-shaped object.",
        "The description says the design is embodying the essence of Water Energy.",
      ].join(" "),
      card_surface_and_printing_cues: "Foil texture cannot be determined.",
      visual_attributes: {
        subjects: { primary: [], secondary: ["cityscape"] },
        environment: { setting: ["night cityscape"] },
        mood: [],
        distinguishing_details: ["glossy finish", "radiating lines"],
        uncertainty_notes: [],
      },
      semantic_tags: ["abstract energy", "radiating lines", "water symbol"],
    },
    { name: "Water Energy", supertype: "Energy", card_category: "Basic" },
  );

  assert.ok(energyDetails.some((detail) =>
    detail.flag === "potential_visual_material_vs_surface_confusion"
    && detail.matched_text === "reflective dark orb"));
  assert.ok(energyDetails.some((detail) =>
    detail.flag === "potential_visual_material_vs_surface_confusion"
    && detail.matched_text === "glossy finish"));
  assert.ok(energyDetails.some((detail) =>
    detail.flag === "potential_visual_material_vs_surface_confusion"
    && detail.matched_text === "matte textures"));
  assert.ok(energyDetails.some((detail) =>
    detail.flag === "potential_visual_material_vs_surface_confusion"
    && detail.matched_text === "uniform finish"));
  assert.ok(energyDetails.some((detail) =>
    detail.flag === "potential_abstract_shape_literalization"
    && detail.matched_text === "night cityscape"));
  assert.ok(energyDetails.some((detail) =>
    detail.flag === "potential_abstract_shape_literalization"
    && detail.matched_text === "leaf-shaped object"));
  assert.ok(energyDetails.some((detail) =>
    detail.flag === "potential_purpose_or_lore_interpretation"
    && detail.matched_text === "essence of"));

  const objectDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The bomb has a shiny finish and appears smooth and reflective, suggesting potential for detonation in an explosive atmosphere.",
      card_surface_and_printing_cues: "Silver border visible, printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["bomb"], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["shiny finish"],
        uncertainty_notes: [],
      },
      semantic_tags: ["visible object", "dynamic composition", "radiating lines"],
    },
    { name: "ごうかいボム", supertype: "Trainer", card_category: "Item" },
  );

  assert.ok(objectDetails.some((detail) =>
    detail.flag === "potential_visual_material_vs_surface_confusion"
    && detail.matched_text === "shiny finish"));
  assert.ok(objectDetails.some((detail) =>
    detail.flag === "potential_visual_material_vs_surface_confusion"
    && detail.matched_text === "smooth and reflective"));
  assert.ok(objectDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "potential for detonation"));
  assert.ok(objectDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "explosive atmosphere"));
});

test("card visual language enforcement catches cross-field expression contradictions", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The facial expression cannot be determined due to the angle, but the figure later appears assertive.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["trainer"], secondary: [] },
        environment: { setting: ["abstract background"] },
        mood: ["confident"],
        distinguishing_details: ["raised hand"],
        uncertainty_notes: ["facial expression cannot be determined"],
      },
      semantic_tags: ["confident expression", "trainer portrait", "raised hand"],
    },
    { name: "Example Trainer", supertype: "Trainer", card_category: "Supporter" },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_cross_field_expression_contradiction"
    && detail.matched_text === "assertive"
    && detail.field === "artwork_description"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_cross_field_expression_contradiction"
    && detail.matched_text === "confident"
    && detail.field === "visual_attributes.mood"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_cross_field_expression_contradiction"
    && detail.matched_text === "confident"
    && detail.field === "semantic_tags"));
});

test("card visual language enforcement catches claim-class dry-run final false negatives narrowly", () => {
  const excadrillDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The posture suggests a readiness to burrow or attack, with a theme of excavation and speed and a formidable appearance.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["Mega Excadrill"], secondary: [] },
        environment: { setting: [] },
        mood: ["intimidating mood"],
        distinguishing_details: ["drill-shaped snout"],
        uncertainty_notes: [],
      },
      semantic_tags: ["drill-like anatomy", "dynamic pose", "dark background"],
    },
    { name: "Mega Excadrill ex", supertype: "Pokemon" },
  );

  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "readiness to burrow or attack"));
  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_purpose_or_lore_interpretation"
    && detail.matched_text === "theme of excavation and speed"));
  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "formidable appearance"));
  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "intimidating mood"
    && detail.field === "visual_attributes.mood"));

  const trainerDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The trainer has a confident stance, determination or focus, a sense of action and readiness, and an assertive posture.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["Gladion"], secondary: [] },
        environment: { setting: ["grassy landscape"] },
        mood: [],
        distinguishing_details: ["outstretched arm"],
        uncertainty_notes: [],
      },
      semantic_tags: ["confident expression", "trainer portrait", "grassy landscape"],
    },
    { name: "Gladion's Final Battle", supertype: "Trainer", card_category: "Supporter" },
  );

  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "confident stance"));
  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "determination or focus"));
  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "action and readiness"));
  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "assertive posture"));
  assert.ok(trainerDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "confident expression"
    && detail.field === "semantic_tags"));

  const grassEnergyDetails = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The mood conveys vitality, fitting for a Grass Energy card, and emphasizes elemental qualities associated with grass.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: [], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["leaf symbol", "green gradients"],
        uncertainty_notes: [],
      },
      semantic_tags: ["green gradients", "leaf symbol", "radiating lines"],
    },
    { name: "Basic Grass Energy", supertype: "Energy", card_category: "Basic" },
  );

  assert.ok(grassEnergyDetails.some((detail) =>
    detail.flag === "potential_purpose_or_lore_interpretation"
    && detail.matched_text === "fitting for a Grass Energy card"));
  assert.ok(grassEnergyDetails.some((detail) =>
    detail.flag === "potential_purpose_or_lore_interpretation"
    && detail.matched_text === "elemental qualities associated with grass"));
});

test("card visual language enforcement catches freeze-candidate false negatives narrowly", () => {
  const excadrillPayload = {
    artwork_description:
      "The face displays a wide, menacing grin with sharp teeth, giving it an aggressive expression and intimidating presence. The pose is angled forward as if about to drill into the ground.",
    card_surface_and_printing_cues: "Silver border visible, printing treatment uncertain.",
    visual_attributes: {
      subjects: { primary: ["Mega Excadrill"], secondary: [] },
      environment: { setting: [] },
      mood: ["aggressive", "intense"],
      distinguishing_details: ["drill snout", "clawed arms"],
      uncertainty_notes: [],
    },
    semantic_tags: ["aggressive pose", "drill Pokemon", "dynamic composition"],
  };
  const excadrillDetails = detectVisualDescriptionReviewFlagDetailsV1(
    excadrillPayload,
    { name: "Mega Excadrill ex", supertype: "Pokemon" },
  );
  const excadrillFlags = detectVisualDescriptionReviewFlagsV1(
    excadrillPayload,
    { name: "Mega Excadrill ex", supertype: "Pokemon" },
  );

  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "menacing grin"));
  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "aggressive expression"));
  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "intimidating presence"));
  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "about to drill into the ground"));
  assert.ok(excadrillDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "aggressive"
    && detail.field === "visual_attributes.mood"));
  assert.equal(
    classifyDescriptionReviewStatusV1({
      quality_flags: excadrillFlags,
      identity_input_confidence: 0.95,
      description_confidence: 0.95,
      attribute_confidence: 0.95,
      image_quality_score: 0.95,
    }),
    "needs_review",
  );

  const gladionPayload = {
    artwork_description:
      "The trainer's expression is serious and determined. His left arm is extended forward, suggesting an active gesture of calling or directing something, and the scene carries action and determination.",
    card_surface_and_printing_cues: "Printing treatment uncertain.",
    visual_attributes: {
      subjects: { primary: ["Gladion"], secondary: [] },
      environment: { setting: ["grassy terrain"] },
      mood: ["determined", "intense"],
      distinguishing_details: ["outstretched arm", "black jacket"],
      uncertainty_notes: [],
    },
    semantic_tags: ["determined expression", "trainer portrait", "black jacket"],
  };
  const gladionDetails = detectVisualDescriptionReviewFlagDetailsV1(
    gladionPayload,
    { name: "Gladion's Final Battle", supertype: "Trainer", card_category: "Supporter" },
  );
  const gladionFlags = detectVisualDescriptionReviewFlagsV1(
    gladionPayload,
    { name: "Gladion's Final Battle", supertype: "Trainer", card_category: "Supporter" },
  );

  assert.ok(gladionDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "serious and determined"));
  assert.ok(gladionDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "calling or directing"));
  assert.ok(gladionDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "action and determination"));
  assert.ok(gladionDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "determined"
    && detail.field === "visual_attributes.mood"));
  assert.ok(gladionDetails.some((detail) =>
    detail.flag === "potential_unsupported_personality_or_species_interpretation"
    && detail.matched_text === "determined expression"
    && detail.field === "semantic_tags"));
  assert.equal(
    classifyDescriptionReviewStatusV1({
      quality_flags: gladionFlags,
      identity_input_confidence: 0.95,
      description_confidence: 0.95,
      attribute_confidence: 0.95,
      image_quality_score: 0.95,
    }),
    "needs_review",
  );

  const magneticStormPayload = {
    artwork_description:
      "The scene includes lightning and an aurora. The overall mood feels awe-inspiring, with natural awe and a sense of power created by the sky.",
    card_surface_and_printing_cues: "Foil texture cannot be determined.",
    visual_attributes: {
      subjects: { primary: [], secondary: [] },
      environment: { setting: ["dark sky", "aurora"] },
      mood: ["awe-inspiring", "charged"],
      distinguishing_details: ["lightning", "aurora"],
      uncertainty_notes: [],
    },
    semantic_tags: ["aurora", "lightning", "dark sky"],
  };
  const magneticStormDetails = detectVisualDescriptionReviewFlagDetailsV1(
    magneticStormPayload,
    { name: "Magnetic Storm", supertype: "Trainer", card_category: "Stadium" },
  );
  const magneticStormFlags = detectVisualDescriptionReviewFlagsV1(
    magneticStormPayload,
    { name: "Magnetic Storm", supertype: "Trainer", card_category: "Stadium" },
  );

  assert.ok(magneticStormDetails.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "awe-inspiring"));
  assert.ok(magneticStormDetails.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "natural awe"));
  assert.ok(magneticStormDetails.some((detail) =>
    detail.flag === "potential_interpretive_mood_language"
    && detail.matched_text === "sense of power"));
  assert.equal(
    classifyDescriptionReviewStatusV1({
      quality_flags: magneticStormFlags,
      identity_input_confidence: 0.95,
      description_confidence: 0.95,
      attribute_confidence: 0.95,
      image_quality_score: 0.95,
    }),
    "needs_review",
  );

  const bombPayload = {
    artwork_description:
      "The bomb has a glossy black surface and a bright red fuse with a spark indicating ignition. The background suggests an explosion or heightened action, and the mood carries urgency and excitement.",
    card_surface_and_printing_cues: "Foil texture cannot be determined.",
    visual_attributes: {
      subjects: { primary: ["bomb"], secondary: [] },
      environment: { setting: [] },
      mood: ["exciting", "urgent"],
      distinguishing_details: ["glossy black surface", "red fuse"],
      uncertainty_notes: [],
    },
    semantic_tags: ["bomb object", "red fuse", "radiating colors"],
  };
  const bombDetails = detectVisualDescriptionReviewFlagDetailsV1(
    bombPayload,
    { name: "Tremendous Bomb", supertype: "Trainer", card_category: "Item" },
  );
  const bombFlags = detectVisualDescriptionReviewFlagsV1(
    bombPayload,
    { name: "Tremendous Bomb", supertype: "Trainer", card_category: "Item" },
  );

  assert.ok(bombDetails.some((detail) =>
    detail.flag === "potential_object_material_or_card_surface_confusion"
    && detail.matched_text === "glossy black surface"));
  assert.ok(bombDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "spark indicating ignition"));
  assert.ok(bombDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "explosion or heightened action"));
  assert.ok(bombDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "urgency and excitement"));
  assert.ok(bombDetails.some((detail) =>
    detail.flag === "potential_dramatic_inferred_action_language"
    && detail.matched_text === "exciting"
    && detail.field === "visual_attributes.mood"));
  assert.equal(
    classifyDescriptionReviewStatusV1({
      quality_flags: bombFlags,
      identity_input_confidence: 0.95,
      description_confidence: 0.95,
      attribute_confidence: 0.95,
      image_quality_score: 0.95,
    }),
    "needs_review",
  );
});

test("card visual language policy evaluates claim, field, and support together", () => {
  const surfacePolicy = evaluateVisualDescriptionPolicyV1(
    {
      artwork_description:
        "Object/Scene: The object is centered against blue gradients with simple visible shapes.",
      card_surface_and_printing_cues:
        "The card has a glossy finish and visible foil texture.",
      visual_attributes: {
        subjects: { primary: ["object"], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["centered object"],
        uncertainty_notes: [],
      },
      semantic_tags: ["blue gradients", "centered object", "simple shapes"],
    },
    { name: "Example Item", supertype: "Trainer", card_category: "Item" },
  );

  assert.ok(surfacePolicy.some((result) =>
    result.policy_rule === "surface_claim_requires_physical_evidence"
    && result.field === "card_surface_and_printing_cues"
    && result.claim === "glossy finish"
    && result.decision === "needs_review"));

  const illustratedObjectPolicy = evaluateVisualDescriptionPolicyV1(
    {
      artwork_description:
        "Object/Scene: The artwork shows a glossy black bomb shape with a red fuse and a centered composition.",
      card_surface_and_printing_cues: "Foil texture cannot be determined, printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["bomb"], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["red fuse", "round black bomb"],
        uncertainty_notes: [],
      },
      semantic_tags: ["black bomb", "red fuse", "centered object"],
    },
    { name: "Tremendous Bomb", supertype: "Trainer", card_category: "Item" },
  );
  assert.equal(illustratedObjectPolicy.some((result) =>
    result.policy_rule === "surface_claim_requires_physical_evidence"), false);

  const contradictionPolicy = evaluateVisualDescriptionPolicyV1(
    {
      artwork_description:
        "The face is not clearly visible due to the angle and shadows.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["trainer"], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["dark jacket"],
        uncertainty_notes: ["facial expression cannot be determined"],
      },
      semantic_tags: ["confident expression", "trainer portrait", "dark jacket"],
    },
    { name: "Example Trainer", supertype: "Trainer", card_category: "Supporter" },
  );
  assert.ok(contradictionPolicy.some((result) =>
    result.policy_rule === "expression_claim_contradicts_unclear_face"
    && result.field === "semantic_tags"
    && result.claim === "confident expression"
    && result.supporting_evidence.some((item) => item.includes("facial expression cannot be determined"))));

  const supportedTrainerPolicy = evaluateVisualDescriptionPolicyV1(
    {
      artwork_description:
        "The trainer has a determined expression with visible furrowed brows and a small smile.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: ["trainer"], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["furrowed brows", "small smile"],
        uncertainty_notes: [],
      },
      semantic_tags: ["determined expression", "trainer portrait", "furrowed brows"],
    },
    { name: "Example Trainer", supertype: "Trainer", card_category: "Supporter" },
  );
  assert.equal(supportedTrainerPolicy.some((result) =>
    result.policy_rule === "trainer_personality_or_expression_requires_visible_support"), false);

  const energyPolicy = evaluateVisualDescriptionPolicyV1(
    {
      artwork_description:
        "Symbolic Artwork: The abstract Energy symbol appears above a city skyline with dark buildings.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: [], secondary: [] },
        environment: { setting: ["cityscape"] },
        mood: [],
        distinguishing_details: ["buildings", "central symbol"],
        uncertainty_notes: [],
      },
      semantic_tags: ["city skyline", "dark buildings", "energy symbol"],
    },
    { name: "Rainbow Energy", supertype: "Energy", card_category: "Special" },
  );
  assert.ok(energyPolicy.some((result) =>
    result.policy_rule === "energy_abstract_literalization_requires_structured_entity_evidence"
    && result.claim === "buildings"));
});

test("field-aware policy replay routes failed freeze candidates without dirtying clean pending rows", () => {
  function replayStatus(row) {
    const flags = detectVisualDescriptionReviewFlagsV1(row, {
      name: row.name,
      supertype: row.card_supertype,
      subtype: row.card_subtype,
      card_category: row.card_category,
      prompt_branch: row.prompt_branch,
      card_type_metadata_source: row.card_type_metadata_source,
    });
    return {
      flags,
      status: classifyDescriptionReviewStatusV1({
        quality_flags: flags,
        identity_input_confidence: row.identity_input_confidence,
        description_confidence: row.description_confidence,
        attribute_confidence: row.attribute_confidence,
        image_quality_score: row.image_quality_score,
      }),
    };
  }

  const finalRows = source(
    "docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/generated_outputs.jsonl",
  ).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const finalFalseNegativeIds = new Set([
    "GV-PK-JPN-M5-096",
    "GV-PK-JPN-M5-116",
    "GV-PK-JPN-M5-111",
    "GV-PK-JPN-TCGCOLLECTOR11515-020",
    "GV-PK-JPN-M5-106",
  ]);
  for (const row of finalRows.filter((candidate) => finalFalseNegativeIds.has(candidate.gv_id))) {
    assert.equal(replayStatus(row).status, "needs_review", row.gv_id);
  }

  const priorRows = source(
    "docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/generated_outputs.jsonl",
  ).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const previouslyCleanPendingIds = new Set([
    "GV-PK-JPN-M5-096",
    "GV-PK-JPN-M5-108",
    "GV-PK-JPN-M5-072",
  ]);
  for (const row of priorRows.filter((candidate) => previouslyCleanPendingIds.has(candidate.gv_id))) {
    assert.equal(replayStatus(row).status, "pending", row.gv_id);
  }
});

test("card visual language enforcement catches final surface phrases and ignores non-problem glare quality", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description: "The visible object is centered against blue gradients with a simple background.",
      card_surface_and_printing_cues:
        "Foil treatment is present and card surface quality appears clear.",
      visual_attributes: {
        subjects: { primary: ["object"], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["centered object"],
        uncertainty_notes: [],
      },
      semantic_tags: ["centered object", "blue gradients", "simple background"],
    },
    { name: "Example Item", supertype: "Trainer", card_category: "Item" },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "Foil treatment is present"));
  assert.ok(details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.matched_text === "card surface quality appears clear"));

  const validation = validateVisualDescriptionPayloadV1({
    artwork_description:
      "This sufficiently long description focuses on visible shapes, colors, composition, and grounded details only.",
    card_surface_and_printing_cues:
      "Glare prevents determination; no reliable additional card-surface or printing-treatment cues are visible enough to describe.",
    visual_attributes: {
      subjects: { primary: ["object"], secondary: [] },
      environment: { setting: [] },
      mood: [],
      distinguishing_details: ["centered object"],
      uncertainty_notes: ["glare prevents determination"],
    },
    semantic_tags: ["centered object", "blue gradients", "simple background"],
    quality_flags: ["glare prevents determination"],
    description_confidence: 0.95,
    attribute_confidence: 0.95,
  });

  assert.equal(validation.normalized.quality_flags.length, 0);
});

test("card visual language enforcement preserves objective Energy branch wording", () => {
  const flags = detectVisualDescriptionReviewFlagsV1(
    {
      artwork_description:
        "Symbolic Artwork: The central energy symbol sits inside a circular motif with blue gradients and radiating lines.",
      card_surface_and_printing_cues: "Printing treatment uncertain.",
      visual_attributes: {
        subjects: { primary: [], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["central energy symbol", "radiating lines"],
        uncertainty_notes: [],
      },
      semantic_tags: ["abstract energy", "energy symbol", "radiating lines"],
    },
    { name: "Water Energy", supertype: "Energy", card_category: "Basic" },
  );

  assert.equal(flags.includes("potential_metadata_or_identity_language"), false);
  assert.equal(flags.includes("potential_semantic_tag_nonvisual_concept"), false);
});

test("card visual language enforcement allows literal star-shaped objects", () => {
  const flags = detectVisualDescriptionReviewFlagsV1(
    {
      artwork_description:
        "The object has a central star-shaped symbol on a rounded badge face, with simple lines around the edge.",
      card_surface_and_printing_cues: "No reliable card-surface or printing treatment can be determined.",
      visual_attributes: {
        subjects: { primary: ["badge object"], secondary: [] },
        environment: { setting: ["plain background"] },
        mood: [],
        distinguishing_details: ["central star", "star-shaped symbol"],
        uncertainty_notes: [],
      },
      semantic_tags: ["badge object", "central star", "rounded shape"],
    },
    { name: "Retry Badge", supertype: "Trainer", card_category: "Item" },
  );

  assert.equal(flags.includes("potential_overconfident_ambiguous_setting"), false);
  assert.equal(flags.includes("potential_speculative_setting_language"), false);
});

test("card visual language enforcement flags unavailable metadata branch mismatch evidence", () => {
  const details = detectVisualDescriptionReviewFlagDetailsV1(
    {
      artwork_description:
        "The artwork shows an object rather than a creature, with no distinct Pokemon features and a small human character beside it.",
      card_surface_and_printing_cues: "No reliable card-surface or printing treatment can be determined.",
      visual_attributes: {
        subjects: { primary: ["object scene"], secondary: ["human character"] },
        environment: { setting: ["interior"] },
        mood: [],
        distinguishing_details: ["object rather than a creature"],
        uncertainty_notes: [],
      },
      semantic_tags: ["object scene", "human character", "interior"],
    },
    { name: "Unclassified Card" },
  );

  assert.ok(details.some((detail) =>
    detail.flag === "potential_unavailable_metadata_prompt_branch_mismatch"
    && detail.field === "artwork_description"
    && detail.matched_text === "object rather than a creature"));
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

test("card visual description resolves fallback card branches and stratified samples", () => {
  assert.equal(resolveCardPromptMetadata({ name: "Retry Badge" }).prompt_branch, "item_tool_supporter");
  assert.equal(resolveCardPromptMetadata({ name: "古びたたての化石" }).prompt_branch, "item_tool_supporter");
  assert.equal(resolveCardPromptMetadata({ name: "Gwynn" }).prompt_branch, "trainer");
  assert.equal(resolveCardPromptMetadata({ name: "Rust Syndicate Grunt" }).prompt_branch, "trainer");
  assert.equal(resolveCardPromptMetadata({ name: "Cynthia's Feelings (Temple of Anger No. 064)" }).prompt_branch, "trainer");
  assert.equal(resolveCardPromptMetadata({ name: "Cynthia's Feelings (Temple of Anger No. 064)" }).card_type_metadata_source, "name_fallback_trainer");
  assert.equal(resolveCardPromptMetadata({ name: "Basic Psychic Energy" }).prompt_branch, "energy");
  assert.equal(resolveCardPromptMetadata({ name: "Sky Garden" }).prompt_branch, "stadium");

  const rows = [
    { card_print_id: "p1", name: "Pikachu", supertype: "Pokemon" },
    { card_print_id: "p2", name: "Bulbasaur", supertype: "Pokemon" },
    { card_print_id: "t1", name: "Rust Syndicate Grunt" },
    { card_print_id: "s1", name: "Sky Garden" },
    { card_print_id: "e1", name: "Basic Psychic Energy" },
    { card_print_id: "i1", name: "Retry Badge" },
  ];

  assert.deepEqual(
    selectBranchStratifiedCardsV1(rows, {
      pokemon: 1,
      trainer: 1,
      stadium: 1,
      energy: 1,
      item_tool_supporter: 1,
    }).map((row) => row.card_print_id),
    ["p1", "t1", "s1", "e1", "i1"],
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
