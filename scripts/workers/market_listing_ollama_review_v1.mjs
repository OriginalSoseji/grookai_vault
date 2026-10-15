#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

import {
  MARKET_LISTING_OLLAMA_REVIEW_MODEL,
  MARKET_LISTING_OLLAMA_REVIEW_SCHEMA,
  MARKET_LISTING_OLLAMA_REVIEW_VERSION,
  applyMarketListingOllamaDeterministicGuardV1,
  validateMarketListingOllamaReviewV1,
} from "../../backend/pricing/market_listing_ollama_review_v1.mjs";

function arg(argv, name, fallback = "") {
  return argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3).trim() ?? fallback;
}

function positive(value, fallback, max, label) {
  const parsed = Number.parseInt(value || String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) throw new Error(`${label} must be 1-${max}`);
  return parsed;
}

function endpoint(value) {
  const url = new URL(value || "http://127.0.0.1:11434");
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]", "::1"].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
    throw new Error("Evidence review requires an unauthenticated HTTP loopback endpoint");
  }
  return url;
}

async function callOllama(baseUrl, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(new URL("/api/chat", baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MARKET_LISTING_OLLAMA_REVIEW_MODEL,
        stream: false,
        think: false,
        keep_alive: "15s",
        format: MARKET_LISTING_OLLAMA_REVIEW_SCHEMA,
        options: { temperature: 0, num_ctx: 4096, num_predict: 256 },
        messages: [{ role: "user", content: JSON.stringify(prompt) }],
      }),
    });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
    const result = await response.json();
    if (result.done_reason !== "stop") throw new Error(`Ollama response did not stop cleanly: ${result.done_reason}`);
    return {
      review: validateMarketListingOllamaReviewV1(JSON.parse(result.message?.content ?? "")),
      metrics: {
        total_duration_ns: result.total_duration ?? null,
        prompt_eval_count: result.prompt_eval_count ?? null,
        eval_count: result.eval_count ?? null,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function modelDigest(baseUrl) {
  const response = await fetch(new URL("/api/tags", baseUrl));
  if (!response.ok) throw new Error(`Ollama model inventory HTTP ${response.status}`);
  const body = await response.json();
  const match = body.models?.find((entry) => entry.name === MARKET_LISTING_OLLAMA_REVIEW_MODEL || entry.model === MARKET_LISTING_OLLAMA_REVIEW_MODEL);
  if (!match?.digest) throw new Error(`Model is unavailable: ${MARKET_LISTING_OLLAMA_REVIEW_MODEL}`);
  return match.digest;
}

async function unload(baseUrl) {
  await fetch(new URL("/api/generate", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MARKET_LISTING_OLLAMA_REVIEW_MODEL, prompt: "", stream: false, keep_alive: 0 }),
  }).catch(() => {});
}

function promptFor(row, samples) {
  return {
    task: "Classify this internal market-evidence rollup for review routing only.",
    rollup: {
      gv_id: row.gv_id,
      evidence_class: row.evidence_class,
      listing_count: row.listing_count,
      seller_count: row.seller_count,
      median_active_ask: row.median_active_ask,
      minimum_active_ask: row.minimum_active_ask,
      maximum_active_ask: row.maximum_active_ask,
      exclusion_counts: row.exclusion_counts,
      review_bucket: row.review_bucket,
    },
    sampled_listings: samples.slice(0, 5),
    rules: {
      advisory_only: true,
      never_publish: true,
      never_map: true,
      uncertain_means_needs_more_evidence: true,
    },
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const inputPath = path.resolve(arg(argv, "input"));
  const outDir = path.resolve(arg(argv, "out-dir"));
  if (!arg(argv, "input") || !arg(argv, "out-dir")) throw new Error("--input and --out-dir are required");
  const limit = positive(arg(argv, "limit"), 10, 100, "--limit");
  const baseUrl = endpoint(arg(argv, "endpoint"));
  const input = JSON.parse(await fs.readFile(inputPath, "utf8"));
  if (!Array.isArray(input.rows) || !Array.isArray(input.samples)) throw new Error("Bounded review input must contain rows and samples arrays");
  const selected = input.rows.slice(0, limit);
  const digest = await modelDigest(baseUrl);
  const results = [];
  let modelErrors = 0;
  try {
    for (const row of selected) {
      const samples = input.samples.filter((sample) => sample.card_print_id === row.card_print_id);
      try {
        const response = await callOllama(baseUrl, promptFor(row, samples));
        const guardedReview = applyMarketListingOllamaDeterministicGuardV1(row, response.review);
        results.push({ schema_version: MARKET_LISTING_OLLAMA_REVIEW_VERSION, gv_id: row.gv_id, rollup_id: row.rollup_id, model: MARKET_LISTING_OLLAMA_REVIEW_MODEL, model_digest: digest, model_review: response.review, review: guardedReview, deterministic_guard_applied: JSON.stringify(response.review) !== JSON.stringify(guardedReview), metrics: response.metrics, publication_authority: false, mapping_authority: false });
      } catch (error) {
        modelErrors += 1;
        results.push({ schema_version: MARKET_LISTING_OLLAMA_REVIEW_VERSION, gv_id: row.gv_id, rollup_id: row.rollup_id, model: MARKET_LISTING_OLLAMA_REVIEW_MODEL, model_digest: digest, disposition: "local_model_error", reason: String(error?.message ?? error), publication_authority: false, mapping_authority: false });
      }
    }
  } finally {
    await unload(baseUrl);
  }
  await fs.mkdir(outDir, { recursive: true });
  const summary = { schema_version: MARKET_LISTING_OLLAMA_REVIEW_VERSION, created_at: new Date().toISOString(), model: MARKET_LISTING_OLLAMA_REVIEW_MODEL, model_digest: digest, input_path: inputPath, processed_rows: selected.length, model_errors: modelErrors, boundaries: { loopback_only: true, database_reads: false, database_writes: false, mapping_authority: false, publication_authority: false, customer_state_writes: false } };
  await fs.writeFile(path.join(outDir, "review.jsonl"), `${results.map((row) => JSON.stringify(row)).join("\n")}\n`);
  await fs.writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (modelErrors) process.exitCode = 1;
}

main().catch((error) => { console.error(`[market-listing-ollama-review] ${error.stack ?? error.message}`); process.exitCode = 1; });
