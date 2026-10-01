// Synthetic-only real Auth/HTTP proof. Never resets or targets a remote project.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import ts from 'typescript';
const out='C:/grookai_vault_operator_artifacts/search_name_plan_20261001';
const fixture=out+'/full-414-v1',project='search-name-plan-full-414-v1-20261001',container='supabase_db_'+project;
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:32*1024*1024}).trim();
assert.ok(process.argv.length===2 || (process.argv.length===3 && process.argv[2]==='--verify'));
assert.equal(read(fixture+'/replay-result.json').status,'passed');
assert.equal(read(fixture+'/freeze.json').project,project);
assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
if(process.argv[2]!=='--verify'){
assert.equal(sql('select count(*) from card_prints'),'0');
save('runtime-fixture-intent-v2.json',{at:new Date().toISOString(),project,synthetic:true,consumed:true});
sql(`begin;
 insert into public.sets(code,name,game) values
 ('Name-MiXeD','Search public','pokemon'),('Name-Hidden','Search hidden','pokemon'),
 ('Name-Signed','Search signed','pokemon'),('Name-MTG','Search other game','mtg');
 insert into public.catalog_set_release_controls(set_id,release_status,release_version)
 select id,case code when 'Name-Hidden' then 'hidden' when 'Name-Signed' then 'signed_in' else 'public' end,'NAME_PLAN_FIXTURE'
 from public.sets where code like 'Name-%';
 insert into public.card_prints(id,set_id,set_code,name,number,gv_id,artist,game_id,data_quality_flags)
 select gen_random_uuid(),s.id,s.code,'Charizard',n::text,
 case when n<=600 then 'GV-PK-NAME-' when n<=640 then 'GV-PK-JPN-NAME-' when n<=660 then 'GV-TCGP-NAME-' else 'GV-PK-SUPPRESSED-' end||n,
 case when n<=25 then 'Yuka Morii' else 'Other Artist' end,g.id,
 case when n>660 then '{"app_visibility_v1":{"status":"suppressed"}}'::jsonb else '{}'::jsonb end
 from generate_series(1,670) n cross join public.sets s cross join public.games g where s.code='Name-MiXeD' and g.code='pokemon';
 insert into public.card_prints(id,set_id,set_code,name,number,gv_id,artist,game_id)
 select gen_random_uuid(),s.id,s.code,'Pikachu',(670+n)::text,'GV-PK-PIKA-'||n,'Other Artist',g.id
 from generate_series(1,421) n cross join public.sets s cross join public.games g where s.code='Name-MiXeD' and g.code='pokemon';
 insert into public.card_prints(id,set_id,set_code,name,number,gv_id,artist,game_id)
 select gen_random_uuid(),s.id,s.code,'Charizard',n::text,
 case when s.game='mtg' then 'GV-MTG-' else 'GV-PK-' end||s.code||'-'||n,'Other Artist',g.id
 from generate_series(1,12) n cross join public.sets s join public.games g on g.code=s.game
 where s.code in ('Name-Hidden','Name-Signed','Name-MTG');
 commit;analyze public.sets;analyze public.card_prints;`);
}else {
 assert.equal(read(out+'/runtime-fixture-intent-v2.json').project,project);
 assert.equal(sql('select count(*) from card_prints'),'1127');
 assert.equal(sql('select count(*) from card_prints where set_code is null'),'0');
}
const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const url='http://127.0.0.1:64341',options={auth:{persistSession:false,autoRefreshToken:false}};
assert.ok(status.ANON_KEY&&status.SECRET_KEY);
const anon=createClient(url,status.ANON_KEY,options),admin=createClient(url,status.SECRET_KEY,options);
const email=randomUUID()+'@name-search.invalid',password=randomUUID()+'-Aa9!';
assert.ifError((await admin.auth.admin.createUser({email,password,email_confirm:true})).error);
const member=createClient(url,status.ANON_KEY,options);assert.ifError((await member.auth.signInWithPassword({email,password})).error);
async function rpc(client,version,args){const r=await client.rpc('search_game_card_prints_'+version,args);assert.ifError(r.error);return r.data;}
async function all(client,version,args){const rows=[],size=version==='v4'?64:512;for(let offset=0;offset<10000;offset+=size){const page=await rpc(client,version,{game_code_in:'pokemon',q:'Char',...args,limit_in:size,offset_in:offset});rows.push(...page);if(page.length<size)return rows;}assert.fail('Unexpected fixture overflow');}
const source=fs.readFileSync('apps/web/src/lib/search/completeNamedCardSearch.ts','utf8'),module={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Set,Error});
const checks=[];
for(const [role,client,signed] of [['anon',anon,false],['authenticated',member,true],['service_role',admin,true]]){
 for(const scope of [{},{language_scope_in:'ja'},{language_scope_in:'en'},{set_code_in:'NAME-mixed'},{set_code_in:'Name-Hidden'},{set_code_in:'Name-Signed'},{illustrator_in:'Yuka Morii'},{number_in:'7'},{q:'Name-MiXeD Char'},{q:'gv-pk-name-1'},{q:'GV-PK-SUPPRESSED-661'},{game_code_in:'mtg'},{game_code_in:'missing'},{q:'missing'},{q:null}]){
  const old=await all(client,'v4',scope),next=await all(client,'v5',scope);assert.deepEqual(next,old,role+JSON.stringify(scope));
  checks.push({role,scope,rows:next.length,allFieldsAndOrderIdentical:true});
 }
 assert.equal((await all(client,'v5',{})).length,signed?672:660);
 assert.equal((await all(client,'v5',{language_scope_in:'ja'})).length,40);
 assert.equal((await all(client,'v5',{set_code_in:'Name-Hidden'})).length,0);
 assert.equal((await all(client,'v5',{set_code_in:'Name-Signed'})).length,signed?12:0);
 assert.equal((await all(client,'v5',{illustrator_in:'Yuka Morii'})).length,25);
 assert.equal((await all(client,'v5',{game_code_in:'mtg'})).length,12);
 assert.equal((await rpc(client,'v4',{game_code_in:'pokemon',q:'Char',limit_in:512})).length,64);
 for(const [limit,expected]of [[null,512],[-5,1],[0,1],[1,1],[512,512],[10000,512]])assert.equal((await rpc(client,'v5',{game_code_in:'pokemon',q:'Char',limit_in:limit})).length,expected);
 assert.equal((await rpc(client,'v5',{game_code_in:'pokemon',q:'Char'})).length,512);
 assert.deepEqual(await rpc(client,'v5',{game_code_in:'pokemon',q:'Char',offset_in:-5}),await rpc(client,'v5',{game_code_in:'pokemon',q:'Char',offset_in:0}));
 assert.deepEqual(await rpc(client,'v5',{game_code_in:'pokemon',q:'Char',offset_in:2147483647}),[]);
 let calls=0;const counted={rpc:async(...a)=>{calls++;return client.rpc(...a);}};
 const small=await module.exports.fetchCompleteNamedCardRows(counted,{textQuery:'Pika',gameScope:'pokemon'});assert.equal(small.length,421);assert.equal(calls,1);
 const large=await module.exports.fetchCompleteNamedCardRows(client,{textQuery:'Char',gameScope:'pokemon'});assert.equal(large.length,signed?652:640);assert.ok(large.every(r=>!r.gv_id.startsWith('GV-TCGP-')));
}
const defs=JSON.parse(sql("begin read only;select json_build_object('old',pg_get_functiondef('public.search_game_card_prints_v4(text,text,text,text,text,text,integer,integer)'::regprocedure),'next',pg_get_functiondef('public.search_game_card_prints_v5(text,text,text,text,text,text,integer,integer)'::regprocedure));rollback;"));
assert.deepEqual(defs.next.replaceAll('search_game_card_prints_v5','search_game_card_prints_v4').replaceAll('DEFAULT 512','DEFAULT 50').replace(/\s*SET plan_cache_mode TO 'force_custom_plan'/,'').replace('coalesce(limit_in, 512), 1), 512','coalesce(limit_in, 50), 1), 64'),defs.old);
const plans={};for(const mode of ['force_generic_plan','force_custom_plan'])for(const [version,limit] of [['v4',64],['v5',512]]){
 plans[mode+'_'+version]=JSON.parse(sql(`begin read only;set local role anon;set local request.jwt.claims='{"role":"anon"}';set local plan_cache_mode=${mode};explain(analyze,buffers,format json) select * from public.search_game_card_prints_${version}('pokemon','Char',limit_in=>${limit});rollback;`))[0];
}
save('runtime-plans.private.json',plans);
const migration='supabase/migrations/20261001210000_search_game_card_prints_v5.sql';
const result={at:new Date().toISOString(),status:'passed',project,checks,productionWrites:0,oldInterfacePreserved:true,planConfigurationVerified:true,singleRead421:true,pocketPagingComplete:true,migrationSha256:hash(fs.readFileSync(migration)),sourceHashes:Object.fromEntries(['scripts/schema/search_name_plan_runtime_v1.mjs','apps/web/src/lib/search/completeNamedCardSearch.ts','apps/web/src/lib/search/catalogSetSearch.ts'].map(p=>[p,hash(fs.readFileSync(p))]))};
save('runtime-result.json',result);console.log(JSON.stringify({status:result.status,checks:checks.length,productionWrites:0}));
