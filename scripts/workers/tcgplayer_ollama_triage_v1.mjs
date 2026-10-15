#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  assertLoopbackOllamaUrlV1,
  planTcgplayerOllamaTriageRowV1,
  sha256TcgplayerOllamaEvidenceV1,
  TCGPLAYER_OLLAMA_TRIAGE_MODEL,
  TCGPLAYER_OLLAMA_TRIAGE_SCHEMA,
  TCGPLAYER_OLLAMA_TRIAGE_VERSION,
  validateTcgplayerOllamaAdviceV1,
} from '../../backend/pricing/tcgplayer_ollama_triage_v1.mjs';

function value(argv, name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
}

function positiveInteger(raw, fallback, maximum, label) {
  const parsed = Number.parseInt(raw || String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${label} must be an integer from 1 through ${maximum}`);
  }
  return parsed;
}

function parseArgs(argv) {
  if (argv.includes('--apply') || argv.includes('--run')) {
    throw new Error('Ollama triage is read-only and does not support write modes');
  }
  const input = value(argv, 'input');
  const outDir = value(argv, 'out-dir');
  if (!input) throw new Error('--input is required');
  if (!outDir) throw new Error('--out-dir is required');
  const model = value(argv, 'model') || TCGPLAYER_OLLAMA_TRIAGE_MODEL;
  if (model !== TCGPLAYER_OLLAMA_TRIAGE_MODEL) {
    throw new Error(`Ollama triage model is frozen to ${TCGPLAYER_OLLAMA_TRIAGE_MODEL}`);
  }
  return {
    input: path.resolve(input),
    outDir: path.resolve(outDir),
    model,
    endpoint: assertLoopbackOllamaUrlV1(
      value(argv, 'endpoint') || 'http://127.0.0.1:11434',
    ),
    limit: positiveInteger(value(argv, 'limit'), 25, 100, '--limit'),
    offset: Math.max(0, Number.parseInt(value(argv, 'offset') || '0', 10) || 0),
  };
}

async function readJsonl(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size > 50 * 1024 * 1024) {
    throw new Error('Ollama triage input exceeds the 50 MiB safety limit');
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return {
    raw,
    rows: raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
      }
    }),
  };
}

async function callOllama(endpoint, model, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const url = new URL('/api/chat', endpoint);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: '15s',
        format: TCGPLAYER_OLLAMA_TRIAGE_SCHEMA,
        options: { temperature: 0, num_ctx: 4096, num_predict: 192 },
        messages: [{ role: 'user', content: JSON.stringify(prompt) }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
    }
    const result = await response.json();
    if (result.done_reason !== 'stop') {
      throw new Error(`Ollama response did not stop cleanly: ${result.done_reason}`);
    }
    return {
      advice: JSON.parse(result.message?.content ?? ''),
      metrics: {
        total_duration_ns: result.total_duration ?? null,
        load_duration_ns: result.load_duration ?? null,
        prompt_eval_count: result.prompt_eval_count ?? null,
        eval_count: result.eval_count ?? null,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function ollamaModelDigest(endpoint, model) {
  const response = await fetch(new URL('/api/tags', endpoint));
  if (!response.ok) {
    throw new Error(`Ollama model inventory HTTP ${response.status}`);
  }
  const body = await response.json();
  const match = Array.isArray(body.models)
    ? body.models.find((entry) => entry.name === model || entry.model === model)
    : null;
  if (!match?.digest || !/^[a-f0-9]{64}$/.test(match.digest)) {
    throw new Error(`Frozen Ollama model is unavailable: ${model}`);
  }
  return match.digest;
}

async function unloadOllama(endpoint, model) {
  await fetch(new URL('/api/generate', endpoint), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt: '', stream: false, keep_alive: 0 }),
  }).catch(() => {});
}

function jsonl(rows) {
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = await readJsonl(args.input);
  const modelDigest = await ollamaModelDigest(args.endpoint, args.model);
  const selected = input.rows.slice(args.offset, args.offset + args.limit);
  const results = [];
  let modelCalls = 0;
  let modelErrors = 0;
  await fs.mkdir(args.outDir, { recursive: true });

  try {
    for (const row of selected) {
      const plan = planTcgplayerOllamaTriageRowV1(row);
      if (!plan.model_call_allowed) {
        results.push({
          schema_version: TCGPLAYER_OLLAMA_TRIAGE_VERSION,
          source_product_id: plan.source_product_id,
          disposition: plan.disposition,
          reason: plan.reason,
          mapping_authority: false,
          publication_authority: false,
          model_called: false,
          missing_fields: plan.missing_fields ?? [],
          rejected_candidates: plan.rejected_candidates,
        });
        continue;
      }
      modelCalls += 1;
      try {
        const response = await callOllama(args.endpoint, args.model, plan.prompt);
        const advice = validateTcgplayerOllamaAdviceV1(response.advice, plan);
        results.push({
          schema_version: TCGPLAYER_OLLAMA_TRIAGE_VERSION,
          source_product_id: plan.source_product_id,
          disposition: 'review_required',
          reason: plan.reason,
          mapping_authority: false,
          publication_authority: false,
          model_called: true,
          model: args.model,
          advice,
          metrics: response.metrics,
          compatible_candidate_ids:
            plan.compatible_candidates.map((candidate) => candidate.candidate_id),
          rejected_candidates: plan.rejected_candidates,
        });
      } catch (error) {
        modelErrors += 1;
        results.push({
          schema_version: TCGPLAYER_OLLAMA_TRIAGE_VERSION,
          source_product_id: plan.source_product_id,
          disposition: 'local_model_error',
          reason: String(error?.message ?? error),
          mapping_authority: false,
          publication_authority: false,
          model_called: true,
        });
      }
    }
  } finally {
    await unloadOllama(args.endpoint, args.model);
  }

  const summary = {
    schema_version: TCGPLAYER_OLLAMA_TRIAGE_VERSION,
    created_at: new Date().toISOString(),
    input_path: args.input,
    input_sha256: sha256TcgplayerOllamaEvidenceV1(input.raw),
    model: args.model,
    model_digest: modelDigest,
    endpoint: args.endpoint.origin,
    total_input_rows: input.rows.length,
    offset: args.offset,
    requested_limit: args.limit,
    processed_rows: selected.length,
    remaining_rows: Math.max(0, input.rows.length - args.offset - selected.length),
    model_calls: modelCalls,
    model_errors: modelErrors,
    held_by_deterministic_guard: results.filter((row) =>
      row.disposition === 'held_by_deterministic_guard').length,
    review_required: results.filter((row) =>
      row.disposition === 'review_required').length,
    boundaries: {
      sequential_model_calls: true,
      loopback_only: true,
      database_reads: false,
      database_writes: false,
      canonical_mapping_authority: false,
      publication_authority: false,
      customer_state_writes: false,
    },
  };
  await fs.writeFile(path.join(args.outDir, 'triage.jsonl'), jsonl(results));
  await fs.writeFile(
    path.join(args.outDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (modelErrors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[tcgplayer-ollama-triage] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
