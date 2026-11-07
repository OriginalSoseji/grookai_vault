import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { assertPrintingDatabaseTarget } from "../../backend/catalog/master_index_printing_execution_guard_v1.mjs";
import { assertMasterPrintingAuthority } from "../../backend/catalog/master_index_printing_authority_v1.mjs";
import { printingManifestHash } from "../../backend/catalog/printing_completeness_gate_v1.mjs";
import { freezeMasterMappingAuthority } from "../../backend/pricing/master_index_mapping_authority_v1.mjs";
import {
  normalizeTcgplayerMappingNumberV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import {
  validateTcgplayerExactMappingCandidateForApplyV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";

export const POKEMON_TCGPLAYER_EXACT_MAPPING_AUTHORITY_V1 =
  "POKEMON_TCGPLAYER_EXACT_MAPPING_AUTHORITY_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const FINISH_BY_SUBTYPE = Object.freeze({
  Normal: "normal",
  Holofoil: "holo",
  "Reverse Holofoil": "reverse",
});
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function parseArgs(argv) {
  const options = {};
  for (const token of argv) {
    const match = /^--(review-candidates|exact-candidates|out-dir|reviewed-at|source-sync-run-id)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  for (const key of ["review-candidates", "exact-candidates", "out-dir", "reviewed-at", "source-sync-run-id"]) {
    assert.ok(options[key], `--${key} is required`);
  }
  assert.ok(Number.isFinite(Date.parse(options["reviewed-at"])), "reviewed_at_invalid");
  return {
    reviewCandidates: path.resolve(options["review-candidates"]),
    exactCandidates: path.resolve(options["exact-candidates"]),
    outDir: path.resolve(options["out-dir"]),
    reviewedAt: new Date(options["reviewed-at"]).toISOString(),
    sourceSyncRunId: options["source-sync-run-id"],
  };
}

function connectionConfig() {
  const configuredPublicUrl = process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL;
  assert.ok(configuredPublicUrl, "PROD_SUPABASE_URL_or_SUPABASE_URL_required");
  const publicUrl = new URL(configuredPublicUrl);
  assert.equal(publicUrl.hostname.split(".")[0], PROJECT_REF, "production_project_ref_mismatch");
  assert.ok(process.env.SUPABASE_DB_URL, "SUPABASE_DB_URL_required");
  const databaseUrl = assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL);
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return {
    connectionString: databaseUrl.href,
    ssl: {
      rejectUnauthorized: true,
      servername: databaseUrl.hostname,
      ...(ca ? { ca } : {}),
    },
    application_name: "pokemon-tcgplayer-exact-mapping-authority-v1",
    statement_timeout: 120_000,
    query_timeout: 125_000,
    options: "-c default_transaction_read_only=on",
  };
}

async function readJsonl(file) {
  return (await fs.readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

async function writeNew(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: "wx" });
}

function productNumber(product) {
  return String((product.extended_data ?? []).find((field) =>
    String(field?.name ?? "").trim().toLowerCase() === "number")?.value ?? "").trim();
}

