import {
  VAULT_INSTANCE_MEDIA_ACCEPT,
  VAULT_INSTANCE_MEDIA_BUCKET,
  VAULT_INSTANCE_MEDIA_MAX_BYTES,
} from "@/lib/vaultInstanceMedia";

export type WarehouseSubmissionIntent = "MISSING_CARD" | "MISSING_IMAGE";
export type WarehouseEvidenceImageType = "front" | "back";

export const WAREHOUSE_SUBMISSION_INTENTS = [
  "MISSING_CARD",
  "MISSING_IMAGE",
] as const satisfies readonly WarehouseSubmissionIntent[];
export const WAREHOUSE_SUBMISSION_BUCKET = VAULT_INSTANCE_MEDIA_BUCKET;
export const WAREHOUSE_SUBMISSION_IMAGE_ACCEPT = VAULT_INSTANCE_MEDIA_ACCEPT;
export const WAREHOUSE_SUBMISSION_IMAGE_MAX_BYTES = VAULT_INSTANCE_MEDIA_MAX_BYTES;

export type WarehouseSubmissionValidationErrors = {
  submissionIntent?: string;
  notes?: string;
  tcgplayerId?: string;
  frontImage?: string;
  backImage?: string;
};

export type WarehouseSubmissionValidationInput = {
  submissionIntent: string | null;
  notes: string;
  tcgplayerId: string;
  frontImageFile: File | null;
  backImageFile: File | null;
};

export function normalizeWarehouseSubmissionText(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function isWarehouseSubmissionIntent(value: string | null | undefined): value is WarehouseSubmissionIntent {
  return (
    typeof value === "string" &&
    WAREHOUSE_SUBMISSION_INTENTS.includes(value as WarehouseSubmissionIntent)
  );
}

export function validateWarehouseEvidenceImageFile(file: File | null) {
  if (!file) {
    return null;
  }

  if (!file.type.toLowerCase().startsWith("image/")) {
    return "Upload an image file.";
  }

  if (file.size > WAREHOUSE_SUBMISSION_IMAGE_MAX_BYTES) {
    return `Images must be ${Math.floor(WAREHOUSE_SUBMISSION_IMAGE_MAX_BYTES / (1024 * 1024))} MB or smaller.`;
  }

  return null;
}

export function validateWarehouseSubmissionInput(
  input: WarehouseSubmissionValidationInput,
): WarehouseSubmissionValidationErrors {
  const errors: WarehouseSubmissionValidationErrors = {};
  const normalizedNotes = normalizeWarehouseSubmissionText(input.notes);
  const normalizedTcgplayerId = normalizeWarehouseSubmissionText(input.tcgplayerId);
  const frontImageError = validateWarehouseEvidenceImageFile(input.frontImageFile);
  const backImageError = validateWarehouseEvidenceImageFile(input.backImageFile);

  if (!isWarehouseSubmissionIntent(input.submissionIntent)) {
    errors.submissionIntent = "Choose whether you are reporting a missing card or a missing image.";
  }

  if (!normalizedNotes) {
    errors.notes = "Notes are required.";
  }

  if (!input.frontImageFile) {
    errors.frontImage = "A front image is required.";
  } else if (frontImageError) {
    errors.frontImage = frontImageError;
  }

  if (backImageError) {
    errors.backImage = backImageError;
  }

  if (input.submissionIntent === "MISSING_IMAGE" && !normalizedTcgplayerId) {
    errors.tcgplayerId = "Missing image submissions currently require a TCGPlayer ID.";
  }

  return errors;
}

function sanitizeWarehouseEvidenceFileName(fileName: string, imageType: WarehouseEvidenceImageType) {
  const normalized = fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-");

  if (normalized.length > 0) {
    return normalized;
  }

  return `${imageType}-image`;
}

export function normalizeWarehouseSubmissionStoragePath(path?: string | null) {
  if (typeof path !== "string") {
    return null;
  }

  const normalized = path.trim().replace(/^\/+/, "");
  return normalized.length > 0 ? normalized : null;
}

export function buildWarehouseSubmissionStoragePath(args: {
  userId: string;
  submissionId: string;
  imageType: WarehouseEvidenceImageType;
  fileName: string;
}) {
  const userId = args.userId.trim();
  const submissionId = args.submissionId.trim();
  const fileName = sanitizeWarehouseEvidenceFileName(args.fileName, args.imageType);

  return `${userId}/warehouse-submissions/${submissionId}/${args.imageType}/${fileName}`;
}
