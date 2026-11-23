// Separate28-parent recovered Normal lane; Fighting Au Lait is explicitly excluded. Original43-parent V1 is unchanged.
import assert from 'node:assert/strict';
import {assertStampExecutionSchemaContextV1,assertStampSchema521QualificationV1} from './stamp_schema_521_continuity_v1.mjs';
import {createHash} from 'node:crypto';
import index from '../../docs/catalog/play_pokemon_stamp_normal_recovery_v3/index.json' with {type:'json'};
import {printingManifestHash as hash,printingCandidateId,assertPrintingManifest} from './printing_completeness_gate_v1.mjs';
import {assertMasterPrintingAuthority} from './master_index_printing_authority_v1.mjs';
import {readExPrintingSchema as readPlayStampSchema,exInsertEffectProofV1} from './ex_intrinsic_printing_execution_v1.mjs';
export {readPlayStampSchema};
export const VERSION='PLAY_POKEMON_STAMP_NORMAL_RECOVERY_EXECUTION_V3';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const QUALIFICATION_DATABASE='play_stamp_normal_recovery_qualification_519_v3';
export const PROGRAM='53e6b320860b991d3cfee13888b249c79713dfa58b29c2ab949fd1c2a8cf2cc2';
const{fingerprint:indexFingerprint,...indexBody}=index;assert.equal(indexFingerprint,PROGRAM);assert.equal(hash(indexBody),PROGRAM);
export const SCOPE=Object.freeze(index.scopes.flatMap(s=>s.parents.map(parent=>({parent,set:s.setId,code:s.setCode,manifest:s.manifestFingerprint}))));
assert.equal(SCOPE.length,28);assert.equal(new Set(SCOPE.map(s=>s.parent)).size,28);
assert.deepEqual(index.heldExecutionParents.map(p=>p.id),['94037abf-99a9-4f69-b4ed-7f39801dac95']);
assert.ok(!SCOPE.some(s=>s.parent===index.heldExecutionParents[0].id),'Fighting Au Lait requires a separate atomic correction');
export const EXPECTED=Object.freeze({retained_sets:4,retained_parents:1098,retained_children:1643,children_after:1671,raw:1,printing_inserts:28,reviews:28,updates:0});
export const BOUNDARIES=Object.freeze({parent_writes:0,existing_row_updates:0,ownership_writes:0,mapping_writes:0,pricing_writes:0,image_writes:0,identity_writes:0,deletes:0,other_set_writes:0});
const childFields=['id','card_print_id','finish_key','printing_gv_id','is_provisional','provenance_source','provenance_ref','created_by'];
const reviewFields=['id','card_printing_id','review_status','public_visibility','active','confidence','reason','evidence_sources_checked','evidence_sources_for_finish','expected_finish_keys','evidence','source_report_path','reviewed_by','reviewed_at'];
const rawFields=['id','source','status','notes','payload'];
const sort=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const project=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
const seal=body=>({...body,fingerprint:hash(body)});
const identifier=s=>'"'+String(s).replaceAll('"','""')+'"';
const same=(a,b,message)=>assert.equal(hash({value:a}),hash({value:b}),message);
const uuid=value=>{const h=hash({version:VERSION,value});return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);};

