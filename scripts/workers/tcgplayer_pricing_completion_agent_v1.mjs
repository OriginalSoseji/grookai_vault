#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import '../../backend/env.mjs';
import {
  callOperationsRpcV1,
} from '../../backend/operations/operations_control_plane_v1.mjs';
import {
  buildTcgplayerPricingCompletionAgentV1,
  buildTcgplayerIdentityProductQueueV1,
  buildPokemonPricingMappingReviewWorkItemV1,
  applyPokemonPricingMappingReviewedHoldsV1,
  selectPokemonPricingMappingReviewBatchV1,
  summarizeTcgplayerPricingCompletionRunV1,
} from '../../backend/operations/tcgplayer_pricing_completion_agent_v1.mjs';

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
  const outDir = value('out-dir');
  if (!outDir) throw new Error('--out-dir is required');
  return {
    outDir: path.resolve(outDir),
    runKey: value('run-key') || `pricing-completion-${Date.now()}`,
  };
}

function runBacklogAudit(outRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/audits/tcgplayer_pricing_backlog_v1.mjs',
      `--out-root=${outRoot}`,
    ], {
      cwd: path.resolve('.'),
      env: {
        ...process.env,
        PGOPTIONS: '-c default_transaction_read_only=on',
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(
        `Pricing backlog audit failed with exit ${code}: ${stderr || stdout}`,
      ));
    });
  });
}

function runExactMappingPlan({ sourceRunId, coverageGaps, outRoot }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/audits/tcgplayer_market_exact_mapping_plan_v1.mjs',
      `--source-run-id=${sourceRunId}`,
      `--coverage-gaps=${coverageGaps}`,
      `--out-root=${outRoot}`,
    ], {
      cwd: path.resolve('.'),
      env: {
        ...process.env,
        PGOPTIONS: '-c default_transaction_read_only=on',
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(
        `Exact mapping plan failed with exit ${code}: ${stderr || stdout}`,
      ));
    });
  });
}

function runCandidateEnrichment({ input, output, diagnosticOutput }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/audits/tcgplayer_ollama_candidate_enrichment_v1.mjs',
      `--input=${input}`,
      `--output=${output}`,
      `--diagnostic-output=${diagnosticOutput}`,
      '--candidate-only',
    ], {
      cwd: path.resolve('.'),
      env: {
        ...process.env,
        PGOPTIONS: '-c default_transaction_read_only=on',
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(
        `Ollama candidate enrichment failed with exit ${code}: ${stderr || stdout}`,
      ));
    });
  });
}

async function readOnlyChildDirectory(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory())
    .map((entry) => entry.name).sort();
  if (directories.length !== 1) {
    throw new Error(`Expected one exact mapping plan directory, found ${directories.length}`);
  }
  return path.join(root, directories[0]);
}

