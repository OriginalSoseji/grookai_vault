import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
  CARD_VISUAL_CONTROLLED_VOCABULARY_VERSION,
  CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION,
  CARD_VISUAL_SEARCH_ALIAS_VERSION,
  aggregateUsageRows,
  buildFactGraphCompatibilityDigestV1,
  buildDescriptionVersionKeyV1,
  buildEmbeddingInputV1,
  buildCostProjection,
  buildValidationQuarantineRowsV1,
  assertOpenAiPricingConfigured,
  classifyVisualHarvestFailureV1,
  classifyDescriptionReviewStatusV1,
  evaluateHarvestPolicyV1,
  evaluateAutoApprovalReadinessV1,
  detectVisualDescriptionReviewFlagDetailsV1,
  detectVisualDescriptionReviewFlagsV1,
  evaluateVisualDescriptionPolicyV1,
  estimateUsageCostUsd,
  evaluateStopBeforeNextCall,
  filterActiveVisualFactExtractionCardsV1,
  mapVisualSearchAliasQueryV1,
  parseCardVisualDescriptionArgsV1,
  cardVisualSelectionQueryLimitV1,
  resolveCardPromptMetadata,
  sanitizeSemanticTagsForVisibleArtworkV1,
  selectBranchStratifiedCardsV1,
  selectHighValueSampleCardsV1,
  selectV2StressSampleCardsV1,
  validateVisualDescriptionPayloadV1,
} from "../../backend/card_descriptions/card_visual_description_agent_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function validFactGraph(overrides = {}) {
  const graph = {
    observations: [
      {
        observation_id: "obs_subject_001",
        kind: "scene_subject",
        label: "Pikachu",
        normalized_label: "pikachu",
        scene_layer: "foreground",
        frame_position: "center",
        visibility: "fully_visible",
        salience: "high",
        confidence: 0.96,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_tree_group_001",
        kind: "plant_group",
        label: "10 visible trees",
        normalized_label: "tree",
        scene_layer: "background",
        frame_position: "full_width_background",
        visibility: "visible",
        salience: "medium",
        confidence: 0.97,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_palette_001",
        kind: "palette",
        label: "yellow and green palette",
        normalized_label: "yellow green palette",
        scene_layer: "overall",
        frame_position: "full_frame",
        visibility: "visible",
        salience: "medium",
        confidence: 0.93,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_surface_001",
        kind: "surface_scan_abstention",
        label: "foil and border finish cannot be determined",
        normalized_label: "surface finish uncertain",
        scene_layer: "card_frame",
        frame_position: "full_frame",
        visibility: "cannot_determine",
        salience: "low",
        confidence: 0.9,
        evidence_strength: "abstention",
      },
      {
        observation_id: "obs_ui_hp_001",
        kind: "hp_text",
        label: "HP 280",
        normalized_label: "hp 280",
        scene_layer: "card_frame",
        frame_position: "top_right",
        visibility: "visible",
        salience: "low",
        confidence: 0.98,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_ui_collector_001",
        kind: "collector_number",
        label: "118/081",
        normalized_label: "118/081",
        scene_layer: "card_frame",
        frame_position: "bottom_left",
        visibility: "visible",
        salience: "low",
        confidence: 0.97,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_ui_copyright_001",
        kind: "copyright_text",
        label: "visible copyright line",
        normalized_label: "copyright line visible",
        scene_layer: "card_frame",
        frame_position: "bottom_edge",
        visibility: "partially_visible",
        salience: "low",
        confidence: 0.78,
        evidence_strength: "moderate",
      },
      {
        observation_id: "obs_ui_logo_001",
        kind: "logo",
        label: "WB Kids logo",
        normalized_label: "wb kids logo",
        scene_layer: "card_frame",
        frame_position: "right_edge",
        visibility: "visible",
        salience: "low",
        confidence: 0.93,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_ui_error_marker_001",
        kind: "error_marker",
        label: "visible correction marker",
        normalized_label: "correction marker",
        scene_layer: "card_frame",
        frame_position: "bottom_right",
        visibility: "visible",
        salience: "low",
        confidence: 0.88,
        evidence_strength: "moderate",
      },
    ],
    typed_facts: [
      {
        fact_id: "fact_subject_001",
        module: "subjects",
        field_path: "subjects[0].identity",
        claim: "Pikachu is a visible scene subject",
        value: "Pikachu",
        supporting_observation_ids: ["obs_subject_001"],
        confidence: 0.96,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_creature_001",
        module: "creature_anatomy",
        field_path: "modules.creature_anatomy.body_regions[0]",
        claim: "Pikachu has a small yellow body and long ears visible",
        value: "small yellow body and long ears",
        supporting_observation_ids: ["obs_subject_001"],
        confidence: 0.94,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_environment_001",
        module: "environment",
        field_path: "environment.plants",
        claim: "ten visible trees form a forest background",
        value: "ten visible trees",
        supporting_observation_ids: ["obs_tree_group_001"],
        confidence: 0.97,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_count_001",
        module: "counts",
        field_path: "counts[0].exact_count",
        claim: "tree exact count is 10",
        value: "10",
        supporting_observation_ids: ["obs_tree_group_001"],
        confidence: 0.97,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_color_light_001",
        module: "color_and_light",
        field_path: "visual_design.palette",
        claim: "yellow and green palette is visible",
        value: "yellow and green",
        supporting_observation_ids: ["obs_palette_001"],
        confidence: 0.93,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_composition_001",
        module: "composition",
        field_path: "visual_design.composition",
        claim: "central subject appears before background trees",
        value: "central subject with background trees",
        supporting_observation_ids: ["obs_subject_001", "obs_tree_group_001"],
        confidence: 0.92,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_surface_001",
        module: "surface_and_scan_cues",
        field_path: "surface_and_scan_cues[0].abstention",
        claim: "foil and texture cannot be determined from this scan",
        value: "surface finish uncertain",
        supporting_observation_ids: ["obs_surface_001"],
        confidence: 0.9,
        evidence_strength: "abstention",
      },
      {
        fact_id: "fact_uncertainty_001",
        module: "uncertainty_and_abstentions",
        field_path: "uncertainty_and_abstentions[0].reason",
        claim: "physical foil and texture cannot be determined",
        value: "physical foil and texture cannot be determined from image",
        supporting_observation_ids: ["obs_surface_001"],
        confidence: 0.9,
        evidence_strength: "abstention",
      },
      {
        fact_id: "fact_ui_hp_001",
        module: "card_ui_and_print_markers",
        field_path: "card_ui_and_print_markers.hp_text",
        claim: "HP text is visible in the printed card UI",
        value: "HP 280",
        supporting_observation_ids: ["obs_ui_hp_001"],
        confidence: 0.98,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_ui_collector_001",
        module: "card_ui_and_print_markers",
        field_path: "card_ui_and_print_markers.collector_number",
        claim: "collector number is visible in the printed card UI",
        value: "118/081",
        supporting_observation_ids: ["obs_ui_collector_001"],
        confidence: 0.97,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_ui_copyright_001",
        module: "card_ui_and_print_markers",
        field_path: "card_ui_and_print_markers.copyright_line",
        claim: "bottom copyright line is visibly present but only partially readable",
        value: "visible copyright line",
        supporting_observation_ids: ["obs_ui_copyright_001"],
        confidence: 0.78,
        evidence_strength: "moderate",
      },
      {
        fact_id: "fact_ui_logo_001",
        module: "card_ui_and_print_markers",
        field_path: "card_ui_and_print_markers.logo",
        claim: "WB Kids logo is visible as print evidence",
        value: "WB Kids logo",
        supporting_observation_ids: ["obs_ui_logo_001"],
        confidence: 0.93,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_ui_error_marker_001",
        module: "card_ui_and_print_markers",
        field_path: "card_ui_and_print_markers.error_marker",
        claim: "visible correction marker is preserved as print evidence",
        value: "correction marker",
        supporting_observation_ids: ["obs_ui_error_marker_001"],
        confidence: 0.88,
        evidence_strength: "moderate",
      },
      {
        fact_id: "fact_search_001",
        module: "fact_grounded_search_terms",
        field_path: "fact_grounded_search_terms",
        claim: "search terms are backed by visible subject and forest observations",
        value: "Pikachu; forest background; ten trees",
        supporting_observation_ids: ["obs_subject_001", "obs_tree_group_001"],
        confidence: 0.93,
        evidence_strength: "strong",
      },
    ],
    subjects: [
      {
        observation_id: "obs_subject_001",
        subject_kind: "scene_subject",
        identity: "Pikachu",
        identity_confidence: 0.96,
        anatomy: ["small body", "long ears"],
        physical_features: ["yellow body", "pointed ears"],
        pose: ["standing"],
        orientation: "facing forward",
        action_state: ["still"],
        facial_evidence: {
          eyes: "visible dark eyes",
          mouth: "small mouth visible",
          eyebrows: "not_visible",
          face_position: "front of head",
          other_visible_evidence: [],
        },
        clothing_or_accessories: [],
        colors: ["yellow", "black"],
        visibility: "fully_visible",
      },
    ],
    depicted_subjects: [],
    character_representations: [],
    counts: [
      {
        count_id: "count_tree_001",
        normalized_label: "tree",
        count_type: "exact",
        exact_count: 10,
        estimated_min: 0,
        estimated_max: 0,
        abstention_reason: "",
        supporting_observation_ids: ["obs_tree_group_001"],
        scene_layer: "background",
        confidence: 0.97,
      },
    ],
    scene_layers: {
      foreground: ["obs_subject_001"],
      midground: [],
      background: ["obs_tree_group_001"],
    },
    environment: {
      setting: ["forest"],
      indoor_outdoor: "outdoor",
      sky: [],
      ground: ["forest ground"],
      terrain: ["wooded terrain"],
      plants: ["trees"],
      architecture: [],
      water: [],
      weather: [],
      time_of_day_cues: [],
      supporting_observation_ids: ["obs_tree_group_001"],
    },
    objects_and_props: [],
    relationships: [],
    visual_design: {
      palette: ["yellow", "green"],
      lighting: ["soft light"],
      shadows: [],
      highlights: [],
      composition: ["central subject", "background trees"],
      camera_angle: "front view",
      framing: "medium framing",
      cropping: [],
      depth: "foreground subject with background trees",
      motion_cues: [],
      motifs: ["forest background"],
      repeated_shapes: ["tree trunks"],
      style_cues: [],
      supporting_observation_ids: ["obs_subject_001", "obs_tree_group_001", "obs_palette_001"],
    },
    surface_and_scan_cues: [
      {
        observation_id: "obs_surface_001",
        cue_type: "abstention",
        cue: "",
        abstention: "foil texture and physical surface finish cannot be determined from this scan",
        confidence: 0.9,
      },
    ],
    coverage_reviews: {
      subjects_review: "observed",
      depicted_subjects_review: "none_visible",
      character_representations_review: "none_visible",
      counts_review: "observed",
      scene_layers_review: "observed",
      environment_review: "observed",
      objects_and_props_review: "none_visible",
      relationships_review: "none_visible",
      visual_design_review: "observed",
      surface_and_scan_cues_review: "observed",
    },
    modules: {
      subjects: {
        fact_ids: ["fact_subject_001"],
        scene_subject_observation_ids: ["obs_subject_001"],
        depicted_subject_observation_ids: [],
        character_representation_observation_ids: [],
      },
      human_appearance: {
        fact_ids: [],
        visible_body_regions: [],
        facial_evidence: [],
        hair: [],
        gestures: [],
        accessories: [],
      },
      creature_anatomy: {
        fact_ids: ["fact_creature_001"],
        body_regions: [
          {
            subject_observation_id: "obs_subject_001",
            region: "body",
            feature: "small yellow body",
            visibility: "visible",
            colors: ["yellow"],
            details: ["long ears visible"],
            supporting_observation_ids: ["obs_subject_001"],
            confidence: 0.94,
          },
        ],
        physical_features: [],
        pose_orientation: [
          {
            subject_observation_id: "obs_subject_001",
            pose: ["standing"],
            orientation: "facing forward",
            action_state: ["still"],
            supporting_observation_ids: ["obs_subject_001"],
            confidence: 0.9,
          },
        ],
        effects: [],
      },
      clothing: {
        fact_ids: [],
        garments: [],
        accessories: [],
      },
      objects_and_props: {
        fact_ids: [],
        object_observation_ids: [],
      },
      environment: {
        fact_ids: ["fact_environment_001"],
        observation_ids: ["obs_tree_group_001"],
      },
      composition: {
        fact_ids: ["fact_composition_001"],
        observation_ids: ["obs_subject_001", "obs_tree_group_001"],
      },
      color_and_light: {
        fact_ids: ["fact_color_light_001"],
        observation_ids: ["obs_palette_001"],
      },
      visual_effects: {
        fact_ids: [],
        observation_ids: [],
      },
      card_ui_and_print_markers: {
        fact_ids: [
          "fact_ui_hp_001",
          "fact_ui_collector_001",
          "fact_ui_copyright_001",
          "fact_ui_logo_001",
          "fact_ui_error_marker_001",
        ],
        name_text_observation_ids: [],
        hp_text_observation_ids: ["obs_ui_hp_001"],
        collector_number_observation_ids: ["obs_ui_collector_001"],
        set_symbol_observation_ids: [],
        rarity_mark_observation_ids: [],
        copyright_line_observation_ids: ["obs_ui_copyright_001"],
        bottom_line_text_observation_ids: [],
        promo_stamp_observation_ids: [],
        logo_observation_ids: ["obs_ui_logo_001"],
        energy_symbol_observation_ids: [],
        regulation_mark_observation_ids: [],
        illustrator_text_observation_ids: [],
        error_marker_observation_ids: ["obs_ui_error_marker_001"],
        other_print_marker_observation_ids: [],
      },
      counts: {
        fact_ids: ["fact_count_001"],
        count_ids: ["count_tree_001"],
      },
      relationships: {
        fact_ids: [],
        relationship_ids: [],
      },
      surface_and_scan_cues: {
        fact_ids: ["fact_surface_001"],
        observation_ids: ["obs_surface_001"],
      },
      uncertainty_and_abstentions: {
        fact_ids: ["fact_uncertainty_001"],
        fields: ["surface_and_scan_cues"],
      },
      fact_grounded_search_terms: {
        fact_ids: ["fact_search_001"],
        terms: ["Pikachu", "forest background", "ten trees"],
      },
    },
    module_reviews: [
      { module: "subjects", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "human_appearance", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "creature_anatomy", review_status: "likely_complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "clothing", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "objects_and_props", review_status: "none_visible", omission_risk: "none", evidence_quality: "high", abstentions: [] },
      { module: "environment", review_status: "likely_complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "composition", review_status: "likely_complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "color_and_light", review_status: "likely_complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "visual_effects", review_status: "none_visible", omission_risk: "none", evidence_quality: "high", abstentions: [] },
      { module: "card_ui_and_print_markers", review_status: "likely_complete", omission_risk: "low", evidence_quality: "high", abstentions: [{ field_path: "card_ui_and_print_markers.copyright_line", reason: "copyright text is only partially readable in the available image", affected_observation_ids: ["obs_ui_copyright_001"] }] },
      { module: "counts", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "relationships", review_status: "none_visible", omission_risk: "none", evidence_quality: "high", abstentions: [] },
      { module: "surface_and_scan_cues", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [{ field_path: "surface_and_scan_cues.finish", reason: "foil and texture cannot be determined from scan", affected_observation_ids: ["obs_surface_001"] }] },
      { module: "uncertainty_and_abstentions", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "fact_grounded_search_terms", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
    ],
    semantic_visual_facts: [],
    uncertainty_and_abstentions: [
      {
        field: "surface_and_scan_cues",
        reason: "physical foil and texture cannot be determined from image",
        affected_observation_ids: ["obs_surface_001"],
      },
    ],
    fact_grounded_search_terms: [
      { term: "Pikachu", supporting_observation_ids: ["obs_subject_001"] },
      { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      { term: "ten trees", supporting_observation_ids: ["obs_tree_group_001"] },
    ],
  };
  return {
    ...graph,
    ...overrides,
    coverage_reviews: {
      ...graph.coverage_reviews,
      ...(overrides.coverage_reviews ?? {}),
    },
  };
}

function validFactPayload(overrides = {}) {
  return {
    visual_attributes: {
      fact_schema_version: CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION,
      fact_graph: validFactGraph(overrides.fact_graph ?? {}),
    },
    description_confidence: 0.91,
    attribute_confidence: 0.85,
    quality_flags: [],
    ...overrides,
  };
}

function semanticVisualFact(overrides = {}) {
  return {
    semantic_fact_id: "sem_fact_001",
    category: "expression",
    label: "happy",
    subject_observation_id: "obs_subject_001",
    supporting_observation_ids: ["obs_subject_001"],
    evidence: {
      mouth: ["smiling mouth"],
      eyes: [],
      eyebrows: [],
      facial_features: [],
      body_language: [],
      body_position: [],
      motion_state: [],
      environment: [],
      objects: [],
      relationships: [],
      other: [],
    },
    confidence: 0.86,
    uncertainty: "",
    ...overrides,
    evidence: {
      mouth: ["smiling mouth"],
      eyes: [],
      eyebrows: [],
      facial_features: [],
      body_language: [],
      body_position: [],
      motion_state: [],
      environment: [],
      objects: [],
      relationships: [],
      other: [],
      ...(overrides.evidence ?? {}),
    },
  };
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
    "--openai-request-timeout-ms=240000",
    "--concurrency=10",
    "--exclude-branches=energy",
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
  assert.equal(apply.openaiRequestTimeoutMs, 240000);
  assert.equal(apply.concurrency, 10);
  assert.equal(apply.maxRetries, 1);
  assert.deepEqual(apply.excludeBranches, ["energy"]);
  assert.equal(apply.openaiInputCostPerMillion, 0.15);
  assert.equal(apply.openaiOutputCostPerMillion, 0.60);
  assert.equal(apply.openaiImageCostRuleVersion, "gpt-4o-mini-2026-07-15");

  const explicitNoRetry = parseCardVisualDescriptionArgsV1([
    "--dry-run",
    "--provider=openai",
    "--model=test-vision-model",
    "--concurrency=10",
    "--max-retries=0",
  ]);
  assert.equal(explicitNoRetry.maxRetries, 0);

  const branchSample = parseCardVisualDescriptionArgsV1([
    "--dry-run",
    "--provider=openai",
    "--model=test-vision-model",
    "--limit=25",
    "--branch-stratified-sample",
    "--branch-targets=pokemon:5,trainer:5,stadium:5,item_tool_supporter:5",
    "--branch-candidate-limit=60000",
  ]);
  assert.equal(branchSample.branchStratifiedSample, true);
  assert.equal(branchSample.branchCandidateLimit, 60000);
  assert.deepEqual(branchSample.branchTargets, {
    pokemon: 5,
    trainer: 5,
    stadium: 5,
    item_tool_supporter: 5,
  });
  assert.throws(
    () => parseCardVisualDescriptionArgsV1([
      "--dry-run",
      "--provider=openai",
      "--model=test-vision-model",
      "--branch-stratified-sample",
      "--branch-targets=energy:1",
    ]),
    /unsupported branch target: energy/,
  );
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
  assert.throws(
    () => parseCardVisualDescriptionArgsV1(["--exclude-branches=unknown"]),
    /unsupported excluded branch: unknown/,
  );
  const highValueSample = parseCardVisualDescriptionArgsV1([
    "--dry-run",
    "--provider=openai",
    "--model=test-vision-model",
    "--high-value-sample",
    "--max-cards=50",
    "--concurrency=10",
    "--exclude-branches=energy",
  ]);
  assert.equal(highValueSample.highValueSample, true);
  assert.equal(highValueSample.maxCards, 50);
  assert.equal(highValueSample.concurrency, 10);
  assert.deepEqual(highValueSample.excludeBranches, ["energy"]);
  assert.ok(highValueSample.branchCandidateLimit >= 5000);
  const harvest = parseCardVisualDescriptionArgsV1([
    "--harvest",
    "--provider=openai",
    "--model=test-vision-model",
    "--max-cards=250",
    "--concurrency=10",
    "--exclude-branches=energy",
    "--harvest-max-validation-failure-rate=0.12",
    "--harvest-max-validation-failures=30",
  ]);
  assert.equal(harvest.mode, "harvest");
  assert.equal(harvest.maxCards, 250);
  assert.equal(harvest.concurrency, 10);
  assert.equal(harvest.harvestMaxValidationFailureRate, 0.12);
  assert.equal(harvest.harvestMaxValidationFailures, 30);
  assert.deepEqual(harvest.excludeBranches, ["energy"]);
  assert.throws(
    () => parseCardVisualDescriptionArgsV1([
      "--harvest",
      "--harvest-max-validation-failure-rate=1.5",
    ]),
    /harvest validation failure rate must be between 0 and 1/,
  );
  const explicitIds = Array.from({ length: 50 }, (_, index) => `card-${String(index + 1).padStart(2, "0")}`);
  const explicitIdSample = parseCardVisualDescriptionArgsV1([
    "--dry-run",
    `--card-print-ids=${explicitIds.join(",")}`,
  ]);
  assert.equal(cardVisualSelectionQueryLimitV1(explicitIdSample), 50);
  assert.throws(
    () => parseCardVisualDescriptionArgsV1([
      "--provider=openai",
      "--model=test-vision-model",
      "--high-value-sample",
      "--gv-id=GV-PK-JPN-M5-113",
    ]),
    /high-value sampling cannot be combined/,
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

test("card visual harvest policy quarantines validation failures without blocking preserved rows", () => {
  const generatedRows = Array.from({ length: 46 }, (_, index) => ({
    card_print_id: `valid-${index + 1}`,
    review_status: index % 2 === 0 ? "pending" : "needs_review",
  }));
  const validationFailures = [
    {
      card_print_id: "failed-1",
      gv_id: "GV-PK-N4-11",
      name: "Dark Tyranitar",
      findings: ["fact_graph_semantic_fact_label_not_supported_v1:sem_fact_001"],
    },
    {
      card_print_id: "failed-2",
      gv_id: "GV-PK-MEW-199",
      name: "Charizard ex",
      findings: ["fact_graph_semantic_fact_label_not_supported_v1:semfac03"],
    },
    {
      card_print_id: "failed-3",
      gv_id: "GV-PK-UNB-213",
      name: "Red's Challenge",
      findings: ["fact_graph_semantic_fact_label_not_supported_v1:svf_hair_001"],
    },
    {
      card_print_id: "failed-4",
      gv_id: "GV-PK-PR-XY-XY38",
      name: "Mudkip",
      findings: [
        "fact_graph_object_observation_missing:obs_object_001",
        "fact_graph_search_term_observation_missing:obs_object_001",
      ],
    },
  ];
  const eligibleCards = [...generatedRows, ...validationFailures].map((row) => ({ card_print_id: row.card_print_id }));
  const policy = evaluateHarvestPolicyV1({
    args: {
      mode: "harvest",
      harvestMaxValidationFailureRate: 0.15,
      harvestMaxValidationFailures: null,
    },
    eligibleCards,
    generatedRows,
    validationFailures,
    skippedImages: [],
  });

  assert.equal(policy.enabled, true);
  assert.equal(policy.harvest_status, "completed_with_quarantine");
  assert.equal(policy.validated_count, 46);
  assert.equal(policy.quarantined_count, 4);
  assert.equal(policy.validation_failure_rate, 0.08);
  assert.equal(policy.can_preserve_valid_rows_with_quarantine, true);
  assert.equal(policy.can_keep_harvesting_without_immediate_repair, true);
  assert.match(policy.exact_next_action, /continue bounded harvesting/);
  assert.deepEqual(policy.failure_class_counts, {
    missing_reference_or_backbone_integrity: 1,
    unsupported_or_unrecognized_semantic_fact: 3,
  });

  const quarantineRows = buildValidationQuarantineRowsV1(validationFailures);
  assert.equal(quarantineRows.length, 4);
  assert.equal(quarantineRows[0].failure_class, "unsupported_or_unrecognized_semantic_fact");
  assert.equal(quarantineRows[3].failure_class, "missing_reference_or_backbone_integrity");
  assert.deepEqual(quarantineRows[3].finding_prefixes, [
    "fact_graph_object_observation_missing",
    "fact_graph_search_term_observation_missing",
  ]);

  assert.equal(
    classifyVisualHarvestFailureV1({ findings: ["generation_exception"] }),
    "provider_or_generation_exception",
  );

  const exceeded = evaluateHarvestPolicyV1({
    args: {
      mode: "harvest",
      harvestMaxValidationFailureRate: 0.05,
      harvestMaxValidationFailures: null,
    },
    eligibleCards,
    generatedRows,
    validationFailures,
    skippedImages: [],
  });
  assert.equal(exceeded.harvest_status, "quarantine_threshold_exceeded");
  assert.equal(exceeded.can_preserve_valid_rows_with_quarantine, false);
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

test("card visual language policy treats physical border color as high-risk surface evidence", () => {
  function borderPayload(surfaceText, artworkDescription = "Object/Scene: A centered object is shown with silver and gold illustrated details in the artwork itself.") {
    return {
      artwork_description: artworkDescription,
      card_surface_and_printing_cues: surfaceText,
      visual_attributes: {
        subjects: { primary: ["object"], secondary: [] },
        environment: { setting: [] },
        mood: [],
        distinguishing_details: ["centered object", "simple composition"],
        uncertainty_notes: [],
      },
      semantic_tags: ["centered object", "simple composition", "visible artwork"],
      description_confidence: 0.95,
      attribute_confidence: 0.95,
    };
  }

  const yellowGold = evaluateVisualDescriptionPolicyV1(
    borderPayload("Yellow/gold border visible, printing treatment uncertain."),
    { name: "Old Trainer", prompt_branch: "stadium" },
  );
  assert.ok(yellowGold.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence"
    && result.claim === "Yellow/gold border"));

  const silver = evaluateVisualDescriptionPolicyV1(
    borderPayload("Silver border visible, printing treatment uncertain."),
    { name: "Modern Trainer", prompt_branch: "stadium" },
  );
  assert.ok(silver.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence"
    && result.claim === "Silver border"));

  const black = evaluateVisualDescriptionPolicyV1(
    borderPayload("Black border visible, foil texture cannot be determined."),
    { name: "Dark Border Example", prompt_branch: "pokemon" },
  );
  assert.ok(black.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence"
    && result.claim === "Black border"));

  const ambiguous = evaluateVisualDescriptionPolicyV1(
    borderPayload("Border visible; color cannot be determined reliably because the scan is cropped."),
    { name: "Cropped Border Example", prompt_branch: "trainer" },
  );
  assert.equal(ambiguous.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence"), false);

  const glare = evaluateVisualDescriptionPolicyV1(
    borderPayload("Glare obscures the border; border color uncertain, printing treatment uncertain."),
    { name: "Glare Border Example", prompt_branch: "energy" },
  );
  assert.equal(glare.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence"), false);

  const artworkObjects = detectVisualDescriptionReviewFlagsV1(
    borderPayload(
      "Border visible; color cannot be determined reliably.",
      "Object/Scene: The artwork contains a silver shield and gold emblem, both drawn inside the illustration area.",
    ),
    { name: "Object With Metallic Artwork", prompt_branch: "item_tool_supporter" },
  );
  assert.equal(artworkObjects.includes("potential_border_color_certainty_issue"), false);

  const deterministicEvidence = evaluateVisualDescriptionPolicyV1(
    borderPayload("Silver border visible, printing treatment uncertain."),
    {
      name: "Deterministic Border Example",
      prompt_branch: "stadium",
      border_color_evidence: {
        source: "deterministic_border_pixel_classifier_v1",
        color: "silver",
        confidence: 0.97,
        status: "supported",
      },
    },
  );
  assert.equal(deterministicEvidence.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence"), false);
});

test("card visual auto-approval readiness stays separate from review status", () => {
  function baseRow(overrides = {}) {
    const row = {
      card_print_id: "11111111-1111-4111-8111-111111111111",
      image_sha256: "a".repeat(64),
      image_source_key: "warehouse-derived/self-hosted-images-v1/example.png",
      prompt_version: "CARD_VISUAL_FACT_EXTRACTION_PROMPT_V1",
      output_schema_version: CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION,
      agent_version: CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
      model_version: "gpt-4o-mini",
      prompt_branch: "stadium",
      name: "Example Stadium",
      review_status: "pending",
      ...validFactPayload(),
      quality_flags: [],
      description_confidence: 0.95,
      attribute_confidence: 0.95,
      image_quality_score: 0.92,
      identity_input_confidence: 0.95,
      ...overrides,
    };
    row.description_version_key = buildDescriptionVersionKeyV1(row);
    return row;
  }

  const clean = evaluateAutoApprovalReadinessV1(baseRow());
  assert.equal(clean.auto_approval_eligible, true);
  assert.equal(clean.approval_confidence_tier, "eligible_candidate");
  assert.equal(clean.activation_status, "inactive_calibration_required");

  const row9Like = evaluateAutoApprovalReadinessV1(baseRow({
    name: "Cinnabar City Gym",
    gv_id: "GV-PK-JPN-PMCG6-085",
    visual_attributes: {
      fact_schema_version: CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION,
      fact_graph: validFactGraph({
        observations: [
          ...validFactGraph().observations,
          {
            observation_id: "obs_border_001",
            kind: "surface_scan_cue",
            label: "silver border visible",
            normalized_label: "silver border",
            scene_layer: "card_frame",
            frame_position: "outer_frame",
            visibility: "visible",
            salience: "low",
            confidence: 0.74,
            evidence_strength: "weak",
          },
        ],
        surface_and_scan_cues: [
          {
            observation_id: "obs_border_001",
            cue_type: "border",
            cue: "silver border visible",
            abstention: "",
            confidence: 0.74,
          },
        ],
        coverage_reviews: { surface_and_scan_cues_review: "observed" },
      }),
    },
  }));
  assert.equal(row9Like.auto_approval_eligible, false);
  assert.equal(row9Like.approval_confidence_tier, "human_review_required");
  assert.ok(row9Like.blocker_keys.includes("no_unresolved_border_color_certainty_issue"));
  assert.ok(row9Like.fresh_policy_results.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence"));

  const flagged = evaluateAutoApprovalReadinessV1(baseRow({
    quality_flags: ["potential_interpretive_claim"],
  }));
  assert.equal(flagged.auto_approval_eligible, false);
  assert.ok(flagged.blocker_keys.includes("no_unsupported_personality_emotion_purpose_lore_or_event_claim"));
  assert.equal(flagged.review_status, undefined);
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
  ]);
  for (const row of priorRows.filter((candidate) => previouslyCleanPendingIds.has(candidate.gv_id))) {
    assert.equal(replayStatus(row).status, "pending", row.gv_id);
  }

  const formerlyCleanBorderClaim = replayStatus(priorRows.find((row) => row.gv_id === "GV-PK-JPN-M5-072"));
  assert.equal(formerlyCleanBorderClaim.status, "needs_review", "confident silver-border claim now requires deterministic evidence");
  assert.ok(formerlyCleanBorderClaim.flags.includes("potential_border_color_certainty_issue"));
});

test("field-aware final dry-run repair replays exact misses without dirtying clean pending row", () => {
  function replay(row) {
    const card = {
      name: row.name,
      supertype: row.card_supertype,
      subtype: row.card_subtype,
      card_category: row.card_category,
      prompt_branch: row.prompt_branch,
      card_type_metadata_source: row.card_type_metadata_source,
    };
    const details = detectVisualDescriptionReviewFlagDetailsV1(row, card);
    const flags = [...new Set(details.map((detail) => detail.flag))].sort();
    return {
      details,
      flags,
      policies: evaluateVisualDescriptionPolicyV1(row, card),
      status: classifyDescriptionReviewStatusV1({
        quality_flags: flags,
        identity_input_confidence: row.identity_input_confidence,
        description_confidence: row.description_confidence,
        attribute_confidence: row.attribute_confidence,
        image_quality_score: row.image_quality_score,
      }),
    };
  }

  const rows = source(
    "docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/generated_outputs.jsonl",
  ).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const byGvId = new Map(rows.map((row) => [row.gv_id, row]));

  const misty = replay(byGvId.get("GV-PK-JPN-M5-108"));
  assert.equal(misty.status, "pending");
  assert.equal(misty.flags.includes("potential_unsupported_personality_or_species_interpretation"), false);

  const darkMetalEnergy = replay(byGvId.get("GV-PK-JPN-TCGCOLLECTOR11515-020"));
  assert.equal(darkMetalEnergy.status, "needs_review");
  assert.ok(darkMetalEnergy.policies.some((result) =>
    result.policy_rule === "energy_branch_force_purpose_or_series_claim_requires_review"
    && /abstract representation|invokes/i.test(result.claim)));

  const fossil = replay(byGvId.get("GV-PK-JPN-M5-072"));
  assert.equal(fossil.status, "needs_review");
  assert.ok(fossil.policies.some((result) =>
    result.policy_rule === "item_object_purpose_or_interpretation_requires_review"
    && /sense of discovery|significance/i.test(result.claim)));

  const magneticStorm = replay(byGvId.get("GV-PK-JPN-TCGCOLLECTOR11526-019"));
  assert.equal(magneticStorm.status, "pending");
  assert.equal(magneticStorm.flags.length, 0);

  const excadrill = replay(byGvId.get("GV-PK-JPN-M5-101"));
  assert.ok(excadrill.details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.field === "card_surface_and_printing_cues"));

  const rainbowEnergy = replay(byGvId.get("GV-PK-JPN-L1BSS-070"));
  assert.ok(rainbowEnergy.details.some((detail) =>
    detail.flag === "potential_surface_overclaim"
    && detail.field === "card_surface_and_printing_cues"
    && /standard|texturing|wear|print quality/i.test(detail.matched_text)));

  const zeraora = replay(byGvId.get("GV-PK-JPN-M5-112"));
  assert.ok(zeraora.policies.some((result) =>
    result.policy_rule === "pokemon_personality_or_expression_requires_review"
    && result.claim === "intensity and determination"));
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
      item_tool_supporter: 1,
    }).map((row) => row.card_print_id),
    ["p1", "t1", "s1", "i1"],
  );
  assert.deepEqual(
    filterActiveVisualFactExtractionCardsV1(rows).map((row) => row.card_print_id),
    ["p1", "p2", "t1", "s1", "i1"],
  );

  const highValueRows = [
    {
      card_print_id: "energy-top",
      gv_id: "GV-E",
      name: "Basic Psychic Energy",
      high_value_metric_usd: 999,
      image_url: "https://example.test/e.webp",
    },
    {
      card_print_id: "shared-parent",
      gv_id: "GV-P1",
      name: "Special Illustration Pikachu ex",
      supertype: "Pokemon",
      rarity: "Special Illustration Rare",
      high_value_metric_usd: 50,
      source_card_print_id: "artwork-a",
      image_url: "https://example.test/a.webp",
    },
    {
      card_print_id: "shared-child",
      gv_id: "GV-P2",
      name: "Special Illustration Pikachu ex stamped",
      supertype: "Pokemon",
      rarity: "Special Illustration Rare",
      high_value_metric_usd: 45,
      source_card_print_id: "artwork-a",
      image_url: "https://example.test/a-stamp.webp",
    },
    {
      card_print_id: "trainer-high",
      gv_id: "GV-T",
      name: "Cynthia",
      supertype: "Trainer",
      card_category: "Supporter",
      high_value_metric_usd: 35,
      image_url: "https://example.test/t.webp",
    },
    {
      card_print_id: "fallback-promo",
      gv_id: "GV-F",
      name: "Winner Badge",
      rarity: "Promo",
      image_url: "https://example.test/f.webp",
    },
  ];
  const highValueSample = selectHighValueSampleCardsV1(highValueRows, {
    maxCards: 3,
    excludeBranches: ["energy"],
  });
  assert.deepEqual(highValueSample.map((row) => row.card_print_id), [
    "shared-parent",
    "trainer-high",
    "fallback-promo",
  ]);
  assert.equal(highValueSample[0].high_value_rank, 1);
  assert.equal(highValueSample[0].high_value_selection_reason, "value_view_metric_score");
  assert.ok(highValueSample[2].high_value_selection_signals.some((item) => item.signal === "promo_or_event_signal"));

  const stressRows = [
    {
      card_print_id: "2412563a-c73d-5970-a389-f4c1dc35d8c6",
      gv_id: "prior",
      name: "Prior Mega Chandelure",
      supertype: "Pokemon",
      image_source: "self_hosted",
    },
    { card_print_id: "sp1", gv_id: "GV-SP1", name: "Mega Lucario ex", supertype: "Pokemon", image_source: "self_hosted" },
    { card_print_id: "st1", gv_id: "GV-ST1", name: "Cynthia", supertype: "Trainer", card_category: "Supporter", image_source: "self_hosted" },
    { card_print_id: "ss1", gv_id: "GV-SS1", name: "Forest Stadium", supertype: "Trainer", card_category: "Stadium", image_source: "self_hosted" },
    { card_print_id: "se1", gv_id: "GV-SE1", name: "Psychic Energy", supertype: "Energy", image_source: "self_hosted" },
    { card_print_id: "si1", gv_id: "GV-SI1", name: "Technical Machine", supertype: "Trainer", card_category: "Item", image_source: "self_hosted" },
  ];
  const stressSample = selectV2StressSampleCardsV1(stressRows);
  assert.deepEqual(stressSample.map((row) => row.v2_stress_role), [
    "dense_pokemon_artwork",
    "trainer_person_artwork",
    "environment_heavy_stadium",
    "object_heavy_item",
  ]);
  assert.deepEqual(stressSample.map((row) => row.card_print_id), ["sp1", "st1", "ss1", "si1"]);
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
  assert.equal(estimateUsageCostUsd({
    input_tokens: 1000,
    output_tokens: 500,
    total_tokens: 1500,
    cached_input_tokens: 200,
    reasoning_output_tokens: 0,
  }, {
    input_per_million: 0.15,
    output_per_million: 0.60,
    cached_input_per_million: null,
  }), 0.00045);

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

test("card visual description OpenAI pricing preflight rejects missing or zero rates", () => {
  assert.throws(
    () => assertOpenAiPricingConfigured({
      provider: "openai",
      mode: "dry_run",
      openaiInputCostPerMillion: null,
      openaiOutputCostPerMillion: null,
      openaiCachedInputCostPerMillion: null,
    }),
    /requires positive pricing configuration.*OPENAI_INPUT_COST_PER_MILLION.*OPENAI_OUTPUT_COST_PER_MILLION/,
  );

  assert.throws(
    () => assertOpenAiPricingConfigured({
      provider: "openai",
      mode: "dry_run",
      openaiInputCostPerMillion: 0,
      openaiOutputCostPerMillion: 1.6,
      openaiCachedInputCostPerMillion: null,
    }),
    /OPENAI_INPUT_COST_PER_MILLION/,
  );

  assert.doesNotThrow(() => assertOpenAiPricingConfigured({
    provider: "openai",
    mode: "dry_run",
    openaiInputCostPerMillion: 0.4,
    openaiOutputCostPerMillion: 1.6,
    openaiCachedInputCostPerMillion: null,
  }));

  assert.doesNotThrow(() => assertOpenAiPricingConfigured({
    provider: "fixture",
    mode: "dry_run",
    openaiInputCostPerMillion: null,
    openaiOutputCostPerMillion: null,
    openaiCachedInputCostPerMillion: null,
  }));
});

test("card visual description payload validation separates shape from review approval", () => {
  const validPayload = validFactPayload();

  const validation = validateVisualDescriptionPayloadV1(validPayload);
  assert.equal(validation.ok, true);
  assert.equal(validation.normalized.semantic_tags.join(","), "forest background,ten trees");
  assert.match(validation.normalized.artwork_description, /Fact digest/);
  assert.match(validation.normalized.artwork_description, /Counts: tree: 10/);
  assert.match(validation.normalized.card_surface_and_printing_cues, /foil texture and physical surface finish cannot be determined/);

  const nullishQualityValidation = validateVisualDescriptionPayloadV1({
    ...validPayload,
    quality_flags: ["None", "clear", "high detail"],
  });
  assert.equal(nullishQualityValidation.ok, true);
  assert.equal(nullishQualityValidation.normalized.quality_flags.length, 0);

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

test("card visual fact graph validates observation-backed subjects counts and search terms", () => {
  const valid = validateVisualDescriptionPayloadV1(validFactPayload());
  assert.equal(valid.ok, true);

  const missingObservation = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [
        {
          ...validFactGraph().subjects[0],
          observation_id: "obs_missing",
        },
      ],
    },
  }));
  assert.equal(missingObservation.ok, false);
  assert.ok(missingObservation.findings.includes("fact_graph_subject_observation_missing:obs_missing"));

  const countWithoutSupport = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      counts: [
        {
          ...validFactGraph().counts[0],
          supporting_observation_ids: [],
        },
      ],
    },
  }));
  assert.equal(countWithoutSupport.ok, false);
  assert.ok(countWithoutSupport.findings.includes("fact_graph_count_without_supporting_observation:count_tree_001"));

  const searchWithoutSupport = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      fact_grounded_search_terms: [
        { term: "unsupported term", supporting_observation_ids: ["obs_missing"] },
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
        { term: "Pikachu", supporting_observation_ids: ["obs_subject_001"] },
      ],
    },
  }));
  assert.equal(searchWithoutSupport.ok, false);
  assert.ok(searchWithoutSupport.findings.includes("fact_graph_search_term_observation_missing:obs_missing"));

  const searchTermCitingCount = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      fact_grounded_search_terms: [
        { term: "ten trees", supporting_observation_ids: ["count_tree_001"] },
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
        { term: "Pikachu", supporting_observation_ids: ["obs_subject_001"] },
      ],
    },
  }));
  assert.equal(searchTermCitingCount.ok, true);
  assert.deepEqual(
    searchTermCitingCount.normalized.visual_attributes.fact_graph.fact_grounded_search_terms[0].supporting_observation_ids,
    ["obs_tree_group_001"],
  );

  const oneUsefulSearchTerm = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      fact_grounded_search_terms: [
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
    },
  }));
  assert.equal(oneUsefulSearchTerm.ok, true);
  assert.ok(oneUsefulSearchTerm.normalized.semantic_tags.includes("forest background"));

  const genericSearchTerm = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      fact_grounded_search_terms: [
        { term: "card", supporting_observation_ids: ["obs_subject_001"] },
      ],
    },
  }));
  assert.equal(genericSearchTerm.ok, true);
  assert.equal(genericSearchTerm.normalized.semantic_tags.includes("card"), false);
  assert.equal(genericSearchTerm.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((entry) =>
    entry.term === "card"), false);

  const derivedSearchTerms = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      fact_grounded_search_terms: [],
    },
  }));
  assert.equal(derivedSearchTerms.ok, true);
  assert.ok(derivedSearchTerms.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((entry) =>
    entry.supporting_observation_ids.includes("obs_tree_group_001")));
  assert.equal(derivedSearchTerms.normalized.semantic_tags.includes("Pikachu"), false);

  const derivedFromPrimarySalience = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: validFactGraph().observations.map((observation) =>
        observation.observation_id === "obs_tree_group_001"
          ? { ...observation, salience: "background" }
          : observation),
      fact_grounded_search_terms: [],
      modules: {
        ...validFactGraph().modules,
        fact_grounded_search_terms: {
          ...validFactGraph().modules.fact_grounded_search_terms,
          terms: [],
        },
      },
    },
  }));
  assert.equal(derivedFromPrimarySalience.ok, true);
  assert.ok(derivedFromPrimarySalience.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((entry) =>
    entry.supporting_observation_ids.includes("obs_tree_group_001")));

  const emptyWithoutReview = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      depicted_subjects: [],
      coverage_reviews: { depicted_subjects_review: "" },
    },
  }));
  assert.equal(emptyWithoutReview.ok, false);
  assert.ok(emptyWithoutReview.findings.includes("fact_graph_coverage_review_missing:depicted_subjects_review"));
});

