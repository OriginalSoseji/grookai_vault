import {api,exec,out,target,verifyTarget,privateFile} from './collector_hosted_ops.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const p=await verifyTarget();
assert.equal(p.status,'ACTIVE_HEALTHY');
const query=async sql=>api(`/v1/projects/${p.id}/database/query`,{method:'POST',body:{query:sql}});
await api(`/v1/projects/${p.id}/config/auth`,{method:'PATCH',body:{disable_signup:true,external_anonymous_users_enabled:false}});
const mode=process.argv[2];
const hash=s=>createHash('sha256').update(s).digest('hex');
const localSql=sql=>exec('docker',['exec','-i','supabase_db_ycdxbpibncqcchqiihfz','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:sql}).trim();
if(mode==='plan'){
 const source=exec('docker',['exec','supabase_db_ycdxbpibncqcchqiihfz','pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-publications','--no-subscriptions','--schema=public','--schema=admin','--schema=ingest']);
 // pg_dump's psql-only restrict markers and the already existing public schema
 // are omitted explicitly; all application object definitions and grants remain.
 const lines=source.split('\n');
 const platformDefaults=lines.filter(line=>line.startsWith('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin '));
 assert.equal(platformDefaults.length,12,'Unexpected platform-owned defaults');
 let schema=lines.filter(line=>!/^\\(?:un)?restrict \S+\r?$/.test(line)&&!platformDefaults.includes(line)&&line.trim()!=='CREATE SCHEMA public;'&&line.trim()!=='COMMENT ON SCHEMA public IS \'standard public schema\';').join('\n');
 const links=[...schema.matchAll(/https:\/\/grookaivault\.com/g)];
 assert.equal(links.length,5,'Unexpected live URL references; inspect before staging projection');
 assert.equal(JSON.parse(readFileSync(`${out}/vercel-project.json`)).name,'grookai-collector-staging');
 schema=schema.replaceAll('https://grookaivault.com','https://grookai-collector-staging.vercel.app');
 const productionLiterals=[...schema.matchAll(/https?:\/\/[^\s'";]+/g)].map(m=>m[0]);
 assert.ok(!productionLiterals.some(u=>/ycdxbpibncqcchqiihfz|grookaivault\.com|dkuiaiorwirujnrmbpvq/.test(u)),'Embedded production network endpoint in schema');
 const authTriggers=localSql("select coalesce(string_agg(pg_get_triggerdef(t.oid)||';',E'\\n'),'') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname='auth';");
 const extensionSetup="create extension if not exists pg_trgm with schema extensions; create extension if not exists unaccent with schema extensions; create extension if not exists vector with schema extensions; create extension if not exists \"uuid-ossp\" with schema extensions; create extension if not exists pgcrypto with schema extensions;";
 const sql=`begin; set local statement_timeout='100s'; ${extensionSetup}\n${schema}\n${authTriggers}\ncommit;`;
 writeFileSync(`${out}/staging-schema.sql`,sql);
 const before=await query("select count(*)::int as tables from pg_tables where schemaname in ('public','admin','ingest');");
 assert.equal(before[0].tables,0,'New target must have no application tables');
 const plan={target:p.id,name:p.name,sha256:hash(sql),bytes:Buffer.byteLength(sql),sourceSchemas:['public','admin','ingest'],platformSchemasReplaced:[],platformOwnedDefaultPrivilegesOmitted:platformDefaults,authTriggers:authTriggers.split('\n').filter(Boolean).length,externalUrlLiterals:productionLiterals.length,before,sourceDataCopied:false,workers:false,productionWrites:false};
 writeFileSync(`${out}/schema-plan.json`,JSON.stringify(plan,null,2));console.log(JSON.stringify(plan));
}else if(mode==='apply'){
 const plan=JSON.parse(readFileSync(`${out}/schema-plan.json`));const sql=readFileSync(`${out}/staging-schema.sql`,'utf8');assert.equal(plan.target,p.id);assert.equal(hash(sql),plan.sha256);
 const before=await query("select count(*)::int as tables from pg_tables where schemaname in ('public','admin','ingest');");assert.equal(before[0].tables,0,'Refuse application over nonempty schema');
 await query(sql);
 const after=await query("select schemaname,count(*)::int as tables from pg_tables where schemaname in ('public','admin','ingest') group by schemaname; select count(*)::int as users from auth.users;");
 writeFileSync(`${out}/schema-readback.json`,JSON.stringify({target:p.id,sha256:plan.sha256,after},null,2));console.log(JSON.stringify({applied:true,target:p.id,after}));
}else if(mode==='keys'){
 const keys=await api(`/v1/projects/${p.id}/api-keys`);privateFile('keys.json',keys);console.log(JSON.stringify({target:p.id,keyNames:keys.map(k=>k.name)}));
}else throw Error('Explicit plan/apply/keys required');
