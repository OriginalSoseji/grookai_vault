import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { verifiedSupervisorDatabaseOptionsV1 } from '../audits/mtg_catalog_supervisor_v1.mjs';
import { checkMtgWorkerCapacityV1 } from './mtg_catalog_readonly_worker_v1.mjs';
import { CATALOG_COMPONENTS, CATALOG_EVIDENCE_VERSION, catalogHash } from '../../backend/operations/background_catalog_evidence_v1.mjs';
import { collectCatalogReport } from '../../backend/operations/background_catalog_queries_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT = '/var/lib/grookai/catalog-supervision';

export async function auditCatalog(client, component) {
  await client.connect();
  try {
    if (client.connection.stream.authorized !== true) throw new Error('Catalog TLS verification failed');
    // The session pooler may ignore startup options. Establish and verify the
    // boundary on the connected session before any catalog read.
    await client.query('set session default_transaction_read_only=on');
    await client.query("begin isolation level repeatable read read only; set local statement_timeout='60s'; set local lock_timeout='3s'");
    const mode = (await client.query("select current_setting('transaction_read_only') read_only, current_setting('default_transaction_read_only') session_read_only, current_setting('statement_timeout') statement_timeout, current_setting('lock_timeout') lock_timeout")).rows[0];
    if (mode.read_only !== 'on' || mode.session_read_only !== 'on') throw new Error('Catalog database connection is not read-only');
    if (!['1min', '60s'].includes(mode.statement_timeout) || mode.lock_timeout !== '3s') throw new Error('Catalog database deadlines were not established');
    const report = await collectCatalogReport(client, component);
    await client.query('rollback');
    return report;
  } finally { await client.end(); }
}

export async function runCatalogWorker({ component = process.env.GROOKAI_CATALOG_COMPONENT,
  output = OUTPUT, root = ROOT, preflight, execute } = {}) {
  if (!CATALOG_COMPONENTS.includes(component)) throw new Error('Unsupported catalog component');
  const started = new Date().toISOString(), runId = `${started.replace(/[:.]/g, '-')}-${randomUUID()}`;
  const lane = path.join(output, component), run = path.join(lane, 'runs', runId);
  fs.mkdirSync(run, { recursive: true });
  const receipt = { schema_version: CATALOG_EVIDENCE_VERSION, component, run_id: runId,
    started_at: started, status: 'running', producer_commit_sha: null,
    trigger: process.env.INVOCATION_ID ? 'systemd' : 'operator' };
  const json = value => JSON.stringify(value, null, 2) + '\n';
  const point = () => {
    const pending = path.join(lane, `${runId}.pending`);
    fs.writeFileSync(pending, json(receipt), { flag: 'wx' });
    fs.renameSync(pending, path.join(lane, 'latest.json'));
  };
  fs.writeFileSync(path.join(run, 'attempt.json'), json(receipt), { flag: 'wx' });
  point();
  let finished = false;
  const finish = (status, code = null) => {
    if (finished) return;
    finished = true;
    Object.assign(receipt, { status, completed_at: new Date().toISOString(), error_code: code });
    fs.writeFileSync(path.join(run, 'receipt.json'), json(receipt), { flag: 'wx' });
    point();
  };
  const interrupted = () => { finish('failed', 'INTERRUPTED'); process.exit(143); };
  process.once('SIGTERM', interrupted); process.once('SIGINT', interrupted);
  try {
    receipt.producer_commit_sha = fs.readFileSync(path.join(root, 'RELEASE_COMMIT_SHA'), 'utf8').trim();
    if (!/^[a-f0-9]{40}$/.test(receipt.producer_commit_sha)) throw new Error('Invalid immutable runtime SHA');
    if (process.env.CATALOG_AUTOMATION_MODE !== 'shadow-only') throw new Error('Catalog worker requires shadow-only mode');
    receipt.preflight = preflight ? preflight() : checkMtgWorkerCapacityV1({
      freeBytes: fs.statfsSync(output).bavail * fs.statfsSync(output).bsize,
      control: JSON.parse(fs.readFileSync('/var/lib/grookai/production-control-plane/current/live_control_plane_v1.json', 'utf8')),
    });
    point();
    const report = execute ? await execute(component) : await auditCatalog(new Client({
      ...verifiedSupervisorDatabaseOptionsV1(process.env.SUPABASE_DB_URL,
        fs.readFileSync(process.env.CATALOG_SUPERVISOR_CA_FILE, 'utf8')),
      application_name: `grookai-catalog-${component}`,
    }), component);
    const bytes = json(report);
    fs.writeFileSync(path.join(run, 'report.json'), bytes, { flag: 'wx' });
    receipt.report_sha256 = catalogHash(bytes);
    finish('completed');
    return receipt;
  } catch (error) {
    // Do not persist provider error text: it can contain connection credentials.
    finish('failed', 'CATALOG_AUDIT_FAILED');
    throw error;
  } finally {
    process.removeListener('SIGTERM', interrupted); process.removeListener('SIGINT', interrupted);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('Scheduled catalog worker accepts no CLI arguments');
  runCatalogWorker().catch(() => { console.error('Catalog audit failed; inspect its saved receipt.'); process.exitCode = 1; });
}