test("card visual fact graph stores semantic visual facts only with supporting evidence", () => {
  const happyGraph = validFactGraph({
    semantic_visual_facts: [
      semanticVisualFact({
        semantic_fact_id: "sem_happy_001",
        label: "happy",
        evidence: {
          mouth: ["smiling mouth"],
          eyes: ["relaxed eyes"],
          body_language: ["arms raised"],
        },
      }),
    ],
    fact_grounded_search_terms: [
      { term: "happy Pikachu", supporting_observation_ids: ["obs_subject_001"] },
      { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
    ],
  });
  const happy = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: happyGraph }));
  assert.equal(happy.ok, true);
  assert.ok(happy.normalized.semantic_tags.includes("happy Pikachu"));
  assert.match(happy.normalized.artwork_description, /Semantic facts: happy/);
  assert.ok(happy.normalized.visual_attributes.fact_graph.canonical_visual_concepts.concepts.some((concept) =>
    concept.concept === "happy"
    && concept.source_observation_ids.includes("obs_subject_001")));

  const sleepingGraph = validFactGraph({
    subjects: [
      {
        ...validFactGraph().subjects[0],
        pose: ["lying down"],
        action_state: ["sleeping"],
        facial_evidence: {
          ...validFactGraph().subjects[0].facial_evidence,
          eyes: "closed eyes",
          mouth: "small relaxed mouth",
        },
      },
    ],
    modules: {
      ...validFactGraph().modules,
      creature_anatomy: {
        ...validFactGraph().modules.creature_anatomy,
        pose_orientation: [
          {
            ...validFactGraph().modules.creature_anatomy.pose_orientation[0],
            pose: ["lying down"],
            action_state: ["sleeping"],
          },
        ],
      },
    },
    semantic_visual_facts: [
      semanticVisualFact({
        semantic_fact_id: "sem_sleeping_001",
        category: "state",
        label: "sleeping",
        evidence: {
          eyes: ["closed eyes"],
          body_position: ["lying down"],
          motion_state: ["still body"],
        },
      }),
    ],
    fact_grounded_search_terms: [
      { term: "sleeping Pokemon", supporting_observation_ids: ["obs_subject_001"] },
      { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
    ],
  });
  const sleeping = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: sleepingGraph }));
  assert.equal(sleeping.ok, true);
  assert.ok(sleeping.normalized.semantic_tags.includes("sleeping Pokemon"));

  const gestureAndStadiumGraph = validFactGraph({
    observations: [
      ...validFactGraph().observations,
      {
        observation_id: "obs_stadium_001",
        kind: "environment",
        label: "stadium setting with field and stands",
        normalized_label: "stadium",
        scene_layer: "background",
        frame_position: "full_frame",
        visibility: "visible",
        salience: "high",
        confidence: 0.98,
        evidence_strength: "strong",
      },
    ],
    semantic_visual_facts: [
      semanticVisualFact({
        semantic_fact_id: "sem_arms_raised_001",
        category: "action",
        label: "arms raised",
        supporting_observation_ids: ["obs_subject_001"],
        evidence: {
          body_language: ["arms raised", "clenched fists"],
        },
      }),
      semanticVisualFact({
        semantic_fact_id: "sem_eyes_closed_001",
        category: "expression",
        label: "eyes closed",
        supporting_observation_ids: ["obs_subject_001"],
        evidence: {
          eyes: ["closed eyes"],
        },
      }),
      semanticVisualFact({
        semantic_fact_id: "sem_posing_001",
        category: "action",
        label: "posing",
        supporting_observation_ids: ["obs_subject_001"],
        evidence: {
          body_language: ["right fist forward", "left fist back"],
          motion_state: ["posing"],
        },
      }),
      semanticVisualFact({
        semantic_fact_id: "sem_stadium_001",
        category: "scene_type",
        label: "stadium",
        subject_observation_id: "",
        supporting_observation_ids: ["obs_stadium_001"],
        evidence: {
          environment: ["stadium setting with field and stands"],
        },
      }),
    ],
  });
  const gestureAndStadium = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: gestureAndStadiumGraph }));
  assert.equal(gestureAndStadium.ok, true, gestureAndStadium.findings.join(","));
  assert.ok(gestureAndStadium.normalized.artwork_description.includes("Semantic facts: arms raised, posing, stadium"));
  assert.deepEqual(
    gestureAndStadium.normalized.visual_attributes.fact_graph.semantic_visual_facts.map((fact) => fact.label),
    ["arms raised", "posing", "stadium"],
  );

  const environmentObjectSemantics = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_cones_001",
          kind: "objects_and_props",
          label: "traffic cones beside the stadium path",
          normalized_label: "traffic cones",
          scene_layer: "foreground",
          frame_position: "lower left",
          visibility: "visible",
          salience: "medium",
          confidence: 0.91,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_sky_001",
          kind: "environment",
          label: "blue sky with clouds",
          normalized_label: "blue sky with clouds",
          scene_layer: "background",
          frame_position: "upper",
          visibility: "visible",
          salience: "medium",
          confidence: 0.92,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_water_001",
          kind: "environment",
          label: "reflective water beside the path",
          normalized_label: "reflective water",
          scene_layer: "background",
          frame_position: "right",
          visibility: "visible",
          salience: "medium",
          confidence: 0.9,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_cones_001",
          category: "environment",
          label: "traffic cones",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_cones_001"],
          evidence: { objects: ["traffic cones beside the path"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_sky_001",
          category: "environment",
          label: "blue sky with clouds",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_sky_001"],
          evidence: { environment: ["blue sky with clouds"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_water_001",
          category: "environment",
          label: "reflective water",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_water_001"],
          evidence: { environment: ["reflective water"] },
        }),
      ],
      fact_grounded_search_terms: [
        { term: "gold foil", supporting_observation_ids: ["obs_palette_001"] },
        { term: "dark energy symbol", supporting_observation_ids: ["obs_subject_001"] },
        { term: "traffic cones", supporting_observation_ids: ["obs_cones_001"] },
        { term: "blue sky with clouds", supporting_observation_ids: ["obs_sky_001"] },
        { term: "reflective water", supporting_observation_ids: ["obs_water_001"] },
      ],
    },
  }));
  assert.equal(environmentObjectSemantics.ok, true, environmentObjectSemantics.findings.join(","));
  const sanitizedTerms = environmentObjectSemantics.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.map((entry) => entry.term);
  assert.ok(sanitizedTerms.includes("traffic cones"));
  assert.ok(sanitizedTerms.includes("blue sky with clouds"));
  assert.ok(sanitizedTerms.includes("reflective water"));
  assert.equal(sanitizedTerms.includes("gold foil"), false);
  assert.equal(sanitizedTerms.includes("dark energy symbol"), false);

  const launchValueSemanticVariance = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_light_bands_001",
          kind: "environment",
          label: "aurora light bands in the sky",
          normalized_label: "aurora light bands",
          scene_layer: "background",
          frame_position: "upper",
          visibility: "visible",
          salience: "medium",
          confidence: 0.93,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_gesture_001",
          kind: "human_appearance",
          label: "left arm extended forward with open hand",
          normalized_label: "left arm extended forward",
          scene_layer: "foreground",
          frame_position: "left",
          visibility: "visible",
          salience: "medium",
          confidence: 0.92,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_table_001",
          kind: "objects_and_props",
          label: "blue table with metallic-looking legs in the background",
          normalized_label: "blue table",
          scene_layer: "background",
          frame_position: "right",
          visibility: "visible",
          salience: "low",
          confidence: 0.86,
          evidence_strength: "moderate",
        },
        {
          observation_id: "obs_electricity_001",
          kind: "visual_effects",
          label: "electricity effects visible around the subject",
          normalized_label: "electricity effects",
          scene_layer: "foreground",
          frame_position: "around subject",
          visibility: "visible",
          salience: "high",
          confidence: 0.94,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_leafy_background_001",
          kind: "environment",
          label: "forest background with glowing green leaves and branches",
          normalized_label: "forest background glowing green leaves branches",
          scene_layer: "background",
          frame_position: "background",
          visibility: "visible",
          salience: "medium",
          confidence: 0.88,
          evidence_strength: "moderate",
        },
        {
          observation_id: "obs_bridge_001",
          kind: "environment",
          label: "pedestrian bridge with cables",
          normalized_label: "pedestrian bridge",
          scene_layer: "background",
          frame_position: "middle",
          visibility: "visible",
          salience: "medium",
          confidence: 0.9,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_stairs_001",
          kind: "environment",
          label: "stone stairs beside wooden fence",
          normalized_label: "stone stairs",
          scene_layer: "foreground",
          frame_position: "bottom",
          visibility: "visible",
          salience: "medium",
          confidence: 0.9,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_explosion_001",
          kind: "visual_effects",
          label: "explosive impact effect",
          normalized_label: "explosive impact effect",
          scene_layer: "background",
          frame_position: "center",
          visibility: "visible",
          salience: "medium",
          confidence: 0.88,
          evidence_strength: "moderate",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_yellow_eyes_001",
          category: "expression",
          label: "yellow eyes",
          evidence: { eyes: ["yellow eyes"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_neutral_mouth_001",
          category: "expression",
          label: "neutral mouth",
          evidence: { mouth: ["neutral mouth"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_generic_human_001",
          category: "cameo",
          label: "female human character",
          evidence: { other: ["female human character"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_attack_intent_001",
          category: "action",
          label: "ready for attack",
          evidence: { body_position: ["forward pose"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_fierce_eyes_001",
          category: "expression",
          label: "fierce eyes",
          evidence: { eyes: ["sharp fierce eyes"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_serious_001",
          category: "expression",
          label: "serious expression",
          evidence: { mouth: ["closed"], facial_features: ["serious expression"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_unclear_expression_001",
          category: "expression",
          label: "cannot_determine_expression",
          evidence: { facial_features: ["face details unclear"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_winking_001",
          category: "expression",
          label: "winking",
          evidence: { eyes: ["one eye winking"], mouth: ["smiling"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_aurora_001",
          category: "environment",
          label: "aurora light bands",
          supporting_observation_ids: ["obs_light_bands_001"],
          evidence: { environment: ["aurora light bands in the sky"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_gesture_001",
          category: "action",
          label: "left arm extended forward with open hand",
          supporting_observation_ids: ["obs_gesture_001"],
          evidence: { body_language: ["left arm extended forward with open hand"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_table_001",
          category: "environment",
          label: "blue table with metallic legs in background",
          supporting_observation_ids: ["obs_table_001"],
          evidence: { objects: ["blue table with metallic-looking legs in the background"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_electricity_001",
          category: "action",
          label: "electricity effects visible",
          supporting_observation_ids: ["obs_electricity_001"],
          evidence: { objects: ["electricity effects visible around the subject"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_forest_branches_001",
          category: "environment",
          label: "forest background",
          supporting_observation_ids: ["obs_leafy_background_001"],
          evidence: { environment: ["glowing green leaves", "branches"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_hands_clasped_001",
          category: "action",
          label: "hands clasped",
          supporting_observation_ids: ["obs_gesture_001"],
          evidence: { body_language: ["hands clasped"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_bridge_001",
          category: "environment",
          label: "pedestrian bridge",
          supporting_observation_ids: ["obs_bridge_001"],
          evidence: { environment: ["bridge with cables"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_stairs_001",
          category: "environment",
          label: "stone stairs",
          supporting_observation_ids: ["obs_stairs_001"],
          evidence: { environment: ["stone stairs"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_fence_001",
          category: "environment",
          label: "wooden fence",
          supporting_observation_ids: ["obs_stairs_001"],
          evidence: { environment: ["wooden fence"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_explosion_001",
          category: "environment",
          label: "explosive impact effect",
          supporting_observation_ids: ["obs_explosion_001"],
          evidence: { environment: ["explosive impact effect"] },
        }),
      ],
    },
  }));
  assert.equal(launchValueSemanticVariance.ok, true, launchValueSemanticVariance.findings.join(","));
  const normalizedSemanticLabels = launchValueSemanticVariance.normalized.visual_attributes.fact_graph.semantic_visual_facts
    .map((fact) => fact.label);
  assert.deepEqual(normalizedSemanticLabels, [
    "winking",
    "aurora light bands",
    "left arm extended forward with open hand",
    "blue table with metallic legs in background",
    "electricity effects visible",
    "forest background",
    "hands clasped",
    "pedestrian bridge",
    "stone stairs",
    "wooden fence",
    "explosive impact effect",
  ]);

  const looseHappy = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      typed_facts: [
        {
          ...validFactGraph().typed_facts[0],
          claim: "Pikachu is happy",
          value: "happy Pikachu",
        },
        ...validFactGraph().typed_facts.slice(1),
      ],
    },
  }));
  assert.equal(looseHappy.ok, true, looseHappy.findings.join("\n"));
  assert.equal(
    /happy/i.test(JSON.stringify(looseHappy.normalized.visual_attributes.fact_graph.typed_facts)),
    false,
  );

  const unsupportedSearch = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      fact_grounded_search_terms: [
        { term: "happy Pikachu", supporting_observation_ids: ["obs_subject_001"] },
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
    },
  }));
  assert.equal(unsupportedSearch.ok, false);
  assert.ok(unsupportedSearch.findings.includes("fact_graph_search_term_without_matching_fact_components:happy Pikachu"));

  const annoyedWithEvidence = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_face_annoyed_001",
          kind: "creature_anatomy",
          label: "narrowed eyes and furrowed brow",
          normalized_label: "narrowed eyes furrowed brow",
          scene_layer: "foreground",
          frame_position: "face",
          visibility: "visible",
          salience: "high",
          confidence: 0.92,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_annoyed_001",
          category: "expression",
          label: "annoyed",
          supporting_observation_ids: ["obs_face_annoyed_001"],
          evidence: {
            mouth: [],
            eyes: ["narrowed eyes"],
            eyebrows: ["furrowed brow"],
          },
        }),
      ],
      fact_grounded_search_terms: [
        { term: "annoyed Pikachu", supporting_observation_ids: ["obs_face_annoyed_001"] },
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
    },
  }));
  assert.equal(annoyedWithEvidence.ok, true, annoyedWithEvidence.findings.join(","));
  assert.ok(
    annoyedWithEvidence.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "annoyed"),
    JSON.stringify(annoyedWithEvidence.normalized.visual_attributes.fact_graph.semantic_visual_facts),
  );

  const scaredWithEvidence = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_face_scared_001",
          kind: "creature_anatomy",
          label: "wide eyes and open mouth",
          normalized_label: "wide eyes open mouth",
          scene_layer: "foreground",
          frame_position: "face",
          visibility: "visible",
          salience: "high",
          confidence: 0.9,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_scared_001",
          category: "expression",
          label: "scared",
          supporting_observation_ids: ["obs_face_scared_001"],
          evidence: {
            eyes: ["wide eyes"],
            mouth: ["open mouth"],
          },
        }),
      ],
    },
  }));
  assert.equal(scaredWithEvidence.ok, true, scaredWithEvidence.findings.join(","));
  assert.ok(scaredWithEvidence.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "scared"));

  const unsupportedAnnoyed = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_bad_annoyed_001",
          category: "expression",
          label: "annoyed expression",
          evidence: {
            mouth: [],
            eyes: ["black eyes with white sclera"],
            eyebrows: ["neutral eyebrows"],
            facial_features: ["annoyed expression"],
          },
        }),
      ],
    },
  }));
  assert.equal(unsupportedAnnoyed.ok, true, unsupportedAnnoyed.findings.join(","));
  assert.equal(
    unsupportedAnnoyed.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => /annoyed/i.test(fact.label)),
    false,
  );

  const ghostlyEnvironment = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_ghost_flame_001",
          kind: "environment",
          label: "purple ghost flame and smoke wisps in background",
          normalized_label: "purple ghost flame smoke wisps",
          scene_layer: "background",
          frame_position: "upper right",
          visibility: "visible",
          salience: "medium",
          confidence: 0.91,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_ghostly_001",
          category: "environment",
          label: "ghostly environment",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_ghost_flame_001"],
          evidence: {
            environment: ["purple ghost flame", "smoke wisps"],
          },
        }),
      ],
      fact_grounded_search_terms: [
        { term: "ghostly environment", supporting_observation_ids: ["obs_ghost_flame_001"] },
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
    },
  }));
  assert.equal(ghostlyEnvironment.ok, true, ghostlyEnvironment.findings.join(","));
  assert.ok(ghostlyEnvironment.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "ghostly environment"));

  const unsupportedGhostlyEnvironment = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_bad_ghostly_001",
          category: "environment",
          label: "ghostly environment",
          subject_observation_id: "",
          evidence: {
            environment: ["ghostly environment"],
          },
        }),
      ],
    },
  }));
  assert.equal(unsupportedGhostlyEnvironment.ok, true, unsupportedGhostlyEnvironment.findings.join(","));
  assert.equal(
    unsupportedGhostlyEnvironment.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => /ghostly/i.test(fact.label)),
    false,
  );

  const nightWithEvidence = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_night_sky_001",
          kind: "environment",
          label: "dark nighttime storm sky",
          normalized_label: "dark nighttime storm sky",
          scene_layer: "background",
          frame_position: "upper",
          visibility: "visible",
          salience: "medium",
          confidence: 0.9,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_night_001",
          category: "time_of_day",
          label: "night",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_night_sky_001"],
          evidence: {
            environment: ["dark nighttime storm sky"],
          },
        }),
      ],
    },
  }));
  assert.equal(nightWithEvidence.ok, true, nightWithEvidence.findings.join(","));
  assert.ok(nightWithEvidence.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "night"));

  const countSemanticWithEvidence = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_two_palms_001",
          kind: "objects_and_props",
          label: "two green palms or leaf plants foreground",
          normalized_label: "green palms or leaves",
          scene_layer: "foreground",
          frame_position: "left and right",
          visibility: "visible",
          salience: "medium",
          confidence: 0.88,
          evidence_strength: "moderate",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_two_palms_001",
          category: "count_semantic",
          label: "two green palms",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_two_palms_001"],
          evidence: {
            environment: ["green palm plants"],
            objects: ["green palms"],
          },
        }),
      ],
    },
  }));
  assert.equal(countSemanticWithEvidence.ok, true, countSemanticWithEvidence.findings.join(","));
  assert.ok(countSemanticWithEvidence.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "two green palms"));

  const contradictedHappy = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_bad_happy_001",
          label: "happy",
          evidence: {
            mouth: ["frowning downturned mouth"],
            eyes: ["face not visible"],
          },
        }),
      ],
    },
  }));
  assert.equal(contradictedHappy.ok, true, contradictedHappy.findings.join(","));
  assert.equal(
    contradictedHappy.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "happy"),
    false,
  );

  const unsupportedStory = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_story_001",
          category: "state",
          label: "protecting a friend",
          evidence: { body_language: ["standing in front of another subject"] },
        }),
      ],
    },
  }));
  assert.equal(unsupportedStory.ok, false);
  assert.ok(unsupportedStory.findings.includes("fact_graph_semantic_fact_story_or_lore_not_allowed:sem_story_001"));

  const birthdayScene = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_cake_001",
          kind: "objects_and_props",
          label: "birthday cake with five lit candles",
          normalized_label: "birthday cake five lit candles",
          scene_layer: "foreground",
          frame_position: "left",
          visibility: "visible",
          salience: "medium",
          confidence: 0.94,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_gift_box_001",
          kind: "objects_and_props",
          label: "wrapped gift box with bow",
          normalized_label: "gift box with bow",
          scene_layer: "foreground",
          frame_position: "right",
          visibility: "visible",
          salience: "medium",
          confidence: 0.9,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_birthday_001",
          category: "scene_type",
          label: "birthday celebration",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_cake_001", "obs_gift_box_001"],
          evidence: { objects: ["birthday cake", "gift box"] },
        }),
      ],
      fact_grounded_search_terms: [
        { term: "birthday cake", supporting_observation_ids: ["obs_cake_001"] },
        { term: "wrapped gift box", supporting_observation_ids: ["obs_gift_box_001"] },
      ],
    },
  }));
  assert.equal(birthdayScene.ok, true, birthdayScene.findings.join(","));
  assert.ok(birthdayScene.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "birthday celebration"));

  const supportedHappyDoesNotLeakIntoActionState = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [{
        ...validFactGraph().subjects[0],
        action_state: ["appearing happy", "looking at cake"],
      }],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_happy_001",
          category: "expression",
          label: "happy",
          supporting_observation_ids: ["obs_subject_001"],
          evidence: {
            mouth: ["open smiling mouth"],
            body_language: ["raised arms"],
          },
        }),
      ],
    },
  }));
  assert.equal(supportedHappyDoesNotLeakIntoActionState.ok, true, supportedHappyDoesNotLeakIntoActionState.findings.join(","));
  assert.deepEqual(
    supportedHappyDoesNotLeakIntoActionState.normalized.visual_attributes.fact_graph.subjects[0].action_state,
    ["looking at cake"],
  );

  const objectiveMouthAndBlushFacts = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_open_jaw_001",
          kind: "creature_anatomy",
          label: "open jaw with sharp teeth",
          normalized_label: "open jaw sharp teeth",
          scene_layer: "foreground",
          frame_position: "mouth",
          visibility: "visible",
          salience: "high",
          confidence: 0.93,
          evidence_strength: "strong",
        },
        {
          observation_id: "obs_blush_cheeks_001",
          kind: "creature_anatomy",
          label: "red blush cheeks",
          normalized_label: "red blush cheeks",
          scene_layer: "foreground",
          frame_position: "face",
          visibility: "visible",
          salience: "medium",
          confidence: 0.9,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_open_jaw_001",
          category: "action",
          label: "open jaw",
          supporting_observation_ids: ["obs_open_jaw_001"],
          evidence: { mouth: ["open jaw with sharp teeth"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_blush_001",
          category: "expression",
          label: "blushing cheeks",
          supporting_observation_ids: ["obs_blush_cheeks_001"],
          evidence: { facial_features: ["red blush cheeks"] },
        }),
      ],
    },
  }));
  assert.equal(objectiveMouthAndBlushFacts.ok, true, objectiveMouthAndBlushFacts.findings.join(","));
  assert.ok(objectiveMouthAndBlushFacts.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "open jaw"));
  assert.ok(objectiveMouthAndBlushFacts.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "blushing cheeks"));

  const absentClothingFact = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      typed_facts: [
        ...validFactGraph().typed_facts,
        {
          fact_id: "fact_clothing_none_001",
          module: "clothing",
          field_path: "none",
          claim: "no_visible_clothing",
          value: "none",
          supporting_observation_ids: [],
          confidence: 1,
          evidence_strength: "strong",
        },
      ],
      modules: {
        ...validFactGraph().modules,
        clothing: {
          ...validFactGraph().modules.clothing,
          fact_ids: [...validFactGraph().modules.clothing.fact_ids, "fact_clothing_none_001"],
        },
      },
    },
  }));
  assert.equal(absentClothingFact.ok, true, absentClothingFact.findings.join(","));
  assert.equal(
    absentClothingFact.normalized.visual_attributes.fact_graph.typed_facts.some((fact) => fact.fact_id === "fact_clothing_none_001"),
    false,
  );

  const cardUiObjectsInArtworkProps = structuredClone(validFactGraph());
  cardUiObjectsInArtworkProps.objects_and_props.push({
    observation_id: "obs_ui_hp_001",
    label: "HP text 280",
    normalized_label: "hp text 280",
    object_type: "card_ui_text",
    colors: ["black"],
    material_appearance: ["printed"],
    location: "top right",
    count_reference: "",
    confidence: 0.98,
  });
  cardUiObjectsInArtworkProps.modules.objects_and_props.object_observation_ids.push("obs_ui_hp_001");
  const cardUiObjectRepair = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: cardUiObjectsInArtworkProps }));
  assert.equal(cardUiObjectRepair.ok, true, cardUiObjectRepair.findings.join(","));
  assert.equal(
    cardUiObjectRepair.normalized.visual_attributes.fact_graph.objects_and_props.some((object) => object.observation_id === "obs_ui_hp_001"),
    false,
  );
  assert.equal(
    cardUiObjectRepair.normalized.visual_attributes.fact_graph.modules.objects_and_props.object_observation_ids.includes("obs_ui_hp_001"),
    false,
  );

  const identityAndWrongIdentitySearchCleanup = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [{
        ...validFactGraph().subjects[0],
        identity: "Celebi",
      }],
      fact_grounded_search_terms: [
        { term: "floating Celebi", supporting_observation_ids: ["obs_subject_001"] },
        { term: "green Pikachu-like Pokemon", supporting_observation_ids: ["obs_subject_001"] },
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
      modules: {
        ...validFactGraph().modules,
        fact_grounded_search_terms: {
          ...validFactGraph().modules.fact_grounded_search_terms,
          terms: ["floating Celebi", "green Pikachu-like Pokemon", "forest background"],
        },
      },
    },
  }));
  assert.equal(identityAndWrongIdentitySearchCleanup.ok, true, identityAndWrongIdentitySearchCleanup.findings.join(","));
  assert.deepEqual(identityAndWrongIdentitySearchCleanup.normalized.semantic_tags, ["floating", "forest background"]);

  const subjectIdentityOnlySemantic = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [{
        ...validFactGraph().subjects[0],
        identity: "Mega Kangaskhan",
      }],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_identity_001",
          category: "scene_type",
          label: "Mega Kangaskhan",
          supporting_observation_ids: ["obs_subject_001"],
          evidence: { facial_features: ["red eyes"], other: ["pouch with baby kangaskhan"] },
        }),
        semanticVisualFact({
          semantic_fact_id: "sem_baby_pouch_001",
          category: "action",
          label: "baby kangaskhan in pouch",
          supporting_observation_ids: ["obs_subject_001"],
          evidence: { other: ["pouch with baby kangaskhan"] },
        }),
      ],
    },
  }));
  assert.equal(subjectIdentityOnlySemantic.ok, true, subjectIdentityOnlySemantic.findings.join(","));
  assert.equal(
    subjectIdentityOnlySemantic.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.semantic_fact_id === "sem_identity_001"),
    false,
  );
  assert.ok(subjectIdentityOnlySemantic.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "baby kangaskhan in pouch"));

  const cardUiPromoStampIsNotCameo = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_ui_promo_stamp_001",
          kind: "promo_stamp",
          label: "PROMO stamp at right edge of illustration",
          normalized_label: "promo stamp",
          scene_layer: "card_frame",
          frame_position: "right_edge",
          visibility: "visible",
          salience: "medium",
          confidence: 0.98,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_promo_stamp_001",
          category: "cameo",
          label: "promo stamp",
          supporting_observation_ids: ["obs_ui_promo_stamp_001"],
          evidence: { objects: ["promo stamp"] },
        }),
      ],
    },
  }));
  assert.equal(cardUiPromoStampIsNotCameo.ok, true, cardUiPromoStampIsNotCameo.findings.join(","));
  assert.equal(
    cardUiPromoStampIsNotCameo.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.semantic_fact_id === "sem_promo_stamp_001"),
    false,
  );

  const subjectIdentityWithPrintSuffixIsNotCameo = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [{
        ...validFactGraph().subjects[0],
        identity: "Salamence ex δ",
      }],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_identity_suffix_001",
          category: "cameo",
          label: "Salamence ex delta",
          supporting_observation_ids: ["obs_subject_001"],
          evidence: {
            mouth: ["open mouth with visible teeth"],
            facial_features: ["face visible"],
          },
        }),
      ],
    },
  }));
  assert.equal(subjectIdentityWithPrintSuffixIsNotCameo.ok, true, subjectIdentityWithPrintSuffixIsNotCameo.findings.join(","));
  assert.equal(
    subjectIdentityWithPrintSuffixIsNotCameo.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.semantic_fact_id === "sem_identity_suffix_001"),
    false,
  );

  const singleSubjectIdentitySceneTypeIsDropped = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [{
        ...validFactGraph().subjects[0],
        identity: "Empoleon",
      }],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_single_identity_001",
          category: "scene_type",
          label: "single Empoleon",
          supporting_observation_ids: ["obs_subject_001", "count_tree_001"],
          evidence: {
            eyes: ["red eyes"],
            body_position: ["upright body"],
          },
        }),
      ],
    },
  }));
  assert.equal(singleSubjectIdentitySceneTypeIsDropped.ok, true, singleSubjectIdentitySceneTypeIsDropped.findings.join(","));
  assert.equal(
    singleSubjectIdentitySceneTypeIsDropped.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.semantic_fact_id === "sem_single_identity_001"),
    false,
  );

  const countIdSemanticSupportIsMappedToObservation = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_count_tree_001",
          category: "count_semantic",
          label: "ten trees",
          supporting_observation_ids: ["count_tree_001"],
          evidence: { other: ["10 visible trees"] },
        }),
      ],
    },
  }));
  assert.equal(countIdSemanticSupportIsMappedToObservation.ok, true, countIdSemanticSupportIsMappedToObservation.findings.join(","));
  assert.deepEqual(
    countIdSemanticSupportIsMappedToObservation.normalized.visual_attributes.fact_graph.semantic_visual_facts
      .find((fact) => fact.semantic_fact_id === "sem_count_tree_001").supporting_observation_ids,
    ["obs_tree_group_001"],
  );

  const extendedClawsWithBodyEvidence = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_extended_claws_001",
          kind: "creature_anatomy",
          label: "clawed hands extended",
          normalized_label: "extended claws",
          scene_layer: "foreground",
          frame_position: "right",
          visibility: "visible",
          salience: "high",
          confidence: 0.94,
          evidence_strength: "strong",
        },
      ],
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_extended_claws_001",
          category: "action",
          label: "extended claws",
          supporting_observation_ids: ["obs_extended_claws_001"],
          evidence: {
            body_language: ["clawed hands extended"],
            body_position: ["upright"],
          },
        }),
      ],
    },
  }));
  assert.equal(extendedClawsWithBodyEvidence.ok, true, extendedClawsWithBodyEvidence.findings.join(","));
  assert.ok(extendedClawsWithBodyEvidence.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "extended claws"));
});

