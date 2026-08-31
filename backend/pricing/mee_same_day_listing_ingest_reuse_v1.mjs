const PACKAGE_ID = "MARKET-LISTING-NIGHTLY-PIPELINE-V2";
const ACCEPTED_OUTCOMES = new Set(["completed", "completed_no_results"]);
const REQUIRED_FALSE_BOUNDARIES = [
  "public_pricing_writes",
  "app_visible_pricing_writes",
  "canonical_identity_writes",
  "vault_writes",
  "deletes",
];

function asDate(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function utcDayBoundsV1(value) {
  const date = asDate(value);
  if (!date) throw new Error("A valid timestamp is required for UTC day bounds.");
  const day = date.toISOString().slice(0, 10);
  return {
    start: `${day}T00:00:00.000Z`,
    end: new Date(`${day}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
  };
}

export function classifySameDayListingIngestReuseV1(row, workerStartedAt) {
  const bounds = utcDayBoundsV1(workerStartedAt);
  const rowStartedAt = asDate(row?.started_at);
  const payload = row?.payload ?? {};
  const child = payload.child_report ?? {};
  const boundary = child.boundary ?? {};
  const sourceRun = child.source_acquisition_run ?? {};
  const reasons = [];

  if (row?.pipeline !== "mee_nightly") reasons.push("wrong_pipeline");
  if (row?.phase !== "listing_ingest") reasons.push("wrong_phase");
  if (row?.status !== "succeeded") reasons.push("not_succeeded");
  if ((Number(row?.failed_count) || 0) !== 0) reasons.push("failed_count_nonzero");
  if (!rowStartedAt) {
    reasons.push("invalid_started_at");
  } else if (rowStartedAt.getTime() < new Date(bounds.start).getTime() || rowStartedAt.getTime() >= bounds.end) {
    reasons.push("outside_worker_utc_day");
  }
  if (child.package_id !== PACKAGE_ID) reasons.push("wrong_child_package");
  if (!ACCEPTED_OUTCOMES.has(child.outcome)) reasons.push("child_outcome_not_reusable");
  if ((Number(child.provider_phase_count) || 0) < 1) reasons.push("provider_phase_not_proven");
  if (!sourceRun.id || !sourceRun.run_key) reasons.push("source_acquisition_run_missing");
  for (const key of REQUIRED_FALSE_BOUNDARIES) {
    if (boundary[key] !== false) reasons.push(`child_boundary_not_sealed:${key}`);
  }

  return {
    reusable: reasons.length === 0,
    reasons,
    evidence: reasons.length
      ? null
      : {
          phase_run_id: row.id,
          run_key: row.run_key,
          started_at: row.started_at,
          finished_at: row.finished_at,
          child_package_id: child.package_id,
          child_outcome: child.outcome,
          source_acquisition_run: sourceRun,
          provider_phase_count: Number(child.provider_phase_count),
        },
  };
}
