import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { assertPrintingDatabaseTarget } from "../../backend/catalog/master_index_printing_execution_guard_v1.mjs";
import { assertMasterPrintingAuthority } from "../../backend/catalog/master_index_printing_authority_v1.mjs";
import { printingManifestHash } from "../../backend/catalog/printing_completeness_gate_v1.mjs";
import {
  assertMasterMappingBatchAuthority,
  freezeMasterMappingAuthority,
} from "../../backend/pricing/master_index_mapping_authority_v1.mjs";
import {
  TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1,
  reviewedTcgplayerProfessorProgramProductIdentityByIdV1,
} from "../../backend/pricing/tcgplayer_professor_program_product_identity_authority_v1.mjs";
import {
  buildTcgplayerExactMappingMetaV1,
  selectTcgplayerExactMappingApplyBatchV1,
  validateTcgplayerExactMappingCandidateForApplyV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import { planTcgplayerExactMappingCandidateV1 } from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";

export const TCGPLAYER_PROFESSOR_PROGRAM_EXACT_MAPPING_GUARDED_DRY_RUN_V1 =
  "TCGPLAYER_PROFESSOR_PROGRAM_EXACT_MAPPING_GUARDED_DRY_RUN_V1";

const PACKAGE_ID = "TCGPLAYER-PROFESSOR-PROGRAM-EXACT-MAPPING-V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const READINESS_FINGERPRINT = "4033952910f53fc067974c5517e102903399e202dc6ae8bdd260bce9eee1a815";
const READINESS_PATH = "docs/audits/tcgplayer_professor_program_mapping_readiness_post_printing_apply_20261105_v1.json";
const SOURCE_SYNC_RUN_ID = "905c9e09-b658-44fe-b32c-c91fbf6bde1e";
const HELD_PRODUCT_ID = 176638;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const stableHash = (value) => printingManifestHash(value);

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim();
}

function parseArgs(argv) {
  const options = {};
  for (const token of argv) {
    const match = /^--(out-dir|reviewed-at)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  assert.ok(options["out-dir"], "--out-dir is required");
  assert.ok(Number.isFinite(Date.parse(options["reviewed-at"])), "--reviewed-at is required and must be an ISO timestamp");
  return {
    outDir: path.resolve(options["out-dir"]),
    reviewedAt: new Date(options["reviewed-at"]).toISOString(),
  };
}

function productNumber(product) {
  return String((product?.extended_data ?? []).find((field) =>
    String(field?.name ?? "").trim().toLowerCase() === "number")?.value ?? "").trim();
}

function subtypeForFinish(finishKey) {
  return finishKey === "normal" ? "Normal" : finishKey === "holo" ? "Holofoil" : "Reverse Holofoil";
}

function connectionConfig(applicationName) {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split(".")[0], PROJECT_REF, "production_project_ref_mismatch");
  assert.ok(process.env.SUPABASE_DB_URL, "SUPABASE_DB_URL_required");
  const databaseUrl = assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL);
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return {
    connectionString: databaseUrl.href,
    ssl: databaseUrl.hostname === "localhost" || databaseUrl.hostname === "127.0.0.1"
      ? false
      : ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false },
    application_name: applicationName,
    statement_timeout: 120_000,
    query_timeout: 125_000,
  };
}

function sourceFromReadiness(row) {
  const authority = reviewedTcgplayerProfessorProgramProductIdentityByIdV1(row.source_product_id);
  assert.ok(authority, `registry_row_missing:${row.source_product_id}`);
  const observation = row.latest_observations.find((candidate) =>
    candidate.subtype_name === subtypeForFinish(authority.printing.finish_key));
  assert.ok(observation, `latest_observation_missing:${row.source_product_id}`);
  return {
    source_product_id: row.source_product_id,
    source_product_name: row.source_product_name,
    source_group_id: authority.source_group_id,
    source_group_name: authority.source_group_name,
    printed_number: row.printed_number,
    has_printed_number_evidence: true,
    source_subtypes: [observation.subtype_name],
    supporting_gap_observation_ids: [observation.id],
    supporting_gap_row_count: 1,
    active_source_mapping_count: 0,
  };
}

function targetFromReadiness(row) {
  return {
    card_print_id: row.parent.id,
    gv_id: row.parent.gv_id,
    set_id: row.parent.set_id,
    set_code: row.parent.set_code,
    name: row.parent.name,
    number: row.parent.number,
    variant_key: row.parent.variant_key,
    active_standard_identity_count: Number(row.parent.active_standard_identity_count),
    active_tcgplayer_mapping_count: 0,
  };
}