export function reviewedPlayStampRows(scopes){
 assert.equal(scopes.length,4);const facts=[];
 for(const s of scopes){const m=assertMasterPrintingAuthority(s.manifest,s.artifacts),registered=index.scopes.find(s=>s.setCode===m.set_code);assert.ok(registered);assert.equal(m.fingerprint,registered.manifestFingerprint);assert.deepEqual(m.parents.map(p=>p.id),registered.parents);assert.equal(m.authority.set_id,registered.setId);assert.equal(m.printings.length,m.parents.length);
  for(const p of m.parents){assert.equal(p.variant_key,'play_pokemon_stamp');assert.equal(p.identity_domain,'pokemon_eng_standard');const wanted=m.printings.filter(c=>c.card_print_id===p.id);assert.equal(wanted.length,1);assert.equal(wanted[0].finish_key,'normal');assert.equal(wanted[0].printing_gv_id,p.gv_id+'-STD');facts.push({...wanted[0],id:printingCandidateId(wanted[0]),manifest_fingerprint:m.fingerprint});}
 }assert.equal(facts.length,28);return facts;
}
export function playStampDescriptor(scopes){
 const facts=reviewedPlayStampRows(scopes),manifests=scopes.map(s=>s.manifest).sort((a,b)=>a.set_code.localeCompare(b.set_code));
 const rawId='-'+BigInt('0x'+hash({version:VERSION,program:PROGRAM}).slice(0,15)),ref='raw_imports:'+rawId+'|'+VERSION;
 const children=sort(facts.map(p=>({id:p.id,card_print_id:p.card_print_id,finish_key:'normal',printing_gv_id:p.printing_gv_id,is_provisional:false,provenance_source:VERSION,provenance_ref:ref,created_by:VERSION})));
 const reviews=sort(facts.map(p=>{const s=scopes.find(s=>s.manifest.fingerprint===p.manifest_fingerprint),m=s.manifest,r=JSON.parse(s.artifacts.get(m.authority.review.ref).toString());return{id:uuid('review:'+p.id),card_printing_id:p.id,review_status:'verified',public_visibility:'visible',active:true,confidence:'high',reason:'Exact generic Play! Pokemon stamped Normal: official black standard-set marker and independent exact Standard Set checklist agree. Normal fact only; no complete foil inventory asserted.',evidence_sources_checked:m.authority.source_artifacts.map(s=>s.url_or_identifier),evidence_sources_for_finish:p.evidence.map(e=>e.source_ref),expected_finish_keys:['normal'],evidence:{program_fingerprint:PROGRAM,manifest_fingerprint:m.fingerprint,master_index_sha256:m.master_index_sha256,review_sha256:m.authority.review.sha256,card_print_id:p.card_print_id,finish_key:'normal',raw_import_id:rawId,finish_inventory_complete:false,foil_pattern_adjudicated:false},source_report_path:ref,reviewed_by:VERSION,reviewed_at:new Date(r.reviewed_at).toISOString()};}));
 return{children,reviews,raw:{id:rawId,source:VERSION,status:'processed',notes:'28 exact existing generic Play! Pokemon stamped parents: Normal facts only; no inferred foil, alias, parent or ownership changes.',payload:{version:VERSION,program_fingerprint:PROGRAM,finish_scope:'normal_only_not_complete_inventory',manifests,reviews:scopes.map(s=>JSON.parse(s.artifacts.get(s.manifest.authority.review.ref).toString()))}}};
}
function setInvariants(state,children){return state.sets.map(s=>{const ids=new Set(state.parents.filter(p=>p.set_id===s.id).map(p=>p.id)),retained=state.children.filter(c=>ids.has(c.card_print_id)),added=children.filter(c=>ids.has(c.card_print_id)),counts=rows=>Object.fromEntries([...new Set(rows.map(c=>c.finish_key))].sort().map(f=>[f,rows.filter(c=>c.finish_key===f).length]));return{set_id:s.id,set_code:s.code,parent_count:ids.size,before_printings:retained.length,after_printings:retained.length+added.length,before_finishes:counts(retained),after_finishes:counts(retained.concat(added)),printing_inserts:added.length};});}
function assertActualSetInvariants(plan,state,phase){for(const expected of plan.set_invariants){const parents=state.parents.filter(p=>p.set_id===expected.set_id),ids=new Set(parents.map(p=>p.id)),children=state.children.filter(c=>ids.has(c.card_print_id));assert.equal(parents.length,expected.parent_count);assert.equal(children.length,expected[phase+'_printings'],'Per-set printing count drift');const finishes=Object.fromEntries([...new Set(children.map(c=>c.finish_key))].sort().map(f=>[f,children.filter(c=>c.finish_key===f).length]));same(finishes,expected[phase+'_finishes'],'Per-set finish counts drift');}}
export function freezePlayStampPlan({scopes,schema,state,observedAt}){
 assert.equal(state.mappings.filter(m=>m.source==='tcgplayer'&&SCOPE.some(s=>s.parent===m.card_print_id)).length,0,'Existing target TCGplayer links require separate review before admitting a child');
 const descriptor=playStampDescriptor(scopes);assert.ok(Number.isFinite(Date.parse(observedAt)));assert.equal(state.sets.length,4);assert.equal(state.parents.length,1098);assert.equal(state.children.length,1643);assert.equal(state.raw.length,0);
 assert.deepEqual(state.sets.map(s=>s.id).sort(),[...new Set(SCOPE.map(s=>s.set))].sort());
 for(const{manifest:m}of scopes)for(const wanted of m.parents){const p=state.parents.find(p=>p.id===wanted.id);assert.ok(p);for(const k of['id','set_id','gv_id','name','identity_domain','variant_key','printed_identity_modifier'])assert.equal(p[k],wanted[k]);assert.equal(String(p.number),wanted.printed_coordinate);assert.equal(state.children.filter(c=>c.card_print_id===p.id).length,0);assert.equal(state.identities.filter(i=>i.card_print_id===p.id&&i.is_active).length,1);}
 assert.equal(state.children.filter(c=>descriptor.children.some(n=>n.id===c.id||n.printing_gv_id===c.printing_gv_id)).length,0);assert.equal(state.reviews.filter(r=>descriptor.reviews.some(n=>n.id===r.id)).length,0);assert.equal(state.options.filter(c=>SCOPE.some(s=>s.parent===c.card_print_id)).length,0);assert.equal(schema.foreign_keys.length,95);assert.equal(state.foreign_footprints.length,new Set(schema.foreign_keys.map(k=>k.schema+'.'+k.relation)).size);assert.equal(state.json_footprints.length,new Set(schema.json_columns.map(k=>k.schema+'.'+k.relation)).size);
 const plan=seal({version:VERSION,project_ref:PROJECT,program_fingerprint:PROGRAM,observed_at:observedAt,manifest_fingerprints:index.scopes.map(s=>s.manifestFingerprint),schema,state_before:state,...descriptor,expected:EXPECTED,boundaries:BOUNDARIES,set_invariants:setInvariants(state,descriptor.children)});assertPlayStampPlan(plan,plan.fingerprint);return plan;
}
export function assertPlayStampPlan(plan,fingerprint){
 assert.equal(plan.state_before?.mappings?.filter(m=>m.source==='tcgplayer'&&SCOPE.some(s=>s.parent===m.card_print_id)).length,0,'Existing target TCGplayer links require separate review before admitting a child');
 const{fingerprint:actual,...body}=plan;assert.equal(actual,fingerprint);assert.equal(hash(body),actual);assert.equal(plan.version,VERSION);assert.equal(plan.project_ref,PROJECT);assert.equal(plan.program_fingerprint,PROGRAM);assert.deepEqual(plan.manifest_fingerprints,index.scopes.map(s=>s.manifestFingerprint));assert.deepEqual(plan.expected,EXPECTED);assert.deepEqual(plan.boundaries,BOUNDARIES);
 assert.equal(plan.state_before.parents.length,1098);assert.equal(plan.state_before.children.length,1643);assert.equal(plan.children.length,28);assert.equal(plan.reviews.length,28);assert.equal(new Set(plan.children.map(c=>c.id)).size,28);assert.equal(new Set(plan.children.map(c=>c.printing_gv_id)).size,28);same(plan.set_invariants,setInvariants(plan.state_before,plan.children),'Set finish invariants drift');
 const facts=[];for(const m of plan.raw.payload.manifests){assertPrintingManifest(m);const s=index.scopes.find(s=>s.setCode===m.set_code);assert.ok(s);assert.equal(m.fingerprint,s.manifestFingerprint);facts.push(...m.printings.map(p=>({...p,id:printingCandidateId(p)})));}
 assert.equal(plan.raw.id,'-'+BigInt('0x'+hash({version:VERSION,program:PROGRAM}).slice(0,15)));assert.equal(plan.raw.source,VERSION);assert.equal(plan.raw.status,'processed');assert.equal(plan.raw.payload.version,VERSION);assert.equal(plan.raw.payload.program_fingerprint,PROGRAM);assert.equal(plan.raw.payload.finish_scope,'normal_only_not_complete_inventory');
 for(const c of plan.children){const wanted=facts.find(f=>f.id===c.id);assert.ok(wanted);assert.deepEqual(Object.keys(c).sort(),[...childFields].sort());for(const k of['id','card_print_id','finish_key','printing_gv_id'])assert.equal(c[k],wanted[k]);assert.equal(c.finish_key,'normal');assert.equal(c.is_provisional,false);assert.equal(c.created_by,VERSION);assert.equal(c.provenance_source,VERSION);assert.equal(c.provenance_ref,'raw_imports:'+plan.raw.id+'|'+VERSION);const r=plan.reviews.find(r=>r.card_printing_id===c.id);assert.ok(r);assert.deepEqual(Object.keys(r).sort(),[...reviewFields].sort());assert.equal(r.id,uuid('review:'+c.id));assert.equal(r.active,true);assert.equal(r.review_status,'verified');assert.equal(r.public_visibility,'visible');assert.deepEqual(r.expected_finish_keys,['normal']);assert.equal(r.evidence.finish_key,'normal');assert.equal(r.evidence.card_print_id,c.card_print_id);assert.equal(r.evidence.raw_import_id,plan.raw.id);assert.equal(r.evidence.finish_inventory_complete,false);assert.equal(r.evidence.foil_pattern_adjudicated,false);}
}

