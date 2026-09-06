export const MTG_PRICING_PRODUCTION_GUARD_VERSION_V1 =
  "MTG_PRICING_PRODUCTION_GUARD_V1";

export const MTG_PRICING_MAX_POKEMON_DROP_RATIO_V1 = 0.001;

export function buildMtgPricingProductionGuardStartedArtifactV1() {
  return {
    policy_version: MTG_PRICING_PRODUCTION_GUARD_VERSION_V1,
    status: "preflight_started",
    ready_for_production: false,
    findings: [],
  };
}

export function buildMtgPricingProductionGuardFailureArtifactV1(input = {}) {
  const priorArtifact =
    input.priorArtifact && typeof input.priorArtifact === "object"
      ? input.priorArtifact
      : buildMtgPricingProductionGuardStartedArtifactV1();
  const error = input.error;
  const errorField =
    input.errorField === "worker_error" ? "worker_error" : "preflight_error";
  return {
    ...priorArtifact,
    policy_version: MTG_PRICING_PRODUCTION_GUARD_VERSION_V1,
    status: "blocked",
    ready_for_production: false,
    [errorField]: {
      name:
        error && typeof error.name === "string" && error.name
          ? error.name
          : "Error",
      message:
        error && typeof error.message === "string"
          ? error.message
          : String(error ?? "Unknown production preflight error"),
    },
  };
}

function requiredCount(value, field) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
  return count;
}

export function evaluateMtgPricingProductionGuardV1(input) {
  const mtgSelected = requiredCount(input.mtgSelected, "mtgSelected");
  const mtgEligible = requiredCount(input.mtgEligible, "mtgEligible");
  const shadowPokemonEligible = requiredCount(
    input.shadowPokemonEligible,
    "shadowPokemonEligible",
  );
  const baselinePokemonEligible = requiredCount(
    input.baselinePokemonEligible,
    "baselinePokemonEligible",
  );
  const freshCurrentPokemonEligible = requiredCount(
    input.freshCurrentPokemonEligible,
    "freshCurrentPokemonEligible",
  );
  if (freshCurrentPokemonEligible > baselinePokemonEligible) {
    throw new Error(
      "freshCurrentPokemonEligible cannot exceed baselinePokemonEligible",
    );
  }
  const currentPublicationBaselineAvailable = baselinePokemonEligible > 0;
  const currentGovernedViewAvailable = freshCurrentPokemonEligible > 0;
  const allowedPokemonDrop = currentPublicationBaselineAvailable
    ? Math.floor(
        baselinePokemonEligible * MTG_PRICING_MAX_POKEMON_DROP_RATIO_V1,
      )
    : 0;
  const observedPokemonDrop = Math.max(
    0,
    baselinePokemonEligible - shadowPokemonEligible,
  );
  const findings = [];

  if (!currentPublicationBaselineAvailable) {
    findings.push({
      code: "missing_current_publication_pokemon_baseline",
      baseline_pokemon_eligible: baselinePokemonEligible,
      fresh_current_pokemon_eligible: freshCurrentPokemonEligible,
    });
  }
  if (mtgSelected < 1 || mtgEligible < 1) {
    findings.push({
      code: "missing_eligible_mtg_pricing",
      mtg_selected: mtgSelected,
      mtg_eligible: mtgEligible,
    });
  }
  if (shadowPokemonEligible < 1) {
    findings.push({
      code: "missing_shadow_pokemon_pricing",
      shadow_pokemon_eligible: shadowPokemonEligible,
    });
  }
  if (
    currentPublicationBaselineAvailable &&
    observedPokemonDrop > allowedPokemonDrop
  ) {
    findings.push({
      code: "pokemon_active_publication_drop_exceeds_tolerance",
      baseline_pokemon_eligible: baselinePokemonEligible,
      fresh_current_pokemon_eligible: freshCurrentPokemonEligible,
      shadow_pokemon_eligible: shadowPokemonEligible,
      observed_drop: observedPokemonDrop,
      allowed_drop: allowedPokemonDrop,
      maximum_drop_ratio: MTG_PRICING_MAX_POKEMON_DROP_RATIO_V1,
    });
  }

  return {
    policy_version: MTG_PRICING_PRODUCTION_GUARD_VERSION_V1,
    status: findings.length === 0 ? "ready_for_production" : "blocked",
    ready_for_production: findings.length === 0,
    current_publication_baseline_available:
      currentPublicationBaselineAvailable,
    current_governed_view_available: currentGovernedViewAvailable,
    counts: {
      mtg_selected: mtgSelected,
      mtg_eligible: mtgEligible,
      shadow_pokemon_eligible: shadowPokemonEligible,
      baseline_pokemon_eligible: baselinePokemonEligible,
      fresh_current_pokemon_eligible: freshCurrentPokemonEligible,
      observed_pokemon_drop: observedPokemonDrop,
      allowed_pokemon_drop: allowedPokemonDrop,
    },
    findings,
  };
}

export function evaluateMtgPricingProductionActivationGuardV1(input) {
  const evaluated = evaluateMtgPricingProductionGuardV1({
    mtgSelected: input.productionMtgSelected,
    mtgEligible: input.productionMtgEligible,
    shadowPokemonEligible: input.productionPokemonEligible,
    baselinePokemonEligible: input.baselinePokemonEligible,
    freshCurrentPokemonEligible: input.freshCurrentPokemonEligible,
  });
  const findings = evaluated.findings.map((finding) => {
    if (finding.code === "missing_eligible_mtg_pricing") {
      return {
        code: "missing_eligible_production_mtg_pricing",
        production_mtg_selected: finding.mtg_selected,
        production_mtg_eligible: finding.mtg_eligible,
      };
    }
    if (finding.code === "missing_shadow_pokemon_pricing") {
      return {
        code: "missing_production_pokemon_pricing",
        production_pokemon_eligible: finding.shadow_pokemon_eligible,
      };
    }
    if (finding.code === "pokemon_active_publication_drop_exceeds_tolerance") {
      const {
        shadow_pokemon_eligible: productionPokemonEligible,
        ...rest
      } = finding;
      return {
        ...rest,
        production_pokemon_eligible: productionPokemonEligible,
      };
    }
    return finding;
  });

  return {
    policy_version: evaluated.policy_version,
    guard_stage: "production_pre_activation",
    evidence_scope: "production_publication_snapshots",
    status: evaluated.status,
    ready_for_production: evaluated.ready_for_production,
    current_publication_baseline_available:
      evaluated.current_publication_baseline_available,
    current_governed_view_available:
      evaluated.current_governed_view_available,
    counts: {
      production_mtg_selected: evaluated.counts.mtg_selected,
      production_mtg_eligible: evaluated.counts.mtg_eligible,
      production_pokemon_eligible:
        evaluated.counts.shadow_pokemon_eligible,
      baseline_pokemon_eligible:
        evaluated.counts.baseline_pokemon_eligible,
      fresh_current_pokemon_eligible:
        evaluated.counts.fresh_current_pokemon_eligible,
      observed_pokemon_drop: evaluated.counts.observed_pokemon_drop,
      allowed_pokemon_drop: evaluated.counts.allowed_pokemon_drop,
    },
    findings,
  };
}
