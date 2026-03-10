export interface CardSummary {
  gv_id: string;
  name: string;
  number: string;
  set_name?: string;
  rarity?: string;
  image_url?: string;
  release_date?: string;
  release_year?: number;
}

export interface CardDetail extends CardSummary {
  artist?: string;
  printed_total?: number;
}
