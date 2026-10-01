import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import { buildPokemonWarehouseWorklist, pokemonCoverageDatabaseTarget, readPokemonWarehouseSnapshot, reconcilePokemonWarehouse } from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local', quiet: true });
const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out-dir='));
if (!outArg || !outArg.slice(10).trim() || args.filter(a => a.startsWith('--out-dir=')).length !== 1 ||
    args.some(a => !a.startsWith('--out-dir=') && a !== '--require-complete')) {
  throw new Error('Usage: --out-dir=<directory> [--require-complete]');
}
const outDir = path.resolve(outArg.slice(10));
await fs.mkdir(outDir, { recursive: false });
let client;
let connected = false;
try {
  const url = pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL);
  client = new pg.Client({ connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(process.env.SUPABASE_DB_CA_CERT ? { ca: process.env.SUPABASE_DB_CA_CERT } : {}) },
    application_name: 'pokemon_warehouse_coverage_v1_read_only', connectionTimeoutMillis: 15000,
    options: '-c default_transaction_read_only=on',
  });
  await client.connect(); connected = true;
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='45s'");
  const { rows: [counts] } = await client.query(`select
    (select count(*)::int from card_prints) cards, (select count(*)::int from sets) sets,
    (select count(*)::int from card_print_traits) traits`);
  if (counts.cards < 40000 || counts.sets < 150 || counts.traits < 5000) throw new Error('Canonical environment count gate failed');
  const snapshot = await readPokemonWarehouseSnapshot(client);
  if (!snapshot.products.length) throw new Error('Empty Pokemon warehouse inventory');
  const report = reconcilePokemonWarehouse(snapshot, { observedAt: new Date().toISOString() });
  await client.query('ROLLBACK');
  await fs.writeFile(path.join(outDir, 'coverage.json'), `${JSON.stringify(report)}\n`);
  await fs.writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify({ ...report, rows: undefined }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'gamestop.json'), `${JSON.stringify(report.rows.filter(r => r.retailer === 'gamestop'), null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'worklist.json'), `${JSON.stringify(buildPokemonWarehouseWorklist(report))}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  if (args.includes('--require-complete') && report.summary.unresolved_count) process.exitCode = 2;
} catch (error) {
  if (connected) await client.query('ROLLBACK').catch(() => {});
  await fs.writeFile(path.join(outDir, 'failure.json'), `${JSON.stringify({ status: 'failed', database_writes: false,
    observed_at: new Date().toISOString(), error: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted database URL]') }, null, 2)}\n`);
  throw error;
} finally { if (client) await client.end(); }
