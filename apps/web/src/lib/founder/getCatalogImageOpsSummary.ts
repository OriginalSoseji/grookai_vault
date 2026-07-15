import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

type CanonImageFullDbScanReport = {
  package_id?: string;
  generated_at?: string;
  storage_bucket?: string;
  metrics?: {
    parent_rows_scanned?: number;
    child_rows_scanned?: number;
    storage_objects_scanned?: number;
    identity_rows?: number;
    identity_rows_with_canon_image_path?: number;
    identity_paths_missing_storage_objects?: number;
    identity_paths_with_non_image_metadata?: number;
    identity_paths_with_zero_byte_storage_objects?: number;
    rows_with_selected_bad_image_patterns?: number;
    japanese_rows_with_selected_bad_image_patterns?: number;
    unreferenced_canon_storage_objects?: number;
    unreferenced_suspicious_storage_objects?: number;
  };
  counts?: {
    missing_storage_by_set_code?: Record<string, number>;
    bad_selected_by_set_code?: Record<string, number>;
    unreferenced_storage_by_top_folder?: Record<string, number>;
  };
  samples?: {
    missing_storage_rows?: unknown[];
    non_image_metadata_rows?: unknown[];
    zero_byte_storage_rows?: unknown[];
    bad_selected_image_rows?: unknown[];
    japanese_bad_selected_image_rows?: unknown[];
    unreferenced_suspicious_storage_objects?: unknown[];
  };
  fingerprint?: string;
};

type CanonImageCleanupPlanReport = {
  package_id?: string;
  generated_at?: string;
  storage_bucket?: string;
  minimum_delete_age_days?: number;
  metrics?: {
    canon_storage_objects_scanned?: number;
    referenced_canon_image_paths?: number;
    unreferenced_canon_storage_objects?: number;
    delete_candidates?: number;
    hold_objects?: number;
    delete_candidate_bytes?: number;
    hold_bytes?: number;
  };
  counts?: {
    by_hold_reason?: Record<string, number>;
    delete_candidates_by_top_folder?: Record<string, number>;
    holds_by_top_folder?: Record<string, number>;
  };
  samples?: {
    delete_candidates?: unknown[];
    holds?: unknown[];
  };
  fingerprint?: string;
};

export type CatalogImageOpsSummary = {
  status: "healthy" | "warning" | "critical" | "unavailable";
  statusLabel: string;
  generatedAt: string | null;
  generatedAgeHours: number | null;
  stale: boolean;
  fullScan: {
    reportPath: string;
    packageId: string | null;
    fingerprint: string | null;
    metrics: {
      parentRowsScanned: number;
      childRowsScanned: number;
      storageObjectsScanned: number;
      identityRows: number;
      identityRowsWithCanonImagePath: number;
      missingStorageObjects: number;
      nonImageObjects: number;
      zeroByteObjects: number;
      badSelectedPatterns: number;
      japaneseBadSelectedPatterns: number;
      unreferencedCanonStorageObjects: number;
      unreferencedSuspiciousStorageObjects: number;
    };
    topMissingSetCodes: Array<{ key: string; count: number }>;
    topBadSelectedSetCodes: Array<{ key: string; count: number }>;
    topUnreferencedFolders: Array<{ key: string; count: number }>;
    sampleCounts: {
      missingStorageRows: number;
      nonImageMetadataRows: number;
      zeroByteStorageRows: number;
      badSelectedImageRows: number;
      japaneseBadSelectedImageRows: number;
      unreferencedSuspiciousStorageObjects: number;
    };
  } | null;
  cleanupPlan: {
    reportPath: string;
    packageId: string | null;
    fingerprint: string | null;
    generatedAt: string | null;
    minimumDeleteAgeDays: number | null;
    metrics: {
      canonStorageObjectsScanned: number;
      referencedCanonImagePaths: number;
      unreferencedCanonStorageObjects: number;
      deleteCandidates: number;
      holdObjects: number;
      deleteCandidateBytes: number;
      holdBytes: number;
    };
    holdReasons: Array<{ key: string; count: number }>;
    deleteCandidateFolders: Array<{ key: string; count: number }>;
    holdFolders: Array<{ key: string; count: number }>;
    sampleCounts: {
      deleteCandidates: number;
      holds: number;
    };
  } | null;
  blockingFindings: string[];
  warningFindings: string[];
};

