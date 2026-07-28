function text(value) {
  return String(value ?? "").trim();
}

export function validateMarketTraceCompleteness(identity, trace) {
  const failures = [];
  if (!trace) {
    failures.push("trace_missing");
    return failures;
  }
  if (trace.card_printing_id !== identity.card_printing_id) {
    failures.push("trace_printing_id_mismatch");
  }
  if (trace.printing_gv_id !== identity.printing_gv_id) {
    failures.push("trace_printing_gv_id_mismatch");
  }
  for (const field of [
    "publication_set_id",
    "run_id",
    "qualification_decision_id",
    "source_observation_id",
    "source_sync_run_id",
    "source_artifact_id",
    "source_artifact_hash",
    "source_price_row_identity",
    "source_row_hash",
    "source_mapping_id",
    "variant_assignment_id",
    "policy_version",
  ]) {
    if (!text(trace[field])) failures.push(`trace_missing_${field}`);
  }
  return failures;
}

export function validateCurrentMarketTrace(identity, readModel, trace) {
  const failures = [];
  if (readModel.pricing_scope !== "card_printing") {
    failures.push("read_model_scope_mismatch");
  }
  if (readModel.card_printing_id !== identity.card_printing_id) {
    failures.push("read_model_printing_id_mismatch");
  }
  if (readModel.printing_gv_id !== identity.printing_gv_id) {
    failures.push("read_model_printing_gv_id_mismatch");
  }
  if (readModel.status !== "available") {
    failures.push("read_model_not_available");
    return failures;
  }
  if (!readModel.provenance_id) {
    failures.push("read_model_missing_provenance_id");
  }
  failures.push(...validateMarketTraceCompleteness(identity, trace));
  if (!trace) return failures;
  if (trace.provenance_id !== readModel.provenance_id) {
    failures.push("trace_provenance_id_mismatch");
  }
  if (Number(trace.market_price) !== Number(readModel.market_close)) {
    failures.push("trace_market_close_mismatch");
  }
  return failures;
}
