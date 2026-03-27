export type CardPrinting = {
  id: string;
  finish_key?: string;
  finish_name?: string;
  finish_sort_order?: number;
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
  set_code?: string;
  hp?: number;
  national_dex?: number;
  types?: string[];
  supertype?: string;
  card_category?: string;
  variant_key?: string;
  variants?: import("@/lib/cards/variantPresentation").VariantFlags;
  printings?: CardPrinting[];
  related_prints?: RelatedCardPrint[];
}
