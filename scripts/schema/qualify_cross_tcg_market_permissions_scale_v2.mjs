import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const executedSourceSha256=createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');
const project='cross-price-upgrade511r3-20261119',container='supabase_db_'+project;
const work='C:/grookai_vault_operator_artifacts/cross_tcg_market_pricing_20261119/upgrade-511-r3';
const out='artifacts/pricing_market_v2/20261119';
assert.equal(fs.existsSync(work+'/supabase/.temp/project-ref'),false);
const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const run=input=>spawnSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024,timeout:600000});
const sql=input=>{const r=run(input);assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const fingerprintSQL=fs.readFileSync(work+'/protected-fingerprints.sql','utf8');
const before=JSON.parse(fs.readFileSync(work+'/protected-before-final-runtime.json'));assert.deepEqual(JSON.parse(sql(fingerprintSQL)),before);
const safety=JSON.parse(sql("select jsonb_build_object('workers',current_setting('max_worker_processes'),'users',(select count(*) from auth.users),'copies',(select count(*) from public.vault_item_instances),'ledger',(select count(*) from supabase_migrations.schema_migrations))"));assert.deepEqual(safety,{workers:'0',users:0,copies:0,ledger:512});
const views=['v_cross_tcg_market_targets_v2','v_cross_tcg_market_candidates_v2','v_tcgplayer_market_qualification_candidates_v8'];
const permissions=[];
for(const role of ['anon','authenticated'])for(const view of views){const result=run(`begin read only;set local role ${role};select * from public.${view} limit 0;rollback;`);assert.equal(result.error,undefined);assert.notEqual(result.status,0);assert.match(result.stderr,/permission denied/);permissions.push({role,view,denied:true});}
const service=JSON.parse(sql("begin read only;set local role service_role;select jsonb_build_object('candidates',count(*),'positive',count(*) filter(where source_mapping_count=1 and market_price>0)) from public.v_cross_tcg_market_candidates_v2;rollback;"));assert.deepEqual(service,{candidates:6,positive:4});
const oldCounts=JSON.parse(sql("select jsonb_build_object('v7',(select count(*) from public.v_tcgplayer_market_qualification_candidates_v7),'v8',(select count(*) from public.v_tcgplayer_market_qualification_candidates_v8 where category_id in(1,3)),'differences',(select count(*) from ((select to_jsonb(row) value from public.v_tcgplayer_market_qualification_candidates_v7 row except all select to_jsonb(row)-array['cross_tcg_source_mapping_id','cross_tcg_printing_mapping_id'] from public.v_tcgplayer_market_qualification_candidates_v8 row where category_id in(1,3)) union all (select to_jsonb(row)-array['cross_tcg_source_mapping_id','cross_tcg_printing_mapping_id'] from public.v_tcgplayer_market_qualification_candidates_v8 row where category_id in(1,3) except all select to_jsonb(row) from public.v_tcgplayer_market_qualification_candidates_v7 row)) differences))"));assert.ok(oldCounts.v7>=2);assert.equal(oldCounts.v7,oldCounts.v8);assert.equal(oldCounts.differences,0);
const template=JSON.parse(sql("select to_jsonb(card) from public.card_prints card join public.card_print_identity identity on identity.card_print_id=card.id and identity.is_active and identity.identity_domain='mtg_eng_paper_print' limit 1"));
const setCodeLiteral=String(template.set_code).replaceAll("'","''");
const baseCount=Number(sql('select count(*) from public.external_printing_mappings'));
const input=`begin;
set local statement_timeout='8min';
create temporary table local_pricing_perf_parents_v2 on commit drop as select gen_random_uuid() id,n ordinal,'GV-MTG-LOCAL-PERF-V2-'||n::text gv_id from generate_series(1,100000) n;
insert into public.card_prints(id,set_id,game_id,name,number,set_code,gv_id,identity_domain)
select id,'${template.set_id}'::uuid,'${template.game_id}'::uuid,'LOCAL PERFORMANCE '||ordinal,'PERF-'||ordinal,'${setCodeLiteral}',gv_id,'mtg_eng_paper_print' from local_pricing_perf_parents_v2;
create temporary table local_pricing_perf_children_v2 on commit drop as select gen_random_uuid() id,parent.id parent_id,parent.ordinal,finish.key finish_key,parent.gv_id||case when finish.key='normal' then '-STD' else '-FOIL' end printing_gv_id from local_pricing_perf_parents_v2 parent cross join(values('normal'),('foil')) finish(key);
insert into public.card_printings(id,card_print_id,printing_gv_id,finish_key,is_provisional,provenance_source,provenance_ref)
select id,parent_id,printing_gv_id,finish_key,false,'LOCAL_PRICING_SCALE_V2','isolated-roll-back-only' from local_pricing_perf_children_v2;
insert into public.external_printing_mappings(card_printing_id,source,external_id,active,meta)
select id,'tcgplayer_market',(100000000+ordinal)::text||':'||finish_key,true,jsonb_build_object('local_fixture','production-sized-conflict-lookup-v2') from local_pricing_perf_children_v2;
analyze public.card_prints;analyze public.card_printings;analyze public.external_printing_mappings;
select jsonb_build_object('mappingRows',(select count(*) from public.external_printing_mappings),'fixtureParents',(select count(*) from local_pricing_perf_parents_v2),'fixtureChildren',(select count(*) from local_pricing_perf_children_v2),'candidates',(select count(*) from public.v_cross_tcg_market_candidates_v2),'positive',(select count(*) from public.v_cross_tcg_market_candidates_v2 where source_mapping_count=1 and market_price>0));
explain(analyze,buffers,format json) select * from public.v_cross_tcg_market_candidates_v2 where source_product_id=any(array[454515,602806,669316,669317]);
rollback;`;
fs.writeFileSync(out+'/scale-runtime-release.private.sql',input,{flag:'wx'});const started=performance.now();const output=sql(input);
// psql emits one JSON scalar and then the multiline EXPLAIN JSON array.
const split=output.indexOf('\n');const count=JSON.parse(output.slice(0,split));const plan=JSON.parse(output.slice(split+1))[0];assert.equal(count.mappingRows,baseCount+200000);assert.equal(count.fixtureParents,100000);assert.equal(count.fixtureChildren,200000);assert.equal(count.candidates,6);assert.equal(count.positive,4);
const nodes=[];function walk(node){nodes.push(node);for(const child of node.Plans??[])walk(child);}walk(plan.Plan);
assert.ok(nodes.some(n=>n['Index Name']==='external_printing_mappings_active_child_source_v2_idx'),'Normal plan must use the new canonical-child index');
assert.ok(plan['Execution Time']<10000,'Bounded pricing page exceeded 10s at production-sized mapping cardinality');
assert.deepEqual(JSON.parse(sql(fingerprintSQL)),before,'All performance writes must be rolled back');
const report={at:new Date().toISOString(),executedSourceSha256,pass:true,productionWrites:0,allPerformanceWritesRolledBack:true,threeRolePermissionsQualified:true,permissions,service,oldCohortOutputEquivalent:true,oldCounts,protectedTables:Object.keys(before).length,mappingRowsDuringScale:count.mappingRows,syntheticParents:100000,syntheticChildren:200000,defaultPlanner:true,newChildIndexUsed:true,boundedPageExecutionMs:plan['Execution Time'],totalScaleFixtureMs:Math.round(performance.now()-started),candidateSha256:createHash('sha256').update(fs.readFileSync('supabase/migrations/20261120063000_cross_tcg_market_publication_v2.sql')).digest('hex')};
fs.writeFileSync(out+'/scale-explain-release.private.json',JSON.stringify(plan));fs.writeFileSync(out+'/permissions-scale-release.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
