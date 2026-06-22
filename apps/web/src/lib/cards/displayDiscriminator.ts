export type CardPrintDisplayDiscriminatorInput = {
  variantKey?: string | null;
  printedIdentityModifier?: string | null;
  finishKey?: string | null;
  finishLabel?: string | null;
  hasDuplicateCaption?: boolean;
  fallbackIndex?: number;
};

export type CardPrintDisplayDiscriminator = {
  label: string | null;
  source: "parent_variant" | "child_finish" | "printed_identity_modifier" | "fallback" | "none";
};

const NON_MEANINGFUL_VARIANT_KEYS = new Set(["", "base", "default", "normal", "standard", "none"]);

const FINISH_LABELS: Record<string, string> = {
  normal: "Normal",
  holo: "Holo",
  reverse: "Reverse Holo",
  pokeball: "Poké Ball",
  masterball: "Master Ball",
  cosmos: "Cosmos Holo",
  cracked_ice: "Cracked Ice Holo",
  rocket_reverse: "Rocket Reverse Holo",
};

const VARIANT_LABELS: Record<string, string> = {
  alt: "Alternate Art",
  cc: "Classic Collection",
  rc: "Radiant Collection",
  tg: "Trainer Gallery",
  prerelease: "Prerelease Stamp",
  prerelease_stamp: "Prerelease Stamp",
  staff: "Staff Prerelease Stamp",
  staff_stamp: "Staff Stamp",
  staff_prerelease_stamp: "Staff Prerelease Stamp",
  play_pokemon_stamp: "Play Pokémon Stamp",
  pokemon_together_stamp: "Pokémon Together Stamp",
  player_rewards_crosshatch_stamp: "Player Rewards Crosshatch Stamp",
  e_league_stamp: "E-League Stamp",
  e_league_winner_stamp: "E-League Winner Stamp",
  wb_kids_stamp: "WB Kids Stamp",
  wotc_stamp: "WOTC Stamp",
  inverted_wb_kids_stamp: "Inverted WB Kids Stamp",
  missing_wb_kids_stamp: "Missing WB Kids Stamp",
  illustration_rare: "Illustration Rare",
  shiny_rare: "Shiny Rare",
  black_flame_error: "Black Flame Error",
  corrected_text_variant: "Corrected Text Variant",
  d_fending_error: "D. Fending Error",
  e3_stamp_red_cheeks: "E3 Stamp Red Cheeks",
  e3_stamp_yellow_cheeks: "E3 Stamp Yellow Cheeks",
  evolution_box_error: "Evolution Box Error",
  first_edition: "1st Edition",
  first_edition_red_cheeks: "1st Edition Red Cheeks",
  first_edition_yellow_cheeks: "1st Edition Yellow Cheeks",
  ghost_stamp_shadowless: "Ghost Stamp Shadowless",
  incorrect_artist_variant: "Incorrect Artist Variant",
  missing_holo_evolution_box_error: "Missing Holo Evolution Box Error",
  no_damage_error: "No Damage Error",
  no_hp_error: "No HP Error",
  no_symbol_error: "No Symbol Error",
  nonholo_error: "Non-Holo Error",
  shadowless_red_cheeks: "Shadowless Red Cheeks",
  shadowless_yellow_cheeks: "Shadowless Yellow Cheeks",
  sideways_fighting_energy_error: "Sideways Fighting Energy Error",
  stage_error: "Stage Error",
};