function buildCandidates(readiness) {
  assert.equal(readiness.fingerprint_sha256, READINESS_FINGERPRINT, "readiness_fingerprint_changed");
  assert.equal(readiness.source_sync_run_id, SOURCE_SYNC_RUN_ID, "source_sync_run_changed");
  assert.equal(readiness.counts?.ready, 7, "readiness_count_changed");
  assert.equal(readiness.counts?.blocked, 0, "readiness_has_blocked_rows");
  assert.equal(readiness.held_row?.source_product_id, HELD_PRODUCT_ID, "held_product_changed");
  assert.equal(readiness.held_row?.status, "held_finish_conflict_confirmed", "held_product_state_changed");
  assert.equal(readiness.rows.length, 7, "ready_rows_changed");
  const candidates = readiness.rows.map((row) => {
    assert.equal(row.status, "ready_for_authority_package", `row_not_ready:${row.source_product_id}`);
    const candidate = planTcgplayerExactMappingCandidateV1({
      source: sourceFromReadiness(row),
      setTargets: [targetFromReadiness(row)],
    });
    assert.equal(candidate.disposition, "candidate", `candidate_blocked:${row.source_product_id}:${candidate.reason ?? "unknown"}`);
    const validation = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
    assert.ok(validation.accepted, `candidate_invalid:${row.source_product_id}:${validation.failures.join(",")}`);
    return candidate;
  });
  assert.deepEqual(candidates.map((row) => Number(row.source_product_id)).sort((a, b) => a - b),
    TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1.map((row) => row.source_product_id).sort((a, b) => a - b),
    "candidate_registry_scope_changed");
  return candidates;
}

function buildScope(candidate, readinessRow, reviewedAt) {
  const authority = reviewedTcgplayerProfessorProgramProductIdentityByIdV1(candidate.source_product_id);
  const sourceRef = `professor-program-product-${candidate.source_product_id}-reviewed-evidence-v1`;
  const masterRef = `${candidate.target.set_code}-professor-program-mapping-projection-v1`;
  const sourceBytes = jsonBytes({
    version: "TCGPLAYER_PROFESSOR_PROGRAM_REVIEWED_MAPPING_EVIDENCE_V1",
    readiness_fingerprint: READINESS_FINGERPRINT,
    source_sync_run_id: SOURCE_SYNC_RUN_ID,
    source_product: readinessRow.product,
    latest_observations: readinessRow.latest_observations,
    target_parent: readinessRow.parent,
    target_child: readinessRow.child,
    existing_mappings: readinessRow.existing_mappings,
    active_publication_overlap: readinessRow.active_publication_overlap,
    candidate_fingerprint: candidate.candidate_fingerprint,
  });
  const masterBytes = jsonBytes({
    version: "TCGPLAYER_PROFESSOR_PROGRAM_MASTER_INDEX_PROJECTION_V1",
    readiness_fingerprint: READINESS_FINGERPRINT,
    source_product_id: candidate.source_product_id,
    target: authority.target,
    printing: authority.printing,
  });
  const artifacts = new Map([[sourceRef, sourceBytes], [masterRef, masterBytes]]);
  const parent = {
    id: readinessRow.parent.id,
    name: readinessRow.parent.name,
    gv_id: readinessRow.parent.gv_id,
    set_id: readinessRow.parent.set_id,
    variant_key: readinessRow.parent.variant_key,
    identity_domain: readinessRow.parent.identity_domain,
    printed_coordinate: readinessRow.parent.number,
    printed_identity_modifier: readinessRow.parent.printed_identity_modifier,
  };
  const printing = {
    card_print_id: readinessRow.child.card_print_id,
    finish_key: readinessRow.child.finish_key,
    printing_gv_id: readinessRow.child.printing_gv_id,
    review_status: "verified",
    evidence: [{ kind: "exact_printing_mapping", source_ref: sourceRef, sha256: sha256(sourceBytes),
      card_print_id: readinessRow.child.card_print_id, finish_key: readinessRow.child.finish_key }],
  };
  const body = {
    version: "PRINTING_COMPLETENESS_GATE_V1",
    game: "pokemon",
    language: "en",
    set_code: candidate.target.set_code,
    scope: "verified_parent_families",
    scope_note: `Exact Professor Program stamped parent and verified ${printing.finish_key} printing for TCGPlayer product ${candidate.source_product_id}.`,
    identity_policy_version: "POKEMON_EN_PHYSICAL_V1",
    master_index_ref: masterRef,
    master_index_sha256: sha256(masterBytes),
    parents: [parent],
    printings: [printing],
    unresolved_variants: [],
    suppressed_printing_facts: [],
    expected: { parents: 1, printings: 1, finishes: { [printing.finish_key]: 1 } },
    authority: {
      version: "MASTER_INDEX_PRINTING_AUTHORITY_V1",
      status: "verified_scope",
      set_id: candidate.target.set_id,
      source_artifacts: [
        { ref: masterRef, sha256: sha256(masterBytes), kind: "exact_printing_mapping",
          url_or_identifier: `derived:${masterRef}`, retrieved_at: reviewedAt },
        { ref: sourceRef, sha256: sha256(sourceBytes), kind: "exact_printing_mapping",
          url_or_identifier: READINESS_PATH, retrieved_at: readinessRow.product.last_seen_at },
      ],
      protected_facts: [{ card_print_id: printing.card_print_id, finish_key: printing.finish_key }],
      forbidden_facts: [],
      conflicts: [],
    },
    external_mapping_assertions: [{
      source: "tcgplayer",
      external_id: String(candidate.source_product_id),
      card_print_id: candidate.target.card_print_id,
      candidate_fingerprint: candidate.candidate_fingerprint,
      source_ref: sourceRef,
      source_sha256: sha256(sourceBytes),
    }],
  };
  const reviewRef = `review:${candidate.target.set_code}:professor-program-${candidate.source_product_id}`;
  const reviewBytes = jsonBytes({
    status: "verified_scope",
    master_index_sha256: body.master_index_sha256,
    game: body.game,
    language: body.language,
    set_code: body.set_code,
    scope: body.scope,
    reviewer: "Codex source adjudication; not founder mutation approval",
    reviewed_at: reviewedAt,
    projection_sha256: printingManifestHash(body),
    reasoning: [
      "The frozen product-specific registry binds the exact TCGPlayer product to one Professor Program stamped parent.",
      "The live readiness audit proves one active English physical identity and one verified visible child matching the source finish.",
      "No source or target mapping history and no active publication overlap exist for this product.",
      "Professor Sycamore product 176638 remains excluded because its required Reverse child conflicts with the existing Holo child.",
      "This evidence review does not authorize a durable database mutation.",
    ],
    mutation_authority: false,
  });
  artifacts.set(reviewRef, reviewBytes);
  body.authority.review = { ref: reviewRef, sha256: sha256(reviewBytes) };
  const manifest = { ...body, fingerprint: printingManifestHash(body) };
  assertMasterPrintingAuthority(manifest, artifacts);
  return { manifest, artifacts };
}

