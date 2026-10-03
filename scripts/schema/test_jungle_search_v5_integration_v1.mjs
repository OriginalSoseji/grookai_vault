// Exact V5 integration against the populated full-source fixture, always rolled back.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import pg from 'pg';
import {inspectJungleRetainedRuntimeV1} from './inspect_jungle_retained_runtime_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const out=base+'/release-integration-414-v1/search-v5-'+Date.now();fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex'),save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
assert.equal(process.argv.length,2);save('runtime.json',inspectJungleRetainedRuntimeV1());
const paths=['supabase/migrations/20261001210000_search_game_card_prints_v5.sql','supabase/migrations/20261001224000_jungle_edition_search_v5_integration_v1.sql'];
const sql=paths.map(p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n'));
const onlyBody=s=>s.slice(s.indexOf('create or replace function'));
assert.equal(onlyBody(sql[1]),onlyBody(sql[0]).replace('  from public.card_prints card\n  where card.game_id = v_game_id','  from public.v_card_prints_discovery_v1 card\n  where card.game_id = v_game_id'));
const strip=s=>{assert.equal((s.match(/^begin;$/gm)??[]).length,1);assert.equal((s.match(/^commit;$/gm)??[]).length,1);return s.replace(/^begin;$/m,'').replace(/^commit;$/m,'');};
save('intent.json',{at:new Date().toISOString(),consumed:true,rollbackOnly:true,sourceHashes:Object.fromEntries(paths.map(p=>[p,sha(fs.readFileSync(p))])),productionWrites:0});
const c=new pg.Client({host:'127.0.0.1',port:65040,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:60000});await c.connect();
const tests=[],pass=n=>tests.push(n),signature='public.search_game_card_prints_v5(text,text,text,text,text,text,integer,integer)';
const saved=async()=>(await c.query("select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(t) order by id) from vault_item_instances t),'anchors',(select jsonb_agg(to_jsonb(t) order by id) from vault_items t),'snapshots',(select count(*) from market_price_publication_snapshots),'pointers',(select count(*) from market_price_current_publication)) value")).rows[0].value;
try{
 const state=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];assert.deepEqual(state,{address:'10.248.6.3',workers:'0',migrations:419});
 assert.equal((await c.query('select to_regprocedure($1) value',[signature])).rows[0].value,null);const before=await saved();assert.equal(before.copies.length,5);assert.equal(before.snapshots,164815);
 const legacy=(await c.query('select p.gv_id,p.id from jungle_edition_identity_links_v1 l join card_prints p on p.id=l.legacy_card_print_id order by p.id limit 1')).rows[0];
 await c.query('begin');await c.query(strip(sql[0]));
 const functionState=async()=>(await c.query('select prosrc,proacl::text acl,proowner::regrole::text owner,proconfig,prosecdef,provolatile from pg_proc where oid=$1::regprocedure',[signature])).rows[0];
 const original=await functionState();const scenarios=[{q:null,set:'base2',limit:512},{q:'Clefable',set:'base2',limit:512},{q:'base2 Pikachu',set:null,limit:512},{q:legacy.gv_id,set:'base2',limit:512},{q:'Charizard',set:null,limit:512},{q:'Mewtwo',set:'base1',limit:512}];
 const baseline=new Map();const search=async(fn,s)=>(await c.query('select * from '+fn+'(game_code_in=>$1,q=>$2,set_code_in=>$3,limit_in=>$4,offset_in=>$5)',['pokemon',s.q,s.set,s.limit,s.offset??0])).rows;
 for(const role of ['anon','authenticated','service_role']){await c.query('set local role '+role);baseline.set(role,await Promise.all(scenarios.map(s=>search('search_game_card_prints_v5',s))));await c.query('reset role');}
 await c.query(strip(sql[1]));const integrated=await functionState();assert.deepEqual({...integrated,prosrc:original.prosrc},original);assert.equal(integrated.prosrc,original.prosrc.replace('  from public.card_prints card\n  where card.game_id = v_game_id','  from public.v_card_prints_discovery_v1 card\n  where card.game_id = v_game_id'));pass('only_general_relation_changed_acl_owner_plan_and_security_preserved');
 const excluded=(await c.query('select get_jungle_edition_discovery_exclusions_v1() ids')).rows[0].ids;assert.ok(excluded.includes(legacy.id));
 for(const role of ['anon','authenticated','service_role']){
  await c.query('set local role '+role);
  for(let i=0;i<scenarios.length;i++){const scenario=scenarios[i],actual=await search('search_game_card_prints_v5',scenario),prior=baseline.get(role)[i],expected=i===3?prior:prior.filter(r=>!excluded.includes(r.id));assert.deepEqual(actual,expected,role+' scenario '+i);if(i===0){assert.ok(prior.length>actual.length);assert.equal(actual.length,147);}if(i===3)assert.deepEqual(actual.map(r=>r.id),[legacy.id]);pass(role+'_scenario_'+i);}
  const page1=await search('search_game_card_prints_v5',{q:null,set:'base2',limit:64}),page2=await search('search_game_card_prints_v5',{q:null,set:'base2',limit:64,offset:64}),page3=await search('search_game_card_prints_v5',{q:null,set:'base2',limit:64,offset:128});assert.deepEqual([...page1,...page2,...page3],await search('search_game_card_prints_v5',{q:null,set:'base2',limit:512}));pass(role+'_pagination_exact_and_complete');
  assert.deepEqual(await search('search_game_card_prints_v4',{q:null,set:'base2',limit:64}),page1);pass(role+'_v4_compatibility');await c.query('reset role');
 }
 assert.deepEqual(await saved(),before);pass('all_five_copies_anchors_snapshots_and_pointer_preserved');await c.query('rollback');
 assert.equal((await c.query('select to_regprocedure($1) value',[signature])).rows[0].value,null);assert.deepEqual(await saved(),before);pass('rollback_schema_and_data_preserved');
 const result={at:new Date().toISOString(),status:'passed',tests,testCount:tests.length,productionWrites:0,rollbackProven:true,fullReplay:false,migrationsRemain:419,out};save('receipt.json',result);console.log(JSON.stringify(result));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack,tests});throw e;}finally{await c.end();}