test("card visual fact graph handles forest counts and cameo representation component search", () => {
  const forestSemantic = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_forest_001",
          category: "environment",
          label: "forest",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_tree_group_001"],
          evidence: { environment: ["10 visible trees", "wooded terrain"] },
        }),
      ],
      fact_grounded_search_terms: [
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
        { term: "ten trees", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
    },
  }));
  assert.equal(forestSemantic.ok, true);
  assert.equal(forestSemantic.normalized.semantic_tags.join(","), "forest background,ten trees");

  const denseForest = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      counts: [
        {
          ...validFactGraph().counts[0],
          count_type: "uncountable_due_to_density",
          exact_count: 0,
          estimated_min: 0,
          estimated_max: 0,
          abstention_reason: "tree count cannot be determined because dense overlapping foliage prevents reliable individual counting",
        },
      ],
      fact_grounded_search_terms: [
        { term: "dense forest", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
      modules: {
        ...validFactGraph().modules,
        fact_grounded_search_terms: {
          ...validFactGraph().modules.fact_grounded_search_terms,
          terms: ["dense forest"],
        },
      },
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_dense_forest_001",
          category: "environment",
          label: "forest",
          subject_observation_id: "",
          supporting_observation_ids: ["obs_tree_group_001"],
          evidence: { environment: ["dense overlapping trees", "foliage"] },
        }),
      ],
    },
  }));
  assert.equal(denseForest.ok, true, denseForest.findings.join("\n"));

  const cameoGraph = validFactGraph({
    observations: [
      ...validFactGraph().observations,
      {
        observation_id: "obs_poster_pikachu_001",
        kind: "depicted_subject",
        label: "Pikachu image on poster",
        normalized_label: "Pikachu on poster",
        scene_layer: "background",
        frame_position: "left wall",
        visibility: "partially_visible",
        salience: "medium",
        confidence: 0.82,
        evidence_strength: "moderate",
      },
      {
        observation_id: "obs_pikachu_pillow_001",
        kind: "character_representation",
        label: "Pikachu-shaped pillow",
        normalized_label: "Pikachu pillow",
        scene_layer: "foreground",
        frame_position: "bottom right",
        visibility: "visible",
        salience: "medium",
        confidence: 0.86,
        evidence_strength: "strong",
      },
    ],
    depicted_subjects: [
      {
        observation_id: "obs_poster_pikachu_001",
        subject_kind: "depicted_subject",
        represented_identity: "Pikachu",
        identity_confidence: 0.82,
        host_surface: "poster",
        surface_type: "poster",
        visibility: "partially_visible",
        confidence: 0.82,
      },
    ],
    character_representations: [
      {
        observation_id: "obs_pikachu_pillow_001",
        subject_kind: "character_representation",
        represented_identity: "Pikachu",
        identity_confidence: 0.86,
        host_object: "pillow",
        representation_form: "character-shaped pillow",
        visibility: "visible",
        confidence: 0.86,
      },
    ],
    coverage_reviews: {
      depicted_subjects_review: "observed",
      character_representations_review: "observed",
    },
    modules: {
      ...validFactGraph().modules,
      subjects: {
        ...validFactGraph().modules.subjects,
        depicted_subject_observation_ids: ["obs_poster_pikachu_001"],
        character_representation_observation_ids: ["obs_pikachu_pillow_001"],
      },
    },
    fact_grounded_search_terms: [
      { term: "Pikachu cameo", supporting_observation_ids: ["obs_poster_pikachu_001"] },
      { term: "Pikachu pillow", supporting_observation_ids: ["obs_pikachu_pillow_001"] },
    ],
  });
  const cameo = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: cameoGraph }));
  assert.equal(cameo.ok, true);
  assert.ok(cameo.normalized.semantic_tags.includes("Pikachu cameo"));
  assert.ok(cameo.normalized.semantic_tags.includes("Pikachu pillow"));
});

test("card visual controlled vocabulary preserves raw labels and derives canonical concepts", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.find((observation) => observation.observation_id === "obs_subject_001").label =
    "Pikachu with determined eyes in dynamic leaping pose facing forward and slightly right";
  graph.observations.find((observation) => observation.observation_id === "obs_subject_001").normalized_label =
    "human_trainer visible";
  graph.observations.find((observation) => observation.observation_id === "obs_tree_group_001").label =
    "dark dark sky behind ten trees";
  graph.observations.find((observation) => observation.observation_id === "obs_tree_group_001").normalized_label =
    "dark dark sky";
  graph.subjects[0].pose = ["dynamic leaping pose facing forward and slightly right"];
  graph.subjects[0].orientation = "facing forward and slightly right";
  graph.subjects[0].facial_evidence.eyes = "determined eyes";
  graph.visual_design.style_cues = ["anime style", "detailed fantasy art"];
  graph.fact_grounded_search_terms = [
    { term: "Pikachu", supporting_observation_ids: ["obs_subject_001"] },
    { term: "floating Pokemon", supporting_observation_ids: ["obs_subject_001"] },
    { term: "dark dark sky", supporting_observation_ids: ["obs_tree_group_001"] },
  ];
  graph.modules.fact_grounded_search_terms.terms = ["Pikachu", "floating Pokemon", "dark dark sky"];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true);
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  const subjectObservation = normalizedGraph.observations.find((observation) => observation.observation_id === "obs_subject_001");
  const skyObservation = normalizedGraph.observations.find((observation) => observation.observation_id === "obs_tree_group_001");

  assert.equal(subjectObservation.label, "Pikachu with determined eyes in dynamic leaping pose facing forward and slightly right");
  assert.equal(subjectObservation.normalized_label, "human trainer");
  assert.equal(skyObservation.label, "dark dark sky behind ten trees");
  assert.equal(skyObservation.normalized_label, "dark sky");
  assert.deepEqual(normalizedGraph.subjects[0].pose, ["leaping"]);
  assert.equal(normalizedGraph.subjects[0].orientation, "forward-right");
  assert.equal(normalizedGraph.subjects[0].facial_evidence.eyes, "eyes");
  assert.equal(normalizedGraph.visual_design.style_cues.includes("anime style"), false);
  assert.equal(normalizedGraph.visual_design.style_cues.some((cue) => /\bfantasy\b/i.test(cue)), false);
  assert.equal(validation.normalized.semantic_tags.includes("Pikachu"), false);
  assert.ok(validation.normalized.semantic_tags.includes("floating Pokemon"));
  assert.ok(validation.normalized.semantic_tags.includes("dark sky"));

  const conceptLayer = normalizedGraph.canonical_visual_concepts;
  assert.equal(conceptLayer.concept_schema_version, CARD_VISUAL_CONTROLLED_VOCABULARY_VERSION);
  assert.ok(conceptLayer.concepts.some((concept) =>
    concept.concept === "leaping"
    && concept.source_observation_ids.includes("obs_subject_001")
    && concept.derivation === "deterministic_rule"));
  assert.ok(conceptLayer.concepts.some((concept) =>
    concept.concept === "forward-right orientation"
    && concept.source_observation_ids.includes("obs_subject_001")));
  assert.ok(conceptLayer.concepts.some((concept) =>
    concept.concept === "sky"
    && concept.source_observation_ids.includes("obs_tree_group_001")));
  assert.equal(normalizedGraph.observations.length, graph.observations.length);
  assert.equal(normalizedGraph.typed_facts.length, graph.typed_facts.length);
});

