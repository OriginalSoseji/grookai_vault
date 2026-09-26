// Fixed retained synthetic project only; no env files or shared/remote databases.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 2);
const cfg = JSON.parse(fs.readFileSync(path.join(root, '.local/storefront/supabase-verification/status-private.json')));
assert.equal(cfg.API_URL, 'http://127.0.0.1:16421');
assert.equal(new URL(cfg.DB_URL).hostname, '127.0.0.1');
assert.equal(new URL(cfg.DB_URL).port, '16422');
const replay = JSON.parse(fs.readFileSync(path.join(root, 'docs/audits/vendor_storefront_supabase_v1/replay-result.json')));
assert.equal(fs.readdirSync(path.join(root, 'supabase/migrations')).filter(x => x.endsWith('.sql')).length, 397);
for (const [file, hash] of Object.entries(replay.sourceHashes))
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, 'supabase/migrations', file))).digest('hex'), hash, file);
const db = new pg.Client({ connectionString: cfg.DB_URL, connectionTimeoutMillis: 3000 });
await db.connect();
const results = [];
try {
  assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes, '0');
  assert.equal((await db.query('select count(*) n from supabase_migrations.schema_migrations')).rows[0].n, '397');
  for (const file of ['vault_unassigned_add_v1.sql', 'storefront_vault_add_integration_v1.sql']) {
    const sql = fs.readFileSync(path.join(root, 'tests/sql', file), 'utf8');
    await db.query(sql.replace(/^\\set ON_ERROR_STOP on\r?\n/, ''));
    results.push({ file, passed: true, sha256: createHash('sha256').update(sql).digest('hex') });
    console.log('PASS ' + file + ' (rolled back)');
  }
} finally {
  await db.query('rollback');
  await db.end();
  fs.writeFileSync(path.join(root, '.local/integration/vault-add-sql-receipt.json'), JSON.stringify({ recordedAt: new Date().toISOString(), migrationHashesVerified: 397, results }, null, 2) + '\n');
}
