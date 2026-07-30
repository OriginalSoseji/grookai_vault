import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import {
  assertCardVisualCorpusBranchV1,
  sha256JsonV1,
} from "./card_visual_corpus_v1_inventory.mjs";
import {
  curatedCameoEvidenceDecisionV2,
} from "./card_visual_search_curated_cameo_v1.mjs";
import {
  assertCardVisualExternalSourceRegistrySafeV1,
  CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_VERSION,
  getCardVisualExternalSourceV1,
} from "./card_visual_external_source_registry_v1.mjs";
import {
  normalizeVisualSearchTextV1,
  tokenizeVisualSearchTextV1,
} from "./card_visual_search_evaluation_bootstrap_v1.mjs";
import {
  CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_VERSION,
} from "./card_visual_search_tcg_concepts_v1.mjs";

export const CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION =
  "CARD_VISUAL_SEARCH_CORPUS_RELEASE_V2";
export const CARD_VISUAL_SEARCH_REPAIR_LEDGER_VERSION =
  "CARD_VISUAL_SEARCH_REPAIR_LEDGER_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_RELEASE_ROOT =
  "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721";
const DEFAULT_REBUILD_ROOT =
  `${DEFAULT_RELEASE_ROOT}/_rebuild/productization_bbf20d0f`;
const DEFAULT_PROJECTION_DIR = `${DEFAULT_REBUILD_ROOT}/projection`;
const DEFAULT_ELIGIBILITY_DIR = `${DEFAULT_REBUILD_ROOT}/eligibility`;
const DEFAULT_CAMEO_REFERENCE =
  `${DEFAULT_RELEASE_ROOT}/_analysis/card_visual_cameo_reference_import_v1/2026-07-30T05-21-18-311Z_import_0f9c53c4c02e/canonical_matches.jsonl`;
const DEFAULT_REVIEWED_EVIDENCE =
  "docs/evidence/card_visual_search_founder_reviews_v1.json";
const DEFAULT_MIGRATION =
  "supabase/migrations/20260729173000_card_visual_search_persistence_v1.sql";
const DEFAULT_OUTPUT_ROOT =
  `${DEFAULT_RELEASE_ROOT}/_rebuild/unified_collector_search_v2`;
