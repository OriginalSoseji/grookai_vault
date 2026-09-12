import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
import { assertCollectorStagingTarget } from '../src/lib/collectorStaging.mjs';

const root = new URL('../../../', import.meta.url);
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(branch, 'preview/collector-authenticated-20260910');
const status = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', 'supabase status -o json'],
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
assertCollectorStagingTarget(status.API_URL);
const port = execFileSync('docker', ['port', 'supabase_db_ycdxbpibncqcchqiihfz', '5432'], { encoding: 'utf8' });
assert.match(port, /:54330\b/);
const sql = `begin read only;
select json_build_object(
 'cards',(select count(*) from public.card_prints),
 'printings',(select count(*) from public.card_printings),
 'sets',(select count(*) from public.sets),
 'traits',(select count(*) from public.card_print_traits),
 'source_observations',(select count(*) from public.tcgcsv_source_price_daily_observations),
 'mappings',(select count(*) from public.external_mappings),
 'pipeline_runs',(select count(*) from public.market_price_pipeline_runs),
 'snapshots',(select count(*) from public.market_price_publication_snapshots),
 'publication_pointers',(select count(*) from public.market_price_current_publication),
 'set_binder_authority_exists',to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is not null,
 'pricing_rpc_exists',to_regprocedure('public.get_market_pricing_read_model_v1(uuid[],uuid[])') is not null);
rollback;`;
function snapshot() {
  const text = execFileSync('docker', ['exec', '-i', 'supabase_db_ycdxbpibncqcchqiihfz',
    'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'],
  { input: sql, encoding: 'utf8' }).trim();
  return JSON.parse(text);
}
const before = snapshot();
assert.equal(before.cards, 326, 'Not the authorized local sample');
assert.equal(before.printings, 491);
assert.equal(before.pricing_rpc_exists, true);
const source = readFileSync(new URL('../src/lib/pricing/marketPricingReadModelV1.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
} }).outputText, { exports, console });

const credentialPath = path.resolve(process.argv[2] ?? '');
const artifactRoot = 'C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910';
assert.ok(credentialPath.toLowerCase().startsWith(path.resolve(artifactRoot).toLowerCase() + path.sep));
const credentials = JSON.parse(readFileSync(credentialPath, 'utf8'));
assert.match(credentials.email, /^collector-staging-\d+-\d+@example\.invalid$/);
assert.equal(credentials.url, 'http://127.0.0.1:3167/login');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const guest = createClient(status.API_URL, status.ANON_KEY, options);
const user = createClient(status.API_URL, status.ANON_KEY, options);
const login = await user.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
if (login.error) throw login.error;
const targets = { cardPrintIds: ['98d26f6e-83e8-4990-8e42-ea2e3aadb111'],
  cardPrintingIds: ['92f0c41e-1f2a-41ed-957d-ea973012bb5c'], throwOnError: true };
const report = { timestamp: new Date().toISOString(), branch, endpoint: status.API_URL,
  mode: 'local-read-only-pricing-audit', readerSha256: createHash('sha256').update(source).digest('hex'), before,
  evidence: [], blockers: [], productionAccess: false, fixtureWrites: 0, workersStarted: 0 };
try {
  for (const [role, client] of [['guest', guest], ['signed-in synthetic collector', user]]) {
    try {
      const rows = await exports.getMarketPricingReadModelV1(client, targets);
      assert.equal(rows.length, 0, 'This empty-evidence audit must not silently accept unexpected publication data');
      report.evidence.push({ role, acceptedPrices: rows.length, result: 'unavailable, no fabricated price' });
    } catch (error) {
      if (role === 'guest' && error.code === '42501') {
        report.evidence.push({ role, acceptedPrices: 0, result: 'anonymous pricing explicitly denied' });
      } else {
        report.blockers.push({ role, error: error.message, code: error.code ?? null });
      }
    }
  }
  report.after = snapshot();
  assert.deepEqual(report.after, before);
  if (before.snapshots === 0) report.blockers.push({ gate: 'positive price browser proof',
    reason: 'No source observations, mappings or published snapshots in the local sample. Unit fixtures are not publication proof.' });
  if (!before.set_binder_authority_exists) report.blockers.push({ gate: 'Set Binder',
    reason: 'binder_set_slots_authority_v1(uuid) is absent; custom Binders do not prove Set Binders.' });
} finally {
  await user.auth.signOut({ scope: 'local' });
  const out = `${artifactRoot}/pricing-readiness-${Date.now()}`;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/result.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ artifact: `${out}/result.json`, evidence: report.evidence, blockers: report.blockers }));
}
