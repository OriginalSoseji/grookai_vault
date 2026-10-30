#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import {
  buildPricingCompletionExactMappingSnapshotV1,
  pricingCompletionSnapshotClientTargetV1,
  PRICING_COMPLETION_PROJECT_REF_V1,
  sha256PricingCompletionSnapshotInputV1,
} from '../../backend/pricing/pricing_completion_exact_mapping_snapshot_v1.mjs';
import {
  groupGapRows,
  loadDirectTargets,
  loadGroupConsensus,
  loadSetTargets,
  loadSourceContext,
  resolveAuthorities,
} from './tcgplayer_market_exact_mapping_plan_v1.mjs';

const { Client } = pg;

function value(argv, name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
}

function parseArgs(argv) {
  const sourceRunId = value(argv, 'source-run-id');
  const coverageGaps = value(argv, 'coverage-gaps');
  const output = value(argv, 'output');
  if (!sourceRunId) throw new Error('snapshot_source_run_required');
  if (!coverageGaps) throw new Error('snapshot_coverage_gaps_required');
  if (!output) throw new Error('snapshot_output_required');
  return {
    sourceRunId,
    coverageGaps: path.resolve(coverageGaps),
    output: path.resolve(output),
  };
}

function connectionString() {
  return process.env.SUPABASE_DB_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || '';
}

function sslConfig(url) {
  const parsed = new URL(url);
  if (['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) return false;
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return ca ? { rejectUnauthorized: true, ca, servername: parsed.hostname }
    : { rejectUnauthorized: true, servername: parsed.hostname };
}

async function readGaps(filePath) {
  const bytes = await fs.readFile(filePath);
  const rows = bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  if (rows.length === 0
    || rows.some((row) => row.policy_version !== 'TCGPLAYER_MARKET_COVERAGE_POLICY_V1_3')) {
    throw new Error('snapshot_coverage_artifact_invalid');
  }
  return { bytes, rows };
}

export async function runTcgplayerMarketExactMappingSnapshotV1(argv) {
  const args = parseArgs(argv);
  const url = connectionString();
  if (!url) throw new Error('snapshot_database_url_required');
  const target = pricingCompletionSnapshotClientTargetV1(url);
  const { bytes, rows } = await readGaps(args.coverageGaps);
  const groupedGaps = groupGapRows(rows);
  const client = new Client({
    connectionString: target.connectionString,
    ssl: sslConfig(target.connectionString),
    application_name: 'tcgplayer-exact-mapping-snapshot-v1',
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 125_000,
    options: '-c default_transaction_read_only=on',
  });
  await client.connect();
  try {
    if (client.connection?.stream?.authorized !== true) {
      throw new Error('snapshot_tls_not_authorized');
    }
    await client.query('begin isolation level repeatable read read only');
    await client.query("set local lock_timeout = '3s'");
    const boundary = (await client.query(
      `select current_setting('transaction_read_only') as transaction_read_only,
              current_setting('transaction_isolation') as transaction_isolation`,
    )).rows[0];
    if (boundary?.transaction_read_only !== 'on'
      || boundary?.transaction_isolation !== 'repeatable read') {
      throw new Error('snapshot_read_only_boundary_failed');
    }
    const { sourceRun, sources } = await loadSourceContext(client, args.sourceRunId, groupedGaps);
    const [directTargetsByProduct, consensusByGroup] = await Promise.all([
      loadDirectTargets(client, sources),
      loadGroupConsensus(client, sources),
    ]);
    const { authorities, targetSetIds } = await resolveAuthorities(
      client,
      sources,
      consensusByGroup,
    );
    const setTargets = await loadSetTargets(client, targetSetIds);
    await client.query('rollback');
    const snapshot = buildPricingCompletionExactMappingSnapshotV1({
      capturedAt: new Date().toISOString(),
      sourceSyncRunId: args.sourceRunId,
      coverageGapsSha256: sha256PricingCompletionSnapshotInputV1(bytes),
      databaseTarget: {
        kind: 'production_operator_snapshot',
        project_ref: PRICING_COMPLETION_PROJECT_REF_V1,
        verified_tls: true,
        transaction_read_only: true,
        isolation: 'repeatable read',
      },
      sourceRun,
      sources,
      directTargetsByProduct,
      consensusByGroup,
      authorities,
      setTargets,
    });
    const output = `${JSON.stringify(snapshot, null, 2)}\n`;
    await fs.mkdir(path.dirname(args.output), { recursive: true });
    await fs.writeFile(args.output, output, { flag: 'wx', mode: 0o600 });
    return {
      schema_version: snapshot.schema_version,
      output: args.output,
      sha256: sha256PricingCompletionSnapshotInputV1(output),
      counts: snapshot.counts,
      database_writes: 0,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runTcgplayerMarketExactMappingSnapshotV1(process.argv.slice(2)).then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }).catch((error) => {
    const code = String(error?.message ?? 'snapshot_failed');
    const safe = /^[a-z0-9_]+$/i.test(code) ? code : 'snapshot_failed';
    process.stderr.write(`Exact mapping snapshot failed: ${safe}\n`);
    process.exitCode = 1;
  });
}