async function loadLiveState(client, candidates) {
  const productIds = candidates.map((row) => Number(row.source_product_id));
  const targetIds = candidates.map((row) => row.target.card_print_id);
  const observationIds = candidates.flatMap((row) => row.supporting_gap_observation_ids);
  const maturity = (await client.query(`select
    (select count(*)::integer from public.card_prints) card_prints,
    (select count(*)::integer from public.sets) sets,
    (select count(*)::integer from public.card_print_traits) card_print_traits`)).rows[0];
  assert.ok(Number(maturity.card_prints) >= 40000, "canonical_card_print_maturity_gate_failed");
  assert.ok(Number(maturity.sets) >= 150, "canonical_set_maturity_gate_failed");
  assert.ok(Number(maturity.card_print_traits) >= 5000, "canonical_trait_maturity_gate_failed");
  const sourceRun = (await client.query(`select id::text,status,sync_mode,failed_count from public.tcgcsv_source_sync_runs where id=$1::uuid`, [SOURCE_SYNC_RUN_ID])).rows[0];
  assert.deepEqual(sourceRun, { id: SOURCE_SYNC_RUN_ID, status: "completed", sync_mode: "current_full_sync", failed_count: 0 }, "source_sync_run_changed");
  const products = (await client.query(`select product_id,category_id,group_id,name,extended_data,payload_hash,
    last_seen_run_id::text,source_active,catalog_metadata_status from public.tcgcsv_source_products
    where product_id=any($1::integer[]) order by product_id`, [productIds])).rows;
  const targets = (await client.query(`select c.id::text card_print_id,c.gv_id,c.set_id::text,c.set_code,
    c.name,c.number,c.variant_key,c.identity_domain,c.printed_identity_modifier,
    count(distinct i.id) filter(where i.is_active and i.identity_domain='pokemon_eng_standard')::integer active_standard_identity_count,
    count(distinct m.id) filter(where m.source='tcgplayer' and m.active)::integer active_tcgplayer_mapping_count
    from public.card_prints c left join public.card_print_identity i on i.card_print_id=c.id
    left join public.external_mappings m on m.card_print_id=c.id where c.id=any($1::uuid[])
    group by c.id order by c.id`, [targetIds])).rows.map((row) => ({
      card_print_id: row.card_print_id,
      parent_snapshot: { id: row.card_print_id, name: row.name, gv_id: row.gv_id, set_id: row.set_id,
        variant_key: row.variant_key, identity_domain: row.identity_domain, printed_coordinate: row.number,
        printed_identity_modifier: row.printed_identity_modifier, number: row.number },
      ...row,
    }));
  const observations = (await client.query(`select id::text,product_id,subtype_name,last_seen_run_id::text
    from public.tcgcsv_source_price_daily_observations where id=any($1::uuid[]) order by id`, [observationIds])).rows;
  const mappings = (await client.query(`select id::text,card_print_id::text,source,external_id,meta,active,synced_at
    from public.external_mappings where source='tcgplayer' and
    (external_id=any($1::text[]) or card_print_id=any($2::uuid[])) order by external_id,id`,
  [productIds.map(String), targetIds])).rows;
  const publication = (await client.query(`select distinct snapshot.source_product_id,snapshot.card_print_id::text
    from public.market_price_current_publication pointer join public.market_price_publication_snapshots snapshot
      on snapshot.publication_set_id=pointer.publication_set_id
    where pointer.singleton and (snapshot.source_product_id=any($1::integer[]) or snapshot.card_print_id=any($2::uuid[]))`,
  [productIds, targetIds])).rows;
  return { maturity, sourceRun, products, targets, observations, mappings, publication };
}

