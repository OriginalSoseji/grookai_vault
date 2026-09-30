// Rollback-only database proof. This never resets a lab, changes its ledger, or
// leaves the proposed schema/fixtures installed. Full replay/upgrade is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';

test('atomic source import: metadata, retries, review, RLS and late rollback', {skip:process.env.GV_COLLECTR_ROLLBACK_PROOF!=='1'},()=>{
 const root=path.resolve(import.meta.dirname,'../..');
 assert.equal(root.replaceAll('\\','/'),'C:/gv_collectr_import_20260930');
 const out='C:/grookai_vault_operator_artifacts/collectr_iphone_import_20260929';
 const baseline=JSON.parse(fs.readFileSync(out+'/baseline-latest.json'));
 assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,409);
 assert.ok(Date.now()-Date.parse(baseline.at)<3600000,'Refresh the read-only baseline gate first');
 const container='supabase_db_grookai-seller-review-20260929';
 const inspect=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8',windowsHide:true}))[0];
 assert.equal(inspect.State.Running,true);assert.deepEqual(Object.keys(inspect.NetworkSettings.Networks),['grookai-seller-review-20260929']);
 const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260930010000_collectr_import_fidelity_v2.sql'),'utf8');
 assert.match(migration,/^begin;/);assert.match(migration,/commit;\s*$/);
 const user=randomUUID(),visitor=randomUUID(),card=randomUUID(),set=randomUUID(),reverse=randomUUID(),holo=randomUUID(),request=randomUUID();
 const source=[{'Product Name':'Synthetic Collectr fixture','Set':'Synthetic set','Card Number':'1','Quantity':'2','Grade':'Ungraded','Variance':'Reverse Holofoil','Portfolio Name':'Private portfolio'},
  {'Product Name':'Synthetic Collectr fixture','Set':'Synthetic set','Card Number':'1','Quantity':'1','Grade':'Ungraded','Variance':'Holofoil','Portfolio Name':'Second portfolio'},
  {'Product Name':'Retained graded fixture','Grade':'PSA 10','Quantity':'1'}];
 const targets=[{sourceIndices:[0],cardId:card,gvId:'GV-PK-COLLECTR-'+card,cardPrintingId:reverse,finishKey:'reverse',desiredQuantity:2,condition:'LP',acquisitionCost:4.25,createdAt:'2026-01-01T00:00:00Z',notes:'Reverse cost'},
  {sourceIndices:[1],cardId:card,gvId:'GV-PK-COLLECTR-'+card,cardPrintingId:holo,finishKey:'holo',desiredQuantity:1,condition:'NM',acquisitionCost:9,createdAt:'2026-02-01T00:00:00Z',notes:'Holo cost'}];
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const sha=hash(source),lit=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
 const call=(id,rows=source,selected=targets)=>`public.admin_import_vault_collection_v2('${user}','${id}','${hash(rows)}',${lit(rows)},${lit(selected)})`;
 const assertSql=(condition,label)=>`select pg_temp.check_import((${condition}),'${label}');`;
 const invalidSource=[{...source[0],'Portfolio Name':'Rollback candidate'},source[1]];
 // Valid target sorts first, so the subsequent wrong GV-ID proves late rollback.
 const sorted=[...targets].sort((a,b)=>a.cardPrintingId.localeCompare(b.cardPrintingId));
 const invalidTargets=[{...sorted[0],desiredQuantity:3,notes:'Rollback new copies'},{...sorted[1],gvId:'WRONG'}];
 const failedRequest=randomUUID(),reviewSource=[source[2]],gradeSource=[{...source[0],Grade:'Ungraded',gRaDe:'CGC 9'}];
 const timestampSource=[{...source[0],'Portfolio Name':'Timestamp','Date Added':'2026-01-01T12:00:00Z'}];
 const timestampTarget={...targets[0],sourceIndices:[0],desiredQuantity:1,createdAt:'2026-01-01T12:00:00Z',createdAtDateOnly:false};
 const dateSource=[{...source[0],'Portfolio Name':'Date only','Date Added':'2026-01-01'}];
 const zoneSource=[{...source[0],'Portfolio Name':'Other zone','Date Added':'2026-01-01T05:00:00-07:00'}];
 const microSource=[{...source[0],'Portfolio Name':'Microseconds','Date Added':'2026-01-02T01:23:45.123456-07:00'}];
 const sql=`begin;
set local statement_timeout='45s';
do $$begin if (select count(*) from supabase_migrations.schema_migrations)<>409 or current_setting('max_worker_processes')<>'0' or to_regclass('public.vault_collection_import_documents_v2') is not null then raise exception 'wrong fixture';end if;end$$;
${migration.replace(/^begin;/,'').replace(/commit;\s*$/,'')}
create function pg_temp.check_import(ok boolean,label text) returns text language plpgsql as $$begin if ok is distinct from true then raise exception 'proof failed: %',label;end if;return label;end$$;
insert into auth.users(id,aud,role,email) values('${user}','authenticated','authenticated','${user}@collectr-fixture.invalid'),('${visitor}','authenticated','authenticated','${visitor}@collectr-fixture.invalid');
insert into public.sets(id,code,name,game) values('${set}','${set}','Synthetic set','pokemon');
insert into public.card_prints(id,set_id,name,number,gv_id,game_id) values('${card}','${set}','Synthetic Collectr fixture','1','GV-PK-COLLECTR-${card}',(select id from public.games where code='pokemon'));
insert into public.card_printings(id,card_print_id,finish_key) values('${reverse}','${card}','reverse'),('${holo}','${card}','holo');
${assertSql(`${call(request)}->>'success'='true'`,'save succeeds')}
${assertSql(`(select count(*) from public.vault_item_instances where user_id='${user}')=3`,'three exact copies')}
${assertSql(`(select count(*) from public.vault_item_instances where user_id='${user}' and card_printing_id='${reverse}' and condition_label='LP' and acquisition_cost=4.25 and notes='Reverse cost' and created_at='2026-01-01T00:00:00Z')=2`,'reverse finish and acquisition metadata retained')}
${assertSql(`(select count(*) from public.vault_item_instances where user_id='${user}' and card_printing_id='${holo}' and acquisition_cost=9)=1`,'holo stays separate')}
${assertSql(`(select source_rows from public.vault_collection_import_documents_v2 where user_id='${user}' and source_sha256='${sha}')=${lit(source)}`,'all original records retained')}
${assertSql(`${call(request)}=(select result from public.vault_collection_import_receipts_v2 where user_id='${user}' and request_id='${request}')`,'lost response replays exact receipt')}
${assertSql(`${call(randomUUID())}->>'importedCards'='0'`,'new attempt same file adds zero')}
${assertSql(`${call(request,source,[])}->>'error'='import_request_conflict'`,'request cannot be rebound')}
${assertSql(`${call(failedRequest,invalidSource,invalidTargets)}->>'success'='false'`,'late identity failure reported')}
${assertSql(`not exists(select 1 from public.vault_collection_import_documents_v2 where user_id='${user}' and source_sha256='${hash(invalidSource)}') and (select count(*) from public.vault_item_instances where user_id='${user}')=3`,'late failure rolls back source and copies')}
${assertSql(`${call(randomUUID(),gradeSource,[targets[0]])}->>'success'='false'`,'mixed-case grade cannot become raw')}
${assertSql(`${call(randomUUID(),reviewSource,[])}->>'reviewRows'='1'`,'review-only source retained without inventory')}
update public.vault_item_instances set archived_at=now() where user_id='${user}' and card_printing_id='${holo}';
${assertSql(`${call(randomUUID())}->>'importedCards'='0' and (select count(*) from public.vault_item_instances where user_id='${user}')=3`,'archived import never recreated')}
${assertSql(`${call(randomUUID(),timestampSource,[timestampTarget])}->>'importedCards'='1'`,'different time on the same UTC date creates a distinct exact copy')}
${assertSql(`${call(randomUUID(),dateSource,[{...timestampTarget,createdAt:'2026-01-01T00:00:00Z',createdAtDateOnly:true}])}->>'importedCards'='0'`,'genuinely date-only source can reconcile the same calendar date')}
${assertSql(`${call(randomUUID(),zoneSource,[{...timestampTarget,createdAt:'2026-01-01T05:00:00-07:00'}])}->>'importedCards'='0'`,'equivalent timezone timestamps reconcile the same instant')}
${assertSql(`${call(randomUUID(),microSource,[{...timestampTarget,createdAt:'2026-01-02T01:23:45.123456-07:00'}])}->>'importedCards'='1'`,'microsecond timestamp saved')}
${assertSql(`exists(select 1 from public.vault_item_instances where user_id='${user}' and created_at='2026-01-02T08:23:45.123456Z')`,'full timestamp precision retained')}
${assertSql(`${call(randomUUID(),[{...source[0],'Portfolio Name':'No printing'}],[{...timestampTarget,cardPrintingId:null,finishKey:null}])}->>'success'='false'`,'parent-only ambiguity cannot bypass the writer')}
${assertSql(`not has_function_privilege('authenticated','public.admin_import_vault_collection_v2(uuid,uuid,text,jsonb,jsonb)','execute') and not has_function_privilege('anon','public.admin_import_vault_collection_v2(uuid,uuid,text,jsonb,jsonb)','execute')`,'writer denied to clients')}
${assertSql(`not has_table_privilege('authenticated','public.vault_collection_import_documents_v2','insert') and not has_table_privilege('authenticated','public.vault_collection_import_receipts_v2','select')`,'no client source writes or receipt access')}
select set_config('test.import_copy_ids',(select array_agg(id)::text from public.vault_item_instances where user_id='${user}'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','${visitor}',true);
${assertSql(`(select count(*) from public.vault_collection_import_documents_v2)=0 and (select count(*) from public.vault_collection_import_groups_v2)=0`,'visitor cannot read source or mappings')}
${assertSql(`(select count(*) from public.get_collection_import_copies_v2('${sha}',current_setting('test.import_copy_ids')::uuid[]))=0`,'visitor cannot read another owner imported copies')}
select set_config('request.jwt.claim.sub','${user}',true);
${assertSql(`(select count(*) from public.vault_collection_import_documents_v2)=6 and (select count(*) from public.vault_collection_import_groups_v2)=6`,'owner can recover original source and mappings')}
${assertSql(`(select count(*) from public.get_collection_import_copies_v2('${sha}',current_setting('test.import_copy_ids')::uuid[]))=3`,'owner readback is limited to copies mapped to this source')}
${assertSql(`(select count(*) from public.get_collection_import_copies_v2('${sha}',current_setting('test.import_copy_ids')::uuid[]) where archived_at is not null)=1`,'owner can verify retained archived copy')}
${assertSql(`(select count(*) from public.get_collection_import_copies_v2(repeat('0',64),current_setting('test.import_copy_ids')::uuid[]))=0`,'unknown source does not expose other owned copies')}
reset role;
rollback;
select to_regclass('public.vault_collection_import_documents_v2') is null as rolled_back;`;
 const result=execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:4*1024*1024});
 const receipt={status:'passed',kind:'rollback-only-not-full-replay',at:new Date().toISOString(),migrationSha256:hash(migration),assertions:(sql.match(/select pg_temp.check_import/g)??[]).length,productionWrites:0,output:result};
 fs.writeFileSync(out+'/atomic-v2-rollback-'+Date.now()+'.private.json',JSON.stringify(receipt,null,2),{flag:'wx'});
 assert.match(result,/owner can recover original source and mappings/);assert.match(result,/\nt\s*$/);
});
