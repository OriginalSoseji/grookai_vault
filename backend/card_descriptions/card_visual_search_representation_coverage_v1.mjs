import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadPokemonVisualIdentityLexiconV1,
  pokemonIdentityMatchesTextV1,
} from "./card_visual_search_pokemon_identity_v1.mjs";
import { normalizeVisualSearchTextV1 } from "./card_visual_search_evaluation_bootstrap_v1.mjs";

export const CARD_VISUAL_SEARCH_REPRESENTATION_COVERAGE_VERSION = "CARD_VISUAL_SEARCH_REPRESENTATION_COVERAGE_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const REPRESENTATION_CUES = Object.freeze({
  plush: /\bplush(?: toy)?\b/u,
  pillow: /\bpillow\b/u,
  statue: /\b(?:statue|figurine|sculpture)\b/u,
  toy: /\b(?:toy|doll)\b/u,
  logo: /\b(?:logo|emblem)\b/u,
  sticker: /\bsticker\b/u,
  "food shape": /\b(?:food shaped|shaped food|character shaped|pokemon shaped|cookie shaped|cake shaped|pastry shaped)\b/u,
  "ice cream": /\bice cream\b/u,
});
const DEPICTED_SURFACE_CUES = Object.freeze({
  poster: /\bposter\b/u,
  photograph: /\b(?:photograph|photo)\b/u,
  screen: /\b(?:screen|television|monitor)\b/u,
  painting: /\bpainting\b/u,
  sign: /\bsign\b/u,
  book: /\bbook\b/u,
  card: /\b(?:card within card|printed card)\b/u,
});
const GENERIC_REPRESENTATION_REVIEW_CUES = new Set(["plush", "pillow", "statue", "food shape", "ice cream"]);
const CARD_UI_EVIDENCE_PATTERN = /\b(?:card ui|card_ui|set symbol|edition stamp|rarity symbol|hp text|attack text|copyright|weakness|resistance|retreat|collector number)\b/u;

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseRepresentationCoverageArgsV1(argv = []) {
  return {
    inventory: parseFlag(argv, "inventory"),
    artifactRoot: parseFlag(argv, "artifact-root"),
    outputDir: parseFlag(argv, "output-dir"),
    concurrency: Number.parseInt(parseFlag(argv, "concurrency") ?? "24", 10),
  };
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, row]) => [key, stableObject(row)]));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function increment(target, key) {
  const normalized = normalizeVisualSearchTextV1(key) || "unspecified";
  target[normalized] = (target[normalized] ?? 0) + 1;
}

function graphForRow(row) {
  return row?.generated_row?.visual_attributes?.fact_graph ?? row?.visual_attributes?.fact_graph ?? null;
}

function identityForRole(row) {
  return row?.represented_identity ?? row?.identity ?? "";
}

function graphEvidenceRows(graph) {
  return [
    ...(graph?.observations ?? []).map((row) => ({ source: "observation", source_id: row.observation_id, scope: row.kind, text: [row.label, row.normalized_label].filter(Boolean).join(" ") })),
    ...(graph?.typed_facts ?? []).map((row) => ({ source: "typed_fact", source_id: row.fact_id, scope: [row.module, row.field_path].filter(Boolean).join(" "), text: [row.claim, JSON.stringify(row.value)].filter(Boolean).join(" ") })),
    ...(graph?.objects_and_props ?? []).map((row) => ({ source: "object_or_prop", source_id: row.observation_id ?? null, scope: row.object_type, text: JSON.stringify(row) })),
    ...(graph?.fact_grounded_search_terms ?? []).map((row, index) => ({
      source: "search_term",
      source_id: row.search_term_id ?? `search_term_${index + 1}`,
      scope: "fact_grounded_search_term",
      text: typeof row === "string" ? row : JSON.stringify(row),
    })),
  ]
    .map((row) => ({ ...row, normalized_text: normalizeVisualSearchTextV1(row.text), normalized_scope: normalizeVisualSearchTextV1(row.scope) }))
    .filter((row) => row.normalized_text && !CARD_UI_EVIDENCE_PATTERN.test(`${row.normalized_scope} ${row.normalized_text}`));
}

