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
  release_date?: string;
  release_year?: number;
  latest_price?: number;
  confidence?: number;
  listing_count?: number;
  price_source?: string;
  updated_at?: string;
}

export interface CardDetail extends CardSummary {
  artist?: string;
  printed_total?: number;
  set_code?: string;
  variant_key?: string;
  variants?: import("@/lib/cards/variantPresentation").VariantFlags;
  printings?: CardPrinting[];
}
