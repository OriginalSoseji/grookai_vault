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
};
