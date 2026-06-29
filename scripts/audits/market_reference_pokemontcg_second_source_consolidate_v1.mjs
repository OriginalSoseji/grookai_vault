import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ID = "MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-CONSOLIDATED-MANIFEST-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const ACQUISITION_PREFIX = "mee_09i_pokemontcg_second_source_acquisition_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function addCounts(target, counts = {}) {
  for (const [key, value] of Object.entries(counts)) {
    target[key] = (target[key] ?? 0) + Number(value ?? 0);
  }
}

async function readAcquisitionArtifacts() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const files = await fs.readdir(dir);
  const artifacts = [];
  for (const fileName of files) {
    if (!fileName.startsWith(ACQUISITION_PREFIX) || !fileName.endsWith(".json")) continue;
    const filePath = path.join(dir, fileName);
    const report = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (!report?.range || report?.package_id !== "MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-ACQUISITION-V1") continue;
    artifacts.push({ fileName, filePath, report });
  }
  return artifacts;
}

function chooseLatestByOffset(artifacts) {
  const byOffset = new Map();
  for (const artifact of artifacts) {
    if (!artifact.report.ready) continue;
    const offset = artifact.report.range.offset;
    const existing = byOffset.get(offset);
    if (!existing || artifact.report.generated_at > existing.report.generated_at) {
      byOffset.set(offset, artifact);
    }
  }
  return [...byOffset.values()].sort((left, right) => left.report.range.offset - right.report.range.offset);
}

function validateCoverage(selected) {
  const findings = [];
  let cursor = 0;
  let total = 0;
  for (const artifact of selected) {
    const { offset, selected_targets: selectedTargets, next_offset: nextOffset } = artifact.report.range;
    if (offset !== cursor) findings.push(`range_gap_or_overlap_expected_${cursor}_got_${offset}`);
    if (nextOffset !== offset + selectedTargets) findings.push(`invalid_next_offset_${offset}`);
    cursor = nextOffset;
    total += selectedTargets;
  }
  const firstWaveTotal = selected[0]?.report.range.first_wave_total ?? 0;
  if (cursor !== firstWaveTotal) findings.push(`incomplete_first_wave_expected_${firstWaveTotal}_got_${cursor}`);
  return { findings, firstWaveTotal, coveredTargets: total, nextOffset: cursor };
}

function buildManifest(selected, generatedAt) {
  const statusCounts = {};
  const currencyCounts = {};
  const finishCounts = {};
  const candidateEvidence = [];
  const targetIds = new Set();
  const pokemonApiIds = new Set();
  let resolved = 0;
  let unresolved = 0;
  let fetched = 0;
  let fetchErrors = 0;

  for (const artifact of selected) {
    const report = artifact.report;
    addCounts(statusCounts, report.summary.target_status_counts);
    addCounts(currencyCounts, report.summary.evidence_currency_counts);
    addCounts(finishCounts, report.summary.evidence_finish_counts);
    resolved += report.summary.resolved_pokemonapi_ids;
    unresolved += report.summary.unresolved_pokemonapi_ids;
    fetched += report.summary.fetched_payloads;
    fetchErrors += report.summary.fetch_error_count;
    for (const item of report.batch.items) {
      targetIds.add(item.card_print_id);
      if (item.pokemonapi_id) pokemonApiIds.add(item.pokemonapi_id);
    }
    candidateEvidence.push(...report.acquisition.candidate_evidence);
  }

  const coverage = validateCoverage(selected);
  const evidenceDigestInput = candidateEvidence
    .map((row) => JSON.stringify({
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      source: row.source,
      raw_title: row.raw_title,
      currency: row.currency,
      raw_price: row.raw_price,
      finish_hint: row.finish_hint,
      condition_hint: row.condition_hint,
    }))
    .sort()
    .join("\n");
  const manifest = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    contract: "MARKET_EVIDENCE_ENGINE_V1",
    phase: "MEE-09J_POKEMONTCG_SECOND_SOURCE_CONSOLIDATED_MANIFEST_V1",
    mode: "consolidated_local_manifest_no_writes",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    source_artifacts: selected.map((artifact) => ({
      path: rel(artifact.filePath),
      generated_at: artifact.report.generated_at,
      offset: artifact.report.range.offset,
      limit: artifact.report.range.limit,
      selected_targets: artifact.report.range.selected_targets,
      candidate_evidence_count: artifact.report.summary.candidate_evidence_count,
    })),
    summary: {
      source_artifact_count: selected.length,
      first_wave_total: coverage.firstWaveTotal,
      covered_targets: coverage.coveredTargets,
      unique_target_card_prints: targetIds.size,
      resolved_pokemonapi_ids: resolved,
      unresolved_pokemonapi_ids: unresolved,
      unique_pokemonapi_ids: pokemonApiIds.size,
      fetched_payloads: fetched,
      fetch_error_count: fetchErrors,
      candidate_evidence_count: candidateEvidence.length,
      target_status_counts: Object.fromEntries(Object.entries(statusCounts).sort()),
      evidence_currency_counts: Object.fromEntries(Object.entries(currencyCounts).sort()),
      evidence_finish_counts: Object.fromEntries(Object.entries(finishCounts).sort()),
      candidate_evidence_hash: sha256(evidenceDigestInput),
    },
    candidate_evidence: candidateEvidence,
    findings: coverage.findings,
  };
  manifest.ready = manifest.findings.length === 0 && manifest.summary.fetch_error_count === 0;
  return manifest;
}

function renderMarkdown(manifest) {
  return [
    "# MEE-09I PokemonTCG.io Second Source Consolidated Manifest",
    "",
    `- Package: \`${manifest.package_id}\``,
    `- Ready: \`${manifest.ready}\``,
    `- Source artifacts: \`${manifest.summary.source_artifact_count}\``,
    `- Covered targets: \`${manifest.summary.covered_targets}/${manifest.summary.first_wave_total}\``,
    `- Unique target card prints: \`${manifest.summary.unique_target_card_prints}\``,
    `- Unique PokemonTCG.io IDs: \`${manifest.summary.unique_pokemonapi_ids}\``,
    `- Fetched payloads: \`${manifest.summary.fetched_payloads}\``,
    `- Candidate evidence rows: \`${manifest.summary.candidate_evidence_count}\``,
    `- Candidate evidence hash: \`${manifest.summary.candidate_evidence_hash}\``,
    "",
    "## Boundary",
    "",
    "- Consolidates local acquisition artifacts only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No public/app-visible pricing.",
    "",
    "## Findings",
    "",
    ...(manifest.findings.length ? manifest.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const artifacts = await readAcquisitionArtifacts();
  const selected = chooseLatestByOffset(artifacts);
  const manifest = buildManifest(selected, generatedAt);
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09j_pokemontcg_second_source_consolidated_manifest_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09j_pokemontcg_second_source_consolidated_manifest_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(manifest));
  console.log(JSON.stringify({
    package_id: manifest.package_id,
    ready: manifest.ready,
    summary: manifest.summary,
    findings: manifest.findings,
    artifacts: { jsonPath: rel(jsonPath), mdPath: rel(mdPath) },
  }, null, 2));
  if (!manifest.ready) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
