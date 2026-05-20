import type { CardSummary } from "@/types/cards";
import type { PromotionTransitionState } from "@/lib/provisional/publicProvisionalTypes";
import type { VariantFlags } from "@/lib/cards/variantPresentation";

export type ExploreResultCard = CardSummary & {
  id: string;
  artist?: string;
  set_code?: string;
  printed_set_abbrev?: string;
  tcgdex_set_id?: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  set_identity_model?: string;
  variants?: VariantFlags;
  promotion_transition?: PromotionTransitionState;
  search_object_type?: "parent_print" | "child_printing";
  search_card_printing_id?: string;
  printing_gv_id?: string;
  selected_printing_gv_id?: string;
  finish_key?: string;
  finish_label?: string;
  display_discriminator?: string;
  route_query?: string;
  search_rank_score?: number;
};
