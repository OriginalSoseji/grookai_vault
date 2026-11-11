// Fixed forward-only repair in the two retained task labs. No resets, remote
// targets, history repair, generated diff execution or mutable applied SQL.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',base='C:/grookai_vault_operator_artifacts/square_sync_20261110';
const choice=process.argv[2];assert.ok(['fresh','retained'].includes(choice));
const lab=base+(choice==='fresh'?'/commerce-fresh-v2':'/local-fresh-v1'),project=choice==='fresh'?'square-commerce-fresh-487-20261111':'square-fresh-483-20261110';
const name='20261111130000_square_inventory_anchor_core_v3.sql',bytes=fs.readFileSync(root+'/supabase/migrations/'+name),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(fs.existsSync(lab+'/anchor-apply-intent-v3.json'),false,'Consumed local intent');assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const previous=JSON.parse(fs.readFileSync(lab+'/commerce-upgrade-result-v2.json'));assert.equal(previous.pass,true);
for(const [file,pin]of Object.entries(previous.pins))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,maxBuffer:32_000_000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'487');
const tables=JSON.parse(sql("select json_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in ('public','grookai_square') or (n.nspname='auth' and c.relname='users'))"));
assert.ok(tables.every(n=>/^[a-z_]+\.[a-z_0-9]+$/.test(n)));
const snapshot=()=>JSON.parse(sql("begin read only;select jsonb_object_agg(key,value) from (values "+tables.map(n=>"('"+n+"',(select jsonb_build_object('rows',count(*),'sha256',encode(extensions.digest(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text),''),'sha256'),'hex')) from "+n+' t))').join(',')+') q(key,value);rollback;'));
const before=snapshot();fs.writeFileSync(lab+'/anchor-apply-intent-v3.json',JSON.stringify({consumed:true,choice,file:name,sha256:sha(bytes),before,at:new Date().toISOString(),productionWrites:0},null,2),{flag:'wx'});
fs.copyFileSync(root+'/supabase/migrations/'+name,lab+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|SQUARE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
for(const phase of ['apply','noop']){
 const fd=fs.openSync(lab+'/anchor-'+phase+'-v3.log','wx');let result;
 try{result=spawnSync('supabase',['db','push','--local','--yes','--workdir',lab,'--network-id',project],{env,cwd:lab,windowsHide:true,stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
 assert.ifError(result.error);assert.equal(result.status,0,'Inspect consumed local migration log');
}
const after=snapshot();assert.deepEqual(after,before);assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'488');
fs.writeFileSync(lab+'/anchor-upgrade-result-v3.json',JSON.stringify({pass:true,choice,file:name,sha256:sha(bytes),retainedTablesUnchanged:tables.length,migrations:488,noOpPassed:true,productionWrites:0,at:new Date().toISOString()},null,2),{flag:'wx'});
console.log(JSON.stringify({pass:true,choice,migrations:488,retainedTablesUnchanged:tables.length,productionWrites:0}));