function cueMatches(rows, definitions) {
  const matches = [];
  for (const [cue, pattern] of Object.entries(definitions)) {
    for (const row of rows) if (pattern.test(row.normalized_text)) matches.push({ cue, ...row });
  }
  return matches;
}

function representationCandidateScopeAllows(row) {
  if (/\b(?:creature anatomy|human appearance|visible body|facial evidence|pose|action|scene subject|subject identity)\b/u.test(row.normalized_scope)) return false;
  return /\b(?:character representations?|depicted subjects?|objects?|props?|food|desserts?|decorations?|accessories|accessory|logos?|stickers?|surfaces?|environment|relationships?)\b/u.test(row.normalized_scope);
}

function depictedCandidateScopeAllows(row) {
  if (/\b(?:creature anatomy|human appearance|visible body|facial evidence|pose|action|scene subject|subject identity)\b/u.test(row.normalized_scope)) return false;
  return /\b(?:depicted subjects?|objects?|props?|surfaces?|posters?|screens?|signs?|books?|paintings?|photographs?|environment|relationships?)\b/u.test(row.normalized_scope);
}

function structuredValueMatches(value, cue, definitions) {
  const pattern = definitions[cue];
  return pattern ? pattern.test(normalizeVisualSearchTextV1(value)) : false;
}

function moduleReviewStatus(graph, moduleName) {
  const review = (graph?.module_reviews ?? []).find((row) => row?.module === moduleName);
  return review?.review_status ?? null;
}

export function analyzeVisualRepresentationCoverageV1(records, pokemonLexicon = loadPokemonVisualIdentityLexiconV1()) {
  const distributions = {
    representation_forms: {},
    depicted_surfaces: {},
    character_representation_review_status: {},
    depicted_subject_review_status: {},
  };
  const candidates = [];
  let rowsWithRepresentations = 0;
  let rowsWithPokemonRepresentations = 0;
  let rowsWithDepictedSubjects = 0;

  for (const record of records) {
    const generatedRow = record.generated_row ?? record;
    const graph = graphForRow(record);
    if (!graph) continue;
    const representations = graph.character_representations ?? [];
    const depicted = graph.depicted_subjects ?? [];
    if (representations.length) rowsWithRepresentations += 1;
    if (depicted.length) rowsWithDepictedSubjects += 1;
    const pokemonRepresentations = representations.filter((row) => pokemonIdentityMatchesTextV1(identityForRole(row), pokemonLexicon));
    if (pokemonRepresentations.length) rowsWithPokemonRepresentations += 1;
    for (const row of representations) increment(distributions.representation_forms, row.representation_form ?? row.host_object);
    for (const row of depicted) increment(distributions.depicted_surfaces, row.surface_type ?? row.host_surface);
    increment(distributions.character_representation_review_status, moduleReviewStatus(graph, "subjects") ?? "missing_review");
    increment(distributions.depicted_subject_review_status, moduleReviewStatus(graph, "subjects") ?? "missing_review");

    const evidenceRows = graphEvidenceRows(graph);
    const representationCueMatches = cueMatches(evidenceRows, REPRESENTATION_CUES);
    const depictedCueMatches = cueMatches(evidenceRows, DEPICTED_SURFACE_CUES);
    const findingRows = [];
    for (const match of representationCueMatches) {
      if (!representationCandidateScopeAllows(match)) continue;
      const alreadyStructured = representations.some((row) => structuredValueMatches([row.representation_form, row.host_object].filter(Boolean).join(" "), match.cue, REPRESENTATION_CUES));
      if (alreadyStructured) continue;
      const pokemonEvidence = pokemonIdentityMatchesTextV1(match.normalized_text, pokemonLexicon) || /\bpok[eé]mon\b/iu.test(match.text);
      if (!pokemonEvidence && !GENERIC_REPRESENTATION_REVIEW_CUES.has(match.cue)) continue;
      findingRows.push({
        finding_class: pokemonEvidence ? "pokemon_character_representation_candidate" : "generic_character_representation_candidate",
        cue: match.cue,
        source: match.source,
        source_id: match.source_id,
        evidence_text: match.text,
      });
    }
    for (const match of depictedCueMatches) {
      if (!depictedCandidateScopeAllows(match)) continue;
      const alreadyStructured = depicted.some((row) => structuredValueMatches([row.surface_type, row.host_surface].filter(Boolean).join(" "), match.cue, DEPICTED_SURFACE_CUES));
      if (alreadyStructured) continue;
      const pokemonEvidence = pokemonIdentityMatchesTextV1(match.normalized_text, pokemonLexicon) || /\bpok[eé]mon\b/iu.test(match.text);
      if (!pokemonEvidence) continue;
      findingRows.push({
        finding_class: "pokemon_depicted_subject_candidate",
        cue: match.cue,
        source: match.source,
        source_id: match.source_id,
        evidence_text: match.text,
      });
    }
    if (!findingRows.length) continue;
    candidates.push({
      card_print_id: generatedRow.card_print_id ?? record.card_print_id ?? null,
      gv_id: generatedRow.gv_id ?? record.gv_id ?? null,
      name: generatedRow.name ?? record.name ?? null,
      prompt_branch: generatedRow.prompt_branch ?? record.prompt_branch ?? null,
      source_artifact_path: record.source_artifact_path ?? null,
      structured_character_representations: representations.length,
      structured_depicted_subjects: depicted.length,
      character_representation_review_status: moduleReviewStatus(graph, "subjects"),
      depicted_subject_review_status: moduleReviewStatus(graph, "subjects"),
      findings: findingRows,
    });
  }

  const counts = {
    processed_rows: records.length,
    rows_with_fact_graph: records.filter((row) => graphForRow(row)).length,
    rows_with_character_representations: rowsWithRepresentations,
    rows_with_pokemon_character_representations: rowsWithPokemonRepresentations,
    rows_with_depicted_subjects: rowsWithDepictedSubjects,
    omission_candidate_rows: candidates.length,
    pokemon_character_representation_candidate_rows: candidates.filter((row) => row.findings.some((finding) => finding.finding_class === "pokemon_character_representation_candidate")).length,
    generic_character_representation_candidate_rows: candidates.filter((row) => row.findings.some((finding) => finding.finding_class === "generic_character_representation_candidate")).length,
    pokemon_depicted_subject_candidate_rows: candidates.filter((row) => row.findings.some((finding) => finding.finding_class === "pokemon_depicted_subject_candidate")).length,
  };
  return {
    version: CARD_VISUAL_SEARCH_REPRESENTATION_COVERAGE_VERSION,
    counts,
    distributions: stableObject(distributions),
    candidates: candidates.sort((left, right) => String(left.card_print_id).localeCompare(String(right.card_print_id))),
  };
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

function sourceRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.generated_outputs)) return payload.generated_outputs;
  return [payload];
}

