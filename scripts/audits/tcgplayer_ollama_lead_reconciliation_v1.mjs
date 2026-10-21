#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { reconcileTcgplayerOllamaLeadsV1 } from '../../backend/pricing/tcgplayer_ollama_lead_reconciliation_v1.mjs';

function value(argv, name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3).trim() ?? '';
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function jsonl(rows) {
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--apply') || argv.includes('--run')) throw new Error('Lead reconciliation is read-only');
  const inputPath = path.resolve(value(argv, 'input'));
  const triagePath = path.resolve(value(argv, 'triage'));
  const outDir = path.resolve(value(argv, 'out-dir'));
  if (!value(argv, 'input') || !value(argv, 'triage') || !value(argv, 'out-dir')) {
    throw new Error('--input, --triage, and --out-dir are required');
  }
  const result = reconcileTcgplayerOllamaLeadsV1(
    await readJsonl(inputPath),
    await readJsonl(triagePath),
  );
  await fs.mkdir(outDir, { recursive: true });
  const files = {
    'review_queue.jsonl': result.reviewQueue,
    'fast_track_review.jsonl': result.fastTrack,
    'manual_review.jsonl': result.manualReview,
    'collision_holds.jsonl': result.collisionHolds,
  };
  await Promise.all(Object.entries(files).map(([name, rows]) =>
    fs.writeFile(path.join(outDir, name), jsonl(rows))));
  const summary = {
    schema_version: 'TCGPLAYER_OLLAMA_LEAD_RECONCILIATION_V1',
    created_at: new Date().toISOString(),
    model_leads: result.leads.length,
    unique_target_review_queue: result.reviewQueue.length,
    fast_track_review: result.fastTrack.length,
    manual_review: result.manualReview.length,
    collision_holds: result.collisionHolds.length,
    collision_target_count: new Set(result.collisionHolds.map((row) => row.target.candidate_id)).size,
    boundaries: {
      database_reads: false,
      database_writes: false,
      mapping_authority: false,
      publication_authority: false,
      customer_state_writes: false,
    },
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[tcgplayer-ollama-lead-reconciliation] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
