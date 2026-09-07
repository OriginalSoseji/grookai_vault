import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { planLanguageAnomalyEvidenceV1, classifyLanguageAnomalyEvidenceV1,
  runLanguageAnomalyEvidenceV1 } from "../../scripts/audits/pokemon_language_anomaly_evidence_v1.mjs";
import { pokemonLanguageFingerprint } from "../../backend/catalog/pokemon_language_master_index_v1.mjs";

const anomaly = (n = 1) => ({ source_anomaly_id: `de-orphan-${n}`, language: "de",
  anomaly_type: "source_card_without_set_owner", source_key: `pop8-${n}`,
  canonical_authority: false, source_payload: { id: `pop8-${n}`, localId: `${n}`, name: `Card ${n}` } });
const duplicate = (n) => ({ source_anomaly_id: `zh-duplicate-${n}`, language: "zh-cn",
  anomaly_type: "duplicate_source_set_id", source_key: "CSV1C", canonical_authority: false,
  source_payload: { id: "CSV1C", name: `Set ${n}` } });
const owner = { id: "pop8", name: "POP Series 8", cardCount: { total: 17, official: 17 } };
function evidence(plan) {
  return plan.requests.map((request) => {
    const row = plan.rows.find((row) => row.detail_route === request.route);
    return { ...request, status: request.route.includes("/cards/") ? 200 : 404,
      body: request.route.includes("/cards/") ? { ...row.anomaly.source_payload, set: structuredClone(owner) } : null };
  });
}

test("planner freezes exact rows and deduplicates set probes without deriving ownership", () => {
  const plan = planLanguageAnomalyEvidenceV1([anomaly(1), anomaly(2), duplicate(1), duplicate(2)]);
  assert.equal(plan.requests.length, 4);
  assert.equal(plan.rows.length, 4);
  assert.equal(plan.rows[0].source_set_id, undefined);
  assert.equal(plan.canonical_authority, false);
  assert.equal(plan.retries, 0);
});

test("exact card detail with explicit owner supports candidate revalidation, not admission", () => {
  const plan = planLanguageAnomalyEvidenceV1([anomaly()]);
  const before = JSON.stringify(plan);
  const result = classifyLanguageAnomalyEvidenceV1(plan, evidence(plan));
  assert.equal(result.supported, 1);
  assert.equal(result.rows[0].source_set_id, "pop8");
  assert.equal(result.rows[0].source_set_endpoint_status, 404);
  assert.equal(result.quarantine_changes, false);
  assert.equal(result.candidate_writes, false);
  assert.equal(JSON.stringify(plan), before);
});

test("missing owner, name or coordinate drift cannot be repaired using a prefix", () => {
  for (const patch of [{ set: null }, { name: "Different" }, { localId: "2" }, { id: "pop9-1" },
    { set: { ...owner, id: "pop9" } }, { set: { ...owner, name: "" } },
    { set: { ...owner, cardCount: { total: "17", official: 17 } } }]) {
    const plan = planLanguageAnomalyEvidenceV1([anomaly()]);
    const responses = evidence(plan);
    Object.assign(responses.find((row) => row.route.includes("/cards/")).body, patch);
    assert.equal(classifyLanguageAnomalyEvidenceV1(plan, responses).supported, 0);
  }
});

test("successful set endpoint must agree with embedded set evidence", () => {
  const plan = planLanguageAnomalyEvidenceV1([anomaly()]);
  const responses = evidence(plan);
  const probe = responses.find((row) => row.route.includes("/sets/"));
  Object.assign(probe, { status: 200, body: structuredClone(owner) });
  assert.equal(classifyLanguageAnomalyEvidenceV1(plan, responses).supported, 1);
  probe.body.name = "Conflicting name";
  assert.equal(classifyLanguageAnomalyEvidenceV1(plan, responses).supported, 0);
  Object.assign(probe, { status: 404, error: "Response exceeds 4 MiB." });
  assert.equal(classifyLanguageAnomalyEvidenceV1(plan, responses).supported, 0);
});

test("inconsistent set names or impossible observed counts retain quarantine", () => {
  const plan = planLanguageAnomalyEvidenceV1([anomaly(1), anomaly(2)]);
  const responses = evidence(plan);
  responses.find((row) => row.body).body.set.name = "Other name";
  assert.equal(classifyLanguageAnomalyEvidenceV1(plan, responses).supported, 0);
  const tooMany = evidence(plan);
  for (const row of tooMany.filter((row) => row.body)) row.body.set.cardCount.total = 1;
  assert.equal(classifyLanguageAnomalyEvidenceV1(plan, tooMany).supported, 0);
  const duplicatePlan = planLanguageAnomalyEvidenceV1([anomaly(), { ...anomaly(), source_anomaly_id: "another-anomaly" }]);
  assert.equal(classifyLanguageAnomalyEvidenceV1(duplicatePlan, evidence(duplicatePlan)).supported, 0);
});

test("one matching endpoint never resolves duplicate Chinese set ownership", () => {
  const plan = planLanguageAnomalyEvidenceV1([duplicate(1), duplicate(2)]);
  const responses = plan.requests.map((request) => ({ ...request, status: 200, body: duplicate(1).source_payload }));
  const result = classifyLanguageAnomalyEvidenceV1(plan, responses);
  assert.equal(result.supported, 0);
  assert.equal(result.unresolved, 2);
});

