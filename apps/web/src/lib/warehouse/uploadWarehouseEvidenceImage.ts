import { supabase } from "@/lib/supabaseClient";
import {
  WAREHOUSE_SUBMISSION_BUCKET,
  type WarehouseEvidenceImageType,
  buildWarehouseSubmissionStoragePath,
  normalizeWarehouseSubmissionStoragePath,
  validateWarehouseEvidenceImageFile,
} from "@/lib/warehouse/warehouseSubmission";

export async function uploadWarehouseEvidenceImage(args: {
  userId: string;
  submissionId: string;
  imageType: WarehouseEvidenceImageType;
  file: File;
}) {
  const fileError = validateWarehouseEvidenceImageFile(args.file);
  if (fileError) {
    throw new Error(fileError);
  }

  const storagePath = buildWarehouseSubmissionStoragePath({
    userId: args.userId,
    submissionId: args.submissionId,
    imageType: args.imageType,
    fileName: args.file.name,
  });

  const { error } = await supabase.storage.from(WAREHOUSE_SUBMISSION_BUCKET).upload(storagePath, args.file, {
    upsert: false,
    contentType: args.file.type,
  });

  if (error) {
    throw new Error(error.message || "Image upload failed.");
  }

  return {
    storagePath,
  };
}

export async function removeWarehouseEvidenceImages(paths: Array<string | null | undefined>) {
  const normalizedPaths = Array.from(
    new Set(
      paths
        .map((path) => normalizeWarehouseSubmissionStoragePath(path))
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  if (normalizedPaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(WAREHOUSE_SUBMISSION_BUCKET).remove(normalizedPaths);
  if (error) {
    console.warn("[warehouse-submission] failed to clean up uploaded evidence", error);
  }
}