const EXPECTED_DOCUMENT_TYPES = Object.freeze([
  "subject",
  "scene",
  "style_composition",
  "representation_cameo",
]);
const SEARCHABLE_ASSERTION_ROLES = new Set([
  "scene_subject",
  "depicted_subject",
  "character_representation",
  "visual_resemblance_reference",
]);

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const value = argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export function parseCardVisualSearchCorpusReleaseArgsV2(argv = []) {
  return {
    projectionDir: parseFlag(argv, "projection-dir") ?? DEFAULT_PROJECTION_DIR,
    eligibilityDir:
      parseFlag(argv, "eligibility-dir") ?? DEFAULT_ELIGIBILITY_DIR,
    cameoReference:
      parseFlag(argv, "cameo-reference") ?? DEFAULT_CAMEO_REFERENCE,
    reviewedEvidence:
      parseFlag(argv, "reviewed-evidence") ?? DEFAULT_REVIEWED_EVIDENCE,
    migration: parseFlag(argv, "migration") ?? DEFAULT_MIGRATION,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
  };
}

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function displayPath(value) {
  const relative = path.relative(REPO_ROOT, value);
  return relative.startsWith("..") ? path.resolve(value) : relative.replace(/\\/gu, "/");
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/gu, "-");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function currentGitState() {
  const git = (args) =>
    execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  return {
    commit_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    tracked_status_short: git(["status", "--short", "--untracked-files=no"]),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const rows = [];
  await forEachJsonl(filePath, (row) => rows.push(row));
  return rows;
}

async function forEachJsonl(filePath, callback) {
  const input = readline.createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  let lineNumber = 0;
  for await (const line of input) {
    lineNumber += 1;
    if (!line.trim()) continue;
    callback(JSON.parse(line), lineNumber);
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    rows.map((row) => JSON.stringify(row)).join("\n") +
      (rows.length ? "\n" : ""),
  );
}

async function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function countBy(rows, selector) {
  const result = {};
  for (const row of rows) {
    const key = selector(row) ?? "unknown";
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

async function verifyManifest(directory, manifest) {
  const mismatches = [];
  for (const [file, expected] of Object.entries(manifest.files ?? {})) {
    const actual = await hashFile(path.join(directory, file));
    if (actual !== expected) mismatches.push({ file, expected, actual });
  }
  return mismatches;
}

function stableCandidateId(row) {
  return `cvsec_${sha256JsonV1({
    source: row.source ?? "rotomamiti_cameo_database",
    source_record_id: row.source_record_id,
    card_print_id: row.canonical_match?.card_print_id,
    represented_identity: row.cameo_identity,
  }).slice(0, 24)}`;
}

function representationForm(row, role) {
  if (role !== "character_representation") return null;
  const modes = uniqueSorted(row.display_mode_terms ?? []);
  const details = uniqueSorted(row.representation_details ?? []);
  if (modes.includes("food")) {
    return details.length ? `food shape: ${details.join(" ")}` : "food shape";
  }
  return modes[0] ?? null;
}

function externalCandidate(row, groupId) {
  const decision = curatedCameoEvidenceDecisionV2(row);
  const source = getCardVisualExternalSourceV1(
    row.source ?? "rotomamiti_cameo_database",
  );
  const candidate = {
    candidate_version: "CARD_VISUAL_EVIDENCE_CANDIDATE_V2",
    candidate_id: stableCandidateId(row),
    source_registry_key: source?.source_key ?? "rotomamiti_cameo_database",
    source_name: row.source ?? "rotomamiti_cameo_database",
    source_url: source?.homepage_url ?? null,
    source_record_id: row.source_record_id,
    source_record_hash: sha256JsonV1(row),
    card_print_id: row.canonical_match?.card_print_id ?? null,
    artwork_group_id: groupId ?? null,
    represented_identity_kind: row.cameo_identity_kind ?? "pokemon",
    represented_identity: row.cameo_identity,
    proposed_appearance_role:
      decision.appearance_role ?? "curated_association_unresolved",
    proposed_host_surface: row.host_surface ?? null,
    proposed_host_object: row.host_object ?? null,
    proposed_representation_form: representationForm(
      row,
      decision.appearance_role,
    ),
    governance_status: decision.governance_status,
    review_reason: decision.reason,
    reconciliation_status: !groupId
      ? "outside_release"
      : decision.search_eligible
        ? "promotion_ready"
        : "needs_review",
    source_license_provenance: {
      permission_status: source?.permission_status ?? null,
      acquisition_mode: source?.acquisition_mode ?? null,
      authority_ceiling: source?.authority_ceiling ?? null,
      snapshot_only: source?.permission_status === "existing_snapshot_only",
    },
    raw_payload: row,
  };
  candidate.candidate_hash = sha256JsonV1(candidate);
  return { candidate, decision };
}

function assertionFromReviewedRow(row, groupId) {
  const decision = curatedCameoEvidenceDecisionV2(row);
  if (
    !decision.search_eligible ||
    !groupId ||
    !SEARCHABLE_ASSERTION_ROLES.has(decision.appearance_role)
  ) {
    return null;
  }
  const governance = decision.governance_status;
  const authority =
    governance === "human_image_confirmed"
      ? "human_image_confirmed"
      : "external_role_confirmed";
  const payload = {
    assertion_version: "CARD_VISUAL_EVIDENCE_ASSERTION_V2",
    card_print_id: row.canonical_match.card_print_id,
    artwork_group_id: groupId,
    represented_identity_kind: row.cameo_identity_kind ?? "pokemon",
    represented_identity: row.cameo_identity,
    appearance_role: decision.appearance_role,
    host_surface: row.host_surface ?? null,
    host_object: row.host_object ?? null,
    representation_form: representationForm(row, decision.appearance_role),
    evidence_authority: authority,
    supporting_observation_ids: [],
    supporting_external_evidence_ids: [row.source_record_id],
    evidence_payload: {
      source: row.source ?? null,
      notes: row.notes ?? null,
      display_mode_terms: uniqueSorted(row.display_mode_terms ?? []),
      representation_details: uniqueSorted(row.representation_details ?? []),
      evidence_boundary: row.evidence_boundary ?? null,
      governance_status: governance,
    },
  };
  payload.assertion_hash = sha256JsonV1(payload);
  return payload;
}

function addIndexEntry(index, row) {
  const indexKey = normalizeVisualSearchTextV1(row.index_key);
  if (!indexKey) return;
  const key = `${row.index_kind}\u001f${indexKey}\u001f${row.artwork_group_id}`;
  if (index.has(key)) return;
  index.set(key, {
    index_version: "CARD_VISUAL_SEARCH_INDEX_ENTRIES_V2",
    index_kind: row.index_kind,
    index_key: indexKey,
    artwork_group_id: row.artwork_group_id,
    search_document_id: row.search_document_id ?? null,
    source_authority: row.source_authority ?? "observation_backed",
  });
}

function indexTerm(index, artworkGroupId, documentId, term, authority) {
  const normalized = normalizeVisualSearchTextV1(term);
  if (!normalized) return;
  addIndexEntry(index, {
    index_kind: "exact_term",
    index_key: normalized,
    artwork_group_id: artworkGroupId,
    search_document_id: documentId,
    source_authority: authority,
  });
  for (const token of tokenizeVisualSearchTextV1(normalized)) {
    addIndexEntry(index, {
      index_kind: "token",
      index_key: token,
      artwork_group_id: artworkGroupId,
      search_document_id: documentId,
      source_authority: authority,
    });
  }
}

function emptyLedger(artwork) {
  return {
    ledger_version: CARD_VISUAL_SEARCH_REPAIR_LEDGER_VERSION,
    artwork_group_id: artwork.artwork_group_id,
    representative_card_print_id: artwork.representative_card_print_id,
    prompt_branch: artwork.prompt_branch,
    eligibility_tier: artwork.eligibility_tier,
    review_status: artwork.review_status,
    source_fact_graph_sha256: artwork.source_fact_graph_sha256,
    source_generated_row_sha256: artwork.source_generated_row_sha256,
    source_image_sha256: artwork.source_image_sha256,
    source_payload_mutated: false,
    projection_document_count: 0,
    projected_evidence_count: 0,
    projection_exclusion_count: artwork.exclusion_count ?? 0,
    tcg_concept_count: 0,
    tcg_concept_families: [],
    appearance_roles: [],
    external_candidate_count: 0,
    active_external_assertion_count: 0,
    diagnostics: [],
    release_disposition:
      artwork.eligibility_tier === "A"
        ? "release_tier_a"
        : "release_tier_b_guarded",
  };
}

function markdownReport(report) {
  const c = report.reconciliation.counts;
  return `# Card Visual Search Corpus Release V2

Generated: ${report.created_at}

## Result

- Reconciled: \`${report.reconciliation.reconciled}\`
- Source candidates accounted: \`${c.source_candidates_accounted}\`
- Searchable printings: \`${c.printings}\`
- Coverage gaps / Tier C: \`${c.coverage_gaps}\`
- Artwork groups: \`${c.artworks}\`
- Projection documents: \`${c.documents}\`
- Projected evidence: \`${c.evidence}\`
- Deterministic TCG concepts: \`${c.tcg_concepts}\`
- External candidate rows: \`${c.external_candidates}\`
- Active governed external assertions: \`${c.external_assertions}\`
- Materialized index entries: \`${c.index_entries}\`
- Reconciliation findings: \`${report.reconciliation.findings.length}\`

## Source Boundary

All paid Fact Graph payload hashes remain unchanged. TCG concepts are derived
only from already accepted evidence and retain source observation IDs. External
rows remain candidates unless their appearance role has governed authority.

## Cost And Write Boundary

- Provider calls: \`0\`
- AI cost: \`$0\`
- Database connections: \`0\`
- Database writes: \`0\`
- Embeddings: \`0\`
- Release activation: \`false\`

## Exact Next Gate

Run the fixed 200-query calibration suite plus the high-risk V2 regressions
against this immutable release. Do not execute the sealed holdout, apply the
migration, load the database, or activate signed-in search until calibration
and reconciliation pass.
`;
}

export async function buildCardVisualSearchCorpusReleaseV2(args) {
  assertCardVisualExternalSourceRegistrySafeV1();
  const git = currentGitState();
  assertCardVisualCorpusBranchV1(git.branch);
  if (git.tracked_status_short) {
    throw new Error(
      `tracked working tree must be clean: ${git.tracked_status_short}`,
    );
  }

  const projectionDir = repoPath(args.projectionDir);
  const eligibilityDir = repoPath(args.eligibilityDir);
  const cameoReference = repoPath(args.cameoReference);
  const reviewedEvidence = repoPath(args.reviewedEvidence);
  const migrationPath = repoPath(args.migration);
  const projectionManifest = await readJson(
    path.join(projectionDir, "artifact_hashes.json"),
  );
  const projectionReport = await readJson(
    path.join(projectionDir, "PROJECTION_RECONCILIATION.json"),
  );
  if (
    projectionReport.version !== "CARD_VISUAL_SEARCH_PROJECTION_V2" ||
    projectionReport.reconciliation?.reconciled !== true
  ) {
    throw new Error("projection must be a reconciled V2 release");
  }
  const projectionHashMismatches = await verifyManifest(
    projectionDir,
    projectionManifest,
  );

  const eligibilityReport = await readJson(
    path.join(eligibilityDir, "ELIGIBILITY_RECONCILIATION.json"),
  );
  const [
    artworks,
    printings,
    eligibilityDecisions,
    curatedRows,
    reviewedPayload,
  ] = await Promise.all([
    readJsonl(path.join(projectionDir, "visual_search_artworks.jsonl")),
    readJsonl(path.join(projectionDir, "visual_search_printings.jsonl")),
    readJsonl(path.join(eligibilityDir, "eligibility_decisions.jsonl")),
    readJsonl(cameoReference),
    readJson(reviewedEvidence),
  ]);

  const artworkById = new Map(
    artworks.map((row) => [row.artwork_group_id, row]),
  );
  const groupByCardPrintId = new Map(
    printings.map((row) => [row.card_print_id, row.artwork_group_id]),
  );
  const ledgerByGroup = new Map(
    artworks.map((row) => [row.artwork_group_id, emptyLedger(row)]),
  );
  const index = new Map();

  for (const artwork of artworks) {
    addIndexEntry(index, {
      index_kind: "branch",
      index_key: artwork.prompt_branch,
      artwork_group_id: artwork.artwork_group_id,
    });
  }
  for (const printing of printings) {
    addIndexEntry(index, {
      index_kind: "subject",
      index_key: printing.name,
      artwork_group_id: printing.artwork_group_id,
    });
    indexTerm(index, printing.artwork_group_id, null, printing.name, "canonical");
    if (printing.set_code) {
      addIndexEntry(index, {
        index_kind: "set",
        index_key: printing.set_code,
        artwork_group_id: printing.artwork_group_id,
      });
    }
  }

  const documentTypesByGroup = new Map();
  let documentCount = 0;
  let structuredConceptCount = 0;
  let tcgConceptCount = 0;
  await forEachJsonl(
    path.join(projectionDir, "visual_search_documents.jsonl"),
    (document) => {
      documentCount += 1;
      const ledger = ledgerByGroup.get(document.artwork_group_id);
      if (!ledger) throw new Error(`document has unknown artwork ${document.artwork_group_id}`);
      ledger.projection_document_count += 1;
      const types = documentTypesByGroup.get(document.artwork_group_id) ?? new Set();
      types.add(document.document_type);
      documentTypesByGroup.set(document.artwork_group_id, types);
      for (const role of document.subject_role_keys ?? []) {
        ledger.appearance_roles.push(role);
        addIndexEntry(index, {
          index_kind: "role",
          index_key: role,
          artwork_group_id: document.artwork_group_id,
          search_document_id: document.search_document_id,
        });
      }
      for (const concept of document.structured_concepts ?? []) {
        structuredConceptCount += 1;
        indexTerm(
          index,
          document.artwork_group_id,
          document.search_document_id,
          concept.normalized_term ?? concept.term,
          concept.evidence_authority ?? "observation_backed",
        );
        if (concept.source_type === "tcg_concept") {
          tcgConceptCount += 1;
          ledger.tcg_concept_count += 1;
          ledger.tcg_concept_families.push(concept.category);
        }
      }
    },
  );

  let evidenceCount = 0;
  let missingObservationReferences = 0;
  await forEachJsonl(
    path.join(projectionDir, "visual_search_concept_evidence.jsonl"),
    (entry) => {
      evidenceCount += 1;
      const ledger = ledgerByGroup.get(entry.artwork_group_id);
      if (!ledger) throw new Error(`evidence has unknown artwork ${entry.artwork_group_id}`);
      ledger.projected_evidence_count += 1;
      if (
        !(entry.supporting_observation_ids ?? []).length &&
        !(entry.supporting_external_evidence_ids ?? []).length
      ) {
        missingObservationReferences += 1;
      }
    },
  );

  const externalCandidates = [];
  const externalAssertions = [];
  const reviewedRows = Array.isArray(reviewedPayload.records)
    ? reviewedPayload.records
    : [];
  for (const row of curatedRows) {
    const cardPrintId = row.canonical_match?.card_print_id ?? null;
    const groupId = groupByCardPrintId.get(cardPrintId) ?? null;
    const { candidate, decision } = externalCandidate(row, groupId);
    externalCandidates.push(candidate);
    if (groupId) {
      ledgerByGroup.get(groupId).external_candidate_count += 1;
    }
    if (decision.search_eligible) {
      const assertion = assertionFromReviewedRow(row, groupId);
      if (assertion) externalAssertions.push(assertion);
    }
  }
  for (const row of reviewedRows) {
    const cardPrintId = row.canonical_match?.card_print_id ?? null;
    const groupId = groupByCardPrintId.get(cardPrintId) ?? null;
    const assertion = assertionFromReviewedRow(row, groupId);
    if (!assertion) continue;
    externalAssertions.push(assertion);
  }
  for (const assertion of externalAssertions) {
    const groupId = assertion.artwork_group_id;
    const ledger = ledgerByGroup.get(groupId);
    ledger.active_external_assertion_count += 1;
    addIndexEntry(index, {
      index_kind: "subject",
      index_key: assertion.represented_identity,
      artwork_group_id: groupId,
      source_authority: assertion.evidence_authority,
    });
    addIndexEntry(index, {
      index_kind: "role",
      index_key: assertion.appearance_role,
      artwork_group_id: groupId,
      source_authority: assertion.evidence_authority,
    });
    indexTerm(
      index,
      groupId,
      null,
      [
        assertion.appearance_role,
        assertion.represented_identity,
        assertion.representation_form,
        assertion.host_object,
        assertion.host_surface,
      ]
        .filter(Boolean)
        .join(" "),
      assertion.evidence_authority,
    );
  }

  const ledgerRows = [...ledgerByGroup.values()]
    .map((row) => {
      row.appearance_roles = uniqueSorted(row.appearance_roles);
      row.tcg_concept_families = uniqueSorted(row.tcg_concept_families);
      if (row.projected_evidence_count < 5) {
        row.diagnostics.push("low_evidence_density_review_diagnostic");
      }
      if (!row.appearance_roles.length) {
        row.diagnostics.push("no_searchable_appearance_role_projected");
      }
      if (row.external_candidate_count && !row.active_external_assertion_count) {
        row.diagnostics.push("external_candidates_require_role_review");
      }
      row.ledger_hash = sha256JsonV1(row);
      return row;
    })
    .sort((left, right) =>
      left.artwork_group_id.localeCompare(right.artwork_group_id),
    );

  const coverageGaps = eligibilityDecisions
    .filter((row) => row.tier === "C")
    .map((row) => ({
      coverage_gap_version: "CARD_VISUAL_SEARCH_COVERAGE_GAP_V2",
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      source: row.source,
      source_outcome: row.source_outcome,
      reasons: row.critical_reasons,
      energy_card_detected: row.energy_card_detected,
      disposition: "excluded_from_search",
      source_regeneration_authorized: false,
      gap_hash: sha256JsonV1({
        card_print_id: row.card_print_id,
        source_outcome: row.source_outcome,
        reasons: row.critical_reasons,
      }),
    }));

  const indexEntries = [...index.values()].sort(
    (left, right) =>
      left.index_kind.localeCompare(right.index_kind) ||
      left.index_key.localeCompare(right.index_key) ||
      left.artwork_group_id.localeCompare(right.artwork_group_id),
  );
  const allAccountedIds = [
    ...printings.map((row) => row.card_print_id),
    ...coverageGaps.map((row) => row.card_print_id),
  ];
  const findings = [];
  if (projectionHashMismatches.length) {
    findings.push(`projection_hash_mismatches:${projectionHashMismatches.length}`);
  }
  if (artworks.length !== ledgerRows.length) findings.push("ledger_artwork_mismatch");
  if (documentCount !== artworks.length * EXPECTED_DOCUMENT_TYPES.length) {
    findings.push("document_count_mismatch");
  }
  for (const artwork of artworks) {
    const types = documentTypesByGroup.get(artwork.artwork_group_id) ?? new Set();
    if (EXPECTED_DOCUMENT_TYPES.some((type) => !types.has(type))) {
      findings.push(`missing_document_type:${artwork.artwork_group_id}`);
    }
  }
  if (evidenceCount !== structuredConceptCount) {
    findings.push("document_evidence_count_mismatch");
  }
  if (missingObservationReferences) {
    findings.push(`missing_evidence_references:${missingObservationReferences}`);
  }
  if (duplicates(allAccountedIds).length) findings.push("duplicate_accounted_ids");
  if (allAccountedIds.length !== eligibilityDecisions.length) {
    findings.push("source_candidate_accounting_mismatch");
  }
  if (
    eligibilityDecisions.some((row) => row.energy_card_detected) ||
    artworks.some((row) => row.prompt_branch === "energy")
  ) {
    findings.push("energy_row_in_release");
  }
  if (duplicates(externalCandidates.map((row) => row.candidate_id)).length) {
    findings.push("duplicate_external_candidate_ids");
  }
  if (duplicates(externalAssertions.map((row) => row.assertion_hash)).length) {
    findings.push("duplicate_external_assertion_hashes");
  }
  if (
    externalAssertions.some(
      (row) =>
        !SEARCHABLE_ASSERTION_ROLES.has(row.appearance_role) ||
        !(row.supporting_external_evidence_ids ?? []).length,
    )
  ) {
    findings.push("invalid_external_assertion");
  }

  const sourceHashes = {
    projection_reconciliation: await hashFile(
      path.join(projectionDir, "PROJECTION_RECONCILIATION.json"),
    ),
    projection_manifest: await hashFile(
      path.join(projectionDir, "artifact_hashes.json"),
    ),
    eligibility_reconciliation: await hashFile(
      path.join(eligibilityDir, "ELIGIBILITY_RECONCILIATION.json"),
    ),
    eligibility_decisions: await hashFile(
      path.join(eligibilityDir, "eligibility_decisions.jsonl"),
    ),
    curated_reference: await hashFile(cameoReference),
    reviewed_evidence: await hashFile(reviewedEvidence),
    migration: await hashFile(migrationPath),
  };
  const runKey = sha256JsonV1({
    version: CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION,
    commit_sha: git.commit_sha,
    source_hashes: sourceHashes,
  });
  const outputDir = args.outputDir
    ? repoPath(args.outputDir)
    : path.join(
        repoPath(args.outputRoot),
        `${safeTimestamp()}_release_${runKey.slice(0, 12)}`,
      );

  const counts = {
    source_candidates_accounted: allAccountedIds.length,
    artworks: artworks.length,
    printings: printings.length,
    coverage_gaps: coverageGaps.length,
    documents: documentCount,
    evidence: evidenceCount,
    tcg_concepts: tcgConceptCount,
    external_candidates: externalCandidates.length,
    external_assertions: externalAssertions.length,
    index_entries: indexEntries.length,
  };
  const runPlan = {
    version: CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    projection_dir: displayPath(projectionDir),
    eligibility_dir: displayPath(eligibilityDir),
    cameo_reference: displayPath(cameoReference),
    reviewed_evidence: displayPath(reviewedEvidence),
    migration: displayPath(migrationPath),
    source_hashes_sha256: sourceHashes,
    boundaries: {
      provider_calls: 0,
      ai_cost_usd: 0,
      fact_graph_mutations: 0,
      database_connections: 0,
      database_writes: 0,
      approvals: 0,
      embeddings: 0,
      release_activation: false,
    },
  };
  const reconciliation = {
    reconciled: findings.length === 0,
    findings: uniqueSorted(findings),
    counts,
    distributions: {
      eligibility_tiers: countBy(eligibilityDecisions, (row) => row.tier),
      source_outcomes: countBy(eligibilityDecisions, (row) => row.source_outcome),
      review_statuses: countBy(artworks, (row) => row.review_status),
      external_candidate_statuses: countBy(
        externalCandidates,
        (row) => row.reconciliation_status,
      ),
      assertion_roles: countBy(
        externalAssertions,
        (row) => row.appearance_role,
      ),
      index_kinds: countBy(indexEntries, (row) => row.index_kind),
    },
    projection_hash_mismatches: projectionHashMismatches,
    source_graph_hashes_preserved: true,
    zero_ai_reuse: true,
  };
  const releaseManifest = {
    release_version: CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION,
    release_key: `card_visual_search_v2_${runKey.slice(0, 16)}`,
    created_at: nowIso(),
    producing_commit_sha: git.commit_sha,
    source_release_id: "card_visual_search_corpus_release_v1_1_20260721",
    source_projection_version: projectionReport.version,
    eligibility_policy_version: eligibilityReport.version,
    fact_schema_version: "CARD_VISUAL_FACT_GRAPH_SCHEMA_V2",
    controlled_vocabulary_version: "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    tcg_concept_profile_version:
      CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_VERSION,
    external_source_registry_version:
      CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_VERSION,
    document_types: [...EXPECTED_DOCUMENT_TYPES],
    counts,
    source_hashes_sha256: sourceHashes,
    previous_release_pointer:
      "card_visual_search_productization_bbf20d0f_v1",
    activation_status: "staged_artifacts_only",
    source_graph_mutation_count: 0,
    provider_cost_usd: 0,
  };
  releaseManifest.release_manifest_hash = sha256JsonV1(releaseManifest);
  const loadPlan = {
    load_plan_version: "CARD_VISUAL_SEARCH_LOAD_PLAN_V2",
    release_key: releaseManifest.release_key,
    release_manifest_hash: releaseManifest.release_manifest_hash,
    migration: {
      path: displayPath(migrationPath),
      sha256: sourceHashes.migration,
      status: "unapplied",
    },
    source_inputs: {
      artworks: {
        artifact_path: displayPath(
          path.join(projectionDir, "visual_search_artworks.jsonl"),
        ),
        artifact_sha256:
          projectionManifest.files?.["visual_search_artworks.jsonl"],
        rows: artworks.length,
        target_table: "public.card_visual_search_artworks",
      },
      printings: {
        artifact_path: displayPath(
          path.join(projectionDir, "visual_search_printings.jsonl"),
        ),
        artifact_sha256:
          projectionManifest.files?.["visual_search_printings.jsonl"],
        rows: printings.length,
        target_table: "public.card_visual_search_printings",
      },
      documents: {
        artifact_path: displayPath(
          path.join(projectionDir, "visual_search_documents.jsonl"),
        ),
        artifact_sha256:
          projectionManifest.files?.["visual_search_documents.jsonl"],
        rows: documentCount,
        target_table: "public.card_visual_search_documents",
      },
      evidence: {
        artifact_path: displayPath(
          path.join(projectionDir, "visual_search_concept_evidence.jsonl"),
        ),
        artifact_sha256:
          projectionManifest.files?.["visual_search_concept_evidence.jsonl"],
        rows: evidenceCount,
        target_table: "public.card_visual_search_evidence",
      },
      index_entries: {
        artifact_path: displayPath(
          path.join(outputDir, "visual_search_index_entries.jsonl"),
        ),
        artifact_sha256: null,
        rows: indexEntries.length,
        target_table: "public.card_visual_search_index_entries",
      },
      external_candidates: {
        artifact_path: displayPath(
          path.join(outputDir, "external_evidence_candidates.jsonl"),
        ),
        artifact_sha256: null,
        rows: externalCandidates.length,
        target_table: "public.card_visual_evidence_candidates",
      },
      external_assertions: {
        artifact_path: displayPath(
          path.join(outputDir, "external_evidence_assertions.jsonl"),
        ),
        artifact_sha256: null,
        rows: externalAssertions.length,
        target_table: "public.card_visual_evidence_assertions",
      },
    },
    load_order: [
      "card_visual_search_releases:staged",
      "card_visual_external_sources",
      "card_visual_search_artworks",
      "card_visual_search_printings",
      "card_visual_search_documents",
      "card_visual_search_evidence",
      "card_visual_evidence_candidates",
      "card_visual_evidence_assertions",
      "card_visual_search_index_entries",
      "reconcile counts and hashes",
      "service RPC smoke tests",
      "card_visual_search_releases:validated",
    ],
    required_reconciliation: {
      exact_row_counts: true,
      source_hash_mismatches: 0,
      missing_evidence_references: 0,
      duplicate_primary_keys: 0,
      energy_rows: 0,
      active_release_pointer_rows: 0,
      rpc_visible_before_activation: 0,
    },
    boundaries: {
      plan_only: true,
      database_connection: false,
      database_writes: false,
      migration_apply: false,
      release_load: false,
      release_activation: false,
      provider_calls: false,
      embeddings: false,
      holdout_execution: false,
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);
  await writeJsonl(path.join(outputDir, "repair_ledger.jsonl"), ledgerRows);
  await writeJsonl(path.join(outputDir, "coverage_gaps.jsonl"), coverageGaps);
  await writeJsonl(
    path.join(outputDir, "external_evidence_candidates.jsonl"),
    externalCandidates,
  );
  await writeJsonl(
    path.join(outputDir, "external_evidence_assertions.jsonl"),
    externalAssertions,
  );
  await writeJsonl(
    path.join(outputDir, "visual_search_index_entries.jsonl"),
    indexEntries,
  );
  await writeJson(
    path.join(outputDir, "release_manifest.json"),
    releaseManifest,
  );
  await writeJson(path.join(outputDir, "load_plan.json"), loadPlan);
  const report = {
    version: CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION,
    created_at: nowIso(),
    run_plan: runPlan,
    release_manifest: releaseManifest,
    reconciliation,
  };
  await writeJson(path.join(outputDir, "RECONCILIATION.json"), report);
  await fs.writeFile(
    path.join(outputDir, "RECONCILIATION.md"),
    markdownReport(report),
  );

  const permanentFiles = [
    "run_plan.json",
    "repair_ledger.jsonl",
    "coverage_gaps.jsonl",
    "external_evidence_candidates.jsonl",
    "external_evidence_assertions.jsonl",
    "visual_search_index_entries.jsonl",
    "release_manifest.json",
    "load_plan.json",
    "RECONCILIATION.json",
    "RECONCILIATION.md",
  ];
  const hashes = {};
  for (const file of permanentFiles) {
    hashes[file] = await hashFile(path.join(outputDir, file));
  }
  loadPlan.source_inputs.index_entries.artifact_sha256 =
    hashes["visual_search_index_entries.jsonl"];
  loadPlan.source_inputs.external_candidates.artifact_sha256 =
    hashes["external_evidence_candidates.jsonl"];
  loadPlan.source_inputs.external_assertions.artifact_sha256 =
    hashes["external_evidence_assertions.jsonl"];
  await writeJson(path.join(outputDir, "load_plan.json"), loadPlan);
  hashes["load_plan.json"] = await hashFile(path.join(outputDir, "load_plan.json"));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), {
    artifact_kind: "card_visual_search_corpus_release_v2_hash_manifest",
    hash_algorithm: "sha256",
    generated_at: nowIso(),
    directory: displayPath(outputDir),
    file_count: permanentFiles.length,
    files: hashes,
  });
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await buildCardVisualSearchCorpusReleaseV2(
    parseCardVisualSearchCorpusReleaseArgsV2(argv),
  );
  const counts = result.report.reconciliation.counts;
  console.log(`[card-visual-search-release-v2] output_dir=${displayPath(result.outputDir)}`);
  console.log(`[card-visual-search-release-v2] artworks=${counts.artworks}`);
  console.log(`[card-visual-search-release-v2] documents=${counts.documents}`);
  console.log(`[card-visual-search-release-v2] evidence=${counts.evidence}`);
  console.log(`[card-visual-search-release-v2] index_entries=${counts.index_entries}`);
  console.log(`[card-visual-search-release-v2] ai_cost_usd=0`);
  console.log(
    `[card-visual-search-release-v2] reconciled=${result.report.reconciliation.reconciled}`,
  );
  if (!result.report.reconciliation.reconciled) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