test("missing or duplicate responses fail reconciliation", () => {
  const plan = planLanguageAnomalyEvidenceV1([anomaly()]);
  const responses = evidence(plan);
  assert.throws(() => classifyLanguageAnomalyEvidenceV1(plan, responses.slice(1)), /reconciliation/);
  assert.throws(() => classifyLanguageAnomalyEvidenceV1(plan, [responses[0], responses[0]]), /reconciliation/);
});

test("duplicate identities, wrong scope and excessive requests fail before requests", () => {
  assert.throws(() => planLanguageAnomalyEvidenceV1([anomaly(), anomaly()]), /duplicate/);
  assert.throws(() => planLanguageAnomalyEvidenceV1([{ ...anomaly(), language: "xx" }]), /Invalid/);
  assert.throws(() => planLanguageAnomalyEvidenceV1(Array.from({ length: 301 }, (_, i) => anomaly(i))), /300/);
  assert.throws(() => planLanguageAnomalyEvidenceV1(Array.from({ length: 151 }, (_, i) => ({
    ...anomaly(i), source_key: `s${i}-1`, source_payload: { id: `s${i}-1`, localId: "1", name: "Card" },
  }))), /ceiling/);
});

test("blocked or malformed detail never becomes supported evidence", () => {
  for (const status of [302, 403, 404, 429, 500]) {
    const plan = planLanguageAnomalyEvidenceV1([anomaly()]);
    const responses = evidence(plan);
    responses.find((row) => row.body).status = status;
    assert.equal(classifyLanguageAnomalyEvidenceV1(plan, responses).supported, 0);
  }
});

test("worker writes a frozen plan and exact raw evidence; never alters baseline", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "language-evidence-test-"));
  const baseline = path.join(root, "baseline");
  await fs.mkdir(baseline);
  for (const [language, rows] of [["de", [anomaly()]], ["zh-cn", [duplicate(1), duplicate(2)]]]) {
    await fs.mkdir(path.join(baseline, language));
    await fs.writeFile(path.join(baseline, language, "source_anomalies.json.gz"), zlib.gzipSync(JSON.stringify(rows)));
    await fs.writeFile(path.join(baseline, language, "manifest.json"), JSON.stringify({ language,
      source_anomalies_fingerprint_sha256: pokemonLanguageFingerprint(rows) }));
  }
  const baselineBytes = await fs.readFile(path.join(baseline, "de", "source_anomalies.json.gz"));
  const outDir = path.join(root, "out");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(JSON.parse(await fs.readFile(path.join(outDir, "run_plan.json"))).database_writes, false);
    assert.equal(options.redirect, "manual");
    calls += 1;
    return url.includes("/cards/") ? new Response(JSON.stringify({ ...anomaly().source_payload, set: owner })) :
      new Response('{"error":"not found"}', { status: 404 });
  });
  const result = await runLanguageAnomalyEvidenceV1({ baselineDir: baseline, outDir });
  assert.equal(result.supported, 1);
  assert.equal(result.unresolved, 2);
  assert.equal(calls, 3);
  for (const row of result.evidence) assert.equal(pokemonLanguageFingerprint(JSON.parse(await fs.readFile(path.join(outDir, row.path)))), row.sha256);
  assert.deepEqual(await fs.readFile(path.join(baseline, "de", "source_anomalies.json.gz")), baselineBytes);
  await assert.rejects(runLanguageAnomalyEvidenceV1({ baselineDir: baseline, outDir }), /EEXIST/);
  await assert.rejects(runLanguageAnomalyEvidenceV1({ baselineDir: baseline, outDir: path.join(baseline, "out") }), /outside/);
  assert.equal(calls, 3);
});

test("origin circuit stops new calls and reconciles skipped rows without retries", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "language-evidence-blocked-"));
  const baseline = path.join(root, "baseline");
  await fs.mkdir(baseline);
  for (const [language, rows] of [["de", Array.from({ length: 10 }, (_, i) => anomaly(i + 1))], ["zh-cn", []]]) {
    await fs.mkdir(path.join(baseline, language));
    await fs.writeFile(path.join(baseline, language, "source_anomalies.json.gz"), zlib.gzipSync(JSON.stringify(rows)));
    await fs.writeFile(path.join(baseline, language, "manifest.json"), JSON.stringify({ language,
      source_anomalies_fingerprint_sha256: pokemonLanguageFingerprint(rows) }));
  }
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; return new Response("rate limited", { status: 429 }); });
  const result = await runLanguageAnomalyEvidenceV1({ baselineDir: baseline, outDir: path.join(root, "out") });
  assert.ok(calls <= 3);
  assert.equal(result.attempted_requests + result.skipped_requests, result.planned_requests);
  assert.equal(result.supported, 0);
  assert.equal(result.retries, 0);
});

test("daily audit is artifact-only and its failures remain visible in adapter health", async () => {
  const workflow = await fs.readFile(".github/workflows/pokemon-master-index-refresh.yml", "utf8");
  assert.match(workflow, /--baseline-dir="\$LANGUAGE_REPORT_DIR\/candidate_index"/);
  assert.match(workflow, /--out-dir="\$LANGUAGE_REPORT_DIR\/anomaly_evidence"/);
  assert.match(workflow, /steps\.anomaly_evidence\.outcome/);
  assert.match(workflow, /anomalyAudit\.source_request_failures === 0/);
  assert.match(workflow, /anomalyAudit\.skipped_requests === 0/);
  assert.match(workflow, /Read-only anomaly evidence \(never grants authority\)/);
});