async function readJsonl(filePath) {
  const value = await fs.readFile(filePath, 'utf8');
  return value.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function jsonl(rows) {
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function pricingExactPlanFailureCodeV1(error) {
  const message = String(error?.message ?? error ?? '');
  const known = message.match(/\b(?:MAPPING_READER|PLANNER)_[A-Z_]+\b/)?.[0];
  return known ?? 'EXACT_MAPPING_PLAN_UNAVAILABLE';
}

async function heartbeat({ credentials, agent, runKey, status, summary }) {
  return callOperationsRpcV1({
    ...credentials,
    functionName: 'operations_agent_heartbeat_v1',
    body: {
      p_heartbeat: {
        agent_key: agent.agent_key,
        run_key: runKey,
        status,
        summary,
      },
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const credentials = {
    supabaseUrl: process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
  };
  if (!credentials.supabaseUrl || !credentials.serviceRoleKey) {
    throw new Error('PROD_SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  }
  const agent = buildTcgplayerPricingCompletionAgentV1();
  await fs.mkdir(args.outDir, { recursive: true });
  await callOperationsRpcV1({
    ...credentials,
    functionName: 'operations_register_agent_v1',
    body: { p_agent: agent },
  });
  await heartbeat({
    credentials,
    agent,
    runKey: args.runKey,
    status: 'running',
    summary: {
      agent_version: agent.executor_version,
      phase: 'measure_production_backlog',
      canonical_writes: false,
      publication_writes: false,
    },
  });

  try {
    const backlogRoot = path.join(args.outDir, 'backlog');
    const audit = await runBacklogAudit(backlogRoot);
    const report = JSON.parse(await fs.readFile(
      path.join(backlogRoot, 'latest.json'),
      'utf8',
    ));
    const exactPlanRoot = path.join(args.outDir, 'exact_mapping_plan');
    let exactPlan = null;
    let exactPlanDir = null;
    let exactPlanProcess = { status: 'unavailable', stdout: '', error_code: null };
    try {
      const processResult = await runExactMappingPlan({
        sourceRunId: report.run.source_sync_run_id,
        coverageGaps: path.join(backlogRoot, 'latest_pokemon_identity_mapping_gaps.jsonl'),
        outRoot: exactPlanRoot,
      });
      exactPlanDir = await readOnlyChildDirectory(exactPlanRoot);
      const exactPlanSummary = JSON.parse(await fs.readFile(
        path.join(exactPlanDir, 'summary.json'),
        'utf8',
      ));
      exactPlan = {
        ...exactPlanSummary,
        candidates: await readJsonl(path.join(exactPlanDir, 'candidates.jsonl')),
      };
      exactPlanProcess = { status: 'available', stdout: processResult.stdout, error_code: null };
    } catch (error) {
      exactPlanProcess = {
        status: 'unavailable',
        stdout: '',
        error_code: pricingExactPlanFailureCodeV1(error),
      };
    }
    const identityGaps = await readJsonl(
      path.join(backlogRoot, 'latest_identity_mapping_gaps.jsonl'),
    );
    const identityProductQueue = buildTcgplayerIdentityProductQueueV1(identityGaps);
    const mtgIdentityQueue = identityProductQueue.filter((row) =>
      row.source_category_id === 1);
    const pokemonIdentityQueue = identityProductQueue.filter((row) =>
      row.source_category_id === 3);
    const identityProductQueueJsonl = jsonl(identityProductQueue);
    const mtgIdentityQueueJsonl = jsonl(mtgIdentityQueue);
    const pokemonIdentityQueueJsonl = jsonl(pokemonIdentityQueue);
    await Promise.all([
      fs.writeFile(
        path.join(args.outDir, 'identity_product_queue.jsonl'),
        identityProductQueueJsonl,
      ),
      fs.writeFile(
        path.join(args.outDir, 'mtg_identity_product_queue.jsonl'),
        mtgIdentityQueueJsonl,
      ),
      fs.writeFile(
        path.join(args.outDir, 'pokemon_identity_product_queue.jsonl'),
        pokemonIdentityQueueJsonl,
      ),
    ]);
    const ollamaCandidateQueuePath = path.join(
      args.outDir,
      'ollama_identity_candidate_queue.jsonl',
    );
    const enrichmentProcess = await runCandidateEnrichment({
      input: path.join(args.outDir, 'identity_product_queue.jsonl'),
      output: ollamaCandidateQueuePath,
      diagnosticOutput: path.join(args.outDir, 'pokemon_identity_diagnostic_queue.jsonl'),
    });
    const ollamaCandidateQueue = await readJsonl(ollamaCandidateQueuePath);
    const mtgOllamaCandidateQueue = ollamaCandidateQueue.filter((row) =>
      row.source_category_id === 1);
    const pokemonOllamaCandidateQueue = ollamaCandidateQueue.filter((row) =>
      row.source_category_id === 3);
    const mtgOllamaCandidateQueueJsonl = jsonl(mtgOllamaCandidateQueue);
    const pokemonOllamaCandidateQueueJsonl = jsonl(pokemonOllamaCandidateQueue);
    await Promise.all([
      fs.writeFile(
        path.join(args.outDir, 'mtg_ollama_identity_candidate_queue.jsonl'),
        mtgOllamaCandidateQueueJsonl,
      ),
      fs.writeFile(
        path.join(args.outDir, 'pokemon_ollama_identity_candidate_queue.jsonl'),
        pokemonOllamaCandidateQueueJsonl,
      ),
    ]);
    const enrichmentSummary = JSON.parse(await fs.readFile(
      `${ollamaCandidateQueuePath}.summary.json`,
      'utf8',
    ));
    const pokemonReviewedHoldRegistry = JSON.parse(await fs.readFile(
      path.resolve('docs/audits/pokemon_tcgplayer_reviewed_holds_20261026.json'),
      'utf8',
    ));
    const pokemonReviewedHolds = applyPokemonPricingMappingReviewedHoldsV1(
      pokemonOllamaCandidateQueue,
      pokemonReviewedHoldRegistry,
    );
    const pokemonReviewBatch = selectPokemonPricingMappingReviewBatchV1(
      pokemonReviewedHolds.eligible,
    );
    const pokemonReviewHeldByReason = Object.fromEntries(Object.entries({
      ...pokemonReviewBatch.held_by_reason,
      ...pokemonReviewedHolds.held_by_reason,
    }).sort());
    const pokemonReviewHeldCount = pokemonReviewBatch.held_count
      + pokemonReviewedHolds.held_count;
    const summary = {
      ...summarizeTcgplayerPricingCompletionRunV1(report, {
        exactPlan,
        identityProductQueue,
      }),
      ...(!exactPlan ? {
        verified_mapping_candidates: null,
        verified_projected_gap_rows: null,
        blocked_mapping_products: null,
      } : {}),
      ollama_review_candidates: {
        combined: ollamaCandidateQueue.length,
        mtg: mtgOllamaCandidateQueue.length,
        pokemon: pokemonOllamaCandidateQueue.length,
      },
      pokemon_mapping_review: {
        candidate_count: pokemonOllamaCandidateQueue.length,
        selected_count: pokemonReviewBatch.selected_count,
        held_count: pokemonReviewHeldCount,
        held_by_reason: pokemonReviewHeldByReason,
        reviewed_hold_count: pokemonReviewedHolds.held_count,
        reviewed_hold_changed_evidence_count: pokemonReviewedHolds.changed_evidence_count,
      },
      pokemon_mapping_diagnostics: {
        queued_products: enrichmentSummary.pokemon_diagnostic_output?.rows ?? null,
        no_candidate_reasons:
          enrichmentSummary.pokemon_diagnostic_output?.no_candidate_reasons ?? null,
      },
      exact_mapping_plan: {
        status: exactPlanProcess.status,
        error_code: exactPlanProcess.error_code,
      },
    };
    const sourceRunUri = process.env.GITHUB_SERVER_URL
      && process.env.GITHUB_REPOSITORY
      && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null;
    const pokemonReviewWorkItem = buildPokemonPricingMappingReviewWorkItemV1({
      candidates: pokemonReviewBatch.selected,
      sourcePricingRunId: report.run.id,
      sourceSyncRunId: report.run.source_sync_run_id,
      sourceCompletedAt: report.run.completed_at,
      sourceCommitSha: process.env.GITHUB_SHA ?? process.env.COMMIT_SHA ?? null,
      sourceRunUri,
    });
    const pokemonReviewPublication = pokemonReviewWorkItem
      ? await callOperationsRpcV1({
          ...credentials,
          functionName: 'operations_publish_work_item_v1',
          body: { p_item: pokemonReviewWorkItem },
        })
      : null;
    const receipt = {
      schema_version: 'TCGPLAYER_PRICING_COMPLETION_AGENT_RUN_V4',
      observed_at: new Date().toISOString(),
      run_key: args.runKey,
      agent,
      summary,
      backlog_artifact_root: path.relative(args.outDir, backlogRoot).replace(/\\/g, '/'),
      exact_mapping_plan_artifact_root: exactPlanDir
        ? path.relative(args.outDir, exactPlanDir).replace(/\\/g, '/')
        : null,
      identity_product_queue_artifacts: {
        combined: {
          path: 'identity_product_queue.jsonl',
          rows: identityProductQueue.length,
          sha256: sha256(identityProductQueueJsonl),
        },
        mtg: {
          path: 'mtg_identity_product_queue.jsonl',
          rows: mtgIdentityQueue.length,
          sha256: sha256(mtgIdentityQueueJsonl),
        },
        pokemon: {
          path: 'pokemon_identity_product_queue.jsonl',
          rows: pokemonIdentityQueue.length,
          sha256: sha256(pokemonIdentityQueueJsonl),
        },
        ollama_candidate_combined: {
          path: 'ollama_identity_candidate_queue.jsonl',
          rows: ollamaCandidateQueue.length,
          sha256: sha256(jsonl(ollamaCandidateQueue)),
        },
        ollama_candidate_mtg: {
          path: 'mtg_ollama_identity_candidate_queue.jsonl',
          rows: mtgOllamaCandidateQueue.length,
          sha256: sha256(mtgOllamaCandidateQueueJsonl),
        },
        ollama_candidate_pokemon: {
          path: 'pokemon_ollama_identity_candidate_queue.jsonl',
          rows: pokemonOllamaCandidateQueue.length,
          sha256: sha256(pokemonOllamaCandidateQueueJsonl),
        },
        pokemon_diagnostic: {
          path: 'pokemon_identity_diagnostic_queue.jsonl',
          rows: enrichmentSummary.pokemon_diagnostic_output?.rows ?? 0,
          sha256: enrichmentSummary.pokemon_diagnostic_output?.sha256 ?? null,
        },
      },
      audit_stdout: audit.stdout.trim(),
      exact_mapping_plan_stdout: exactPlanProcess.stdout.trim() || null,
      candidate_enrichment_stdout: enrichmentProcess.stdout.trim(),
      candidate_enrichment_summary: enrichmentSummary,
      pokemon_mapping_review: {
        candidate_count: pokemonOllamaCandidateQueue.length,
        selected_count: pokemonReviewBatch.selected_count,
        held_count: pokemonReviewHeldCount,
        held_by_reason: pokemonReviewHeldByReason,
        reviewed_hold_count: pokemonReviewedHolds.held_count,
        reviewed_hold_changed_evidence_count: pokemonReviewedHolds.changed_evidence_count,
        work_item_key: pokemonReviewWorkItem?.work_item_key ?? null,
        plan_fingerprint: pokemonReviewWorkItem?.plan_fingerprint ?? null,
        publication_receipt: pokemonReviewPublication,
      },
      boundaries: {
        pricing_database_reads: true,
        operations_control_plane_writes: true,
        canonical_database_writes: false,
        publication_writes: false,
        customer_state_writes: false,
      },
    };
    await fs.writeFile(
      path.join(args.outDir, 'agent_run.json'),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
    await heartbeat({
      credentials,
      agent,
      runKey: args.runKey,
      status: 'succeeded',
      summary,
    });
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  } catch (error) {
    const failure = {
      agent_version: agent.executor_version,
      error_class: error instanceof Error ? error.name : 'UnknownError',
      phase: 'measure_production_backlog',
      canonical_writes: false,
      publication_writes: false,
    };
    await fs.writeFile(
      path.join(args.outDir, 'agent_failure.json'),
      `${JSON.stringify({ ...failure, message: String(error?.message ?? error) }, null, 2)}\n`,
    );
    await heartbeat({
      credentials,
      agent,
      runKey: args.runKey,
      status: 'failed',
      summary: failure,
    }).catch(() => {});
    throw error;
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-pricing-completion-agent] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
