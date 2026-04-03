export type CardPrinting = {
  id: string;
  finish_key?: string;
  finish_name?: string;
  finish_sort_order?: number;
  display_finish?: string | null;
  is_display_fallback?: boolean;
};

export type ActiveCardPrintIdentity = {
  identity_domain: string;
  set_code_identity?: string;
  printed_number: string;
  identity_key_version: string;
};

export type DisplayPrintedIdentitySource = "card_print_identity" | "card_prints" | "missing";

export type DisplayPrintedIdentity = {
  displayPrintedNumber: string | null;
  displayPrintedSetAbbrev: string | null;
  identitySource: DisplayPrintedIdentitySource;
};

export interface CardSummary {
  id: string;
  gv_id: string;
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
  latest_price?: number;
  confidence?: number;
  listing_count?: number;
  price_source?: string;
  updated_at?: string;
  active_price_updated_at?: string;
  last_snapshot_at?: string;
}

export interface RelatedCardPrint extends CardSummary {
  number_plain?: string;
  set_code?: string;
  variant_key?: string;
  variants?: import("@/lib/cards/variantPresentation").VariantFlags;
}

export interface CardDetail extends CardSummary {
  artist?: string;
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
  variants?: import("@/lib/cards/variantPresentation").VariantFlags;
  printings?: CardPrinting[];
  display_printings?: CardPrinting[];
  related_prints?: RelatedCardPrint[];
}