export async function readPlayStampState(client,descriptor,schema,{onProgress=()=>{}}={}){
 const sets=SCOPE.map(s=>s.set),parentTargets=SCOPE.map(s=>s.parent),childIds=descriptor.children.map(c=>c.id),reviewIds=descriptor.reviews.map(r=>r.id);
 const rows=async(sql,args)=>(await client.query(sql,args)).rows.map(r=>r.row),state={insert_effect_proof:exInsertEffectProofV1(schema)};
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
  const{schema,relation}=keys[0],args=keys.map(k=>k.target==='card_prints'?parentTargets:childIds);
  let where='('+keys.map((k,i)=>`t.${identifier(k.column_name)}=any($${i+1}::uuid[])`).join(' or ')+')';
  if(schema==='public'&&relation==='card_printings'){args.push(childIds);where+=` and t.id<>all($${args.length}::uuid[])`;}
  if(schema==='public'&&relation==='card_printing_truth_reviews'){args.push(reviewIds);where+=` and t.id<>all($${args.length}::uuid[])`;}
  onProgress({phase:'foreign_key',schema,relation,completed:state.foreign_footprints.length});
  // Stream every matching full-row hash under the same transaction snapshot.
  // Bounded FETCH statements retain the10s timeout for large history tables;
  // globally sorting the complete hash list preserves the original SQL digest.
  const cursor='play_stamp_reference_'+state.foreign_footprints.length,hashes=[];
  await client.query(`declare ${identifier(cursor)} no scroll cursor for select md5(to_jsonb(t)::text) digest from ${identifier(schema)}.${identifier(relation)} t where ${where}`,args);
  try{for(;;){const batch=(await client.query(`fetch forward 512 from ${identifier(cursor)}`)).rows;for(const row of batch){assert.match(row.digest,/^[a-f0-9]{32}$/);hashes.push(row.digest);}onProgress({phase:'foreign_key_batch',schema,relation,matched:hashes.length});if(batch.length<512)break;}}finally{await client.query(`close ${identifier(cursor)}`).catch(()=>{});}
  state.foreign_footprints.push({schema,relation,rows:hashes.length,digest:createHash('sha256').update(hashes.sort().join('')).digest('hex')});
 }
 const jsonGroups=new Map();for(const k of schema.json_columns){const key=k.schema+'.'+k.relation;if(!jsonGroups.has(key))jsonGroups.set(key,[]);jsonGroups.get(key).push(k);}
 state.json_footprints=[];
 // Matching a UUID already stored in a JSON string is deliberately separate
 // from relational FK checks. Exclusions are only only this exact proposed insert batch.
 const pattern=[...parentTargets,...childIds].join('|');await client.query("set local statement_timeout='20s'");
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


