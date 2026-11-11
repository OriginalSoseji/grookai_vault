// Forward-only upgrade of the two existing isolated labs. Never production,
// never resets a populated database, and preserves every prior row field.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',base='C:/grookai_vault_operator_artifacts/square_sync_20261110',choice=process.argv[2];assert.ok(['fresh','retained'].includes(choice));
const lab=base+(choice==='fresh'?'/commerce-fresh-v2':'/local-fresh-v1'),project=choice==='fresh'?'square-commerce-fresh-487-20261111':'square-fresh-483-20261110';
const name='20261111170000_square_order_review_isolation_v4.sql',bytes=fs.readFileSync(root+'/supabase/migrations/'+name),sha=value=>createHash('sha256').update(value).digest('hex');
assert.equal(sha(bytes),'b3b00bdee0ee86d8576eb60a1afcbcf999370fe65e7a9590ed54f8f47cbf805c');
assert.equal(fs.existsSync(lab+'/order-review-apply-intent-v4.json'),false,'Consumed local apply; inspect history before any recovery');assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const manifest=JSON.parse(fs.readFileSync(root+'/docs/audits/square_commerce_20261111/release-manifest-v5.json'));
assert.equal(Object.keys(manifest.history).length+Object.keys(manifest.candidates).length,491);
for(const [file,pin]of Object.entries({...manifest.history,...manifest.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin,'Immutable history changed');
assert.equal(JSON.parse(fs.readFileSync(lab+'/payment-time-upgrade-result-v3.json')).pass,true);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:32_000_000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'491');
assert.equal(sql("select count(*) from information_schema.columns where table_schema='grookai_square' and table_name='allocations' and column_name in ('review_order_id','review_stock_operation_id')"),'0');
const tables=JSON.parse(sql("select json_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in ('public','grookai_square') or (n.nspname='auth' and c.relname='users'))"));assert.ok(tables.every(name=>/^[a-z_]+\.[a-z_0-9]+$/.test(name)));
const snapshot=()=>JSON.parse(sql("begin read only;select jsonb_object_agg(key,value) from (values "+tables.map(table=>{
 const value=table==='grookai_square.allocations'?"(to_jsonb(t)-array['review_order_id','review_stock_operation_id'])":'to_jsonb(t)';
 return "('"+table+"',(select jsonb_build_object('rows',count(*),'sha256',encode(extensions.digest(coalesce(string_agg("+value+"::text,E'\\n' order by "+value+"::text),''),'sha256'),'hex')) from "+table+' t))';
}).join(',')+') q(key,value);rollback;'));
const before=snapshot();fs.writeFileSync(lab+'/order-review-apply-intent-v4.json',JSON.stringify({consumed:true,choice,file:name,sha256:sha(bytes),before,addedNullableFields:['review_order_id','review_stock_operation_id'],at:new Date().toISOString(),productionWrites:0},null,2),{flag:'wx'});
fs.copyFileSync(root+'/supabase/migrations/'+name,lab+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|SQUARE|DATABASE_URL|POSTGRES_URL|^PG/.test(key))delete env[key];
for(const phase of ['dry-run','apply','noop']){
 const file=lab+'/order-review-'+phase+'-v4.log',fd=fs.openSync(file,'wx');let result;
 try{result=spawnSync('supabase',['db','push','--local','--yes',...(phase==='dry-run'?['--dry-run']:[]),'--workdir',lab,'--network-id',project],{env,cwd:lab,windowsHide:true,stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
 assert.ifError(result.error);assert.equal(result.status,0,'Inspect consumed local upgrade log');
 if(phase==='dry-run')assert.deepEqual([...new Set(fs.readFileSync(file,'utf8').match(/\d{14}_[a-z0-9_]+\.sql/g)??[])],[name]);
}
assert.deepEqual(snapshot(),before,'Existing row fields changed');assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'492');
assert.equal(sql('select count(*) from grookai_square.allocations where review_order_id is not null or review_stock_operation_id is not null'),'0');
const proof={pass:true,choice,file:name,sha256:sha(bytes),retainedTablesUnchanged:tables.length,priorAllocationFieldsUnchanged:true,newReviewFieldsInitiallyNull:true,migrations:492,noOpPassed:true,productionWrites:0,at:new Date().toISOString()};
fs.writeFileSync(lab+'/order-review-upgrade-result-v4.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