test("card visual controlled vocabulary deduplicates concepts and cleans deterministic drift", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations = [
    ...graph.observations,
    {
      observation_id: "obs_lake_001",
      kind: "water_feature",
      label: "reflective water scene",
      normalized_label: "reflective water scene",
      scene_layer: "background",
      frame_position: "lower_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.91,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_sky_001",
      kind: "sky",
      label: "blue sky with clouds",
      normalized_label: "blue sky with clouds",
      scene_layer: "background",
      frame_position: "upper_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.9,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_building_001",
      kind: "architecture",
      label: "curved building silhouette",
      normalized_label: "curved building",
      scene_layer: "background",
      frame_position: "right_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.89,
      evidence_strength: "strong",
    },
  ];
  graph.subjects[0].identity = "Mega Darkrai";
  graph.subjects[0].pose = ["floating"];
  graph.observations.find((observation) => observation.observation_id === "obs_subject_001").label =
    "Mega Darkrai floating in the foreground";
  graph.observations.find((observation) => observation.observation_id === "obs_subject_001").normalized_label =
    "Mega Darkrai floating";
  graph.observations.find((observation) => observation.observation_id === "obs_palette_001").label =
    "yellow and black palette";
  graph.observations.find((observation) => observation.observation_id === "obs_palette_001").normalized_label =
    "yellow and black palette";
  graph.scene_layers.background = [
    ...graph.scene_layers.background,
    "obs_lake_001",
    "obs_sky_001",
    "obs_building_001",
  ];
  graph.visual_design = {
    ...graph.visual_design,
    palette: ["yellow and black palette"],
    composition: ["reflective water scene", "blue sky with clouds", "curved building"],
    motifs: ["abstract magical background", "comic style drawing"],
    style_cues: ["holographic foil", "comic style drawing"],
    supporting_observation_ids: [
      "obs_subject_001",
      "obs_palette_001",
      "obs_lake_001",
      "obs_sky_001",
      "obs_building_001",
    ],
  };
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_fact_water_001",
      category: "environment",
      label: "water scene",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_lake_001"],
      evidence: { environment: ["reflective water scene"] },
      confidence: 0.84,
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_fact_floating_001",
      category: "state",
      label: "floating",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_subject_001"],
      evidence: { body_position: ["floating body position"] },
      confidence: 0.9,
    }),
  ];
  graph.fact_grounded_search_terms = [
    { term: "floating Mega Darkrai", supporting_observation_ids: ["obs_subject_001"] },
    { term: "yellow and black Mega Darkrai", supporting_observation_ids: ["obs_palette_001"] },
    { term: "water scene", supporting_observation_ids: ["obs_lake_001"] },
    { term: "dark energy symbol", supporting_observation_ids: ["obs_subject_001"] },
    { term: "gold foil", supporting_observation_ids: ["obs_palette_001"] },
  ];
  graph.modules.fact_grounded_search_terms.terms = [
    "floating Mega Darkrai",
    "yellow and black Mega Darkrai",
    "water scene",
    "dark energy symbol",
    "gold foil",
  ];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true);
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  const searchTerms = normalizedGraph.fact_grounded_search_terms.map((entry) => entry.term);

  assert.ok(searchTerms.includes("floating"));
  assert.ok(searchTerms.includes("yellow and black"));
  assert.ok(searchTerms.includes("water body"));
  assert.equal(searchTerms.includes("floating Mega Darkrai"), false);
  assert.equal(searchTerms.includes("yellow and black Mega Darkrai"), false);
  assert.equal(searchTerms.includes("dark energy symbol"), false);
  assert.equal(searchTerms.includes("gold foil"), false);
  assert.ok(normalizedGraph.semantic_visual_facts.some((fact) => fact.label === "water body"));
  assert.equal(normalizedGraph.semantic_visual_facts.some((fact) => fact.label === "water scene"), false);

  const visualDesignText = JSON.stringify(normalizedGraph.visual_design);
  assert.doesNotMatch(visualDesignText, /\b(?:comic style|holographic|foil|magical)\b/i);
  assert.ok(normalizedGraph.visual_design.composition.includes("reflective water body"));

  const concepts = normalizedGraph.canonical_visual_concepts.concepts;
  assert.equal(concepts.filter((concept) => concept.concept === "floating").length, 1);
  assert.equal(concepts.filter((concept) => concept.concept === "water").length, 1);
  const waterConcept = concepts.find((concept) => concept.concept === "water");
  const skyConcept = concepts.find((concept) => concept.concept === "sky");
  const buildingConcept = concepts.find((concept) => concept.concept === "building");
  assert.deepEqual(waterConcept.source_observation_ids, ["obs_lake_001"]);
  assert.deepEqual(skyConcept.source_observation_ids, ["obs_sky_001"]);
  assert.deepEqual(buildingConcept.source_observation_ids, ["obs_building_001"]);
});

test("card visual controlled vocabulary supports substance-cue aliases without storing substance-state claims", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations = [
    ...graph.observations,
    {
      observation_id: "obs_red_eyes_001",
      kind: "creature_anatomy",
      label: "red eyes visible on the subject",
      normalized_label: "red eyes",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.92,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_smoke_cloud_001",
      kind: "visual_effects",
      label: "smoke cloud behind the subject",
      normalized_label: "smoke cloud",
      scene_layer: "midground",
      frame_position: "behind subject",
      visibility: "visible",
      salience: "medium",
      confidence: 0.9,
      evidence_strength: "strong",
    },
  ];
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_under_influence_001",
      category: "state",
      label: "under the influence",
      supporting_observation_ids: ["obs_red_eyes_001", "obs_smoke_cloud_001"],
      evidence: {
        eyes: ["red eyes"],
        environment: ["smoke cloud"],
      },
    }),
  ];
  graph.fact_grounded_search_terms = [
    { term: "stoner Pikachu", supporting_observation_ids: ["obs_red_eyes_001", "obs_smoke_cloud_001"] },
    { term: "high Pikachu", supporting_observation_ids: ["obs_red_eyes_001", "obs_smoke_cloud_001"] },
    { term: "high trainer", supporting_observation_ids: ["obs_red_eyes_001", "obs_smoke_cloud_001"] },
    { term: "red eyes", supporting_observation_ids: ["obs_red_eyes_001"] },
    { term: "smoke cloud", supporting_observation_ids: ["obs_smoke_cloud_001"] },
  ];
  graph.modules.fact_grounded_search_terms.terms = [
    "stoner Pikachu",
    "high Pikachu",
    "high trainer",
    "red eyes",
    "smoke cloud",
  ];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: graph,
    semantic_tags: ["stoner", "red eyes"],
  }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  const storedText = JSON.stringify([
    normalizedGraph.semantic_visual_facts,
    normalizedGraph.fact_grounded_search_terms,
    normalizedGraph.canonical_visual_concepts,
    validation.normalized.semantic_tags,
  ]);
  assert.doesNotMatch(storedText, /\b(?:stoner|under the influence|intoxicated|drugged|stoned)\b/i);
  assert.doesNotMatch(storedText, /\bhigh\b/i);
  assert.ok(normalizedGraph.fact_grounded_search_terms.some((entry) => entry.term === "red eyes"));
  assert.ok(normalizedGraph.fact_grounded_search_terms.some((entry) => entry.term === "smoke cloud"));
  assert.equal(normalizedGraph.semantic_visual_facts.some((fact) => fact.label === "under the influence"), false);
  assert.ok(normalizedGraph.canonical_visual_concepts.concepts.some((concept) =>
    concept.concept === "altered-state visual cue evidence"
    && concept.source_observation_ids.includes("obs_red_eyes_001")
    && concept.source_observation_ids.includes("obs_smoke_cloud_001")));
  assert.ok(normalizedGraph.canonical_visual_concepts.concepts.some((concept) => concept.concept === "red eyes"));
  assert.ok(normalizedGraph.canonical_visual_concepts.concepts.some((concept) => concept.concept === "smoke"));

  const redEyesOnlyGraph = structuredClone(validFactGraph());
  redEyesOnlyGraph.observations = [
    ...redEyesOnlyGraph.observations,
    {
      observation_id: "obs_red_eyes_only_001",
      kind: "creature_anatomy",
      label: "red eyes visible",
      normalized_label: "red eyes",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.92,
      evidence_strength: "strong",
    },
  ];
  redEyesOnlyGraph.fact_grounded_search_terms = [
    { term: "red eyes", supporting_observation_ids: ["obs_red_eyes_only_001"] },
  ];
  const redEyesOnly = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: redEyesOnlyGraph }));
  assert.equal(redEyesOnly.ok, true, redEyesOnly.findings.join(","));
  assert.equal(redEyesOnly.normalized.visual_attributes.fact_graph.canonical_visual_concepts.concepts.some((concept) =>
    concept.concept === "altered-state visual cue evidence"), false);

  const smokeOnlyGraph = structuredClone(validFactGraph());
  smokeOnlyGraph.observations = [
    ...smokeOnlyGraph.observations,
    {
      observation_id: "obs_smoke_only_001",
      kind: "visual_effects",
      label: "smoke plume in background",
      normalized_label: "smoke plume",
      scene_layer: "background",
      frame_position: "right",
      visibility: "visible",
      salience: "medium",
      confidence: 0.9,
      evidence_strength: "strong",
    },
  ];
  smokeOnlyGraph.fact_grounded_search_terms = [
    { term: "smoke plume", supporting_observation_ids: ["obs_smoke_only_001"] },
  ];
  const smokeOnly = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: smokeOnlyGraph }));
  assert.equal(smokeOnly.ok, true, smokeOnly.findings.join(","));
  assert.equal(smokeOnly.normalized.visual_attributes.fact_graph.canonical_visual_concepts.concepts.some((concept) =>
    concept.concept === "altered-state visual cue evidence"), false);

  const objectCueGraph = structuredClone(validFactGraph());
  objectCueGraph.observations = [
    ...objectCueGraph.observations,
    {
      observation_id: "obs_pipe_object_001",
      kind: "objects_and_props",
      label: "pipe-like object held near the mouth",
      normalized_label: "pipe-like object",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "medium",
      confidence: 0.86,
      evidence_strength: "moderate",
    },
  ];
  objectCueGraph.objects_and_props = [
    {
      observation_id: "obs_pipe_object_001",
      label: "pipe-like object held near the mouth",
      normalized_label: "pipe-like object",
      object_type: "visible object",
      colors: ["brown"],
      material_appearance: [],
      location: "near mouth",
      count_reference: "count_pipe_object_001",
      confidence: 0.86,
    },
  ];
  objectCueGraph.counts = [
    ...objectCueGraph.counts,
    {
      count_id: "count_pipe_object_001",
      normalized_label: "pipe-like object",
      count_type: "exact",
      exact_count: 1,
      estimated_min: 0,
      estimated_max: 0,
      abstention_reason: "",
      supporting_observation_ids: ["obs_pipe_object_001"],
      scene_layer: "foreground",
      confidence: 0.86,
    },
  ];
  objectCueGraph.modules.objects_and_props.object_observation_ids = ["obs_pipe_object_001"];
  objectCueGraph.modules.counts.count_ids = [
    ...objectCueGraph.modules.counts.count_ids,
    "count_pipe_object_001",
  ];
  objectCueGraph.module_reviews = objectCueGraph.module_reviews.map((review) =>
    review.module === "objects_and_props" || review.module === "counts"
      ? { ...review, review_status: "complete", omission_risk: "low", evidence_quality: "medium" }
      : review);
  objectCueGraph.coverage_reviews = {
    ...objectCueGraph.coverage_reviews,
    objects_and_props_review: "observed",
    counts_review: "observed",
  };
  objectCueGraph.fact_grounded_search_terms = [
    { term: "pipe-like object", supporting_observation_ids: ["obs_pipe_object_001"] },
  ];

  const objectCue = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: objectCueGraph }));
  assert.equal(objectCue.ok, true, objectCue.findings.join(","));
  assert.ok(objectCue.normalized.visual_attributes.fact_graph.objects_and_props.some((object) =>
    object.observation_id === "obs_pipe_object_001"
    && object.normalized_label === "pipe-like object"));
  assert.ok(objectCue.normalized.visual_attributes.fact_graph.canonical_visual_concepts.concepts.some((concept) =>
    concept.concept === "altered-state visual cue evidence"
    && concept.source_observation_ids.includes("obs_pipe_object_001")));

  const alias = mapVisualSearchAliasQueryV1("high Gengar cards");
  assert.equal(alias.alias_schema_version, CARD_VISUAL_SEARCH_ALIAS_VERSION);
  assert.equal(alias.query_mode, "alias_only");
  assert.ok(alias.matched_aliases.includes("high"));
  assert.deepEqual(alias.canonical_visual_concepts, ["altered-state visual cue evidence"]);
  assert.match(alias.explanation, /does not assert/i);

  const nonAlias = mapVisualSearchAliasQueryV1("High Pressure System");
  assert.deepEqual(nonAlias.matched_aliases, []);
  assert.equal(nonAlias.query_mode, "literal_visual_terms");
  const highContrast = mapVisualSearchAliasQueryV1("high contrast background");
  assert.deepEqual(highContrast.matched_aliases, []);
  assert.equal(highContrast.query_mode, "literal_visual_terms");

  const unsupportedStateFactGraph = structuredClone(validFactGraph());
  unsupportedStateFactGraph.typed_facts[0] = {
    ...unsupportedStateFactGraph.typed_facts[0],
    claim: "Pikachu looks under the influence",
    value: "under the influence",
  };
  const unsupportedStateFact = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unsupportedStateFactGraph }));
  assert.equal(unsupportedStateFact.ok, false);
  assert.ok(unsupportedStateFact.findings.includes("fact_graph_loose_semantic_label_outside_semantic_visual_facts"));
});

function denseItemFactGraph(overrides = {}) {
  return validFactGraph({
    observations: [
      {
        observation_id: "obs_bomb_001",
        kind: "object",
        label: "central bomb",
        normalized_label: "bomb",
        scene_layer: "foreground",
        frame_position: "center",
        visibility: "visible",
        salience: "high",
        confidence: 0.96,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_bomb_body_001",
        kind: "object_detail",
        label: "rounded black body",
        normalized_label: "rounded black body",
        scene_layer: "foreground",
        frame_position: "center",
        visibility: "visible",
        salience: "high",
        confidence: 0.94,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_yellow_band_001",
        kind: "object_detail",
        label: "yellow stripe band",
        normalized_label: "yellow stripe band",
        scene_layer: "foreground",
        frame_position: "across object",
        visibility: "visible",
        salience: "high",
        confidence: 0.93,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_fuse_001",
        kind: "object_detail",
        label: "short fuse",
        normalized_label: "fuse",
        scene_layer: "foreground",
        frame_position: "top",
        visibility: "visible",
        salience: "high",
        confidence: 0.9,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_spark_001",
        kind: "visual_effect",
        label: "spark at fuse tip",
        normalized_label: "spark",
        scene_layer: "foreground",
        frame_position: "top",
        visibility: "visible",
        salience: "high",
        confidence: 0.9,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_radial_lines_001",
        kind: "visual_effect",
        label: "radial orange and yellow lines",
        normalized_label: "radial lines",
        scene_layer: "background",
        frame_position: "surrounding object",
        visibility: "visible",
        salience: "medium",
        confidence: 0.88,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_blue_background_001",
        kind: "background",
        label: "blue background region",
        normalized_label: "blue background",
        scene_layer: "background",
        frame_position: "full frame",
        visibility: "visible",
        salience: "medium",
        confidence: 0.86,
        evidence_strength: "strong",
      },
      {
        observation_id: "obs_centered_composition_001",
        kind: "composition",
        label: "centered close crop",
        normalized_label: "centered close crop",
        scene_layer: "overall",
        frame_position: "full frame",
        visibility: "visible",
        salience: "medium",
        confidence: 0.87,
        evidence_strength: "strong",
      },
    ],
    typed_facts: [
      {
        fact_id: "fact_bomb_001",
        module: "objects_and_props",
        field_path: "objects_and_props[0].normalized_label",
        claim: "one central bomb-like object is visible",
        value: "central bomb",
        supporting_observation_ids: ["obs_bomb_001"],
        confidence: 0.96,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_bomb_detail_001",
        module: "objects_and_props",
        field_path: "objects_and_props[0].material_appearance",
        claim: "the visible object has a dark rounded surface and bright yellow band",
        value: "dark rounded surface; bright yellow band",
        supporting_observation_ids: ["obs_bomb_body_001", "obs_yellow_band_001"],
        confidence: 0.94,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_visual_effect_001",
        module: "visual_effects",
        field_path: "visual_effects.spark",
        claim: "a spark is visible at the fuse tip",
        value: "spark at fuse tip",
        supporting_observation_ids: ["obs_spark_001"],
        confidence: 0.9,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_composition_item_001",
        module: "composition",
        field_path: "visual_design.composition",
        claim: "the object is centered with a close crop and radial background",
        value: "centered close crop with radial background",
        supporting_observation_ids: ["obs_centered_composition_001", "obs_radial_lines_001"],
        confidence: 0.87,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_color_item_001",
        module: "color_and_light",
        field_path: "visual_design.palette",
        claim: "black, yellow, orange, and blue colors are visible",
        value: "black; yellow; orange; blue",
        supporting_observation_ids: ["obs_bomb_001", "obs_yellow_band_001", "obs_radial_lines_001", "obs_blue_background_001"],
        confidence: 0.88,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_count_bomb_001",
        module: "counts",
        field_path: "counts[0].exact_count",
        claim: "bomb exact count is 1",
        value: "1",
        supporting_observation_ids: ["obs_bomb_001"],
        confidence: 0.96,
        evidence_strength: "strong",
      },
      {
        fact_id: "fact_search_item_001",
        module: "fact_grounded_search_terms",
        field_path: "fact_grounded_search_terms",
        claim: "search terms cite the central object, yellow band, and spark",
        value: "central bomb; yellow stripe band; spark at fuse tip",
        supporting_observation_ids: ["obs_bomb_001", "obs_yellow_band_001", "obs_spark_001"],
        confidence: 0.92,
        evidence_strength: "strong",
      },
    ],
    subjects: [],
    counts: [
      {
        count_id: "count_bomb_001",
        normalized_label: "bomb",
        count_type: "exact",
        exact_count: 1,
        estimated_min: 1,
        estimated_max: 1,
        abstention_reason: "",
        supporting_observation_ids: ["obs_bomb_001"],
        scene_layer: "foreground",
        confidence: 0.96,
      },
    ],
    scene_layers: {
      foreground: ["obs_bomb_001", "obs_bomb_body_001", "obs_yellow_band_001", "obs_fuse_001", "obs_spark_001"],
      midground: [],
      background: ["obs_radial_lines_001", "obs_blue_background_001"],
    },
    environment: {
      setting: [],
      indoor_outdoor: "not_applicable",
      sky: [],
      ground: [],
      terrain: [],
      plants: [],
      architecture: [],
      water: [],
      weather: [],
      time_of_day_cues: [],
      supporting_observation_ids: [],
    },
    objects_and_props: [
      {
        observation_id: "obs_bomb_001",
        label: "central bomb",
        normalized_label: "bomb",
        object_type: "item",
        colors: ["black", "yellow"],
        material_appearance: ["dark rounded surface", "bright yellow band"],
        location: "center",
        count_reference: "count_bomb_001",
        confidence: 0.96,
      },
    ],
    surface_and_scan_cues: [],
    uncertainty_and_abstentions: [],
    visual_design: {
      palette: ["black", "yellow", "orange", "blue"],
      lighting: ["bright spark", "high contrast"],
      shadows: [],
      highlights: ["spark highlight"],
      composition: ["centered object", "close crop", "radial background"],
      camera_angle: "straight-on",
      framing: "close crop",
      cropping: [],
      depth: "flat graphic depth",
      motion_cues: ["radial lines"],
      motifs: ["rounded forms", "radial lines"],
      repeated_shapes: ["circular body", "radial lines"],
      style_cues: [],
      supporting_observation_ids: [
        "obs_bomb_001",
        "obs_bomb_body_001",
        "obs_yellow_band_001",
        "obs_spark_001",
        "obs_radial_lines_001",
        "obs_blue_background_001",
        "obs_centered_composition_001",
      ],
    },
    coverage_reviews: {
      subjects_review: "none_visible",
      counts_review: "observed",
      objects_and_props_review: "observed",
      environment_review: "not_applicable",
      visual_design_review: "observed",
      surface_and_scan_cues_review: "not_applicable",
    },
    modules: {
      subjects: {
        fact_ids: [],
        scene_subject_observation_ids: [],
        depicted_subject_observation_ids: [],
        character_representation_observation_ids: [],
      },
      human_appearance: {
        fact_ids: [],
        visible_body_regions: [],
        facial_evidence: [],
        hair: [],
        gestures: [],
        accessories: [],
      },
      creature_anatomy: {
        fact_ids: [],
        body_regions: [],
        physical_features: [],
        pose_orientation: [],
        effects: [],
      },
      clothing: {
        fact_ids: [],
        garments: [],
        accessories: [],
      },
      objects_and_props: {
        fact_ids: ["fact_bomb_001", "fact_bomb_detail_001"],
        object_observation_ids: ["obs_bomb_001", "obs_bomb_body_001", "obs_yellow_band_001", "obs_fuse_001"],
      },
      environment: {
        fact_ids: [],
        observation_ids: [],
      },
      composition: {
        fact_ids: ["fact_composition_item_001"],
        observation_ids: ["obs_centered_composition_001", "obs_radial_lines_001"],
      },
      color_and_light: {
        fact_ids: ["fact_color_item_001"],
        observation_ids: ["obs_bomb_001", "obs_yellow_band_001", "obs_radial_lines_001", "obs_blue_background_001"],
      },
      visual_effects: {
        fact_ids: ["fact_visual_effect_001"],
        observation_ids: ["obs_spark_001", "obs_radial_lines_001"],
      },
      card_ui_and_print_markers: {
        fact_ids: [],
        name_text_observation_ids: [],
        hp_text_observation_ids: [],
        collector_number_observation_ids: [],
        set_symbol_observation_ids: [],
        rarity_mark_observation_ids: [],
        copyright_line_observation_ids: [],
        bottom_line_text_observation_ids: [],
        promo_stamp_observation_ids: [],
        logo_observation_ids: [],
        energy_symbol_observation_ids: [],
        regulation_mark_observation_ids: [],
        illustrator_text_observation_ids: [],
        error_marker_observation_ids: [],
        other_print_marker_observation_ids: [],
      },
      counts: {
        fact_ids: ["fact_count_bomb_001"],
        count_ids: ["count_bomb_001"],
      },
      relationships: {
        fact_ids: [],
        relationship_ids: [],
      },
      surface_and_scan_cues: {
        fact_ids: [],
        observation_ids: [],
      },
      uncertainty_and_abstentions: {
        fact_ids: [],
        fields: [],
      },
      fact_grounded_search_terms: {
        fact_ids: ["fact_search_item_001"],
        terms: ["central bomb", "yellow stripe band", "spark at fuse tip"],
      },
    },
    module_reviews: [
      { module: "subjects", review_status: "none_visible", omission_risk: "none", evidence_quality: "high", abstentions: [] },
      { module: "human_appearance", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "creature_anatomy", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "clothing", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "objects_and_props", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "environment", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "composition", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "color_and_light", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "visual_effects", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "card_ui_and_print_markers", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "counts", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
      { module: "relationships", review_status: "none_visible", omission_risk: "none", evidence_quality: "high", abstentions: [] },
      { module: "surface_and_scan_cues", review_status: "not_applicable", omission_risk: "none", evidence_quality: "not_applicable", abstentions: [] },
      { module: "uncertainty_and_abstentions", review_status: "none_visible", omission_risk: "none", evidence_quality: "high", abstentions: [] },
      { module: "fact_grounded_search_terms", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] },
    ],
    fact_grounded_search_terms: [
      { term: "central bomb", supporting_observation_ids: ["obs_bomb_001"] },
      { term: "yellow stripe band", supporting_observation_ids: ["obs_yellow_band_001"] },
      { term: "spark at fuse tip", supporting_observation_ids: ["obs_spark_001"] },
    ],
    ...overrides,
    coverage_reviews: {
      ...validFactGraph().coverage_reviews,
      subjects_review: "none_visible",
      counts_review: "observed",
      objects_and_props_review: "observed",
      environment_review: "not_applicable",
      visual_design_review: "observed",
      ...(overrides.coverage_reviews ?? {}),
    },
  });
}

