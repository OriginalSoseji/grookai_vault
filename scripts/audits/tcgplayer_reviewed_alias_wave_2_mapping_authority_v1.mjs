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
import { normalizeTcgplayerMappingNumberV1 } from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import {
  TCGPLAYER_REVIEWED_ALIAS_WAVE_2_PRODUCT_IDENTITIES_V1,
  matchesReviewedTcgplayerAliasWave2ProductTargetV1,
  reviewedTcgplayerAliasWave2ProductIdentityV1,
} from "../../backend/pricing/tcgplayer_reviewed_alias_wave_2_product_identity_authority_v1.mjs";

const VERSION = "TCGPLAYER_REVIEWED_ALIAS_WAVE_2_MAPPING_AUTHORITY_V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const EXPECTED_CANDIDATES = 5;
const EXPECTED_SETS = Object.freeze({
  "sm3.5": "3c75028f-5798-4271-b390-ab040e76346c",
  "swsh4.5": "6335ab75-4e9d-4e4c-8955-261f5288ca7c",
  "30c": "50d8b80c-70b6-5733-9b97-89ef472d387f",
});
const MASTER_INDEX_SET_KEYS = Object.freeze({
  "sm3.5": "sm3.5",
  "swsh4.5": "swsh4.5",
});
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const THIRTY_C_EVIDENCE_PATH =
  "docs/audits/tcgplayer_reviewed_alias_wave_2_evidence_v1/30c_mew_rgb.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true }).trim();

function parseArgs(args) {
  const options = {};
  for (const token of args) {
    const match = /^--(plan-dir|out-dir|reviewed-at)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  for (const name of ["plan-dir", "out-dir", "reviewed-at"]) assert.ok(options[name], `--${name} is required`);
  assert.ok(Number.isFinite(Date.parse(options["reviewed-at"])), "reviewed_at_invalid");
  return { planDir: path.resolve(options["plan-dir"]), outDir: path.resolve(options["out-dir"]),
    reviewedAt: new Date(options["reviewed-at"]).toISOString() };
}

function productNumber(product) {
  return String(product.extended_data?.find((field) =>
    String(field?.name ?? "").trim().toLowerCase() === "number")?.value ?? "").trim();
}

async function writeFileExclusive(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: "wx" });
}

async function loadSources() {
  const sources = {};
  for (const setCode of Object.keys(MASTER_INDEX_SET_KEYS)) {
    const masterSetKey = MASTER_INDEX_SET_KEYS[setCode];
    const entries = [
      [`${setCode}_cards`, `docs/audits/english_master_index_publishable_v1/sets/${masterSetKey}/cards.json`],
      [`${setCode}_printings`, `docs/audits/english_master_index_publishable_v1/sets/${masterSetKey}/printings.json`],
    ];
    for (const [key, relative] of entries) {
      const bytes = await fs.readFile(path.join(REPO_ROOT, relative));
      sources[key] = { relative, bytes, value: JSON.parse(bytes.toString("utf8")) };
    }
  }
  const evidenceBytes = await fs.readFile(path.join(REPO_ROOT, THIRTY_C_EVIDENCE_PATH));
  sources["30c_evidence"] = {
    relative: THIRTY_C_EVIDENCE_PATH,
    bytes: evidenceBytes,
    value: JSON.parse(evidenceBytes.toString("utf8")),
  };
  return sources;
}

