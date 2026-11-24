// Four exact retail-stamped Cosmos finishes only. Retained Reverse children remain unadjudicated.
import assert from 'node:assert/strict';
import {printingManifestHash as hash,printingCandidateId} from './printing_completeness_gate_v1.mjs';
import {assertRetailCosmosSourceAuthority,assertRetailCosmosSubsetManifest,assertRetailCosmosRetainedChildren} from './retail_stamp_cosmos_four_source_authority_v1.mjs';
import {readExecutionSchema} from './master_index_printing_execution_v1.mjs';
import {assertPrintingDatabaseTarget} from './master_index_printing_execution_guard_v1.mjs';

export const VERSION='RETAIL_STAMP_COSMOS_FOUR_EXECUTION_V1';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const QUALIFICATION_DATABASE='retail_stamp_cosmos_four_qualification_v1';
export const SCOPE=Object.freeze([
  {
    "code": "sm5",
    "parent": "c254ec21-1cab-47a7-94f4-b29b6fe97b3b",
    "set": "0ccab8fe-5cb3-4535-860b-c051d1f0cf73",
    "manifest": "aa72b61993fc337ea4f4c372036ef23298e4165b75a586de460183470345b7ad",
    "retainedReverseId": "ce746f69-793c-4819-aef3-7ee5e77a0a53",
    "retainedReverseGvId": "GV-PK-SM5-88-ULTRA-PRISM-STAMP-RH"
  },
  {
    "code": "sm6",
    "parent": "a1c485cc-8509-4b38-9ce5-91756f7ee335",
    "set": "2ac96af4-a5e2-479f-916c-7b52e13a8f3a",
    "manifest": "5e6bc5270a8f08444ffa8c5fcd3c6f00f24620035cf1b86d4e7eff46098461bb",
    "retainedReverseId": "be9b29c3-236d-44c7-a029-7ec4720f135e",
    "retainedReverseGvId": "GV-PK-SM6-15-FORBIDDEN-LIGHT-STAMP-RH"
  },
  {
    "code": "swsh2",
    "parent": "e01b2c3d-13a7-4539-9ac9-38c350b012d5",
    "set": "71ebdec9-9eeb-4adc-b8ef-1e6e23e6c5ec",
    "manifest": "e553351d6130f5cb537b49910f1ef7b522807f5f6b92ecd344f7bf83d72ea465",
    "retainedReverseId": "ce6f663f-771d-41a3-9503-a76f86b48019",
    "retainedReverseGvId": "GV-PK-SWSH2-91-REBEL-CLASH-STAMP-RH"
  },
  {
    "code": "swsh3",
    "parent": "c94ae9cd-dcf9-4258-b701-dc8882cdd39a",
    "set": "b9aebbf0-31c9-40d3-a878-f1d8a1c44f14",
    "manifest": "34bc0dcb83970f0f661846706f81197464018347cf97073a60e3ab3bc542eeb0",
    "retainedReverseId": "57554bc8-61ab-49a2-ba4b-189abb8ecd6f",
    "retainedReverseGvId": "GV-PK-SWSH3-156-DARKNESS-ABLAZE-STAMP-RH"
  }
]);
export const SET_PROFILES=Object.freeze([
  {
    "setCode": "sm5",
    "setId": "0ccab8fe-5cb3-4535-860b-c051d1f0cf73",
    "parents": 181,
    "childrenBefore": 350,
    "childrenAfter": 351,
    "finishesBefore": {
      "holo": 61,
      "normal": 156,
      "reverse": 130,
      "cracked_ice": 2,
      "cosmos": 1
    },
    "finishesAfter": {
      "holo": 61,
      "normal": 156,
      "reverse": 130,
      "cracked_ice": 2,
      "cosmos": 2
    }
  },
  {
    "setCode": "sm6",
    "setId": "2ac96af4-a5e2-479f-916c-7b52e13a8f3a",
    "parents": 155,
    "childrenBefore": 296,
    "childrenAfter": 297,
    "finishesBefore": {
      "reverse": 110,
      "normal": 129,
      "holo": 54,
      "cracked_ice": 2,
      "cosmos": 1
    },
    "finishesAfter": {
      "reverse": 110,
      "normal": 129,
      "holo": 54,
      "cracked_ice": 2,
      "cosmos": 2
    }
  },
  {
    "setCode": "swsh2",
    "setId": "71ebdec9-9eeb-4adc-b8ef-1e6e23e6c5ec",
    "parents": 224,
    "childrenBefore": 388,
    "childrenAfter": 389,
    "finishesBefore": {
      "normal": 145,
      "reverse": 154,
      "holo": 82,
      "cosmos": 6,
      "cracked_ice": 1
    },
    "finishesAfter": {
      "normal": 145,
      "reverse": 154,
      "holo": 82,
      "cosmos": 7,
      "cracked_ice": 1
    }
  },
  {
    "setCode": "swsh3",
    "setId": "b9aebbf0-31c9-40d3-a878-f1d8a1c44f14",
    "parents": 216,
    "childrenBefore": 375,
    "childrenAfter": 376,
    "finishesBefore": {
      "reverse": 157,
      "holo": 68,
      "normal": 145,
      "cosmos": 3,
      "cracked_ice": 2
    },
    "finishesAfter": {
      "reverse": 157,
      "holo": 68,
      "normal": 145,
      "cosmos": 4,
      "cracked_ice": 2
    }
  }
]);
export const BOUNDARIES=Object.freeze({parent_writes:0,existing_row_updates:0,ownership_writes:0,mapping_writes:0,pricing_writes:0,image_writes:0,identity_writes:0,deletes:0,other_set_writes:0});
export const EXPECTED=Object.freeze({retained_sets:4,retained_parents:776,retained_children:1409,children_after:1413,raw:1,printing_inserts:4,reviews:4,updates:0});
const childFields=['id','card_print_id','finish_key','printing_gv_id','is_provisional','provenance_source','provenance_ref','created_by'];
const reviewFields=['id','card_printing_id','review_status','public_visibility','active','confidence','reason','evidence_sources_checked','evidence_sources_for_finish','expected_finish_keys','evidence','source_report_path','reviewed_by','reviewed_at'];
const rawFields=['id','source','status','notes','payload'];
const sort=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const project=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
const seal=body=>({...body,fingerprint:hash(body)});
const identifier=s=>'"'+String(s).replaceAll('"','""')+'"';
const uuid=value=>{const h=hash({version:VERSION,value});return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const same=(a,b,message)=>assert.equal(hash({value:a}),hash({value:b}),message);
export {assertPrintingDatabaseTarget as assertRetailCosmosDatabaseTarget};

export function retailCosmosInsertEffectProofV1(schema){
 // Independently reviewed production517 write-table definitions: no INSERT
 // trigger, no rewrite rule, no generated expression, only scalar timestamp/
 // constant defaults. Every UUID and the raw bigint are supplied explicitly.
 // All ten constraints are scalar checks, uniqueness, PKs or restrictive FKs.
 const fingerprint=hash(Object.fromEntries(['columns','constraints','indexes','triggers','rules'].map(k=>[k,schema[k]])));
 assert.equal(fingerprint,'6e09d4294a08b60725c1e669a4221389120a957ed14754fb5f44bfdc3aed8b77','Reviewed insert effects changed');
 return {version:'RETAIL_COSMOS_INSERT_EFFECT_PROOF_V1',fingerprint,allowed_insert_tables:['raw_imports','card_printings','card_printing_truth_reviews'],existing_row_writes:0,insert_triggers:0,rewrite_rules:0,unprovided_sequence_defaults:0,indirect_owner_or_json_writes:0};
}

export function reviewedRetailCosmosRows(scopes){
 assert.equal(scopes.length,4);
 return SCOPE.flatMap(w=>{
  const s=scopes.find(s=>s.manifest.set_code===w.code);assert.ok(s,'Missing exact source scope');
  const m=assertRetailCosmosSourceAuthority(s.manifest,s.artifacts);assert.equal(m.fingerprint,w.manifest);
  assert.equal(m.parents.length,1);assert.equal(m.parents[0].id,w.parent);assert.equal(m.authority.set_id,w.set);
  assert.deepEqual(m.printings.map(p=>p.finish_key).sort(),['cosmos']);
  return m.printings.map(p=>({...p,id:printingCandidateId(p),manifest_fingerprint:m.fingerprint}));
 });
}

export async function readRetailCosmosSchema(client){
 const schema=await readExecutionSchema(client);
 schema.foreign_keys=(await client.query(`select n.nspname schema,c.relname relation,k.conname name,a.attname column_name,t.relname target,cardinality(k.conkey)::int keys,ta.attname target_column,pg_get_constraintdef(k.oid) definition
 from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace join pg_class t on t.oid=k.confrelid
 join pg_attribute a on a.attrelid=c.oid and a.attnum=k.conkey[1] join pg_attribute ta on ta.attrelid=t.oid and ta.attnum=k.confkey[1]
 where k.contype='f' and k.confrelid in('public.card_prints'::regclass,'public.card_printings'::regclass) order by n.nspname,c.relname,k.conname`)).rows;
 assert.ok(schema.foreign_keys.every(k=>k.keys===1&&k.target_column==='id'),'Composite dependency requires review');
 schema.json_columns=(await client.query(`select n.nspname schema,c.relname relation,a.attname column_name,c.relkind
 from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in('public','grookai_square','grookai_inventory','grookai_vendor_pricing') and c.relkind in('r','p','m')
 and a.attnum>0 and not a.attisdropped and a.atttypid in('json'::regtype,'jsonb'::regtype)
 order by n.nspname,c.relname,a.attname`)).rows;
 schema.ledger=(await client.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version);
 return schema;
}

export function retailCosmosDescriptor(scopes){
 const facts=reviewedRetailCosmosRows(scopes),manifests=scopes.map(s=>s.manifest).sort((a,b)=>a.set_code.localeCompare(b.set_code));
 const rawId='-'+BigInt('0x'+hash({version:VERSION,manifests:manifests.map(m=>m.fingerprint)}).slice(0,15));
 const ref=`raw_imports:${rawId}|${VERSION}`;
 const children=sort(facts.map(p=>({id:p.id,card_print_id:p.card_print_id,finish_key:p.finish_key,printing_gv_id:p.printing_gv_id,is_provisional:false,provenance_source:VERSION,provenance_ref:ref,created_by:VERSION})));
 const reviews=sort(facts.map(p=>{
  const s=scopes.find(s=>s.manifest.fingerprint===p.manifest_fingerprint),m=s.manifest,review=JSON.parse(s.artifacts.get(m.authority.review.ref).toString());
  return {id:uuid('review:'+p.id),card_printing_id:p.id,review_status:'verified',public_visibility:'visible',active:true,confidence:'high',
   reason:'Exact reviewed retail expansion-stamped parent and documented Cosmos finish. Existing Reverse children remain unchanged and unadjudicated.',
   evidence_sources_checked:m.authority.source_artifacts.map(s=>s.url_or_identifier),evidence_sources_for_finish:p.evidence.map(e=>e.source_ref),expected_finish_keys:['cosmos'],
   evidence:{manifest_fingerprint:m.fingerprint,master_index_sha256:m.master_index_sha256,review_sha256:m.authority.review.sha256,card_print_id:p.card_print_id,finish_key:p.finish_key,raw_import_id:rawId},
   source_report_path:ref,reviewed_by:VERSION,reviewed_at:new Date(review.reviewed_at).toISOString()};
 }));
 return {children,reviews,raw:{id:rawId,source:VERSION,status:'processed',notes:'Four exact Cosmos finishes for four reviewed retail expansion-stamped parents. No other stamp or finish inference.',payload:{version:VERSION,manifests,reviews:scopes.map(s=>JSON.parse(s.artifacts.get(s.manifest.authority.review.ref).toString()))}}};
}

// Reads all retained rows in the three sets, every incoming FK relation and all
// stored JSON columns in the four application schemas. Virtual views derive
// their data from those stored relations and are captured by schema/RPC proof.
export async function readRetailCosmosState(client,descriptor,schema,{onProgress=()=>{}}={}){
 const sets=SCOPE.map(s=>s.set),parentTargets=SCOPE.map(s=>s.parent),childIds=descriptor.children.map(c=>c.id),reviewIds=descriptor.reviews.map(r=>r.id);
 const dependencyChildIds=[...new Set([...childIds,...SCOPE.map(s=>s.retainedReverseId)])];
 const rows=async(sql,args)=>(await client.query(sql,args)).rows.map(r=>r.row),state={insert_effect_proof:retailCosmosInsertEffectProofV1(schema)};
 state.parent_gvid_collisions=await rows('select to_jsonb(t) row from public.card_prints t where gv_id=any($1::text[]) order by id',[descriptor.children.map(c=>c.printing_gv_id)]);
 state.sets=await rows('select to_jsonb(t) row from public.sets t where id=any($1::uuid[]) order by id',[sets]);
 state.parents=await rows('select to_jsonb(t) row from public.card_prints t where set_id=any($1::uuid[]) order by id',[sets]);
 const parentIds=state.parents.map(p=>p.id);
 state.children=await rows('select to_jsonb(t) row from public.card_printings t where card_print_id=any($1::uuid[]) or id=any($2::uuid[]) or printing_gv_id=any($3::text[]) order by id',[parentIds,childIds,descriptor.children.map(c=>c.printing_gv_id)]);
 const allChildren=state.children.map(c=>c.id);
 state.reviews=await rows('select to_jsonb(t) row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[]) or id=any($2::uuid[]) order by id',[allChildren.concat(childIds),reviewIds]);
 state.mappings=await rows('select to_jsonb(t) row from public.external_mappings t where card_print_id=any($1::uuid[]) order by id',[parentIds]);
 state.identities=await rows('select to_jsonb(t) row from public.card_print_identity t where card_print_id=any($1::uuid[]) order by id',[parentIds]);
 state.raw=await rows("select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text) row from public.raw_imports t where id=$1::bigint",[descriptor.raw.id]);
 state.options=[];for(let i=0;i<parentIds.length;i+=200)for(let offset=0;;offset+=200){const page=(await client.query('select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],200,$2) order by id',[parentIds.slice(i,i+200),offset])).rows;state.options.push(...page);if(page.length<200)break;}state.options=sort(state.options);assert.equal(new Set(state.options.map(c=>c.id)).size,state.options.length,'Duplicate paginated public option');
 const digestSQL="count(*)::int rows,encode(sha256(convert_to(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),''),'UTF8')),'hex') digest";
 const groups=new Map();for(const k of schema.foreign_keys){const key=k.schema+'.'+k.relation;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(k);}
 state.foreign_footprints=[];await client.query("set local statement_timeout='10s'");
 for(const keys of groups.values()){
  const{schema,relation}=keys[0],args=keys.map(k=>k.target==='card_prints'?parentTargets:dependencyChildIds);
  let where='('+keys.map((k,i)=>`t.${identifier(k.column_name)}=any($${i+1}::uuid[])`).join(' or ')+')';
  if(schema==='public'&&relation==='card_printings'){args.push(childIds);where+=` and t.id<>all($${args.length}::uuid[])`;}
  if(schema==='public'&&relation==='card_printing_truth_reviews'){args.push(reviewIds);where+=` and t.id<>all($${args.length}::uuid[])`;}
  onProgress({phase:'foreign_key',schema,relation,completed:state.foreign_footprints.length});
  state.foreign_footprints.push({schema,relation,...(await client.query(`select ${digestSQL} from ${identifier(schema)}.${identifier(relation)} t where ${where}`,args)).rows[0]});
 }
 const jsonGroups=new Map();for(const k of schema.json_columns){const key=k.schema+'.'+k.relation;if(!jsonGroups.has(key))jsonGroups.set(key,[]);jsonGroups.get(key).push(k);}
 state.json_footprints=[];
 // Matching a UUID already stored in a JSON string is deliberately separate
 // from relational FK checks. Exclusions are only our nine proposed rows.
 const pattern=[...parentTargets,...dependencyChildIds].join('|');await client.query("set local statement_timeout='20s'");
 for(const cols of jsonGroups.values()){
  const{schema,relation}=cols[0],args=[pattern];let where='('+cols.map(c=>`t.${identifier(c.column_name)}::text~*$1`).join(' or ')+')';
  const ownerJson=schema!=='public'||/^(?:vault_|binder|collection_|inventory_|user_|saved_|trade_|wishlist_|seller_|ebay_seller_|ebay_listing_|orders?$|order_|allocat|reserv)/.test(relation);
  if(!ownerJson){state.json_footprints.push({schema,relation,columns:cols.map(c=>c.column_name),mode:'preserved_by_reviewed_insert_effects',effect_fingerprint:state.insert_effect_proof.fingerprint,existing_row_writes:0,global_data_scan_performed:false});continue;}
  if(schema==='public'&&relation==='raw_imports'){args.push(descriptor.raw.id);where+=' and t.id<>$2::bigint';}
  if(schema==='public'&&relation==='card_printing_truth_reviews'){args.push(reviewIds);where+=' and t.id<>all($2::uuid[])';}
  if(schema==='public'&&relation==='card_printings'){args.push(childIds);where+=' and t.id<>all($2::uuid[])';}
  onProgress({phase:'stored_json',schema,relation,completed:state.json_footprints.length});
  const keys=(await client.query(`select a.attname name from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,n) join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where i.indisprimary and i.indrelid=$1::regclass order by k.n`,[identifier(schema)+'.'+identifier(relation)])).rows.map(r=>r.name);
  let footprint;
  if(!keys.length)footprint=(await client.query(`select ${digestSQL} from ${identifier(schema)}.${identifier(relation)} t where ${where}`,args)).rows[0];
  else{
   // Disjoint primary-key keyset batches bound each scan. The final digest
   // sorts all matched full-row hashes globally, so pagination and new excluded
   // rows cannot move boundaries and create a false preservation result.
   const matches=[];let last=null,scanned=0;
   for(;;){const batchArgs=[...args];let cursor='';if(last){cursor='where ('+keys.map(k=>'t.'+identifier(k)).join(',')+')>('+keys.map((_,i)=>'$'+(args.length+i+1)).join(',')+')';batchArgs.push(...last);}
    const order=keys.map(k=>'t.'+identifier(k)).join(','),q=`with batch as materialized(select t.* from ${identifier(schema)}.${identifier(relation)} t ${cursor} order by ${order} limit 5000) select jsonb_build_array(${keys.map(k=>'t.'+identifier(k)+'::text').join(',')}) cursor,case when ${where} then md5(to_jsonb(t)::text) end digest from batch t order by ${order}`;
    const batch=(await client.query(q,batchArgs)).rows;scanned+=batch.length;for(const r of batch)if(r.digest)matches.push(r.digest);onProgress({phase:'stored_json_batch',schema,relation,scanned,matched:matches.length});if(batch.length<5000)break;last=batch.at(-1).cursor;
   }
   const {createHash}=await import('node:crypto');footprint={rows:matches.length,digest:createHash('sha256').update(matches.sort().join('')).digest('hex')};
  }
  state.json_footprints.push({schema,relation,columns:cols.map(c=>c.column_name),mode:'owner_reference_digest',...footprint});
 }
 await client.query("set local statement_timeout='45s'");return state;
}

export function freezeRetailCosmosPlan({scopes,schema,state,observedAt}){
 const descriptor=retailCosmosDescriptor(scopes);assert.ok(Number.isFinite(Date.parse(observedAt)));
 assert.equal(state.sets.length,4);assert.equal(state.parents.length,776);assert.equal(state.children.length,1409);assert.equal(state.reviews.length,536);assertRetailCosmosProfiles(state,false);
 assert.deepEqual(state.sets.map(s=>s.id).sort(),SCOPE.map(s=>s.set).sort());
 assert.equal(state.raw.length,0,'Raw evidence collision');assert.equal(state.parent_gvid_collisions.length,0,'Global parent GV-ID collision');
 for(const {manifest:m}of scopes){const p=state.parents.find(p=>p.id===m.parents[0].id);assert.ok(p);for(const k of['id','set_id','gv_id','name','identity_domain','variant_key','printed_identity_modifier'])assert.equal(p[k],m.parents[0][k],'Exact reviewed parent drift: '+k);assert.equal(String(p.number),m.parents[0].printed_coordinate);const w=SCOPE.find(w=>w.parent===p.id),old=state.children.filter(c=>c.card_print_id===p.id);assert.equal(old.length,1,'Retained target finish drift');assert.equal(old[0].id,w.retainedReverseId);assert.equal(old[0].printing_gv_id,w.retainedReverseGvId);assert.equal(old[0].finish_key,'reverse');assert.equal(state.reviews.filter(r=>r.card_printing_id===old[0].id&&r.active).length,0,'Retained Reverse review needs separate adjudication');assert.equal(state.identities.filter(i=>i.card_print_id===p.id&&i.is_active).length,1,'Exact active identity required');}
 assert.equal(state.children.filter(c=>descriptor.children.some(n=>n.id===c.id||n.printing_gv_id===c.printing_gv_id)).length,0,'Global printing collision');
 assert.equal(state.reviews.filter(r=>descriptor.reviews.some(n=>n.id===r.id)).length,0,'Review UUID collision');
 assert.deepEqual(state.options.filter(c=>SCOPE.some(s=>s.parent===c.card_print_id)).map(c=>c.id).sort(),SCOPE.map(s=>s.retainedReverseId).sort());
 assert.equal(schema.foreign_keys.length,95,'Incoming schema changed');
 assert.equal(state.foreign_footprints.length,new Set(schema.foreign_keys.map(k=>k.schema+'.'+k.relation)).size);
 assert.equal(state.json_footprints.length,new Set(schema.json_columns.map(k=>k.schema+'.'+k.relation)).size,'Stored JSON inventory incomplete');
 const plan=seal({version:VERSION,project_ref:PROJECT,observed_at:observedAt,manifest_fingerprints:SCOPE.map(s=>s.manifest),schema,state_before:state,...descriptor,expected:EXPECTED,boundaries:BOUNDARIES});
 assertRetailCosmosPlan(plan,plan.fingerprint);return plan;
}

export function assertRetailCosmosPlan(plan,fingerprint){
 const{fingerprint:actual,...body}=plan;assert.equal(actual,fingerprint);assert.equal(hash(body),actual,'Plan fingerprint mismatch');
 assert.equal(plan.version,VERSION);assert.equal(plan.project_ref,PROJECT);assert.deepEqual(plan.manifest_fingerprints,SCOPE.map(s=>s.manifest));
 assert.deepEqual(plan.expected,EXPECTED);assert.deepEqual(plan.boundaries,BOUNDARIES);
 assert.equal(plan.state_before.parents.length,776);assert.equal(plan.state_before.children.length,1409);assert.equal(plan.state_before.reviews.length,536);assert.equal(plan.children.length,4);assert.equal(plan.reviews.length,4);assertRetailCosmosProfiles(plan.state_before,false);
 const facts=plan.raw.payload.manifests.flatMap(m=>m.printings.map(p=>({...p,id:printingCandidateId(p)})));
 for(const w of SCOPE){const m=plan.raw.payload.manifests.find(m=>m.set_code===w.code);assertRetailCosmosSubsetManifest(m);assert.equal(m?.fingerprint,w.manifest);assert.equal(m.parents[0].id,w.parent);}
 for(const child of plan.children){assert.deepEqual(Object.keys(child).sort(),[...childFields].sort());const p=facts.find(p=>p.id===child.id);assert.ok(p);for(const k of['id','card_print_id','finish_key','printing_gv_id'])assert.equal(child[k],p[k]);assert.equal(child.is_provisional,false);assert.equal(child.provenance_source,VERSION);assert.equal(child.created_by,VERSION);assert.equal(child.provenance_ref,`raw_imports:${plan.raw.id}|${VERSION}`);}
 assert.equal(new Set(plan.children.map(c=>c.id)).size,4);assert.equal(new Set(plan.children.map(c=>c.printing_gv_id)).size,4);
 assert.match(plan.raw.id,/^-\d+$/);assert.equal(plan.raw.id,'-'+BigInt('0x'+hash({version:VERSION,manifests:[...plan.raw.payload.manifests].sort((a,b)=>a.set_code.localeCompare(b.set_code)).map(m=>m.fingerprint)}).slice(0,15)));assert.equal(plan.raw.source,VERSION);assert.equal(plan.raw.status,'processed');assert.equal(plan.raw.payload.version,VERSION);
 for(const child of plan.children){const r=plan.reviews.find(r=>r.card_printing_id===child.id);assert.ok(r);assert.equal(r.id,uuid('review:'+child.id));assert.deepEqual(Object.keys(r).sort(),[...reviewFields].sort());assert.equal(r.active,true);assert.equal(r.review_status,'verified');assert.equal(r.public_visibility,'visible');assert.deepEqual(r.expected_finish_keys,['cosmos']);assert.equal(r.evidence.card_print_id,child.card_print_id);assert.equal(r.evidence.finish_key,child.finish_key);assert.equal(r.evidence.raw_import_id,plan.raw.id);}
}

export function classifyRetailCosmosState(plan,state){
 for(const k of['sets','parents','mappings','identities','foreign_footprints','json_footprints','insert_effect_proof','parent_gvid_collisions'])same(state[k],plan.state_before[k],'Protected drift: '+k);
 const oldChildren=new Set(plan.state_before.children.map(c=>c.id)),oldReviews=new Set(plan.state_before.reviews.map(c=>c.id));
 same(state.children.filter(c=>oldChildren.has(c.id)),plan.state_before.children,'Retained child drift');
 same(state.reviews.filter(c=>oldReviews.has(c.id)),plan.state_before.reviews,'Retained review drift');
 const children=state.children.filter(c=>!oldChildren.has(c.id)),reviews=state.reviews.filter(c=>!oldReviews.has(c.id));
 if(!children.length&&!reviews.length&&!state.raw.length){same(state.options,plan.state_before.options,'Before public-option drift');return 'before';}
 same(children.map(c=>project(c,childFields)),plan.children,'Partial/colliding child state');
 for(const c of children)for(const k of['image_source','image_path','image_url','image_alt_url','image_status','image_note'])assert.equal(c[k],null,'New image changed');
 same(reviews.map(r=>({...project(r,reviewFields),reviewed_at:new Date(r.reviewed_at).toISOString()})),plan.reviews,'Partial review state');
 same(state.raw.map(r=>project(r,rawFields)),[plan.raw],'Partial raw state');
 const added=plan.children.map(c=>({id:c.id,card_print_id:c.card_print_id,finish_key:c.finish_key,printing_gv_id:c.printing_gv_id,finish_is_active:true}));
 same(state.options,sort([...plan.state_before.options,...added]),'Only four exact Cosmos public options may be added');assertRetailCosmosProfiles(state,true);return 'exact';
}

export function assertRetailCosmosAuthority(authority,{plan,codeFingerprint,mode,now=Date.now()}){
 assertRetailCosmosPlan(plan,plan.fingerprint);assert.ok(['rollback','apply'].includes(mode));
 assert.ok(authority,'Exact bounded founder approval required');const{fingerprint,...body}=authority;assert.equal(hash(body),fingerprint);
 assert.equal(authority.version,'RETAIL_STAMP_COSMOS_FOUR_AUTHORITY_V1');assert.equal(authority.status,'explicit_founder_approval');
 assert.equal(authority.project_ref,PROJECT);assert.equal(authority.execution_version,VERSION);assert.equal(authority.plan_fingerprint,plan.fingerprint);assert.match(codeFingerprint??'',/^[a-f0-9]{64}$/);assert.equal(authority.code_fingerprint,codeFingerprint);
 assert.deepEqual(authority.expected,EXPECTED);assert.deepEqual(authority.boundaries,BOUNDARIES);assert.ok(authority.modes?.includes(mode)&&authority.modes.every(m=>['rollback','apply'].includes(m)));
 assert.ok(authority.approval_record_ref?.trim());assert.ok(authority.approval_text?.includes(plan.fingerprint)&&authority.approval_text.includes(codeFingerprint),'Original approval must bind plan and producer');
 const approved=Date.parse(authority.approved_at),expires=Date.parse(authority.expires_at);assert.ok(approved<=now&&expires>now&&expires>approved&&expires-approved<=86400000,'Authority expired or invalid');
}

function assertProductionClient(client){
 const c=client.connectionParameters,valid=(c.host===`db.${PROJECT}.supabase.co`&&c.user==='postgres')||(c.host==='aws-1-us-east-2.pooler.supabase.com'&&c.user===`postgres.${PROJECT}`);
 assert.ok(valid);assert.equal(c.database,'postgres');assert.ok([5432,6543].includes(Number(c.port)));assert.equal(c.ssl?.rejectUnauthorized,true);assert.equal(client.connection?.stream?.authorized,true);
}
function assertRollback(receipt,{plan,codeFingerprint,now=Date.now()}){
 assert.ok(receipt);assert.equal(receipt.version,VERSION);assert.equal(receipt.environment,'production');assert.equal(receipt.project_ref,PROJECT);assert.equal(receipt.mode,'rollback');assert.equal(receipt.fingerprint,plan.fingerprint);assert.equal(receipt.code?.fingerprint,codeFingerprint);assert.equal(receipt.rollback_proven,true);assert.equal(receipt.exact_readback,true);assert.equal(receipt.committed,false);assert.equal(receipt.commit_uncertain,false);
 const age=now-Date.parse(receipt.finished_at);assert.ok(age>=0&&age<3600000,'Fresh actual production rollback required');
}
export async function executeRetailCosmosTransaction(options){
 assertProductionClient(options.client);const{mode,plan,codeFingerprint,authority,rollbackReceipt}=options;
 if(['rollback','apply'].includes(mode))assertRetailCosmosAuthority(authority,{plan,codeFingerprint,mode});
 if(mode==='apply')assertRollback(rollbackReceipt,{plan,codeFingerprint});
 return transaction({...options,production:true,beforeFinalCommit:async proof=>{assertProductionClient(options.client);assertRetailCosmosAuthority(authority,{plan,codeFingerprint,mode});assertRollback(rollbackReceipt,{plan,codeFingerprint});await (options.beforeFinalCommit??(async()=>{}))(proof);}});
}
export async function qualifyRetailCosmosTransaction(options){
 const c=options.client.connectionParameters;assert.equal(c.host,'127.0.0.1');assert.equal(Number(c.port),55240);assert.equal(c.user,'postgres');assert.equal(c.database,QUALIFICATION_DATABASE);
 assert.equal((await options.client.query('select current_database() name')).rows[0].name,QUALIFICATION_DATABASE);
 return transaction({...options,production:false});
}
async function transaction({client,plan,expectedFingerprint,mode,production,beforeCommit=async()=>{},beforeFinalCommit=async()=>{},onProgress=()=>{}}){
 assertRetailCosmosPlan(plan,expectedFingerprint);assert.ok(['preflight','rollback','apply','readback'].includes(mode));let attempted=false,committed=false;
 try{await client.query(`begin isolation level serializable${['preflight','readback'].includes(mode)?' read only':''}`);await client.query("set local statement_timeout='45s';set local lock_timeout='3s'");
  if(['rollback','apply'].includes(mode)){
   for(const s of [...SCOPE].sort((a,b)=>a.set.localeCompare(b.set)))await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`MASTER_INDEX_PRINTING_EXECUTION_V1:${s.set}`]);
   await client.query('select id from public.card_prints where set_id=any($1::uuid[]) order by id for update',[SCOPE.map(s=>s.set)]);
   await client.query('select id from public.card_printings where card_print_id=any($1::uuid[]) order by id for update',[plan.state_before.parents.map(p=>p.id)]);
  }
  same(await readRetailCosmosSchema(client),plan.schema,'Schema/RPC drift');assert.equal(plan.schema.rules.length,0,'Rewrite rules require review');
  assert.ok(plan.schema.triggers.every(t=>t.table==='card_printing_truth_reviews'&&t.name==='trg_card_printing_truth_reviews_updated_at_v1'&&t.enabled==='O'&&/BEFORE UPDATE/.test(t.definition)),'Unreviewed trigger');
  const before=await readRetailCosmosState(client,plan,plan.schema,{onProgress}),beforeClass=classifyRetailCosmosState(plan,before);if(mode==='readback')assert.equal(beforeClass,'exact');
  const writes={raw:0,printing_inserts:0,reviews:0,updates:0};
  if(beforeClass==='before'&&['rollback','apply'].includes(mode)){
   same((await client.query("select key from public.finish_keys where key=any($1::text[]) and is_active order by key",[['cosmos']])).rows,[{key:'cosmos'}],'Inactive finish key');
   const r=plan.raw;writes.raw=(await client.query('insert into public.raw_imports(id,source,status,notes,payload) values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
   for(const[table,fields,rows,key]of[['card_printings',childFields,plan.children,'printing_inserts'],['card_printing_truth_reviews',reviewFields,plan.reviews,'reviews']])writes[key]=(await client.query(`insert into public.${table}(${fields.join(',')}) select ${fields.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)])).rowCount;
   assert.deepEqual(writes,{raw:1,printing_inserts:4,reviews:4,updates:0});
  }
  const after=await readRetailCosmosState(client,plan,plan.schema,{onProgress}),afterClass=classifyRetailCosmosState(plan,after);
  if(mode!=='preflight'||beforeClass==='exact')assert.equal(afterClass,'exact');
  const result={version:VERSION,environment:production?'production':'local_qualification',project_ref:production?PROJECT:null,mode,fingerprint:plan.fingerprint,before:beforeClass,after:afterClass,writes,exact_readback:afterClass==='exact'};
  if(mode==='apply'){await beforeCommit(result);same(await readRetailCosmosSchema(client),plan.schema,'Precommit schema drift');assert.equal(classifyRetailCosmosState(plan,await readRetailCosmosState(client,plan,plan.schema,{onProgress})),'exact');await beforeFinalCommit(result);attempted=true;await client.query('commit');committed=true;}else await client.query('rollback');
  if(mode==='rollback'){await client.query('begin isolation level repeatable read read only');try{same(await readRetailCosmosState(client,plan,plan.schema,{onProgress}),before,'Rollback changed protected state');result.rollback_proven=true;}finally{await client.query('rollback');}}
  return {...result,committed,commit_uncertain:false};
 }catch(error){error.rollback_uncertain=false;await client.query('rollback').catch(()=>{error.rollback_uncertain=true;});error.commit_uncertain=attempted&&!committed;throw error;}
}

export function assertRetailCosmosProfiles(state,after){
 assertRetailCosmosRetainedChildren(state);
 for(const wanted of SET_PROFILES){const parents=state.parents.filter(p=>p.set_id===wanted.setId),ids=new Set(parents.map(p=>p.id)),children=state.children.filter(p=>ids.has(p.card_print_id)),finishes={};for(const c of children)finishes[c.finish_key]=(finishes[c.finish_key]??0)+1;assert.equal(parents.length,wanted.parents,'Exact set parent count drift');assert.equal(children.length,after?wanted.childrenAfter:wanted.childrenBefore,'Exact set child count drift');assert.deepEqual(finishes,after?wanted.finishesAfter:wanted.finishesBefore,'Exact set finish counts drift');assert.equal(new Set(children.map(c=>c.card_print_id+'|'+c.finish_key)).size,children.length,'Duplicate exact set printing identity');}
}
