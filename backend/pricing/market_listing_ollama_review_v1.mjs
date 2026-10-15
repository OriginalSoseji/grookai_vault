export const MARKET_LISTING_OLLAMA_REVIEW_VERSION = "MARKET_LISTING_OLLAMA_REVIEW_V1";
export const MARKET_LISTING_OLLAMA_REVIEW_MODEL = "grookai-evidence-review:4b";
export const MARKET_LISTING_OLLAMA_REVIEW_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    decision: {
      type: "string",
      enum: ["route_to_human_review", "reject_contamination", "needs_more_evidence"],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason_code: {
      type: "string",
      enum: [
        "clean_identity",
        "foreign_language",
        "lot_or_sealed",
        "fake_or_custom",
        "variant_mismatch",
        "outlier_spread",
        "insufficient_sellers",
        "slab_requires_separate_review",
        "uncertain",
      ],
    },
    explanation: { type: "string", maxLength: 240 },
  },
  required: ["decision", "confidence", "reason_code", "explanation"],
  additionalProperties: false,
});

const ALLOWED_DECISIONS = new Set(MARKET_LISTING_OLLAMA_REVIEW_SCHEMA.properties.decision.enum);
const ALLOWED_REASONS = new Set(MARKET_LISTING_OLLAMA_REVIEW_SCHEMA.properties.reason_code.enum);

export function validateMarketListingOllamaReviewV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Ollama evidence review must be an object");
  }
  if (!ALLOWED_DECISIONS.has(value.decision)) throw new Error("Invalid evidence review decision");
  if (!ALLOWED_REASONS.has(value.reason_code)) throw new Error("Invalid evidence review reason_code");
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    throw new Error("Invalid evidence review confidence");
  }
  if (typeof value.explanation !== "string" || value.explanation.length > 240) {
    throw new Error("Invalid evidence review explanation");
  }
  return {
    decision: value.decision,
    confidence: value.confidence,
    reason_code: value.reason_code,
    explanation: value.explanation,
  };
}

function boundedExplanation(text) {
  return text.length <= 240 ? text : `${text.slice(0, 237)}...`;
}

export function applyMarketListingOllamaDeterministicGuardV1(row, review) {
  const counts = row?.exclusion_counts && typeof row.exclusion_counts === "object" ? row.exclusion_counts : {};
  const contaminationRules = [
    ["custom_fake", "fake_or_custom"],
    ["foreign_language", "foreign_language"],
    ["lot", "lot_or_sealed"],
    ["sealed", "lot_or_sealed"],
  ];
  const contamination = contaminationRules.find(([key]) => Number(counts[key] ?? 0) > 0);
  if (contamination) {
    const [key, reasonCode] = contamination;
    return {
      decision: "reject_contamination",
      confidence: 1,
      reason_code: reasonCode,
      explanation: boundedExplanation(`Deterministic warehouse exclusion count ${key}=${counts[key]} requires contamination rejection.`),
    };
  }

  if (row?.review_bucket === "review_required_more_evidence") {
    return {
      decision: "needs_more_evidence",
      confidence: Math.max(review.confidence, 0.95),
      reason_code: review.reason_code === "insufficient_sellers" ? review.reason_code : "uncertain",
      explanation: "Deterministic review bucket requires more evidence before human pricing review.",
    };
  }

  if (row?.review_bucket === "review_ready_internal_candidate") {
    return {
      decision: "route_to_human_review",
      confidence: Math.max(review.confidence, 0.95),
      reason_code: row.evidence_class === "slab" ? "slab_requires_separate_review" : "clean_identity",
      explanation: "Deterministic review bucket permits human review only; the local model cannot publish or map this row.",
    };
  }

  return review;
}
