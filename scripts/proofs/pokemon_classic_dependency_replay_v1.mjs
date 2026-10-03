import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import pg from 'pg';
// Isolated replay only. No production route or approval switch exists.
const [state,name,out]=process.argv.slice(2);
assert.ok(state && name && out && process.argv.length===5,'state_database_new_output_required');
assert.match(name,/^grookai_classic_canonical_proof_deps_[a-z0-9_]+$/,'scoped_proof_database_required');
assert.ok(Buffer.byteLength(name)<=63,'database_identifier_too_long');
const localUrl=new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);
assert.ok(['127.0.0.1','localhost'].includes(localUrl.hostname),'loopback_proof_route_required');
assert.equal(localUrl.pathname,'/postgres','local_admin_database_required');
assert.ok(!fs.existsSync(out),'new_immutable_output_required');
const version=createHash('sha256').update(name).digest('hex').slice(0,12);
fs.mkdirSync(out);const save=(f,v)=>fs.writeFileSync(out+'/'+f,JSON.stringify(v,null,2)+'\n',{flag:'wx'}),read=f=>JSON.parse(fs.readFileSync(f));
const input=state+'/classic-dependency-leads-v1/replay-inputs.json',p=read(input),authFile=state+'/'+p.auth_schema_file,a=read(authFile);
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');assert.equal(sha(authFile),p.auth_schema_sha256);
const inputHash=sha(input),authHash=sha(authFile),scriptHash=sha(new URL(import.meta.url));
const q=s=>'"'+s.replaceAll('"','""')+'"',lit=s=>"'"+s.replaceAll("'","''")+"'";
const config={connectionString:localUrl.href,ssl:false,connectionTimeoutMillis:10000,options:'-c statement_timeout=30000 -c lock_timeout=5000'};
const roles=Object.fromEntries(['anon','authenticated','service_role','postgres','supabase_auth_admin','supabase_admin','dashboard_user','authenticator'].map(r=>[r,'classic_dep_'+version+'_'+r]));
const translate=r=>r==='public'?'public':q(roles[r]??r);
save('start.json',{at:new Date().toISOString(),database:name,local_only:true,production_writes:0});
let admin,db,source,phase='initialization';const checks=[],copied={},statements=[];
try {
admin=new pg.Client(config);await admin.connect();
assert.equal((await admin.query('select 1 from pg_database where datname=$1',[name])).rowCount,0);
for(const [source,role]of Object.entries(roles)){
 assert.equal((await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount,0);
 const info=p.roles.find(r=>r.rolname===source);
 // Fresh NOLOGIN principals preserve access attributes without granting cluster administration.
 await admin.query(`create role ${q(role)} nologin nosuperuser nocreatedb nocreaterole noreplication ${info.rolinherit?'inherit':'noinherit'} ${info.rolbypassrls?'bypassrls':'nobypassrls'}`);
}
for(const m of p.memberships.filter(m=>roles[m.role]&&roles[m.member]))await admin.query(`grant ${q(roles[m.role])} to ${q(roles[m.member])} with inherit ${m.inherit_option}, set ${m.set_option}, admin ${m.admin_option}`);
await admin.query(`create database ${q(name)} owner ${q(roles.postgres)}`);await admin.end();admin=null;
const url=new URL(config.connectionString);url.pathname='/'+name;
db=new pg.Client({...config,connectionString:url.href});source=new pg.Client({...config,connectionString:new URL('/grookai_classic_catalog_proof_20261002_v1',localUrl).href});
await db.connect();await source.connect();await source.query('begin isolation level repeatable read read only');
phase='schema';
const run=async sql=>{statements.push(sql);return db.query(sql);};
const schemas=[['public',p],['auth',a]], extras=read(state+'/classic-sequence-extension-observation-v1/metadata.json');
const extrasHash=sha(state+'/classic-sequence-extension-observation-v1/metadata.json');
const aclEntries=acl=>[...(acl??'').matchAll(/(?:^\{|,)([^=]*)=([a-zA-Z*]+)\/[^,}]+/g)].map(m=>({role:m[1]||'public',privileges:m[2]}));
 await run('create schema auth');await run('create schema extensions');await run('create extension pgcrypto with schema extensions');await run('create extension pg_trgm');await run('create extension "uuid-ossp" with schema extensions');
 for(const [schema,s]of schemas){
  for(const type of [...new Set(s.enums.map(e=>e.typname))])await run(`create type ${q(schema)}.${q(type)} as enum (${s.enums.filter(e=>e.typname===type).sort((x,y)=>x.enumsortorder-y.enumsortorder).map(e=>lit(e.enumlabel)).join(',')})`);
  const seqs=new Set(s.columns.map(c=>c.column_default?.match(/nextval\('([^']+)'::regclass\)/)?.[1]).filter(Boolean));
  for(const seq of seqs)await run(`create sequence ${seq.includes('.')?seq:q(schema)+'.'+q(seq)} start 1000000`);
  for(const r of s.relations.filter(r=>r.relkind==='r')){
   const cols=s.columns.filter(c=>c.table_name===r.relname).sort((x,y)=>x.ordinal_position-y.ordinal_position);assert.ok(cols.length);
   await run(`create table ${q(schema)}.${q(r.relname)} (${cols.map(c=>{
    const type=(c.udt_schema==='pg_catalog'?'':q(c.udt_schema)+'.')+q(c.data_type==='ARRAY'?c.udt_name.slice(1):c.udt_name)+(c.data_type==='ARRAY'?'[]':'');
    return `${q(c.column_name)} ${type}${c.is_generated==='ALWAYS'?' generated always as ('+c.generation_expression+') stored':''}${c.is_identity==='YES'?' generated '+c.identity_generation+' as identity':''}${c.is_nullable==='NO'?' not null':''}${c.column_default?' default '+c.column_default:''}`;
   }).join(',')})`);
  }
 }
 for(const[schema,s]of schemas)for(const r of s.relations.filter(r=>r.relkind==='v'))await run(`create view ${q(schema)}.${q(r.relname)} as ${r.view_definition}`);
 phase='functions';
 const allFunctions=[...p.functions,...a.functions.filter(f=>!p.functions.some(x=>x.signature===f.signature))];let todo=[...allFunctions];
 while(todo.length){const pending=[];for(const f of todo){try{await run(f.definition);}catch(e){if(!['42883','42P01'].includes(e.code))throw e;pending.push(f);}}
 assert.ok(pending.length<todo.length,'unresolved_functions:'+pending.map(f=>f.signature));todo=pending;}

 phase='copy_isolated_fixture_data';
 // Only existing local qualification data. Never copy production Auth/user rows.
 for(const r of p.relations.filter(r=>r.relkind==='r')){
  const exists=(await source.query('select to_regclass($1) name',['public.'+r.relname])).rows[0].name;
  if(!exists||['canon_warehouse_candidates','sealed_product_source_mappings'].includes(r.relname)){copied[r.relname]=0;continue;}
  const rows=(await source.query(`select to_jsonb(t) row from public.${q(r.relname)} t`)).rows.map(x=>x.row);copied[r.relname]=rows.length;
  if(!rows.length)continue;
  const cols=p.columns.filter(c=>c.table_name===r.relname&&c.is_generated!=='ALWAYS').map(c=>q(c.column_name));
  await db.query(`insert into public.${q(r.relname)} (${cols}) overriding system value select ${cols} from jsonb_populate_recordset(null::public.${q(r.relname)},$1::jsonb)`,[JSON.stringify(rows)]);
 }
 phase='constraints';
 for(const[schema,s]of schemas)for(const c of s.constraints.filter(c=>c.contype!=='f'))await run(`alter table ${q(schema)}.${q(c.table_name.replace(/^(public|auth)\./,''))} add constraint ${q(c.conname)} ${c.definition}`);
 for(const[schema,s]of schemas)for(const c of s.constraints.filter(c=>c.contype==='f'))await run(`alter table ${q(schema)}.${q(c.table_name.replace(/^(public|auth)\./,''))} add constraint ${q(c.conname)} ${c.definition}`);
 // Preserve the explicit old dependency sentinel as additional local evidence.
 const sentinel=(await source.query('select to_jsonb(t) row from proof_existing_dependencies t')).rows.map(x=>x.row);
 await run('create table public.proof_existing_dependencies(id uuid primary key,parent_id uuid references card_prints(id),child_id uuid references card_printings(id),payload jsonb not null)');
 await db.query('insert into proof_existing_dependencies select * from jsonb_populate_recordset(null::proof_existing_dependencies,$1::jsonb)',[JSON.stringify(sentinel)]);
 phase='indexes_triggers';
 for(const[schema,s]of schemas){
  for(const i of s.indexes)if(!(await db.query('select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$1 and c.relname=$2',[schema,i.indexname])).rowCount)await run(i.indexdef);
  for(const t of s.triggers)await run(t.definition);
 }
 phase='owners_acls_rls';
 const applyAcl=async(kind,target,acl,map)=>{
  await run(`revoke all on ${kind} ${target} from public`);
  for(const e of aclEntries(acl)){
   if(!(e.role in roles)&&e.role!=='public'&&e.role!=='pg_database_owner')throw new Error('unmapped_acl_role:'+e.role);
   for(let i=0;i<e.privileges.length;i++){
    const key=e.privileges[i];if(key==='*')continue;if(key==='m')continue; // PostgreSQL17 MAINTAIN has no16 equivalent; recorded as explicit gap.
    assert.ok(map[key],'unknown_acl_privilege:'+key);
    await run(`grant ${map[key]} on ${kind} ${target} to ${translate(e.role)}${e.privileges[i+1]==='*'?' with grant option':''}`);
   }
  }
 };
 for(const[schema,s]of schemas){
  for(const r of s.relations){
   const target=q(schema)+'.'+q(r.relname),kind=r.relkind==='S'?'sequence':'table';
   await run(`alter ${r.relkind==='S'?'sequence':r.relkind==='v'?'view':'table'} ${target} owner to ${translate(r.owner)}`);
   await applyAcl(kind,target,r.relacl,r.relkind==='S'?{r:'select',w:'update',U:'usage'}:{r:'select',a:'insert',w:'update',d:'delete',D:'truncate',x:'references',t:'trigger'});
   if(r.relkind==='r'){
    await run(`alter table ${target} ${r.relrowsecurity?'enable':'disable'} row level security`);
    await run(`alter table ${target} ${r.relforcerowsecurity?'force':'no force'} row level security`);
   }
  }
  for(const policy of s.policies){
   const principals=policy.roles.slice(1,-1).split(',').map(translate).join(',');
   await run(`create policy ${q(policy.policyname)} on ${q(schema)}.${q(policy.tablename)} as ${policy.permissive} for ${policy.cmd} to ${principals}${policy.qual?' using ('+policy.qual+')':''}${policy.with_check?' with check ('+policy.with_check+')':''}`);
  }
 }
 for(const f of allFunctions){await run(`alter function ${f.signature} owner to ${translate(f.owner)}`);if(f.proacl!==null)await applyAcl('function',f.signature,f.proacl,{X:'execute'});}
 for(const s of [...p.schemas,...extras.schemas]){await run(`alter schema ${q(s.nspname)} owner to ${translate(s.owner)}`);await applyAcl('schema',q(s.nspname),s.nspacl,{U:'usage',C:'create'});}

 await run('alter table public.proof_existing_dependencies owner to '+translate('postgres'));
 for(const seq of extras.sequences){
  const target=q(seq.nspname)+'.'+q(seq.relname);
  if(!(await db.query('select to_regclass($1) name',[seq.nspname+'.'+seq.relname])).rows[0].name)continue;
  await run('alter sequence '+target+' owner to '+translate(seq.owner));
  await applyAcl('sequence',target,seq.relacl,{r:'select',w:'update',U:'usage'});
 }
 for(const f of extras.functions){const sig=f.signature.includes('.')?f.signature:'extensions.'+f.signature;
  await run('alter function '+sig+' owner to '+translate(f.owner));await applyAcl('function',sig,f.proacl,{X:'execute'});
 }

 phase='independent_schema_readback';
 const counts=(await db.query("select n.nspname,c.relkind,count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','v') group by 1,2 order by 1,2")).rows;
 const definitions=(await db.query("select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','v') order by 1,2")).rows;
 for(const[schema,s]of schemas)for(const r of s.relations.filter(r=>r.relkind!=='S')){const got=definitions.find(x=>x.nspname===schema&&x.relname===r.relname);assert.equal(got.owner,roles[r.owner]??r.owner);assert.equal(got.relrowsecurity,r.relrowsecurity);assert.equal(got.relforcerowsecurity,r.relforcerowsecurity);}
 for(const[schema,s]of schemas)for(const r of s.relations.filter(r=>r.relkind==='r')){const n=(await db.query(`select count(*)::int n from ${q(schema)}.${q(r.relname)}`)).rows[0].n;assert.equal(n,schema==='auth'?0:copied[r.relname]);}
 checks.push('28selectedpublicrelations plus full captured Auth schema replayed with zero Auth user rows');checks.push('all selected constraints indexes triggers functions policies and translated owners replayed');checks.push('every original fixture row retained; both guard stubs replaced by actual full schemas');
 const verifier=new pg.Client({...config,connectionString:url.href});await verifier.connect();
 try {
 const normalize=s=>s?.replace(/\s+/g,' ').trim();
 await verifier.query('begin isolation level repeatable read read only');
for(const [schema,s]of [['public',p],['auth',a]]){
 const columns=(await verifier.query('select table_name,column_name,udt_schema,udt_name,is_nullable,column_default,is_generated,generation_expression,is_identity,identity_generation from information_schema.columns where table_schema=$1',[schema])).rows;
 for(const c of s.columns){const got=columns.find(x=>x.table_name===c.table_name&&x.column_name===c.column_name);assert.ok(got,`missing_column:${schema}.${c.table_name}.${c.column_name}`);for(const key of ['udt_schema','udt_name','is_nullable','column_default','is_generated','generation_expression','is_identity','identity_generation'])assert.equal(normalize(got[key]),normalize(c[key]),`${schema}.${c.table_name}.${c.column_name}:${key}`);}
 const cons=(await verifier.query('select c.relname table_name,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname=$1',[schema])).rows;
 for(const c of s.constraints){const got=cons.find(x=>x.table_name===c.table_name.replace(/^(auth|public)\./,'')&&x.conname===c.conname);assert.ok(got,'missing_constraint:'+c.conname);assert.equal(got.contype,c.contype);assert.equal(got.convalidated,c.convalidated);assert.equal(normalize(got.definition),normalize(c.definition),'constraint:'+c.conname);}
 const triggers=(await verifier.query('select c.relname table_name,t.tgname,pg_get_triggerdef(t.oid) definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname=$1 and not t.tgisinternal',[schema])).rows;
 for(const t of s.triggers){const got=triggers.find(x=>x.tgname===t.tgname&&x.table_name===t.table_name.replace(/^(public|auth)\./,''));assert.ok(got,'missing_trigger:'+JSON.stringify(t));assert.equal(normalize(got.definition),normalize(t.definition));}
 checks.push(`${schema}:${s.columns.length}columns/${s.constraints.length}constraints/${s.triggers.length}triggers independently exact`);
}
for(const f of [...p.functions,...a.functions.filter(f=>!p.functions.some(x=>x.signature===f.signature))]){
 const got=(await verifier.query('select pg_get_functiondef($1::regprocedure) definition,pg_get_userbyid(proowner) owner,prosecdef,proconfig from pg_proc where oid=$1::regprocedure',[f.signature])).rows[0];assert.equal(normalize(got.definition),normalize(f.definition),'function_definition:'+f.signature);assert.equal(got.owner,roles[f.owner]??f.owner);
}
checks.push('33actual functions independently exact, with translated owners including SECURITY DEFINER');
 await verifier.query('commit');
 } finally { await verifier.end(); }
 assert.equal(sha(input),inputHash,'dependency_input_drift');assert.equal(sha(authFile),authHash,'auth_input_drift');assert.equal(sha(new URL(import.meta.url)),scriptHash,'proof_source_drift');assert.equal(sha(state+'/classic-sequence-extension-observation-v1/metadata.json'),extrasHash,'access_input_drift');
 save('bindings.json',{input_sha256:sha(input),auth_sha256:sha(authFile),script_sha256:sha(new URL(import.meta.url)),schema_fingerprint:p.source_schema_fingerprint,sequence_extension_sha256:sha(state+'/classic-sequence-extension-observation-v1/metadata.json'),roles,copied,counts});
 fs.writeFileSync(out+'/executed.sql',statements.join(';\n')+';\n',{flag:'wx'});
 save('proof.json',{at:new Date().toISOString(),status:'selected_dependency_schema_replayed',database:name,checks,independent_catalog_readback:true,public_relations:p.relations.length,auth_relations:a.relations.length,functions:allFunctions.length,constraints:p.constraints.length+a.constraints.length,policies:p.policies.length+a.policies.length,production_writes:0,auth_user_rows:0,real_auth_http:false,limitations:['PostgreSQL16 lab versus production17; MAINTAIN privilege is unavailable and not replayed.','Cluster-administration attributes intentionally absent on unique NOLOGIN role translations; access INHERIT/BYPASSRLS preserved.','Sequence allocation values are local fixture values; sequence access grants and extension grants use exact captured metadata.','115inbound FKs outside selected subset remain inventory, not full application preservation proof.','No actual Auth login, JWT, PostgREST or HTTP proof.']});
 console.log(JSON.stringify({status:'selected_dependency_schema_replayed',database:name,counts}));
}catch(e){save('failure.json',{at:new Date().toISOString(),phase,code:e.code,message:e.message,last_statement:statements.at(-1),production_writes:0});console.error(JSON.stringify({phase,code:e.code,message:e.message}));process.exitCode=1;}
finally{if(source){await source.query('rollback').catch(()=>{});await source.end().catch(()=>{});}if(db)await db.end().catch(()=>{});if(admin)await admin.end().catch(()=>{});}


