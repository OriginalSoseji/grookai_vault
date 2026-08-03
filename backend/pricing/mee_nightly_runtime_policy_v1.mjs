export const MEE_NIGHTLY_RUNTIME_POLICY_VERSION = "MEE_NIGHTLY_RUNTIME_POLICY_V1";
export const MEE_ACQUISITION_PLAN_KEY = "english_pokemon_active_listing_targets_v1";
export const MEE_DEFAULT_MIN_FREE_BYTES = 12 * 1024 * 1024 * 1024;

function nonnegativeInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return parsed;
}

export function resolveAcquisitionCursorV1({
  previous = null,
  sourceManifestHash,
  sourceRequestCount,
  acquisitionMode = "rotating_cycle",
} = {}) {
  if (!sourceManifestHash) throw new Error("sourceManifestHash is required");
  const requestCount = nonnegativeInteger(sourceRequestCount, "sourceRequestCount");
  if (!new Set(["rotating_cycle", "refresh"]).has(acquisitionMode)) {
    throw new Error("acquisitionMode must be rotating_cycle or refresh");
  }

  if (acquisitionMode === "refresh") {
    return {
      acquisition_mode: acquisitionMode,
      cycle_ordinal: Number(previous?.cycle_ordinal ?? 0) + 1,
      batch_ordinal: 1,
      start_index: 0,
      source_manifest_hash: sourceManifestHash,
      source_request_count: requestCount,
    };
  }

  if (!previous || previous.cycle_complete === true) {
    return {
      acquisition_mode: acquisitionMode,
      cycle_ordinal: Number(previous?.cycle_ordinal ?? 0) + 1,
      batch_ordinal: 1,
      start_index: 0,
      source_manifest_hash: sourceManifestHash,
      source_request_count: requestCount,
    };
  }

  if (previous.source_manifest_hash !== sourceManifestHash) {
    throw new Error("source manifest changed before the active acquisition cycle completed");
  }
  if (Number(previous.source_request_count) !== requestCount) {
    throw new Error("source request count changed before the active acquisition cycle completed");
  }

  return {
    acquisition_mode: acquisitionMode,
    cycle_ordinal: nonnegativeInteger(previous.cycle_ordinal, "previous.cycle_ordinal"),
    batch_ordinal: nonnegativeInteger(previous.batch_ordinal, "previous.batch_ordinal") + 1,
    start_index: nonnegativeInteger(previous.next_start_index, "previous.next_start_index"),
    source_manifest_hash: sourceManifestHash,
    source_request_count: requestCount,
  };
}

export function buildCursorEventV1({ runKey, cursor, nextStartIndex, selectedRequestCount } = {}) {
  if (!runKey) throw new Error("runKey is required");
  if (!cursor) throw new Error("cursor is required");
  const startIndex = nonnegativeInteger(cursor.start_index, "cursor.start_index");
  const nextIndex = nonnegativeInteger(nextStartIndex, "nextStartIndex");
  const selectedCount = nonnegativeInteger(selectedRequestCount, "selectedRequestCount");
  const sourceCount = nonnegativeInteger(cursor.source_request_count, "cursor.source_request_count");
  if (nextIndex - startIndex !== selectedCount) {
    throw new Error("selected request count does not reconcile with cursor movement");
  }
  if (nextIndex > sourceCount) throw new Error("nextStartIndex exceeds source request count");

  return {
    source: "ebay_active",
    plan_key: MEE_ACQUISITION_PLAN_KEY,
    run_key: runKey,
    acquisition_mode: cursor.acquisition_mode,
    source_manifest_hash: cursor.source_manifest_hash,
    cycle_ordinal: cursor.cycle_ordinal,
    batch_ordinal: cursor.batch_ordinal,
    start_index: startIndex,
    next_start_index: nextIndex,
    source_request_count: sourceCount,
    selected_request_count: selectedCount,
    cycle_complete: nextIndex === sourceCount,
  };
}

export function evaluateDiskCapacityV1({ freeBytes, minimumFreeBytes = MEE_DEFAULT_MIN_FREE_BYTES } = {}) {
  const free = nonnegativeInteger(freeBytes, "freeBytes");
  const minimum = nonnegativeInteger(minimumFreeBytes, "minimumFreeBytes");
  return {
    free_bytes: free,
    minimum_free_bytes: minimum,
    provider_calls_allowed: free >= minimum,
    finding: free >= minimum ? null : "insufficient_artifact_disk_capacity",
  };
}

export function classifyPipelineOutcomeV1(phases = []) {
  const successfulWrites = phases.filter((phase) => phase.db_writes && phase.status === 0);
  const failure = phases.find((phase) => phase.status !== 0 && !phase.non_blocking);
  const warning = phases.find((phase) => phase.status !== 0 && phase.non_blocking);
  if (failure) {
    return successfulWrites.length > 0 ? "failed_after_writes" : "failed_before_writes";
  }
  if (warning) return "completed_with_warnings";
  return "completed";
}
