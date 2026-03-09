export interface CardSummary {
  gv_id: string;
  name: string;
  number: string;
  set_name?: string;
  rarity?: string;
  image_url?: string;
}

export interface CardDetail extends CardSummary {
  artist?: string;
}
