// Exact local-only replay/retained upgrade. Never resets a populated lab, links
// a project, repairs history or executes a generated schema diff.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',base='C:/grookai_vault_operator_artifacts/square_sync_20261110';
const choice=process.argv[2];assert.ok(['fresh','retained'].includes(choice));
const lab=base+(choice==='fresh'?'/commerce-fresh-v2':'/local-fresh-v1');
const project=choice==='fresh'?'square-commerce-fresh-487-20261111':'square-fresh-483-20261110';
const candidates=['20261111051000_square_catalog_sync_v1.sql','20261111060000_square_catalog_worker_runs_v1.sql',
 '20261111063000_square_catalog_retry_controls_v1.sql','20261111080000_square_commerce_sync_v2.sql'];
const sha=value=>createHash('sha256').update(value).digest('hex');
const json=name=>JSON.parse(fs.readFileSync(lab+'/'+name));
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(fs.existsSync(lab+'/commerce-apply-intent-v2.json'),false,'Consumed apply intent; inspect retained evidence instead');
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
 {input,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:32_000_000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
const freeze=json('freeze.json');assert.equal(json('replay-result.json').pass,true);
for(const [name,pin]of Object.entries(freeze.sources))for(const prefix of [root,lab])assert.equal(sha(fs.readFileSync(prefix+'/supabase/migrations/'+name)),pin);
const files=fs.readdirSync(root+'/supabase/migrations').filter(name=>/^\d+.*\.sql$/.test(name));
assert.equal(files.length,487);assert.equal(Object.keys(freeze.sources).length,483);
assert.deepEqual(files.filter(name=>!Object.hasOwn(freeze.sources,name)).sort(),candidates);
const baseline=Object.keys(freeze.sources).map(name=>name.match(/^\d+/)[0]).sort();
const beforeVersions=JSON.parse(sql('select json_agg(version order by version) from supabase_migrations.schema_migrations'));
assert.deepEqual(beforeVersions,choice==='fresh'?baseline:baseline.concat(candidates.slice(0,3).map(name=>name.match(/^\d+/)[0])));
const pins=Object.fromEntries(candidates.map(name=>[name,sha(fs.readFileSync(root+'/supabase/migrations/'+name))]));
for(const [name,pin]of Object.entries(pins))if(fs.existsSync(lab+'/supabase/migrations/'+name))assert.equal(sha(fs.readFileSync(lab+'/supabase/migrations/'+name)),pin);
const tables=JSON.parse(sql("begin read only;select json_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in ('public','grookai_square') or (n.nspname='auth' and c.relname='users'));rollback;"));
assert.ok(tables.every(name=>/^[a-z_]+\.[a-z_0-9]+$/.test(name)));
const capture=()=>JSON.parse(sql('begin read only;select jsonb_object_agg(key,value) from (values '+tables.map(name=>{
 const row=name==='grookai_square.connections'?"to_jsonb(t)-'reconcile_cursor'":name==='grookai_square.oauth_attempts'?"to_jsonb(t)-'client_return'":'to_jsonb(t)';
 return "('"+name+"',(select jsonb_build_object('rows',count(*),'sha256',encode(extensions.digest(coalesce(string_agg(("+row+")::text,E'\\n' order by ("+row+")::text),''),'sha256'),'hex')) from "+name+' t))';
}).join(',')+') q(key,value);rollback;'));
const before=capture();
fs.writeFileSync(lab+'/commerce-apply-intent-v2.json',JSON.stringify({consumed:true,choice,pins,beforeVersions,before,at:new Date().toISOString(),productionWrites:0},null,2),{flag:'wx'});
for(const name of candidates)if(!fs.existsSync(lab+'/supabase/migrations/'+name))fs.copyFileSync(root+'/supabase/migrations/'+name,lab+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|SQUARE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const cli=label=>{
 const fd=fs.openSync(lab+'/'+label+'.log','wx');let result;
 try{result=spawnSync('supabase',['db','push','--local','--yes','--workdir',lab,'--network-id',project],
  {env,cwd:lab,windowsHide:true,stdio:['ignore',fd,fd],timeout:300000});}finally{fs.closeSync(fd);}
 assert.ifError(result.error);assert.equal(result.status,0,'Inspect the consumed local apply log. Never reset or replay an unknown intent.');
};
console.log('LOCAL '+choice+' commerce upgrade only: '+project+'; production untouched');
try{
 cli('commerce-apply-v2');const after=capture();assert.deepEqual(after,before,'Existing rows changed');
 const versions=JSON.parse(sql('select json_agg(version order by version) from supabase_migrations.schema_migrations'));
 assert.deepEqual(versions,baseline.concat(candidates.map(name=>name.match(/^\d+/)[0])));
 assert.equal(sql("select enabled::text||':'||revision::text||':'||cardinality(owner_allowlist)::text from grookai_square.commerce_controls where singleton"),'false:0:0');
 cli('commerce-noop-v2');
 fs.writeFileSync(lab+'/commerce-upgrade-result-v2.json',JSON.stringify({pass:true,choice,migrations:487,pins,
  retainedTablesUnchanged:tables.length,before,after,noOpPassed:true,productionWrites:0,at:new Date().toISOString()},null,2),{flag:'wx'});
 console.log(JSON.stringify({pass:true,choice,migrations:487,retainedTablesUnchanged:tables.length,noOpPassed:true,productionWrites:0}));
}catch(error){
 fs.writeFileSync(lab+'/commerce-upgrade-failure-v2.json',JSON.stringify({pass:false,code:error.code??error.name,productionWrites:0}),{flag:'wx'});throw error;
}