async function liveSnapshot(client, candidates, sourceSyncRunId) {
  const productIds = candidates.map((row) => Number(row.source_product_id));
  const parentIds = candidates.map((row) => row.target.card_print_id);
  const observationIds = candidates.flatMap((row) => row.supporting_gap_observation_ids);
  const maturity = (await client.query(`select
    (select count(*)::integer from public.card_prints) card_prints,
    (select count(*)::integer from public.sets) sets,
    (select count(*)::integer from public.card_print_traits) card_print_traits`)).rows[0];
  assert.ok(Number(maturity.card_prints) >= 40000, "canonical_card_print_maturity_gate_failed");
  assert.ok(Number(maturity.sets) >= 150, "canonical_set_maturity_gate_failed");
  assert.ok(Number(maturity.card_print_traits) >= 5000, "canonical_trait_maturity_gate_failed");
  const sourceRun = (await client.query(`select id::text,status,sync_mode,failed_count
    from public.tcgcsv_source_sync_runs where id=$1::uuid`, [sourceSyncRunId])).rows[0];
  assert.deepEqual(sourceRun, {
    id: sourceSyncRunId,
    status: "completed",
    sync_mode: "current_full_sync",
    failed_count: 0,
  }, "source_sync_run_changed");
  const [products, parents, identities, printings, observations, mappings, publication] = await Promise.all([
    client.query(`select product_id,category_id,group_id,name,extended_data,raw_payload,payload_hash,
      last_seen_at,last_seen_run_id::text,source_active,catalog_metadata_status
      from public.tcgcsv_source_products where product_id=any($1::integer[]) order by product_id`, [productIds]),
    client.query(`select id::text,set_id::text,set_code,name,number,variant_key,gv_id,
      identity_domain,printed_identity_modifier from public.card_prints
      where id=any($1::uuid[]) order by id`, [parentIds]),
    client.query(`select id::text,card_print_id::text,identity_domain,is_active
      from public.card_print_identity where card_print_id=any($1::uuid[])
      and identity_domain='pokemon_eng_standard' and is_active order by card_print_id,id`, [parentIds]),
    client.query(`select id::text,card_print_id::text,finish_key,printing_gv_id,is_provisional,
      provenance_source,provenance_ref from public.card_printings
      where card_print_id=any($1::uuid[]) order by card_print_id,finish_key,id`, [parentIds]),
    client.query(`select id::text,product_id,subtype_name,last_seen_run_id::text
      from public.tcgcsv_source_price_daily_observations where id=any($1::uuid[]) order by id`, [observationIds]),
    client.query(`select id::text,external_id,card_print_id::text,active from public.external_mappings
      where source='tcgplayer' and active and
      (external_id=any($1::text[]) or card_print_id=any($2::uuid[])) order by external_id,id`,
    [productIds.map(String), parentIds]),
    client.query(`select distinct snapshot.source_product_id,snapshot.card_print_id::text
      from public.market_price_current_publication pointer
      join public.market_price_publication_snapshots snapshot
        on snapshot.publication_set_id=pointer.publication_set_id
      where pointer.singleton and
      (snapshot.source_product_id=any($1::integer[]) or snapshot.card_print_id=any($2::uuid[]))`,
    [productIds, parentIds]),
  ]);
  const catalogSourceRunIds = [...new Set(products.rows.map((row) => row.last_seen_run_id))].sort();
  const catalogSourceRuns = (await client.query(`select id::text,status,sync_mode,failed_count
    from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id`,
  [catalogSourceRunIds])).rows;
  return {
    maturity,
    sourceRun,
    products: products.rows,
    parents: parents.rows,
    identities: identities.rows,
    printings: printings.rows,
    observations: observations.rows,
    mappings: mappings.rows,
    publication: publication.rows,
    catalogSourceRuns,
  };
}

async function masterSource(setCode, kind) {
  const relative = `docs/audits/english_master_index_publishable_v1/sets/${setCode}/${kind}.json`;
  const bytes = await fs.readFile(path.join(ROOT, relative));
  return { relative, bytes, value: JSON.parse(bytes.toString("utf8")) };
}

function exactFinish(candidate) {
  assert.equal(candidate.source_subtypes.length, 1,
    `source_finish_not_unique:${candidate.source_product_id}`);
  const finish = FINISH_BY_SUBTYPE[candidate.source_subtypes[0]];
  assert.ok(finish, `source_finish_not_supported:${candidate.source_product_id}`);
  return finish;
}

export function assertCandidateLive(candidate, live) {
  const product = live.products.find((row) => Number(row.product_id) === Number(candidate.source_product_id));
  const parent = live.parents.find((row) => row.id === candidate.target.card_print_id);
  assert.ok(product && parent, `live_identity_missing:${candidate.source_product_id}`);
  assert.equal(product.category_id, 3, `source_category_changed:${candidate.source_product_id}`);
  assert.equal(product.group_id, candidate.source_group_id, `source_group_changed:${candidate.source_product_id}`);
  assert.equal(product.name, candidate.source_product_name, `source_name_changed:${candidate.source_product_id}`);
  assert.equal(productNumber(product), candidate.printed_number, `source_number_changed:${candidate.source_product_id}`);
  const catalogSourceRun = live.catalogSourceRuns.find((row) => row.id === product.last_seen_run_id);
  assert.ok(catalogSourceRun && catalogSourceRun.status === "completed" &&
    catalogSourceRun.sync_mode === "current_full_sync" && Number(catalogSourceRun.failed_count) === 0,
    `catalog_source_run_not_completed:${candidate.source_product_id}`);
  assert.equal(product.source_active, true, `source_inactive:${candidate.source_product_id}`);
  assert.equal(product.catalog_metadata_status, "current", `source_not_current:${candidate.source_product_id}`);
  assert.equal(parent.set_id, candidate.target.set_id, `target_set_changed:${candidate.source_product_id}`);
  assert.equal(parent.set_code, candidate.target.set_code, `target_set_code_changed:${candidate.source_product_id}`);
  assert.equal(parent.name, candidate.target.canonical_name, `target_name_changed:${candidate.source_product_id}`);
  assert.equal(String(parent.number), candidate.target.canonical_number, `target_number_changed:${candidate.source_product_id}`);
  assert.equal(parent.gv_id, candidate.target.gv_id, `target_gv_id_changed:${candidate.source_product_id}`);
  assert.equal(parent.variant_key ?? "", candidate.target.variant_key, `target_variant_changed:${candidate.source_product_id}`);
  assert.equal(parent.identity_domain, "pokemon_eng_standard", `target_domain_changed:${candidate.source_product_id}`);
  assert.equal(live.identities.filter((row) => row.card_print_id === parent.id).length, 1,
    `active_standard_identity_count_changed:${candidate.source_product_id}`);
  const finish = exactFinish(candidate);
  const children = live.printings.filter((row) => row.card_print_id === parent.id &&
    row.finish_key === finish && row.is_provisional === false && row.printing_gv_id);
  assert.equal(children.length, 1, `verified_printing_not_unique:${candidate.source_product_id}:${finish}`);
  for (const observationId of candidate.supporting_gap_observation_ids) {
    const observation = live.observations.find((row) => row.id === observationId);
    assert.ok(observation, `source_observation_missing:${observationId}`);
    assert.equal(Number(observation.product_id), Number(candidate.source_product_id),
      `source_observation_product_changed:${observationId}`);
    assert.equal(observation.last_seen_run_id, live.sourceRun.id,
      `source_observation_run_changed:${observationId}`);
    assert.equal(FINISH_BY_SUBTYPE[observation.subtype_name], finish,
      `source_observation_finish_changed:${observationId}`);
  }
  return { product, parent, printing: children[0], finish };
}

