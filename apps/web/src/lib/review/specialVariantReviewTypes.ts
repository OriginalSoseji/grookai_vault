export const SPECIAL_VARIANT_FIRST_PASS_VERSION = "SPECIAL_VARIANT_FIRST_PASS_DECISIONS_V1";
export const SPECIAL_VARIANT_FOUNDER_VERSION = "SPECIAL_VARIANT_FOUNDER_DECISIONS_V1";

export const firstPassDecisions = [
  "exact_match",
  "needs_more_evidence",
  "wrong_card_identity",
  "wrong_variant_marker",
  "wrong_finish",
  "image_unusable",
] as const;

export const founderDecisions = ["confirmed", "needs_more_evidence", "rejected"] as const;

export type FirstPassDecision = (typeof firstPassDecisions)[number];
export type FounderDecision = (typeof founderDecisions)[number];

export type SpecialVariantSourceImage = {
  sha256: string;
  size_bytes: number;
  width: number;
  height: number;
  format: "jpg" | "png";
  content_type: "image/jpeg" | "image/png";
};

export type SpecialVariantEvidenceRow = {
  evidence_id: string;
  queue_id: string;
  card_print_id: string;
  card_printing_id: string;
  truth_review_id: string;
  parent_gv_id: string;
  printing_gv_id: string;
  name: string;
  number: string;
  set_code: string;
  variant_key: string;
  finish_key: string;
  source_provider: string;
  source_product_id: number;
  source_product_title: string;
  source_page_url: string;
  source_page_title?: string;
  source_product_payload_hash: string;
  source_image_url: string;
  source_image: SpecialVariantSourceImage;
  storage_bucket: string;
  storage_path: string;
  claim_role: "candidate_exact_variant_front";
  evidence_strength: string;
  review_flags: string[];
  self_hosted_verified: true;
  automatic_approval_permitted: false;
  automatic_publication_permitted: false;
  automatic_pricing_mapping_permitted: false;
};

export type SpecialVariantReviewManifest = {
  version: string;
  generated_at: string;
  packet_fingerprint: string;
  source_queue_fingerprint: string;
  storage_bucket: string;
  self_hosted_only: true;
  server_writes_performed_by_review_portal: false;
  rows: SpecialVariantEvidenceRow[];
  summary: {
    total: number;
    self_hosted_verified: number;
    low_resolution: number;
    duplicate_hash_review: number;
  };
};

export type FirstPassDecisionRow = {
  evidence_id: string;
  card_printing_id: string;
  source_image_sha256: string;
  decision: FirstPassDecision;
  notes: string;
  decided_at: string;
};

export type FirstPassDecisionArtifact = {
  version: typeof SPECIAL_VARIANT_FIRST_PASS_VERSION;
  packet_fingerprint: string;
  reviewer: string;
  exported_at: string;
  decision_count: number;
  remaining_count: number;
  server_writes_performed: false;
  decisions: FirstPassDecisionRow[];
};

export type FounderDecisionRow = {
  evidence_id: string;
  card_printing_id: string;
  source_image_sha256: string;
  first_pass_decision: FirstPassDecision;
  first_pass_decided_at: string;
  founder_decision: FounderDecision;
  publication_authorized: boolean;
  pricing_authorized: boolean;
  notes: string;
  decided_at: string;
};

export type FounderDecisionArtifact = {
  version: typeof SPECIAL_VARIANT_FOUNDER_VERSION;
  packet_fingerprint: string;
  source_first_pass_sha256: string;
  source_first_pass_reviewer: string;
  reviewer: "founder";
  exported_at: string;
  decision_count: number;
  remaining_count: number;
  server_writes_performed: false;
  decisions: FounderDecisionRow[];
};

export function isFirstPassDecision(value: unknown): value is FirstPassDecision {
  return firstPassDecisions.includes(value as FirstPassDecision);
}

export function isFounderDecision(value: unknown): value is FounderDecision {
  return founderDecisions.includes(value as FounderDecision);
}
