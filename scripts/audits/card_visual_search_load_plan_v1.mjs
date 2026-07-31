import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

export const CARD_VISUAL_SEARCH_LOAD_PLAN_VERSION =
  "CARD_VISUAL_SEARCH_LOAD_PLAN_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const RELEASE_ROOT =
  "C:\\grookai_visual_search_releases\\card_visual_search_corpus_release_v1_1_20260721";
const REBUILD_ROOT = path.join(
  RELEASE_ROOT,
  "_rebuild/productization_bbf20d0f",
);
const PROJECTION_ROOT = path.join(REBUILD_ROOT, "projection");
const BOOTSTRAP_ROOT = path.join(REBUILD_ROOT, "bootstrap");
const AUDIT_DIR = path.join(
  REPO_ROOT,
  "docs/audits/card_visual_search_load_plan_v1/2026-07-29_projection_bbf20d0f",
);
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs/manifests/card_visual_search_corpus_release_v1_1.json",
);
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "supabase/migrations/20260729173000_card_visual_search_persistence_v1.sql",
);

const sources = Object.freeze({
  artworks: {
    file: "visual_search_artworks.jsonl",
    table: "card_visual_search_artworks",
    chunk_size: 500,
  },
  printings: {
    file: "visual_search_printings.jsonl",
    table: "card_visual_search_printings",
    chunk_size: 500,
  },
  documents: {
    file: "visual_search_documents.jsonl",
    table: "card_visual_search_documents",
    chunk_size: 250,
  },
  evidence: {
    file: "visual_search_concept_evidence.jsonl",
    table: "card_visual_search_evidence",
    chunk_size: 1000,
  },
});

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function countJsonlRows(filePath) {
  const stream = fs.createReadStream(filePath);
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;
  for await (const line of lines) {
    if (line.trim()) count += 1;
  }
  return count;
}

async function sourcePlan() {
  const plan = {};
  for (const [kind, config] of Object.entries(sources)) {
    const filePath = path.join(PROJECTION_ROOT, config.file);
    const rows = await countJsonlRows(filePath);
    plan[kind] = {
      artifact_path: filePath,
      artifact_sha256: await sha256File(filePath),
      target_table: `public.${config.table}`,
      rows,
      chunk_size: config.chunk_size,
      planned_chunks: Math.ceil(rows / config.chunk_size),
    };
  }
  return plan;
}

