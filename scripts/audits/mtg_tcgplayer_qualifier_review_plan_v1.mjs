#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  buildReviewedMtgTcgplayerQualifierPlanV1,
} from '../../backend/pricing/mtg_tcgplayer_qualifier_review_plan_v1.mjs';

function value(argv, name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function jsonl(rows) {
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return {
    raw,
    rows: raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--apply') || argv.includes('--run')) {
    throw new Error('MTG qualifier review planning is read-only');
  }
  const inputPath = path.resolve(value(argv, 'input'));
  const outDir = path.resolve(value(argv, 'out-dir'));
  const sourceCommit = value(argv, 'source-commit').toLocaleLowerCase('en-US');
  if (!value(argv, 'input') || !value(argv, 'out-dir') || !sourceCommit) {
    throw new Error('--input, --out-dir and --source-commit are required');
  }
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) {
    throw new Error('--source-commit must be a full 40-character Git SHA');
  }
  const input = await readJsonl(inputPath);
  const plan = buildReviewedMtgTcgplayerQualifierPlanV1(input.rows);
  const ready = jsonl(plan.ready);
  const held = jsonl(plan.held);
  const summary = {
    ...plan,
    ready: undefined,
    held: undefined,
    created_at: new Date().toISOString(),
    source_commit: sourceCommit,
    input: {
      path: inputPath,
      sha256: sha256(input.raw),
    },
  };
  const summaryBytes = `${JSON.stringify(summary, null, 2)}\n`;
  const hashes = {
    'summary.json': sha256(summaryBytes),
    'ready_mappings.jsonl': sha256(ready),
    'held_rows.jsonl': sha256(held),
  };
  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outDir, 'summary.json'), summaryBytes, { flag: 'wx' }),
    fs.writeFile(path.join(outDir, 'ready_mappings.jsonl'), ready, { flag: 'wx' }),
    fs.writeFile(path.join(outDir, 'held_rows.jsonl'), held, { flag: 'wx' }),
    fs.writeFile(
      path.join(outDir, 'artifact_hashes.json'),
      `${JSON.stringify(hashes, null, 2)}\n`,
      { flag: 'wx' },
    ),
  ]);
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    counts: summary.counts,
    manifest_sha256: summary.manifest_sha256,
    boundaries: summary.boundaries,
    artifact_root: outDir,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[mtg-tcgplayer-qualifier-review-plan] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});