test("card visual fact graph enforces grounding ontology and count consistency without quota failures", () => {
  const denseItem = validateVisualDescriptionPayloadV1(
    validFactPayload({ fact_graph: denseItemFactGraph() }),
    { name: "Tremendous Bomb", prompt_branch: "item_tool_supporter" },
  );
  assert.equal(denseItem.ok, true);

  const sparseItem = validateVisualDescriptionPayloadV1(
    validFactPayload(),
    { name: "Tremendous Bomb", prompt_branch: "item_tool_supporter" },
  );
  assert.equal(sparseItem.ok, true);
  assert.equal(sparseItem.findings.some((finding) => finding.startsWith("fact_graph_observation_density_too_low:item_tool_supporter")), false);

  const unsupportedEnvironment = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      environment: {
        ...validFactGraph().environment,
        setting: ["dark forest"],
        supporting_observation_ids: [],
      },
    },
  }));
  assert.equal(unsupportedEnvironment.ok, true, unsupportedEnvironment.findings.join(","));
  assert.deepEqual(unsupportedEnvironment.normalized.visual_attributes.fact_graph.environment.setting, ["dark forest"]);
  assert.ok(unsupportedEnvironment.normalized.visual_attributes.fact_graph.environment.supporting_observation_ids.includes("obs_tree_group_001"));

  const unsupportedIndoorEnvironment = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      environment: {
        ...validFactGraph().environment,
        setting: ["indoor"],
        indoor_outdoor: "indoor",
        sky: [],
        ground: [],
        terrain: [],
        plants: [],
        architecture: [],
        water: [],
        weather: [],
        time_of_day_cues: [],
        supporting_observation_ids: [],
      },
    },
  }));
  assert.equal(unsupportedIndoorEnvironment.ok, true, unsupportedIndoorEnvironment.findings.join(","));
  assert.deepEqual(unsupportedIndoorEnvironment.normalized.visual_attributes.fact_graph.environment.setting, []);
  assert.equal(unsupportedIndoorEnvironment.normalized.visual_attributes.fact_graph.environment.indoor_outdoor, "");

  const objectBackboneRepair = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_palm_trees_001",
          kind: "objects_and_props_tree_group",
          label: "group of palm trees",
          normalized_label: "palm trees",
          scene_layer: "midground",
          frame_position: "left",
          visibility: "visible",
          salience: "high",
          confidence: 0.98,
          evidence_strength: "strong",
        },
      ],
      counts: [
        ...validFactGraph().counts,
        {
          count_id: "count_palm_trees_001",
          normalized_label: "palm trees",
          count_type: "estimated_range",
          exact_count: 0,
          estimated_min: 2,
          estimated_max: 3,
          abstention_reason: "",
          supporting_observation_ids: ["obs_palm_trees_001"],
          scene_layer: "midground",
          confidence: 0.97,
        },
      ],
      objects_and_props: [
        {
          observation_id: "obj_palm_trees_left_001",
          label: "group of palm trees",
          normalized_label: "palm trees",
          object_type: "plant",
          colors: ["green"],
          material_appearance: ["leafy"],
          location: "left midground",
          count_reference: "count_palm_trees_001",
          confidence: 0.98,
        },
      ],
      modules: {
        ...validFactGraph().modules,
        objects_and_props: {
          ...validFactGraph().modules.objects_and_props,
          object_observation_ids: ["obj_palm_trees_left_001"],
        },
      },
      coverage_reviews: {
        objects_and_props_review: "observed",
      },
    },
  }));
  assert.equal(objectBackboneRepair.ok, true, objectBackboneRepair.findings.join(","));
  assert.equal(objectBackboneRepair.normalized.visual_attributes.fact_graph.objects_and_props[0].observation_id, "obs_palm_trees_001");
  assert.deepEqual(
    objectBackboneRepair.normalized.visual_attributes.fact_graph.modules.objects_and_props.object_observation_ids,
    ["obs_palm_trees_001"],
  );

  const stormySkyWithoutWeatherField = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      environment: {
        ...validFactGraph().environment,
        setting: ["stormy cloudy sky"],
        sky: ["stormy", "cloudy"],
        weather: [],
      },
    },
  }));
  assert.equal(stormySkyWithoutWeatherField.ok, true);
  assert.ok(detectVisualDescriptionReviewFlagDetailsV1(stormySkyWithoutWeatherField.normalized).some((detail) =>
    detail.flag === "potential_weather_field_alignment_missing"));

  const unsupportedDesignPayload = validFactPayload({
    fact_graph: {
      visual_design: {
        ...validFactGraph().visual_design,
        composition: ["centered close crop"],
        supporting_observation_ids: [],
      },
    },
  });
  const unsupportedDesign = validateVisualDescriptionPayloadV1(unsupportedDesignPayload);
  assert.equal(unsupportedDesign.ok, true);
  assert.ok(detectVisualDescriptionReviewFlagDetailsV1(unsupportedDesign.normalized).some((detail) =>
    detail.flag === "potential_unsupported_visual_design_claim"
    && detail.field === "visual_attributes.fact_graph.visual_design"));

  const manyWithExactValues = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      counts: [
        {
          ...validFactGraph().counts[0],
          count_type: "many",
          exact_count: 2,
          estimated_min: 2,
          estimated_max: 2,
        },
      ],
      fact_grounded_search_terms: [
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
      modules: {
        ...validFactGraph().modules,
        fact_grounded_search_terms: {
          ...validFactGraph().modules.fact_grounded_search_terms,
          terms: ["forest background"],
        },
      },
    },
  }));
  assert.equal(manyWithExactValues.ok, true, manyWithExactValues.findings.join("\n"));
  assert.equal(manyWithExactValues.normalized.visual_attributes.fact_graph.counts[0].count_type, "exact");
  assert.equal(manyWithExactValues.normalized.visual_attributes.fact_graph.counts[0].exact_count, 2);

  const estimatedRangeWithExactValue = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      counts: [
        {
          ...validFactGraph().counts[0],
          count_type: "estimated_range",
          exact_count: 5,
          estimated_min: 4,
          estimated_max: 6,
        },
      ],
      fact_grounded_search_terms: [
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
      modules: {
        ...validFactGraph().modules,
        fact_grounded_search_terms: {
          ...validFactGraph().modules.fact_grounded_search_terms,
          terms: ["forest background"],
        },
      },
    },
  }));
  assert.equal(estimatedRangeWithExactValue.ok, true, estimatedRangeWithExactValue.findings.join("\n"));
  assert.equal(estimatedRangeWithExactValue.normalized.visual_attributes.fact_graph.counts[0].exact_count, 0);

  const exactCountWithStaleRange = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      counts: [
        {
          ...validFactGraph().counts[0],
          count_type: "exact",
          exact_count: 10,
          estimated_min: 1,
          estimated_max: 1,
        },
      ],
    },
  }));
  assert.equal(exactCountWithStaleRange.ok, true, exactCountWithStaleRange.findings.join("\n"));
  assert.equal(exactCountWithStaleRange.normalized.visual_attributes.fact_graph.counts[0].estimated_min, 0);
  assert.equal(exactCountWithStaleRange.normalized.visual_attributes.fact_graph.counts[0].estimated_max, 0);

  const badObjectCountAndMaterialPayload = validFactPayload({
    fact_graph: denseItemFactGraph({
      objects_and_props: [
        {
          ...denseItemFactGraph().objects_and_props[0],
          material_appearance: ["metal", "plastic"],
          count_reference: "not_visible",
        },
      ],
    }),
  });
  const badObjectCountAndMaterial = validateVisualDescriptionPayloadV1(badObjectCountAndMaterialPayload);
  assert.equal(badObjectCountAndMaterial.ok, true);
  const badObjectDetails = detectVisualDescriptionReviewFlagDetailsV1(badObjectCountAndMaterial.normalized);
  assert.ok(badObjectDetails.some((detail) =>
    detail.flag === "potential_count_reference_inconsistent"
    && detail.matched_text.includes("obs_bomb_001")));
  assert.deepEqual(
    badObjectCountAndMaterial.normalized.visual_attributes.fact_graph.objects_and_props[0].material_appearance,
    ["metal-like appearance", "plastic-like appearance"],
  );
  assert.equal(badObjectDetails.some((detail) =>
    detail.flag === "potential_actual_material_claim_without_visual_evidence"), false);

  const coverageConflict = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: validFactGraph().subjects,
      coverage_reviews: { subjects_review: "none_visible" },
    },
  }));
  assert.equal(coverageConflict.ok, false);
  assert.ok(coverageConflict.findings.includes("fact_graph_coverage_review_conflicts_with_entries:subjects_review"));

  const energyIdentityTermPayload = validFactPayload({
      fact_graph: denseItemFactGraph({
        subjects: [],
        fact_grounded_search_terms: [
          { term: "Psychic Energy", supporting_observation_ids: ["obs_bomb_001"] },
          { term: "purple gradient", supporting_observation_ids: ["obs_blue_background_001"] },
          { term: "centered emblem", supporting_observation_ids: ["obs_centered_composition_001"] },
        ],
      }),
  });
  const energyIdentityTerm = validateVisualDescriptionPayloadV1(
    energyIdentityTermPayload,
    { name: "Psychic Energy", prompt_branch: "energy" },
  );
  assert.equal(energyIdentityTerm.ok, true);
  const energyIdentityDetails = detectVisualDescriptionReviewFlagDetailsV1(
    energyIdentityTerm.normalized,
    { name: "Psychic Energy", prompt_branch: "energy" },
  );
  assert.ok(energyIdentityDetails.some((detail) =>
    detail.flag === "potential_canonical_metadata_in_fact_grounded_search_terms"
    && detail.matched_text === "Psychic Energy"));
});

test("card visual fact graph separates card UI print-marker evidence from artwork facts", () => {
  const valid = validateVisualDescriptionPayloadV1(validFactPayload());
  assert.equal(valid.ok, true);
  const cardUiModule = valid.normalized.visual_attributes.fact_graph.modules.card_ui_and_print_markers;
  assert.deepEqual(cardUiModule.hp_text_observation_ids, ["obs_ui_hp_001"]);
  assert.deepEqual(cardUiModule.collector_number_observation_ids, ["obs_ui_collector_001"]);
  assert.deepEqual(cardUiModule.copyright_line_observation_ids, ["obs_ui_copyright_001"]);
  assert.deepEqual(cardUiModule.logo_observation_ids, ["obs_ui_logo_001"]);
  assert.deepEqual(cardUiModule.error_marker_observation_ids, ["obs_ui_error_marker_001"]);
  assert.equal(valid.normalized.semantic_tags.some((tag) => /\bHP 280\b|118\/081|WB Kids/i.test(tag)), false);

  const hpInHuman = structuredClone(validFactGraph());
  hpInHuman.typed_facts.push({
    fact_id: "fact_bad_ui_human_001",
    module: "human_appearance",
    field_path: "human_appearance.accessories[0]",
    claim: "HP text is human appearance",
    value: "HP 280",
    supporting_observation_ids: ["obs_ui_hp_001"],
    confidence: 0.9,
    evidence_strength: "strong",
  });
  hpInHuman.modules.human_appearance.fact_ids.push("fact_bad_ui_human_001");
  const badHuman = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: hpInHuman }));
  assert.equal(badHuman.ok, true, badHuman.findings.join("\n"));
  assert.equal(
    badHuman.normalized.visual_attributes.fact_graph.modules.human_appearance.fact_ids.includes("fact_bad_ui_human_001"),
    false,
  );
  assert.equal(
    badHuman.normalized.visual_attributes.fact_graph.modules.card_ui_and_print_markers.fact_ids.includes("fact_bad_ui_human_001"),
    true,
  );

  const collectorInCreature = structuredClone(validFactGraph());
  collectorInCreature.typed_facts.push({
    fact_id: "fact_bad_ui_creature_001",
    module: "creature_anatomy",
    field_path: "creature_anatomy.physical_features[0]",
    claim: "collector number is creature anatomy",
    value: "118/081",
    supporting_observation_ids: ["obs_ui_collector_001"],
    confidence: 0.9,
    evidence_strength: "strong",
  });
  collectorInCreature.modules.creature_anatomy.fact_ids.push("fact_bad_ui_creature_001");
  const badCreature = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: collectorInCreature }));
  assert.equal(badCreature.ok, true, badCreature.findings.join("\n"));
  assert.equal(
    badCreature.normalized.visual_attributes.fact_graph.modules.creature_anatomy.fact_ids.includes("fact_bad_ui_creature_001"),
    false,
  );
  assert.equal(
    badCreature.normalized.visual_attributes.fact_graph.modules.card_ui_and_print_markers.fact_ids.includes("fact_bad_ui_creature_001"),
    true,
  );

  const uiObjectLeak = structuredClone(validFactGraph());
  uiObjectLeak.objects_and_props.push({
    observation_id: "obs_ui_logo_001",
    label: "WB Kids logo",
    normalized_label: "wb kids logo",
    object_type: "card ui logo",
    colors: ["black", "white"],
    material_appearance: [],
    location: "right_edge",
    count_reference: "",
    confidence: 0.93,
  });
  uiObjectLeak.coverage_reviews.objects_and_props_review = "observed";
  const badObject = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: uiObjectLeak }));
  assert.equal(badObject.ok, true);
  assert.equal(
    badObject.normalized.visual_attributes.fact_graph.objects_and_props.some((object) => object.observation_id === "obs_ui_logo_001"),
    false,
  );

  const unsupportedCanonicalUi = structuredClone(validFactGraph());
  unsupportedCanonicalUi.typed_facts.push({
    fact_id: "fact_ui_name_missing_001",
    module: "card_ui_and_print_markers",
    field_path: "card_ui_and_print_markers.name_text",
    claim: "card name text is visible",
    value: "Pikachu",
    supporting_observation_ids: ["obs_missing_card_name_001"],
    confidence: 0.96,
    evidence_strength: "strong",
  });
  unsupportedCanonicalUi.modules.card_ui_and_print_markers.fact_ids.push("fact_ui_name_missing_001");
  unsupportedCanonicalUi.modules.card_ui_and_print_markers.name_text_observation_ids.push("obs_missing_card_name_001");
  const badCanonicalCopy = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unsupportedCanonicalUi }));
  assert.equal(badCanonicalCopy.ok, false);
  assert.ok(badCanonicalCopy.findings.includes("fact_graph_typed_fact_observation_missing:obs_missing_card_name_001"));

  const orphanUiReference = structuredClone(validFactGraph());
  orphanUiReference.modules.card_ui_and_print_markers.name_text_observation_ids.push("obs_orphan_ui_name_001");
  const orphanUi = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: orphanUiReference }));
  assert.equal(orphanUi.ok, true);
  assert.equal(
    orphanUi.normalized.visual_attributes.fact_graph.modules.card_ui_and_print_markers.name_text_observation_ids.includes("obs_orphan_ui_name_001"),
    false,
  );

  const unreadableBottomText = structuredClone(validFactGraph());
  unreadableBottomText.observations.push({
    observation_id: "obs_ui_bottom_unreadable_001",
    kind: "bottom_line_text",
    label: "bottom legal text is unreadable",
    normalized_label: "unreadable bottom text",
    scene_layer: "card_frame",
    frame_position: "bottom_edge",
    visibility: "cannot_determine_due_to_low_resolution",
    salience: "low",
    confidence: 0.8,
    evidence_strength: "abstention",
  });
  unreadableBottomText.modules.card_ui_and_print_markers.bottom_line_text_observation_ids.push("obs_ui_bottom_unreadable_001");
  unreadableBottomText.module_reviews.find((review) => review.module === "card_ui_and_print_markers").abstentions.push({
    field_path: "card_ui_and_print_markers.bottom_line_text",
    reason: "text is too small at the available image resolution",
    affected_observation_ids: ["obs_ui_bottom_unreadable_001"],
  });
  const unreadable = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unreadableBottomText }));
  assert.equal(unreadable.ok, true);

  const inventedAbstentionObservation = structuredClone(validFactGraph());
  inventedAbstentionObservation.module_reviews.find((review) => review.module === "card_ui_and_print_markers").abstentions.push({
    field_path: "card_ui_and_print_markers.bottom_line_text",
    reason: "text is too small at the available image resolution",
    affected_observation_ids: ["obs_invented_bottom_text_001"],
  });
  const inventedAbstention = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: inventedAbstentionObservation }));
  assert.equal(inventedAbstention.ok, true);
  const normalizedUiReview = inventedAbstention.normalized.visual_attributes.fact_graph.module_reviews
    .find((review) => review.module === "card_ui_and_print_markers");
  assert.deepEqual(normalizedUiReview.abstentions.at(-1).affected_observation_ids, []);

  const inventedUncertaintyObservation = structuredClone(validFactGraph());
  inventedUncertaintyObservation.uncertainty_and_abstentions.push({
    field: "card_ui_and_print_markers.hp_text",
    reason: "HP text is partially obscured by glare",
    affected_observation_ids: ["obs_invented_hp_text_001"],
  });
  const inventedUncertainty = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: inventedUncertaintyObservation }));
  assert.equal(inventedUncertainty.ok, true);
  assert.deepEqual(
    inventedUncertainty.normalized.visual_attributes.fact_graph.uncertainty_and_abstentions.at(-1).affected_observation_ids,
    [],
  );

  const unreadableUiWithoutAbstention = structuredClone(validFactGraph());
  unreadableUiWithoutAbstention.observations.push({
    observation_id: "obs_ui_bottom_weak_001",
    kind: "card_ui_text",
    label: "bottom center text is unreadable",
    normalized_label: "bottom_line_text_unreadable",
    scene_layer: "foreground",
    frame_position: "bottom-center",
    visibility: "visible",
    salience: "low",
    confidence: 0.4,
    evidence_strength: "weak",
  });
  unreadableUiWithoutAbstention.modules.card_ui_and_print_markers.bottom_line_text_observation_ids.push("obs_ui_bottom_weak_001");
  const unreadableUiRepaired = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unreadableUiWithoutAbstention }));
  assert.equal(unreadableUiRepaired.ok, true, unreadableUiRepaired.findings.join(","));
  const repairedUiReview = unreadableUiRepaired.normalized.visual_attributes.fact_graph.module_reviews
    .find((review) => review.module === "card_ui_and_print_markers");
  assert.ok(repairedUiReview.abstentions.some((entry) =>
    entry.affected_observation_ids.includes("obs_ui_bottom_weak_001")));

  const inArtworkSign = structuredClone(validFactGraph());
  inArtworkSign.observations.push({
    observation_id: "obs_artwork_sign_001",
    kind: "visual_text",
    label: "text on a wooden sign inside the forest artwork",
    normalized_label: "in artwork sign text",
    scene_layer: "background",
    frame_position: "left_background",
    visibility: "visible",
    salience: "low",
    confidence: 0.88,
    evidence_strength: "strong",
  });
  inArtworkSign.typed_facts.push({
    fact_id: "fact_artwork_sign_001",
    module: "environment",
    field_path: "environment.signage",
    claim: "a wooden sign with visible text appears inside the artwork scene",
    value: "wooden sign with text",
    supporting_observation_ids: ["obs_artwork_sign_001"],
    confidence: 0.88,
    evidence_strength: "strong",
  });
  inArtworkSign.modules.environment.fact_ids.push("fact_artwork_sign_001");
  inArtworkSign.modules.environment.observation_ids.push("obs_artwork_sign_001");
  inArtworkSign.scene_layers.background.push("obs_artwork_sign_001");
  inArtworkSign.environment.supporting_observation_ids.push("obs_artwork_sign_001");
  const sign = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: inArtworkSign }));
  assert.equal(sign.ok, true);

  const missingUiReview = structuredClone(validFactGraph());
  missingUiReview.module_reviews = missingUiReview.module_reviews.filter((review) => review.module !== "card_ui_and_print_markers");
  const missingReview = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: missingUiReview }));
  assert.equal(missingReview.ok, true, missingReview.findings.join(","));
  const derivedUiReview = missingReview.normalized.visual_attributes.fact_graph.module_reviews
    .find((review) => review.module === "card_ui_and_print_markers");
  assert.equal(derivedUiReview.review_status, "uncertain");
  assert.equal(derivedUiReview.omission_risk, "unknown");

  const uiSearchTerm = structuredClone(validFactGraph());
  uiSearchTerm.fact_grounded_search_terms = [
    ...uiSearchTerm.fact_grounded_search_terms,
    { term: "HP 280", supporting_observation_ids: ["obs_ui_hp_001"] },
  ];
  uiSearchTerm.modules.fact_grounded_search_terms.terms.push("HP 280");
  const uiSearchValidation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: uiSearchTerm }));
  assert.equal(uiSearchValidation.ok, true);
  assert.equal(
    uiSearchValidation.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((term) => term.term === "HP 280"),
    false,
  );
  assert.equal(detectVisualDescriptionReviewFlagDetailsV1(uiSearchValidation.normalized).some((detail) =>
    detail.flag === "potential_card_ui_text_in_artwork_search_terms"), false);

  assert.equal(
    buildFactGraphCompatibilityDigestV1(validFactGraph()),
    buildFactGraphCompatibilityDigestV1(validFactGraph()),
  );
});

test("card visual fact graph keeps subject kinds and expression evidence separate", () => {
  const livingPikachu = validateVisualDescriptionPayloadV1(validFactPayload());
  assert.equal(livingPikachu.ok, true);

  const blankSubjectIdentity = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [
        {
          ...validFactGraph().subjects[0],
          identity: "",
          identity_confidence: 0,
        },
      ],
    },
  }));
  assert.equal(blankSubjectIdentity.ok, true);
  assert.equal(blankSubjectIdentity.normalized.visual_attributes.fact_graph.subjects[0].identity, "Pikachu");
  assert.equal(blankSubjectIdentity.normalized.visual_attributes.fact_graph.subjects[0].identity_confidence, 0.5);

  const depictedPikachu = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_poster_001",
          kind: "depicted_subject",
          label: "Pikachu shown on a poster",
          normalized_label: "pikachu poster",
          scene_layer: "background",
          frame_position: "upper_left",
          visibility: "visible",
          salience: "low",
          confidence: 0.82,
          evidence_strength: "moderate",
        },
      ],
      depicted_subjects: [
        {
          observation_id: "obs_poster_001",
          subject_kind: "depicted_subject",
          represented_identity: "Pikachu",
          identity_confidence: 0.82,
          host_surface: "poster",
          surface_type: "poster",
          visibility: "visible",
          confidence: 0.82,
        },
      ],
      scene_layers: {
        ...validFactGraph().scene_layers,
        background: ["obs_tree_group_001", "obs_poster_001"],
      },
      coverage_reviews: { depicted_subjects_review: "observed" },
      fact_grounded_search_terms: [
        ...validFactGraph().fact_grounded_search_terms,
        { term: "Pikachu poster", supporting_observation_ids: ["obs_poster_001"] },
      ],
    },
  }));
  assert.equal(depictedPikachu.ok, true);

  const representedPikachu = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_pillow_001",
          kind: "character_representation",
          label: "Pikachu-shaped pillow",
          normalized_label: "pikachu pillow",
          scene_layer: "foreground",
          frame_position: "lower_right",
          visibility: "visible",
          salience: "medium",
          confidence: 0.87,
          evidence_strength: "moderate",
        },
      ],
      character_representations: [
        {
          observation_id: "obs_pillow_001",
          subject_kind: "character_representation",
          represented_identity: "Pikachu",
          identity_confidence: 0.87,
          host_object: "pillow",
          representation_form: "pillow shaped like Pikachu",
          visibility: "visible",
          confidence: 0.87,
        },
      ],
      scene_layers: {
        ...validFactGraph().scene_layers,
        foreground: ["obs_subject_001", "obs_pillow_001"],
      },
      coverage_reviews: { character_representations_review: "observed" },
      fact_grounded_search_terms: [
        ...validFactGraph().fact_grounded_search_terms,
        { term: "Pikachu pillow", supporting_observation_ids: ["obs_pillow_001"] },
      ],
    },
  }));
  assert.equal(representedPikachu.ok, true, representedPikachu.findings.join("\n"));

  const interpretedExpression = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      subjects: [
        {
          ...validFactGraph().subjects[0],
          facial_evidence: {
            ...validFactGraph().subjects[0].facial_evidence,
            eyes: "angry eyes",
          },
        },
      ],
    },
  }));
  assert.equal(interpretedExpression.ok, true, interpretedExpression.findings.join(","));
  assert.equal(
    interpretedExpression.normalized.visual_attributes.fact_graph.subjects[0].facial_evidence.eyes,
    "eyes",
  );

  const story = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      observations: [
        {
          ...validFactGraph().observations[0],
          label: "Pikachu is lost in the forest",
        },
        ...validFactGraph().observations.slice(1),
      ],
    },
  }));
  assert.equal(story.ok, true);
  assert.equal(
    story.normalized.visual_attributes.fact_graph.observations[0].label,
    "Pikachu is lost in the forest",
  );
  assert.equal(story.normalized.visual_attributes.fact_graph.observations[0].normalized_label, "pikachu");

  assert.equal(
    buildFactGraphCompatibilityDigestV1(validFactGraph()),
    buildFactGraphCompatibilityDigestV1(validFactGraph()),
  );
});