function sourceRecordId(record) {
  return record?.card_print_id ?? record?.generated_row?.card_print_id ?? record?.card?.card_print_id ?? null;
}

function boundedSourcePath(root, sourcePath) {
  const resolved = path.isAbsolute(sourcePath) ? path.normalize(sourcePath) : path.resolve(root, sourcePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("source artifact path escapes artifact root");
  return resolved;
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function loadCoverageRecords(inventoryPath, artifactRoot, concurrency) {
  const inventory = await readJsonl(inventoryPath);
  const bySource = new Map();
  for (const row of inventory) {
    if (!bySource.has(row.source_artifact_path)) bySource.set(row.source_artifact_path, []);
    bySource.get(row.source_artifact_path).push(row);
  }
  const sourceGroups = [...bySource.entries()];
  const loaded = await mapConcurrent(sourceGroups, concurrency, async ([sourceArtifactPath, inventoryRows]) => {
    const sourcePath = boundedSourcePath(artifactRoot, sourceArtifactPath);
    const payload = JSON.parse(await fs.readFile(sourcePath, "utf8"));
    const recordsById = new Map(sourceRecords(payload).map((record) => [sourceRecordId(record), record]));
    return inventoryRows.map((inventoryRow) => {
      const sourceRecord = recordsById.get(inventoryRow.card_print_id);
      if (!sourceRecord) throw new Error(`missing generated row ${inventoryRow.card_print_id} in ${sourceArtifactPath}`);
      return {
        ...inventoryRow,
        generated_row: sourceRecord.generated_row ?? sourceRecord,
      };
    });
  });
  return loaded.flat();
}

function markdownReport(report) {
  const c = report.counts;
  const forms = Object.entries(report.distributions.representation_forms).map(([key, value]) => `| ${key} | ${value} |`).join("\n") || "| none | 0 |";
  const surfaces = Object.entries(report.distributions.depicted_surfaces).map(([key, value]) => `| ${key} | ${value} |`).join("\n") || "| none | 0 |";
  return `# Card Visual Search Representation Coverage V1

## Counts

- Processed rows: \`${c.processed_rows}\`
- Rows with Fact Graphs: \`${c.rows_with_fact_graph}\`
- Rows with character representations: \`${c.rows_with_character_representations}\`
- Rows with Pokemon character representations: \`${c.rows_with_pokemon_character_representations}\`
- Rows with depicted subjects: \`${c.rows_with_depicted_subjects}\`
- Omission candidate rows: \`${c.omission_candidate_rows}\`
- Pokemon representation candidates: \`${c.pokemon_character_representation_candidate_rows}\`
- Generic representation candidates: \`${c.generic_character_representation_candidate_rows}\`
- Pokemon depicted-subject candidates: \`${c.pokemon_depicted_subject_candidate_rows}\`

## Representation Forms

| Form | Rows |
|---|---:|
${forms}

## Depicted Surfaces

| Surface | Rows |
|---|---:|
${surfaces}

## Interpretation

Candidates are deterministic review leads, not newly asserted visual facts. A cue
means the saved graph contains relevant evidence text but lacks the corresponding
typed representation or depicted-subject structure.

## Boundaries

No provider calls, database connections or writes, approvals, embeddings,
holdout execution, search activation, or source-artifact mutations occurred.
`;
}

export async function runRepresentationCoverageAuditV1(args) {
  if (!args.inventory || !args.artifactRoot || !args.outputDir) throw new Error("--inventory, --artifact-root, and --output-dir are required");
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 64) throw new Error("concurrency must be 1 through 64");
  const inventoryPath = path.resolve(args.inventory);
  const artifactRoot = path.resolve(args.artifactRoot);
  const outputDir = path.resolve(args.outputDir);
  await fs.mkdir(outputDir, { recursive: true });
  const runPlan = {
    version: CARD_VISUAL_SEARCH_REPRESENTATION_COVERAGE_VERSION,
    inventory_path: inventoryPath,
    inventory_sha256: sha256(await fs.readFile(inventoryPath)),
    artifact_root: artifactRoot,
    concurrency: args.concurrency,
    boundaries: {
      provider_calls: false,
      database_connections: false,
      database_writes: false,
      approvals: false,
      embeddings: false,
      holdout_execution: false,
      source_mutations: false,
      public_release: false,
    },
  };
  await fs.writeFile(path.join(outputDir, "run_plan.json"), `${JSON.stringify(stableObject(runPlan), null, 2)}\n`);
  const records = await loadCoverageRecords(inventoryPath, artifactRoot, args.concurrency);
  const report = analyzeVisualRepresentationCoverageV1(records);
  const summary = { ...report, candidates: undefined };
  await fs.writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(stableObject(summary), null, 2)}\n`);
  await fs.writeFile(path.join(outputDir, "representation_candidates.jsonl"), report.candidates.map((row) => JSON.stringify(stableObject(row))).join("\n") + (report.candidates.length ? "\n" : ""));
  await fs.writeFile(path.join(outputDir, "REPRESENTATION_COVERAGE_AUDIT.md"), markdownReport(report));
  const artifactFiles = ["run_plan.json", "summary.json", "representation_candidates.jsonl", "REPRESENTATION_COVERAGE_AUDIT.md"];
  const hashes = {};
  for (const file of artifactFiles) hashes[file] = sha256(await fs.readFile(path.join(outputDir, file)));
  await fs.writeFile(path.join(outputDir, "artifact_hashes.json"), `${JSON.stringify({ algorithm: "sha256", files: hashes }, null, 2)}\n`);
  return { output_dir: outputDir, ...summary };
}

export async function main() {
  const report = await runRepresentationCoverageAuditV1(parseRepresentationCoverageArgsV1(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
