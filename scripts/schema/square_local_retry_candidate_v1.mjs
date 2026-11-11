// Retained-data upgrade only in the already-populated task-owned local lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const project='square-fresh-483-20261110',candidate='20261111063000_square_catalog_retry_controls_v1.sql';
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(fs.existsSync(lab+'/retry-candidate-intent.json'),false,'Never repeat consumed upgrade intent');
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
  {input,encoding:'utf8',timeout:120000,maxBuffer:16_000_000,windowsHide:true}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
const frozen=JSON.parse(fs.readFileSync(lab+'/freeze.json'));
for(const[file,pin]of Object.entries(frozen.sources))for(const source of[root,lab])assert.equal(sha(fs.readFileSync(source+'/supabase/migrations/'+file)),pin);
for(const name of['candidate-intent.json','worker-candidate-intent.json']){
 const proof=JSON.parse(fs.readFileSync(lab+'/'+name));
 for(const source of[root,lab])assert.equal(sha(fs.readFileSync(source+'/supabase/migrations/'+proof.candidate)),proof.sha256);
}
const tables=['auth.users','public.card_prints','public.vault_items','public.vault_item_instances','public.public_profiles','public.user_entitlements',
 'grookai_square.connections','grookai_square.oauth_attempts','grookai_square.targets','grookai_square.operations','grookai_square.worker_runs'];
const capture=()=>JSON.parse(sql('begin read only;select jsonb_build_object('+tables.map(name=>"'"+name+"',(select jsonb_build_object('rows',count(*),'sha256',encode(extensions.digest(coalesce(string_agg((to_jsonb(t)-'retry_after')::text,E'\\n' order by (to_jsonb(t)-'retry_after')::text),''),'sha256'),'hex')) from "+name+' t)').join(',')+');rollback;'));
const before=capture();assert.equal(before['auth.users'].rows,2);assert.equal(before['public.vault_item_instances'].rows,3);
const bytes=fs.readFileSync(root+'/supabase/migrations/'+candidate);
fs.copyFileSync(root+'/supabase/migrations/'+candidate,lab+'/supabase/migrations/'+candidate,fs.constants.COPYFILE_EXCL);
fs.writeFileSync(lab+'/retry-candidate-intent.json',JSON.stringify({candidate,sha256:sha(bytes),before,at:new Date().toISOString(),consumed:true,productionWrites:0},null,2),{flag:'wx'});
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
for(const label of['retry-candidate-apply','retry-candidate-noop']){
 const fd=fs.openSync(lab+'/'+label+'.log','wx');let result;
 try{result=spawnSync('supabase',['db','push','--local','--yes','--workdir',lab,'--network-id',project],{env,cwd:lab,windowsHide:true,stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
 assert.ifError(result.error);assert.equal(result.status,0,'Inspect retained candidate log; never reset/retry this intent');
}
const after=capture();assert.deepEqual(after,before,'Retained data changed');
assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'486');
fs.writeFileSync(lab+'/retry-candidate-result.json',JSON.stringify({pass:true,migrations:486,sha256:sha(bytes),retainedTableDigests:after,
 unchangedTables:tables.length,noOpPassed:true,productionWrites:0},null,2),{flag:'wx'});
console.log(JSON.stringify({pass:true,migrations:486,retainedTablesUnchanged:tables.length,productionWrites:0}));
