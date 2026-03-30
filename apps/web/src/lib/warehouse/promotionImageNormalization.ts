import "server-only";

export type PromotionImageNormalizationStatus = "READY" | "PARTIAL" | "BLOCKED";

export type PromotionImageNormalizationPackageV1 = {
  version: "V1";
  status: PromotionImageNormalizationStatus;
  candidate_id: string;
  source_refs: {
    front_evidence_id: string | null;
    back_evidence_id: string | null;
    front_storage_path: string | null;
    back_storage_path: string | null;
  };
  outputs: {
    normalized_front_storage_path: string | null;
    normalized_back_storage_path: string | null;
  };
  method: {
    warp_used: boolean;
    openai_tunnel_used: boolean;
    pipeline_version: string;
    ai_service_used?: boolean;
  };
  quality: {
    front_confidence: number | null;
    back_confidence: number | null;
  };
  missing_fields: string[];
  evidence_gaps: string[];
  next_actions: string[];
  errors: string[];
};

export type PromotionImageNormalizationEnvelope = {
  event_type: string;
  created_at: string;
  promotion_image_normalization_package: PromotionImageNormalizationPackageV1 | null;
  preview_urls?: {
    normalized_front_url: string | null;
    normalized_back_url: string | null;
  };
};

export function asPromotionImageNormalizationPackage(
  value: unknown,
): PromotionImageNormalizationPackageV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as PromotionImageNormalizationPackageV1;
}
