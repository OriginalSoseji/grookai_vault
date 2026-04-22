import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";
import {
  getProvisionalDisplayLabel,
  PROVISIONAL_DETAIL_TRUST_COPY,
  PROVISIONAL_NOT_CANON_COPY,
} from "@/lib/provisional/provisionalProductCopy";

export type PublicProvisionalDetailModel = Readonly<{
  candidate_id: string;
  display_name: string;
  set_hint: string;
  number_hint: string;
  image_url: string | null;
  display_label: "Unconfirmed" | "Under Review";
  identity_line: string;
  trust_copy: string;
  catalog_copy: string;
  source_label?: string;
  href: string;
  actions: Readonly<{
    vault: false;
    pricing: false;
    ownership: false;
    provenance: false;
  }>;
}>;

// LOCK: Provisional detail models must stay non-canonical.
// LOCK: Never add GV-ID, pricing, vault, ownership, or provenance fields here.
export function buildPublicProvisionalDetailModel(
  card: PublicProvisionalCard & { gv_id?: unknown },
): PublicProvisionalDetailModel | null {
  if (!card.candidate_id || !card.display_name || !card.set_hint || !card.number_hint || card.gv_id) {
    return null;
  }

  return Object.freeze({
    candidate_id: card.candidate_id,
    display_name: card.display_name,
    set_hint: card.set_hint,
    number_hint: card.number_hint,
    image_url: card.image_url,
    display_label: getProvisionalDisplayLabel(card),
    identity_line: [card.set_hint, `#${card.number_hint}`].filter(Boolean).join(" "),
    trust_copy: PROVISIONAL_DETAIL_TRUST_COPY,
    catalog_copy: PROVISIONAL_NOT_CANON_COPY,
    source_label: card.source_label,
    href: `/provisional/${encodeURIComponent(card.candidate_id)}`,
    actions: Object.freeze({
      vault: false,
      pricing: false,
      ownership: false,
      provenance: false,
    }),
  });
}