test("card visual fact graph repairs evidence-backed live-lock validation misses", () => {
  const determinedGraph = structuredClone(validFactGraph());
  determinedGraph.observations.push({
    observation_id: "obs_face_determined_001",
    kind: "creature_anatomy",
    label: "sharp focused eyes with angular eyebrows",
    normalized_label: "sharp focused eyes angular eyebrows",
    scene_layer: "foreground",
    frame_position: "face",
    visibility: "visible",
    salience: "high",
    confidence: 0.95,
    evidence_strength: "strong",
  });
  determinedGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_determined_001",
      category: "expression",
      label: "determined expression",
      supporting_observation_ids: ["obs_face_determined_001"],
      evidence: {
        mouth: ["slightly open mouth"],
        eyes: ["sharp focused eyes"],
        eyebrows: ["angular eyebrows"],
      },
    }),
  ];
  const determined = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: determinedGraph }));
  assert.equal(determined.ok, true, determined.findings.join(","));
  assert.ok(determined.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "determined expression"));

  const smilingSearchGraph = structuredClone(validFactGraph());
  smilingSearchGraph.observations.push({
    observation_id: "obs_human_face_001",
    kind: "human_appearance",
    label: "human face with open eyes and smiling mouth",
    normalized_label: "open eyes smiling mouth",
    scene_layer: "foreground",
    frame_position: "face",
    visibility: "visible",
    salience: "high",
    confidence: 0.98,
    evidence_strength: "strong",
  });
  smilingSearchGraph.modules.human_appearance = {
    ...smilingSearchGraph.modules.human_appearance,
    facial_evidence: [
      {
        subject_observation_id: "obs_subject_001",
        face_position: "frontal",
        eyes: "open eyes",
        mouth: "smiling mouth",
        eyebrows: "neutral",
        other_visible_evidence: [],
        supporting_observation_ids: ["obs_human_face_001"],
        confidence: 0.98,
      },
    ],
  };
  smilingSearchGraph.module_reviews = smilingSearchGraph.module_reviews.map((review) =>
    review.module === "human_appearance"
      ? { ...review, review_status: "complete", omission_risk: "low", evidence_quality: "high" }
      : review);
  smilingSearchGraph.fact_grounded_search_terms = [
    { term: "human face with open eyes and smiling mouth", supporting_observation_ids: ["obs_human_face_001"] },
    { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
  ];
  smilingSearchGraph.modules.fact_grounded_search_terms.terms = [
    "human face with open eyes and smiling mouth",
    "forest background",
  ];
  const smilingSearch = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: smilingSearchGraph }));
  assert.equal(smilingSearch.ok, true, smilingSearch.findings.join(","));
  assert.ok(smilingSearch.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((term) =>
    term.term === "human face with open eyes and smiling mouth"));

  const referenceTypoGraph = structuredClone(validFactGraph());
  referenceTypoGraph.observations.push({
    observation_id: "obs_clothing_005",
    kind: "clothing",
    label: "purple tinted glasses lenses",
    normalized_label: "purple tinted glasses lenses",
    scene_layer: "foreground",
    frame_position: "face",
    visibility: "visible",
    salience: "medium",
    confidence: 0.9,
    evidence_strength: "strong",
  });
  referenceTypoGraph.typed_facts.push({
    fact_id: "fact_glasses_001",
    module: "human_appearance",
    field_path: "glasses[0]",
    claim: "purple tinted glasses lenses are visible",
    value: "purple tinted glasses lenses",
    supporting_observation_ids: ["obs_clothes_005"],
    confidence: 0.9,
    evidence_strength: "strong",
  });
  referenceTypoGraph.modules.human_appearance.fact_ids.push("fact_glasses_001");
  referenceTypoGraph.module_reviews = referenceTypoGraph.module_reviews.map((review) =>
    review.module === "human_appearance"
      ? { ...review, review_status: "complete", omission_risk: "low", evidence_quality: "high" }
      : review);
  const referenceTypo = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: referenceTypoGraph }));
  assert.equal(referenceTypo.ok, true, referenceTypo.findings.join(","));
  assert.deepEqual(
    referenceTypo.normalized.visual_attributes.fact_graph.typed_facts
      .find((fact) => fact.fact_id === "fact_glasses_001").supporting_observation_ids,
    ["obs_clothing_005"],
  );

  const countSemanticGraph = structuredClone(validFactGraph());
  countSemanticGraph.observations.push({
    observation_id: "obs_traffic_cones_001",
    kind: "counts",
    label: "four orange and white traffic cones",
    normalized_label: "traffic cones",
    scene_layer: "foreground",
    frame_position: "lower_left",
    visibility: "visible",
    salience: "medium",
    confidence: 0.99,
    evidence_strength: "strong",
  });
  countSemanticGraph.counts.push({
    count_id: "count_cone_001",
    normalized_label: "traffic cones",
    count_type: "exact",
    exact_count: 4,
    estimated_min: 0,
    estimated_max: 0,
    abstention_reason: "",
    supporting_observation_ids: ["obs_traffic_cones_001"],
    scene_layer: "foreground",
    confidence: 0.99,
  });
  countSemanticGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_count_cones_001",
      category: "count_semantic",
      label: "4 traffic cones",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_traffic_cones_001"],
      evidence: {
        objects: ["traffic cones"],
      },
    }),
  ];
  countSemanticGraph.modules.counts.count_ids.push("count_cone_001");
  const countSemantic = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: countSemanticGraph }));
  assert.equal(countSemantic.ok, true, countSemantic.findings.join(","));
});

test("card visual fact graph repairs live-proof semantic label variance", () => {
  const electricityGraph = structuredClone(validFactGraph());
  electricityGraph.observations.push({
    observation_id: "obs_effect_electricity_001",
    kind: "visual_effects",
    label: "blue electrical sparks around body and lightning bolts",
    normalized_label: "blue electrical sparks lightning bolts",
    scene_layer: "foreground",
    frame_position: "around_subject",
    visibility: "visible",
    salience: "high",
    confidence: 0.95,
    evidence_strength: "strong",
  });
  electricityGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_electricity_001",
      category: "motif",
      label: "electricity",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_effect_electricity_001"],
      evidence: {
        motion_state: ["blue electrical sparks"],
        environment: ["lightning bolts"],
      },
    }),
  ];
  const electricity = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: electricityGraph }));
  assert.equal(electricity.ok, true, electricity.findings.join(","));
  assert.ok(electricity.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "electricity"));

  const alertGraph = structuredClone(validFactGraph());
  alertGraph.observations.push({
    observation_id: "obs_alert_face_001",
    kind: "facial_evidence",
    label: "eyes looking forward with upright posture",
    normalized_label: "eyes looking forward upright posture",
    scene_layer: "foreground",
    frame_position: "face",
    visibility: "visible",
    salience: "high",
    confidence: 0.88,
    evidence_strength: "moderate",
  });
  alertGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_alert_001",
      category: "expression",
      label: "alert expression",
      supporting_observation_ids: ["obs_alert_face_001"],
      evidence: {
        eyes: ["eyes looking forward"],
        body_position: ["upright posture"],
      },
    }),
  ];
  const alert = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: alertGraph }));
  assert.equal(alert.ok, true, alert.findings.join(","));
  assert.ok(alert.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "alert expression"));

  const unsupportedAlert = validateVisualDescriptionPayloadV1(validFactPayload({
    fact_graph: {
      semantic_visual_facts: [
        semanticVisualFact({
          semantic_fact_id: "sem_bad_alert_001",
          category: "state",
          label: "alert expression",
          evidence: {
            body_language: ["alert expression"],
          },
        }),
      ],
    },
  }));
  assert.equal(unsupportedAlert.ok, true, unsupportedAlert.findings.join(","));
  assert.equal(
    unsupportedAlert.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
      /alert/i.test(fact.label)),
    false,
  );

  const handsOnHipsGraph = structuredClone(validFactGraph());
  handsOnHipsGraph.observations.push({
    observation_id: "obs_hands_on_hips_001",
    kind: "human_appearance",
    label: "person standing with hands on hips",
    normalized_label: "hands on hips pose",
    scene_layer: "foreground",
    frame_position: "center",
    visibility: "visible",
    salience: "high",
    confidence: 0.93,
    evidence_strength: "strong",
  });
  handsOnHipsGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_hands_hips_001",
      category: "action",
      label: "hands on hips",
      supporting_observation_ids: ["obs_hands_on_hips_001"],
      evidence: {
        body_language: ["hands on hips"],
        body_position: ["standing pose"],
      },
    }),
  ];
  const handsOnHips = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: handsOnHipsGraph }));
  assert.equal(handsOnHips.ok, true, handsOnHips.findings.join(","));
  assert.ok(handsOnHips.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "hands on hips"));
});

test("card visual fact graph allows evidence-backed architectural environment labels", () => {
  const corridorGraph = structuredClone(validFactGraph());
  corridorGraph.observations.push({
    observation_id: "obs_brick_corridor_001",
    kind: "environment",
    label: "brick wall corridor with arches and lamps",
    normalized_label: "brick wall corridor lamps",
    scene_layer: "background",
    frame_position: "full_background",
    visibility: "visible",
    salience: "medium",
    confidence: 0.92,
    evidence_strength: "strong",
  });
  corridorGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_brick_corridor_001",
      category: "environment",
      label: "brick wall corridor",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_brick_corridor_001"],
      evidence: {
        environment: ["brick wall corridor with lamps"],
      },
    }),
  ];
  const corridor = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: corridorGraph }));
  assert.equal(corridor.ok, true, corridor.findings.join(","));
  assert.ok(corridor.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "brick wall corridor"));
});

test("card visual fact graph repairs semantic support drift from architecture proof", () => {
  const sceneTypeGraph = structuredClone(validFactGraph());
  sceneTypeGraph.observations.push({
    observation_id: "obs_pattern_001",
    kind: "environment",
    label: "abstract patterned design behind the subject",
    normalized_label: "abstract patterned design",
    scene_layer: "background",
    frame_position: "full_background",
    visibility: "visible",
    salience: "medium",
    confidence: 0.91,
    evidence_strength: "strong",
  });
  sceneTypeGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_scene_type_001",
      category: "scene_type",
      label: "stylized background pattern",
      supporting_observation_ids: ["obs_pattern_001"],
      evidence: {
        environment: ["abstract patterned design"],
      },
    }),
  ];
  const sceneType = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: sceneTypeGraph }));
  assert.equal(sceneType.ok, true, sceneType.findings.join(","));
  assert.ok(sceneType.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.category === "scene_type" && fact.label === "stylized background pattern"));

  const gestureGraph = structuredClone(validFactGraph());
  gestureGraph.observations.push(
    {
      observation_id: "obs_pointing_001",
      kind: "human_appearance",
      label: "right hand fingers extended outward in pointing gesture",
      normalized_label: "right hand fingers extended outward pointing gesture",
      scene_layer: "foreground",
      frame_position: "right_side",
      visibility: "visible",
      salience: "high",
      confidence: 0.92,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_clasped_hands_001",
      kind: "human_appearance",
      label: "clasped blue gloved hands",
      normalized_label: "clasped blue gloved hands",
      scene_layer: "foreground",
      frame_position: "lower_center",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
  );
  gestureGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_pointing_001",
      category: "action",
      label: "pointing",
      supporting_observation_ids: ["obs_pointing_001"],
      evidence: {
        body_language: ["right hand fingers extended outward in pointing gesture"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_clasping_001",
      category: "action",
      label: "clasping hands",
      supporting_observation_ids: ["obs_clasped_hands_001"],
      evidence: {
        body_language: ["clasped blue gloved hands"],
      },
    }),
  ];
  const gestures = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: gestureGraph }));
  assert.equal(gestures.ok, true, gestures.findings.join(","));
  assert.ok(gestures.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "pointing"));
  assert.ok(gestures.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "clasping hands"));

  const motifGraph = structuredClone(validFactGraph());
  motifGraph.observations.push({
    observation_id: "obs_light_streaks_001",
    kind: "visual_effects",
    label: "pink and white light streaks crossing scene",
    normalized_label: "pink and white light streaks crossing scene",
    scene_layer: "background",
    frame_position: "diagonal_across_frame",
    visibility: "visible",
    salience: "medium",
    confidence: 0.9,
    evidence_strength: "strong",
  });
  motifGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_light_streaks_001",
      category: "motif",
      label: "pink and white light streaks",
      supporting_observation_ids: ["obs_light_streaks_001"],
      evidence: {
        visual_effects: ["pink and white light streaks crossing scene"],
      },
    }),
  ];
  const motif = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: motifGraph }));
  assert.equal(motif.ok, true, motif.findings.join(","));
  assert.ok(motif.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "pink and white light streaks"));

  const objectCameoGraph = structuredClone(validFactGraph());
  objectCameoGraph.observations.push({
    observation_id: "obs_bomb_001",
    kind: "objects_and_props",
    label: "bomb with lit fuse",
    normalized_label: "bomb lit fuse",
    scene_layer: "foreground",
    frame_position: "center",
    visibility: "visible",
    salience: "high",
    confidence: 0.96,
    evidence_strength: "strong",
  });
  objectCameoGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_bad_cameo_001",
      category: "cameo",
      label: "bomb",
      supporting_observation_ids: ["obs_bomb_001"],
      evidence: {
        objects: ["bomb"],
        other: ["lit fuse"],
      },
    }),
  ];
  const objectCameo = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: objectCameoGraph }));
  assert.equal(objectCameo.ok, true, objectCameo.findings.join(","));
  assert.equal(
    objectCameo.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
      fact.category === "cameo" && fact.label === "bomb"),
    false,
  );

  const looseExpressionGraph = structuredClone(validFactGraph());
  looseExpressionGraph.observations.push({
    observation_id: "obs_purple_eye_001",
    kind: "facial_evidence",
    label: "purple eyes, sad or neutral expression",
    normalized_label: "purple eyes, neutral/sad expression",
    scene_layer: "foreground",
    frame_position: "face",
    visibility: "visible",
    salience: "medium",
    confidence: 0.82,
    evidence_strength: "moderate",
  });
  looseExpressionGraph.typed_facts.push({
    fact_id: "fact_face_001",
    module: "human_appearance",
    field_path: "facial_evidence.eyes",
    claim: "The trainer has purple eyes and a neutral or sad expression",
    value: "purple eyes, neutral/sad expression",
    supporting_observation_ids: ["obs_purple_eye_001"],
    confidence: 0.82,
    evidence_strength: "moderate",
  });
  looseExpressionGraph.subjects[0].facial_evidence = {
    ...looseExpressionGraph.subjects[0].facial_evidence,
    eyes: "visible, purple, neutral/sad",
  };
  looseExpressionGraph.modules.human_appearance.visible_body_regions.push({
    region: "face",
    visibility: "visible",
    details: ["purple eyes", "neutral/sad expression"],
    supporting_observation_ids: ["obs_purple_eye_001"],
  });
  looseExpressionGraph.modules.human_appearance.facial_evidence.push({
    subject_observation_id: looseExpressionGraph.subjects[0].observation_id,
    eyes: "visible, purple, neutral/sad",
    mouth: "not clearly described",
    eyebrows: "not clearly described",
    supporting_observation_ids: ["obs_purple_eye_001"],
  });
  const looseExpression = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: looseExpressionGraph }));
  assert.equal(looseExpression.ok, true, looseExpression.findings.join(","));
  const normalizedText = JSON.stringify(looseExpression.normalized.visual_attributes.fact_graph);
  assert.equal(/neutral\/sad|sad or neutral|neutral or sad/i.test(normalizedText), false);
  assert.equal(/\bsad\b/i.test(normalizedText), false);
});

test("card visual fact graph repairs launch-proof semantic support and search fallback drift", () => {
  const evidenceOnlyExpressionGraph = structuredClone(validFactGraph());
  evidenceOnlyExpressionGraph.observations.push(
    {
      observation_id: "obs_neutral_face_001",
      kind: "facial_evidence",
      label: "closed mouth, open eyes, neutral eyebrows",
      normalized_label: "closed mouth open eyes neutral eyebrows",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "primary_subject_detail",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_neutral_face_002",
      kind: "facial_evidence",
      label: "neutral mouth and visible eyes behind purple sunglasses",
      normalized_label: "neutral mouth visible eyes purple sunglasses",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "primary_subject_detail",
      confidence: 0.92,
      evidence_strength: "strong",
    },
  );
  evidenceOnlyExpressionGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_neutral_concerned_001",
      category: "expression",
      label: "neutral or slightly concerned expression",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_neutral_face_001"],
      evidence: {
        mouth: ["closed"],
        eyes: ["open"],
        eyebrows: ["neutral"],
        facial_features: ["neutral or slightly concerned expression"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_neutral_female_001",
      category: "expression",
      label: "neutral expression female",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_neutral_face_002"],
      evidence: {
        mouth: ["closed"],
        eyes: ["visible behind purple tinted glasses"],
        eyebrows: ["neutral"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_neutral_male_001",
      category: "expression",
      label: "neutral expression male side profile",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_neutral_face_002"],
      evidence: {
        mouth: ["neutral"],
        eyes: ["visible"],
        eyebrows: ["neutral"],
      },
    }),
  ];
  const expressionValidation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: evidenceOnlyExpressionGraph }));
  assert.equal(expressionValidation.ok, true, expressionValidation.findings.join(","));
  assert.equal(
    expressionValidation.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
      /neutral.*expression|concerned/i.test(fact.label)),
    false,
  );

  const sparkleGraph = structuredClone(validFactGraph());
  sparkleGraph.observations.push({
    observation_id: "obs_sparkles_001",
    kind: "visual_effects",
    label: "abstract colorful background with star-like sparkles",
    normalized_label: "star-like sparkles",
    scene_layer: "background",
    frame_position: "full_background",
    visibility: "visible",
    salience: "background_detail",
    confidence: 0.9,
    evidence_strength: "strong",
  });
  sparkleGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_sparkles_001",
      category: "motif",
      label: "star sparkles",
      supporting_observation_ids: ["obs_sparkles_001"],
      evidence: {
        environment: ["star-like sparkles"],
      },
    }),
  ];
  const sparkleValidation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: sparkleGraph }));
  assert.equal(sparkleValidation.ok, true, sparkleValidation.findings.join(","));
  assert.ok(sparkleValidation.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "star sparkles"));

  const fallbackSearchGraph = structuredClone(validFactGraph());
  fallbackSearchGraph.fact_grounded_search_terms = [];
  fallbackSearchGraph.modules.fact_grounded_search_terms.terms = [];
  fallbackSearchGraph.observations = [
    {
      observation_id: "obs_hair_fallback_001",
      kind: "human_appearance",
      label: "purple hair with bob cut and long side strands",
      normalized_label: "purple hair",
      scene_layer: "foreground",
      frame_position: "center_top",
      visibility: "fully_visible",
      salience: "primary_subject_detail",
      confidence: 0.99,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_clothing_fallback_001",
      kind: "clothing",
      label: "white long coat with wide sleeves",
      normalized_label: "white coat",
      scene_layer: "foreground",
      frame_position: "center",
      visibility: "fully_visible",
      salience: "primary_subject_clothing",
      confidence: 0.99,
      evidence_strength: "strong",
    },
    ...fallbackSearchGraph.observations,
  ];
  const fallbackSearch = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: fallbackSearchGraph }));
  assert.equal(fallbackSearch.ok, true, fallbackSearch.findings.join(","));
  assert.ok(fallbackSearch.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((entry) =>
    entry.term === "purple hair" && entry.supporting_observation_ids.includes("obs_hair_fallback_001")));
  assert.ok(fallbackSearch.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((entry) =>
    entry.term === "white coat" && entry.supporting_observation_ids.includes("obs_clothing_fallback_001")));
});

test("card visual fact graph repairs evidence-backed live-lock semantic labels", () => {
  const literalGraph = structuredClone(validFactGraph());
  literalGraph.observations.push(
    {
      observation_id: "obs_bomb_live_001",
      kind: "objects_and_props",
      label: "black bomb with yellow band and red fuse",
      normalized_label: "black bomb yellow band red fuse",
      scene_layer: "foreground",
      frame_position: "center",
      visibility: "visible",
      salience: "high",
      confidence: 0.98,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_grassy_field_live_001",
      kind: "environment",
      label: "grassy field with scattered leaves",
      normalized_label: "grassy field scattered leaves",
      scene_layer: "background",
      frame_position: "lower_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.91,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_sun_horizon_live_001",
      kind: "environment",
      label: "sun near horizon",
      normalized_label: "sun near horizon",
      scene_layer: "background",
      frame_position: "upper_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.9,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_gold_sun_emblem_live_001",
      kind: "clothing",
      label: "black blue dress with visible gold sun emblem",
      normalized_label: "black blue dress gold sun emblem",
      scene_layer: "foreground",
      frame_position: "torso",
      visibility: "visible",
      salience: "medium",
      confidence: 0.93,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_gold_background_live_001",
      kind: "color_and_light",
      label: "golden yellow monochrome palette with ornate radial highlights",
      normalized_label: "golden yellow ornate radial highlights",
      scene_layer: "background",
      frame_position: "full_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.92,
      evidence_strength: "strong",
    },
  );
  literalGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_bomb_live_001",
      category: "motif",
      label: "bomb",
      supporting_observation_ids: ["obs_bomb_live_001"],
      evidence: { objects: ["black bomb with yellow band and red fuse"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_grassy_live_001",
      category: "environment",
      label: "grassy field with scattered leaves",
      supporting_observation_ids: ["obs_grassy_field_live_001"],
      evidence: { environment: ["grassy field with scattered leaves"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_sun_live_001",
      category: "environment",
      label: "sun near horizon",
      supporting_observation_ids: ["obs_sun_horizon_live_001"],
      evidence: { environment: ["sun near horizon"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_sun_emblem_live_001",
      category: "motif",
      label: "gold sun emblem on dress",
      supporting_observation_ids: ["obs_gold_sun_emblem_live_001"],
      evidence: {
        objects: ["black blue dress with visible gold sun emblem"],
        other: ["gold circular sun emblem visible on dress torso"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_gold_foil_live_001",
      category: "motif",
      label: "gold foil",
      supporting_observation_ids: ["obs_gold_background_live_001"],
      evidence: {
        environment: ["gold radial ornate star pattern"],
        other: ["golden yellow monochrome palette"],
      },
    }),
  ];
  const literalValidation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: literalGraph }));
  assert.equal(literalValidation.ok, true, literalValidation.findings.join(","));
  assert.ok(literalValidation.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "bomb"));
  assert.ok(literalValidation.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
    fact.label === "sun near horizon"));
  assert.equal(
    literalValidation.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => /\bgold foil\b/i.test(fact.label))
      || literalValidation.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((entry) => /\bgold foil\b/i.test(entry.term)),
    false,
  );

  const genericStyleGraph = structuredClone(validFactGraph());
  genericStyleGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_dark_style_live_001",
      category: "scene_type",
      label: "dark fantasy style pokemon",
      supporting_observation_ids: ["obs_subject_001"],
      evidence: {
        eyes: ["pink glowing eye"],
        body_language: ["floating"],
        environment: ["dark abstract environment"],
      },
    }),
  ];
  const genericStyleValidation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: genericStyleGraph }));
  assert.equal(genericStyleValidation.ok, true, genericStyleValidation.findings.join(","));
  assert.equal(
    genericStyleValidation.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) =>
      /fantasy|style|pokemon/i.test(fact.label)),
    false,
  );
});

test("card visual fact graph normalizes circular expression evidence and missing module reviews", () => {
  const circularExpressionGraph = structuredClone(validFactGraph());
  circularExpressionGraph.subjects[0].facial_evidence = {
    ...circularExpressionGraph.subjects[0].facial_evidence,
    eyes: "angry eyes",
    mouth: "angry expression",
  };
  circularExpressionGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_angry_circular_live_001",
      category: "expression",
      label: "angry",
      supporting_observation_ids: ["obs_subject_001"],
      evidence: {
        eyes: ["angry"],
        mouth: ["angry expression"],
      },
    }),
  ];
  const circularExpression = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: circularExpressionGraph }));
  assert.equal(circularExpression.ok, true, circularExpression.findings.join(","));
  const normalizedGraphText = JSON.stringify(circularExpression.normalized.visual_attributes.fact_graph);
  assert.equal(/\bangry\b/i.test(normalizedGraphText), false);

  const derivedReviewGraph = structuredClone(validFactGraph());
  derivedReviewGraph.counts = [];
  derivedReviewGraph.modules.counts = { fact_ids: [], count_ids: [] };
  derivedReviewGraph.coverage_reviews.counts_review = "none_visible";
  derivedReviewGraph.surface_and_scan_cues = [];
  derivedReviewGraph.modules.surface_and_scan_cues = { fact_ids: [], observation_ids: [] };
  derivedReviewGraph.coverage_reviews.surface_and_scan_cues_review = "none_visible";
  derivedReviewGraph.uncertainty_and_abstentions = [];
  derivedReviewGraph.modules.uncertainty_and_abstentions = { fact_ids: [], fields: [] };
  derivedReviewGraph.fact_grounded_search_terms = derivedReviewGraph.fact_grounded_search_terms.filter((entry) =>
    !/\b(?:ten|10)\s+trees?\b/i.test(entry.term));
  derivedReviewGraph.modules.fact_grounded_search_terms.terms = derivedReviewGraph.modules.fact_grounded_search_terms.terms.filter((term) =>
    !/\b(?:ten|10)\s+trees?\b/i.test(term));
  derivedReviewGraph.relationships = [
    {
      relationship_id: "rel_live_001",
      relationship_type: "beside",
      source_observation_id: "obs_subject_001",
      target_observation_id: "obs_tree_group_001",
      confidence: 0.85,
    },
  ];
  derivedReviewGraph.modules.relationships.relationship_ids = ["rel_live_001"];
  derivedReviewGraph.coverage_reviews.relationships_review = "observed";
  derivedReviewGraph.module_reviews = derivedReviewGraph.module_reviews.filter((review) =>
    !["counts", "relationships", "surface_and_scan_cues", "uncertainty_and_abstentions", "fact_grounded_search_terms"].includes(review.module));
  const derivedReview = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: derivedReviewGraph }));
  assert.equal(derivedReview.ok, true, derivedReview.findings.join(","));
  const reviewsByModule = new Map(derivedReview.normalized.visual_attributes.fact_graph.module_reviews.map((review) => [review.module, review]));
  assert.equal(reviewsByModule.get("relationships").review_status, "uncertain");
  assert.equal(reviewsByModule.get("counts").review_status, "none_visible");
  assert.equal(reviewsByModule.get("surface_and_scan_cues").review_status, "none_visible");
  assert.equal(reviewsByModule.get("fact_grounded_search_terms").review_status, "uncertain");
});

test("card visual fact graph repairs evidence-backed live expression and pose labels", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_side_profile_live_001",
      kind: "creature_anatomy",
      label: "white face with pink nose and side profile visible",
      normalized_label: "white face pink nose side profile visible",
      scene_layer: "foreground",
      frame_position: "center right",
      visibility: "visible",
      salience: "high",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_upright_live_001",
      kind: "creature_anatomy",
      label: "upright diagonal body position with front legs extended forward",
      normalized_label: "upright diagonal body position",
      scene_layer: "foreground",
      frame_position: "center",
      visibility: "visible",
      salience: "high",
      confidence: 0.96,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_smirk_live_001",
      kind: "human_appearance",
      label: "left character facial profile shown with smirking mouth",
      normalized_label: "smirking mouth",
      scene_layer: "midground",
      frame_position: "center left",
      visibility: "visible",
      salience: "high",
      confidence: 0.98,
      evidence_strength: "strong",
    },
  );
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_side_profile_live_001",
      category: "expression",
      label: "face side profile visible",
      supporting_observation_ids: ["obs_side_profile_live_001"],
      evidence: {
        facial_features: ["white face with pink nose", "side profile visible"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_upright_live_001",
      category: "state",
      label: "upright",
      supporting_observation_ids: ["obs_upright_live_001"],
      evidence: {
        body_position: ["upright", "diagonal"],
        body_language: ["front legs extended forward"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_smirk_live_001",
      category: "expression",
      label: "smirking",
      supporting_observation_ids: ["obs_smirk_live_001"],
      evidence: {
        mouth: ["smirking"],
        body_position: ["standing"],
      },
    }),
  ];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const semanticLabels = validation.normalized.visual_attributes.fact_graph.semantic_visual_facts.map((fact) => fact.label);
  assert.equal(semanticLabels.includes("face side profile visible"), false);
  assert.ok(semanticLabels.includes("upright"));
  assert.ok(semanticLabels.includes("smirking"));

  const unsupportedSmirkGraph = structuredClone(validFactGraph());
  unsupportedSmirkGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_smirk_unsupported_live_001",
      category: "expression",
      label: "smirking",
      supporting_observation_ids: ["obs_subject_001"],
      evidence: {
        mouth: ["mouth not visible"],
        eyes: ["eyes not visible"],
      },
    }),
  ];
  const unsupported = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unsupportedSmirkGraph }));
  assert.equal(unsupported.ok, true, unsupported.findings.join(","));
  assert.equal(
    unsupported.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "smirking"),
    false,
  );
});

