// Narrow local release gate. No production mutation, arbitrary target, or arbitrary SQL input.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256,RECONCILIATION_MIGRATIONS} from './column_order_reconciliation_v1.mjs';
import {root,workdir,project,pending,localSql,localSnapshot,remoteSnapshot,compareSnapshots,snapshotSql} from './storefront_release_schema_v1.mjs';
import {guard,toolHashes} from './storefront_release_guard_v1.mjs';

assert.equal(process.argv.length,3,'one fixed phase required');
const phase=process.argv[2];assert.ok(['baseline','replay'].includes(phase));
const plan=guard();
const tools=toolHashes();
const out=path.join(root,'docs/audits/vendor_storefront_release_package_v1');
const expected=Object.keys(plan.sourceHashes).sort().map(n=>({version:n.match(/^\d+/)[0]}));
for(const binding of Object.values(RECONCILIATION_MIGRATIONS))assert.equal(sha256(fs.readFileSync(path.join(root,'supabase/migrations',binding.file),'utf8').replaceAll('\r\n','\n')),binding.lf_sha256);
const report={phase,startedAt:new Date().toISOString(),project,sourceHashes:plan.sourceHashes,toolHashes:tools,productionApplicationWrites:0,applyAuthorized:false};
try {
  if(phase==='baseline'){
    const a=localSnapshot(),b=remoteSnapshot();
    assert.deepEqual(a.LEDGER,expected.slice(0,-1));assert.deepEqual(b.LEDGER,a.LEDGER);
    assert.ok(b.sanity.cards>=40000&&b.sanity.sets>=150&&b.sanity.traits>=5000,'production maturity mismatch');
    report.productionSanity=b.sanity;
    fs.writeFileSync(path.join(workdir,'formal-baseline-local-private.json'),JSON.stringify(a));
    fs.writeFileSync(path.join(workdir,'formal-baseline-remote-private.json'),JSON.stringify(b));
    report.comparison=await compareSnapshots(a,b,{reconcile:true,output:path.join(workdir,'formal-baseline-diff')});
    report.snapshotQuerySha256=sha256(snapshotSql);report.applied=394;report.pending=['20260919050000'];
    report.cliAuthenticationNote='CLI initializes its login role; application/schema query runs in a repeatable-read read-only transaction.';
  }else{
    const baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline.json')));
    assert.equal(baseline.status,'passed');assert.deepEqual(baseline.sourceHashes,plan.sourceHashes);assert.deepEqual(baseline.toolHashes,tools);
    assert.ok(Date.now()-Date.parse(baseline.finishedAt)<86400000,'fresh baseline proof required');
    assert.deepEqual(localSnapshot().LEDGER,expected.slice(0,-1),'replay must begin from empty baseline');
    fs.copyFileSync(path.join(root,'supabase/migrations',pending),path.join(workdir,'supabase/migrations',pending),fs.constants.COPYFILE_EXCL);
    guard({full:true});
    const env={...process.env};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
    const run=spawnSync('supabase',['db','reset','--workdir',workdir,'--network-id',project,'--local','--no-seed','--yes'],{env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
    const log=(run.stdout??'')+(run.stderr??'');fs.writeFileSync(path.join(workdir,'formal-reset.log'),log);
    assert.equal(run.status,0,'isolated reset failed; inspect private formal-reset.log');guard({full:true});
    const final=localSnapshot();assert.deepEqual(final.LEDGER,expected);
    fs.writeFileSync(path.join(workdir,'formal-final-private.json'),JSON.stringify(final));
    const footprint=JSON.parse(localSql(fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8')));
    const previous=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/vendor_storefront_preflight_v1/local-schema-footprint.json')));
    const original=previous.objects?previous:previous.rows[0].receipt;
    assert.deepEqual(footprint.objects,original.objects,'consolidation changed original schema, functions, grants or policies');
    assert.equal(localSql('select app_enabled::text||\'|\'||web_enabled::text||\'|\'||custom_enabled::text from public.vendor_store_rollout;'),'false|false|false','rollout must remain off');
    report.fullChainResetReplay=true;report.applied=395;report.equivalentOriginalSchemaObjects=footprint.objects.length;report.resetLogSha256=sha256(log);
    report.footprintSha256=sha256(JSON.stringify(footprint.objects));
    fs.writeFileSync(path.join(out,'release-schema-footprint.json'),JSON.stringify(footprint,null,2));
  }
  assert.deepEqual(toolHashes(),tools,'tools changed during gate');
  report.status='passed';
}catch(error){report.status='failed';report.failure=error.message.split('\n')[0];process.exitCode=1;}
report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,`${phase}.json`),JSON.stringify(report,null,2));
console.log(JSON.stringify({phase,status:report.status,failure:report.failure,applied:report.applied,equivalentOriginalSchemaObjects:report.equivalentOriginalSchemaObjects,productionApplicationWrites:0}));