const FULL_DB_SCAN_PATH = "docs/audits/image_truth_v1/canon_image_full_db_playbook_scan_v1.json";
const CLEANUP_PLAN_PATH = "docs/audits/image_truth_v1/canon_image_unreferenced_storage_cleanup_plan_v1.json";
const FRESHNESS_WARNING_HOURS = 36;

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function topEntries(input: Record<string, number> | undefined, limit = 5) {
  return Object.entries(input ?? {})
    .map(([key, count]) => ({ key, count: numberOrZero(count) }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, limit);
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

async function readJsonIfPresent<T>(repoRoot: string, relativePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function resolveRepoRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "docs"));
      await fs.access(path.join(candidate, "apps/web"));
      return candidate;
    } catch {
      // Try the next likely execution root.
    }
  }

  return process.cwd();
}

function generatedAgeHours(generatedAt: string | null) {
  if (!generatedAt) {
    return null;
  }

  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(0, (Date.now() - timestamp) / (60 * 60 * 1000));
}

export async function getCatalogImageOpsSummary(): Promise<CatalogImageOpsSummary> {
  const repoRoot = await resolveRepoRoot();
  const [fullScanReport, cleanupPlanReport] = await Promise.all([
    readJsonIfPresent<CanonImageFullDbScanReport>(repoRoot, FULL_DB_SCAN_PATH),
    readJsonIfPresent<CanonImageCleanupPlanReport>(repoRoot, CLEANUP_PLAN_PATH),
  ]);

  const fullMetrics = fullScanReport?.metrics;
  const cleanupMetrics = cleanupPlanReport?.metrics;
  const generatedAt = stringOrNull(fullScanReport?.generated_at);
  const ageHours = generatedAgeHours(generatedAt);
  const stale = ageHours == null || ageHours > FRESHNESS_WARNING_HOURS;
  const blockingFindings: string[] = [];
  const warningFindings: string[] = [];

  if (!fullScanReport) {
    blockingFindings.push("Full DB image scan report is unavailable.");
  }

  if (!cleanupPlanReport) {
    warningFindings.push("Unreferenced storage cleanup plan report is unavailable.");
  }

  const missingStorageObjects = numberOrZero(fullMetrics?.identity_paths_missing_storage_objects);
  const nonImageObjects = numberOrZero(fullMetrics?.identity_paths_with_non_image_metadata);
  const zeroByteObjects = numberOrZero(fullMetrics?.identity_paths_with_zero_byte_storage_objects);
  const badSelectedPatterns = numberOrZero(fullMetrics?.rows_with_selected_bad_image_patterns);
  const japaneseBadSelectedPatterns = numberOrZero(fullMetrics?.japanese_rows_with_selected_bad_image_patterns);
  const unreferencedSuspiciousStorageObjects = numberOrZero(fullMetrics?.unreferenced_suspicious_storage_objects);
  const deleteCandidates = numberOrZero(cleanupMetrics?.delete_candidates);

  if (missingStorageObjects > 0) {
    blockingFindings.push(`${missingStorageObjects} referenced image path(s) are missing from storage.`);
  }

  if (nonImageObjects > 0) {
    blockingFindings.push(`${nonImageObjects} referenced storage object(s) are not image files.`);
  }

  if (zeroByteObjects > 0) {
    blockingFindings.push(`${zeroByteObjects} referenced storage object(s) are zero-byte images.`);
  }

  if (badSelectedPatterns > 0) {
    blockingFindings.push(`${badSelectedPatterns} selected image path(s) match known bad source patterns.`);
  }

  if (japaneseBadSelectedPatterns > 0) {
    blockingFindings.push(`${japaneseBadSelectedPatterns} Japanese selected image path(s) match known bad source patterns.`);
  }

  if (unreferencedSuspiciousStorageObjects > 0) {
    blockingFindings.push(`${unreferencedSuspiciousStorageObjects} unreferenced storage object(s) are suspicious.`);
  }

  if (deleteCandidates > 0) {
    warningFindings.push(`${deleteCandidates} unreferenced self-hosted image object(s) are eligible for cleanup.`);
  }

  if (stale) {
    warningFindings.push("Image-truth report is stale or has no valid generated_at timestamp.");
  }

  const status =
    !fullScanReport
      ? "unavailable"
      : blockingFindings.length > 0
        ? "critical"
        : warningFindings.length > 0
          ? "warning"
          : "healthy";
  const statusLabel =
    status === "healthy"
      ? "Healthy"
      : status === "warning"
        ? "Needs review"
        : status === "critical"
          ? "Critical"
          : "Unavailable";

  return {
    status,
    statusLabel,
    generatedAt,
    generatedAgeHours: ageHours,
    stale,
    fullScan: fullScanReport
      ? {
          reportPath: FULL_DB_SCAN_PATH,
          packageId: stringOrNull(fullScanReport.package_id),
          fingerprint: stringOrNull(fullScanReport.fingerprint),
          metrics: {
            parentRowsScanned: numberOrZero(fullMetrics?.parent_rows_scanned),
            childRowsScanned: numberOrZero(fullMetrics?.child_rows_scanned),
            storageObjectsScanned: numberOrZero(fullMetrics?.storage_objects_scanned),
            identityRows: numberOrZero(fullMetrics?.identity_rows),
            identityRowsWithCanonImagePath: numberOrZero(fullMetrics?.identity_rows_with_canon_image_path),
            missingStorageObjects,
            nonImageObjects,
            zeroByteObjects,
            badSelectedPatterns,
            japaneseBadSelectedPatterns,
            unreferencedCanonStorageObjects: numberOrZero(fullMetrics?.unreferenced_canon_storage_objects),
            unreferencedSuspiciousStorageObjects,
          },
          topMissingSetCodes: topEntries(fullScanReport.counts?.missing_storage_by_set_code),
          topBadSelectedSetCodes: topEntries(fullScanReport.counts?.bad_selected_by_set_code),
          topUnreferencedFolders: topEntries(fullScanReport.counts?.unreferenced_storage_by_top_folder),
          sampleCounts: {
            missingStorageRows: arrayLength(fullScanReport.samples?.missing_storage_rows),
            nonImageMetadataRows: arrayLength(fullScanReport.samples?.non_image_metadata_rows),
            zeroByteStorageRows: arrayLength(fullScanReport.samples?.zero_byte_storage_rows),
            badSelectedImageRows: arrayLength(fullScanReport.samples?.bad_selected_image_rows),
            japaneseBadSelectedImageRows: arrayLength(fullScanReport.samples?.japanese_bad_selected_image_rows),
            unreferencedSuspiciousStorageObjects: arrayLength(fullScanReport.samples?.unreferenced_suspicious_storage_objects),
          },
        }
      : null,
    cleanupPlan: cleanupPlanReport
      ? {
          reportPath: CLEANUP_PLAN_PATH,
          packageId: stringOrNull(cleanupPlanReport.package_id),
          fingerprint: stringOrNull(cleanupPlanReport.fingerprint),
          generatedAt: stringOrNull(cleanupPlanReport.generated_at),
          minimumDeleteAgeDays: numberOrZero(cleanupPlanReport.minimum_delete_age_days) || null,
          metrics: {
            canonStorageObjectsScanned: numberOrZero(cleanupMetrics?.canon_storage_objects_scanned),
            referencedCanonImagePaths: numberOrZero(cleanupMetrics?.referenced_canon_image_paths),
            unreferencedCanonStorageObjects: numberOrZero(cleanupMetrics?.unreferenced_canon_storage_objects),
            deleteCandidates,
            holdObjects: numberOrZero(cleanupMetrics?.hold_objects),
            deleteCandidateBytes: numberOrZero(cleanupMetrics?.delete_candidate_bytes),
            holdBytes: numberOrZero(cleanupMetrics?.hold_bytes),
          },
          holdReasons: topEntries(cleanupPlanReport.counts?.by_hold_reason),
          deleteCandidateFolders: topEntries(cleanupPlanReport.counts?.delete_candidates_by_top_folder),
          holdFolders: topEntries(cleanupPlanReport.counts?.holds_by_top_folder),
          sampleCounts: {
            deleteCandidates: arrayLength(cleanupPlanReport.samples?.delete_candidates),
            holds: arrayLength(cleanupPlanReport.samples?.holds),
          },
        }
      : null,
    blockingFindings,
    warningFindings,
  };
}
