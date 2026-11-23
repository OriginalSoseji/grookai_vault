// Synthetic local fixtures only, after this task's genuine511 CLI replay.
import fs from 'node:fs';import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_20261120',lab=art+'/fresh-512',project='bog-discovery-512-20261120',container='supabase_db_'+project;
assert.equal(process.argv.length,2);assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);assert.equal(JSON.parse(fs.readFileSync(lab+'/replay-proof.json')).pass,true);
const sha=b=>createHash('sha256').update(b).digest('hex'),docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:32000000,windowsHide:true}).trim(),info=JSON.parse(docker(['inspect',container]))[0];
assert.equal(info.State.Running,true);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker(['network','inspect',project]))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:180000,maxBuffer:32000000,windowsHide:true}).trim();
const output=lab+'/bog-fixture-proof-v2.json';assert.equal(fs.existsSync(output),false);
const report={pass:false,at:new Date().toISOString(),productionWrites:0,syntheticOnly:true,sourceOwnerRowsCopied:0,completed:[]};
const state=()=>JSON.parse(sql("select jsonb_build_object('ledger',(select count(*) from supabase_migrations.schema_migrations),'cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'users',(select count(*) from auth.users),'workers',current_setting('max_worker_processes'));"));
try{
 const prior=JSON.parse(fs.readFileSync(lab+'/bog-fixture-proof-v1.json'));assert.equal(prior.pass,false);assert.match(prior.error,/generated column/);assert.equal(prior.completed.length,6);for(const p of prior.completed)assert.equal(sha(fs.readFileSync(root+'/scripts/schema/'+p.name)),p.sha256);report.resumedAfterVerifiedSixFixtures=true;report.before=state();assert.deepEqual(report.before,{ledger:511,cards:1327,copies:19,users:1,workers:'0'});assert.equal(sql("select count(*) from public.card_prints where set_code in('bog','bp');"),'0');
 for(const name of['best_of_game_discovery_runtime_fixture_v2.sql']){
  const b=fs.readFileSync(root+'/scripts/schema/'+name);sql(b);report.completed.push({name,sha256:sha(b),after:state()});
 }
 report.after=state();assert.deepEqual(report.after,{ledger:511,cards:1349,copies:22,users:1,workers:'0'});
 const shape=JSON.parse(sql("select jsonb_build_object('parents',(select count(*) from public.card_prints where set_code in('bog','bp')),'children',(select count(*) from public.card_printings c join public.card_prints p on p.id=c.card_print_id where p.set_code in('bog','bp')),'activeIdentities',(select count(*) from public.card_print_identity i join public.card_prints p on p.id=i.card_print_id where p.set_code in('bog','bp') and i.is_active));"));
 assert.deepEqual(shape,{parents:22,children:18,activeIdentities:22});report.shape=shape;report.pass=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
