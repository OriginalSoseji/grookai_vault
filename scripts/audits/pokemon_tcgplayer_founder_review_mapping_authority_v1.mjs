import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertMasterPrintingAuthority } from "../../backend/catalog/master_index_printing_authority_v1.mjs";
import { printingManifestHash } from "../../backend/catalog/printing_completeness_gate_v1.mjs";
import { freezeMasterMappingAuthority } from "../../backend/pricing/master_index_mapping_authority_v1.mjs";
import {
  TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1,
  reviewedTcgplayerFounderReviewBatchProductIdentityV1,
} from "../../backend/pricing/tcgplayer_founder_review_batch_product_identity_authority_v1.mjs";
import { validateTcgplayerExactMappingCandidateForApplyV1 } from
  "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import {
  normalizeTcgplayerMappingNumberV1,
  planTcgplayerExactMappingCandidateV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";

export const POKEMON_TCGPLAYER_FOUNDER_REVIEW_MAPPING_AUTHORITY_V1 =
  "POKEMON_TCGPLAYER_FOUNDER_REVIEW_MAPPING_AUTHORITY_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const SETS = Object.freeze({
  basep: "915c6517-a6b5-418f-8bc7-c05cae51e0ff",
  "ex5.5": "074b63d4-5018-44ec-bf3c-d1eff6a92234",
  swshp: "fb3eedc5-7234-49b5-b95b-8a9286c27daf",
});
const SOURCE_HASHES = Object.freeze({
  basep_cards: "32191bcb7fc3ec0cdc721a7d23d916af1dee1a2b3a5484495d0f830a75a99f2e",
  basep_printings: "1c6b3be92ef81d3db8c544f193b31466714fdaa6003fe2a16e81f0eee5cef515",
  "ex5.5_cards": "6c3215a140101c269560ae6c9228b7d320bb76e1b5f38c23aefc2d583d49e0e4",
  "ex5.5_printings": "d01553e1beb63820be8a2e069d7ccf479670aa2cbb92e615c185f8700a9f74b5",
  swshp_cards: "078848c79c0aaed5ffd9bf5565683d069461bb1823f9b96bdb0c3cbee5133407",
  swshp_printings: "11d966b6098078264e82ade83203c49bb2b973c86f53d2dde84afda0f8ef6829",
});
const SUBTYPE_BY_FINISH = Object.freeze({ normal: "Normal", holo: "Holofoil", reverse: "Reverse Holofoil" });

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function args(argv) {
  const out = {};
  for (const token of argv) {
    const match = /^--(review-queue|out-dir|reviewed-at)=(.+)$/.exec(token);
    assert.ok(match && !out[match[1]], `unknown_or_repeated_argument:${token}`);
    out[match[1]] = match[2];
  }
  for (const key of ["review-queue", "out-dir", "reviewed-at"]) assert.ok(out[key], `--${key} is required`);
  assert.ok(Number.isFinite(Date.parse(out["reviewed-at"])), "reviewed_at_invalid");
  return {
    reviewQueue: path.resolve(out["review-queue"]),
    outDir: path.resolve(out["out-dir"]),
    reviewedAt: new Date(out["reviewed-at"]).toISOString(),
  };
}

async function readJsonl(file) {
  return (await fs.readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

async function writeNew(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: "wx" });
}

function restConfig() {
  const base = String(process.env.SUPABASE_URL ?? "").trim();
  const secret = String(process.env.SUPABASE_SECRET_KEY ?? "").trim();
  assert.ok(base && secret, "SUPABASE_URL_and_SUPABASE_SECRET_KEY_required");
  const url = new URL(base);
  assert.equal(url.hostname, `${PROJECT_REF}.supabase.co`, "production_project_ref_mismatch");
  return { base: base.replace(/\/$/, ""), headers: { apikey: secret, Authorization: `Bearer ${secret}` } };
}