export function classifyPlayStampState(plan,state){
 for(const k of['sets','parents','mappings','identities','foreign_footprints','json_footprints','insert_effect_proof'])same(state[k],plan.state_before[k],'Protected drift: '+k);
 const oldChildren=new Set(plan.state_before.children.map(c=>c.id)),oldReviews=new Set(plan.state_before.reviews.map(c=>c.id));
 same(state.children.filter(c=>oldChildren.has(c.id)),plan.state_before.children,'Retained child drift');
 same(state.reviews.filter(c=>oldReviews.has(c.id)),plan.state_before.reviews,'Retained review drift');
 const children=state.children.filter(c=>!oldChildren.has(c.id)),reviews=state.reviews.filter(c=>!oldReviews.has(c.id));
 if(!children.length&&!reviews.length&&!state.raw.length){same(state.options,plan.state_before.options,'Before public-option drift');assertActualSetInvariants(plan,state,'before');return 'before';}
 same(children.map(c=>project(c,childFields)),plan.children,'Partial/colliding child state');
 for(const c of children)for(const k of['image_source','image_path','image_url','image_alt_url','image_status','image_note'])assert.equal(c[k],null,'New image changed');
 same(reviews.map(r=>({...project(r,reviewFields),reviewed_at:new Date(r.reviewed_at).toISOString()})),plan.reviews,'Partial review state');
 same(state.raw.map(r=>project(r,rawFields)),[plan.raw],'Partial raw state');
 const added=plan.children.map(c=>({id:c.id,card_print_id:c.card_print_id,finish_key:c.finish_key,printing_gv_id:c.printing_gv_id,finish_is_active:true}));
 same(state.options,sort([...plan.state_before.options,...added]),'Only28 exact Normal options may be added');assertActualSetInvariants(plan,state,'after');return 'exact';
}

