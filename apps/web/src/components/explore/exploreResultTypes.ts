import type { CardSummary } from "@/types/cards";
import type { VariantFlags } from "@/lib/cards/variantPresentation";

export type ExploreResultCard = CardSummary & {
  id: string;
  artist?: string;
  set_code?: string;
  printed_set_abbrev?: string;
  tcgdex_set_id?: string;
  latest_price?: number;
  variant_key?: string;
  variants?: VariantFlags;
};