async function restRows(table, query) {
  const { base, headers } = restConfig();
  const url = new URL(`${base}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers });
  const body = await response.text();
  assert.ok(response.ok, `rest_read_failed:${table}:${response.status}:${body}`);
  return JSON.parse(body);
}

async function liveSnapshot(authorities) {
  const parentIds = authorities.map((row) => row.target.card_print_id);
  const printingIds = authorities.map((row) => row.printing.printing_id);
  const productIds = authorities.map((row) => row.source_product_id);
  const inList = (values) => `in.(${values.join(",")})`;
  const [parents, identities, printings, products, sourceMappings, targetMappings] = await Promise.all([
    restRows("card_prints", { select: "id,set_id,set_code,name,number,variant_key,gv_id,identity_domain,printed_identity_modifier", id: inList(parentIds) }),
    restRows("card_print_identity", { select: "id,card_print_id,identity_domain,is_active", card_print_id: inList(parentIds), identity_domain: "eq.pokemon_eng_standard", is_active: "eq.true" }),
    restRows("card_printings", { select: "id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref", id: inList(printingIds) }),
    restRows("tcgcsv_source_products", { select: "product_id,category_id,group_id,name,extended_data,raw_payload,payload_hash,last_seen_at,last_seen_run_id,source_active,catalog_metadata_status", product_id: inList(productIds) }),
    restRows("external_mappings", { select: "external_id,card_print_id", source: "eq.tcgplayer", active: "eq.true", external_id: inList(productIds) }),
    restRows("external_mappings", { select: "external_id,card_print_id", source: "eq.tcgplayer", active: "eq.true", card_print_id: inList(parentIds) }),
  ]);
  return { parents, identities, printings, products, mappings: [...sourceMappings, ...targetMappings] };
}

function fieldNumber(product) {
  return String(product.extended_data?.find((field) =>
    String(field?.name ?? "").trim().toLowerCase() === "number")?.value ?? "").trim();
}

function exactCandidates(queue, db) {
  return TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1.map((authority) => {
    const reviewed = queue.find((row) => Number(row.source_product_id) === authority.source_product_id);
    assert.ok(reviewed, `review_queue_row_missing:${authority.source_product_id}`);
    const product = db.products.find((row) => Number(row.product_id) === authority.source_product_id);
    const parent = db.parents.find((row) => row.id === authority.target.card_print_id);
    const printing = db.printings.find((row) => row.id === authority.printing.printing_id);
    assert.ok(product && parent && printing, `live_identity_missing:${authority.source_product_id}`);
    assert.equal(product.category_id, 3);
    assert.equal(product.group_id, authority.source_group_id);
    assert.equal(product.name, authority.source_product_name);
    assert.equal(fieldNumber(product), authority.printed_number);
    assert.equal(product.source_active, true);
    assert.equal(product.catalog_metadata_status, "current");
    assert.equal(parent.set_id, authority.target.set_id);
    assert.equal(parent.set_code, authority.target.set_code);
    assert.equal(parent.name, authority.target.name);
    assert.equal(String(parent.number), authority.target.number);
    assert.equal(parent.gv_id, authority.target.gv_id);
    assert.equal(parent.identity_domain, "pokemon_eng_standard");
    assert.equal(printing.card_print_id, authority.target.card_print_id);
    assert.equal(printing.finish_key, authority.printing.finish_key);
    assert.equal(printing.printing_gv_id, authority.printing.printing_gv_id);
    assert.equal(printing.is_provisional, false);
    assert.equal(printing.provenance_source, authority.printing.provenance_source);
    assert.equal(printing.provenance_ref, authority.printing.provenance_ref);
    assert.equal(db.mappings.filter((row) => row.external_id === String(authority.source_product_id) ||
      row.card_print_id === authority.target.card_print_id).length, 0, `source_or_target_already_mapped:${authority.source_product_id}`);
    const activeIdentities = db.identities.filter((row) => row.card_print_id === parent.id).length;
    assert.equal(activeIdentities, 1, `active_standard_identity_count_changed:${authority.source_product_id}`);
    const source = {
      source_product_id: authority.source_product_id,
      source_product_name: authority.source_product_name,
      source_group_id: authority.source_group_id,
      source_group_name: authority.source_group_name,
      printed_number: authority.printed_number,
      source_subtypes: reviewed.source_subtypes,
      supporting_gap_observation_ids: reviewed.supporting_gap_observation_ids,
      supporting_gap_row_count: reviewed.supporting_gap_row_count,
      active_source_mapping_count: 0,
      has_printed_number_evidence: true,
    };
    assert.deepEqual(source.source_subtypes, [SUBTYPE_BY_FINISH[authority.printing.finish_key]],
      `source_finish_scope_changed:${authority.source_product_id}`);
    const candidate = planTcgplayerExactMappingCandidateV1({ source, setTargets: [{
      card_print_id: parent.id, gv_id: parent.gv_id, set_id: parent.set_id, set_code: parent.set_code,
      name: parent.name, number: parent.number, variant_key: parent.variant_key ?? "",
      active_standard_identity_count: activeIdentities, active_tcgplayer_mapping_count: 0,
    }] });
    assert.equal(candidate.disposition, "candidate", `candidate_blocked:${authority.source_product_id}:${candidate.reason}`);
    assert.ok(reviewedTcgplayerFounderReviewBatchProductIdentityV1(candidate));
    assert.ok(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted,
      `candidate_invalid:${authority.source_product_id}`);
    return candidate;
  });
}

async function masterSources() {
  const result = {};
  for (const setCode of Object.keys(SETS)) {
    for (const kind of ["cards", "printings"]) {
      const relative = `docs/audits/english_master_index_publishable_v1/sets/${setCode}/${kind}.json`;
      const bytes = await fs.readFile(path.join(ROOT, relative));
      assert.equal(sha256(bytes), SOURCE_HASHES[`${setCode}_${kind}`], `master_index_hash_changed:${setCode}:${kind}`);
      result[`${setCode}_${kind}`] = { relative, bytes, value: JSON.parse(bytes.toString("utf8")) };
    }
  }
  return result;
}

function scopeFor(candidate, db, sources, reviewedAt) {
  const authority = reviewedTcgplayerFounderReviewBatchProductIdentityV1(candidate);
  const setCode = authority.target.set_code;
  const cardsSource = sources[`${setCode}_cards`];
  const printingsSource = sources[`${setCode}_printings`];
  const cards = cardsSource.value.cards.filter((row) => row.set_key === setCode &&
    normalizeTcgplayerMappingNumberV1(row.card_number) === normalizeTcgplayerMappingNumberV1(authority.target.number) &&
    row.card_name === authority.target.name && row.status === "master_verified");
  const printings = printingsSource.value.printings.filter((row) => row.set_key === setCode &&
    normalizeTcgplayerMappingNumberV1(row.card_number) === normalizeTcgplayerMappingNumberV1(authority.target.number) &&
    row.card_name === authority.target.name && row.finish_key === authority.printing.finish_key &&
    row.status === "master_verified");
  assert.equal(cards.length, 1, `master_card_evidence_changed:${authority.source_product_id}`);
  assert.equal(printings.length, 1, `master_printing_evidence_changed:${authority.source_product_id}`);
  const product = db.products.find((row) => Number(row.product_id) === authority.source_product_id);
  const sourceRef = `tcgcsv-product-${authority.source_product_id}-reviewed-snapshot-v1`;
  const sourceBytes = jsonBytes({
    version: "TCGCSV_REVIEWED_PRODUCT_MAPPING_SNAPSHOT_V1",
    source_product_id: authority.source_product_id,
    source_group_id: authority.source_group_id,
    source_product_name: authority.source_product_name,
    printed_number: authority.printed_number,
    target: authority.target,
    raw_payload: product.raw_payload,
    payload_hash: product.payload_hash,
    source_sync_run_id: product.last_seen_run_id,
  });
  const masterRef = `${setCode}-founder-review-master-index-projection-v1`;
  const masterBytes = jsonBytes({
    version: "POKEMON_TCGPLAYER_FOUNDER_REVIEW_MASTER_INDEX_PROJECTION_V1",
    set_id: authority.target.set_id,
    set_code: setCode,
    source_sha256: { cards: sha256(cardsSource.bytes), printings: sha256(printingsSource.bytes) },
    cards,
    printings,
  });
  const artifacts = new Map([
    [masterRef, masterBytes],
    [`${setCode}-english-master-index-cards-v1`, cardsSource.bytes],
    [`${setCode}-english-master-index-printings-v1`, printingsSource.bytes],
    [sourceRef, sourceBytes],
  ]);
  const sourceArtifacts = [
    { ref: masterRef, sha256: sha256(masterBytes), kind: "exact_printing_mapping",
      url_or_identifier: `derived:${masterRef}`, retrieved_at: reviewedAt },
    { ref: `${setCode}-english-master-index-cards-v1`, sha256: sha256(cardsSource.bytes), kind: "official_printing",
      url_or_identifier: cardsSource.relative, retrieved_at: reviewedAt },
    { ref: `${setCode}-english-master-index-printings-v1`, sha256: sha256(printingsSource.bytes), kind: "official_printing",
      url_or_identifier: printingsSource.relative, retrieved_at: reviewedAt },
    { ref: sourceRef, sha256: sha256(sourceBytes), kind: "exact_printing_mapping",
      url_or_identifier: `https://tcgcsv.com/tcgplayer/3/${authority.source_group_id}/products`,
      retrieved_at: new Date(product.last_seen_at).toISOString() },
  ];
  const parent = db.parents.find((row) => row.id === authority.target.card_print_id);
  const body = {
    version: "PRINTING_COMPLETENESS_GATE_V1", game: "pokemon", language: "en", set_code: setCode,
    scope: "verified_parent_families",
    scope_note: "Exact founder-reviewed TCGPlayer source product, canonical parent, and source-listed finish bound to checked-in English Master Index evidence.",
    identity_policy_version: "POKEMON_EN_PHYSICAL_V1", master_index_ref: masterRef,
    master_index_sha256: sha256(masterBytes),
    parents: [{ id: parent.id, name: parent.name, gv_id: parent.gv_id, set_id: parent.set_id,
      variant_key: parent.variant_key ?? "", identity_domain: parent.identity_domain,
      printed_coordinate: parent.number, printed_identity_modifier: parent.printed_identity_modifier ?? null }],
    printings: [{ card_print_id: parent.id, finish_key: authority.printing.finish_key,
      printing_gv_id: authority.printing.printing_gv_id, review_status: "verified",
      evidence: [{ kind: "official_printing", source_ref: `${setCode}-english-master-index-printings-v1`,
        sha256: sha256(printingsSource.bytes), card_print_id: parent.id, finish_key: authority.printing.finish_key }] }],
    unresolved_variants: [], suppressed_printing_facts: [],
    expected: { parents: 1, printings: 1, finishes: { [authority.printing.finish_key]: 1 } },
    authority: { version: "MASTER_INDEX_PRINTING_AUTHORITY_V1", status: "verified_scope",
      set_id: authority.target.set_id, source_artifacts: sourceArtifacts,
      protected_facts: [{ card_print_id: parent.id, finish_key: authority.printing.finish_key }],
      forbidden_facts: [], conflicts: [] },
    external_mapping_assertions: [{ source: "tcgplayer", external_id: String(authority.source_product_id),
      card_print_id: parent.id, candidate_fingerprint: candidate.candidate_fingerprint,
      source_ref: sourceRef, source_sha256: sha256(sourceBytes) }],
  };
  const reviewRef = `review:${setCode}:pokemon-founder-review-20261026`;
  const reviewBytes = jsonBytes({
    status: "verified_scope", master_index_sha256: body.master_index_sha256,
    game: body.game, language: body.language, set_code: setCode, scope: body.scope,
    reviewer: "Codex source adjudication; founder execution approval remains required",
    reviewed_at: reviewedAt, projection_sha256: printingManifestHash(body),
    reasoning: [
      "The immutable pricing-completion artifact identifies one exact canonical parent.",
      "The live TCGCSV product tuple and checked-in English Master Index agree on the printed coordinate.",
      "The source subtype matches the one admitted canonical finish; ambiguous promo finishes remain held.",
      "This evidence package does not authorize a database mutation."
    ], mutation_authority: false,
  });
  artifacts.set(reviewRef, reviewBytes);
  body.authority.review = { ref: reviewRef, sha256: sha256(reviewBytes) };
  const manifest = { ...body, fingerprint: printingManifestHash(body) };
  assertMasterPrintingAuthority(manifest, artifacts);
  return { manifest, artifacts };
}

