import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const source = fs.readFileSync(
  new URL('../../apps/web/src/app/founder/operations/actions.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const workItemId = '479e6ab0-dba4-48a0-97df-41cae23427c3';

function load({ user = { id: 'founder-user' }, state = 'ready_for_review', rpcError = null } = {}) {
  let adminReads = 0;
  let rpcCalls = 0;
  const rpcParams = [];
  const revalidated = [];
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    FormData,
    Date,
    require(name) {
      if (name === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000001' };
      if (name === 'next/cache') return { revalidatePath: (path) => revalidated.push(path) };
      if (name === '@/lib/founder/requireFounderAccess') return { getFounderAuthUser: async () => user };
      if (name === '@/lib/supabase/admin') return { createServerAdminClient() {
        adminReads++;
        const query = {
          select() { return query; },
          eq(column, value) { assert.equal(column, 'id'); assert.equal(value, workItemId); return query; },
          async maybeSingle() {
            return { data: { id: workItemId, version: 90, state, plan_fingerprint: 'abc123', expires_at: '2026-11-01T00:00:00Z' }, error: null };
          },
        };
        return { from(table) { assert.equal(table, 'founder_work_items'); return query; } };
      } };
      if (name === '@/lib/supabase/server') return { createServerComponentClient: async () => ({
        async rpc(rpcName, params) {
          rpcCalls++;
          assert.equal(rpcName, 'founder_operations_decide_v1');
          rpcParams.push(params);
          return rpcError
            ? { data: null, error: { message: rpcError } }
            : { data: [{ command_status: 'queued' }], error: null };
        },
      }) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    decide: module.exports.decideFounderOperationsWorkItem,
    adminReads: () => adminReads,
    rpcCalls: () => rpcCalls,
    rpcParams,
    revalidated,
  };
}

function form(decision = 'approve') {
  const data = new FormData();
  data.set('work_item_id', workItemId);
  data.set('decision', decision);
  data.set('p_expected_version', '1');
  data.set('p_expected_fingerprint', 'attacker-controlled');
  return data;
}

test('founder decision re-reads the frozen plan and calls the authenticated RPC with trusted concurrency fields', async () => {
  const harness = load();
  const result = await harness.decide(null, form());
  assert.equal(result.ok, true);
  assert.equal(harness.adminReads(), 1);
  assert.equal(harness.rpcCalls(), 1);
  assert.equal(harness.rpcParams[0].p_expected_version, 90);
  assert.equal(harness.rpcParams[0].p_expected_fingerprint, 'abc123');
  assert.equal(harness.rpcParams[0].p_decision, 'approve');
  assert.equal(harness.rpcParams[0].p_client_schema_version, 'FOUNDER_OPERATIONS_MOBILE_V1');
  assert.deepEqual(harness.revalidated, ['/founder/operations', '/founder']);
});

test('missing founder authentication stops before privileged reads', async () => {
  const harness = load({ user: null });
  const result = await harness.decide(null, form());
  assert.equal(result.ok, false);
  assert.equal(harness.adminReads(), 0);
  assert.equal(harness.rpcCalls(), 0);
});

test('a work item that changed state is rejected before the RPC', async () => {
  const harness = load({ state: 'succeeded' });
  const result = await harness.decide(null, form());
  assert.equal(result.ok, false);
  assert.match(result.message, /no longer actionable/i);
  assert.equal(harness.rpcCalls(), 0);
});

test('recent-auth failures return a concrete recovery instruction', async () => {
  const harness = load({ rpcError: 'recent_authentication_required' });
  const result = await harness.decide(null, form());
  assert.equal(result.ok, false);
  assert.match(result.message, /last 15 minutes/i);
});