function assertLiveState(candidates, live, authorityBundle) {
  assert.equal(live.products.length, candidates.length, "live_product_count_changed");
  assert.equal(live.targets.length, candidates.length, "live_target_count_changed");
  assert.equal(live.observations.length, candidates.length, "live_observation_count_changed");
  assert.equal(live.mappings.length, 0, "mapping_history_now_exists");
  assert.equal(live.publication.length, 0, "active_publication_overlap_now_exists");
  for (const candidate of candidates) {
    const product = live.products.find((row) => Number(row.product_id) === Number(candidate.source_product_id));
    const target = live.targets.find((row) => row.card_print_id === candidate.target.card_print_id);
    assert.ok(product && target, `live_row_missing:${candidate.source_product_id}`);
    assert.equal(product.category_id, 3);
    assert.equal(product.group_id, candidate.source_group_id);
    assert.equal(product.name, candidate.source_product_name);
    assert.equal(productNumber(product), candidate.printed_number);
    assert.equal(product.last_seen_run_id, SOURCE_SYNC_RUN_ID);
    assert.equal(product.source_active, true);
    assert.equal(product.catalog_metadata_status, "current");
    assert.equal(target.gv_id, candidate.target.gv_id);
    assert.equal(target.set_id, candidate.target.set_id);
    assert.equal(target.set_code, candidate.target.set_code);
    assert.equal(target.name, candidate.target.canonical_name);
    assert.equal(target.number, candidate.target.canonical_number);
    assert.equal(target.variant_key, candidate.target.variant_key);
    assert.equal(target.identity_domain, "pokemon_eng_standard");
    assert.equal(target.printed_identity_modifier, "professor_program_stamp");
    assert.equal(Number(target.active_standard_identity_count), 1);
    assert.equal(Number(target.active_tcgplayer_mapping_count), 0);
    for (const id of candidate.supporting_gap_observation_ids) {
      const observation = live.observations.find((row) => row.id === id);
      assert.ok(observation, `observation_missing:${id}`);
      assert.equal(Number(observation.product_id), Number(candidate.source_product_id));
      assert.equal(observation.last_seen_run_id, SOURCE_SYNC_RUN_ID);
    }
  }
  return assertMasterMappingBatchAuthority(candidates, authorityBundle, { liveTargets: live.targets });
}

function snapshotMappings(rows) {
  const normalized = rows.map((row) => ({ id: row.id, card_print_id: row.card_print_id, source: row.source,
    external_id: row.external_id, meta: row.meta, active: row.active,
    synced_at: row.synced_at ? new Date(row.synced_at).toISOString() : null }));
  return { rows: normalized, hash_sha256: stableHash(normalized) };
}