export async function buildPokemonFounderReviewMappingAuthorityV1(options) {
  const queueBytes = await fs.readFile(options.reviewQueue);
  const queue = await readJsonl(options.reviewQueue);
  const authorities = TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1;
  assert.equal(authorities.length, 3);
  const db = await liveSnapshot(authorities);
  assert.equal(db.parents.length, 3, "live_parent_count_changed");
  assert.equal(db.identities.length, 3, "live_identity_count_changed");
  assert.equal(db.printings.length, 3, "live_printing_count_changed");
  assert.equal(db.products.length, 3, "live_product_count_changed");
  assert.equal(db.mappings.length, 0, "source_or_target_mapping_now_exists");
  const candidates = exactCandidates(queue, db);
  const sources = await masterSources();
  const scopes = candidates.map((candidate) => scopeFor(candidate, db, sources, options.reviewedAt));
  const bundle = freezeMasterMappingAuthority(candidates, scopes);
  const candidateBytes = Buffer.from(`${candidates.map((row) => JSON.stringify(row)).join("\n")}\n`);
  const bundleBytes = jsonBytes(bundle);
  const reviewRows = queue.filter((row) => authorities.some((authority) =>
    authority.source_product_id === Number(row.source_product_id))).sort((a, b) => a.source_product_id - b.source_product_id);
  const receipt = {
    version: POKEMON_TCGPLAYER_FOUNDER_REVIEW_MAPPING_AUTHORITY_V1,
    status: "verified_scope",
    reviewed_at: options.reviewedAt,
    source_queue_sha256: sha256(queueBytes),
    selected_candidates_sha256: sha256(candidateBytes),
    master_authority_sha256: sha256(bundleBytes),
    master_authority_fingerprint: bundle.fingerprint,
    counts: { reviewed: 18, admitted: 3, held: 15, scopes: 3, projected_gap_rows: 3 },
    boundaries: { database_reads: true, database_writes: false, mapping_writes: false,
      publication_writes: false, execution_authorized: false },
  };
  await writeNew(path.join(options.outDir, "selected_candidates.jsonl"), candidateBytes);
  await writeNew(path.join(options.outDir, "master_authority.json"), bundleBytes);
  await writeNew(path.join(options.outDir, "review_candidates.json"), jsonBytes(reviewRows));
  await writeNew(path.join(options.outDir, "receipt.json"), jsonBytes(receipt));
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildPokemonFounderReviewMappingAuthorityV1(args(process.argv.slice(2)))
    .then((receipt) => process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`))
    .catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