export function assertPlayStampAuthority(authority,{plan,codeFingerprint,mode,now=Date.now()}){
 assertPlayStampPlan(plan,plan.fingerprint);assert.ok(['rollback','apply'].includes(mode));
 assert.ok(authority,'Exact bounded founder approval required');const{fingerprint,...body}=authority;assert.equal(hash(body),fingerprint);
 assert.equal(authority.version,'PLAY_STAMP_NORMAL_RECOVERY_AUTHORITY_V3');assert.equal(authority.status,'explicit_founder_approval');
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
export async function executePlayStampTransaction(options){
 assertProductionClient(options.client);assertStampExecutionSchemaContextV1(options.plan,options.schemaContext,'canonical28');const{mode,plan,codeFingerprint,authority,rollbackReceipt}=options;
 if(['rollback','apply'].includes(mode))assertPlayStampAuthority(authority,{plan,codeFingerprint,mode});
 if(mode==='apply')assertRollback(rollbackReceipt,{plan,codeFingerprint});
 return transaction({...options,production:true,beforeFinalCommit:async proof=>{assertProductionClient(options.client);assertPlayStampAuthority(authority,{plan,codeFingerprint,mode});assertRollback(rollbackReceipt,{plan,codeFingerprint});await (options.beforeFinalCommit??(async()=>{}))(proof);}});
}
export async function qualifyPlayStampTransaction(options){
 if(assertStampExecutionSchemaContextV1(options.plan,options.schemaContext,'canonical28'))await assertStampSchema521QualificationV1(options.client,options.plan,'canonical28');
 else{
 const c=options.client.connectionParameters;assert.equal(c.host,'127.0.0.1');assert.equal(Number(c.port),55240);assert.equal(c.user,'postgres');assert.equal(c.database,QUALIFICATION_DATABASE);
 assert.equal((await options.client.query('select current_database() name')).rows[0].name,QUALIFICATION_DATABASE);
 }
 return transaction({...options,production:false});
}
async function transaction({client,plan,expectedFingerprint,mode,production,beforeCommit=async()=>{},beforeFinalCommit=async()=>{},onProgress=()=>{}}){
 assertPlayStampPlan(plan,expectedFingerprint);assert.ok(['preflight','rollback','apply','readback'].includes(mode));let attempted=false,committed=false;
 try{await client.query(`begin isolation level serializable${['preflight','readback'].includes(mode)?' read only':''}`);await client.query("set local statement_timeout='45s';set local lock_timeout='3s'");
  if(['rollback','apply'].includes(mode)){
   for(const set of [...new Set(SCOPE.map(s=>s.set))].sort())await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`MASTER_INDEX_PRINTING_EXECUTION_V1:${set}`]);
   await client.query('select id from public.card_prints where set_id=any($1::uuid[]) order by id for update',[SCOPE.map(s=>s.set)]);
   await client.query('select id from public.card_printings where card_print_id=any($1::uuid[]) order by id for update',[plan.state_before.parents.map(p=>p.id)]);
  }
  same(await readPlayStampSchema(client),plan.schema,'Schema/RPC drift');assert.equal(plan.schema.rules.length,0,'Rewrite rules require review');
  assert.ok(plan.schema.triggers.every(t=>t.table==='card_printing_truth_reviews'&&t.name==='trg_card_printing_truth_reviews_updated_at_v1'&&t.enabled==='O'&&/BEFORE UPDATE/.test(t.definition)),'Unreviewed trigger');
  const before=await readPlayStampState(client,plan,plan.schema,{onProgress}),beforeClass=classifyPlayStampState(plan,before);if(mode==='readback')assert.equal(beforeClass,'exact');
  const writes={raw:0,printing_inserts:0,reviews:0,updates:0};
  if(beforeClass==='before'&&['rollback','apply'].includes(mode)){
   same((await client.query("select key from public.finish_keys where key=any($1::text[]) and is_active order by key",[['normal']])).rows,[{key:'normal'}],'Inactive finish key');
   const r=plan.raw;writes.raw=(await client.query('insert into public.raw_imports(id,source,status,notes,payload) values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
   for(const[table,fields,rows,key]of[['card_printings',childFields,plan.children,'printing_inserts'],['card_printing_truth_reviews',reviewFields,plan.reviews,'reviews']])writes[key]=(await client.query(`insert into public.${table}(${fields.join(',')}) select ${fields.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)])).rowCount;
   assert.deepEqual(writes,{raw:1,printing_inserts:28,reviews:28,updates:0});
  }
  const after=await readPlayStampState(client,plan,plan.schema,{onProgress}),afterClass=classifyPlayStampState(plan,after);
  if(mode!=='preflight'||beforeClass==='exact')assert.equal(afterClass,'exact');
  const result={version:VERSION,environment:production?'production':'local_qualification',project_ref:production?PROJECT:null,mode,fingerprint:plan.fingerprint,before:beforeClass,after:afterClass,writes,exact_readback:afterClass==='exact'};
  if(mode==='apply'){await beforeCommit(result);same(await readPlayStampSchema(client),plan.schema,'Precommit schema drift');assert.equal(classifyPlayStampState(plan,await readPlayStampState(client,plan,plan.schema,{onProgress})),'exact');await beforeFinalCommit(result);attempted=true;await client.query('commit');committed=true;}else await client.query('rollback');
  if(mode==='rollback'){await client.query('begin isolation level repeatable read read only');try{same(await readPlayStampState(client,plan,plan.schema,{onProgress}),before,'Rollback changed protected state');result.rollback_proven=true;}finally{await client.query('rollback');}}
  return {...result,committed,commit_uncertain:false};
 }catch(error){error.rollback_uncertain=false;await client.query('rollback').catch(()=>{error.rollback_uncertain=true;});error.commit_uncertain=attempted&&!committed;throw error;}
}
