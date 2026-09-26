// Dedicated offline database/container; never resets or writes existing projects.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {randomBytes,createHash} from 'node:crypto';
import {sourceState,container as sourceContainer,project as sourceProject,sql as sourceSql} from '../../schema/vendor_batch_cancellation_runtime_v1.mjs';
const dir=path.resolve('.local/integration/vendor-scan-release-20260924');
const target='grookai-scan-catalog-rehearsal-20260924',database='grookai_scan_catalog_rehearsal';
const image='public.ecr.aws/supabase/postgres:17.6.1.113',imageId='sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e';
const hash=b=>createHash('sha256').update(b).digest('hex');
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024,timeout:180000,stdio:['pipe','pipe','pipe']}).trim();
const sql=input=>docker(['exec','-i',target,'psql','-U','postgres','-d',fs.existsSync(dir+'/local-rehearsal-restored.json')?JSON.parse(fs.readFileSync(dir+'/local-rehearsal-restored.json')).database:database,'-X','-qAt','-v','ON_ERROR_STOP=1'],input);
const mode=process.argv[2];
if(mode==='prepare'){
 assert.ok(!fs.existsSync(dir+'/local-rehearsal-plan.json'));
 // The old network relay is deliberately stopped. This read-only dump uses
 // docker exec, verifies the frozen schema/empty state, and never restarts it.
 const hashes=sourceState(),source=JSON.parse(docker(['inspect',sourceContainer]))[0];
 assert.equal(source.State.Running,true);assert.equal(source.Image,imageId);
 assert.deepEqual(Object.keys(source.NetworkSettings.Networks),[sourceProject]);
 assert.equal(JSON.parse(docker(['network','inspect',sourceProject]))[0].Internal,true);
 assert.equal(sourceSql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from card_prints);"),'0|0|0');
 assert.deepEqual(sourceSql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/),Object.keys(hashes).sort().map(n=>n.split('_')[0]));
 const state={project:sourceProject,applied:Object.keys(hashes).length};assert.equal(state.applied,418);
 assert.equal(docker(['image','inspect',image,'--format','{{.Id}}']),imageId);
 assert.ok(!docker(['ps','-a','--format','{{.Names}}']).split('\n').includes(target));
 const roles=docker(['exec',sourceContainer,'pg_dumpall','-U','postgres','--roles-only','--no-role-passwords']);
 const schema=docker(['exec',sourceContainer,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-publications','--no-subscriptions']);
 fs.writeFileSync(dir+'/rehearsal-roles.sql',roles,{flag:'wx'});fs.writeFileSync(dir+'/rehearsal-schema.sql',schema,{flag:'wx'});
 fs.writeFileSync(dir+'/rehearsal.private.env','POSTGRES_PASSWORD='+randomBytes(36).toString('base64url')+'\n',{flag:'wx'});
 const plan={at:new Date().toISOString(),target,database,image,imageId,sourceProject:state.project,sourceMigrations:state.applied,schemaSha256:hash(schema),rolesSha256:hash(roles),catalogPlanSha256:hash(fs.readFileSync(dir+'/catalog-plan.private.json')),gameMappingSha256:hash(fs.readFileSync(dir+'/game-mapping.private.json')),network:'none',publishedPorts:[],workers:0};
 fs.writeFileSync(dir+'/local-rehearsal-plan.json',JSON.stringify(plan,null,2),{flag:'wx'});
 console.log(JSON.stringify({prepared:true,target,sourceMigrations:state.applied}));
}else if(mode==='start'){
 const plan=JSON.parse(fs.readFileSync(dir+'/local-rehearsal-plan.json'));assert.equal(plan.target,target);assert.equal(plan.imageId,imageId);
 assert.ok(!docker(['ps','-a','--format','{{.Names}}']).split('\n').includes(target));
 docker(['run','-d','--name',target,'--network','none','--env-file',dir+'/rehearsal.private.env','--shm-size','128m',image,'postgres','-c','max_worker_processes=0']);
 const actual=JSON.parse(docker(['inspect',target]))[0];assert.equal(actual.Image,imageId);assert.equal(actual.HostConfig.NetworkMode,'none');assert.equal(Object.keys(actual.HostConfig.PortBindings??{}).length,0);
 fs.writeFileSync(dir+'/local-rehearsal-start.json',JSON.stringify({at:new Date().toISOString(),id:actual.Id,target,imageId,network:'none',ports:[]},null,2),{flag:'wx'});
 console.log(JSON.stringify({started:true,target}));
}else if(mode==='restore'){
 assert.ok(!fs.existsSync(dir+'/local-rehearsal-restored.json'));
 const plan=JSON.parse(fs.readFileSync(dir+'/local-rehearsal-plan.json')),actual=JSON.parse(docker(['inspect',target]))[0];assert.equal(actual.Image,imageId);assert.equal(actual.HostConfig.NetworkMode,'none');
 const roles=fs.readFileSync(dir+'/rehearsal-roles.sql','utf8'),schema=fs.readFileSync(dir+'/rehearsal-schema.sql','utf8');assert.equal(hash(roles),plan.rolesSha256);assert.equal(hash(schema),plan.schemaSha256);
 const roleCreates=roles.split(/\r?\n/).filter(l=>l.startsWith('CREATE ROLE ')).map(l=>l.slice(12,-1).replaceAll('"',''));
 assert.ok(roleCreates.every(r=>/^[a-zA-Z0-9_]+$/.test(r)));
 const roleSql=roleCreates.map(r=>`do $$ begin if not exists(select 1 from pg_roles where rolname='${r}') then create role "${r}"; end if; end $$;`).join('\n');
 docker(['exec','-i',target,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],roleSql+`\ncreate database ${database} template template0;`);
 const normalized=schema.split('\n').filter(l=>!/^\\(?:un)?restrict \S+\r?$/.test(l)&&l.trim()!=='CREATE SCHEMA public;').join('\n');
 fs.writeFileSync(dir+'/rehearsal-restored-payload.sql',normalized,{flag:'wx'});
 try{sql(normalized);}catch(error){fs.writeFileSync(dir+'/rehearsal-restore-error.private.log',String(error.stderr),{flag:'wx'});throw new Error('Rehearsal schema restore failed; private log retained.');}
 fs.writeFileSync(dir+'/local-rehearsal-restored.json',JSON.stringify({at:new Date().toISOString(),target,database,sourceSchemaSha256:hash(schema),payloadSha256:hash(normalized)},null,2),{flag:'wx'});
 console.log(JSON.stringify({restored:true,target}));
}else if(mode==='exercise'){
 assert.ok(fs.existsSync(dir+'/local-rehearsal-restored.json'));assert.ok(!fs.existsSync(dir+'/local-rehearsal-proof.json'));
 const planBytes=fs.readFileSync(dir+'/catalog-plan.private.json'),plan=JSON.parse(planBytes),binding=JSON.parse(fs.readFileSync(dir+'/local-rehearsal-plan.json'));
 assert.equal(hash(planBytes),binding.catalogPlanSha256);assert.equal(hash(fs.readFileSync(dir+'/game-mapping.private.json')),binding.gameMappingSha256);
 assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from card_prints);"),'0|0|0');
 const existing=JSON.parse(fs.readFileSync(dir+'/catalog-existing.private.json'));assert.equal(hash(JSON.stringify(existing)),plan.existingSha256);
 const quote=x=>"'"+String(x).replaceAll("'","''")+"'",seed=[];
 for(const [table,key]of[['games','games'],['finish_keys','finishKeys'],['sets','sets'],['card_prints','cards'],['card_printings','printings']]){
  const allowed=JSON.parse(sql(`select json_agg(column_name) from information_schema.columns where table_schema='public' and table_name='${table}' and is_generated='NEVER' and identity_generation is null;`));
  const rows=existing[key].map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>allowed.includes(k))));if(!rows.length)continue;
  const cols=Object.keys(rows[0]).map(k=>'"'+k+'"').join(',');seed.push(`insert into public.${table} (${cols}) select ${cols} from jsonb_populate_recordset(null::public.${table},${quote(JSON.stringify(rows))}::jsonb);`);
 }
 for(const s of plan.statements)assert.equal(hash(s.sql),s.sha256);
 const payload='begin;\n'+seed.join('\n')+'\n'+plan.statements.map(s=>s.sql).join('\n')+'\ncommit;';
 try{sql(payload);}catch(error){fs.writeFileSync(dir+'/rehearsal-exercise-error.private.log',String(error.stderr),{flag:'wx'});throw new Error('Catalog rehearsal failed; transaction rolled back and private log retained.');}
 const counts=JSON.parse(sql("select json_build_object('sets',(select count(*) from sets),'cards',(select count(*) from card_prints),'printings',(select count(*) from card_printings),'finishes',(select count(*) from finish_keys),'users',(select count(*) from auth.users));"));
 assert.equal(counts.cards,20085);assert.equal(counts.printings,35142);assert.equal(counts.users,0);
 fs.writeFileSync(dir+'/local-rehearsal-proof.json',JSON.stringify({at:new Date().toISOString(),target,database:JSON.parse(fs.readFileSync(dir+'/local-rehearsal-restored.json')).database,planSha256:hash(planBytes),payloadSha256:hash(payload),counts,remoteWrites:0},null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,counts}));
}else throw Error('Explicit prepare/start/restore/exercise required');
