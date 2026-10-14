import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { assertMasterPrintingAuthority } from "../../backend/catalog/master_index_printing_authority_v1.mjs";
import { printingManifestHash } from "../../backend/catalog/printing_completeness_gate_v1.mjs";
import { freezeMasterMappingAuthority } from "../../backend/pricing/master_index_mapping_authority_v1.mjs";
import { validateTcgplayerExactMappingCandidateForApplyV1 } from "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import {
  TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1,
  matchesReviewedTcgplayer30cClassicAliasProductTargetV1,
  reviewedTcgplayer30cClassicAliasProductIdentityV1,
} from "../../backend/pricing/tcgplayer_30c_classic_alias_product_identity_authority_v1.mjs";

const VERSION = "TCGPLAYER_30C_CLASSIC_ALIAS_MAPPING_AUTHORITY_V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const GROUP_ID = 24837;
const SET_ID = "69ee4802-7bfb-52e5-a1f5-4cddac79002d";
const SET_CODE = "30c-classic";
const EXPECTED_CANDIDATES = 2;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const git = (args) => execFileSync("git", args, {
  cwd: REPO_ROOT,
  encoding: "utf8",
  windowsHide: true,
}).trim();

function parseArgs(args) {
  const options = {};
  for (const token of args) {
    const match = /^--(plan-dir|out-dir|reviewed-at)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  for (const name of ["plan-dir", "out-dir", "reviewed-at"]) {
    assert.ok(options[name], `--${name} is required`);
  }
  assert.ok(Number.isFinite(Date.parse(options["reviewed-at"])), "reviewed_at_invalid");
  return {
    planDir: path.resolve(options["plan-dir"]),
    outDir: path.resolve(options["out-dir"]),
    reviewedAt: new Date(options["reviewed-at"]).toISOString(),
  };
}

function productNumber(product) {
  return String(product.extended_data?.find((field) =>
    String(field?.name ?? "").trim().toLowerCase() === "number")?.value ?? "").trim();
}

function rawImportId(provenanceRef) {
  const match = /raw_imports:([+-]?\d+)/.exec(String(provenanceRef ?? ""));
  assert.ok(match, `raw_import_provenance_missing:${provenanceRef}`);
  return match[1];
}

async function writeFileExclusive(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: "wx" });
}

async function readDatabase(candidates) {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split(".")[0], PROJECT_REF, "production_project_ref_mismatch");
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true },
    application_name: "30c_classic_alias_mapping_authority_read_only",
    statement_timeout: 120_000,
    query_timeout: 125_000,
  });
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.deepEqual(server, { database: "postgres", username: "postgres", read_only: "on" });
    const ids = candidates.map((row) => row.target.card_print_id);
    const productIds = candidates.map((row) => Number(row.source_product_id));
    const importIds = candidates.map((row) => rawImportId(
      reviewedTcgplayer30cClassicAliasProductIdentityV1(row).printing.provenance_ref,
    ));
    const parents = (await client.query(`select c.id::text,c.set_id::text,c.set_code,c.name,c.number,
      c.variant_key,c.gv_id,c.identity_domain,c.printed_identity_modifier,
      count(distinct i.id) filter(where i.is_active and i.identity_domain='pokemon_eng_standard')::integer active_standard_identity_count
      from public.card_prints c left join public.card_print_identity i on i.card_print_id=c.id
      where c.id=any($1::uuid[]) group by c.id order by c.id`, [ids])).rows;
    const printings = (await client.query(`select p.id::text,p.card_print_id::text,p.finish_key,
      p.printing_gv_id,p.is_provisional,p.provenance_source,p.provenance_ref,
      coalesce(f.is_active,false) finish_active,review.review_status active_truth_review,
      review.public_visibility,
      coalesce(f.is_active,false) and coalesce(review.public_visibility,'')
        not in ('hidden_pending_review','hidden_unsupported') public_visible
      from public.card_printings p
      left join public.finish_keys f on f.key=p.finish_key
      left join lateral (select r.review_status,r.public_visibility
        from public.card_printing_truth_reviews r
        where r.card_printing_id=p.id and r.active=true
        order by r.created_at desc nulls last,r.id desc limit 1) review on true
      where p.card_print_id=any($1::uuid[]) order by p.card_print_id,p.finish_key`, [ids])).rows;
    const products = (await client.query(`select product_id,category_id,group_id,name,source_url,
      source_modified_on,extended_data,raw_payload,payload_hash,last_seen_at,last_seen_run_id,
      source_active,catalog_metadata_status from public.tcgcsv_source_products
      where product_id=any($1::integer[]) order by product_id`, [productIds])).rows;
    const imports = (await client.query(`select id::text,source,status,notes,payload,ingested_at,processed_at
      from public.raw_imports where id=any($1::bigint[]) order by id`, [importIds])).rows;
    const existing = (await client.query(`select external_id,card_print_id::text from public.external_mappings
      where source='tcgplayer' and active and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))`,
    [productIds.map(String), ids])).rows;
    await client.query("commit");
    return { parents, printings, products, imports, existing };
  } finally {
    await client.end();
  }
}

