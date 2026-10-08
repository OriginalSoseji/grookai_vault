// One-use synthetic local catalog; public search only, no price or deal writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import pg from 'pg';

const root='C:/gv_product_search_names_20261008',base='C:/grookai_vault_operator_artifacts/product_search_names_20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,2);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(read(base+'/CHECKPOINT.json').sourceFrozen,false);
const lab='C:/grookai_vault_operator_artifacts/product_negotiated_trade_20261007/full-433-v4',project='product-trade-full-433-v4-20261007';
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,433);assert.ok(replay.fullReplay&&replay.noOpPush);
assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort(),Object.keys(freeze.sourceHashes).sort());
for(const[n,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+n),h,n);
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:33561');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);
assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];for(const port of[33560,33561])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const parent=read('C:/grookai_vault_operator_artifacts/product_offer_ui_20261008/latest-checks.json');assert.equal(parent.status,'passed');assert.equal(parent.finalHead,'d4c19b0523caba1d2dee665315efdb45688f782b');
const tables=Object.keys(parent.after.retained);for(const table of tables)assert.match(table,/^(auth[.]users|[a-z_0-9]+)$/);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33560/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const flagsSql='select (select enabled from vendor_negotiated_trade_control) negotiated,(select enabled from vendor_sales_trade_control) trade,(select enabled from vendor_sales_payment_control) payments,(select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit';
const canon=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const origin='http://127.0.0.1:33621',run=base+'/search-'+Date.now();
const bindings=Object.fromEntries(['apps/web/src/lib/search/combinedArtistIntent.ts','apps/web/src/lib/search/smartSearchIntent.ts','apps/web/src/app/api/resolver/search/route.ts','scripts/audits/product_search_names_runtime_v1.mjs'].map(p=>[p,sha(root+'/'+p)]));
let server,stopped,browser,page,fd,failure,retained,flags,fixture;const checks=[];
const save=(name,value)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2));
try {
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,433);
 flags=(await q(flagsSql))[0];assert.deepEqual(flags,parent.after.controls);assert.equal((await q('select * from market_price_current_publication')).length,0);
 await new Promise((resolve,reject)=>{const p=net.createServer();p.once('error',reject);p.listen(33621,'127.0.0.1',()=>p.close(resolve));});
 retained={};for(const table of tables)retained[table]=await q('select to_jsonb(t) row from '+table+' t');
 fs.mkdirSync(run);save('before.private.json',retained);save('source-binding.json',{at:new Date().toISOString(),head:command('git',['rev-parse','HEAD']).trim(),bindings,project,productionWrites:0});
 fixture={state:'preparing',consumed:true,project,set:randomUUID(),jaSet:randomUUID(),cards:[]};
 fixture.code='names-'+fixture.set;fixture.jaCode='JPN-names-'+fixture.jaSet;fixture.setName='Search audit '+fixture.set.slice(0,8);
 for(const [key,name,artist,ja,finishes]of [['black','Black Market ◇','Ken Sugimori',false,['holo','reverse']],['blackJa','Black Market ◇','Ken Sugimori',true,['holo']],['night','Night Market','Ken Sugimori',false,['normal']],['artist','Koffing','TOMATO MARKET',false,['normal']],['surname','Wurmple','Yuka Morii',false,['reverse']]]) {
  const id=randomUUID(),gv='GV-PK-'+(ja?'JPN-':'')+'NAMES-'+id.toUpperCase();fixture.cards.push({key,id,gv,name,artist,ja,finishes});
 }
 save('fixture.json',fixture);await q('begin');
 for(const[id,code,name]of [[fixture.set,fixture.code,fixture.setName],[fixture.jaSet,fixture.jaCode,'Japanese '+fixture.setName]])await q("insert into sets(id,code,name,game) values($1,$2,$3,'pokemon')",[id,code,name]);
 for(const [index,c]of fixture.cards.entries()) {
  const set=c.ja?fixture.jaSet:fixture.set,code=c.ja?fixture.jaCode:fixture.code;
  await q("insert into card_prints(id,game_id,set_id,set_code,name,number,gv_id,artist,image_status,identity_domain) values($1,(select id from games where code='pokemon'),$2,$3,$4,$5,$6,$7,'missing',$8)",[c.id,set,code,c.name,String(index+1),c.gv,c.artist,c.ja?'pokemon_jpn':'pokemon_eng_standard']);
  for(const finish of c.finishes)await q('insert into card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values($1,$2,$3,$4,false)',[randomUUID(),c.id,finish,c.gv+'-'+finish.toUpperCase()]);
 }
 await q('commit');fixture.state='seeded';save('fixture.json',fixture);
 const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
 assert.equal(fs.readdirSync(root+'/apps/web').some(n=>n.startsWith('.env')),false);
 Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SALES_NEGOTIATED_TRADE_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1'});
 fd=fs.openSync(run+'/server.private.log','wx');server=spawn(process.execPath,['--use-system-ca',root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','33621'],{cwd:root+'/apps/web',env,stdio:['ignore',fd,fd],windowsHide:true});stopped=new Promise(resolve=>server.once('exit',resolve));
 const card=key=>fixture.cards.find(c=>c.key===key);
 async function search(label,query,params={},required=[],excluded=[]) {
  const response=await fetch(origin+'/api/resolver/search?'+new URLSearchParams({q:query,game:'pokemon',pagination:'1',offset:'0',limit:'64',...params}),{signal:AbortSignal.timeout(90000),redirect:'error'});
  const data=await response.json();save(label+'.json',{status:response.status,query,params,data});assert.equal(response.status,200,label);assert.equal(data.ok,true,label);
  const ids=new Set(data.rows.map(r=>r.id));for(const key of required)assert.ok(ids.has(card(key).id),label+': missing '+key);for(const key of excluded)assert.ok(!ids.has(card(key).id),label+': unexpected '+key);
  checks.push(label);return data;
 }
 let ready=false;for(let i=0;i<60&&!ready;i++){assert.equal(server.exitCode,null);try{ready=(await fetch(origin+'/api/resolver/search?q=',{signal:AbortSignal.timeout(30000)})).status===400;}catch{}if(!ready)await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'server ready');
 for(const [label,text]of [['unquoted','Black Market'],['diamond','Black Market ◇'],['quoted','"Black Market"']]){const d=await search(label,text,{},['black','blackJa'],['artist']);assert.equal(d.smart_search.artist,undefined);}
 const surname=await search('lone-word','Market',{},['black','blackJa','night'],['artist']);assert.equal(surname.smart_search.artist,undefined);
 const generic=await search('other-name','Night Market',{},['night'],['artist','black']);assert.equal(generic.smart_search.artist,undefined);
 await search('exact-set','Black Market',{set:fixture.code},['black'],['blackJa','artist']);
 await search('inline-set','Black Market from '+fixture.setName,{},['black'],['blackJa','artist']);
 const japanese=await search('japanese','Black Market',{lang:'ja'},['blackJa'],['black','artist']);assert.ok(japanese.rows.every(r=>r.gv_id.includes('-JPN-')));
 await search('reverse','Black Market reverse holo',{},['black'],['blackJa','artist']);
 for(const [label,text]of [['explicit-artist','artist Market'],['full-artist','TOMATO MARKET']]){const d=await search(label,text,{},['artist'],['black','blackJa']);assert.equal(d.smart_search.artist,'TOMATO MARKET');}
 await search('surname-card','Morii Wurmple',{},['surname'],['black','artist']);
 await search('corrected-credit','Yuka Morri Wurmple',{},['surname'],['black','artist']);
 await search('illustrator-parameter','Black Market',{illustrator:'Ken Sugimori',set:fixture.code},['black'],['blackJa','artist']);
 await search('exact-identity',card('blackJa').gv,{},['blackJa'],['black','artist']);
 const web=createRequire(root+'/apps/web/package.json'),{chromium,expect}=web('@playwright/test');browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(30000);
 await page.goto(origin+'/explore?'+new URLSearchParams({q:'Black Market',game:'pokemon',set:fixture.code}),{waitUntil:'domcontentloaded'});
 await expect(page.getByText('Black Market ◇',{exact:true}).first()).toBeVisible();await expect(page.getByText('Artist: TOMATO MARKET',{exact:true})).toHaveCount(0);
 await page.screenshot({path:run+'/search-phone.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:run+'/search-desktop.png',fullPage:true});checks.push('Actual browser displays the intended card without an inferred artist chip');
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};if(fs.existsSync(run)){save('failure.json',failure);if(page)await page.screenshot({path:run+'/failure.png',fullPage:true}).catch(()=>{});}await q('rollback').catch(()=>{});}
finally {
 if(browser)await browser.close();if(server&&server.exitCode===null){command('taskkill',['/PID',String(server.pid),'/T','/F']);await stopped;}if(fd!==undefined)fs.closeSync(fd);
 try {
  if(retained){const counts={};for(const[table,rows]of Object.entries(retained)){const after=new Set((await q('select to_jsonb(t) row from '+table+' t')).map(canon));for(const row of rows)assert.ok(after.has(canon(row)),table+': retained row changed');counts[table]=rows.length;if(['auth.users','vault_item_instances','vendor_sales_cart_receipts'].includes(table))assert.equal(after.size,rows.length,table+': no account, copy or deal creation');}assert.deepEqual((await q(flagsSql))[0],flags);assert.equal((await q('select * from market_price_current_publication')).length,0);if(fs.existsSync(run))save('retention.json',{status:'passed',priorRows:counts,controlsUnchanged:true,pointerAbsent:true,productionWrites:0});}
  for(const[p,h]of Object.entries(bindings))assert.equal(sha(root+'/'+p),h,p);
 }catch(error){failure??={name:error.name,message:error.message};if(fs.existsSync(run))save('retention-failure.json',{message:error.message});}
 await db.end();
}
if(fs.existsSync(run)){if(fixture){fixture.state=failure?'failed_retained':'passed_retained';save('fixture.json',fixture);}save('receipt.json',{at:new Date().toISOString(),status:failure?'failed':'passed',checks,failure,actualLocalRpc:true,syntheticCatalog:true,productionWrites:0,serverStopped:!server||server.exitCode!==null||server.signalCode!==null});}
console.log(JSON.stringify({run,status:failure?'failed':'passed',checks,failure:failure?.message}));if(failure)process.exitCode=1;