function sourceProjection(candidates, sources) {
  return candidates.map((candidate) => {
    const authority = reviewedTcgplayerAliasWave2ProductIdentityV1(candidate);
    assert.ok(authority, `reviewed_source_drift:${candidate.source_product_id}`);
    assert.ok(matchesReviewedTcgplayerAliasWave2ProductTargetV1(candidate, {
      card_print_id: candidate.target.card_print_id, gv_id: candidate.target.gv_id,
      set_id: candidate.target.set_id, set_code: candidate.target.set_code,
      name: candidate.target.canonical_name, number: candidate.target.canonical_number,
      variant_key: candidate.target.variant_key,
    }), `reviewed_target_drift:${candidate.source_product_id}`);
    if (authority.target.set_code === "30c") {
      const evidenceRows = sources["30c_evidence"].value.rows.filter((row) =>
        row.source_product_id === authority.source_product_id &&
        row.target.card_print_id === authority.target.card_print_id &&
        row.target.gv_id === authority.target.gv_id &&
        row.target.number === authority.target.number &&
        row.target.name === authority.target.name &&
        row.printing.printing_gv_id === authority.printing.printing_gv_id &&
        row.printing.finish_key === authority.printing.finish_key &&
        row.printing.provenance_source === authority.printing.provenance_source &&
        row.printing.provenance_ref === authority.printing.provenance_ref &&
        row.live_review.review_status === "verified" &&
        row.live_review.public_visibility === "visible");
      assert.equal(evidenceRows.length, 1,
        `30c_reviewed_evidence_drift:${candidate.source_product_id}`);
      return { source_product_id: candidate.source_product_id, authority,
        source_kind: "reviewed_30c_coordinate_evidence", evidence: evidenceRows[0] };
    }
    const masterSetKey = MASTER_INDEX_SET_KEYS[authority.target.set_code];
    const cards = sources[`${authority.target.set_code}_cards`].value.cards;
    const printings = sources[`${authority.target.set_code}_printings`].value.printings;
    const cardRows = cards.filter((row) => row.set_key === masterSetKey &&
      normalizeTcgplayerMappingNumberV1(row.card_number) === normalizeTcgplayerMappingNumberV1(authority.target.number) &&
      row.card_name === authority.target.name && row.status === "master_verified");
    const printingRows = printings.filter((row) => row.set_key === masterSetKey &&
      normalizeTcgplayerMappingNumberV1(row.card_number) === normalizeTcgplayerMappingNumberV1(authority.target.number) &&
      row.card_name === authority.target.name && row.finish_key === authority.printing.finish_key &&
      row.status === "master_verified");
    assert.equal(cardRows.length, 1, `base_card_evidence_drift:${candidate.source_product_id}`);
    assert.equal(printingRows.length, 1, `base_printing_evidence_drift:${candidate.source_product_id}`);
    return { source_product_id: candidate.source_product_id, authority,
      source_kind: "english_master_index", card: cardRows[0], printing: printingRows[0] };
  });
}

async function readDatabase(candidates) {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split(".")[0], PROJECT_REF, "production_project_ref_mismatch");
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL,
    ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true },
    application_name: "reviewed_alias_wave_2_mapping_authority_read_only", statement_timeout: 120_000, query_timeout: 125_000 });
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.deepEqual(server, { database: "postgres", username: "postgres", read_only: "on" });
    const ids = candidates.map((row) => row.target.card_print_id);
    const productIds = candidates.map((row) => Number(row.source_product_id));
    const parents = (await client.query(`select c.id::text,c.set_id::text,c.set_code,c.name,c.number,
      c.variant_key,c.gv_id,c.identity_domain,c.printed_identity_modifier,
      count(distinct i.id) filter(where i.is_active and i.identity_domain='pokemon_eng_standard')::integer active_standard_identity_count
      from public.card_prints c left join public.card_print_identity i on i.card_print_id=c.id
      where c.id=any($1::uuid[]) group by c.id order by c.id`, [ids])).rows;
    const printings = (await client.query(`select p.id::text,p.card_print_id::text,p.finish_key,p.printing_gv_id,
      p.is_provisional,p.provenance_source,p.provenance_ref,coalesce(f.is_active,false) finish_active,
      review.review_status active_truth_review,review.public_visibility,
      coalesce(f.is_active,false) and coalesce(review.public_visibility,'') not in
        ('hidden_pending_review','hidden_unsupported') public_visible
      from public.card_printings p left join public.finish_keys f on f.key=p.finish_key
      left join lateral (select r.review_status,r.public_visibility from public.card_printing_truth_reviews r
        where r.card_printing_id=p.id and r.active=true order by r.created_at desc nulls last,r.id desc limit 1) review on true
      where p.card_print_id=any($1::uuid[]) order by p.card_print_id,p.finish_key`, [ids])).rows;
    const products = (await client.query(`select product_id,category_id,group_id,name,source_url,
      source_modified_on,extended_data,raw_payload,payload_hash,last_seen_at,last_seen_run_id,
      source_active,catalog_metadata_status from public.tcgcsv_source_products
      where product_id=any($1::integer[]) order by product_id`, [productIds])).rows;
    const existing = (await client.query(`select external_id,card_print_id::text from public.external_mappings
      where source='tcgplayer' and active and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))`,
    [productIds.map(String), ids])).rows;
    await client.query("commit");
    return { parents, printings, products, existing };
  } finally { await client.end(); }
}

