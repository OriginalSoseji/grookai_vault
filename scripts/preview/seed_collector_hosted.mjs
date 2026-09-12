import {api,exec,out,verifyTarget} from './collector_hosted_ops.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const p=await verifyTarget();const url=`https://${p.id}.supabase.co`;
const keys=JSON.parse(readFileSync(`${out}/private/keys.json`));
const db=createClient(url,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false}});
const local=sql=>JSON.parse(exec('docker',['exec','-i','supabase_db_ycdxbpibncqcchqiihfz','psql','-X','-qAt','-U','postgres','-d','postgres'],{input:sql}).trim());
const rows=(table,where='true')=>local(`select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.${table} t where ${where};`);
const query=sql=>api(`/v1/projects/${p.id}/database/query`,{method:'POST',body:{query:sql}});
const hash=b=>createHash('sha256').update(b).digest('hex');
const q=v=>`'${String(v).replaceAll("'","''")}'`;
const mode=process.argv[2];
if(mode==='plan'){
 const snapshot={games:rows('games'),finish_keys:rows('finish_keys'),sets:rows('sets','id in (select set_id from public.card_prints)'),card_prints:rows('card_prints'),card_printings:rows('card_printings'),binder_feature_flags:rows('binder_feature_flags').map(r=>({...r,enabled:['schema_internal','personal','custom'].includes(r.flag_key)}))};
 assert.equal(snapshot.card_prints.length,326);assert.equal(snapshot.card_printings.length,491);
 const publicKey=process.env.SUPABASE_PUBLISHABLE_KEY;assert.ok(publicKey);
 if(!publicKey.startsWith('sb_publishable_'))assert.equal(JSON.parse(Buffer.from(publicKey.split('.')[1],'base64url')).role,'anon');
 const columns={sets:'id,game,code,name,release_date,source,logo_url,symbol_url,identity_domain_default,hero_image_url,hero_image_source,identity_model,printed_set_abbrev,printed_total,set_role',card_prints:'id,game_id,set_id,name,number,variant_key,rarity,image_url,set_code,artist,regulation_mark,image_alt_url,image_source,print_identity_key,image_status,printed_set_abbrev,printed_total,gv_id,image_path,identity_domain,printed_identity_modifier,set_identity_model,representative_image_url,image_note',card_printings:'id,card_print_id,finish_key,printing_gv_id,image_source,image_path,image_url,image_alt_url,image_status,image_note'};
 const sourceRequests=[];
 const read=async(table,filters)=>{
  assert.ok(columns[table]);const endpoint=new URL(`https://ycdxbpibncqcchqiihfz.supabase.co/rest/v1/${table}`);endpoint.search=new URLSearchParams({select:columns[table],...filters});sourceRequests.push(String(endpoint));
  const r=await fetch(endpoint,{headers:{apikey:publicKey,Authorization:`Bearer ${publicKey}`},redirect:'error',signal:AbortSignal.timeout(30000)});assert.ok(r.ok,`Public source ${r.status}`);return r.json();
 };
 const enrichment=[];
 for(const game of ['one_piece','mtg']){
  const sets=await read('sets',{game:`eq.${game}`,order:'release_date.desc.nullslast',limit:'5'});let selected;
  for(const set of sets){const cards=await read('card_prints',{set_id:`eq.${set.id}`,gv_id:'not.is.null',order:'gv_id',limit:'24'});if(cards.length){selected={set,cards};break;}}
  if(!selected){enrichment.push({game,gap:'No public cards in five newest sets'});continue;}
  const printings=await read('card_printings',{card_print_id:`in.(${selected.cards.map(c=>c.id).join(',')})`,limit:'240',order:'id'});
  snapshot.sets.push(selected.set);snapshot.card_prints.push(...selected.cards.map(c=>({...c,game_id:snapshot.games.find(g=>g.code===game).id})));snapshot.card_printings.push(...printings);
  enrichment.push({game,set:selected.set.code,cards:selected.cards.length,printings:printings.length});
 }
 for(const table of Object.keys(snapshot)){assert.equal(new Set(snapshot[table].map(r=>r.id??r.flag_key??r.key)).size,snapshot[table].length,`Duplicate ${table}`);}
 const bytes=JSON.stringify(snapshot,null,2);writeFileSync(`${out}/catalog-snapshot.json`,bytes);
 const plan={target:p.id,sha256:hash(bytes),counts:Object.fromEntries(Object.entries(snapshot).map(([k,v])=>[k,v.length])),enrichment,sourceRequests,privateUserRows:0,pricingRows:0,productionWrites:0};writeFileSync(`${out}/catalog-plan.json`,JSON.stringify(plan,null,2));console.log(JSON.stringify(plan));
}else if(mode==='apply'){
 const plan=JSON.parse(readFileSync(`${out}/catalog-plan.json`));const bytes=readFileSync(`${out}/catalog-snapshot.json`);assert.equal(hash(bytes),plan.sha256);assert.equal(plan.target,p.id);const data=JSON.parse(bytes);
 const before=await query('select count(*)::int as cards from public.card_prints;');assert.equal(before[0].cards,0);
 const columnRows=await query("select table_name,column_name from information_schema.columns where table_schema='public' and is_generated='NEVER' and identity_generation is null;");
 const inserts=[];
 for(const [table,rows] of Object.entries(data)){
  assert.ok(['games','finish_keys','sets','card_prints','card_printings','binder_feature_flags'].includes(table));if(!rows.length)continue;
  const allowed=new Set(columnRows.filter(c=>c.table_name===table).map(c=>c.column_name));
  // Different source projections are inserted separately so omitted defaults remain defaults.
  const groups=new Map();for(const row of rows){const names=Object.keys(row).filter(c=>allowed.has(c)).sort();const key=names.join(',');if(!groups.has(key))groups.set(key,{names,rows:[]});groups.get(key).rows.push(row);}
  for(const {names,rows:group} of groups.values()){const cols=names.map(n=>`"${n}"`).join(',');inserts.push(`insert into public.${table} (${cols}) select ${cols} from jsonb_populate_recordset(null::public.${table},${q(JSON.stringify(group))}::jsonb);`);}
 }
 await query(`begin;set local statement_timeout='90s';${inserts.join('\n')}commit;`);
 const counts=await query("select (select count(*) from public.card_prints)::int as cards,(select count(*) from public.card_printings)::int as printings,(select count(*) from auth.users)::int as users;");
 assert.equal(counts[0].cards,plan.counts.card_prints);assert.equal(counts[0].printings,plan.counts.card_printings);assert.equal(counts[0].users,0);
 writeFileSync(`${out}/catalog-readback.json`,JSON.stringify({target:p.id,sha256:plan.sha256,counts},null,2));console.log(JSON.stringify({applied:true,counts}));
}else if(mode==='storage'){
 const buckets=local('select jsonb_agg(to_jsonb(b)) from storage.buckets b;');
 const existing=await db.storage.listBuckets();assert.equal(existing.error,null);
 for(const b of buckets){if(existing.data.some(x=>x.id===b.id))continue;const made=await db.storage.createBucket(b.id,{public:b.public,fileSizeLimit:b.file_size_limit,allowedMimeTypes:b.allowed_mime_types});assert.equal(made.error,null);}
 const policies=local("select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='storage';");
 const policySql=policies.map(pol=>`create policy "${pol.policyname.replaceAll('"','""')}" on storage."${pol.tablename}" as ${pol.permissive} for ${pol.cmd} to ${pol.roles.map(r=>`"${r}"`).join(',')} ${pol.qual?`using (${pol.qual})`:''} ${pol.with_check?`with check (${pol.with_check})`:''};`).join('\n');
 const existingPolicies=await query("select count(*)::int as n from pg_policies where schemaname='storage';");if(existingPolicies[0].n===0)await query(`begin;${policySql}commit;`);else assert.equal(existingPolicies[0].n,policies.length);
 writeFileSync(`${out}/storage-policy.sql`,policySql);console.log(JSON.stringify({buckets:buckets.map(b=>({id:b.id,public:b.public})),policies:policies.length}));
}else throw Error('Explicit plan/apply/storage required');
