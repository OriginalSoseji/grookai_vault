export type CardPrinting = {
  id: string;
  printing_gv_id?: string;
  finish_key?: string;
  finish_name?: string;
  finish_sort_order?: number;
  image_url?: string;
  image_status?: string;
  image_note?: string;
  image_source?: string;
  display_image_url?: string;
  external_image_fallback_url?: string;
  display_image_kind?: "exact" | "representative" | "missing_variant_visual" | "missing" | "blocked";
  display_finish?: string | null;
  is_display_fallback?: boolean;
  owned_count?: number;
};

export type ActiveCardPrintIdentity = {
  identity_domain: string;
  set_code_identity?: string;
  printed_number: string;
  identity_key_version: string;
  language_code?: string;
  layout?: string;
  face_names?: string[];
};

export type DisplayPrintedIdentitySource = "card_print_identity" | "card_prints" | "missing";

export type DisplayPrintedIdentity = {
  displayPrintedNumber: string | null;
  displayPrintedSetAbbrev: string | null;
  identitySource: DisplayPrintedIdentitySource;
};

export type CardCameo = {
  cameo_subject_type: "pokemon" | "trainer";
  cameo_subject_name: string;
  pokemon_ndex?: string;
  notes_raw?: string;
  cameo_qualifiers?: string[];
  source_name?: string;
};

export interface CardSummary {
  id: string;
  gv_id: string;
  game_code?: string;
  game_name?: string;
  name: string;
  number: string;
  set_name?: string;
  rarity?: string;
  image_url?: string;
  tcgdex_external_id?: string;
  release_date?: string;
  release_year?: number;
  raw_price?: number;
  raw_price_source?: string;
  raw_price_ts?: string;
  raw_price_published_at?: string;
  pricing_provenance_id?: string;
  pricing_source_label?: string;
  pricing_scope?: "parent" | "card_printing";
  pricing_is_from_price?: boolean;
  eligible_printing_count?: number;
  latest_price?: number;
  confidence?: number;
  listing_count?: number;
  price_source?: string;
  updated_at?: string;
  active_price_updated_at?: string;
  last_snapshot_at?: string;
  representative_image_url?: string;
  image_status?: string;
  image_note?: string;
  image_source?: string;
  display_image_url?: string;
  display_image_fallback_url?: string;
  external_image_fallback_url?: string;
  display_image_kind?: "exact" | "representative" | "missing_variant_visual" | "missing" | "blocked";
}

export interface RelatedCardPrint extends CardSummary {
  number_plain?: string;
  set_code?: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  set_identity_model?: string;
  variants?: import("@/lib/cards/variantPresentation").VariantFlags;
}

export interface CardDetail extends CardSummary {
  artist?: string;
  language_code?: string;
  layout?: string;
  face_names?: string[];
  number_plain?: string;
  printed_total?: number;
  printed_set_abbrev?: string;
  set_code?: string;
  active_identity?: ActiveCardPrintIdentity | null;
  hp?: number;
  national_dex?: number;
  types?: string[];
  supertype?: string;
  card_category?: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  set_identity_model?: string;
  variants?: import("@/lib/cards/variantPresentation").VariantFlags;
  printings?: CardPrinting[];
  display_printings?: CardPrinting[];
  related_prints?: RelatedCardPrint[];
  cameos?: CardCameo[];
}