async function independentMappingSnapshot(candidates) {
  const client = new pg.Client(connectionConfig("tcgplayer_professor_program_mapping_independent_readback_v1"));
  await client.connect();
  try {
    const live = await loadLiveState(client, candidates);
    return snapshotMappings(live.mappings);
  } finally { await client.end(); }
}

async function rehearsal(candidates, selection, authorityBundle, packageContext) {
  const before = await independentMappingSnapshot(candidates);
  assert.equal(before.rows.length, 0, "pre_rehearsal_mapping_history_exists");
  const client = new pg.Client(connectionConfig("tcgplayer_professor_program_mapping_rollback_rehearsal_v1"));
  let inserted = [];
  await client.connect();
  try {
    await client.query("begin transaction isolation level serializable");
    await client.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))");
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.deepEqual(server, { database: "postgres", username: "postgres", read_only: "off" });
    const live = await loadLiveState(client, candidates);
    const authorityProof = assertLiveState(candidates, live, authorityBundle);
    const context = { ...packageContext, batch_fingerprint: selection.batch_fingerprint,
      maintenance_run_id: randomUUID(), master_authority_fingerprint: authorityProof.fingerprint,
      master_authority_bindings: authorityProof.bindings };
    const payload = candidates.map((candidate) => ({ card_print_id: candidate.target.card_print_id,
      external_id: String(candidate.source_product_id), meta: buildTcgplayerExactMappingMetaV1(candidate, context) }));
    inserted = (await client.query(`insert into public.external_mappings
      (card_print_id,source,external_id,meta,active,synced_at)
      select item.card_print_id,'tcgplayer',item.external_id,item.meta,true,now()
      from jsonb_to_recordset($1::jsonb) as item(card_print_id uuid,external_id text,meta jsonb)
      order by item.external_id::integer
      returning id::text,card_print_id::text,source,external_id,meta,synced_at,active`, [JSON.stringify(payload)])).rows;
    assert.equal(inserted.length, candidates.length, "transient_insert_count_mismatch");
    const liveAfterInsert = await loadLiveState(client, candidates);
    assert.equal(liveAfterInsert.mappings.length, candidates.length, "transient_readback_count_mismatch");
    assertMasterMappingBatchAuthority(candidates, authorityBundle, { liveTargets: liveAfterInsert.targets.map((row) => ({
      ...row, active_tcgplayer_mapping_count: 0,
    })) });
    for (const candidate of candidates) {
      const row = liveAfterInsert.mappings.find((mapping) => mapping.external_id === String(candidate.source_product_id));
      assert.ok(row && row.card_print_id === candidate.target.card_print_id && row.active === true,
        `transient_mapping_readback_mismatch:${candidate.source_product_id}`);
      assert.equal(row.meta.candidate_fingerprint, candidate.candidate_fingerprint);
      assert.equal(row.meta.batch_fingerprint, selection.batch_fingerprint);
      assert.equal(row.meta.master_authority_fingerprint, authorityBundle.fingerprint);
    }
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally { await client.end(); }
  const after = await independentMappingSnapshot(candidates);
  assert.deepEqual(after, before, "rollback_did_not_restore_mapping_snapshot");
  return { status: "rollback_proof_passed_zero_durable_changes", transient_mapping_inserts: inserted.length,
    rollback_acknowledged: true, before_snapshot: before, after_rollback_snapshot: after };
}

async function writeExclusive(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: "wx" });
}

