// Current 395-migration candidate: rollback-only checks, no reset or remote target.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sha256} from '../schema/column_order_reconciliation_v1.mjs';
import {root,localSql} from '../schema/storefront_release_schema_v1.mjs';
import {guard,toolHashes} from '../schema/storefront_release_guard_v1.mjs';

assert.equal(process.argv.length,2,'No target or SQL arguments accepted');
const plan=guard({full:true});
const replay=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/vendor_storefront_release_package_v1/replay.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,plan.sourceHashes);
assert.deepEqual(replay.toolHashes,toolHashes(),'Replay source/tool proof is stale');
const ledger=JSON.parse(localSql('select jsonb_agg(version order by version) from supabase_migrations.schema_migrations;'));
assert.deepEqual(ledger,Object.keys(plan.sourceHashes).sort().map(n=>n.match(/^\d+/)[0]));
const files=['vault_unassigned_add_v1.sql','storefront_vault_add_integration_v1.sql','storefront_release_custom_v1.sql'];
const results=[];
for(const file of files){
  const sql=fs.readFileSync(path.join(root,'tests/sql',file),'utf8');
  assert.match(sql,/^begin;/m);assert.match(sql,/rollback;\s*$/);
  localSql(sql);results.push({file,sha256:sha256(sql),passed:true});
  console.log(`PASS ${file} (rolled back)`);
}
guard({full:true});
assert.equal(localSql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from public.vendor_store_rollout;"),'false|false|false');
const output=path.join(root,'docs/audits/vendor_storefront_integration_review_v1');
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'sql-tests.json'),JSON.stringify({checkedAt:new Date().toISOString(),project:plan.project,migrations:ledger.length,sourceHashes:plan.sourceHashes,runnerSha256:sha256(fs.readFileSync(new URL(import.meta.url))),results,remainingUsers:0,reset:false,productionAccess:false},null,2));