function buildManifest({ setCode, candidates, db, sources, projections, reviewedAt, groupArtifacts }) {
  const setId = EXPECTED_SETS[setCode];
  const isThirtyC = setCode === "30c";
  const masterRef = `${setCode}-reviewed-alias-wave-2-master-index-projection-v1`;
  const masterBytes = jsonBytes({ version: "REVIEWED_ALIAS_WAVE_2_MASTER_INDEX_PROJECTION_V1", set_id: setId,
    set_code: setCode, source_sha256: isThirtyC ? {
      reviewed_coordinate_evidence: sha256(sources["30c_evidence"].bytes),
    } : {
      cards: sha256(sources[`${setCode}_cards`].bytes),
      printings: sha256(sources[`${setCode}_printings`].bytes),
    }, rows: projections.filter((row) => row.authority.target.set_code === setCode) });
  const artifacts = new Map([[masterRef, masterBytes]]);
  if (isThirtyC) {
    artifacts.set("30c-reviewed-coordinate-evidence-v1", sources["30c_evidence"].bytes);
  } else {
    artifacts.set(`${setCode}-english-master-index-cards-v1`, sources[`${setCode}_cards`].bytes);
    artifacts.set(`${setCode}-english-master-index-printings-v1`, sources[`${setCode}_printings`].bytes);
  }
  for (const item of groupArtifacts.values()) artifacts.set(item.ref, item.bytes);
  const sourceArtifacts = [
    { ref: masterRef, sha256: sha256(masterBytes), kind: "exact_printing_mapping",
      url_or_identifier: `derived:${masterRef}`, retrieved_at: reviewedAt },
    ...(isThirtyC ? [{ ref: "30c-reviewed-coordinate-evidence-v1",
      sha256: sha256(sources["30c_evidence"].bytes), kind: "exact_printing_mapping",
      url_or_identifier: sources["30c_evidence"].relative,
      retrieved_at: sources["30c_evidence"].value.reviewed_at }] : [
      { ref: `${setCode}-english-master-index-cards-v1`, sha256: sha256(sources[`${setCode}_cards`].bytes),
        kind: "official_printing", url_or_identifier: sources[`${setCode}_cards`].relative, retrieved_at: reviewedAt },
      { ref: `${setCode}-english-master-index-printings-v1`, sha256: sha256(sources[`${setCode}_printings`].bytes),
        kind: "official_printing", url_or_identifier: sources[`${setCode}_printings`].relative, retrieved_at: reviewedAt },
    ]),
    ...[...groupArtifacts.values()].map((item) => item.sourceArtifact),
  ];
  const parents = candidates.map((candidate) => {
    const row = db.parents.find((parent) => parent.id === candidate.target.card_print_id);
    return { id: row.id, name: row.name, gv_id: row.gv_id, set_id: row.set_id,
      variant_key: row.variant_key ?? "", identity_domain: row.identity_domain,
      printed_coordinate: row.number, printed_identity_modifier: row.printed_identity_modifier ?? null };
  });
  const printings = candidates.map((candidate) => {
    const authority = reviewedTcgplayerAliasWave2ProductIdentityV1(candidate);
    const sourceRef = isThirtyC
      ? "30c-reviewed-coordinate-evidence-v1"
      : `${setCode}-english-master-index-printings-v1`;
    const source = sourceArtifacts.find((row) => row.ref === sourceRef);
    return { card_print_id: authority.target.card_print_id, finish_key: authority.printing.finish_key,
      printing_gv_id: authority.printing.printing_gv_id, review_status: "verified",
      evidence: [{ kind: source.kind, source_ref: source.ref, sha256: source.sha256,
        card_print_id: authority.target.card_print_id, finish_key: authority.printing.finish_key }] };
  });
  const mappingAssertions = candidates.map((candidate) => {
    const group = groupArtifacts.get(Number(candidate.source_group_id));
    return { source: "tcgplayer", external_id: String(candidate.source_product_id),
      card_print_id: candidate.target.card_print_id, candidate_fingerprint: candidate.candidate_fingerprint,
      source_ref: group.ref, source_sha256: sha256(group.bytes) };
  }).sort((left, right) => Number(left.external_id) - Number(right.external_id));
  const body = { version: "PRINTING_COMPLETENESS_GATE_V1", game: "pokemon", language: "en", set_code: setCode,
    scope: "verified_parent_families",
    scope_note: "Exact reviewed TCGPlayer alias products with unique set and number identity, frozen source titles, canonical parents, selected public printings, and checked-in source evidence.",
    identity_policy_version: "POKEMON_EN_PHYSICAL_V1", master_index_ref: masterRef,
    master_index_sha256: sha256(masterBytes), parents, printings, unresolved_variants: [],
    suppressed_printing_facts: [], expected: { parents: parents.length, printings: printings.length,
      finishes: Object.fromEntries([...new Set(printings.map((row) => row.finish_key))].sort()
        .map((finish) => [finish, printings.filter((row) => row.finish_key === finish).length])) },
    authority: { version: "MASTER_INDEX_PRINTING_AUTHORITY_V1", status: "verified_scope", set_id: setId,
      source_artifacts: sourceArtifacts, protected_facts: printings.map((row) => ({
        card_print_id: row.card_print_id, finish_key: row.finish_key })), forbidden_facts: [], conflicts: [] },
    external_mapping_assertions: mappingAssertions };
  const reviewRef = `review:${setCode}:tcgplayer-reviewed-alias-wave-2-20261014`;
  const reviewBytes = jsonBytes({ status: "verified_scope", master_index_sha256: body.master_index_sha256,
    game: body.game, language: body.language, set_code: setCode, scope: body.scope,
    reviewer: "Codex source adjudication; not founder mutation approval", reviewed_at: reviewedAt,
    projection_sha256: printingManifestHash(body), reasoning: [
      "Each source group has established single-set authority from existing active mappings.",
      "Each admitted source product has one reviewed canonical target at its exact printed coordinate; display-name aliases are frozen product by product.",
      isThirtyC
        ? "Checked-in reviewed 30th Celebration evidence freezes each RGB coordinate and selected Holo printing."
        : "Checked-in English Master Index card and printing exports verify the canonical name, coordinate, and selected finish.",
      "Every selected live Holo child is active, public, non-provisional, and has an active verified visible truth review.",
      "The exact product registry preserves display-only source qualifiers and punctuation differences without adding a global normalization rule.",
      "This evidence package does not itself authorize a database mutation.",
    ], mutation_authority: false });
  artifacts.set(reviewRef, reviewBytes);
  body.authority.review = { ref: reviewRef, sha256: sha256(reviewBytes) };
  const manifest = { ...body, fingerprint: printingManifestHash(body) };
  assertMasterPrintingAuthority(manifest, artifacts);
  return { manifest, artifacts };
}

