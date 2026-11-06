import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { assertPrintingDatabaseTarget } from "../../backend/catalog/master_index_printing_execution_guard_v1.mjs";

const VERSION = "TCGPLAYER_PROFESSOR_PROGRAM_PRINTING_READINESS_GUARDED_DRY_RUN_V1";
const PACKAGE_ID = "TCGPLAYER-PROFESSOR-PROGRAM-PRINTING-READINESS-REPAIR-V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const CATALOG_FINGERPRINT = "1203f252f7856cff512d85ff7d76eb45a9cf18e528166b53b519fb34a7c78820";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const READINESS = "docs/audits/tcgplayer_professor_program_mapping_readiness_20261105_v1.json";
const CATALOG = "docs/audits/tcgplayer_professor_program_catalog_repair_real_apply_20261105_v1.json";
const JUDGE_EVIDENCE = "docs/audits/tcgplayer_professor_program_parent_insert_readiness_20261031_v1.json";
const SUFFIX = Object.freeze({ normal: "STD", holo: "HOLO", reverse: "RH" });
const EXPECTED_PRODUCTS = Object.freeze([176629, 176630, 176631, 176632, 176633, 213516, 499366]);
const GVID_REPAIRS = new Set([176629, 176631, 499366]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function deterministicUuid(seed) {
  const chars = sha256(seed).slice(0, 32).split("");
  chars[12] = "5"; chars[16] = "8";
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
async function readArtifact(relative) {
  const bytes = await fs.readFile(path.join(ROOT, relative));
  return { relative, bytes, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
}

function buildTargets(readiness, catalog, judgeEvidence) {
  assert.equal(catalog.value.package_fingerprint_sha256, CATALOG_FINGERPRINT);
  assert.equal(catalog.value.execution?.status, "applied_and_verified");
  const catalogByProduct = new Map(catalog.value.targets.map((row) => [Number(row.source_product_id), row]));
  const judge = judgeEvidence.value.rows.find((row) => Number(row.source_product_id) === 213516);
  assert.ok(judge, "judge_evidence_missing");
  const rows = readiness.value.rows.map((row) => {
    const id = Number(row.source_product_id);
    const evidence = id === 213516 ? judge.evidence : catalogByProduct.get(id)?.evidence_payload?.evidence;
    assert.ok(evidence, `product_evidence_missing:${id}`);
    const expectedGvId = `${row.parent.gv_id}-${SUFFIX[row.finish_key]}`;
    const expectedFailures = GVID_REPAIRS.has(id)
      ? ["target_child_printing_gv_id_missing_or_changed", "target_child_truth_review_not_visible_verified"]
      : ["target_child_truth_review_not_visible_verified"];
    assert.deepEqual(row.failures, expectedFailures, `readiness_failure_scope_changed:${id}`);
    return {
      source_product_id: id,
      source_product_name: row.source_product_name,
      card_print_id: row.target_parent_id,
      printing_id: row.target_child_id,
      finish_key: row.finish_key,
      current_printing_gv_id: row.child.printing_gv_id,
      expected_printing_gv_id: expectedGvId,
      repair_printing_gv_id: GVID_REPAIRS.has(id),
      review_id: deterministicUuid(`${PACKAGE_ID}:${row.target_child_id}`),
      evidence,
    };
  }).sort((a, b) => a.source_product_id - b.source_product_id);
  assert.deepEqual(rows.map((row) => row.source_product_id), [...EXPECTED_PRODUCTS]);
  assert.equal(rows.filter((row) => row.repair_printing_gv_id).length, 3);
  return rows;
}

async function snapshot(client, targets) {
  const printingIds = targets.map((row) => row.printing_id);
  const reviewIds = targets.map((row) => row.review_id);
  const printings = (await client.query(`select id::text,card_print_id::text,finish_key,printing_gv_id,
    is_provisional,provenance_source,provenance_ref from public.card_printings
    where id=any($1::uuid[]) order by id`, [printingIds])).rows;
  const reviews = (await client.query(`select id::text,card_printing_id::text,review_status,
    public_visibility,active,reason,confidence,expected_finish_keys,evidence,reviewed_by,reviewed_at
    from public.card_printing_truth_reviews
    where card_printing_id=any($1::uuid[]) or id=any($2::uuid[])
    order by card_printing_id,id`, [printingIds, reviewIds])).rows;
  const stable = { printings, reviews };
  return { captured_at: new Date().toISOString(), ...stable,
    hash_sha256: sha256(stableJson(stable)) };
}

function assertPreconditions(snapshotValue, targets) {
  assert.equal(snapshotValue.printings.length, targets.length, "printing_count_changed");
  assert.equal(snapshotValue.reviews.length, 0, "truth_review_now_exists_or_review_id_collision");
  for (const target of targets) {
    const row = snapshotValue.printings.find((printing) => printing.id === target.printing_id);
    assert.ok(row, `printing_missing:${target.source_product_id}`);
    assert.equal(row.card_print_id, target.card_print_id);
    assert.equal(row.finish_key, target.finish_key);
    assert.equal(row.is_provisional, false);
    assert.equal(row.printing_gv_id, target.current_printing_gv_id);
    if (target.repair_printing_gv_id) assert.equal(row.printing_gv_id, null);
    else assert.equal(row.printing_gv_id, target.expected_printing_gv_id);
  }
}

async function activeMappingAndPublicationGuard(client, targets) {
  const productIds = targets.map((row) => row.source_product_id);
  const parentIds = targets.map((row) => row.card_print_id);
  const mappingCount = Number((await client.query(`select count(*)::integer count from public.external_mappings
    where source='tcgplayer' and active and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))`,
  [productIds.map(String), parentIds])).rows[0].count);
  const publicationCount = Number((await client.query(`select count(*)::integer count
    from public.market_price_current_publication pointer
    join public.market_price_publication_snapshots snapshot on snapshot.publication_set_id=pointer.publication_set_id
    where pointer.singleton and (snapshot.source_product_id=any($1::integer[]) or snapshot.card_print_id=any($2::uuid[]))`,
  [productIds, parentIds])).rows[0].count);
  assert.equal(mappingCount, 0, "active_mapping_collision");
  assert.equal(publicationCount, 0, "active_publication_overlap");
  return { active_mapping_count: mappingCount, active_publication_overlap_count: publicationCount };
}

async function run() {
  const [readiness, catalog, judgeEvidence] = await Promise.all([
    readArtifact(READINESS), readArtifact(CATALOG), readArtifact(JUDGE_EVIDENCE),
  ]);
  const targets = buildTargets(readiness, catalog, judgeEvidence);
  const authority = {
    package_id: PACKAGE_ID,
    source_artifacts: [readiness, catalog, judgeEvidence].map((row) => ({ path: row.relative, sha256: row.sha256 })),
    catalog_package_fingerprint: CATALOG_FINGERPRINT,
    targets: targets.map(({ evidence, ...row }) => ({ ...row, evidence_sha256: sha256(stableJson(evidence)) })),
    boundaries: { printing_gv_id_updates: 3, truth_review_inserts: 7, mapping_writes: 0,
      pricing_writes: 0, publication_writes: 0, deletes: 0, merges: 0, migrations: 0 },
  };
  const packageFingerprint = sha256(stableJson(authority));
  const publicUrl = new URL(process.env.SUPABASE_URL ?? "");
  assert.equal(publicUrl.hostname, `${PROJECT_REF}.supabase.co`, "production_project_ref_mismatch");
  assert.ok(process.env.SUPABASE_DB_URL, "SUPABASE_DB_URL_required");
  const databaseUrl = assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL);
  const client = new pg.Client({ connectionString: databaseUrl.href,
    ssl: databaseUrl.hostname === "localhost" || databaseUrl.hostname === "127.0.0.1"
      ? false : { rejectUnauthorized: false },
    application_name: "professor_program_printing_readiness_guarded_dry_run_v1",
    statement_timeout: 120_000, query_timeout: 125_000 });
  await client.connect();
  let before;
  let transient;
  let guard;
  let updateCount = 0;
  let insertCount = 0;
  try {
    const server = (await client.query(`select current_database() database,current_user username`)).rows[0];
    assert.deepEqual(server, { database: "postgres", username: "postgres" });
    before = await snapshot(client, targets);
    assertPreconditions(before, targets);
    guard = await activeMappingAndPublicationGuard(client, targets);
    await client.query("begin isolation level serializable");
    await client.query("select pg_advisory_xact_lock(hashtext('tcgplayer_professor_program_printing_readiness_repair_v1'))");
    await client.query("set local lock_timeout='5s'");
    const updates = targets.filter((row) => row.repair_printing_gv_id);
    const updateResult = await client.query(`update public.card_printings p set printing_gv_id=item.printing_gv_id
      from jsonb_to_recordset($1::jsonb) item(printing_id uuid,printing_gv_id text)
      where p.id=item.printing_id and p.printing_gv_id is null
      returning p.id::text,p.printing_gv_id`, [JSON.stringify(updates.map((row) => ({
      printing_id: row.printing_id, printing_gv_id: row.expected_printing_gv_id })))]);
    updateCount = updateResult.rowCount;
    assert.equal(updateCount, 3, "printing_gv_id_update_count_changed");
    const reviewedAt = new Date().toISOString();
    const payload = targets.map((target) => ({
      id: target.review_id,
      card_printing_id: target.printing_id,
      reason: "Exact Professor Program stamped printing and finish verified by the approved catalog-repair evidence chain; review is limited to this source product, parent, child, and finish.",
      evidence_sources_checked: [...new Set([
        ...(target.evidence.exact_finish ?? []), ...(target.evidence.professor_program_identity ?? []),
        `repo:${READINESS}#sha256=${readiness.sha256}`,
      ])].sort(),
      evidence_sources_for_finish: [...new Set([
        ...(target.evidence.exact_finish ?? []), `repo:${READINESS}#sha256=${readiness.sha256}`,
      ])].sort(),
      finish_key: target.finish_key,
      evidence: { version: VERSION, package_fingerprint: packageFingerprint,
        source_product_id: target.source_product_id, card_print_id: target.card_print_id,
        printing_id: target.printing_id, printing_gv_id: target.expected_printing_gv_id,
        finish_key: target.finish_key, source_artifacts: authority.source_artifacts },
      reviewed_at: reviewedAt,
    }));
    const insertResult = await client.query(`insert into public.card_printing_truth_reviews (
      id,card_printing_id,review_status,public_visibility,active,reason,confidence,
      evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,
      source_report_path,reviewed_by,reviewed_at)
      select item.id,item.card_printing_id,'verified','visible',true,item.reason,'high',
        item.evidence_sources_checked,item.evidence_sources_for_finish,array[item.finish_key]::text[],
        item.evidence,$2::text,$3::text,item.reviewed_at
      from jsonb_to_recordset($1::jsonb) item(id uuid,card_printing_id uuid,reason text,
        evidence_sources_checked text[],evidence_sources_for_finish text[],finish_key text,
        evidence jsonb,reviewed_at timestamptz)
      returning id::text,card_printing_id::text`, [JSON.stringify(payload),
      `${READINESS}|${CATALOG}|${JUDGE_EVIDENCE}`, VERSION]);
    insertCount = insertResult.rowCount;
    assert.equal(insertCount, 7, "truth_review_insert_count_changed");
    transient = await snapshot(client, targets);
    assert.notEqual(transient.hash_sha256, before.hash_sha256, "transient_change_missing");
    assert.equal(transient.reviews.length, 7, "transient_review_count_changed");
    for (const target of targets) {
      const printing = transient.printings.find((row) => row.id === target.printing_id);
      const review = transient.reviews.find((row) => row.id === target.review_id);
      assert.equal(printing.printing_gv_id, target.expected_printing_gv_id);
      assert.equal(review.review_status, "verified");
      assert.equal(review.public_visibility, "visible");
      assert.equal(review.active, true);
      assert.equal(review.evidence?.package_fingerprint, packageFingerprint);
    }
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const verify = new pg.Client({ connectionString: databaseUrl.href,
    ssl: databaseUrl.hostname === "localhost" || databaseUrl.hostname === "127.0.0.1"
      ? false : { rejectUnauthorized: false }, application_name: "professor_program_printing_readiness_rollback_verify_v1" });
  await verify.connect();
  let after;
  try { after = await snapshot(verify, targets); } finally { await verify.end(); }
  assert.equal(after.hash_sha256, before.hash_sha256, "rollback_proof_failed");
  const report = {
    generated_at: new Date().toISOString(), version: VERSION, package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint, production_project_ref: PROJECT_REF,
    rollback_only: true, execution_authorized: false, authority, guard,
    counts: { targets: 7, printing_gv_id_updates: updateCount, truth_review_inserts: insertCount,
      mapping_writes: 0, pricing_writes: 0, publication_writes: 0 },
    proof: { before_snapshot: before, transient_snapshot: transient, after_snapshot: after,
      transient_change_verified: transient.hash_sha256 !== before.hash_sha256,
      rollback_verified: after.hash_sha256 === before.hash_sha256 },
    approval_text: `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 3 missing printing_gv_id assignments and 7 verified visible printing truth review inserts for Professor Program products 176629, 176630, 176631, 176632, 176633, 213516, and 499366. Dry-run rollback proof: ${before.hash_sha256} == ${after.hash_sha256}. No mapping writes. No pricing writes. No publication writes. No parent or identity writes. No deletes. No merges. No migrations.`,
  };
  const output = path.join(ROOT, "docs/audits/tcgplayer_professor_program_printing_readiness_guarded_dry_run_20261105_v1.json");
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ package_id: PACKAGE_ID,
    fingerprint: packageFingerprint, counts: report.counts,
    rollback_proof: `${before.hash_sha256} == ${after.hash_sha256}`,
    approval_text: report.approval_text }, null, 2)}\n`);
}

run().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
