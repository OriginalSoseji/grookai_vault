// Synthetic-only HTTP/RLS/query-plan proof in the dedicated completed replay.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const out='C:/grookai_vault_operator_artifacts/search_database_20261001';
const fixture=out+'/full-412-v2',project='search-database-full-412-v2-20261001',container='supabase_db_'+project;
const read=p=>JSON.parse(fs.readFileSync(p));
const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:32*1024*1024}).trim();
assert.ok(process.argv.length===2 || (process.argv.length===3 && process.argv[2]==='--verify'));
assert.equal(read(fixture+'/replay-result.json').status,'passed');
assert.equal(read(fixture+'/freeze.json').project,project);
assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
if(process.argv[2]!=='--verify'){
assert.equal(sql('select count(*) from card_prints'),'0');
save('runtime-v2-fixture-intent.json',{at:new Date().toISOString(),project,synthetic:true,consumed:true});
sql(`begin;
 insert into public.sets(code,name,game,printed_total,release_date)
 select 'search-fixture-'||n,'Search Fixture '||n,'pokemon',100,'2020-01-01'::date from generate_series(1,2005) n;
 insert into public.sets(code,name,game) values
 ('Search-MiXeD','Case visible','pokemon'),('Search-Hidden','Hidden','pokemon'),
 ('Search-Signed','Signed in','pokemon'),('Search_%','Literal wildcard','pokemon'),
 ('Search-MTG','Hidden game','mtg');
 insert into public.catalog_set_release_controls(set_id,release_status,release_version)
 select id,case when code='Search-Hidden' then 'hidden' else 'signed_in' end,'SEARCH_DATABASE_FIXTURE'
 from public.sets where code in ('Search-Hidden','Search-Signed');
 insert into public.card_prints(id,set_id,name,number,gv_id,artist,game_id)
 select gen_random_uuid(),s.id,'Wurmple '||n,n::text,'GV-PK-SEARCH-FIXTURE-'||n,
 case when n<=25 then 'Yuka Morii' else 'Other Artist' end,g.id
 from generate_series(1,10000) n cross join public.sets s cross join public.games g
 where s.code='search-fixture-1' and g.code='pokemon';
 commit; analyze public.sets; analyze public.card_prints;`);
}else{
 assert.equal(read(out+'/runtime-v2-fixture-intent.json').project,project);
 assert.equal(sql('select count(*) from card_prints'),'10000');
}
const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const url='http://127.0.0.1:65241',options={auth:{persistSession:false,autoRefreshToken:false}};
const anon=createClient(url,status.ANON_KEY,options),admin=createClient(url,status.SERVICE_ROLE_KEY,options);
const email=randomUUID()+'@search-fixture.invalid',password=randomUUID()+'-Aa9!';
const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(made.error);
const member=createClient(url,status.ANON_KEY,options);assert.ifError((await member.auth.signInWithPassword({email,password})).error);
async function rpc(client,name,args){const r=await client.rpc(name,args);assert.ifError(r.error);return r.data;}
const checks=[];
// The baseline migrations also seed three public Battle Academy sets.
for(const [role,client,count] of [['anon',anon,2010],['authenticated',member,2011]]){
 const catalog=await rpc(client,'get_search_set_catalog_v1',{game_code_in:'pokemon'});
 assert.equal(catalog.complete,true);assert.equal(catalog.sets.length,count);
 assert.equal(catalog.sets.some(s=>s.code==='Search-Hidden'),false);
 assert.equal(catalog.sets.some(s=>s.code==='Search-Signed'),role==='authenticated');
 assert.deepEqual((await rpc(client,'resolve_visible_set_references_v1',{code_in:'search-mixed',game_code_in:' PoKeMoN '})).map(s=>s.code),['Search-MiXeD']);
 assert.deepEqual(await rpc(client,'resolve_visible_set_references_v1',{code_in:'search-hidden'}),[]);
 assert.equal((await rpc(client,'resolve_visible_set_references_v1',{code_in:'search-signed'})).length,role==='authenticated'?1:0);
 assert.deepEqual((await rpc(client,'resolve_visible_set_references_v1',{code_in:'Search_%'})).map(s=>s.code),['Search_%']);
 assert.deepEqual(await rpc(client,'resolve_visible_set_references_v1',{code_in:'search-mixed',game_code_in:'mtg'}),[]);
 assert.deepEqual((await rpc(client,'get_search_set_catalog_v1',{game_code_in:'mtg'})).sets,[]);
 checks.push({role,visibleSets:count,overRestRowCap:true,mixedCase:true,literalWildcards:true,hiddenSetDenied:true,hiddenGameDenied:true});
}
const explain=q=>JSON.parse(sql(`begin read only;set local role anon;set local request.jwt.claims='{"role":"anon"}';explain(analyze,buffers,format json) ${q};rollback;`))[0];
const queries={
 oldCode:"select id,code from sets where code ilike 'search-mixed' order by id",
 indexedCode:"select id,code from sets where search_code_lower=lower('search-mixed') order by id",
 artist:"select id,name,artist,set_code from card_prints where gv_id like 'GV-PK-%' and artist in ('Yuka Morii') order by id limit 500",
 oldCatalogFirst:"select id,code,name,printed_set_abbrev from sets where game='pokemon' order by id limit 500 offset 0",
 oldCatalogLast:"select id,code,name,printed_set_abbrev from sets where game='pokemon' order by id limit 500 offset 2000",
 newCatalog:"select public.get_search_set_catalog_v1('pokemon')"
};
const plans=Object.fromEntries(Object.entries(queries).map(([k,q])=>[k,explain(q)]));
save('runtime-v2-plans.private.json',plans);
assert.match(JSON.stringify(plans.indexedCode),/sets_code_lower_search_v1/,'Case-insensitive lookup must use the new index under RLS');
assert.match(JSON.stringify(plans.artist),/card_prints_artist_id_search_v1/,'Artist index must work under RLS');
const migration='supabase/migrations/20261001150000_search_database_latency_v1.sql';
save('runtime-result.json',{at:new Date().toISOString(),status:'passed',project,checks,productionWrites:0,
 migrationSha256:createHash('sha256').update(fs.readFileSync(migration)).digest('hex'),
 planMs:Object.fromEntries(Object.entries(plans).map(([k,p])=>[k,p['Execution Time']]))});
console.log(JSON.stringify(read(out+'/runtime-result.json')));
