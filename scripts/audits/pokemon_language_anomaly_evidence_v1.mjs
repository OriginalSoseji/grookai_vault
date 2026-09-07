import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { pokemonLanguageFingerprint, stablePokemonLanguageJson,
  TCGDEX_POKEMON_LANGUAGE_SCOPES } from "../../backend/catalog/pokemon_language_master_index_v1.mjs";

const VERSION = "POKEMON_LANGUAGE_ANOMALY_EVIDENCE_V1";
const BOUNDARIES = Object.freeze({ database_writes: false, storage_writes: false,
  canonical_authority: false, candidate_writes: false, quarantine_changes: false });
const clean = (value) => typeof value === "string" ? value.trim() : "";

export function planLanguageAnomalyEvidenceV1(anomalies) {
  if (!Array.isArray(anomalies) || anomalies.length > 300) throw new Error("At most 300 anomalies per audit.");
  const seen = new Set();
  const requests = new Map();
  const request = (language, kind, key) => {
    const route = `${language}/${kind}/${encodeURIComponent(key)}`;
    if (!requests.has(route)) requests.set(route, { route,
      request_id: pokemonLanguageFingerprint(route).slice(0, 24),
      url: `https://api.tcgdex.net/v2/${route}` });
    return route;
  };
  const rows = anomalies.map((anomaly) => {
    const { language, source_anomaly_id: id } = anomaly;
    if (!TCGDEX_POKEMON_LANGUAGE_SCOPES.includes(language) || !clean(id) || seen.has(id) ||
        anomaly.canonical_authority !== false) throw new Error("Invalid or duplicate candidate-only anomaly.");
    seen.add(id);
    const key = clean(anomaly.source_key);
    if (!key || key === "." || key === ".." || /[\x00-\x1f]/.test(key)) throw new Error("Invalid source key.");
    const row = { anomaly, detail_route: null, set_probe_route: null };
    if (anomaly.anomaly_type === "source_card_without_set_owner") {
      row.detail_route = request(language, "cards", key);
      const number = clean(anomaly.source_payload?.localId);
      // A prefix is only an endpoint probe, never evidence of ownership.
      if (number && key.endsWith(`-${number}`)) {
        const hint = key.slice(0, -number.length - 1);
        if (hint && hint !== "." && hint !== "..") row.set_probe_route = request(language, "sets", hint);
      }
    } else if (anomaly.anomaly_type === "duplicate_source_set_id") {
      row.detail_route = request(language, "sets", key);
    }
    return row;
  });
  if (requests.size > 300) throw new Error("Request ceiling exceeded before provider access.");
  return { version: VERSION, ...BOUNDARIES,
    anomalies_fingerprint: pokemonLanguageFingerprint(anomalies),
    max_requests: 300, retries: 0, concurrency: 3,
    rows, requests: [...requests.values()].sort((a, b) => a.route.localeCompare(b.route)) };
}

