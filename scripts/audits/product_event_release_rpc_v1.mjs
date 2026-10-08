// One-use actual Auth/RPC event proof. Keep accounts, receipts and audit rows.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {validateEventRequest,confirmedEventRequest,eventRequestParams,validateEventState} from '../../apps/web/src/lib/sales/vendorEvents.mjs';
import {createReceipt,emptyBook} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_event_closeout_20261008');
const base='C:/grookai_vault_operator_artifacts/product_event_closeout_20261008',lab=base+'/release-full-433-v1',project='event-release-full-433-v1-20261008';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,433);
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));assert.equal(Object.keys(freeze.sourceHashes).length,433);assert.ok(!Object.hasOwn(freeze.sourceHashes,'20261005150000_vendor_receipt_delivery_v1.sql'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:34301');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const p of [34300,34301])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34300/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const auth={persistSession:false,autoRefreshToken:false};
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth}),clients=[];
const out=base+'/release-rpc-'+Date.now();fs.mkdirSync(out);
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const fixture={at:new Date().toISOString(),project,users:[],requests:[]};
const controls=['vendor_event_control','vendor_receipt_cloud_control','vendor_sales_cart_control','vendor_sales_payment_control','vendor_sales_trade_control','vendor_purchase_control','vendor_negotiated_trade_control'];
const eventTables=['vendor_event_owners','vendor_events','vendor_event_expenses','vendor_event_assignments','vendor_event_requests'];
const immutableTables=['vendor_receipt_books','vendor_sales_cart_receipts','vendor_sale_cost_snapshots','vault_items','vault_item_instances','vault_item_instance_dispositions','vault_copy_cost_requests'];
const snapshot=async tables=>{const rows={};for(const t of tables)rows[t]=await q(`select to_jsonb(t) row from public.${t} t order by to_jsonb(t)::text`);return rows;};
const readFlags=async()=>{const rows={};for(const t of controls)rows[t]=(await q(`select enabled from ${t}`))[0].enabled;return rows;};
let flags,result;
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,433);
 flags=await readFlags();
 assert.ok(Object.values(flags).every(v=>v===false));
 const retained=await snapshot([...eventTables,...immutableTables]);save('intent.private.json',{...fixture,flags,retained,consumed:true,productionWrites:0,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),modelSha256:hash(fs.readFileSync(root+'apps/web/src/lib/sales/vendorEvents.mjs'))});
 fs.copyFileSync(fileURLToPath(import.meta.url),out+'/runtime-source.mjs',fs.constants.COPYFILE_EXCL);
 for(let i=0;i<2;i++){
  const email=randomUUID()+'@event-proof.invalid',password=randomUUID()+'Aa9!';
  const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);
  fixture.users.push({owner:made.data.user.id,email});fs.writeFileSync(out+'/fixture.private.json',JSON.stringify(fixture,null,2));
  const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});assert.equal((await client.auth.signInWithPassword({email,password})).error,null);clients.push(client);
 }
 const owner=fixture.users[0].owner,client=clients[0];
 const anonymous=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});assert.equal((await anonymous.rpc('vendor_event_read_v1')).error?.code,'42501');
 for(const table of eventTables)assert.equal((await client.from(table).select('*')).error?.code,'42501');
 const ok=reply=>{assert.equal(reply.error,null,JSON.stringify(reply.error));return reply.data;};
 const req=(operation,revision)=>{const r=validateEventRequest({version:1,requestId:randomUUID(),expectedRevision:String(revision),operation});fixture.requests.push(r);fs.writeFileSync(out+'/fixture.private.json',JSON.stringify(fixture,null,2));return r;};
 const call=(r,c=client)=>c.rpc('vendor_event_mutate_v1',eventRequestParams(r));
 const recover=(r,c=client)=>c.rpc('vendor_event_request_read_v1',{p_request_id:r.requestId});
 const readEvent=async(id=null,c=client)=>{const reply=await c.rpc('vendor_event_read_v1',{p_event_id:id});if(!reply.error)validateEventState(reply.data,fixture.users[clients.indexOf(c)].owner,id);return reply;};
 const history=(id,cursor=null,limit=50,c=client)=>c.rpc('vendor_event_history_read_v1',{p_event_id:id,p_before_revision:cursor,p_limit:limit});
 const event=(patch={})=>({type:'event_create',eventId:randomUUID(),name:'Synthetic event',startDate:'2026-11-01',endDate:'2026-11-01',timeZone:'America/Havana',currency:'USD',notes:'PRIVATE EVENT NOTE',...patch});
 const initial=ok(await readEvent());assert.equal(initial.revision,'0');assert.deepEqual(initial.events,[]);assert.equal(initial.entryEnabled,false);assert.equal(initial.receiptAccess,false);
 assert.equal((await q('select count(*)::int n from vendor_event_owners where owner_id=$1',[owner]))[0].n,0,'Read created state');
 const first=req(event(),0),eventId=first.operation.eventId;
 assert.equal((await call(first)).error?.code,'42501');assert.equal(ok(await recover(first)),null);
 await q('update vendor_event_control set enabled=true');assert.equal((await call(first)).error?.code,'42501');
 await q('update vendor_receipt_cloud_control set enabled=true');await q('update vendor_event_control set enabled=false');assert.equal((await call(first)).error?.code,'42501');
 await q('update vendor_event_control set enabled=true');
 const replies=await Promise.all([call(first),call(first)]);const ack=ok(replies[0]);assert.deepEqual(ok(replies[1]),ack);confirmedEventRequest(first,ack,owner);
 assert.deepEqual(ok(await recover(first)),ack);assert.equal(ok(await recover(first,clients[1])),null);
 const changed=structuredClone(first);changed.operation.notes+=' changed';assert.equal((await call(changed)).error?.code,'22023');
 assert.equal((await readEvent(eventId,clients[1])).error?.code,'22023');assert.equal((await history(eventId,null,50,clients[1])).error?.code,'22023');
 assert.equal((await call(req({...event(),type:'event_update',eventId},0))).error?.code,'PT409');
 assert.equal((await call(req(event({timeZone:'Invented/Unknown'}),1))).error?.code,'22023');
 // Same revision, different requests: exactly one wins, with no second audit row.
 const a=req(event(),1),b=req(event(),1),race=await Promise.all([call(a),call(b)]),winner=race.findIndex(r=>r.error===null);
 assert.ok(winner>=0);assert.equal(race[1-winner].error?.code,'PT409');const secondId=[a,b][winner].operation.eventId;
 const sameId=req(event(),2),different=structuredClone(sameId);different.operation.name='Changed racing payload';
 const changedRace=await Promise.all([call(sameId),call(different)]),changedWinner=changedRace.findIndex(r=>r.error===null);
 assert.ok(changedWinner>=0);assert.equal(changedRace[1-changedWinner].error?.code,'22023');confirmedEventRequest([sameId,different][changedWinner],changedRace[changedWinner].data,owner);
 let revision=3;
 const mutate=async operation=>{const r=req(operation,revision);const result=ok(await call(r));confirmedEventRequest(r,result,owner);revision++;return {r,result};};
 const expenseId=randomUUID();
 await mutate({type:'expense_create',eventId,expenseId,category:'booth',description:'Booth fee',amountMinor:'1000',currency:'USD',incurredOn:'2026-11-01'});
 await mutate({type:'expense_update',eventId,expenseId,category:'booth',description:'Corrected booth fee',amountMinor:'0',currency:'USD',incurredOn:'2026-11-01',reason:'Fee waived'});
 await mutate({type:'expense_void',eventId,expenseId,reason:'Duplicate entry'});
 const expense=ok(await readEvent(eventId)).selected.expenses[0];assert.equal(expense.voided,true);assert.equal(expense.amountMinor,'0');
 const beforeRefusals=await snapshot(eventTables);
 for(const operation of [
  {type:'expense_update',eventId,expenseId,category:'booth',description:'Resurrect',amountMinor:'1',currency:'USD',incurredOn:'2026-11-01',reason:'Invalid'},
  {type:'expense_void',eventId:secondId,expenseId,reason:'Wrong event'},
  {type:'expense_void',eventId,expenseId:randomUUID(),reason:'Unknown expense'},
 ])assert.equal((await call(req(operation,revision))).error?.code,'PT409');
 assert.deepEqual(await snapshot(eventTables),beforeRefusals);
 // Valid legacy receipt timestamps straddle repeated Havana midnight and skipped Apia date.
 const draft={storeName:'Synthetic event shop',confirmed:true,method:'Cash',customer:{name:'',email:'',phone:'',wants:'',notes:''},items:[{description:'Legacy receipt',quantity:'1',price:'12.34'}],note:'',tax:'0'};
 const legacy=['2026-11-01T04:30:00.000Z','2026-11-01T05:30:00.000Z','2026-11-02T05:00:00.000Z','2011-12-30T10:30:00.000Z'].map((time,i)=>createReceipt(draft,i===0?randomUUID().toUpperCase():randomUUID(),time));
 const aliasId=randomUUID(),aliases=[createReceipt(draft,aliasId,'2026-11-01T04:45:00.000Z'),createReceipt(draft,aliasId.toUpperCase(),'2026-11-01T04:45:00.000Z')];
 const book={...emptyBook(),receipts:[...legacy,...aliases].map(receipt=>({receipt,customerId:null}))};
 ok(await client.rpc('vendor_receipt_book_save_v1',{p_revision:0,p_request_id:randomUUID(),p_book:book}));
 const foreignReceipt=createReceipt(draft,randomUUID(),'2026-11-01T04:30:00.000Z');
 ok(await clients[1].rpc('vendor_receipt_book_save_v1',{p_revision:0,p_request_id:randomUUID(),p_book:{...emptyBook(),receipts:[{receipt:foreignReceipt,customerId:null}]}}));
 for(const table of controls.filter(t=>t!=='vendor_event_control'))await q(`update ${table} set enabled=true`);
 const customer={name:'',email:'',phone:'',wants:'',notes:''};
 const sale=ok(await client.rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:{version:1,storeName:'Synthetic event shop',method:'Cash',items:[{instanceId:null,description:'Modern quick sale',quantity:1,unitMinor:1000}],taxMinor:0,note:'',customerId:null,customer}}));
 const buy=ok(await client.rpc('vendor_sales_cart_complete_v4',{p_request_id:randomUUID(),p_cart:{version:4,kind:'purchase',storeName:'Synthetic event shop',items:[{description:'Modern quick buy',quantity:1,unitMinor:100,referenceMinor:null,rateBps:null,cardId:null,printingId:null,condition:null,addToVault:false}],payments:[{method:'Cash',amountMinor:100,tenderedMinor:100}],note:'',customerId:null,customer}}));
 const trade=ok(await client.rpc('vendor_sales_cart_complete_v5',{p_request_id:randomUUID(),p_cart:{version:5,storeName:'Synthetic event shop',method:'Cash',items:[{instanceId:null,description:'Modern quick trade sale',quantity:1,unitMinor:1000}],taxMinor:0,note:'',customerId:null,customer,trades:[{description:'Quick incoming',quantity:1,valueMinor:null,rateBps:null,creditMinor:650,cardId:null,printingId:null,condition:null,addToVault:false}],payments:[{method:'Cash',amountMinor:350,tenderedMinor:500}]}}));
 const immutable=await snapshot(immutableTables);save('before-event-associations.private.json',immutable);
 const detail=ok(await readEvent(eventId));assert.deepEqual(detail.selected.candidates.map(r=>r.receiptId).sort(),legacy.slice(0,2).map(r=>r.id.toLowerCase()).sort());
 assert.ok(detail.selected.candidates.every(r=>r.localDate==='2026-11-01'));assert.deepEqual(detail.selected.receiptIdentityConflicts,[aliasId]);
 const ids=[legacy[0].id.toLowerCase(),sale.id,buy.id,trade.receipt.id].sort();
 const assign=(target,receiptIds,previous=null)=>({type:'receipts_assign',eventId:target,receipts:receiptIds.sort().map(receiptId=>({receiptId,previousEventId:previous}))});
 for(const refused of [aliasId,foreignReceipt.id])assert.equal((await call(req(assign(eventId,[refused]),revision))).error?.code,'22023');
 await mutate(assign(eventId,ids));
 const rollbackBefore=await snapshot(eventTables),missing='ffffffff-ffff-4fff-8fff-ffffffffffff';
 assert.equal((await call(req(assign(secondId,[legacy[1].id,missing]),revision))).error?.code,'22023');
 assert.deepEqual(await snapshot(eventTables),rollbackBefore);
 assert.equal((await call(req(assign(secondId,[ids[0]]),revision))).error?.code,'PT409');
 await mutate({type:'event_close',eventId,reason:'Show complete'});
 const closedBefore=await snapshot(eventTables);
 for(const operation of [{...first.operation,type:'event_update'},assign(secondId,[ids[0]],eventId),{type:'expense_create',eventId,expenseId:randomUUID(),category:'fees',description:'Late fee',amountMinor:'1',currency:'USD',incurredOn:'2026-11-01'}])assert.equal((await call(req(operation,revision))).error?.code,'PT409');
 assert.deepEqual(await snapshot(eventTables),closedBefore);
 await mutate({type:'event_reopen',eventId,reason:'Late receipt correction'});
 await mutate(assign(secondId,[ids[0]],eventId));await mutate(assign(null,[ids[0]],secondId));
 const apia=event({timeZone:'Pacific/Apia',startDate:'2011-12-30',endDate:'2011-12-30'});await mutate(apia);
 assert.deepEqual(ok(await readEvent(apia.eventId)).selected.candidates,[]);
 await mutate({...apia,type:'event_update',startDate:'2011-12-31',endDate:'2011-12-31'});
 assert.deepEqual(ok(await readEvent(apia.eventId)).selected.candidates.map(r=>r.receiptId),[legacy[3].id]);
 // Pagination retains the expense's original amount and amendment/void history.
 const rows=[];let cursor=null;do{const page=ok(await history(eventId,cursor,2));rows.push(...page.rows);cursor=page.nextRevision;}while(cursor!==null);
 assert.equal(new Set(rows.map(r=>r.revision)).size,rows.length);assert.ok(rows.some(r=>r.operation.type==='expense_create'&&r.after[0].amount_minor===1000));
 assert.ok(rows.some(r=>r.operation.type==='expense_update'&&r.before[0].amount_minor===1000&&r.after[0].amount_minor===0));
 assert.ok(rows.some(r=>r.operation.type==='expense_void'&&r.after[0].voided));
 await q('update vendor_event_control set enabled=false');await q('update vendor_receipt_cloud_control set enabled=false');
 const offBefore=await snapshot([...eventTables,...immutableTables]);
 assert.deepEqual(ok(await call(first)),ack);assert.deepEqual(ok(await recover(first)),ack);
 assert.equal((await call(req(event(),revision))).error?.code,'42501');
 const off=ok(await readEvent(eventId));assert.equal(off.receiptAccess,false);assert.equal(off.entryEnabled,false);assert.equal(off.selected.candidates,null);assert.equal(off.selected.bookRevision,null);assert.ok(off.selected.assignments.length>0);
 assert.deepEqual(ok(await history(eventId)).rows,rows);
 assert.deepEqual(await snapshot([...eventTables,...immutableTables]),offBefore);
 assert.deepEqual(await snapshot(immutableTables),immutable);
 for(const [table,priorRows]of Object.entries(retained)){const after=(await snapshot([table]))[table];for(const row of priorRows)assert.ok(after.some(r=>JSON.stringify(r)===JSON.stringify(row)),table+' retained row changed');}
 for(const [cursor,limit] of [['01',50],[null,0],[null,101]])assert.equal((await history(eventId,cursor,limit)).error?.code,'22023');
 save('history.private.json',rows);
 result={at:new Date().toISOString(),status:'passed',project,concurrentIdentical:true,staleConcurrent:true,changedRetryRejected:true,ownerIsolation:true,readCreatesNoRows:true,bothEntryControlsRequired:true,expenseAmendmentAndVoidAudited:true,closedEventProtection:true,lastReceiptRollback:true,explicitReassignmentAndUnassignment:true,legacyUppercaseIdentity:true,modernSaleBuyTrade:true,havanaRepeatedMidnight:true,apiaSkippedDate:true,historyPagination:true,entryOffRecovery:true,cloudOffBookBoundary:true,receiptInventoryAndCostsUnchanged:true,retainedTables:Object.keys(retained).length,ownerRevision:revision,productionWrites:0,resets:0,sourceSha256:freeze.sourceHashes['20261008130000_vendor_events_v1.sql']};
 result.ambiguousLegacyAliasesRefused=true;result.foreignReceiptRefused=true;result.concurrentChangedRequest=true;result.actualReadModelValidated=true;result.anonymousAndBaseTablesRefused=true;result.invalidHistoryPaginationRefused=true;
}finally{
 await db.query('rollback').catch(()=>{});
 if(flags){await db.query('begin');for(const table of controls)await db.query(`update ${table} set enabled=$1`,[flags[table]]);await db.query('commit');const restored=await readFlags();assert.deepEqual(restored,flags);save('flags-restored.json',{at:new Date().toISOString(),flags:restored});}
 for(const client of clients)await client.auth.signOut({scope:'local'});await db.end();
}
assert.ok(result);save('result.json',result);console.log(JSON.stringify({status:'passed',out}));
