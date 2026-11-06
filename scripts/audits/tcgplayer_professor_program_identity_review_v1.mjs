import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TCGPLAYER_PROFESSOR_PROGRAM_IDENTITY_REVIEW_V1 =
  "TCGPLAYER_PROFESSOR_PROGRAM_IDENTITY_REVIEW_V1";

const GROUP_ID = 2332;
const GROUP_NAME = "Professor Program Promos";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_MASTER_ROOT = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "verified_master_set_index_v1",
  "english_master_index_v1",
);
const SOURCE_FINISH = Object.freeze({
  Holofoil: "holo",
  Normal: "normal",
  "Reverse Holofoil": "reverse",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function parseArgs(args) {
  const options = {};
  for (const token of args) {
    const match = /^--(blocked|out|master-root|grookai-audit)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  assert.ok(options.blocked, "--blocked is required");
  assert.ok(options.out, "--out is required");
  const masterRoot = path.resolve(options["master-root"] ?? DEFAULT_MASTER_ROOT);
  return {
    blocked: path.resolve(options.blocked),
    out: path.resolve(options.out),
    masterRoot,
    grookaiAudit: path.resolve(options["grookai-audit"] ??
      path.join(masterRoot, "english_master_index_grookai_audit_v1.json")),
  };
}

function text(value) {
  return String(value ?? "").trim();
}

export function normalizeProfessorProgramNameV1(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/\bprof\.(?=\s)/gi, "professor")
    .replace(/\s+-\s+\d+\s*\/\s*\d+\b/gi, " ")
    .replace(/\s*\((?:19|20)\d{2}(?:-(?:(?:19|20)?\d{2}))?\)\s*$/i, "")
    .replace(/[\[\]()]/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function baseNameWithoutIdentityQualifier(value) {
  return normalizeProfessorProgramNameV1(value)
    .replace(/\s+(?:top\s+8|finalist)$/, "")
    .trim();
}

function identityQualifier(value) {
  const normalized = normalizeProfessorProgramNameV1(value);
  if (/\btop\s+8\b/.test(normalized)) return "top_8";
  if (/\bfinalist\b/.test(normalized)) return "finalist";
  return null;
}

function numerator(value) {
  const match = /^(\d+)/.exec(text(value));
  return match ? String(Number(match[1])) : text(value).replace(/^0+/, "") || "0";
}

function denominator(value) {
  const match = /\/(\d+)\s*$/.exec(text(value));
  return match ? Number(match[1]) : null;
}

function collectDeclaredSetTotals(set) {
  const exact = new Set();
  const fallback = new Set();
  for (const source of Object.values(set?.source_totals ?? {})) {
    if (!source || typeof source !== "object") continue;
    for (const [key, value] of Object.entries(source)) {
      const number = Number(value);
      if (!Number.isInteger(number) || number <= 0) continue;
      if (/printed|official/i.test(key)) exact.add(number);
      else if (/total/i.test(key)) fallback.add(number);
    }
  }
  return { exact: [...exact].sort((a, b) => a - b), fallback: [...fallback].sort((a, b) => a - b) };
}

function isEnergyAlias(left, right) {
  return left === right || left.replace(/^basic\s+/, "") === right.replace(/^basic\s+/, "");
}

function namesMatch(sourceName, masterName) {
  const left = baseNameWithoutIdentityQualifier(sourceName);
  const right = normalizeProfessorProgramNameV1(masterName);
  return left === right || (/energy$/.test(left) && /energy$/.test(right) && isEnergyAlias(left, right));
}

function sourceHasProfessorProgramEvidence(row) {
  const values = [
    ...(row.sources ?? []),
    ...(row.source_authorities ?? []),
    ...(row.source_evidence ?? []).flatMap((item) => Object.values(item ?? {})),
    ...(row.evidence_urls ?? []),
  ];
  return values.some((value) => /professor[\s_-]*program|professor%20program/i.test(text(value)));
}

function finishEvidenceForCandidate(printings, sourceFinish) {
  const exactFinish = printings.filter((row) => row.finish_key === sourceFinish);
  const professorProgram = printings.filter((row) => sourceHasProfessorProgramEvidence(row));
  return { exactFinish, professorProgram };
}

function stableCandidate(row) {
  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    status: row.status,
    sources: row.sources,
    evidence_urls: row.evidence_urls,
  };
}

function stablePrinting(row) {
  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    status: row.status,
    sources: row.sources,
    evidence_urls: row.evidence_urls,
    professor_program_evidence: sourceHasProfessorProgramEvidence(row),
  };
}

export function reviewProfessorProgramProductV1({ source, cards, printings, setsByKey, grookaiRows }) {
  assert.equal(Number(source.source_group_id), GROUP_ID, "source_group_id_changed");
  assert.equal(text(source.source_group_name), GROUP_NAME, "source_group_name_changed");
  const sourceFinish = source.source_subtypes?.length === 1
    ? SOURCE_FINISH[source.source_subtypes[0]] ?? null
    : null;
  const sourceNumber = numerator(source.printed_number);
  const sourceDenominator = denominator(source.printed_number);
  const qualifier = identityQualifier(source.source_product_name);
  const nameNumberMatches = cards.filter((card) =>
    numerator(card.card_number) === sourceNumber && namesMatch(source.source_product_name, card.card_name));
  const denominatorMatches = nameNumberMatches.filter((card) => {
    const totals = collectDeclaredSetTotals(setsByKey.get(card.set_key));
    return sourceDenominator !== null && (totals.exact.includes(sourceDenominator) ||
      (totals.exact.length === 0 && totals.fallback.includes(sourceDenominator)));
  });
  const candidates = denominatorMatches.length > 0 ? denominatorMatches : nameNumberMatches;
  const uniqueCandidate = candidates.length === 1 ? candidates[0] : null;
  const candidatePrintings = uniqueCandidate ? printings.filter((printing) =>
    printing.set_key === uniqueCandidate.set_key &&
    numerator(printing.card_number) === sourceNumber &&
    normalizeProfessorProgramNameV1(printing.card_name) ===
      normalizeProfessorProgramNameV1(uniqueCandidate.card_name)) : [];
  const finishEvidence = finishEvidenceForCandidate(candidatePrintings, sourceFinish);
  const liveRows = uniqueCandidate ? grookaiRows.filter((row) =>
    row.set_key === uniqueCandidate.set_key &&
    numerator(row.card_number) === sourceNumber &&
    normalizeProfessorProgramNameV1(row.index_card_name) ===
      normalizeProfessorProgramNameV1(uniqueCandidate.card_name) &&
    row.finish_key === sourceFinish) : [];
  const liveProfessorProgramRows = liveRows.filter((row) =>
    text(row.variant_key) === "professor_program_stamp" &&
    text(row.printed_identity_modifier) === "professor_program_stamp");

  let disposition = "hold";
  let reason = "ambiguous_underlying_set_identity";
  if (!sourceFinish) reason = "unsupported_or_multiple_source_subtypes";
  else if (qualifier) reason = "identity_bearing_event_qualifier_requires_distinct_parent";
  else if (candidates.length === 0) reason = "no_master_index_name_number_set_total_match";
  else if (candidates.length > 1) reason = "ambiguous_underlying_set_identity";
  else if (finishEvidence.professorProgram.length === 0) {
    reason = "professor_program_stamp_not_proven_by_master_index";
  }
  else if (finishEvidence.exactFinish.length === 0) reason = "source_finish_not_proven_by_master_index";
  else if (liveRows.length === 0) reason = "live_exact_finish_parent_link_not_proven";
  else if (liveProfessorProgramRows.length === 0) {
    reason = "live_professor_program_parent_link_not_proven";
  } else if (new Set(liveProfessorProgramRows.map((row) => row.grookai_card_print_id)).size !== 1) {
    reason = "multiple_live_parent_targets_require_variant_adjudication";
  } else {
    disposition = "authority_candidate";
    reason = "exact_set_identity_stamp_finish_and_live_parent_proven";
  }

  const setTotals = uniqueCandidate ? collectDeclaredSetTotals(setsByKey.get(uniqueCandidate.set_key)) : null;
  return {
    source_product_id: Number(source.source_product_id),
    source_product_name: source.source_product_name,
    source_group_id: Number(source.source_group_id),
    source_group_name: source.source_group_name,
    printed_number: source.printed_number,
    source_subtypes: source.source_subtypes,
    source_finish_key: sourceFinish,
    identity_qualifier: qualifier,
    disposition,
    reason,
    match_counts: {
      name_number: nameNumberMatches.length,
      name_number_set_total: denominatorMatches.length,
      selected_candidates: candidates.length,
      exact_finish_evidence: finishEvidence.exactFinish.length,
      professor_program_evidence: finishEvidence.professorProgram.length,
      live_exact_finish_rows: liveRows.length,
      live_professor_program_rows: liveProfessorProgramRows.length,
      live_parent_targets: new Set(liveProfessorProgramRows.map((row) =>
        row.grookai_card_print_id)).size,
    },
    selected_set_totals: setTotals,
    master_candidates: candidates.map(stableCandidate),
    master_printings: candidatePrintings.map(stablePrinting),
    live_targets: liveRows.map((row) => ({
      status: row.status,
      card_print_id: row.grookai_card_print_id,
      printing_id: row.grookai_printing_id,
      grookai_card_name: row.grookai_card_name,
      finish_key: row.finish_key,
      variant_key: row.variant_key ?? null,
      printed_identity_modifier: row.printed_identity_modifier ?? null,
      note: row.note,
    })),
  };
}

async function readJson(file) {
  const bytes = await fs.readFile(file);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

async function readJsonl(file) {
  const bytes = await fs.readFile(file);
  return {
    bytes,
    value: bytes.toString("utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)),
  };
}

export async function buildProfessorProgramIdentityReviewV1(args) {
  const options = parseArgs(args);
  const files = {
    blocked: await readJsonl(options.blocked),
    sets: await readJson(path.join(options.masterRoot, "english_master_index_sets_v1.json")),
    cards: await readJson(path.join(options.masterRoot, "english_master_index_cards_v1.json")),
    printings: await readJson(path.join(options.masterRoot, "english_master_index_printings_v1.json")),
    grookai: await readJson(options.grookaiAudit),
  };
  const sources = files.blocked.value.filter((row) => Number(row.source_group_id) === GROUP_ID);
  assert.equal(sources.length, 48, "professor_program_source_count_changed");
  assert.equal(new Set(sources.map((row) => Number(row.source_product_id))).size, sources.length,
    "duplicate_source_product_id");
  const setsByKey = new Map(files.sets.value.sets.map((set) => [set.key, set]));
  const rows = sources.map((source) => reviewProfessorProgramProductV1({
    source,
    cards: files.cards.value.cards,
    printings: files.printings.value.printings,
    setsByKey,
    grookaiRows: files.grookai.value.rows,
  })).sort((left, right) => left.source_product_id - right.source_product_id);
  const dispositionCounts = Object.fromEntries([...new Set(rows.map((row) => row.disposition))].sort()
    .map((key) => [key, rows.filter((row) => row.disposition === key).length]));
  const reasonCounts = Object.fromEntries([...new Set(rows.map((row) => row.reason))].sort()
    .map((key) => [key, rows.filter((row) => row.reason === key).length]));
  const report = {
    version: TCGPLAYER_PROFESSOR_PROGRAM_IDENTITY_REVIEW_V1,
    audit_only: true,
    db_reads: false,
    db_writes: false,
    mapping_writes: false,
    scope: { source_group_id: GROUP_ID, source_group_name: GROUP_NAME, source_products: rows.length },
    source_hashes_sha256: {
      blocked_jsonl: sha256(files.blocked.bytes),
      master_sets: sha256(files.sets.bytes),
      master_cards: sha256(files.cards.bytes),
      master_printings: sha256(files.printings.bytes),
      grookai_audit: sha256(files.grookai.bytes),
    },
    summary: { disposition_counts: dispositionCounts, reason_counts: reasonCounts },
    boundaries: {
      group_label_is_not_set_authority: true,
      source_subtype_is_not_stamp_authority: true,
      identity_bearing_event_qualifiers_are_preserved: true,
      authority_candidates_require_unique_live_parent: true,
      report_is_not_mutation_authority: true,
    },
    rows,
  };
  await fs.mkdir(path.dirname(options.out), { recursive: true });
  await fs.writeFile(options.out, jsonBytes(report), { flag: "wx" });
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildProfessorProgramIdentityReviewV1(process.argv.slice(2)).then((report) => {
    process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