export function classifyLanguageAnomalyEvidenceV1(plan, responses) {
  const byRoute = new Map(responses.map((row) => [row.route, row]));
  if (byRoute.size !== responses.length || responses.length !== plan.requests.length ||
      plan.requests.some((row) => !byRoute.has(row.route))) throw new Error("Response reconciliation mismatch.");
  const rows = plan.rows.map(({ anomaly, detail_route, set_probe_route }) => {
    const result = { source_anomaly_id: anomaly.source_anomaly_id, language: anomaly.language,
      source_key: anomaly.source_key, decision: "quarantine_retained", reason: "unsupported_anomaly_class",
      detail_route, set_probe_route, ...BOUNDARIES };
    const response = byRoute.get(detail_route);
    const body = response?.body;
    if (anomaly.anomaly_type === "duplicate_source_set_id") {
      return { ...result, reason: "one_endpoint_cannot_resolve_colliding_source_records",
        observed_endpoint_name: clean(body?.name) || null };
    }
    if (anomaly.anomaly_type !== "source_card_without_set_owner") return result;
    if (response?.status !== 200 || response.error || !body || Array.isArray(body)) {
      return { ...result, reason: "card_detail_unavailable" };
    }
    const prior = anomaly.source_payload;
    const set = body.set;
    if (clean(body.id) !== clean(prior?.id) || clean(body.id) !== clean(anomaly.source_key) ||
        !clean(prior?.name) || clean(body.name) !== clean(prior.name) ||
        !clean(prior?.localId) || clean(body.localId) !== clean(prior.localId)) {
      return { ...result, reason: "card_identity_drift" };
    }
    if (!clean(set?.id) || !clean(set?.name) || `${set.id}-${body.localId}` !== body.id) {
      return { ...result, reason: "missing_or_conflicting_explicit_set_owner" };
    }
    const total = set.cardCount?.total;
    const official = set.cardCount?.official;
    if (!Number.isSafeInteger(total) || total < 1 || !Number.isSafeInteger(official) || official < 1 || total < official) {
      return { ...result, reason: "invalid_declared_set_counts" };
    }
    const probe = byRoute.get(set_probe_route);
    if (probe?.status === 200 && (probe.error || clean(probe.body?.id) !== set.id ||
        clean(probe.body?.name) !== set.name || probe.body?.cardCount?.total !== total ||
        probe.body?.cardCount?.official !== official)) {
      return { ...result, reason: "set_endpoint_conflicts_with_card_detail" };
    }
    if (probe?.error || (probe?.status !== 200 && probe?.status !== 404)) {
      return { ...result, reason: "set_probe_not_verified" };
    }
    return { ...result, decision: "candidate_revalidation_supported",
      reason: "exact_card_detail_has_explicit_owner", source_set_id: set.id,
      source_set_name: set.name, declared_total: total, declared_official: official,
      source_set_endpoint_status: probe.status,
      evidence_authority: "single_source_candidate_only" };
  });
  const groups = new Map();
  for (const row of rows.filter((row) => row.decision === "candidate_revalidation_supported")) {
    const key = `${row.language}/${row.source_set_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const group of groups.values()) {
    const signatures = new Set(group.map((row) => JSON.stringify([
      row.source_set_name, row.declared_total, row.declared_official,
    ])));
    if (signatures.size !== 1 || group.length > group[0].declared_total ||
        new Set(group.map((row) => row.source_key)).size !== group.length) {
      for (const row of group) Object.assign(row, { decision: "quarantine_retained", reason: "inconsistent_embedded_set_evidence" });
    }
  }
  return { version: VERSION, ...BOUNDARIES, selected: rows.length,
    planned_requests: plan.requests.length, attempted_requests: responses.filter((row) => !row.skipped).length,
    skipped_requests: responses.filter((row) => row.skipped).length,
    supported: rows.filter((row) => row.decision === "candidate_revalidation_supported").length,
    unresolved: rows.filter((row) => row.decision !== "candidate_revalidation_supported").length,
    source_request_failures: responses.filter((row) => !row.skipped && (row.error || ![200, 404].includes(row.status))).length,
    retries: 0, rows };
}

async function requestEvidence(request, onBlocked) {
  let status = null;
  try {
    const response = await fetch(request.url, { redirect: "manual", signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "GrookaiLanguageEvidence/1.0 catalog-ops@grookai.com" } });
    status = response.status;
    if ([401, 403, 429].includes(status)) onBlocked();
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 4 * 1024 * 1024) throw new Error("Response exceeds 4 MiB.");
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    let body = null;
    try { body = JSON.parse(raw); } catch { /* Preserve non-JSON source failures verbatim. */ }
    return { ...request, status, raw, body, observed_at: new Date().toISOString() };
  } catch (error) {
    return { ...request, status, error: error.message, observed_at: new Date().toISOString() };
  }
}

export async function runLanguageAnomalyEvidenceV1({ baselineDir, outDir }) {
  if (!outDir) throw new Error("A new --out-dir is required.");
  const relative = path.relative(path.resolve(baselineDir), path.resolve(outDir));
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Evidence output must be outside the candidate baseline.");
  }
  const anomalies = [];
  const inputFiles = [];
  for (const language of ["de", "zh-cn"]) {
    const root = path.join(baselineDir, language);
    const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
    const rows = JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(root, "source_anomalies.json.gz"))));
    if (manifest.language !== language || pokemonLanguageFingerprint(rows) !== manifest.source_anomalies_fingerprint_sha256 ||
        rows.some((row) => row.language !== language)) throw new Error("Baseline anomaly manifest mismatch.");
    anomalies.push(...rows);
    inputFiles.push({ root, fingerprint: pokemonLanguageFingerprint(rows) });
  }
  const plan = { ...planLanguageAnomalyEvidenceV1(anomalies), inputFiles,
    implementation_sha256: crypto.createHash("sha256").update(await fs.readFile(new URL(import.meta.url))).digest("hex") };
  await fs.mkdir(path.dirname(path.resolve(outDir)), { recursive: true });
  await fs.mkdir(outDir); // Never reuse a run directory or replace earlier evidence.
  await fs.writeFile(path.join(outDir, "run_plan.json"), stablePokemonLanguageJson(plan), { flag: "wx" });
  await fs.mkdir(path.join(outDir, "responses"));
  let cursor = 0;
  let stopped = false;
  const responses = new Array(plan.requests.length);
  async function worker() {
    while (cursor < plan.requests.length) {
      const index = cursor++;
      const request = plan.requests[index];
      const response = stopped ? { ...request, skipped: true, reason: "origin_circuit_open" } :
        await requestEvidence(request, () => { stopped = true; });
      responses[index] = response;
      try {
        await fs.writeFile(path.join(outDir, "responses", `${request.request_id}.json`), stablePokemonLanguageJson(response), { flag: "wx" });
      } catch (error) {
        stopped = true;
        throw error;
      }
    }
  }
  // Drain every in-flight evidence write even if another worker encounters disk failure.
  const settled = await Promise.allSettled(Array.from({ length: plan.concurrency }, worker));
  const failed = settled.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;
  for (const input of inputFiles) {
    const rows = JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(input.root, "source_anomalies.json.gz"))));
    if (pokemonLanguageFingerprint(rows) !== input.fingerprint) throw new Error("Baseline changed during audit.");
  }
  const summary = { ...classifyLanguageAnomalyEvidenceV1(plan, responses),
    plan_fingerprint: pokemonLanguageFingerprint(plan),
    evidence: responses.map((response) => ({ path: `responses/${response.request_id}.json`, sha256: pokemonLanguageFingerprint(response) })) };
  await fs.writeFile(path.join(outDir, "summary.json"), stablePokemonLanguageJson(summary), { flag: "wx" });
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = { baselineDir: "docs/audits/pokemon_language_master_index_v1/candidates", outDir: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--out-dir=")) options.outDir = arg.slice(10);
    else if (arg.startsWith("--baseline-dir=")) options.baselineDir = arg.slice(15);
    else throw new Error(`Unsupported option: ${arg}`);
  }
  runLanguageAnomalyEvidenceV1(options).then((summary) => {
    console.log(JSON.stringify({ selected: summary.selected, supported: summary.supported,
      unresolved: summary.unresolved, attempted_requests: summary.attempted_requests,
      source_request_failures: summary.source_request_failures, ...BOUNDARIES }, null, 2));
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