test("card visual fact graph repairs final live gate evidence and graph-integrity misses", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_card_ui_illust_001",
      kind: "illustrator_text",
      label: "Illustrator GIDORA visible bottom left",
      normalized_label: "illustrator gidora",
      scene_layer: "ui",
      frame_position: "bottom_left",
      visibility: "visible",
      salience: "moderate",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_card_ui_text_pokemon_no_hp_text",
      kind: "hp_text",
      label: "",
      normalized_label: "",
      scene_layer: "card_ui",
      frame_position: "top_right_blank",
      visibility: "not_visible",
      salience: "low",
      confidence: 1,
      evidence_strength: "not_applicable",
    },
    {
      observation_id: "obs_bomb_fuse_001",
      kind: "object_part",
      label: "red bomb fuse",
      normalized_label: "red bomb fuse",
      scene_layer: "midground",
      frame_position: "center_top",
      visibility: "visible",
      salience: "moderate",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_attack_pose_001",
      kind: "pose",
      label: "dynamic attacking pose, body angled diagonally upright",
      normalized_label: "dynamic diagonal upright pose",
      scene_layer: "foreground",
      frame_position: "center",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_electric_arcs_001",
      kind: "visual_effects",
      label: "visible electric energy arcs",
      normalized_label: "electric energy arcs",
      scene_layer: "foreground",
      frame_position: "center",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_environment_sun_001",
      kind: "environment",
      label: "visible sun in upper left corner",
      normalized_label: "sun",
      scene_layer: "background",
      frame_position: "top_left",
      visibility: "visible",
      salience: "salient",
      confidence: 0.95,
      evidence_strength: "strong",
    },
  );
  graph.typed_facts.push({
    fact_id: "fact_card_ui_illustrator_001",
    module: "card_ui_and_print_markers",
    field_path: "illustrator_text",
    claim: "Illustrator text GIDORA visible bottom left",
    value: "GIDORA",
    supporting_observation_ids: ["obs_card_ui_illust_001"],
    confidence: 0.95,
    evidence_strength: "strong",
  });
  graph.scene_layers.midground.push("obs_bomb_fuse_color_001");
  graph.modules.card_ui_and_print_markers.fact_ids.push("fact_card_ui_illust_001");
  graph.modules.card_ui_and_print_markers.illustrator_text_observation_ids.push("obs_card_ui_illust_001");
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_attacking_live_gate_001",
      category: "action",
      label: "attacking",
      supporting_observation_ids: ["obs_attack_pose_001", "obs_electric_arcs_001"],
      evidence: {
        body_language: ["dynamic pose"],
        body_position: ["dynamic attacking pose"],
        motion_state: ["visible electric energy arcs"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_daytime_live_gate_001",
      category: "environment",
      label: "daytime",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_environment_sun_001"],
      evidence: {
        environment: ["sun"],
      },
    }),
  ];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));

  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  assert.equal(
    normalizedGraph.observations.some((observation) => observation.observation_id === "obs_card_ui_text_pokemon_no_hp_text"),
    false,
  );
  assert.ok(normalizedGraph.scene_layers.midground.includes("obs_bomb_fuse_001"));
  assert.equal(normalizedGraph.scene_layers.midground.includes("obs_bomb_fuse_color_001"), false);
  assert.ok(normalizedGraph.modules.card_ui_and_print_markers.fact_ids.includes("fact_card_ui_illustrator_001"));

  const semanticLabels = normalizedGraph.semantic_visual_facts.map((fact) => fact.label);
  assert.equal(semanticLabels.includes("attacking"), false);
  assert.ok(semanticLabels.includes("daytime"));
});

