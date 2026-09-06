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
  const currentPokemonEligible = requiredCount(
    input.currentPokemonEligible,
    "currentPokemonEligible",
  );
  const currentGovernedViewAvailable = currentPokemonEligible > 0;
  const allowedPokemonDrop = currentGovernedViewAvailable
    ? Math.floor(
        currentPokemonEligible * MTG_PRICING_MAX_POKEMON_DROP_RATIO_V1,
      )
    : 0;
  const observedPokemonDrop = Math.max(
    0,
    currentPokemonEligible - shadowPokemonEligible,
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
    currentGovernedViewAvailable &&
    observedPokemonDrop > allowedPokemonDrop
  ) {
    findings.push({
      code: "pokemon_governed_view_drop_exceeds_tolerance",
      current_pokemon_eligible: currentPokemonEligible,
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
    current_governed_view_available: currentGovernedViewAvailable,
    counts: {
      mtg_selected: mtgSelected,
      mtg_eligible: mtgEligible,
      shadow_pokemon_eligible: shadowPokemonEligible,
      current_pokemon_eligible: currentPokemonEligible,
      observed_pokemon_drop: observedPokemonDrop,
      allowed_pokemon_drop: allowedPokemonDrop,
    },
    findings,
  };
}