async function scopeForSet(candidates, live, reviewedAt) {
  const setCode = candidates[0].target.set_code;
  const setId = candidates[0].target.set_id;
  assert.ok(candidates.every((row) => row.target.set_code === setCode && row.target.set_id === setId),
    `mixed_set_scope:${setCode}`);
  const [cardsSource, printingsSource] = await Promise.all([
    masterSource(setCode, "cards"),
    masterSource(setCode, "printings"),
  ]);
  const liveRows = candidates.map((candidate) => ({
    candidate,
    ...assertCandidateLive(candidate, live),
  }));
  const masterCards = [];
  const masterPrintings = [];
  for (const row of liveRows) {
    const cards = cardsSource.value.cards.filter((entry) => entry.set_key === setCode &&
      normalizeTcgplayerMappingNumberV1(entry.card_number) ===
        normalizeTcgplayerMappingNumberV1(row.candidate.target.canonical_number) &&
      entry.card_name === row.candidate.target.canonical_name && entry.status === "master_verified");
    const printings = printingsSource.value.printings.filter((entry) => entry.set_key === setCode &&
      normalizeTcgplayerMappingNumberV1(entry.card_number) ===
        normalizeTcgplayerMappingNumberV1(row.candidate.target.canonical_number) &&
      entry.card_name === row.candidate.target.canonical_name && entry.finish_key === row.finish &&
      entry.status === "master_verified");
    assert.equal(cards.length, 1, `master_card_evidence_changed:${row.candidate.source_product_id}`);
    assert.equal(printings.length, 1, `master_printing_evidence_changed:${row.candidate.source_product_id}`);
    masterCards.push(cards[0]);
    masterPrintings.push(printings[0]);
  }
  const masterRef = `${setCode}-pricing-completion-exact-mapping-projection-v1`;
  const masterBytes = jsonBytes({
    version: "POKEMON_TCGPLAYER_EXACT_MAPPING_MASTER_INDEX_PROJECTION_V1",
    set_id: setId,
    set_code: setCode,
    source_sha256: { cards: sha256(cardsSource.bytes), printings: sha256(printingsSource.bytes) },
    cards: masterCards,
    printings: masterPrintings,
  });
  const cardsRef = `${setCode}-english-master-index-cards-v1`;
  const printingsRef = `${setCode}-english-master-index-printings-v1`;
  const artifacts = new Map([
    [masterRef, masterBytes],
    [cardsRef, cardsSource.bytes],
    [printingsRef, printingsSource.bytes],
  ]);
  const sourceArtifacts = [
    { ref: masterRef, sha256: sha256(masterBytes), kind: "exact_printing_mapping",
      url_or_identifier: `derived:${masterRef}`, retrieved_at: reviewedAt },
    { ref: cardsRef, sha256: sha256(cardsSource.bytes), kind: "official_printing",
      url_or_identifier: cardsSource.relative, retrieved_at: reviewedAt },
    { ref: printingsRef, sha256: sha256(printingsSource.bytes), kind: "official_printing",
      url_or_identifier: printingsSource.relative, retrieved_at: reviewedAt },
  ];
  const assertions = [];
  for (const row of liveRows) {
    const sourceRef = `tcgcsv-product-${row.candidate.source_product_id}-pricing-completion-snapshot-v1`;
    const sourceBytes = jsonBytes({
      version: "TCGCSV_REVIEWED_PRODUCT_MAPPING_SNAPSHOT_V1",
      source_product_id: row.candidate.source_product_id,
      source_group_id: row.candidate.source_group_id,
      source_product_name: row.candidate.source_product_name,
      printed_number: row.candidate.printed_number,
      target: row.candidate.target,
      raw_payload: row.product.raw_payload,
      payload_hash: row.product.payload_hash,
      source_sync_run_id: row.product.last_seen_run_id,
      price_source_sync_run_id: live.sourceRun.id,
      supporting_gap_observation_ids: row.candidate.supporting_gap_observation_ids,
    });
    artifacts.set(sourceRef, sourceBytes);
    sourceArtifacts.push({ ref: sourceRef, sha256: sha256(sourceBytes), kind: "exact_printing_mapping",
      url_or_identifier: `https://tcgcsv.com/tcgplayer/3/${row.candidate.source_group_id}/products`,
      retrieved_at: new Date(row.product.last_seen_at).toISOString() });
    assertions.push({ source: "tcgplayer", external_id: String(row.candidate.source_product_id),
      card_print_id: row.parent.id, candidate_fingerprint: row.candidate.candidate_fingerprint,
      source_ref: sourceRef, source_sha256: sha256(sourceBytes) });
  }
  const parents = liveRows.map((row) => ({ id: row.parent.id, name: row.parent.name,
    gv_id: row.parent.gv_id, set_id: row.parent.set_id, variant_key: row.parent.variant_key ?? "",
    identity_domain: row.parent.identity_domain, printed_coordinate: row.parent.number,
    printed_identity_modifier: row.parent.printed_identity_modifier ?? null }));
  const printings = liveRows.map((row) => ({ card_print_id: row.parent.id,
    finish_key: row.finish, printing_gv_id: row.printing.printing_gv_id, review_status: "verified",
    evidence: [{ kind: "official_printing", source_ref: printingsRef,
      sha256: sha256(printingsSource.bytes), card_print_id: row.parent.id, finish_key: row.finish }] }));
  const finishes = Object.fromEntries([...new Set(printings.map((row) => row.finish_key))]
    .sort().map((finish) => [finish, printings.filter((row) => row.finish_key === finish).length]));
  const body = {
    version: "PRINTING_COMPLETENESS_GATE_V1",
    game: "pokemon",
    language: "en",
    set_code: setCode,
    scope: "verified_parent_families",
    scope_note: "Exact pricing-completion TCGPlayer products, canonical parents, and source-listed finishes bound to checked-in English Master Index evidence.",
    identity_policy_version: "POKEMON_EN_PHYSICAL_V1",
    master_index_ref: masterRef,
    master_index_sha256: sha256(masterBytes),
    parents,
    printings,
    unresolved_variants: [],
    suppressed_printing_facts: [],
    expected: { parents: parents.length, printings: printings.length, finishes },
    authority: { version: "MASTER_INDEX_PRINTING_AUTHORITY_V1", status: "verified_scope",
      set_id: setId, source_artifacts: sourceArtifacts,
      protected_facts: printings.map((row) => ({ card_print_id: row.card_print_id, finish_key: row.finish_key })),
      forbidden_facts: [], conflicts: [] },
    external_mapping_assertions: assertions,
  };
  const reviewRef = `review:${setCode}:pricing-completion-exact-mapping-v1`;
  const reviewBytes = jsonBytes({
    status: "verified_scope",
    master_index_sha256: body.master_index_sha256,
    game: body.game,
    language: body.language,
    set_code: body.set_code,
    scope: body.scope,
    reviewer: "Automated exact-evidence packaging; founder execution approval remains required",
    reviewed_at: reviewedAt,
    projection_sha256: printingManifestHash(body),
    reasoning: [
      "The credential-free exact planner selected one unique canonical parent for each source product.",
      "The current source product is backed by a completed reconciled catalog sync, while each supporting observation remains anchored to the selected completed pricing source sync.",
      "The source product mapping coordinates, active standard identity, and non-provisional child printing remain unchanged.",
      "Checked-in English Master Index card and finish evidence agrees with the source and canonical coordinates.",
      "This evidence package does not authorize a database mutation."
    ],
    mutation_authority: false,
  });
  artifacts.set(reviewRef, reviewBytes);
  body.authority.review = { ref: reviewRef, sha256: sha256(reviewBytes) };
  const manifest = { ...body, fingerprint: printingManifestHash(body) };
  assertMasterPrintingAuthority(manifest, artifacts);
  return { manifest, artifacts };
}