test("card visual fact graph repairs high-value live evidence-policy misses", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_birthday_001",
      kind: "objects_and_props",
      label: "birthday cake and gift box visible beside the subject",
      normalized_label: "birthday cake gift box",
      scene_layer: "foreground",
      frame_position: "lower",
      visibility: "visible",
      salience: "medium",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_volcanic_001",
      kind: "environment",
      label: "lava or flame background with red dark volcanic setting",
      normalized_label: "lava flame red volcanic setting",
      scene_layer: "background",
      frame_position: "full_background",
      visibility: "visible",
      salience: "high",
      confidence: 0.91,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_shining_001",
      kind: "color_and_light",
      label: "shining blue-black coloration",
      normalized_label: "shining blue black coloration",
      scene_layer: "foreground",
      frame_position: "subject",
      visibility: "visible",
      salience: "high",
      confidence: 0.9,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_wings_001",
      kind: "creature_anatomy",
      label: "wings spread on the floating creature",
      normalized_label: "wings spread",
      scene_layer: "foreground",
      frame_position: "left_and_right",
      visibility: "visible",
      salience: "high",
      confidence: 0.92,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_roaring_001",
      kind: "creature_anatomy",
      label: "wide open mouth with visible fangs",
      normalized_label: "wide open mouth fangs",
      scene_layer: "foreground",
      frame_position: "head",
      visibility: "visible",
      salience: "high",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_fierce_001",
      kind: "creature_anatomy",
      label: "narrowed eyes and open mouth with tongue visible",
      normalized_label: "narrowed eyes open mouth tongue",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.93,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_pink_aura_001",
      kind: "visual_effects",
      label: "bold neon pink energy aura around the subject",
      normalized_label: "bold neon pink energy aura",
      scene_layer: "foreground",
      frame_position: "around_subject",
      visibility: "visible",
      salience: "high",
      confidence: 0.93,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_awake_001",
      kind: "creature_anatomy",
      label: "round open eyes with white pupils",
      normalized_label: "round open eyes white pupils",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_subject_count_001",
      kind: "scene_subject",
      label: "Dark Tyranitar",
      normalized_label: "dark tyranitar",
      scene_layer: "foreground",
      frame_position: "center",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
  );
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_birthday_001",
      category: "scene_type",
      label: "birthday theme",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_birthday_001"],
      evidence: { objects: ["birthday cake", "gift box"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_volcanic_001",
      category: "scene_type",
      label: "volcanic environment",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_volcanic_001"],
      evidence: { environment: ["lava or flame background", "red dark volcanic setting"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_shining_001",
      category: "state",
      label: "shining",
      supporting_observation_ids: ["obs_shining_001"],
      evidence: { body_language: ["shining coloration"], other: ["shining blue-black coloration"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_wings_001",
      category: "state",
      label: "wings spread",
      supporting_observation_ids: ["obs_wings_001"],
      evidence: { body_language: ["wings spread"], motion_state: ["moving wings"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_roaring_001",
      category: "expression",
      label: "roaring",
      supporting_observation_ids: ["obs_roaring_001"],
      evidence: { mouth: ["wide open mouth"], facial_features: ["visible fangs"], motion_state: ["roaring"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_fierce_001",
      category: "expression",
      label: "fierce expression",
      supporting_observation_ids: ["obs_fierce_001"],
      evidence: { mouth: ["open mouth with pink tongue visible"], eyes: ["narrowed eyes"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_aura_001",
      category: "state",
      label: "bold neon pink energy aura",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_pink_aura_001"],
      evidence: { motion_state: ["pink energy aura"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_awake_001",
      category: "state",
      label: "awake",
      supporting_observation_ids: ["obs_awake_001"],
      evidence: { eyes: ["round with white pupils"], motion_state: ["alert"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_unsupported_count_001",
      category: "count_semantic",
      label: "one Dark Tyranitar",
      supporting_observation_ids: ["obs_subject_count_001"],
      evidence: {},
    }),
  ];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const semanticLabels = validation.normalized.visual_attributes.fact_graph.semantic_visual_facts.map((fact) => fact.label);
  assert.ok(semanticLabels.includes("birthday theme"));
  assert.ok(semanticLabels.includes("volcanic environment"));
  assert.ok(semanticLabels.includes("shining"));
  assert.ok(semanticLabels.includes("wings spread"));
  assert.ok(semanticLabels.includes("roaring"));
  assert.ok(semanticLabels.includes("fierce expression"));
  assert.ok(semanticLabels.includes("bold neon pink energy aura"));
  assert.ok(semanticLabels.includes("awake"));
  assert.equal(semanticLabels.includes("one Dark Tyranitar"), false);

  const unsupportedAwakeGraph = structuredClone(validFactGraph());
  unsupportedAwakeGraph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_awake_bad_001",
      category: "state",
      label: "awake",
      supporting_observation_ids: ["obs_subject_001"],
      evidence: { eyes: ["eyes closed"], body_position: ["sleeping"] },
    }),
  ];
  const unsupportedAwake = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unsupportedAwakeGraph }));
  assert.equal(unsupportedAwake.ok, true, unsupportedAwake.findings.join(","));
  assert.equal(
    unsupportedAwake.normalized.visual_attributes.fact_graph.semantic_visual_facts.some((fact) => fact.label === "awake"),
    false,
  );
});

test("card visual fact graph repairs high-value semantic mouth features and expression cleanup", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_sharp_teeth_live_001",
      kind: "creature_anatomy",
      label: "open mouth with visible sharp white teeth",
      normalized_label: "open mouth visible sharp white teeth",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_jagged_mouth_live_001",
      kind: "creature_anatomy",
      label: "jagged mouth shape visible on the face",
      normalized_label: "jagged mouth shape",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_snarl_live_001",
      kind: "creature_anatomy",
      label: "wide open mouth with visible fangs",
      normalized_label: "wide open mouth visible fangs",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.96,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_content_mouth_live_001",
      kind: "creature_anatomy",
      label: "content mouth",
      normalized_label: "content mouth",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "medium",
      confidence: 0.75,
      evidence_strength: "moderate",
    },
  );
  graph.subjects[0].physical_features = [
    "angry facial expression",
    "open happy mouth with visible tongue",
    "aggressive expression with visible teeth",
  ];
  graph.subjects[0].facial_evidence = {
    eyes: "angry eyes",
    mouth: "open happy mouth with visible tongue",
    eyebrows: "furrowed eyebrows",
    face_position: "front of head",
    other_visible_evidence: ["aggressive expression with visible teeth"],
  };
  graph.typed_facts.push(
    {
      fact_id: "fact_expression_cleanup_live_001",
      module: "creature_anatomy",
      field_path: "physical_features.facial_expression",
      claim: "angry_or_aggressive facial expression",
      value: "open happy mouth with visible tongue",
      supporting_observation_ids: ["obs_sharp_teeth_live_001"],
      confidence: 0.9,
      evidence_strength: "strong",
    },
    {
      fact_id: "fact_jagged_mouth_live_001",
      module: "creature_anatomy",
      field_path: "physical_features.mouth",
      claim: "jagged mouth shape visible",
      value: "jagged mouth shape",
      supporting_observation_ids: ["obs_jagged_mouth_live_001"],
      confidence: 0.94,
      evidence_strength: "strong",
    },
  );
  graph.modules.creature_anatomy.fact_ids.push("fact_expression_cleanup_live_001", "fact_jagged_mouth_live_001");
  graph.modules.creature_anatomy.physical_features.push({
    subject_observation_id: "obs_subject_001",
    region: "face",
    feature: "angry expression with jagged mouth shape",
    visibility: "visible",
    colors: [],
    details: ["open happy mouth with visible tongue", "aggressive expression with visible teeth"],
    supporting_observation_ids: ["obs_sharp_teeth_live_001", "obs_jagged_mouth_live_001"],
    confidence: 0.92,
  });
  graph.scene_layers.foreground.push(
    "obs_sharp_teeth_live_001",
    "obs_jagged_mouth_live_001",
    "obs_snarl_live_001",
    "obs_content_mouth_live_001",
  );
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_sharp_teeth_live_001",
      category: "expression",
      label: "sharp teeth",
      supporting_observation_ids: ["obs_sharp_teeth_live_001"],
      evidence: { mouth: ["open mouth"], facial_features: ["visible sharp white teeth"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_jagged_mouth_live_001",
      category: "expression",
      label: "jagged mouth shape",
      supporting_observation_ids: ["obs_jagged_mouth_live_001"],
      evidence: { mouth: ["jagged"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_snarling_live_001",
      category: "expression",
      label: "snarling",
      supporting_observation_ids: ["obs_snarl_live_001"],
      evidence: { mouth: ["wide open mouth"], facial_features: ["visible fangs"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_content_mouth_live_001",
      category: "expression",
      label: "content mouth",
      supporting_observation_ids: ["obs_content_mouth_live_001"],
      evidence: { mouth: ["content"] },
    }),
  ];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  const semanticLabels = normalizedGraph.semantic_visual_facts.map((fact) => fact.label);
  assert.ok(semanticLabels.includes("sharp teeth"));
  assert.ok(semanticLabels.includes("jagged mouth shape"));
  assert.ok(semanticLabels.includes("snarling"));
  assert.equal(semanticLabels.includes("content mouth"), false);

  const acceptedText = JSON.stringify({
    subjects: normalizedGraph.subjects,
    typed_facts: normalizedGraph.typed_facts,
    modules: normalizedGraph.modules,
  });
  assert.equal(/\b(?:angry|happy|aggressive)\b/i.test(acceptedText), false);
  assert.match(acceptedText, /visible tongue|visible teeth|jagged mouth shape/);
});

test("card visual fact graph allows evidence-backed live semantic labels and drops circular expression claims", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_energy_effects_live_001",
      kind: "visual_effects",
      label: "background colorful energy effects with yellow lightning bolt shapes",
      normalized_label: "colorful energy effects lightning bolts",
      scene_layer: "background",
      frame_position: "around_subject",
      visibility: "visible",
      salience: "high",
      confidence: 0.93,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_aggressive_face_live_001",
      kind: "creature_anatomy",
      label: "open mouth with teeth and lowered eyebrows",
      normalized_label: "open mouth with teeth lowered eyebrows",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_intense_circular_live_001",
      kind: "creature_anatomy",
      label: "yellow eyes with red pupils, intense expression",
      normalized_label: "yellow eyes red pupils intense expression",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.91,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_intense_supported_live_001",
      kind: "creature_anatomy",
      label: "narrowed eyes and furrowed brow",
      normalized_label: "narrowed eyes furrowed brow",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
  );
  graph.scene_layers.foreground.push(
    "obs_aggressive_face_live_001",
    "obs_intense_circular_live_001",
    "obs_intense_supported_live_001",
  );
  graph.scene_layers.background.push("obs_energy_effects_live_001");
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_energy_effects_live_001",
      category: "environment",
      label: "energy effects",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_energy_effects_live_001"],
      evidence: {
        environment: ["colorful energy", "lightning bolts"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_aggressive_supported_live_001",
      category: "expression",
      label: "aggressive expression",
      supporting_observation_ids: ["obs_aggressive_face_live_001"],
      evidence: {
        mouth: ["open mouth with teeth"],
        eyes: ["focused eyes"],
        eyebrows: ["lowered eyebrows"],
        facial_features: ["teeth visible"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_intense_circular_live_001",
      category: "expression",
      label: "intense expression",
      supporting_observation_ids: ["obs_intense_circular_live_001"],
      evidence: {
        eyes: ["intense expression"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_intense_supported_live_001",
      category: "expression",
      label: "intense expression",
      supporting_observation_ids: ["obs_intense_supported_live_001"],
      evidence: {
        eyes: ["narrowed eyes"],
        eyebrows: ["furrowed brow"],
      },
    }),
  ];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedFacts = validation.normalized.visual_attributes.fact_graph.semantic_visual_facts;
  const normalizedIds = normalizedFacts.map((fact) => fact.semantic_fact_id);
  const normalizedLabels = normalizedFacts.map((fact) => fact.label);
  assert.ok(normalizedLabels.includes("energy effects"));
  assert.ok(normalizedLabels.includes("aggressive expression"));
  assert.ok(normalizedIds.includes("sem_intense_supported_live_001"));
  assert.equal(normalizedIds.includes("sem_intense_circular_live_001"), false);
});

test("card visual fact graph repairs same-50 rerun semantic labels and compound search terms", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_volcanic_landscape_rerun_001",
      kind: "environment",
      label: "erupting volcano with lava flow in volcanic landscape",
      normalized_label: "volcanic landscape erupting volcano lava flow",
      scene_layer: "background",
      frame_position: "bottom_left",
      visibility: "visible",
      salience: "medium",
      confidence: 0.95,
      evidence_strength: "medium",
    },
    {
      observation_id: "obs_duplicate_figures_rerun_001",
      kind: "creature_anatomy",
      label: "two additional visible figures as duplicates on left and right",
      normalized_label: "two duplicate figures",
      scene_layer: "foreground",
      frame_position: "left_and_right",
      visibility: "visible",
      salience: "secondary",
      confidence: 0.85,
      evidence_strength: "moderate",
    },
    {
      observation_id: "obs_unclear_face_rerun_001",
      kind: "creature_anatomy",
      label: "face expression cannot determine from visible face details",
      normalized_label: "cannot determine face expression",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "partially_visible",
      salience: "medium",
      confidence: 0.8,
      evidence_strength: "weak",
    },
    {
      observation_id: "obs_happy_pikachu_rerun_001",
      kind: "facial_evidence",
      label: "happy expression with open mouth and visible tongue",
      normalized_label: "open mouth with visible tongue red cheeks",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.98,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_mimikyu_mouth_rerun_001",
      kind: "creature_anatomy",
      label: "Mimikyu mouth shaped as jittery line",
      normalized_label: "mimikyu jittery mouth line",
      scene_layer: "foreground",
      frame_position: "center_right",
      visibility: "visible",
      salience: "secondary_subject_feature",
      confidence: 0.97,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_mimikyu_blush_rerun_001",
      kind: "creature_anatomy",
      label: "Mimikyu orange blush marks on cheeks",
      normalized_label: "mimikyu orange blush cheeks",
      scene_layer: "foreground",
      frame_position: "center_right",
      visibility: "visible",
      salience: "secondary_subject_feature",
      confidence: 0.96,
      evidence_strength: "strong",
    },
  );
  graph.scene_layers.foreground.push(
    "obs_duplicate_figures_rerun_001",
    "obs_unclear_face_rerun_001",
    "obs_happy_pikachu_rerun_001",
    "obs_mimikyu_mouth_rerun_001",
    "obs_mimikyu_blush_rerun_001",
  );
  graph.scene_layers.background.push("obs_volcanic_landscape_rerun_001");
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_volcanic_landscape_rerun_001",
      category: "environment",
      label: "volcanic landscape",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_volcanic_landscape_rerun_001"],
      evidence: { environment: ["erupting volcano", "lava flow"], objects: ["volcano"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_duplicate_figures_rerun_001",
      category: "motif",
      label: "two duplicate figures",
      supporting_observation_ids: ["obs_duplicate_figures_rerun_001"],
      evidence: { other: ["two duplicates visible on left and right"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_cannot_determine_face_rerun_001",
      category: "expression",
      label: "cannot_determine_face_expression",
      supporting_observation_ids: ["obs_unclear_face_rerun_001"],
      evidence: {
        mouth: ["cannot_determine"],
        eyes: ["cannot_determine"],
        eyebrows: ["cannot_determine"],
        facial_features: ["face details unclear"],
      },
      uncertainty: "high",
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_happy_pikachu_rerun_001",
      category: "expression",
      label: "happy",
      supporting_observation_ids: ["obs_happy_pikachu_rerun_001"],
      evidence: {
        mouth: ["open mouth with visible tongue"],
        eyes: ["open"],
        facial_features: ["red cheeks"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_mimikyu_mouth_rerun_001",
      category: "expression",
      label: "Mimikyu has jittery line shaped mouth",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_mimikyu_mouth_rerun_001"],
      evidence: { mouth: ["jittery line"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_mimikyu_blush_rerun_001",
      category: "expression",
      label: "Mimikyu has orange blush marks on cheeks",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_mimikyu_blush_rerun_001"],
      evidence: { facial_features: ["orange blush cheeks"] },
    }),
  ];
  graph.fact_grounded_search_terms.push({
    term: "happy Pikachu",
    supporting_observation_ids: ["obs_happy_pikachu_rerun_001"],
  });

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  const semanticIds = normalizedGraph.semantic_visual_facts.map((fact) => fact.semantic_fact_id);
  const semanticLabels = normalizedGraph.semantic_visual_facts.map((fact) => fact.label);
  const searchTerms = normalizedGraph.fact_grounded_search_terms.map((entry) => entry.term);
  assert.ok(semanticLabels.includes("volcanic landscape"));
  assert.ok(semanticLabels.includes("two duplicate figures"));
  assert.ok(semanticLabels.includes("Mimikyu has jittery line shaped mouth"));
  assert.ok(semanticLabels.includes("Mimikyu has orange blush marks on cheeks"));
  assert.ok(searchTerms.includes("happy Pikachu"));
  assert.equal(semanticIds.includes("sem_cannot_determine_face_rerun_001"), false);
});

test("card visual fact graph repairs autopilot same-50 live failure classes", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_blue_flame_autopilot_001",
      kind: "visual_effects",
      label: "blue flame emitting from open mouth",
      normalized_label: "blue flame mouth",
      scene_layer: "foreground",
      frame_position: "center_left",
      visibility: "visible",
      salience: "high",
      confidence: 0.99,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_cityscape_autopilot_001",
      kind: "environment",
      label: "cityscape background with illuminated buildings",
      normalized_label: "cityscape background illuminated buildings",
      scene_layer: "background",
      frame_position: "full_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.95,
      evidence_strength: "strong",
    },
  );
  graph.scene_layers.foreground.push("obs_blue_flame_autopilot_001");
  graph.scene_layers.background.push("obs_cityscape_autopilot_001");
  graph.modules.creature_anatomy.pose_orientation.push({
    subject_observation_id: "obs_subject_001",
    pose: ["upright"],
    orientation: "diagonal forward-facing",
    action_state: ["exhaling flame"],
    supporting_observation_ids: ["obs_subject_001", "obs_creature_anatomy_missing_999"],
    confidence: 0.99,
  });
  graph.environment = {
    ...graph.environment,
    setting: ["cityscape"],
    architecture: ["illuminated buildings"],
    supporting_observation_ids: ["obs_cityscape_autopilot_001"],
  };
  graph.semantic_visual_facts.push(
    semanticVisualFact({
      semantic_fact_id: "sem_blue_flame_autopilot_001",
      category: "action",
      label: "exhaling blue flame",
      supporting_observation_ids: ["obs_blue_flame_autopilot_001", "obs_creature_anatomy_missing_999"],
      evidence: {
        mouth: ["open mouth"],
        motion_state: ["exhaling flame"],
        objects: ["blue flame"],
      },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_cityscape_autopilot_001",
      category: "environment",
      label: "cityscape",
      supporting_observation_ids: ["obs_cityscape_autopilot_001"],
      evidence: { environment: ["illuminated buildings", "nighttime"] },
    }),
  );

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  const blueFlame = normalizedGraph.semantic_visual_facts.find((fact) => fact.semantic_fact_id === "sem_blue_flame_autopilot_001");
  const cityscape = normalizedGraph.semantic_visual_facts.find((fact) => fact.semantic_fact_id === "sem_cityscape_autopilot_001");
  assert.deepEqual(blueFlame.supporting_observation_ids, ["obs_blue_flame_autopilot_001"]);
  assert.equal(cityscape.label, "cityscape");
  assert.ok(normalizedGraph.modules.creature_anatomy.pose_orientation
    .some((row) => row.supporting_observation_ids.length === 1 && row.supporting_observation_ids[0] === "obs_subject_001"));

  const unsupportedGraph = structuredClone(validFactGraph());
  unsupportedGraph.observations.push({
    observation_id: "obs_cityscape_unsupported_autopilot_001",
    kind: "environment",
    label: "abstract dark background",
    normalized_label: "abstract dark background",
    scene_layer: "background",
    frame_position: "full_background",
    visibility: "visible",
    salience: "medium",
    confidence: 0.9,
    evidence_strength: "medium",
  });
  unsupportedGraph.scene_layers.background.push("obs_cityscape_unsupported_autopilot_001");
  unsupportedGraph.semantic_visual_facts.push(semanticVisualFact({
    semantic_fact_id: "sem_cityscape_unsupported_autopilot_001",
    category: "environment",
    label: "cityscape",
    supporting_observation_ids: ["obs_cityscape_unsupported_autopilot_001"],
    evidence: { environment: ["cityscape"] },
  }));
  const unsupportedValidation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unsupportedGraph }));
  assert.equal(unsupportedValidation.ok, true, unsupportedValidation.findings.join(","));
  assert.equal(
    unsupportedValidation.normalized.visual_attributes.fact_graph.semantic_visual_facts
      .some((fact) => fact.semantic_fact_id === "sem_cityscape_unsupported_autopilot_001"),
    false,
  );
});

test("card visual fact graph repairs autopilot expression semantic fact cleanup", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_neutral_face_autopilot_001",
      kind: "facial_evidence",
      label: "face front-facing with visible face position",
      normalized_label: "front-facing visible face",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "primary_subject_detail",
      confidence: 0.94,
      evidence_strength: "medium",
    },
    {
      observation_id: "obs_concerned_circular_autopilot_001",
      kind: "facial_evidence",
      label: "concerned expression",
      normalized_label: "concerned expression",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "primary_subject_detail",
      confidence: 0.9,
      evidence_strength: "weak",
    },
    {
      observation_id: "obs_concerned_supported_autopilot_001",
      kind: "facial_evidence",
      label: "wide eyes and downturned mouth",
      normalized_label: "wide eyes downturned mouth",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "primary_subject_detail",
      confidence: 0.93,
      evidence_strength: "strong",
    },
  );
  graph.semantic_visual_facts.push(
    semanticVisualFact({
      semantic_fact_id: "sem_neutral_face_position_autopilot_001",
      category: "expression",
      label: "neutral face position",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_neutral_face_autopilot_001"],
      evidence: { facial_features: ["face front-facing"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_neutral_face_autopilot_001",
      category: "expression",
      label: "neutral face",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_neutral_face_autopilot_001"],
      evidence: { facial_features: ["visible face"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_concerned_circular_autopilot_001",
      category: "expression",
      label: "concerned",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_concerned_circular_autopilot_001"],
      evidence: { facial_features: ["concerned expression"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_concerned_supported_autopilot_001",
      category: "expression",
      label: "concerned",
      subject_observation_id: "obs_subject_001",
      supporting_observation_ids: ["obs_concerned_supported_autopilot_001"],
      evidence: {
        eyes: ["wide eyes"],
        mouth: ["downturned mouth"],
      },
    }),
  );

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedFacts = validation.normalized.visual_attributes.fact_graph.semantic_visual_facts;
  assert.equal(normalizedFacts.some((fact) => fact.semantic_fact_id === "sem_neutral_face_position_autopilot_001"), false);
  assert.equal(normalizedFacts.some((fact) => fact.semantic_fact_id === "sem_neutral_face_autopilot_001"), false);
  assert.equal(normalizedFacts.some((fact) => fact.semantic_fact_id === "sem_concerned_circular_autopilot_001"), false);
  assert.ok(normalizedFacts.some((fact) => fact.semantic_fact_id === "sem_concerned_supported_autopilot_001" && fact.label === "concerned"));
});

test("card visual fact graph repairs environment alignment and card UI weak-marker abstentions", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_environment_night_live_001",
      kind: "environment",
      label: "starry night sky background",
      normalized_label: "starry night sky",
      scene_layer: "background",
      frame_position: "full_background",
      visibility: "visible",
      salience: "high",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_environment_thunderstorm_live_001",
      kind: "environment",
      label: "thunderstorm clouds with visible lightning",
      normalized_label: "thunderstorm clouds lightning",
      scene_layer: "background",
      frame_position: "upper_background",
      visibility: "visible",
      salience: "medium",
      confidence: 0.91,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_card_ui_resistance_live_001",
      kind: "card_ui_symbol",
      label: "Resistance symbol: Fighting blurred",
      normalized_label: "resistance fighting",
      scene_layer: "interface",
      frame_position: "bottom_middle",
      visibility: "visible",
      salience: "low",
      confidence: 0.7,
      evidence_strength: "medium",
    },
  );
  graph.environment = {
    ...graph.environment,
    sky: ["starry night sky", "thunderstorm clouds"],
    weather: [],
    time_of_day_cues: [],
    supporting_observation_ids: ["obs_environment_night_live_001", "obs_environment_thunderstorm_live_001"],
  };
  graph.scene_layers.background.push("obs_environment_night_live_001", "obs_environment_thunderstorm_live_001");
  graph.typed_facts.push({
    fact_id: "fact_card_ui_resistance_live_001",
    module: "card_ui_and_print_markers",
    field_path: "card_ui_and_print_markers.resistance_symbol",
    claim: "resistance symbol visible but blurred",
    value: "Fighting resistance symbol blurred",
    supporting_observation_ids: ["obs_card_ui_resistance_live_001"],
    confidence: 0.7,
    evidence_strength: "medium",
  });
  graph.modules.card_ui_and_print_markers.fact_ids.push("fact_card_ui_resistance_live_001");

  const review = graph.module_reviews.find((entry) => entry.module === "card_ui_and_print_markers");
  review.review_status = "complete";
  review.evidence_quality = "high";
  review.abstentions = [];

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  assert.ok(normalizedGraph.environment.time_of_day_cues.includes("night"));
  assert.ok(normalizedGraph.environment.weather.includes("thunderstorm"));

  const cardUiReview = normalizedGraph.module_reviews.find((entry) => entry.module === "card_ui_and_print_markers");
  assert.ok(cardUiReview.abstentions.some((entry) =>
    entry.affected_observation_ids.includes("obs_card_ui_resistance_live_001")));
});

test("card visual fact graph repairs harvest quarantine evidence-backed semantic and representation cases", () => {
  const graph = structuredClone(validFactGraph());
  graph.observations.push(
    {
      observation_id: "obs_meteor_trails_001",
      kind: "visual_effects",
      label: "multiple meteor trails across the background",
      normalized_label: "multiple meteor trails",
      scene_layer: "background",
      frame_position: "upper_background",
      visibility: "visible",
      salience: "high",
      confidence: 0.94,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_zigzag_001",
      kind: "creature_anatomy",
      label: "red zigzag markings on the body",
      normalized_label: "red zigzag markings",
      scene_layer: "foreground",
      frame_position: "body",
      visibility: "visible",
      salience: "medium",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_town_001",
      kind: "environment",
      label: "white buildings with arched doorways and a decorative street lamp",
      normalized_label: "white buildings arched doorways decorative street lamp",
      scene_layer: "background",
      frame_position: "background",
      visibility: "visible",
      salience: "high",
      confidence: 0.92,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_orchard_001",
      kind: "environment",
      label: "apple tree with red apples",
      normalized_label: "apple tree red apples",
      scene_layer: "background",
      frame_position: "background",
      visibility: "visible",
      salience: "high",
      confidence: 0.96,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_tongue_001",
      kind: "creature_anatomy",
      label: "long curved tongue extending from open mouth",
      normalized_label: "long curved tongue open mouth",
      scene_layer: "foreground",
      frame_position: "face",
      visibility: "visible",
      salience: "high",
      confidence: 0.95,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_breath_001",
      kind: "visual_effects",
      label: "mist or breath emerging from open mouth",
      normalized_label: "mist breath open mouth",
      scene_layer: "foreground",
      frame_position: "mouth",
      visibility: "visible",
      salience: "high",
      confidence: 0.92,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_rider_001",
      kind: "scene_subject",
      label: "small rider sitting on horse-like creature with reins",
      normalized_label: "rider sitting horse reins",
      scene_layer: "foreground",
      frame_position: "center",
      visibility: "visible",
      salience: "high",
      confidence: 0.9,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_flaming_mane_001",
      kind: "creature_anatomy",
      label: "large mane with red and yellow flame-shaped colors",
      normalized_label: "flaming mane red yellow",
      scene_layer: "foreground",
      frame_position: "head",
      visibility: "visible",
      salience: "high",
      confidence: 0.97,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_shuriken_001",
      kind: "object",
      label: "visible shuriken near the subject",
      normalized_label: "shuriken",
      scene_layer: "foreground",
      frame_position: "right",
      visibility: "visible",
      salience: "medium",
      confidence: 0.9,
      evidence_strength: "strong",
    },
    {
      observation_id: "obs_pikachu_magnet_001",
      kind: "object",
      label: "small Pikachu magnet attached to a refrigerator",
      normalized_label: "pikachu magnet",
      scene_layer: "background",
      frame_position: "right_background",
      visibility: "visible",
      salience: "low",
      confidence: 0.87,
      evidence_strength: "moderate",
    },
    {
      observation_id: "obs_pikachu_cookie_cutter_001",
      kind: "object",
      label: "cookie cutters in star and Pikachu shapes",
      normalized_label: "star and pikachu shaped cookie cutters",
      scene_layer: "foreground",
      frame_position: "lower",
      visibility: "visible",
      salience: "medium",
      confidence: 0.89,
      evidence_strength: "moderate",
    },
    {
      observation_id: "obs_treecko_object_001",
      kind: "object",
      label: "Treecko",
      normalized_label: "treecko",
      scene_layer: "foreground",
      frame_position: "left",
      visibility: "visible",
      salience: "medium",
      confidence: 0.94,
      evidence_strength: "strong",
    },
  );
  graph.subjects.push({
    observation_id: "obs_treecko_object_001",
    subject_kind: "scene_subject",
    identity: "Treecko",
    identity_confidence: 0.94,
    anatomy: ["lizard-like body", "tail"],
    physical_features: ["green skin"],
    pose: ["standing"],
    orientation: "left",
    action_state: ["stationary"],
    facial_evidence: {
      eyes: "open",
      mouth: "closed",
      eyebrows: "not_visible",
      face_position: "side_view",
      other_visible_evidence: [],
    },
    clothing_or_accessories: [],
    colors: ["green"],
    visibility: "visible",
  });
  graph.relationships = [
    {
      relationship_id: "rel_rider_001",
      source_observation_id: "obs_rider_001",
      target_observation_id: "obs_subject_001",
      relationship: "sitting on",
      evidence_strength: "strong",
    },
  ];
  graph.coverage_reviews.relationships_review = "observed";
  graph.semantic_visual_facts = [
    semanticVisualFact({
      semantic_fact_id: "sem_meteor_001",
      category: "motif",
      label: "meteor shower",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_meteor_trails_001"],
      evidence: { objects: ["multiple meteor trails"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_zigzag_001",
      category: "motif",
      label: "zigzag pattern",
      supporting_observation_ids: ["obs_zigzag_001"],
      evidence: { objects: ["red zigzag markings"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_town_001",
      category: "scene_type",
      label: "Mediterranean-style town",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_town_001"],
      evidence: { environment: ["white buildings", "arched doorways"], objects: ["decorative street lamp"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_orchard_001",
      category: "scene_type",
      label: "apple orchard",
      subject_observation_id: "",
      supporting_observation_ids: ["obs_orchard_001"],
      evidence: { environment: ["apple tree", "red apples"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_licking_001",
      category: "expression",
      label: "licking",
      supporting_observation_ids: ["obs_tongue_001"],
      evidence: { mouth: ["tongue extended and visible"], facial_features: ["long curved tongue"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_breath_001",
      category: "state",
      label: "exhaling breath",
      supporting_observation_ids: ["obs_breath_001"],
      evidence: { mouth: ["open mouth with breath or mist"], motion_state: ["breath exhalation effect"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_riding_001",
      category: "action",
      label: "riding horse",
      supporting_observation_ids: ["rel_rider_001"],
      evidence: { body_position: ["upright sitting"], relationships: ["rider on horse"], objects: ["reins"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_mane_001",
      category: "motif",
      label: "flaming mane",
      supporting_observation_ids: ["obs_flaming_mane_001"],
      evidence: { other: ["large mane with bright red and yellow flame shape colors"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_ninja_001",
      category: "motif",
      label: "ninja theme",
      supporting_observation_ids: ["obs_shuriken_001"],
      evidence: { objects: ["shuriken"] },
    }),
    semanticVisualFact({
      semantic_fact_id: "sem_generic_001",
      category: "scene_type",
      label: "pokemon scene",
      supporting_observation_ids: ["obs_subject_001"],
      evidence: { body_language: ["upright posture"] },
    }),
  ];
  graph.fact_grounded_search_terms = [
    { term: "Pikachu magnet", supporting_observation_ids: ["obs_pikachu_magnet_001"] },
    { term: "cookie cutters in star and Pikachu shapes", supporting_observation_ids: ["obs_pikachu_cookie_cutter_001"] },
    { term: "rider on horse", supporting_observation_ids: ["rel_rider_001"] },
  ];
  graph.scene_layers.foreground.push("obs_treecko_object_001", "obs_rider_001");

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }), {
    name: "Energy Switch",
    prompt_branch: "item_tool_supporter",
  });
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  const labels = normalizedGraph.semantic_visual_facts.map((fact) => fact.label);
  assert.ok(labels.includes("meteor shower"));
  assert.ok(labels.includes("zigzag pattern"));
  assert.ok(labels.includes("Mediterranean-style town"));
  assert.ok(labels.includes("apple orchard"));
  assert.ok(labels.includes("licking"));
  assert.ok(labels.includes("exhaling breath"));
  assert.ok(labels.includes("riding horse"));
  assert.ok(labels.includes("flaming mane"));
  assert.ok(labels.includes("ninja theme"));
  assert.equal(labels.includes("pokemon scene"), false);
  const riding = normalizedGraph.semantic_visual_facts.find((fact) => fact.semantic_fact_id === "sem_riding_001");
  assert.deepEqual(riding.supporting_observation_ids, ["obs_rider_001", "obs_subject_001"]);

  const terms = normalizedGraph.fact_grounded_search_terms.map((entry) => entry.term);
  assert.ok(terms.includes("Pikachu magnet"));
  assert.ok(terms.includes("cookie cutters in star and Pikachu shapes"));

  const unsupportedGraph = structuredClone(validFactGraph());
  unsupportedGraph.observations[0] = {
    ...unsupportedGraph.observations[0],
    label: "Joltik",
    normalized_label: "joltik",
  };
  unsupportedGraph.subjects[0] = {
    ...unsupportedGraph.subjects[0],
    identity: "Joltik",
  };
  unsupportedGraph.fact_grounded_search_terms = [
    { term: "crouched Pikachu", supporting_observation_ids: ["obs_subject_001"] },
  ];
  const unsupported = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: unsupportedGraph }), {
    name: "Joltik",
    prompt_branch: "pokemon",
  });
  assert.equal(unsupported.ok, false);
  assert.ok(unsupported.findings.includes("fact_graph_search_term_without_matching_fact_components:crouched Pikachu"));
});

test("card visual fact graph drops unsupported card UI typed facts", () => {
  const graph = structuredClone(validFactGraph());
  graph.typed_facts.push({
    fact_id: "fact_card_ui_unobserved_001",
    module: "card_ui_and_print_markers",
    field_path: "rarity_mark",
    claim: "rarity_mark_unreadable_or_absent",
    value: "",
    supporting_observation_ids: [],
    confidence: 0.5,
    evidence_strength: "abstention",
  });
  graph.modules.card_ui_and_print_markers.fact_ids.push("fact_card_ui_unobserved_001");

  const validation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: graph }));
  assert.equal(validation.ok, true, validation.findings.join(","));
  const normalizedGraph = validation.normalized.visual_attributes.fact_graph;
  assert.equal(normalizedGraph.typed_facts.some((fact) => fact.fact_id === "fact_card_ui_unobserved_001"), false);
  assert.equal(normalizedGraph.modules.card_ui_and_print_markers.fact_ids.includes("fact_card_ui_unobserved_001"), false);
});

test("card visual fact graph routes confused subject-kind classifications to review", () => {
  const payload = validFactPayload({
    fact_graph: {
      observations: [
        ...validFactGraph().observations,
        {
          observation_id: "obs_sky_001",
          kind: "environment",
          label: "stormy sky",
          normalized_label: "stormy sky",
          scene_layer: "background",
          frame_position: "upper_half",
          visibility: "visible",
          salience: "high",
          confidence: 0.9,
          evidence_strength: "strong",
        },
      ],
      subjects: [
        ...validFactGraph().subjects,
        {
          observation_id: "obs_sky_001",
          subject_kind: "scene_subject",
          identity: "stormy sky",
          identity_confidence: 0.9,
          anatomy: [],
          physical_features: [],
          pose: "not_applicable",
          orientation: "not_applicable",
          action_state: "not_applicable",
          facial_evidence: {},
          clothing_accessories: [],
          colors: ["gray"],
          visibility: "visible",
        },
      ],
      scene_layers: {
        ...validFactGraph().scene_layers,
        background: ["obs_tree_group_001", "obs_sky_001"],
      },
      coverage_reviews: {
        subjects_review: "observed",
      },
      fact_grounded_search_terms: [
        { term: "stormy sky", supporting_observation_ids: ["obs_sky_001"] },
        { term: "ten trees", supporting_observation_ids: ["obs_tree_group_001"] },
        { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
      ],
    },
  });

  const validation = validateVisualDescriptionPayloadV1(payload);
  assert.equal(validation.ok, true);

  const flags = detectVisualDescriptionReviewFlagsV1(payload, {
    name: "Magnetic Storm",
    supertype: "Trainer",
    subtype: "Stadium",
    prompt_branch: "stadium",
  });
  assert.ok(flags.includes("potential_subject_kind_classification_confusion"));
  assert.equal(classifyDescriptionReviewStatusV1({
    quality_flags: flags,
    identity_input_confidence: 0.95,
    description_confidence: 0.91,
    attribute_confidence: 0.85,
    image_quality_score: 0.95,
  }), "needs_review");
});

test("harvest quarantine repair preserves evidence-backed semantics without accepting unsupported facts", () => {
  const highContrastGraph = validFactGraph({
    typed_facts: [
      ...validFactGraph().typed_facts,
      {
        fact_id: "fact_lighting_001",
        module: "color_and_light",
        field_path: "visual_design.lighting",
        claim: "artwork lighting is high contrast with bright highlights",
        value: "high contrast bright highlights",
        supporting_observation_ids: ["obs_palette_001"],
        confidence: 0.93,
        evidence_strength: "strong",
      },
    ],
  });
  const highContrast = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: highContrastGraph }));
  assert.equal(highContrast.ok, true);

  const expressionAbstentionGraph = validFactGraph({
    semantic_visual_facts: [
      semanticVisualFact({
        semantic_fact_id: "sem_expression_abstention_001",
        category: "expression",
        label: "cannot_determine_expression_due_to_art_style",
        evidence: {
          mouth: ["cannot determine due to art style"],
          eyes: ["cannot determine due to art style"],
          eyebrows: ["cannot determine due to art style"],
          facial_features: ["face visible"],
        },
      }),
    ],
  });
  const expressionAbstention = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: expressionAbstentionGraph }));
  assert.equal(expressionAbstention.ok, true);
  assert.equal(expressionAbstention.normalized.visual_attributes.fact_graph.semantic_visual_facts.length, 0);

  const uiMirrorGraph = validFactGraph({
    observations: [
      ...validFactGraph().observations,
      {
        observation_id: "obs_energy_symbol_001",
        kind: "object",
        label: "lightning energy symbol near HP on card UI",
        normalized_label: "lightning energy symbol",
        scene_layer: "card_ui",
        frame_position: "top_right",
        visibility: "visible",
        salience: "low",
        confidence: 0.98,
        evidence_strength: "strong",
      },
    ],
    typed_facts: [
      ...validFactGraph().typed_facts,
      {
        fact_id: "fact_ui_energy_symbol_001",
        module: "objects_and_props",
        field_path: "objects[0]",
        claim: "lightning energy symbol appears near HP on card UI",
        value: "lightning energy symbol",
        supporting_observation_ids: ["obs_energy_symbol_001"],
        confidence: 0.98,
        evidence_strength: "strong",
      },
    ],
    objects_and_props: [
      ...validFactGraph().objects_and_props,
      {
        observation_id: "obs_energy_symbol_001",
        label: "lightning energy symbol",
        normalized_label: "lightning energy symbol",
        object_type: "symbol",
        colors: ["yellow"],
        material_appearance: ["flat graphic"],
        location: "near HP on card UI",
        count_reference: "",
        confidence: 0.98,
      },
    ],
    modules: {
      ...validFactGraph().modules,
      objects_and_props: {
        ...validFactGraph().modules.objects_and_props,
        fact_ids: [...validFactGraph().modules.objects_and_props.fact_ids, "fact_ui_energy_symbol_001"],
        object_observation_ids: ["obs_energy_symbol_001"],
      },
      card_ui_and_print_markers: {
        ...validFactGraph().modules.card_ui_and_print_markers,
        energy_symbol_observation_ids: ["obs_energy_symbol_001"],
      },
    },
  });
  const uiMirror = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: uiMirrorGraph }));
  assert.equal(uiMirror.ok, true);
  assert.equal(
    uiMirror.normalized.visual_attributes.fact_graph.objects_and_props.some((object) => object.observation_id === "obs_energy_symbol_001"),
    false,
  );

  const representationGraph = validFactGraph({
    observations: [
      ...validFactGraph().observations.map((observation) => observation.observation_id === "obs_subject_001"
        ? { ...observation, label: "Iono", normalized_label: "iono" }
        : observation),
      {
        observation_id: "obs_pikachu_plush_001",
        kind: "object",
        label: "plate with pancakes, ice cream, and a Pikachu plush toy",
        normalized_label: "pancakes ice cream pikachu plush toy",
        scene_layer: "foreground",
        frame_position: "right",
        visibility: "visible",
        salience: "medium",
        confidence: 0.96,
        evidence_strength: "strong",
      },
    ],
    subjects: validFactGraph().subjects.map((subject) => subject.observation_id === "obs_subject_001"
      ? { ...subject, identity: "Iono" }
      : subject),
    typed_facts: validFactGraph().typed_facts.map((fact) => fact.fact_id === "fact_subject_001"
      ? { ...fact, claim: "Iono is a visible scene subject", value: "Iono" }
      : fact),
    modules: {
      ...validFactGraph().modules,
      fact_grounded_search_terms: {
        ...validFactGraph().modules.fact_grounded_search_terms,
        terms: ["pancakes with ice cream and Pikachu plush", "forest background"],
      },
    },
    fact_grounded_search_terms: [
      { term: "pancakes with ice cream and Pikachu plush", supporting_observation_ids: ["obs_pikachu_plush_001"] },
      { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
    ],
  });
  const representation = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: representationGraph }));
  assert.equal(representation.ok, true, representation.findings.join("\n"));

  const cameoGraph = validFactGraph({
    observations: [
      ...validFactGraph().observations,
      {
        observation_id: "obs_gyarados_001",
        kind: "scene_subject",
        label: "Gyarados partially visible in background",
        normalized_label: "gyarados",
        scene_layer: "background",
        frame_position: "upper_right",
        visibility: "partial",
        salience: "medium",
        confidence: 0.94,
        evidence_strength: "strong",
      },
    ],
    subjects: [
      ...validFactGraph().subjects,
      {
        observation_id: "obs_gyarados_001",
        subject_kind: "scene_subject",
        identity: "Gyarados",
        identity_confidence: 0.94,
        anatomy: ["serpentine body"],
        physical_features: ["partially visible head"],
        pose: [],
        orientation: "right",
        action_state: [],
        facial_evidence: {
          eyes: "visible",
          mouth: "visible",
          eyebrows: "",
          face_position: "background upper right",
          other_visible_evidence: [],
        },
        clothing_or_accessories: [],
        colors: ["blue"],
        visibility: "partial",
      },
    ],
    modules: {
      ...validFactGraph().modules,
      subjects: {
        ...validFactGraph().modules.subjects,
        scene_subject_observation_ids: ["obs_subject_001", "obs_gyarados_001"],
      },
    },
    fact_grounded_search_terms: [
      { term: "gyarados cameo", supporting_observation_ids: ["obs_gyarados_001"] },
      { term: "forest background", supporting_observation_ids: ["obs_tree_group_001"] },
    ],
  });
  const cameo = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: cameoGraph }));
  assert.equal(cameo.ok, true);

  const normalSalienceObjectGraph = validFactGraph({
    observations: [
      ...validFactGraph().observations,
      {
        observation_id: "obs_bag_001",
        kind: "object",
        label: "yellow adventure bag",
        normalized_label: "adventure bag",
        scene_layer: "foreground",
        frame_position: "center",
        visibility: "visible",
        salience: "normal",
        confidence: 0.96,
        evidence_strength: "strong",
      },
    ],
    fact_grounded_search_terms: [],
    modules: {
      ...validFactGraph().modules,
      fact_grounded_search_terms: {
        ...validFactGraph().modules.fact_grounded_search_terms,
        terms: [],
      },
    },
  });
  const normalSalienceObject = validateVisualDescriptionPayloadV1(validFactPayload({ fact_graph: normalSalienceObjectGraph }));
  assert.equal(normalSalienceObject.ok, true);
  assert.ok(normalSalienceObject.normalized.visual_attributes.fact_graph.fact_grounded_search_terms.some((entry) =>
    entry.term === "adventure bag"));
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
  const factGraphV2 = source("docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md");
  const harvestMode = source("docs/contracts/CARD_VISUAL_HARVEST_MODE_V1.md");
  const contractIndex = source("docs/CONTRACT_INDEX.md");

  assert.match(agent, /refusing to apply fixture descriptions without --allow-fixture-apply/);
  assert.match(agent, /card_print_visual_descriptions/);
  assert.match(agent, /card_visual_description_runs/);
  assert.match(agent, /type: "input_image"/);
  assert.match(agent, /CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2/);
  assert.match(agent, /CARD_VISUAL_FACT_GRAPH_SCHEMA_V2/);
  assert.match(agent, /Modular Exhaustive Observable Fact Graph System/);
  assert.match(agent, /Do not write a prose description, story, caption, review, or mood narrative/);
  assert.match(agent, /Every meaningful visible fact must appear as an atomic observation with an observation_id/);
  assert.match(agent, /typed_facts/);
  assert.match(agent, /module_reviews/);
  assert.match(agent, /visible_body_regions/);
  assert.match(agent, /clothing/);
  assert.match(agent, /creature_anatomy/);
  assert.match(agent, /card_ui_and_print_markers/);
  assert.match(agent, /Inspect both the illustrated artwork and the printed card interface/);
  assert.match(agent, /If small print cannot be read reliably, do not invent OCR text/);
  assert.match(agent, /Card UI terms remain in card_ui_and_print_markers/);
  assert.match(agent, /Do not store subjective body-size, attractiveness, or personality labels/);
  assert.match(agent, /scene_subject: physically present/);
  assert.match(agent, /depicted_subject: character\/entity shown inside another surface/);
  assert.match(agent, /character_representation: object shaped like or patterned after a character/);
  assert.match(agent, /Pikachu as a pillow or ice cream is a character_representation/);
  assert.match(agent, /semantic_visual_facts/);
  assert.match(agent, /happy Pikachu/);
  assert.match(agent, /module_reviews must include all required module names/);
  assert.match(agent, /resolved_prompt_branch/);
  assert.match(agent, /Branch 1 - Pokemon/);
  assert.match(agent, /Branch 2 - Trainer/);
  assert.match(agent, /Branch 3 - Stadium/);
  assert.match(agent, /Branch 4 - Energy/);
  assert.match(agent, /Branch 5 - Item \/ Tool \/ Supporter/);
  assert.match(agent, /fact_grounded_search_terms must cite supporting observation_ids/);
  assert.match(agent, /buildFactGraphCompatibilityDigestV1/);
  assert.match(agent, /FACT_GRAPH_V2_REVIEW_PACKET.md/);
  assert.match(agent, /--v2-stress-sample/);
  assert.match(agent, /--high-value-sample/);
  assert.match(agent, /--concurrency=/);
  assert.match(agent, /--harvest/);
  assert.match(agent, /--exclude-branches=/);
  assert.match(agent, /high_value_selection.json/);
  assert.match(agent, /validation_quarantine\.jsonl/);
  assert.match(agent, /HARVEST_REPORT\.json/);
  assert.match(agent, /HARVEST_REPORT\.md/);
  assert.match(agent, /per_card/);
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
  assert.match(factGraphV2, /# CARD_VISUAL_FACT_GRAPH_V2/);
  assert.match(factGraphV2, /modular exhaustive ontology/);
  assert.match(factGraphV2, /No fixed observation quota/);
  assert.match(factGraphV2, /visible_body_regions/);
  assert.match(factGraphV2, /semantic_visual_facts/);
  assert.match(factGraphV2, /happy Pikachu/);
  assert.match(factGraphV2, /material appearance only/);
  assert.match(harvestMode, /Validation failures in harvest mode are not discarded/);
  assert.match(harvestMode, /New failure classes stop promotion, not extraction/);
  assert.match(contractIndex, /CARD_VISUAL_LANGUAGE_V1/);
  assert.match(contractIndex, /CARD_VISUAL_FACT_GRAPH_V1/);
  assert.match(contractIndex, /CARD_VISUAL_FACT_GRAPH_V2/);
  assert.match(contractIndex, /CARD_VISUAL_HARVEST_MODE_V1/);
});