export async function build30cClassicAliasMappingAuthority(args) {
  const options = parseArgs(args);
  const candidateBytes = await fs.readFile(path.join(options.planDir, "candidates.jsonl"));
  const candidates = candidateBytes.toString("utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert.equal(candidates.length, EXPECTED_CANDIDATES, "exact_candidate_count_changed");
  assert.equal(TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1.length,
    EXPECTED_CANDIDATES, "registry_count_changed");
  assert.ok(candidates.every((row) =>
    row.evidence_lane === "reviewed_product_identity_authority" &&
    row.source_group_id === GROUP_ID && row.target?.set_id === SET_ID &&
    row.target?.set_code === SET_CODE), "30c_classic_alias_scope_drift");
  assert.deepEqual(candidates.map((row) => Number(row.source_product_id)).sort((a, b) => a - b),
    TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1.map((row) =>
      row.source_product_id).sort((a, b) => a - b), "reviewed_product_selection_changed");
  for (const candidate of candidates) {
    const structural = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
    assert.ok(structural.accepted,
      `invalid_candidate:${candidate.source_product_id}:${structural.failures.join(",")}`);
    assert.ok(matchesReviewedTcgplayer30cClassicAliasProductTargetV1(candidate, {
      card_print_id: candidate.target.card_print_id,
      gv_id: candidate.target.gv_id,
      set_id: candidate.target.set_id,
      set_code: candidate.target.set_code,
      name: candidate.target.canonical_name,
      number: candidate.target.canonical_number,
      variant_key: candidate.target.variant_key,
    }), `reviewed_target_drift:${candidate.source_product_id}`);
  }

  const db = await readDatabase(candidates);
  assert.equal(db.parents.length, EXPECTED_CANDIDATES, "live_parent_count_changed");
  assert.equal(db.products.length, EXPECTED_CANDIDATES, "live_source_product_count_changed");
  assert.equal(db.printings.length, EXPECTED_CANDIDATES, "live_printing_count_changed");
  assert.equal(db.imports.length, EXPECTED_CANDIDATES, "raw_import_evidence_count_changed");
  assert.equal(db.existing.length, 0, "target_or_source_already_mapped");

  for (const candidate of candidates) {
    const authority = reviewedTcgplayer30cClassicAliasProductIdentityV1(candidate);
    const parent = db.parents.find((row) => row.id === authority.target.card_print_id);
    const product = db.products.find((row) =>
      Number(row.product_id) === authority.source_product_id);
    const printing = db.printings.find((row) =>
      row.card_print_id === authority.target.card_print_id);
    const sourceImport = db.imports.find((row) =>
      row.id === rawImportId(authority.printing.provenance_ref));
    assert.ok(parent && product && printing && sourceImport,
      `live_identity_missing:${candidate.source_product_id}`);
    assert.equal(parent.set_id, SET_ID);
    assert.equal(parent.set_code, SET_CODE);
    assert.equal(parent.identity_domain, "pokemon_eng_standard");
    assert.equal(Number(parent.active_standard_identity_count), 1);
    assert.equal(parent.gv_id, authority.target.gv_id);
    assert.equal(parent.name, authority.target.name);
    assert.equal(String(parent.number), authority.target.number);
    assert.equal(parent.variant_key ?? "", authority.target.variant_key);
    assert.equal(product.category_id, 3);
    assert.equal(product.group_id, GROUP_ID);
    assert.equal(product.name, authority.source_product_name);
    assert.equal(productNumber(product), authority.printed_number);
    assert.equal(product.source_active, true);
    assert.equal(product.catalog_metadata_status, "current");
    assert.equal(printing.finish_key, authority.printing.finish_key);
    assert.equal(printing.printing_gv_id, authority.printing.printing_gv_id);
    assert.equal(printing.is_provisional, false);
    assert.equal(printing.provenance_source, authority.printing.provenance_source);
    assert.equal(printing.provenance_ref, authority.printing.provenance_ref);
    assert.equal(printing.finish_active, true,
      `live_finish_disabled:${candidate.source_product_id}`);
    assert.equal(printing.public_visible, true,
      `live_child_hidden:${candidate.source_product_id}`);
  }

  const groupRef = "tcgcsv-group-24837-alias-products";
  const groupBytes = jsonBytes({
    version: "TCGCSV_PRODUCT_GROUP_SELECTION_SNAPSHOT_V1",
    category_id: 3,
    group_id: GROUP_ID,
    source_sync_run_ids: [...new Set(db.products.map((row) => row.last_seen_run_id))].sort(),
    products: db.products.map((row) => row.raw_payload),
  });
  const masterRef = "30c-classic-alias-master-index-projection-v1";
  const masterBytes = jsonBytes({
    version: "30C_CLASSIC_ALIAS_MASTER_INDEX_PROJECTION_V1",
    set_id: SET_ID,
    set_code: SET_CODE,
    rows: candidates.map((candidate) => ({
      candidate,
      authority: reviewedTcgplayer30cClassicAliasProductIdentityV1(candidate),
      parent: db.parents.find((row) => row.id === candidate.target.card_print_id),
      printing: db.printings.find((row) =>
        row.card_print_id === candidate.target.card_print_id),
    })),
  });
  const artifacts = new Map([[masterRef, masterBytes], [groupRef, groupBytes]]);
  const sourceArtifacts = [
    { ref: masterRef, sha256: sha256(masterBytes), kind: "exact_printing_mapping",
      url_or_identifier: "derived:30c-classic-alias-master-index-projection-v1",
      retrieved_at: options.reviewedAt },
    { ref: groupRef, sha256: sha256(groupBytes), kind: "exact_printing_mapping",
      url_or_identifier: "https://tcgcsv.com/tcgplayer/3/24837/products",
      retrieved_at: new Date(Math.max(...db.products.map((row) =>
        Date.parse(row.last_seen_at)))).toISOString() },
  ];
  for (const row of db.imports) {
    const ref = `raw-import:${row.id}`;
    const bytes = jsonBytes(row);
    artifacts.set(ref, bytes);
    sourceArtifacts.push({ ref, sha256: sha256(bytes), kind: "exact_printing_mapping",
      url_or_identifier: `database:raw_imports:${row.id}`,
      retrieved_at: new Date(row.ingested_at).toISOString() });
  }
  const parents = candidates.map((candidate) => {
    const row = db.parents.find((parent) =>
      parent.id === candidate.target.card_print_id);
    return { id: row.id, name: row.name, gv_id: row.gv_id, set_id: row.set_id,
      variant_key: row.variant_key ?? "", identity_domain: row.identity_domain,
      printed_coordinate: row.number,
      printed_identity_modifier: row.printed_identity_modifier ?? null };
  });
  const printings = candidates.map((candidate) => {
    const authority = reviewedTcgplayer30cClassicAliasProductIdentityV1(candidate);
    const sourceRef = `raw-import:${rawImportId(authority.printing.provenance_ref)}`;
    const source = sourceArtifacts.find((row) => row.ref === sourceRef);
    return { card_print_id: authority.target.card_print_id,
      finish_key: authority.printing.finish_key,
      printing_gv_id: authority.printing.printing_gv_id,
      review_status: "verified",
      evidence: [{ kind: source.kind, source_ref: source.ref,
        sha256: source.sha256, card_print_id: authority.target.card_print_id,
        finish_key: authority.printing.finish_key }] };
  });
  const mappingAssertions = candidates.map((candidate) => ({
    source: "tcgplayer", external_id: String(candidate.source_product_id),
    card_print_id: candidate.target.card_print_id,
    candidate_fingerprint: candidate.candidate_fingerprint,
    source_ref: groupRef, source_sha256: sha256(groupBytes),
  })).sort((left, right) => Number(left.external_id) - Number(right.external_id));
  const manifestBody = {
    version: "PRINTING_COMPLETENESS_GATE_V1", game: "pokemon", language: "en",
    set_code: SET_CODE, scope: "verified_parent_families",
    scope_note: "Exact two-product alias scope for the held 30th Celebration Classic Collection Genesect EX (Team Plasma) and Gengar (Prime) source labels.",
    identity_policy_version: "POKEMON_EN_PHYSICAL_V1",
    master_index_ref: masterRef, master_index_sha256: sha256(masterBytes),
    parents, printings, unresolved_variants: [], suppressed_printing_facts: [],
    expected: { parents: parents.length, printings: printings.length,
      finishes: { holo: printings.length } },
    authority: { version: "MASTER_INDEX_PRINTING_AUTHORITY_V1",
      status: "verified_scope", set_id: SET_ID, source_artifacts: sourceArtifacts,
      protected_facts: printings.map((row) => ({
        card_print_id: row.card_print_id, finish_key: row.finish_key })),
      forbidden_facts: [], conflicts: [] },
    external_mapping_assertions: mappingAssertions,
  };
  const reviewRef = "review:30c-classic:alias-tcgplayer-backfill-20261014";
  const review = { status: "verified_scope",
    master_index_sha256: manifestBody.master_index_sha256,
    game: manifestBody.game, language: manifestBody.language,
    set_code: manifestBody.set_code, scope: manifestBody.scope,
    reviewer: "Codex source adjudication; not founder mutation approval",
    reviewed_at: options.reviewedAt,
    projection_sha256: printingManifestHash(manifestBody),
    reasoning: [
      "Both TCGPlayer products belong to the already reviewed 30-card Classic Collection group and have unique full printed coordinates.",
      "The parent names omit TCGPlayer's explanatory Team Plasma and Prime labels; exact product IDs and coordinates prevent global alias relaxation.",
      "Each parent has one active, public, non-provisional Holo child whose GV-ID and raw-import provenance are frozen in this package.",
      "This evidence package does not itself authorize a database mutation.",
    ], mutation_authority: false };
  const reviewBytes = jsonBytes(review);
  artifacts.set(reviewRef, reviewBytes);
  manifestBody.authority.review = { ref: reviewRef, sha256: sha256(reviewBytes) };
  const manifest = { ...manifestBody, fingerprint: printingManifestHash(manifestBody) };
  assertMasterPrintingAuthority(manifest, artifacts);

  const baseSummary = JSON.parse(await fs.readFile(
    path.join(options.planDir, "summary.json"), "utf8"));
  const baseRunPlan = JSON.parse(await fs.readFile(
    path.join(options.planDir, "run_plan.json"), "utf8"));
  const head = git(["rev-parse", "HEAD"]);
  const trackedClean = git(["status", "--porcelain", "--untracked-files=no"]) === "";
  const selectedBytes = Buffer.from(
    `${candidates.map((row) => JSON.stringify(row)).join("\n")}\n`);
  const batch = { index: 1, total: 1, offset: 0, size: candidates.length };
  const summary = { ...baseSummary, counts: { ...baseSummary.counts,
    candidates: candidates.length,
    projected_gap_rows: candidates.reduce((sum, row) =>
      sum + Number(row.supporting_gap_row_count), 0) }, batch };
  const runPlan = { ...baseRunPlan, commit_sha: head,
    branch: git(["branch", "--show-current"]),
    tracked_worktree_clean: trackedClean,
    source_plan_commit_sha: baseRunPlan.commit_sha,
    source_plan_candidates_sha256: sha256(candidateBytes), batch };
  const bundle = freezeMasterMappingAuthority(candidates, [{ manifest, artifacts }]);
  const bundleBytes = jsonBytes(bundle);
  const batchDir = path.join(options.outDir, "batches", "batch-01");
  await writeFileExclusive(path.join(options.outDir, "authority", SET_CODE,
    "manifest.json"), jsonBytes(manifest));
  await writeFileExclusive(path.join(options.outDir, "authority", SET_CODE,
    "artifact-map.json"), jsonBytes([...artifacts.keys()].sort().map((ref) => ({
    ref, path: `artifacts/${ref.replace(/[^a-z0-9._-]+/gi, "_")}`,
  }))));
  for (const [ref, bytes] of artifacts) {
    await writeFileExclusive(path.join(options.outDir, "authority", SET_CODE,
      "artifacts", ref.replace(/[^a-z0-9._-]+/gi, "_")), bytes);
  }
  await writeFileExclusive(path.join(batchDir, "plan", "candidates.jsonl"),
    selectedBytes);
  await writeFileExclusive(path.join(batchDir, "plan", "summary.json"),
    jsonBytes(summary));
  await writeFileExclusive(path.join(batchDir, "plan", "run_plan.json"),
    jsonBytes(runPlan));
  await writeFileExclusive(path.join(batchDir, "package", "master_authority.json"),
    bundleBytes);
  await writeFileExclusive(path.join(batchDir, "package",
    "selected_candidates.jsonl"), selectedBytes);
  const batchReceipt = { version: "MASTER_INDEX_MAPPING_PACKAGE_RECEIPT_V1",
    batch, authority_fingerprint: bundle.fingerprint,
    authority_file_sha256: sha256(bundleBytes),
    selected_file_sha256: sha256(selectedBytes),
    selected_count: candidates.length, scope_count: 1,
    execution_authorized: false, database_writes: 0 };
  await writeFileExclusive(path.join(batchDir, "package", "receipt.json"),
    jsonBytes(batchReceipt));
  const receipt = { version: VERSION, status: "verified_scope",
    reviewed_at: options.reviewedAt,
    source_plan_candidates_sha256: sha256(candidateBytes),
    counts: { candidates: candidates.length, parents: parents.length,
      printings: printings.length, tcgcsv_products: db.products.length,
      raw_imports: db.imports.length, batches: 1,
      projected_gap_rows: summary.counts.projected_gap_rows },
    tracked_worktree_clean: trackedClean, commit_sha: head,
    batches: [{ batch: "batch-01", ...batchReceipt }],
    database_writes: 0, execution_authorized: false };
  await writeFileExclusive(path.join(options.outDir, "receipt.json"),
    jsonBytes(receipt));
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  build30cClassicAliasMappingAuthority(process.argv.slice(2))
    .then((receipt) => console.log(JSON.stringify(receipt, null, 2)))
    .catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
