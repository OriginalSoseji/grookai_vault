export type VariantOriginFamilyCopy = {
  family_key: string;
  family_label: string;
  variant_category: string;
  confidence: string;
  why_it_exists: string;
  why_collectors_care: string;
  how_to_identify?: string;
  grookai_rule?: string;
};

export const VARIANT_FAMILY_DISCOVERY_COPY: Record<string, VariantOriginFamilyCopy> = {
  base_pikachu_print_run: {
    family_key: "base_pikachu_print_run",
    family_label: "Base Pikachu Cheek / Shadowless Print Run",
    variant_category: "print_run_variant",
    confidence: "high",
    why_it_exists:
      "Early Base Set Pikachu print runs differ by cheek color, edition, shadowless frame, and in one lane a weak/ghosted First Edition stamp impression.",
    why_collectors_care:
      "These visual print-run differences identify early Base Set production states and are collected separately from later Unlimited copies.",
    how_to_identify:
      "Check cheek color, shadowless frame, edition stamp, and whether the First Edition stamp is absent, normal, or ghosted.",
    grookai_rule: "Visible print-run identity differences are parent identity variants, not finishes.",
  },
  build_a_bear_workshop_stamp: {
    family_key: "build_a_bear_workshop_stamp",
    family_label: "Build-A-Bear Workshop Stamp",
    variant_category: "retailer_distribution_stamp",
    confidence: "high",
    why_it_exists:
      "Build-A-Bear Workshop sold Pokemon plush releases with same-character, Build-A-Bear Workshop-branded Pokemon TCG cards.",
    why_collectors_care:
      "The stamp ties the card to a specific retail plush promotion, making it physically distinguishable from the standard set card and tracked as a separate promotional lane.",
    how_to_identify: "Look for the Build-A-Bear Workshop stamp on the card face.",
    grookai_rule: "Visible retailer distribution stamps are modeled as parent identity modifiers, not as card finishes.",
  },
  burger_king_stamped_promo: {
    family_key: "burger_king_stamped_promo",
    family_label: "Burger King Stamped Promo",
    variant_category: "fast_food_distribution_stamp",
    confidence: "high",
    why_it_exists:
      "Burger King Pokemon promotions paired selected Diamond & Pearl-era cards with Kids Meal toy campaigns; the 2009 Platinum campaign used visibly stamped reverse-holo cards.",
    why_collectors_care:
      "These cards are tied to a short fast-food promotion and have an identifiable stamp, so collectors track them separately from normal Platinum-era cards.",
    how_to_identify:
      "Look for the Burger King or Platinum promotional stamp on the card face and verify the card against Burger King promo product/checklist sources.",
    grookai_rule: "Burger King stamped cards are parent identity variants; the stamped row may then carry its own supported child finish.",
  },
  first_edition: {
    family_key: "first_edition",
    family_label: "First Edition",
    variant_category: "edition_print_run",
    confidence: "high",
    why_it_exists: "First Edition copies were printed with an edition stamp identifying an earlier edition of the card.",
    why_collectors_care: "The stamp marks a separate early print identity, usually collected separately from Unlimited copies.",
    how_to_identify: "Look for the First Edition stamp on the card face.",
    grookai_rule: "First Edition is modeled as a parent identity modifier, not as a finish.",
  },
  jungle_no_symbol_error: {
    family_key: "jungle_no_symbol_error",
    family_label: "Jungle No Symbol Error",
    variant_category: "recognized_error_variant",
    confidence: "high",
    why_it_exists: "Some Jungle holo rares were printed without the Jungle expansion symbol.",
    why_collectors_care:
      "The missing symbol is a visible, repeatable WOTC-era error that collectors identify separately from normal Jungle holo copies.",
    how_to_identify: "Confirm the Jungle holo rare is missing the Jungle set symbol where it should appear.",
    grookai_rule: "Recognized repeatable production errors receive parent identity lanes when card-level evidence supports the exact card.",
  },
  pokemon_center_stamp: {
    family_key: "pokemon_center_stamp",
    family_label: "Pokemon Center Stamp",
    variant_category: "direct_retail_promotion_stamp",
    confidence: "medium",
    why_it_exists: "Pokemon Center stamped promos are tied to Pokemon Center direct retail or preorder campaigns for specific products.",
    why_collectors_care:
      "The stamp identifies a direct-retail promotional copy that is physically distinct from an unstamped set or promo card.",
    how_to_identify: "Look for the Pokemon Center stamp and verify the card against the exact campaign/product source.",
    grookai_rule: "Pokemon Center stamps are parent identity variants; exact campaign text should be preserved whenever available.",
  },
  pokemon_league_or_placement_stamp: {
    family_key: "pokemon_league_or_placement_stamp",
    family_label: "Pokemon League / Placement Stamp",
    variant_category: "organized_play_placement_stamp",
    confidence: "high",
    why_it_exists:
      "Pokemon League and League Challenge events can award special stamped cards, including placement-stamped variants for top finishers.",
    why_collectors_care:
      "Placement stamps encode event achievement or league distribution, making the physical card a different collector object from a normal copy.",
    how_to_identify: "Look for a Pokemon League, League Challenge, placement, finalist, or top-cut stamp on the card face.",
    grookai_rule: "Event and placement stamps are modeled as parent identity modifiers when the exact event/card pairing is source-backed.",
  },
  pokemon_together_stamp: {
    family_key: "pokemon_together_stamp",
    family_label: "Pokemon Together Stamp",
    variant_category: "retailer_distribution_stamp",
    confidence: "high",
    why_it_exists:
      "The Pokemon Together stamp was used on Pikachu and Eevee promos distributed through Poke Post pop-up gift-pack campaigns.",
    why_collectors_care:
      "The visible stamp ties the promo to a specific campaign and makes it distinct from the ordinary Black Star Promo copy.",
    how_to_identify: "Look for the Pokemon Together stamp on the card face.",
    grookai_rule: "Pokemon Together stamped cards are parent identity variants when the exact card/stamp pairing is source-backed.",
  },
  toys_r_us_stamp: {
    family_key: "toys_r_us_stamp",
    family_label: "Toys R Us Stamp",
    variant_category: "retailer_distribution_stamp",
    confidence: "high",
    why_it_exists:
      "Toys R Us released special stamped promotional cards to coincide with Pokemon TCG expansion releases, beginning with the Generations era.",
    why_collectors_care: "The Toys R Us stamp identifies a retailer-distribution copy that collectors separate from the ordinary expansion card.",
    how_to_identify: "Look for the Toys R Us stamp on the card face.",
    grookai_rule: "Retailer-exclusive visible stamps create parent identity lanes when the exact card/stamp pairing is source-backed.",
  },
  wb_kids_stamp: {
    family_key: "wb_kids_stamp",
    family_label: "WB Kids Stamp",
    variant_category: "media_promotion_stamp",
    confidence: "high",
    why_it_exists:
      "WB Kids stamped Wizards Black Star Promos were tied to Pokemon movie-era promotional distribution; missing and inverted stamp states are recognized special cases for specific cards.",
    why_collectors_care:
      "The stamp state identifies how the promo copy was distributed or mis-stamped, creating a physically distinct lane from the ordinary Black Star Promo.",
    how_to_identify: "Check whether the WB Kids stamp is present, missing, or inverted on the card face.",
    grookai_rule: "Grookai models WB Kids stamp states as parent identity variants when card-specific evidence is strong enough.",
  },
  winner_stamp: {
    family_key: "winner_stamp",
    family_label: "Winner Stamp",
    variant_category: "organized_play_winner_stamp",
    confidence: "high",
    why_it_exists: "Winner cards are stamped reprints released through Pokemon League or related tournament programs.",
    why_collectors_care: "The WINNER stamp marks a tournament/league award copy and is physically distinct from the ordinary card.",
    how_to_identify: "Look for the foil WINNER stamp on the card face.",
    grookai_rule: "Winner-stamped cards are parent identity variants because the stamp records distribution and award context.",
  },
};
