// Read-only PostgreSQL selection experiments, not Auth or provider load proof.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
assert.equal(process.argv.length,3,'Use one new evidence version, such as v4');
const version=process.argv[2];assert.match(version,/^v[1-9][0-9]{0,3}$/);
const base='C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1';
const out=base+'/stock-window-selection-'+version;assert.equal(fs.existsSync(out),false);
const gate=JSON.parse(fs.readFileSync(base+'/baseline519/gate-starting-v3/baseline.json'));
assert.equal(gate.pass,true);assert.equal(gate.migrations,519);assert.equal(gate.remoteWrites,0);
// Same pinned prototype bytes in the new canonical-prefix forward package.
// This remains the historical519 expression experiment, not new-prefix proof.
const migration=fs.readFileSync(root+'/supabase/migrations/20261124001000_square_recovery_target_window_release_v1.sql','utf8');
const migrationHash=createHash('sha256').update(migration).digest('hex');
assert.equal(migrationHash,'c60f33c0637a0b95e01d0a8c0356a616f8a2082035d8887bd72ec6f3571c27a2');
const replacement=migration.match(/replacement text := \$window\$([\s\S]*?)\$window\$;/)[1];
const expression=replacement.match(/return (coalesce\([\s\S]*?\),'\[\]'::jsonb\));/)[1];
const container='424a4d2aa7d1',info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8',windowsHide:true,timeout:15000}))[0];
assert.equal(info.State.Running,true);assert.equal(info.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
for(const ports of Object.values(info.NetworkSettings.Ports))assert.equal(ports?.length??0,0);
for(const name of Object.keys(info.NetworkSettings.Networks))assert.equal(JSON.parse(execFileSync('docker',['network','inspect',name],{encoding:'utf8',windowsHide:true,timeout:15000}))[0].Internal,true);
fs.mkdirSync(out);
const connection='c1000000-0000-4000-8000-000000000001';
const id=n=>'c2000000-0000-4000-8000-'+String(n).padStart(12,'0');
const fixtures=[{active:0,sold:0},{active:2,sold:0},{active:0,sold:7},{active:1,sold:7},
 {active:999,sold:1},{active:1000,sold:1},{active:1500,sold:3},{active:100000,sold:3},
 {active:1000,sold:3,rotated:true},{active:1500,sold:3,pending:20}];
const results=[];
try{
 for(const [index,fixture]of fixtures.entries())for(const bound of [2,5]){
  const {active,sold,rotated=false,pending=0}=fixture,total=active+sold;
  const expr=expression.replaceAll('grookai_square.targets','fixture_targets').replaceAll('grookai_square.allocations','fixture_allocations')
   .replaceAll('grookai_square.copy_changes','fixture_changes').replaceAll('grookai_square.operations','fixture_operations')
   .replaceAll('c.id',`'${connection}'::uuid`).replaceAll('p_data',`'${JSON.stringify({automaticRecoveryLimit:bound})}'::jsonb`);
  assert.equal(expr.includes('grookai_'),false);
  const sql=`begin read only;set local statement_timeout='5s';
   with fixture_targets as materialized (
    select ('c2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid id,
     ('c3000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid instance_id,
     'item-'||n as item_id,'variation-'||n as variation_id,n<=${active} as selected,
     '${connection}'::uuid connection_id,
     '2026-01-01'::timestamptz+(case when ${rotated} and n=${active+1} then 1000000 else n end)*interval '1 second' as updated_at,
     n>${active} as is_sold,n
    from generate_series(1,${total}) n
    union all
    select 'cf000000-0000-4000-8000-000000000001'::uuid,'cf000000-0000-4000-8000-000000000002'::uuid,
     'foreign-item','foreign-variation',false,'cf000000-0000-4000-8000-000000000003'::uuid,'2000-01-01'::timestamptz,true,-1
   ),fixture_allocations as (
    select id as target_id,case when is_sold then 'sold' else 'active' end as state,'2026-01-01'::timestamptz as created_at from fixture_targets
   ),fixture_changes as (
    select instance_id,null::timestamptz as processed_at from fixture_targets where n between 2 and ${pending}
   ),fixture_operations as (
    select connection_id,id as target_id,'uncertain'::text as status from fixture_targets where n=1 and ${pending}>0
   )
   select jsonb_build_object('readOnly',current_setting('transaction_read_only'),'targets',${expr});rollback;`;
  const name=`case-${index}-bound-${bound}`;fs.writeFileSync(out+'/'+name+'.sql',sql,{flag:'wx'});
  const started=performance.now();
  const value=JSON.parse(execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
   {input:sql,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1000000}).trim());
  assert.equal(value.readOnly,'on');const rows=value.targets;
  assert.equal(rows.length,Math.min(total,bound));assert.equal(new Set(rows.map(t=>t.id)).size,rows.length);
  const expectedKeys=['allocated_at','allocation_state','id','instance_id','item_id','selected','variation_id'];
  for(const row of rows){assert.deepEqual(Object.keys(row).sort(),expectedKeys);assert.equal(row.item_id.startsWith('foreign'),false);}
  if(sold){const expected=id(active+(rotated&&sold>1?2:1));assert.ok(rows.some(t=>t.id===expected),'Oldest sold target omitted');}
  if(pending){assert.equal(rows[0].id,id(1),'Saved uncertain request lost its first slot');assert.equal(rows.at(-1).allocation_state,'sold');}
  results.push({...fixture,bound,count:rows.length,oldestSoldReachable:sold?true:null,foreignExcluded:true,elapsedMs:Math.round(performance.now()-started)});
 }
 fs.writeFileSync(out+'/result.json',JSON.stringify({pass:true,at:new Date().toISOString(),migrationSha256:migrationHash,
  cases:results.length,results,readOnly:true,productionWrites:0,localWrites:0,syntheticRelations:true,
  exactCandidateSelectionExpression:true,actualAuthorityAuthVerified:false,providerLoadVerified:false,actualIndexedDatabaseLoadVerified:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({pass:true,cases:results.length,oldestSoldReachable:true,providerWorkBoundUnchanged:true,readOnly:true,actualAuthorityAuthVerified:false}));
}catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({pass:false,completedCases:results.length,error:error.message})+'\n',{flag:'wx'});throw error;}
