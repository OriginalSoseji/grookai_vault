export const MTG_PRICING_PRODUCTION_GUARD_VERSION_V1 =
  "MTG_PRICING_PRODUCTION_GUARD_V1";

export const MTG_PRICING_MAX_POKEMON_DROP_RATIO_V1 = 0.001;

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
