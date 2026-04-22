export type PublicProvisionalCard = Readonly<{
  candidate_id: string;
  display_name: string;
  set_hint: string;
  number_hint: string;
  image_url: string | null;
  provisional_state: "RAW" | "NORMALIZED" | "CLASSIFIED" | "REVIEW_READY";
  provisional_label: "UNCONFIRMED" | "UNDER REVIEW";
  public_explanation: string;
  source_label?: string;
  created_at?: string;
}>;

export type PublicProvisionalState = PublicProvisionalCard["provisional_state"];
export type PublicProvisionalLabel = PublicProvisionalCard["provisional_label"];

export type PromotionTransitionState = Readonly<{
  isPromotedFromProvisional: boolean;
  transitionLabel: string | null;
}>;
