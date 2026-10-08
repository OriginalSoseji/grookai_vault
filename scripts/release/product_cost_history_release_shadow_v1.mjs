// One-use Supabase CLI shadow qualification. No production connection or apply.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const root='C:/gv_product_cost_history_20261008';
const evidence='C:/grookai_vault_operator_artifacts/product_cost_history_20261008';
const out=evidence+'/release-shadow-436-v1';
const retained='C:/grookai_vault_operator_artifacts/product_cost_history_20261008/release-full-436-v1';
const targetProject='costhist-rel-full-436-v1-20261008';
const project='costhist-rel-shadow-436-v1-20261008';
const network='supabase_network_'+project,relay=project+'-relay';
const port=35308,subnet='10.246.106.0/24';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(cmd,args,extra={})=>execFileSync(cmd,args,{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:30000,maxBuffer:64*1024*1024,...extra}).trim();
assert.equal(command('supabase',['--version']),'2.90.0','Use the qualified installed CLI; do not silently change shadow semantics');
const docker=(...args)=>command('docker',args);
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2));
const {Client}=createRequire('C:/gv_product_cost_history_20261008/package.json')('pg');
const {snapshotSql,compareSnapshots}=await import('file:///C:/gv_product_cost_history_20261008/scripts/schema/vendor_billing_schema_v1.mjs');
const targetUrl='postgresql://postgres:postgres@127.0.0.1:35260/postgres?sslmode=disable&options=-c%20default_transaction_read_only%3Don';
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
assert.ok(!fs.existsSync(out),'Consumed intent: never replay');
const cacheDir=evidence+'/release-shadow-cache-v1',cacheProof=read(cacheDir+'/proof.json'),cacheIntent=read(cacheDir+'/intent.json');
assert.equal(cacheProof.status,'passed');assert.equal(cacheProof.sourceUnchanged,true);assert.equal(cacheProof.exactCopy,true);assert.equal(cacheProof.certificateChanges,0);assert.equal(cacheIntent.project,project);assert.equal(cacheIntent.target,'supabase_edge_runtime_'+project);assert.equal(cacheIntent.sourceReadOnly,true);
assert.equal(sha(cacheDir+'/before.json'),cacheProof.manifestSha256);assert.equal(sha(cacheDir+'/after.json'),cacheProof.manifestSha256);
const cacheVolume=JSON.parse(docker('volume','inspect',cacheIntent.target))[0];assert.equal(cacheVolume.Labels['com.supabase.cli.project'],project);assert.equal(docker('ps','--filter','volume='+cacheIntent.target,'--format','{{.Names}}'),'');
const freeze=read(retained+'/freeze.json'),replayed=read(retained+'/replay-result.json');
assert.equal(freeze.project,targetProject);assert.equal(replayed.status,'passed');assert.equal(replayed.migrations,436);
assert.equal(sha(retained+'/supabase/config.toml'),freeze.configSha256);
assert.equal(Object.keys(freeze.sourceHashes).length,436);
assert.ok(!Object.hasOwn(freeze.sourceHashes,'20261005150000_vendor_receipt_delivery_v1.sql'),'Exact436 release excludes deferred delivery');
for(const [name,hash]of Object.entries(freeze.sourceHashes)){
 assert.equal(sha(root+'/supabase/migrations/'+name),hash);assert.equal(sha(retained+'/supabase/migrations/'+name),hash);
}
const targetContainer=inspect('supabase_db_'+targetProject);assert.ok(targetContainer.State.Running);
assert.deepEqual(Object.keys(targetContainer.NetworkSettings.Networks),[targetProject]);
assert.equal(JSON.parse(docker('network','inspect',targetProject))[0].Internal,true);
const targetRelay=inspect(targetProject+'-relay');
assert.deepEqual(targetRelay.NetworkSettings.Ports['35260/tcp'],[{HostIp:'127.0.0.1',HostPort:'35260'}]);
assert.equal(docker('ps','-a','--filter','label=com.supabase.cli.project='+project,'--format','{{.ID}}'),'');
assert.equal(docker('ps','-a','--filter','name=^/'+relay+'$','--format','{{.ID}}'),'');
const networks=JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\s+/)));
for(const n of networks){assert.notEqual(n.Name,network);for(const ip of n.IPAM.Config??[])assert.notEqual(ip.Subnet,subnet);}
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
const target=new Client({connectionString:targetUrl,connectionTimeoutMillis:10000});await target.connect();
async function snapshot(db){const results=await db.query(snapshotSql);const rows=(Array.isArray(results)?results:[results]).flatMap(result=>result.rows??[]);assert.equal(rows.length,1);return rows[0].receipt;}
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots','public.vault_item_instance_dispositions','public.vendor_purchase_control','public.vendor_negotiated_trade_control','public.vendor_sales_cart_control','public.vendor_receipt_cloud_control','public.vendor_sales_payment_control','public.vendor_sales_trade_control','public.vendor_cost_evidence_control','supabase_migrations.schema_migrations','cron.job_run_details','public.vendor_event_control','public.vendor_event_owners','public.vendor_events','public.vendor_event_expenses','public.vendor_event_assignments','public.vendor_event_requests','public.vendor_discount_control','public.vendor_sales_cart_cancellations','public.vendor_sale_cost_correction_control','public.vendor_sale_cost_correction_requests'];
async function retainedRows(){const result={};for(const t of tables)result[t]=(await target.query(`select md5(coalesce(string_agg(row_to_json(t)::text,E'\n' order by row_to_json(t)::text),'')) digest,count(*)::int n from ${t} t`)).rows[0];return result;}
const targetState=(await target.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select edit_enabled from vendor_cost_evidence_control) edit,(select capture_enabled from vendor_cost_evidence_control) capture")).rows[0];
assert.equal(targetState.address,targetContainer.NetworkSettings.Networks[targetProject].IPAddress);assert.equal(targetState.readonly,'on');assert.equal(targetState.workers,'0');assert.equal(targetState.migrations,436);assert.equal(targetState.edit,false);assert.equal(targetState.capture,false);assert.equal((await target.query('select enabled from vendor_discount_control')).rows[0].enabled,false);assert.equal((await target.query('select enabled from vendor_sale_cost_correction_control')).rows[0].enabled,false);assert.equal((await target.query("select to_regclass('public.vendor_receipt_delivery_control') is null absent")).rows[0].absent,true);
const before=await retainedRows(),targetSchema=await snapshot(target);
assert.equal(targetSchema.read_only,'on');assert.equal(targetSchema.LEDGER.length,436);
fs.mkdirSync(out+'/supabase/migrations',{recursive:true});fs.mkdirSync(out+'/supabase/.temp');
const config=fs.readFileSync(retained+'/supabase/config.toml','utf8').replaceAll(targetProject,project).replace(/3526([0-9])/g,(_,n)=>String(35300+Number(n)));
fs.writeFileSync(out+'/supabase/config.toml',config,{flag:'wx'});fs.writeFileSync(out+'/supabase/.temp/postgres-version','17.6.1.113',{flag:'wx'});
for(const name of Object.keys(freeze.sourceHashes))fs.copyFileSync(root+'/supabase/migrations/'+name,out+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
save('target-before.private.json',{state:targetState,rows:before,schema:targetSchema});
save('intent.json',{at:new Date().toISOString(),project,network,relay,subnet,port,targetProject,sourceHashes:freeze.sourceHashes,configSha256:sha(out+'/supabase/config.toml'),producerSha256:sha(new URL(import.meta.url)),dependencyCache:{directory:cacheDir,proofSha256:sha(cacheDir+'/proof.json'),intentSha256:sha(cacheDir+'/intent.json'),manifestSha256:cacheProof.manifestSha256},consumed:true,productionWrites:0,targetReadOnly:true,apply:false});
// The CLI uses an internal default shadow network, but its read-only diff helper
// keeps the CLI's normal host network. Only the replayed database is isolated.
const relayCode=`import fs from 'node:fs';import net from 'node:net';net.createServer(s=>{let host;try{host=JSON.parse(fs.readFileSync('/target.json')).host}catch{}if(!host){s.destroy();return}const t=net.connect(5432,host);s.on('error',()=>t.destroy());t.on('error',()=>s.destroy());s.on('close',()=>t.destroy());t.on('close',()=>s.destroy());s.pipe(t).pipe(s)}).listen(${port},'0.0.0.0');`;
fs.writeFileSync(out+'/relay.mjs',relayCode,{flag:'wx'});save('target.json',{host:null});
let child,finished,exit,relayCreated=false,shadowId,shadowContainer,shadowProof,comparison,failure;
const log=fs.openSync(out+'/pull.private.log','wx');
try{
 docker('network','create','--internal','--subnet',subnet,network);
 docker('create','--name',relay,'--network','bridge','-p',`127.0.0.1:${port}:${port}`,'node:22-bookworm-slim','node','/relay.mjs');relayCreated=true;
 docker('cp',out+'/relay.mjs',relay+':/relay.mjs');docker('cp',out+'/target.json',relay+':/target.json');docker('network','connect',network,relay);docker('start',relay);
 assert.deepEqual(inspect(relay).NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
 const env={};for(const [k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
 env.DO_NOT_TRACK='1'; env.PGSSLMODE='disable'; // Isolated loopback-only databases; no remote target.
 child=spawn('supabase',['db','pull','--db-url',targetUrl,'--workdir',out],{cwd:out,env,windowsHide:true,stdio:['pipe',log,log]});
 finished=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>{exit=code;resolve(code);});});
 child.stdin.on('error',()=>{});child.stdin.end('n\n');
 const started=Date.now();
 while(exit===undefined){
  if(Date.now()-started>900000){child.kill();await finished;throw Error('Bounded shadow pull timed out; preserve evidence');}
  const ids=shadowId?[shadowId]:docker('ps','--filter','ancestor=public.ecr.aws/supabase/postgres:17.6.1.113','--filter','label=com.supabase.cli.project='+project,'--format','{{.ID}}').split(/\s+/).filter(Boolean);
  for(const id of ids){
   let c=shadowContainer;if(!c)try{c=inspect(id)}catch(error){if(String(error.stderr).includes('No such object'))continue;throw error;}if(c.Config.Image!=='public.ecr.aws/supabase/postgres:17.6.1.113')continue;
   assert.deepEqual(Object.keys(c.NetworkSettings.Networks),[network]);assert.ok([...(c.Config.Cmd??[]),...(c.Config.Entrypoint??[])].join(' ').includes('max_worker_processes=0'));
   assert.deepEqual(c.NetworkSettings.Ports['5432/tcp'],[]);
   if(!shadowId){shadowId=c.Id;shadowContainer=c;save('shadow-container.json',c);save('target.json',{host:c.NetworkSettings.Networks[network].IPAddress});docker('cp',out+'/target.json',relay+':/target.json');}
   assert.equal(c.Id,shadowId);
   if(!shadowProof){
    const db=new Client({connectionString:`postgresql://postgres:postgres@127.0.0.1:${port}/postgres?options=-c%20default_transaction_read_only%3Don`,connectionTimeoutMillis:5000,query_timeout:100000});
    db.on('error',error=>save('shadow-connection-event.json',{at:new Date().toISOString(),message:error.message}));
    try{
     await db.connect();
     const s=(await db.query("select current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
     assert.equal(s.workers,'0');
     if(s.migrations===436){
      shadowProof=await snapshot(db);save('shadow-schema.private.json',shadowProof);
      comparison=await compareSnapshots(shadowProof,targetSchema,{output:out+'/shadow-comparison'});
     }
    }catch(error){if(shadowProof)throw error;save('shadow-last-observation.json',{at:new Date().toISOString(),message:error.message});}
    finally{await db.end().catch(()=>{});}
   }
  }
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 await finished;
 const output=fs.readFileSync(out+'/pull.private.log','utf8');
 assert.ok(shadowProof,'Full shadow replay was not independently captured');assert.equal(comparison.normalizedBytes,0);
 assert.ok(output.includes('Diffing schemas'),'CLI did not reach its schema comparison');
 const diffOutput=output.slice(output.indexOf('Diffing schemas'));
 assert.doesNotMatch(diffOutput,/Error:|error diffing|ECONN|FATAL|failed to|timed out/i,'CLI diff logged an error');
 assert.ok(output.includes('No schema changes found'),'Review generated difference before qualification');
 assert.deepEqual(fs.readdirSync(out+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort(),Object.keys(freeze.sourceHashes).sort());
 assert.equal(exit,1,'CLI 2.90 returns errInSync for an empty diff; all independent checks above must pass');
}catch(error){failure={message:error.message,stack:error.stack};save('failure.json',failure);if(child&&exit===undefined){child.kill();await finished.catch(()=>{});}}
finally{
 fs.closeSync(log);
 if(relayCreated){const c=inspect(relay);assert.equal(c.Name,'/'+relay);assert.equal(c.Config.Image,'node:22-bookworm-slim');docker('stop',relay);}
 if(shadowId){const ids=docker('ps','--filter','ancestor=public.ecr.aws/supabase/postgres:17.6.1.113','--filter','label=com.supabase.cli.project='+project,'--format','{{.ID}}').split(/\s+/).filter(Boolean);for(const id of ids){const c=inspect(id);if(c.Id===shadowId)docker('stop',id);}}
 const after=await retainedRows();save('target-retention.json',{before,after});
 try{assert.deepEqual(after,before);const schemaAfter=await snapshot(target);await compareSnapshots(schemaAfter,targetSchema,{output:out+'/target-after'});}catch(error){failure??={message:'Target retention: '+error.message};}
 await target.end();
}
const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',failure,exit,project,targetProject,shadowCaptured:!!shadowProof,comparison,productionWrites:0,targetWrites:0,retainedFixtureResets:0,logSha256:sha(out+'/pull.private.log'),out};save('receipt.json',receipt);console.log(JSON.stringify(receipt));if(failure)process.exitCode=1;
