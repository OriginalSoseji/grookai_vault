import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";

export const PROVISIONAL_DETAIL_TRUST_COPY = "Visible while under review.";
export const PROVISIONAL_NOT_CANON_COPY = "Not part of the canonical catalog yet.";
export const PROVISIONAL_SOURCE_COPY = "Source available";

// LOCK: Feed trust language must stay short, calm, and non-technical.
export function getProvisionalDisplayLabel(card: Pick<PublicProvisionalCard, "provisional_label">) {
  return card.provisional_label === "UNCONFIRMED" ? "Unconfirmed" : "Under Review";
}
