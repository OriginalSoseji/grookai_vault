export const CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_VERSION =
  "CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1";

const CURRENT_ALLOWED_USES = new Set([
  "candidate_snapshot_import",
  "query_demand_research",
  "controlled_vocabulary_research",
  "product_behavior_research",
]);

const POTENTIAL_USES = new Set([
  ...CURRENT_ALLOWED_USES,
  "card_level_candidate_import",
  "panorama_relationship_candidate_import",
]);

export const CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    source_key: "rotomamiti_cameo_database",
    display_name: "RotomAmiti Cameo Pokemon Card Database",
    homepage_url:
      "https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/",
    source_focus: "pokemon_and_trainer_cameo_associations",
    acquisition_mode: "operator_supplied_snapshot",
    permission_status: "existing_snapshot_only",
    current_allowed_uses: Object.freeze(["candidate_snapshot_import"]),
    potential_uses_after_permission: Object.freeze([
      "card_level_candidate_import",
    ]),
    network_acquisition_allowed: false,
    snapshot_import_allowed: true,
    authority_ceiling: "candidate_only",
    candidate_domain: "appearance_evidence",
    role_mapping: Object.freeze({
      blank_notes: "curated_association_unresolved",
      explicit_display_form: "proposed_role_only",
    }),
    requires_image_confirmation: true,
    notes:
      "The supplied workbook may stage exact canonical candidates. It does not prove pixel location, appearance role, host object, or host surface.",
  }),
  Object.freeze({
    source_key: "sightdex",
    display_name: "SightDex",
    homepage_url: "https://www.sightdex.app/",
    source_focus: "community_confirmed_pokemon_appearances",
    acquisition_mode: "partnership_export_required",
    permission_status: "unknown_requires_written_permission",
    current_allowed_uses: Object.freeze([
      "query_demand_research",
      "controlled_vocabulary_research",
    ]),
    potential_uses_after_permission: Object.freeze([
      "card_level_candidate_import",
    ]),
    network_acquisition_allowed: false,
    snapshot_import_allowed: false,
    authority_ceiling: "candidate_only",
    candidate_domain: "appearance_evidence",
    role_mapping: Object.freeze({
      featured: "scene_subject_candidate",
      cameo: "curated_association_unresolved",
      object: "curated_association_unresolved",
    }),
    requires_image_confirmation: true,
    notes:
      "SightDex featured/cameo/object labels are useful candidate signals, but its object class spans Grookai depicted subjects and character representations.",
  }),
  Object.freeze({
    source_key: "artchu",
    display_name: "Artchu",
    homepage_url: "https://artchu.ai/cards/",
    source_focus: "scene_style_mood_and_artwork_discovery_tags",
    acquisition_mode: "partnership_export_required",
    permission_status: "unknown_requires_written_permission",
    current_allowed_uses: Object.freeze([
      "query_demand_research",
      "controlled_vocabulary_research",
      "product_behavior_research",
    ]),
    potential_uses_after_permission: Object.freeze([
      "card_level_candidate_import",
    ]),
    network_acquisition_allowed: false,
    snapshot_import_allowed: false,
    authority_ceiling: "candidate_only",
    candidate_domain: "visual_concept_candidate",
    role_mapping: Object.freeze({
      objective_scene_tag: "observation_candidate",
      style_or_mood_tag: "semantic_concept_candidate",
      cameo_tag: "curated_association_unresolved",
    }),
    requires_image_confirmation: true,
    notes:
      "Objective tags and subjective style/mood tags must remain separate. Public browsing may inform vocabulary and evaluation, not bulk card-level copying.",
  }),
  Object.freeze({
    source_key: "tcg_curator",
    display_name: "TCG Curator",
    homepage_url: "https://tcgcurator.gg/",
    source_focus: "community_visual_tags_and_collector_query_demand",
    acquisition_mode: "partnership_export_required",
    permission_status: "unknown_requires_written_permission",
    current_allowed_uses: Object.freeze([
      "query_demand_research",
      "controlled_vocabulary_research",
      "product_behavior_research",
    ]),
    potential_uses_after_permission: Object.freeze([
      "card_level_candidate_import",
    ]),
    network_acquisition_allowed: false,
    snapshot_import_allowed: false,
    authority_ceiling: "candidate_only",
    candidate_domain: "visual_concept_candidate",
    role_mapping: Object.freeze({
      pokemon_name_tag: "curated_association_unresolved",
      object_location_or_action_tag: "observation_candidate",
      style_theme_tag: "semantic_concept_candidate",
    }),
    requires_image_confirmation: true,
    notes:
      "Community votes can prioritize review but cannot establish Grookai evidence authority or replace image confirmation.",
  }),
  Object.freeze({
    source_key: "binderbloom",
    display_name: "BinderBloom",
    homepage_url: "https://binderbloom.app/",
    source_focus: "binder_color_layout_and_connected_panorama_discovery",
    acquisition_mode: "partnership_export_required",
    permission_status: "unknown_requires_written_permission",
    current_allowed_uses: Object.freeze([
      "query_demand_research",
      "product_behavior_research",
    ]),
    potential_uses_after_permission: Object.freeze([
      "panorama_relationship_candidate_import",
    ]),
    network_acquisition_allowed: false,
    snapshot_import_allowed: false,
    authority_ceiling: "candidate_only",
    candidate_domain: "artwork_relationship_candidate",
    role_mapping: Object.freeze({
      connected_panorama: "artwork_relationship_candidate",
    }),
    requires_image_confirmation: true,
    notes:
      "Panorama relationships need a dedicated artwork-relationship contract and must not be forced into character appearance roles.",
  }),
  Object.freeze({
    source_key: "artfinder_tcg",
    display_name: "ArtFinderTCG",
    homepage_url: "https://artfindertcg.com/",
    source_focus: "natural_language_artwork_search_behavior",
    acquisition_mode: "manual_research_only",
    permission_status: "no_data_import_authority",
    current_allowed_uses: Object.freeze([
      "query_demand_research",
      "product_behavior_research",
    ]),
    potential_uses_after_permission: Object.freeze([]),
    network_acquisition_allowed: false,
    snapshot_import_allowed: false,
    authority_ceiling: "vocabulary_only",
    candidate_domain: "none",
    role_mapping: Object.freeze({}),
    requires_image_confirmation: false,
    notes:
      "Use as a collector-language and product benchmark only. Do not copy results or card-level tags.",
  }),
]);

