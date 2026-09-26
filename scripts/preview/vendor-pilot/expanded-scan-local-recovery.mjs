// Preserve the initial privilege-failure database. Recover only inside this
// newly created, network-disabled rehearsal container, using a separate database.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const dir='.local/integration/vendor-scan-release-20260924',target='grookai-scan-catalog-rehearsal-20260924',database='grookai_scan_catalog_rehearsal_r2',hash=b=>createHash('sha256').update(b).digest('hex');
const plan=JSON.parse(fs.readFileSync(dir+'/local-rehearsal-plan.json')),start=JSON.parse(fs.readFileSync(dir+'/local-rehearsal-start.json'));
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024,timeout:180000,stdio:['pipe','pipe','pipe']}).trim();
const state=JSON.parse(docker(['inspect',target]))[0];assert.equal(state.Id,start.id);assert.equal(state.Image,plan.imageId);assert.equal(state.HostConfig.NetworkMode,'none');assert.equal(Object.keys(state.HostConfig.PortBindings??{}).length,0);
const admin=(db,text)=>docker(['exec','-i',target,'psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],text);
const mode=process.argv[2];
if(mode==='configure'){
 assert.ok(!fs.existsSync(dir+'/local-rehearsal-recovery-config.json'));assert.ok(fs.existsSync(dir+'/rehearsal-restore-error.private.log'));
 admin('postgres',`alter system set shared_preload_libraries='pg_cron,pg_net';\nalter system set cron.database_name='${database}';\nalter role postgres superuser;`);
 docker(['restart',target]);
 fs.writeFileSync(dir+'/local-rehearsal-recovery-config.json',JSON.stringify({at:new Date().toISOString(),target,database,preservedFailureDatabase:plan.database,network:'none',workers:0},null,2),{flag:'wx'});console.log(JSON.stringify({configured:true,target,database}));
}else if(mode==='restore'){
 assert.ok(fs.existsSync(dir+'/local-rehearsal-recovery-config.json'));assert.ok(!fs.existsSync(dir+'/local-rehearsal-restored.json'));
 const schema=fs.readFileSync(dir+'/rehearsal-schema.sql','utf8');assert.equal(hash(schema),plan.schemaSha256);
 admin('postgres',`create database ${database} template template0;`);
 const payload=schema.split('\n').filter(l=>!/^\\(?:un)?restrict \S+\r?$/.test(l)&&l.trim()!=='CREATE SCHEMA public;').join('\n');
 try{docker(['exec','-i',target,'psql','-U','postgres','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1'],payload);}catch(e){fs.writeFileSync(dir+'/rehearsal-r2-restore-error.private.log',String(e.stderr),{flag:'wx'});throw Error('Recovery failed; private log retained.');}
 fs.writeFileSync(dir+'/local-rehearsal-restored.json',JSON.stringify({at:new Date().toISOString(),target,database,sourceSchemaSha256:hash(schema),payloadSha256:hash(payload),superuserOnlyInsideNewOfflineContainer:true},null,2),{flag:'wx'});console.log(JSON.stringify({restored:true,target,database}));
}else throw Error('Explicit configure/restore required');