const PRINTED_IDENTITY_MODIFIER_LABELS: Record<string, string> = {
  delta_species: "Delta Species",
  first_edition: "First Edition",
  gamestop_stamp: "GameStop Stamp",
  league_stamp: "League Stamp",
  pikachu_jack_o_lantern_stamp: "Pikachu Jack-o'-Lantern Stamp",
  pikachu_pumpkin_stamp: "Pikachu Pumpkin Stamp",
  pokemon_center_stamp: "Pokémon Center Stamp",
  platinum_stamped_burger_king_2009: "Burger King Platinum Stamp",
  prize_pack_stamp: "Prize Pack Stamp",
  professor_program_stamp: "Professor Program Stamp",
  regional_championships_stamp: "Regional Championships Stamp",
  player_rewards_crosshatch_stamp: "Player Rewards Crosshatch Stamp",
  toys_r_us_stamp: "Toys R Us Stamp",
  winner_stamp: "Winner Stamp",
  wotc_stamp: "WOTC Stamp",
  "edition:first_edition": "1st Edition",
  "recognized_error:black_flame": "Black Flame Error",
  "recognized_error:corrected_text": "Corrected Text Variant",
  "recognized_error:d_fending": "D. Fending Error",
  "recognized_error:evolution_box": "Evolution Box Error",
  "recognized_error:ghost_stamp_shadowless": "Ghost Stamp Shadowless",
  "recognized_error:incorrect_artist": "Incorrect Artist Variant",
  "recognized_error:missing_holo_evolution_box": "Missing Holo Evolution Box Error",
  "recognized_error:no_damage": "No Damage Error",
  "recognized_error:no_hp": "No HP Error",
  "recognized_error:no_jungle_symbol": "No Symbol Error",
  "recognized_error:nonholo": "Non-Holo Error",
  "recognized_error:sideways_fighting_energy": "Sideways Fighting Energy Error",
  "recognized_error:stage": "Stage Error",
  "stamp:e3_red_cheeks": "E3 Stamp Red Cheeks",
  "stamp:e3_yellow_cheeks": "E3 Stamp Yellow Cheeks",
  "stamp:inverted_wb_kids": "Inverted WB Kids Stamp",
  "stamp:missing_wb_kids": "Missing WB Kids Stamp",
  "stamp:pikachu_jack_o_lantern": "Pikachu Jack-o'-Lantern Stamp",
  "stamp:pikachu_pumpkin": "Pikachu Pumpkin Stamp",
  "stamp:pokemon_center": "Pokémon Center Stamp",
  "stamp:player_rewards_crosshatch": "Player Rewards Crosshatch Stamp",
  "stamp:prize_pack": "Prize Pack Stamp",
  "stamp:professor_program": "Professor Program Stamp",
  "stamp:regional_championships": "Regional Championships Stamp",
  "stamp:toys_r_us": "Toys R Us Stamp",
  "stamp:wb_kids": "WB Kids Stamp",
  "stamp:winner": "Winner Stamp",
  "stamp:wotc": "WOTC Stamp",
  "variant:first_edition_red_cheeks": "1st Edition Red Cheeks",
  "variant:first_edition_yellow_cheeks": "1st Edition Yellow Cheeks",
  "variant:shadowless_red_cheeks": "Shadowless Red Cheeks",
  "variant:shadowless_yellow_cheeks": "Shadowless Yellow Cheeks",
};

function normalizeKey(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function clean(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function titleCaseToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (["sm", "xy", "bw", "ex", "dp", "hgss", "sv"].includes(normalized)) {
    return normalized.toUpperCase();
  }

  if (/^\d+$/.test(normalized)) {
    return normalized;
  }

  return `${normalized[0]?.toUpperCase() ?? ""}${normalized.slice(1)}`;
}

function humanizeKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ")
    .trim();
}

export function getCardPrintingFinishLabel(input?: {
  finishKey?: string | null;
  finishLabel?: string | null;
}) {
  const keyedLabel = FINISH_LABELS[normalizeKey(input?.finishKey)];
  if (keyedLabel) {
    return keyedLabel;
  }

  return clean(input?.finishLabel);
}

export function getVariantDisplayLabel(variantKey?: string | null) {
  const normalized = normalizeKey(variantKey);
  if (NON_MEANINGFUL_VARIANT_KEYS.has(normalized)) {
    return null;
  }

  const mapped = VARIANT_LABELS[normalized];
  if (mapped) {
    return mapped;
  }

  if (/^[a-z0-9!?★☆]$/i.test(clean(variantKey) ?? "")) {
    return clean(variantKey)?.toUpperCase() ?? null;
  }

  return humanizeKey(normalized) || null;
}

export function getPrintedIdentityModifierDisplayLabel(value?: string | null) {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }

  return PRINTED_IDENTITY_MODIFIER_LABELS[normalized] ?? humanizeKey(normalized) ?? null;
}

export function getCardPrintDisplayDiscriminator(
  input: CardPrintDisplayDiscriminatorInput,
): CardPrintDisplayDiscriminator {
  const variantLabel = getVariantDisplayLabel(input.variantKey);
  if (variantLabel) {
    return { label: variantLabel, source: "parent_variant" };
  }

  const finishLabel = getCardPrintingFinishLabel({
    finishKey: input.finishKey,
    finishLabel: input.finishLabel,
  });
  if (finishLabel) {
    return { label: finishLabel, source: "child_finish" };
  }

  const printedIdentityModifierLabel = getPrintedIdentityModifierDisplayLabel(input.printedIdentityModifier);
  if (printedIdentityModifierLabel) {
    return { label: printedIdentityModifierLabel, source: "printed_identity_modifier" };
  }

  if (input.hasDuplicateCaption) {
    const fallbackIndex = input.fallbackIndex ?? 0;
    return {
      label: fallbackIndex === 0 ? "Standard Print" : "Unclassified Variant",
      source: "fallback",
    };
  }

  return { label: null, source: "none" };
}
