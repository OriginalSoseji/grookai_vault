import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {root,out,target,query} from './ops.mjs';
import {guard,sql,container} from '../../schema/vendor_order_resolutions_runtime_v1.mjs';
const mode=process.argv[2],hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(process.argv.length,3);
const origin='https://grookai-vendor-preview.vercel.app';
if(mode==='plan'){
 assert.ok(!fs.existsSync(path.join(out,'schema-plan.json')),'Existing schema plan must be reviewed, never silently replaced');
 const runtime=guard({full:true});const p=target();assert.equal(p.id,'hrtbjchobencariqclab');
 const before=await query("begin read only; select (select count(*) from pg_tables where schemaname in ('public','admin','ingest')) as tables,(select count(*) from auth.users) as users;rollback;");assert.equal(Number(before[0].tables),0);assert.equal(Number(before[0].users),0);
 const raw=execFileSync('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-publications','--no-subscriptions','--schema=public','--schema=admin','--schema=ingest'],{encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});
 const omitted=[];let schema=raw.split('\n').filter(line=>{if(/^\\(?:un)?restrict \S+\r?$/.test(line)||line.startsWith('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ')||['CREATE SCHEMA public;','COMMENT ON SCHEMA public IS \'standard public schema\';'].includes(line.trim())){omitted.push(line);return false;}return true;}).join('\n');
 schema=schema.replaceAll('https://grookaivault.com',origin);
 assert.ok(!/https?:\/\/[^\s'";]*(ycdxbpibncqcchqiihfz|dkuiaiorwirujnrmbpvq|hcdpcbpnnvtbaezefjkd)/.test(schema),'Preserved network endpoint embedded in schema');
 const authTriggers=sql("select coalesce(string_agg(pg_get_triggerdef(t.oid)||';',E'\\n'),'') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname='auth';");
 const extensions="create extension if not exists pg_trgm with schema extensions;create extension if not exists unaccent with schema extensions;create extension if not exists vector with schema extensions;create extension if not exists \"uuid-ossp\" with schema extensions;create extension if not exists pgcrypto with schema extensions;";
 const payload=`begin;set local statement_timeout='100s';${extensions}\n${schema}\n${authTriggers}\ncommit;`;
 fs.writeFileSync(path.join(out,'schema.sql'),payload,{flag:'wx'});fs.writeFileSync(path.join(out,'schema-source.sql'),raw,{flag:'wx'});
 const plan={at:new Date().toISOString(),target:p.id,sourceProject:runtime.project,sourceHashes:runtime.sourceHashes,sha256:hash(payload),bytes:Buffer.byteLength(payload),omitted,authTriggers:authTriggers.split('\n').filter(Boolean).length,before,dataCopied:false,workersEnabled:false};
 fs.writeFileSync(path.join(out,'schema-plan.json'),JSON.stringify(plan,null,2),{flag:'wx'});console.log(JSON.stringify({planned:true,target:p.id,bytes:plan.bytes,migrations:Object.keys(runtime.sourceHashes).length,dataCopied:false}));
}else if(mode==='apply'){
 const p=target(),plan=JSON.parse(fs.readFileSync(path.join(out,'schema-plan.json'),'utf8')),payload=fs.readFileSync(path.join(out,'schema.sql'),'utf8');assert.equal(plan.target,p.id);assert.equal(hash(payload),plan.sha256);
 assert.ok(!fs.existsSync(path.join(out,'schema-applied.json')),'Already applied');
 const before=await query("begin read only; select (select count(*) from pg_tables where schemaname in ('public','admin','ingest')) as tables,(select count(*) from auth.users) as users;rollback;");assert.equal(Number(before[0].tables),0);assert.equal(Number(before[0].users),0);
 await query(payload);
 const after=await query("begin read only;select (select count(*) from pg_tables where schemaname in ('public','admin','ingest')) as tables,(select count(*) from auth.users) as users,(select count(*) from vendor_stores) as stores;rollback;");assert.equal(Number(after[0].users),0);assert.equal(Number(after[0].stores),0);
 fs.writeFileSync(path.join(out,'schema-applied.json'),JSON.stringify({at:new Date().toISOString(),target:p.id,sha256:plan.sha256,after},null,2),{flag:'wx'});console.log(JSON.stringify({applied:true,target:p.id,after}));
}else throw Error('Explicit plan/apply action required');
