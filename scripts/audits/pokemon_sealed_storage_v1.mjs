import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import { pokemonSealedHashV1 } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { pokemonSealedObjectV1,storePokemonSealedObjectV1,imageHash } from '../../backend/pricing/pokemon_sealed_storage_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(['plan','execute'].includes(args.mode)&&args.images&&args.out,'--mode --images --out required');
const resultsBytes=await fs.readFile(path.join(args.images,'results.json'));
const results=JSON.parse(resultsBytes);
assert.equal(new Set(results.map(r=>r.member_id)).size,results.length,'Duplicate members');
const objects=[...new Map(results.filter(r=>r.status==='verified').map(row=>{
  const object=pokemonSealedObjectV1(row);return[object.path,object];})).values()].sort((a,b)=>a.path.localeCompare(b.path));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const body={version:'POKEMON_SEALED_STORAGE_V1',producer_commit:head,source_sha256:imageHash(resultsBytes),
  bucket:'user-card-images',concurrency:8,objects,exclusions:results.filter(r=>r.status!=='verified').map(r=>r.member_id),
  boundaries:{database_writes:0,upserts:0,deletes:0,cross_game_writes:0}};
const plan={...body,fingerprint:pokemonSealedHashV1(body)};
await fs.mkdir(args.out,{recursive:true});
if(args.mode==='plan'){
  await fs.writeFile(path.join(args.out,'run_plan.json'),JSON.stringify(plan));
  console.log(JSON.stringify({fingerprint:plan.fingerprint,objects:objects.length,exclusions:plan.exclusions.length}));
} else {
  const frozen=JSON.parse(await fs.readFile(path.join(args.out,'run_plan.json'),'utf8'));
  assert.deepEqual(plan,frozen,'Frozen storage plan drift');
  assert.equal(plan.fingerprint,args.fingerprint,'Wrong execution fingerprint');
  assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','Tracked tree dirty');
  dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
  assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
  delete process.env.GV_USER_ACCESS_TOKEN;
  const {createBackendClient}=await import('../../backend/supabase_backend_client.mjs');
  const client=createBackendClient();
  let journal=Promise.resolve();
  const append=entry=>{journal=journal.then(()=>fs.appendFile(path.join(args.out,'journal.jsonl'),JSON.stringify(entry)+'\n'));return journal;};
  const output=new Array(objects.length);
  let cursor=0,completed=0,failed=null;
  await Promise.all(Array.from({length:8},async()=>{
    while(!failed){
      const index=cursor++;if(index>=objects.length)break;
      const object=objects[index];
      try {
        const bytes=await fs.readFile(path.join(args.images,'bytes',object.local_filename));
        output[index]=await storePokemonSealedObjectV1({storage:client.storage,object,bytes,onJournal:append});
        completed++;if(completed%50===0)console.log(`Storage verified ${completed}/${objects.length}`);
      }catch(error){failed=error;await append({event:'failure',path:object.path,error:error.message,at:new Date().toISOString()});}
    }
  }));
  await journal;
  const summary={version:plan.version,fingerprint:plan.fingerprint,producer_commit:head,expected:objects.length,
    verified:completed,created:output.filter(r=>r?.created_this_attempt).length,passed:!failed,
    database_writes:0,upserts:0,deletes:0,error:failed?.message??null,finished_at:new Date().toISOString()};
  await fs.writeFile(path.join(args.out,'results.json'),JSON.stringify(output.filter(Boolean)));
  await fs.writeFile(path.join(args.out,'summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
  if(failed)throw failed;
}
