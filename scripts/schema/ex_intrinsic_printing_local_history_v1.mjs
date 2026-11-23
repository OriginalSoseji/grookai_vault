// Replay the already-applied historical513 in this new synthetic lab only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {root,base,lab,sha,read,guard,client,state,fingerprints,cli} from './ex_intrinsic_printing_local_tools_v1.mjs';
assert.equal(process.argv.length,2);guard();
const out=base+'/local-history-513-v1';assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const binding=read(root+'/scripts/schema/ex_intrinsic_printing_history_v1.json');
for(const[file,pin]of Object.entries(binding.history))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
const migration='20261120081500_best_of_game_discovery_v1.sql',fixture='ex_intrinsic_printing_bog_prerequisite_v1.sql';
const fixtureBytes=fs.readFileSync(root+'/scripts/schema/'+fixture);
assert.equal(sha(fixtureBytes),read(base+'/userfree-prerequisite-source-v1.json').fixtureSha256);
const c=client(),report={at:new Date().toISOString(),pass:false,productionWrites:0,authWrites:0,ownershipWrites:0,sourceReset:false};
const save=(name,value)=>fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(value))),{flag:'wx'});
try{
  await c.connect();assert.deepEqual(await state(c),{ledger:512,cards:1294,users:0,copies:0,workers:'0'});
  fs.writeFileSync(out+'/intent.json',JSON.stringify({...report,fixtureSha256:sha(fixtureBytes),historicalMigrationSha256:binding.history[migration],consumed:true},null,2)+'\n',{flag:'wx'});
  await c.query(fixtureBytes.toString('utf8'));
  assert.deepEqual(await state(c),{ledger:512,cards:1316,users:0,copies:0,workers:'0'});
  const before=await fingerprints(c);save('before',before);
  fs.copyFileSync(root+'/supabase/migrations/'+migration,lab+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
  cli('postgres',out,'historical-513');
  assert.deepEqual(await state(c),{ledger:513,cards:1316,users:0,copies:0,workers:'0'});
  const after=await fingerprints(c);save('after',after);
  assert.deepEqual(Object.keys(before).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])),['public.card_print_identity_aliases']);
  assert.equal(after['public.card_print_identity_aliases'].count,656);
  cli('postgres',out,'noop-513');assert.deepEqual(await fingerprints(c),after);
  for(const[name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){
    const result=await c.query(fs.readFileSync(root+'/scripts/schema/'+file,'utf8'));
    save(name,result.find(v=>v.rows?.[0]?.receipt).rows[0].receipt);
  }
  Object.assign(report,{pass:true,officialCliReplay:true,officialCliNoop:true,ledger:513,protectedTables:Object.keys(before).length,onlyNineHistoricalAliasesAdded:true,noNewAuthFixture:true});
}catch(error){report.error=String(error.stack??error).slice(0,3000);process.exitCode=1;}
finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