export async function buildProfessorProgramExactMappingGuardedDryRunV1(argv) {
  const options = parseArgs(argv);
  assert.equal(git(["status", "--porcelain", "--untracked-files=no"]), "", "tracked_worktree_must_be_clean");
  const sourceCommit = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const readinessBytes = await fs.readFile(path.join(ROOT, READINESS_PATH));
  const readiness = JSON.parse(readinessBytes.toString("utf8"));
  const candidates = buildCandidates(readiness);
  const selection = selectTcgplayerExactMappingApplyBatchV1(candidates, { limit: candidates.length });
  const scopes = candidates.map((candidate) => buildScope(candidate,
    readiness.rows.find((row) => Number(row.source_product_id) === Number(candidate.source_product_id)),
    options.reviewedAt));
  const authorityBundle = freezeMasterMappingAuthority(candidates, scopes);
  const authorityBytes = jsonBytes(authorityBundle);
  const candidateBytes = Buffer.from(`${candidates.map((row) => JSON.stringify(row)).join("\n")}\n`);
  const planDir = path.join(options.outDir, "plan");
  const packageDir = path.join(options.outDir, "package");
  const candidateRelativePath = path.relative(ROOT, path.join(planDir, "candidates.jsonl")).replaceAll("\\", "/");
  const summary = { version: TCGPLAYER_PROFESSOR_PROGRAM_EXACT_MAPPING_GUARDED_DRY_RUN_V1,
    status: "passed", counts: { candidates: candidates.length, blocked: 0, held: 1, projected_gap_rows: 7 },
    batch: { index: 1, total: 1, offset: 0, size: candidates.length }, database_writes: 0 };
  const runPlan = { version: "TCGPLAYER_MARKET_EXACT_MAPPING_RUN_PLAN_V1", mode: "read_only_dry_run",
    commit_sha: sourceCommit, branch, tracked_worktree_clean: true, source_sync_run_id: SOURCE_SYNC_RUN_ID,
    database_target: { kind: "production_project", project_ref: PROJECT_REF }, batch: summary.batch };
  const packageBody = { package_id: PACKAGE_ID, source_commit: sourceCommit,
    readiness_fingerprint: READINESS_FINGERPRINT, source_sync_run_id: SOURCE_SYNC_RUN_ID,
    candidate_count: candidates.length, source_product_ids: candidates.map((row) => row.source_product_id),
    candidate_artifact_sha256: sha256(candidateBytes), master_authority_file_sha256: sha256(authorityBytes),
    master_authority_fingerprint: authorityBundle.fingerprint, batch_fingerprint: selection.batch_fingerprint,
    held_product_ids: [HELD_PRODUCT_ID], boundaries: { mapping_inserts: 7, pricing_writes: 0,
      publication_writes: 0, parent_writes: 0, printing_writes: 0, identity_writes: 0,
      deletes: 0, merges: 0, migrations: 0 } };
  const packageFingerprint = stableHash(packageBody);
  const proof = await rehearsal(candidates, selection, authorityBundle, {
    source_sync_run_id: SOURCE_SYNC_RUN_ID,
    candidate_artifact_sha256: sha256(candidateBytes),
    candidate_artifact_path: candidateRelativePath,
    candidate_plan_commit_sha: sourceCommit,
    producing_commit_sha: sourceCommit,
  });
  const approvalText = `Approve real ${PACKAGE_ID} apply only. Source commit: ${sourceCommit}. Fingerprint: ${packageFingerprint}. Scope: 7 insert-only active TCGPlayer parent mappings for Professor Program products ${candidates.map((row) => row.source_product_id).join(", ")}. Dry-run rollback proof: ${proof.before_snapshot.hash_sha256} == ${proof.after_rollback_snapshot.hash_sha256}. Excludes Professor Sycamore product ${HELD_PRODUCT_ID}. No pricing writes. No publication writes. No parent, identity, or printing writes. No deletes. No merges. No migrations.`;
  const receipt = { ...packageBody, package_fingerprint_sha256: packageFingerprint,
    reviewed_at: options.reviewedAt, proof, approval_text_required: approvalText,
    execution: { status: "guarded_dry_run_complete", durable_database_writes: 0,
      execution_authorized: false, next_gate: "separate_exact_founder_approval" } };
  await writeExclusive(path.join(planDir, "candidates.jsonl"), candidateBytes);
  await writeExclusive(path.join(planDir, "summary.json"), jsonBytes(summary));
  await writeExclusive(path.join(planDir, "run_plan.json"), jsonBytes(runPlan));
  await writeExclusive(path.join(packageDir, "master_authority.json"), authorityBytes);
  await writeExclusive(path.join(packageDir, "selected_candidates.jsonl"), candidateBytes);
  await writeExclusive(path.join(packageDir, "receipt.json"), jsonBytes({ version: "MASTER_INDEX_MAPPING_PACKAGE_RECEIPT_V1",
    authority_fingerprint: authorityBundle.fingerprint, authority_file_sha256: sha256(authorityBytes),
    selected_file_sha256: sha256(candidateBytes), selected_count: candidates.length, scope_count: scopes.length,
    execution_authorized: false, database_writes: 0 }));
  await writeExclusive(path.join(options.outDir, "guarded_dry_run.json"), jsonBytes(receipt));
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildProfessorProgramExactMappingGuardedDryRunV1(process.argv.slice(2))
    .then((receipt) => console.log(JSON.stringify(receipt, null, 2)))
    .catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
