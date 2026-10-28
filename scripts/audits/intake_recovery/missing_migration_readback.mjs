// Offline comparison only. Remote input is a schema-only CLI dump; no remote SQL runs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {splitSealedMigrationStatementsV1} from '../../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs';

const root=path.resolve('.');
const out=path.join(root,'docs/audits/intake_recovery_20261027');
const privateRoot='C:/gv_intake_recovery_private_20261027';
const container='gv-intake-history-proof-20261027';
const image='sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e';
const sourcePath='supabase/migrations/20261023120000_lot_label_sales_v1.sql';
const originalCommit='b1f4cd289bb3aedf06097c8a4b90fe63f2127ea8';
const expectedSha='03aa6bf13897a0d0d1fe20df33ef0d894821d0a617e91aeb99521be4fe112578';
const sha=value=>createHash('sha256').update(value).digest('hex');
const original=execFileSync('git',['show',`${originalCommit}:${sourcePath}`]);
assert.equal(sha(original),expectedSha,'Original source bytes changed');
fs.mkdirSync(privateRoot,{recursive:true});
fs.writeFileSync(path.join(privateRoot,'original-lot-label-sales.sql'),original);
const dump=fs.readFileSync(path.join(privateRoot,'remote-public-schema.sql'),'utf8');
assert.ok(dump.length>1_000_000,'A complete schema capture is required');

function leadingComments(value){let text=value.trim();while(text.startsWith('--'))text=text.slice(text.indexOf('\n')+1).trimStart();return text;}
const statements=splitSealedMigrationStatementsV1(dump).map(leadingComments);
const selected=statements.filter(sql=>
  /^(?:CREATE(?: OR REPLACE)? FUNCTION|ALTER FUNCTION)\s+"public"\."lot_label_(?:public_read|record_sale)_v1"\(/.test(sql)||
  /^(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE(?: ONLY)?)\s+"public"\."lot_label_(?:lots|sales)"/.test(sql)||
  /^CREATE (?:POLICY|INDEX) "lot_label_[^"]+" (?:ON|ON ONLY) "public"\."lot_label_(?:lots|sales)"/.test(sql)||
  /^(?:GRANT|REVOKE) [\s\S]+ ON (?:FUNCTION|TABLE) "public"\."lot_label_(?:lots|sales|public_read_v1|record_sale_v1)"/.test(sql));
const defaults=statements.filter(sql=>/^ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON (?:TABLES|FUNCTIONS|SEQUENCES) TO "(?:postgres|anon|authenticated|service_role)"$/.test(sql));
assert.equal(defaults.length,12,'Unexpected live default-privilege footprint');
assert.equal(selected.filter(s=>s.startsWith('CREATE TABLE')).length,2);
assert.equal(selected.filter(s=>s.startsWith('CREATE OR REPLACE FUNCTION')).length,2);
assert.equal(selected.filter(s=>s.startsWith('CREATE POLICY')).length,3);
fs.writeFileSync(path.join(privateRoot,'captured-lot-label-objects.sql'),selected.join(';\n')+';\n');

const exists=spawnSync('docker',['inspect',container],{encoding:'utf8'});
assert.notEqual(exists.status,0,'Use a fresh named proof container; never reset a retained lab');
execFileSync('docker',['run','-d','--network','none','--name',container,'-e','POSTGRES_PASSWORD=local-intake-audit-only',image],{encoding:'utf8',timeout:30000});
for(let n=0;n<30;n++){
  const ready=spawnSync('docker',['exec',container,'pg_isready','-U','postgres'],{encoding:'utf8'});
  if(ready.status===0)break;
  if(n===29)throw Error('Local proof database failed to start');
  await new Promise(resolve=>setTimeout(resolve,500));
}
const footprint=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];
assert.equal(footprint.HostConfig.NetworkMode,'none');
assert.deepEqual(footprint.HostConfig.PortBindings,{});
function sql(database,query){return execFileSync('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-qAt','-U','postgres','-d',database],{input:query,encoding:'utf8',timeout:30000,maxBuffer:5_000_000});}
sql('postgres','create database source_definition; create database deployed_definition;');
const bootstrap=`
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end$$;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
set check_function_bodies=off;
${defaults.join(';\n')};
`;
sql('source_definition',bootstrap+original.toString('utf8'));
sql('deployed_definition',bootstrap+selected.join(';\n')+';');
const snapshot=`select json_build_object(
 'columns',(select json_agg(x order by table_name,ordinal_position) from (select table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name in ('lot_label_lots','lot_label_sales')) x),
 'constraints',(select json_agg(x order by relation,name) from (select c.relname relation,n.conname name,pg_get_constraintdef(n.oid) definition from pg_constraint n join pg_class c on c.oid=n.conrelid join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relname in ('lot_label_lots','lot_label_sales')) x),
 'indexes',(select json_agg(x order by indexname) from (select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename in ('lot_label_lots','lot_label_sales')) x),
 'rls',(select json_agg(x order by name) from (select c.relname name,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relname in ('lot_label_lots','lot_label_sales')) x),
 'policies',(select json_agg(x order by tablename,policyname) from (select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('lot_label_lots','lot_label_sales')) x),
 'table_grants',(select json_agg(x order by table_name,grantee,privilege_type) from (select table_name,grantee,privilege_type,is_grantable from information_schema.role_table_grants where table_schema='public' and table_name in ('lot_label_lots','lot_label_sales')) x),
 'functions',(select json_agg(x order by name) from (select p.proname name,pg_get_userbyid(p.proowner) owner,pg_get_function_identity_arguments(p.oid) arguments,pg_get_function_arguments(p.oid) defaults,pg_get_function_result(p.oid) result,p.prosrc body,l.lanname language,p.provolatile volatility,p.prosecdef security_definer,p.proconfig config,p.proacl::text acl from pg_proc p join pg_namespace s on s.oid=p.pronamespace join pg_language l on l.oid=p.prolang where s.nspname='public' and p.proname in ('lot_label_public_read_v1','lot_label_record_sale_v1')) x)
);`;
const source=JSON.parse(sql('source_definition',snapshot));
const live=JSON.parse(sql('deployed_definition',snapshot));
// ACL order is not authority; every role/privilege/grant-option entry remains checked.
for(const shape of [source,live])for(const fn of shape.functions){fn.acl=fn.acl.slice(1,-1).split(',').sort();fn.body=fn.body.replaceAll('\r\n','\n').trim();}
const differences=Object.keys(source).filter(key=>JSON.stringify(source[key])!==JSON.stringify(live[key]));
fs.writeFileSync(path.join(out,'missing-migration-source-shape.json'),JSON.stringify(source,null,2));
fs.writeFileSync(path.join(out,'missing-migration-deployed-shape.json'),JSON.stringify(live,null,2));
const report={observedAt:new Date().toISOString(),comparison:'offline_restore_of_schema_only_live_capture',remoteWrites:0,localContainer:container,network:'none',sourceCommit:originalCommit,sourcePath,sourceSha256:sha(original),remotePublicSchemaSha256:sha(dump),capturedStatements:selected.length,defaultPrivilegeStatements:defaults.length,differences,pass:differences.length===0};
fs.writeFileSync(path.join(out,'missing-migration-parity.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
assert.equal(differences.length,0,'Recovered migration differs from deployed definitions/security');