function candidateMatchesReview(candidate, review) {
  const target = review?.review_targets?.[0];
  return Number(review?.source_product_id) === Number(candidate.source_product_id) &&
    review.review_targets.length === 1 &&
    review.source_product_name === candidate.source_product_name &&
    Number(review.source_group_id) === Number(candidate.source_group_id) &&
    review.source_group_name === candidate.source_group_name &&
    review.printed_number === candidate.printed_number &&
    target.card_print_id === candidate.target.card_print_id &&
    target.gv_id === candidate.target.gv_id &&
    target.set_id === candidate.target.set_id &&
    target.set_code === candidate.target.set_code &&
    target.canonical_name === candidate.target.canonical_name &&
    target.canonical_number === candidate.target.canonical_number &&
    (target.variant_key ?? "") === candidate.target.variant_key;
}

export async function buildPokemonTcgplayerExactMappingAuthorityV1(options) {
  const reviewCandidates = JSON.parse(await fs.readFile(options.reviewCandidates, "utf8"));
  const exactCandidates = await readJsonl(options.exactCandidates);
  assert.ok(Array.isArray(reviewCandidates) && reviewCandidates.length > 0,
    "review_candidates_required");
  assert.equal(exactCandidates.length, reviewCandidates.length,
    "exact_candidate_review_count_mismatch");
  for (const candidate of exactCandidates) {
    const validation = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
    assert.ok(validation.accepted,
      `exact_candidate_invalid:${candidate.source_product_id}:${validation.failures.join(",")}`);
    const review = reviewCandidates.find((row) =>
      Number(row.source_product_id) === Number(candidate.source_product_id));
    assert.ok(review && candidateMatchesReview(candidate, review),
      `exact_candidate_review_mismatch:${candidate.source_product_id}`);
  }
  const client = new pg.Client(connectionConfig());
  await client.connect();
  let live;
  try {
    if (client.connection?.stream?.authorized !== true) throw new Error("mapping_tls_not_authorized");
    await client.query("begin isolation level repeatable read read only");
    live = await liveSnapshot(client, exactCandidates, options.sourceSyncRunId);
    assert.equal(live.mappings.length, 0, "source_or_target_mapping_now_exists");
    assert.equal(live.publication.length, 0, "active_publication_overlap_now_exists");
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const groups = new Map();
  for (const candidate of exactCandidates) {
    const setId = candidate.target.set_id;
    const candidates = groups.get(setId) ?? [];
    candidates.push(candidate);
    groups.set(setId, candidates);
  }
  const scopes = [];
  for (const candidates of groups.values()) {
    scopes.push(await scopeForSet(candidates, live, options.reviewedAt));
  }
  const authority = freezeMasterMappingAuthority(exactCandidates, scopes);
  const authorityBytes = jsonBytes(authority);
  const candidateBytes = Buffer.from(`${exactCandidates.map((row) => JSON.stringify(row)).join("\n")}\n`);
  const reviewBytes = jsonBytes(reviewCandidates);
  const receipt = {
    version: POKEMON_TCGPLAYER_EXACT_MAPPING_AUTHORITY_V1,
    status: "verified_scope",
    reviewed_at: options.reviewedAt,
    source_sync_run_id: options.sourceSyncRunId,
    catalog_source_sync_run_ids: [...new Set(live.products.map((row) => row.last_seen_run_id))].sort(),
    selected_candidates_sha256: sha256(candidateBytes),
    review_candidates_sha256: sha256(reviewBytes),
    master_authority_sha256: sha256(authorityBytes),
    master_authority_fingerprint: authority.fingerprint,
    counts: { candidates: exactCandidates.length, scopes: scopes.length,
      projected_gap_rows: exactCandidates.reduce((sum, row) => sum + row.supporting_gap_row_count, 0) },
    maturity: live.maturity,
    boundaries: { database_reads: true, database_writes: false, mapping_writes: false,
      pricing_writes: false, publication_writes: false, execution_authorized: false },
  };
  await writeNew(path.join(options.outDir, "selected_candidates.jsonl"), candidateBytes);
  await writeNew(path.join(options.outDir, "review_candidates.json"), reviewBytes);
  await writeNew(path.join(options.outDir, "master_authority.json"), authorityBytes);
  await writeNew(path.join(options.outDir, "receipt.json"), jsonBytes(receipt));
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildPokemonTcgplayerExactMappingAuthorityV1(parseArgs(process.argv.slice(2)))
    .then((receipt) => process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`))
    .catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