export async function buildReviewedAliasWave2MappingAuthority(args) {
  const options = parseArgs(args);
  const candidateBytes = await fs.readFile(path.join(options.planDir, "candidates.jsonl"));
  const candidates = candidateBytes.toString("utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert.equal(candidates.length, EXPECTED_CANDIDATES, "exact_candidate_count_changed");
  assert.equal(TCGPLAYER_REVIEWED_ALIAS_WAVE_2_PRODUCT_IDENTITIES_V1.length, EXPECTED_CANDIDATES, "registry_count_changed");
  assert.ok(candidates.every((row) => row.evidence_lane === "reviewed_product_identity_authority" &&
    EXPECTED_SETS[row.target?.set_code] === row.target?.set_id), "reviewed_alias_wave_2_scope_drift");
  assert.deepEqual(candidates.map((row) => Number(row.source_product_id)).sort((a,b) => a-b),
    TCGPLAYER_REVIEWED_ALIAS_WAVE_2_PRODUCT_IDENTITIES_V1.map((row) => row.source_product_id).sort((a,b) => a-b),
    "reviewed_product_selection_changed");
  for (const candidate of candidates) {
    const structural = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
    assert.ok(structural.accepted, `invalid_candidate:${candidate.source_product_id}:${structural.failures.join(",")}`);
  }
  const sources = await loadSources();
  const projections = sourceProjection(candidates, sources);
  const db = await readDatabase(candidates);
  assert.equal(db.parents.length, candidates.length, "live_parent_count_changed");
  assert.equal(db.products.length, candidates.length, "live_source_product_count_changed");
  assert.equal(db.existing.length, 0, "target_or_source_already_mapped");
  for (const candidate of candidates) {
    const authority = reviewedTcgplayerAliasWave2ProductIdentityV1(candidate);
    const parent = db.parents.find((row) => row.id === authority.target.card_print_id);
    const product = db.products.find((row) => Number(row.product_id) === authority.source_product_id);
    const printing = db.printings.find((row) => row.card_print_id === authority.target.card_print_id &&
      row.printing_gv_id === authority.printing.printing_gv_id);
    assert.ok(parent && product && printing, `live_identity_missing:${candidate.source_product_id}`);
    assert.equal(parent.set_id, authority.target.set_id); assert.equal(parent.set_code, authority.target.set_code);
    assert.equal(parent.identity_domain, "pokemon_eng_standard"); assert.equal(Number(parent.active_standard_identity_count), 1);
    assert.equal(parent.gv_id, authority.target.gv_id); assert.equal(parent.name, authority.target.name);
    assert.equal(String(parent.number), authority.target.number); assert.equal(parent.variant_key ?? "", authority.target.variant_key);
    assert.equal(product.category_id, 3); assert.equal(product.group_id, authority.source_group_id);
    assert.equal(product.name, authority.source_product_name); assert.equal(productNumber(product), authority.printed_number);
    assert.equal(product.source_active, true); assert.equal(product.catalog_metadata_status, "current");
    assert.equal(printing.finish_key, authority.printing.finish_key);
    assert.equal(printing.printing_gv_id, authority.printing.printing_gv_id);
    assert.equal(printing.is_provisional, false); assert.equal(printing.provenance_source, authority.printing.provenance_source);
    assert.equal(printing.provenance_ref, authority.printing.provenance_ref); assert.equal(printing.finish_active, true);
    assert.equal(printing.public_visible, true);
    if (authority.target.variant_key) {
      assert.equal(printing.active_truth_review, null,
        `unexpected_variant_truth_review:${candidate.source_product_id}`);
      assert.equal(printing.public_visibility, null,
        `unexpected_variant_visibility_override:${candidate.source_product_id}`);
    } else {
      assert.equal(printing.active_truth_review, "verified",
        `base_truth_review_drift:${candidate.source_product_id}`);
      assert.equal(printing.public_visibility, "visible",
        `base_visibility_drift:${candidate.source_product_id}`);
    }
  }
  const groupArtifacts = new Map();
  for (const groupId of [...new Set(candidates.map((row) => Number(row.source_group_id)))]) {
    const products = db.products.filter((row) => Number(row.group_id) === groupId);
    const ref = `tcgcsv-group-${groupId}-selected-products`;
    const bytes = jsonBytes({ version: "TCGCSV_PRODUCT_GROUP_SELECTION_SNAPSHOT_V1", category_id: 3, group_id: groupId,
      source_sync_run_ids: [...new Set(products.map((row) => row.last_seen_run_id))].sort(),
      products: products.map((row) => row.raw_payload) });
    groupArtifacts.set(groupId, { ref, bytes, sourceArtifact: { ref, sha256: sha256(bytes), kind: "exact_printing_mapping",
      url_or_identifier: `https://tcgcsv.com/tcgplayer/3/${groupId}/products`,
      retrieved_at: new Date(Math.max(...products.map((row) => Date.parse(row.last_seen_at)))).toISOString() } });
  }
  const scopes = Object.keys(EXPECTED_SETS).map((setCode) => buildManifest({ setCode,
    candidates: candidates.filter((row) => row.target.set_code === setCode), db, sources, projections,
    reviewedAt: options.reviewedAt, groupArtifacts }));
  for (const { manifest, artifacts } of scopes) {
    await writeFileExclusive(path.join(options.outDir,"authority",manifest.set_code,"manifest.json"),jsonBytes(manifest));
    await writeFileExclusive(path.join(options.outDir,"authority",manifest.set_code,"artifact-map.json"),jsonBytes(
      [...artifacts.keys()].sort().map((ref) => ({ref,path:`artifacts/${ref.replace(/[^a-z0-9._-]+/gi,"_")}`}))));
    for (const [ref,bytes] of artifacts) await writeFileExclusive(path.join(options.outDir,"authority",manifest.set_code,
      "artifacts",ref.replace(/[^a-z0-9._-]+/gi,"_")),bytes);
  }
  const baseSummary = JSON.parse(await fs.readFile(path.join(options.planDir,"summary.json"),"utf8"));
  const baseRunPlan = JSON.parse(await fs.readFile(path.join(options.planDir,"run_plan.json"),"utf8"));
  const head = git(["rev-parse","HEAD"]); const trackedClean = git(["status","--porcelain","--untracked-files=no"]) === "";
  const selectedBytes = Buffer.from(`${candidates.map((row) => JSON.stringify(row)).join("\n")}\n`);
  const batch = { index:1,total:1,offset:0,size:candidates.length };
  const summary = { ...baseSummary, counts:{...baseSummary.counts,candidates:candidates.length,
    projected_gap_rows:candidates.reduce((sum,row)=>sum+Number(row.supporting_gap_row_count),0)},batch };
  const runPlan = {...baseRunPlan,commit_sha:head,branch:git(["branch","--show-current"]),tracked_worktree_clean:trackedClean,
    source_plan_commit_sha:baseRunPlan.commit_sha,source_plan_candidates_sha256:sha256(candidateBytes),batch};
  const bundle = freezeMasterMappingAuthority(candidates,scopes);
  const bundleBytes=jsonBytes(bundle); const batchDir=path.join(options.outDir,"batches","batch-01");
  await writeFileExclusive(path.join(batchDir,"plan","candidates.jsonl"),selectedBytes);
  await writeFileExclusive(path.join(batchDir,"plan","summary.json"),jsonBytes(summary));
  await writeFileExclusive(path.join(batchDir,"plan","run_plan.json"),jsonBytes(runPlan));
  await writeFileExclusive(path.join(batchDir,"package","master_authority.json"),bundleBytes);
  await writeFileExclusive(path.join(batchDir,"package","selected_candidates.jsonl"),selectedBytes);
  const batchReceipt={version:"MASTER_INDEX_MAPPING_PACKAGE_RECEIPT_V1",batch,authority_fingerprint:bundle.fingerprint,
    authority_file_sha256:sha256(bundleBytes),selected_file_sha256:sha256(selectedBytes),selected_count:candidates.length,
    scope_count:scopes.length,execution_authorized:false,database_writes:0};
  await writeFileExclusive(path.join(batchDir,"package","receipt.json"),jsonBytes(batchReceipt));
  const receipt={version:VERSION,status:"verified_scope",reviewed_at:options.reviewedAt,
    source_plan_candidates_sha256:sha256(candidateBytes),counts:{candidates:candidates.length,parents:candidates.length,
      printings:candidates.length,tcgcsv_products:db.products.length,batches:1,
      projected_gap_rows:candidates.reduce((sum,row)=>sum+Number(row.supporting_gap_row_count),0)},
    tracked_worktree_clean:trackedClean,commit_sha:head,batches:[{batch:"batch-01",...batchReceipt}],database_writes:0,
    execution_authorized:false};
  await writeFileExclusive(path.join(options.outDir,"receipt.json"),jsonBytes(receipt));
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildReviewedAliasWave2MappingAuthority(process.argv.slice(2)).then((receipt)=>console.log(JSON.stringify(receipt,null,2)))
    .catch((error)=>{console.error(error.stack??error.message);process.exitCode=1;});
}
