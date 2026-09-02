import { validateCurrentMarketTrace } from "./tcgplayer_market_provenance_policy_v1.mjs";

export const PRICING_TRUST_SPOT_CHECK_POLICY_V1 =
  "PRICING_TRUST_SPOT_CHECK_POLICY_V1";

function text(value) {
  return String(value ?? "").trim();
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function evaluatePricingTrustSampleV1(sample) {
  const findings = validateCurrentMarketTrace(
    sample.identity,
    sample.read_model,
    sample.trace,
  );
  const { read_model: readModel, trace, source_observation: source } = sample;

  if (readModel.status !== "available") findings.push("price_unavailable");
  if (readModel.currency !== "USD") findings.push("currency_not_usd");
  if (readModel.freshness !== "fresh") findings.push("price_not_fresh");
  if (money(readModel.market_close) === null || money(readModel.market_close) <= 0) {
    findings.push("market_close_not_positive");
  }
  if (readModel.source_name !== "tcgplayer") findings.push("source_not_tcgplayer");
  if (readModel.source_label !== "TCGPlayer Market") {
    findings.push("source_label_not_exact_market");
  }

  if (trace?.publication_lane !== "current") {
    findings.push("trace_not_current_lane");
  }
  if (trace?.language_result !== "english") {
    findings.push("trace_language_not_english");
  }
  if (trace?.finish_result !== "exact_child_finish") {
    findings.push("trace_finish_not_exact");
  }
  if (trace?.source_integrity_result !== "passed") {
    findings.push("trace_source_integrity_failed");
  }
  if (trace?.duplicate_product_result !== "unique") {
    findings.push("trace_duplicate_product_not_unique");
  }
  if (trace?.freshness_result !== "fresh") {
    findings.push("trace_freshness_not_fresh");
  }

  if (!source) {
    findings.push("source_observation_missing");
  } else {
    if (text(source.id) !== text(trace?.source_observation_id)) {
      findings.push("source_observation_id_mismatch");
    }
    if (text(source.source_price_row_identity) !== text(trace?.source_price_row_identity)) {
      findings.push("source_price_row_identity_mismatch");
    }
    if (text(source.payload_hash) !== text(trace?.source_row_hash)) {
      findings.push("source_row_hash_mismatch");
    }
    if (Number(source.product_id) !== Number(trace?.source_product_id)) {
      findings.push("source_product_id_mismatch");
    }
    if (text(source.subtype_name) !== text(trace?.source_subtype_name)) {
      findings.push("source_subtype_mismatch");
    }
    if (source.currency !== "USD") findings.push("source_currency_not_usd");
    if (money(source.market_price) !== money(readModel.market_close)) {
      findings.push("source_market_close_mismatch");
    }
  }

  return [...new Set(findings)].sort();
}
