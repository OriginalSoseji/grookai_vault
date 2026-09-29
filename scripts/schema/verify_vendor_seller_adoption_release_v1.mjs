// Fixed read-only gate for the single408-to409 seller adoption migration.
// Existing full replay/upgrade artifacts are retained; never reset a lab here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,3);
const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_seller_link_20260928');
const base=root+'.local/integration/seller-adoption-v1',project='grookai-seller-link-20260928';
const pending='20260928213000',candidate=pending+'_vendor_seller_adoption_v1.sql';
const read=file=>JSON.parse(fs.readFileSync(file)),hash=value=>createHash('sha256').update(value).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
assert.equal(git('branch','--show-current'),'feature/store-seller-link-20260928');
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
assert.equal(Object.keys(sources).length,409);assert.ok(sources[candidate]);
const replay=read(base+'/replay-409/receipt.json'),upgrade=read(base+'/upgrade-proof/receipt.json');
assert.equal(replay.status,'passed');assert.equal(replay.fullReplay,true);assert.equal(replay.noOpPush,true);
assert.equal(replay.migrations,409);assert.equal(replay.project,project);assert.deepEqual(replay.sourceHashes,sources);
const intent=read(base+'/replay-409/intent.json');assert.equal(intent.consumed,true);assert.deepEqual(intent.sourceHashes,sources);
assert.equal(hash(fs.readFileSync(base+'/replay-409/supabase/config.toml')),intent.configSha256);
for(const [name,digest]of Object.entries(sources))assert.equal(hash(fs.readFileSync(base+'/replay-409/supabase/migrations/'+name)),digest);
assert.equal(upgrade.status,'passed');assert.equal(upgrade.fromMigrations,408);assert.equal(upgrade.toMigrations,409);
assert.equal(upgrade.schemaParity,true);assert.equal(upgrade.retainedDataProof,true);assert.deepEqual(upgrade.sourceHashes,sources);
assert.deepEqual(upgrade.retainedSellerStates,['bound','closing','creating','deauthorized','reserved']);
assert.deepEqual(read(base+'/upgrade-proof/retained-before.private.json'),read(base+'/upgrade-proof/retained-after.private.json'));
let httpDirectory,shipcheckDirectory;
if(phase==='PrePush'){
 assert.equal(git('status','--porcelain'),'','PrePush requires clean committed source');
 git('merge-base','--is-ancestor','origin/main','HEAD');
 const head=git('rev-parse','HEAD');
 const qualified=prefix=>fs.readdirSync(base).filter(name=>new RegExp('^'+prefix+'-\\d+$').test(name)).sort().reverse().find(name=>{
  const file=base+'/'+name+'/receipt.json';if(!fs.existsSync(file))return false;
  const receipt=read(file);return receipt.status==='passed'&&receipt.commit===head&&receipt.sourceDirty===false;
 });
 httpDirectory=qualified('http-proof');shipcheckDirectory=qualified('shipcheck');
 assert.ok(httpDirectory&&shipcheckDirectory,'Require current clean-source Auth/HTTP and normal shipcheck receipts');
 const http=read(base+'/'+httpDirectory+'/receipt.json'),shipcheck=read(base+'/'+shipcheckDirectory+'/receipt.json');
 for(const receipt of [http,shipcheck]){assert.deepEqual(receipt.sourceHashes,sources);assert.equal(receipt.project,project);assert.equal(receipt.productionWrites,0);}
 assert.equal(http.realAuth,true);assert.equal(http.nextRoutes,true);assert.equal(http.signedWebhook,true);
 assert.ok(shipcheck.command==='npm run shipcheck' ||
  (shipcheck.command==='git commit with normal pre-commit shipcheck'&&shipcheck.normalHooks===true));assert.equal(shipcheck.exitCode,0);
 assert.equal(hash(fs.readFileSync(shipcheck.logFile)),shipcheck.logSha256);
}
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];
assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024}).trim();
assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from cron.job_run_details)"),'0|0');
const current=JSON.parse(sql(snapshotSql)),expected=read(base+'/replay-409/replayed.private.json');
assert.deepEqual(current.LEDGER,expected.LEDGER);
const out=base+'/release-gate-'+phase+'-'+Date.now();fs.mkdirSync(out);
await compareSnapshots(current,expected,{reconcile:true,output:out+'/local'});
const fd=fs.openSync(out+'/baseline.private.log','wx');
try{execFileSync(process.execPath,['--use-system-ca',root+'scripts/schema/audit_vendor_seller_adoption_baseline_v1.mjs'],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
const baseline=read(base+'/baseline.json');assert.equal(baseline.status,'passed');assert.equal(baseline.target,'ycdxbpibncqcchqiihfz');
assert.equal(baseline.migrations,408);assert.equal(baseline.productionWrites,0);assert.ok(Date.now()-Date.parse(baseline.at)<120000);
assert.deepEqual(baseline.sourceHashes,Object.fromEntries(Object.entries(sources).filter(([name])=>name!==candidate)));
const remote=read(baseline.output+'/remote.private.json');assert.equal(remote.read_only,'on');
assert.deepEqual(remote.LEDGER,expected.LEDGER.filter(row=>row.version!==pending));
const receipt={status:'passed',at:new Date().toISOString(),phase,target:baseline.target,pending:[pending],
 commit:git('rev-parse','HEAD'),sourceHashes:sources,httpDirectory,shipcheckDirectory,
 baselineReceiptSha256:hash(fs.readFileSync(baseline.output+'/receipt.json')),
 replayReceiptSha256:hash(fs.readFileSync(base+'/replay-409/receipt.json')),
 upgradeReceiptSha256:hash(fs.readFileSync(base+'/upgrade-proof/receipt.json')),
 productionWrites:0,resets:0,applyAuthority:false};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:'passed',phase,pending:[pending],productionWrites:0,applyAuthority:false,output:out}));
