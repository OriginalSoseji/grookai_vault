// Add public reference rows only to the fixed isolated vendor pilot. No schema,
// owner inventory, grants, prices, workers, payments or production writes.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{query,verified}from'./ops.mjs';
const dir='.local/integration/vendor-scan-release-20260924',hash=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(dir+'/'+f));
const bytes=fs.readFileSync(dir+'/catalog-plan.private.json'),plan=JSON.parse(bytes),proof=read('local-rehearsal-content-proof.json'),binding=read('local-rehearsal-plan.json');
assert.equal(plan.target,'hrtbjchobencariqclab');assert.equal((await verified()).id,plan.target);assert.equal(hash(bytes),proof.planSha256);assert.equal(hash(bytes),binding.catalogPlanSha256);
assert.equal(hash(fs.readFileSync(dir+'/game-mapping.private.json')),binding.gameMappingSha256);assert.equal(hash(fs.readFileSync(dir+'/catalog-snapshot.private.json')),plan.sourceSha256);
assert.ok(Date.now()-Date.parse(read('catalog-snapshot.private.json').at)<86400000,'Refresh public source qualification after 24h');
assert.equal(proof.rows,54580);assert.ok(proof.checks.every(r=>r.mismatch===0));
const retainedSql=`select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'batch',(select enabled from vendor_batch_intake_control),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events)) as state;`;
const mode=process.argv[2],intentFile=dir+'/catalog-apply-intent.private.json';
if(mode==='plan'){
 assert.ok(!fs.existsSync(intentFile));
 const existing=(await query("begin read only;select jsonb_build_object('sets',(select jsonb_agg(to_jsonb(t)) from sets t),'cards',(select jsonb_agg(to_jsonb(t)) from card_prints t),'printings',(select jsonb_agg(to_jsonb(t)) from card_printings t),'games',(select jsonb_agg(to_jsonb(t)) from games t),'finishKeys',(select jsonb_agg(to_jsonb(t)) from finish_keys t)) as state;rollback;"))[0].state;
 assert.equal(hash(JSON.stringify(existing)),plan.existingSha256,'Pilot catalog changed since planning');
 const before=(await query('begin read only;'+retainedSql+'rollback;'))[0].state;
 fs.writeFileSync(intentFile,JSON.stringify({at:new Date().toISOString(),target:plan.target,planSha256:hash(bytes),before,completed:[]},null,2),{flag:'wx'});
 console.log(JSON.stringify({planned:true,target:plan.target,statements:plan.statements.length}));
}else if(mode==='apply'){
 const intent=read('catalog-apply-intent.private.json');assert.equal(intent.planSha256,hash(bytes));assert.equal(intent.target,plan.target);assert.ok(!fs.existsSync(dir+'/catalog-applied.json'));
 const journalFile=dir+'/catalog-apply-journal.private.json';let completed=fs.existsSync(journalFile)?read('catalog-apply-journal.private.json').completed:[];
 for(let i=0;i<plan.statements.length;i++){
  const s=plan.statements[i];assert.equal(hash(s.sql),s.sha256);const key=s.table==='finish_keys'?'key':'id',suffix=s.sql.slice(s.sql.indexOf('from jsonb_populate_recordset')).slice(0,-1);
  const input=JSON.parse(suffix.match(/,'(.*)'::jsonb/)[1].replaceAll("''","'")),keys=Object.keys(input[0]);assert.ok(keys.every(k=>/^[a-z_]+$/.test(k)));
  const expected=`jsonb_build_object(${keys.map(k=>"'"+k+"',expected.\""+k+'"').join(',')})`;
  const check=`select count(*) filter(where actual.${key} is not null)::int as present,count(*) filter(where actual.${key} is not null and not(to_jsonb(actual) @> ${expected}))::int as mismatched ${suffix} expected left join public.${s.table} actual on actual.${key}=expected.${key};`;
  const state=(await query('begin read only;'+check+'rollback;'))[0];assert.equal(state.mismatched,0,'A retained catalog row differs; stop without overwriting');
  if(state.present<s.rows){
   assert.equal(state.present,0,'Partial batch requires read-only reconciliation');assert.ok(!completed.includes(i),'Journal drift');
   await query("begin;set local statement_timeout='60s';"+s.sql+'commit;');
  }
  const after=(await query('begin read only;'+check+'rollback;'))[0];assert.equal(after.present,s.rows);assert.equal(after.mismatched,0);
  if(!completed.includes(i))completed.push(i);
  fs.writeFileSync(journalFile,JSON.stringify({at:new Date().toISOString(),target:plan.target,planSha256:hash(bytes),completed},null,2));
  if((i+1)%10===0)console.log(JSON.stringify({verifiedStatements:i+1,total:plan.statements.length}));
 }
 const after=(await query('begin read only;'+retainedSql+'rollback;'))[0].state;assert.deepEqual(after,intent.before,'Unrelated pilot state changed; inspect before release');
 const counts=(await query('begin read only;select (select count(*) from sets)::int as sets,(select count(*) from card_prints)::int as cards,(select count(*) from card_printings)::int as printings;rollback;'))[0];assert.deepEqual(counts,{sets:167,cards:20085,printings:35142});
 fs.writeFileSync(dir+'/catalog-applied.json',JSON.stringify({at:new Date().toISOString(),target:plan.target,planSha256:hash(bytes),counts,statements:completed.length,existingOwnerStateUnchanged:true,sourceWrites:0,schemaWrites:0,paymentsEnabled:false},null,2),{flag:'wx'});console.log(JSON.stringify({applied:true,counts}));
}else throw Error('Explicit plan/apply required');