async function main() {
  const [manifest, projectionReport, candidateSummary, sourceInputs] =
    await Promise.all([
      fsp.readFile(MANIFEST_PATH, "utf8").then(JSON.parse),
      fsp
        .readFile(path.join(PROJECTION_ROOT, "PROJECTION_RECONCILIATION.json"), "utf8")
        .then(JSON.parse),
      fsp
        .readFile(path.join(BOOTSTRAP_ROOT, "candidate_index_summary.json"), "utf8")
        .then(JSON.parse),
      sourcePlan(),
    ]);

  const expected = {
    artworks: projectionReport.reconciliation.counts.projected_artworks,
    printings: projectionReport.reconciliation.counts.projected_printings,
    documents: projectionReport.reconciliation.counts.documents,
    evidence: projectionReport.reconciliation.counts.evidence_entries,
    index_entries: candidateSummary.indexed_entries,
  };
  const observed = {
    artworks: sourceInputs.artworks.rows,
    printings: sourceInputs.printings.rows,
    documents: sourceInputs.documents.rows,
    evidence: sourceInputs.evidence.rows,
    index_entries: candidateSummary.indexed_entries,
  };
  if (JSON.stringify(expected) !== JSON.stringify(observed)) {
    throw new Error(
      `Projection source count mismatch: expected=${JSON.stringify(expected)} observed=${JSON.stringify(observed)}`,
    );
  }

  const migrationSha256 = await sha256File(MIGRATION_PATH);
  const payload = {
    load_plan_version: CARD_VISUAL_SEARCH_LOAD_PLAN_VERSION,
    created_on: "2026-07-29",
    release_key: "card_visual_search_productization_bbf20d0f_v1",
    source_release_id: manifest.release_id,
    source_release_manifest_payload_sha256:
      manifest.release_manifest_payload_sha256,
    source_projection_version: projectionReport.version,
    source_projection_producing_sha:
      projectionReport.run_plan.commit_sha,
    source_rebuild_producing_sha:
      "bbf20d0f4a59e61c4d529f523de0a9721c964dd9",
    unapplied_migration: {
      path: path.relative(REPO_ROOT, MIGRATION_PATH).replaceAll("\\", "/"),
      sha256: migrationSha256,
      status: "unapplied",
    },
    source_inputs: sourceInputs,
    derived_index: {
      target_table: "public.card_visual_search_index_entries",
      rows: candidateSummary.indexed_entries,
      chunk_size: 1000,
      planned_chunks: Math.ceil(candidateSummary.indexed_entries / 1000),
      derivation:
        "deterministic buildVisualSearchCandidateIndexV1 serialization",
      materialized_in_this_gate: false,
    },
    target_counts: {
      releases: 1,
      artworks: expected.artworks,
      printings: expected.printings,
      documents: expected.documents,
      evidence: expected.evidence,
      index_entries: expected.index_entries,
      active_release_pointer_rows: 0,
    },
    load_order: [
      "card_visual_search_releases:staged",
      "card_visual_search_artworks",
      "card_visual_search_printings",
      "card_visual_search_documents",
      "card_visual_search_evidence",
      "card_visual_search_index_entries",
      "reconcile hashes and counts",
      "card_visual_search_releases:loaded",
      "validate service RPC readback",
      "card_visual_search_releases:validated",
    ],
    required_reconciliation: {
      exact_row_counts: true,
      duplicate_primary_keys: 0,
      missing_card_print_foreign_keys: 0,
      missing_document_foreign_keys: 0,
      source_hash_mismatches: 0,
      tier_c_rows: 0,
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
      public_or_authenticated_grants: false,
      provider_calls: false,
      approvals: false,
      embeddings: false,
      holdout_execution: false,
      public_search_activation: false,
      pricing_changes: false,
    },
    exact_next_gate:
      "After human calibration approval, apply the migration in a governed database gate, load one staged release without activation, and reconcile every count and hash.",
  };
  const plan = { ...payload, load_plan_payload_sha256: sha256Json(payload) };
  await fsp.mkdir(AUDIT_DIR, { recursive: true });
  const planPath = path.join(AUDIT_DIR, "load_plan.json");
  const markdownPath = path.join(AUDIT_DIR, "LOAD_PLAN.md");
  await fsp.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  await fsp.writeFile(
    markdownPath,
    `# Card Visual Search Load Plan V1

Date: 2026-07-29

Status: PLAN ONLY; MIGRATION UNAPPLIED; NO DATABASE CONNECTION

## Target Counts

- Releases: \`1\`
- Artworks: \`${expected.artworks.toLocaleString("en-US")}\`
- Printings: \`${expected.printings.toLocaleString("en-US")}\`
- Documents: \`${expected.documents.toLocaleString("en-US")}\`
- Evidence rows: \`${expected.evidence.toLocaleString("en-US")}\`
- Candidate-index entries: \`${expected.index_entries.toLocaleString("en-US")}\`
- Active release pointers: \`0\`

## Boundary

This artifact plans chunks and reconciliation only. It does not connect to the
database, apply the migration, serialize/load index rows, activate a release,
generate embeddings, or expose search.

## Exact Next Gate

After human calibration approval, apply the migration in a governed database
gate, load one staged release without activation, and reconcile every count and
hash.
`,
  );
  const artifactHashes = {
    hash_algorithm: "sha256",
    generated_on: "2026-07-29",
    artifacts: [
      {
        path: path.relative(REPO_ROOT, planPath).replaceAll("\\", "/"),
        sha256: await sha256File(planPath),
      },
      {
        path: path.relative(REPO_ROOT, markdownPath).replaceAll("\\", "/"),
        sha256: await sha256File(markdownPath),
      },
    ],
  };
  await fsp.writeFile(
    path.join(AUDIT_DIR, "artifact_hashes.json"),
    `${JSON.stringify(artifactHashes, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        status: "planned_no_write",
        target_counts: plan.target_counts,
        migration_sha256: migrationSha256,
        load_plan_payload_sha256: plan.load_plan_payload_sha256,
      },
      null,
      2,
    ),
  );
}

await main();