export function getCardVisualExternalSourceV1(sourceKey) {
  const normalized = String(sourceKey ?? "").trim().toLowerCase();
  return (
    CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1.find(
      (source) => source.source_key === normalized,
    ) ?? null
  );
}

export function cardVisualExternalSourceUseDecisionV1(
  sourceKey,
  requestedUse,
) {
  const source = getCardVisualExternalSourceV1(sourceKey);
  const use = String(requestedUse ?? "").trim().toLowerCase();
  if (!source) {
    return Object.freeze({
      allowed: false,
      reason: "unregistered_source",
      authority_ceiling: null,
    });
  }
  if (!POTENTIAL_USES.has(use)) {
    return Object.freeze({
      allowed: false,
      reason: "unknown_use",
      authority_ceiling: source.authority_ceiling,
    });
  }
  const allowed = source.current_allowed_uses.includes(use);
  return Object.freeze({
    allowed,
    reason: allowed ? "registered_current_use" : "permission_or_contract_required",
    authority_ceiling: source.authority_ceiling,
  });
}

export function assertCardVisualExternalSourceRegistrySafeV1() {
  const sourceKeys = new Set();
  for (const source of CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1) {
    if (sourceKeys.has(source.source_key)) {
      throw new Error(`duplicate visual source: ${source.source_key}`);
    }
    sourceKeys.add(source.source_key);
    for (const use of source.current_allowed_uses) {
      if (!CURRENT_ALLOWED_USES.has(use)) {
        throw new Error(
          `unrecognized current use for ${source.source_key}: ${use}`,
        );
      }
    }
    for (const use of source.potential_uses_after_permission) {
      if (!POTENTIAL_USES.has(use)) {
        throw new Error(
          `unrecognized potential use for ${source.source_key}: ${use}`,
        );
      }
    }
    if (
      source.permission_status === "unknown_requires_written_permission" &&
      (source.network_acquisition_allowed || source.snapshot_import_allowed)
    ) {
      throw new Error(
        `unknown-rights source cannot be imported: ${source.source_key}`,
      );
    }
    if (
      source.network_acquisition_allowed ||
      source.authority_ceiling === "search_authority" ||
      source.current_allowed_uses.includes("card_level_candidate_import") ||
      source.current_allowed_uses.includes(
        "panorama_relationship_candidate_import",
      )
    ) {
      throw new Error(
        `registry exceeds current visual source boundary: ${source.source_key}`,
      );
    }
  }
  return true;
}
