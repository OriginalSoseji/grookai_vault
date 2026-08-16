import { stableJson } from "./one_piece_canonical_import_staging_v1.mjs";

export const ONE_PIECE_COMPLETE_NUMBERED_ROLLBACK_CANARY_VERSION =
  "ONE_PIECE_COMPLETE_NUMBERED_CANONICAL_ROLLBACK_CANARY_V1";

export const ONE_PIECE_COMPLETE_NUMBERED_CANARY_ROLES = Object.freeze([
  { role: "booster", set_code: "OP01" },
  { role: "starter", set_code: "ST02" },
  { role: "extra_booster", set_code: "EB01" },
  { role: "premium_booster", set_code: "PRB01" },
  { role: "promotion", set_code: "P" },
]);

export const ONE_PIECE_COMPLETE_NUMBERED_CANARY_WRITES = Object.freeze({
  sets: 5,
  card_prints: 5,
  card_print_identity: 5,
  card_print_identity_source_evidence: 5,
  external_mappings: 5,
});

function compareText(left, right) {
  const first = String(left);
  const second = String(right);
  return first < second ? -1 : first > second ? 1 : 0;
}

export function selectOnePieceCompleteNumberedCanaryV1(plan) {
  const setRows = new Map((plan?.payload?.set_rows ?? []).map((row) =>
    [row.code, row]));
  const rows = [...(plan?.payload?.numbered_cards ?? [])].sort((left, right) =>
    Number(left.source_product_id) - Number(right.source_product_id));
  return ONE_PIECE_COMPLETE_NUMBERED_CANARY_ROLES.map(({ role, set_code }) => {
    const setRow = setRows.get(set_code);
    const numberedCard = rows.find((row) => row.set_code === set_code);
    if (!setRow || !numberedCard) {
      throw new Error(`Canary role is unavailable: ${role}:${set_code}`);
    }
    return {
      role,
      set_code,
      set_row: structuredClone(setRow),
      numbered_card: structuredClone(numberedCard),
    };
  });
}

function ordered(values, field = "id") {
  return [...values].sort((left, right) => compareText(left[field], right[field]));
}

export function expectedOnePieceCompleteNumberedCanaryReadbackV1(sample) {
  return {
    sets: ordered(sample.map((item) => ({
      id: item.set_row.id,
      code: item.set_row.code,
    })), "code"),
    card_prints: ordered(sample.map(({ numbered_card: row }) => ({
      id: row.card_print.id,
      set_id: row.card_print.set_id,
      gv_id: row.card_print.gv_id,
      tcgplayer_id: row.card_print.tcgplayer_id,
    }))),
    identities: ordered(sample.map(({ numbered_card: row }) => ({
      id: row.identity.id,
      card_print_id: row.identity.card_print_id,
      identity_key_hash: row.identity.identity_key_hash,
    }))),
    source_evidence: ordered(sample.map(({ numbered_card: row }) => ({
      id: row.source_evidence.id,
      card_print_identity_id: row.source_evidence.card_print_identity_id,
      card_print_id: row.source_evidence.card_print_id,
      evidence_key_hash: row.source_evidence.evidence_key_hash,
    }))),
    external_mappings: ordered(sample.map(({ numbered_card: row }) => ({
      card_print_id: row.external_mapping.card_print_id,
      source: row.external_mapping.source,
      external_id: row.external_mapping.external_id,
    })), "external_id"),
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_role_visible: false,
  };
}

export function expectedOnePieceCompleteNumberedCanaryWritesV1() {
  return Object.entries(ONE_PIECE_COMPLETE_NUMBERED_CANARY_WRITES)
    .map(([table_name, inserted]) => ({
      table_name,
      inserted,
      updated: 0,
      deleted: 0,
      hot_updated: 0,
    }))
    .sort((left, right) => compareText(left.table_name, right.table_name));
}

function normalizeWrites(rows) {
  return (rows ?? []).map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  })).sort((left, right) => compareText(left.table_name, right.table_name));
}

export function evaluateOnePieceCompleteNumberedCanaryTransactionV1({
  sample,
  readback,
  attributableWrites,
}) {
  const findings = [];
  if (stableJson(readback) !== stableJson(
    expectedOnePieceCompleteNumberedCanaryReadbackV1(sample))) {
    findings.push("transaction_readback_mismatch");
  }
  if (stableJson(normalizeWrites(attributableWrites)) !== stableJson(
    expectedOnePieceCompleteNumberedCanaryWritesV1())) {
    findings.push("attributable_writes_mismatch");
  }
  return findings;
}

export function evaluateOnePieceCompleteNumberedCanaryPostRollbackV1({
  before,
  after,
  afterEvaluation,
}) {
  const findings = [...(afterEvaluation?.findings ?? []).map((finding) =>
    `post_rollback:${finding}`)];
  if (afterEvaluation?.valid !== true) {
    findings.push("post_rollback_preflight_failed");
  }
  for (const field of ["foundation", "baseline", "retained_rows",
    "staging_rows", "collisions"]) {
    if (stableJson(before?.[field]) !== stableJson(after?.[field])) {
      findings.push(`post_rollback_drift:${field}`);
    }
  }
  return [...new Set(findings)];
}
