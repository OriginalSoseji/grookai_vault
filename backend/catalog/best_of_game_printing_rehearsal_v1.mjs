import assert from 'node:assert/strict';
import {printingManifestHash as hash,printingCandidateId} from './printing_completeness_gate_v1.mjs';
import {assertMasterPrintingAuthority} from './master_index_printing_authority_v1.mjs';
import {readExecutionSchema} from './master_index_printing_execution_v1.mjs';

export const VERSION='BEST_OF_GAME_PRINTING_REHEARSAL_V1';
export const LOCAL_DATABASE='bog_printing_rehearsal_20261118_v1';
export const SET_IDS=['157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','c8debb57-da6f-46ce-8777-13ecedfe2856'];
const MANIFEST='48ba01523ae9f62d47165f3f0e7effc06b4637fff25ee538cad4915931617089';
const childFields=['id','card_print_id','finish_key','printing_gv_id','is_provisional','provenance_source','provenance_ref','created_by'];
const reviewFields=['id','card_printing_id','review_status','public_visibility','active','confidence','reason','evidence_sources_checked','evidence_sources_for_finish','expected_finish_keys','evidence','source_report_path','reviewed_by','reviewed_at'];
const rawFields=['id','source','status','notes','payload'];
const sort=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const project=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
const seal=value=>({...value,fingerprint:hash(value)});
const uuid=value=>{const h=hash({version:VERSION,value});return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const boundaries={production_writes:0,parent_writes:0,existing_row_updates:0,ownership_writes:0,mapping_writes:0,pricing_writes:0,image_writes:0,deletes:0};
const identifier=value=>{assert.equal(typeof value,'string');assert.ok(value.length);return '"'+value.replaceAll('"','""')+'"';};

export async function readBestOfGameSchema(client) {
 const schema=await readExecutionSchema(client);
 schema.protected_relations=(await client.query(`select n.nspname schema,c.relname relation from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing') and c.relkind in ('r','p') order by n.nspname,c.relname`)).rows;
 return schema;
}

export function freezeBestOfGameRehearsal({candidate,manifest,artifacts,family,schema,protectedFootprints}) {
 assertMasterPrintingAuthority(manifest,artifacts);assert.equal(manifest.fingerprint,MANIFEST);
 const {fingerprint,...candidateBody}=candidate;assert.equal(hash(candidateBody),fingerprint);
 assert.equal(candidate.manifest_fingerprint,MANIFEST);
 assert.deepEqual(candidate.expected_mutation_counts,{raw_evidence_inserts:1,printing_inserts:2,provenance_updates:0,review_inserts:2});
 assert.deepEqual(candidate.provenance_updates,[]);assert.deepEqual(candidate.retained_printing_ids,[]);
 assert.deepEqual(Object.values(candidate.boundaries),Array(Object.keys(candidate.boundaries).length).fill(0));
 assert.equal(family.sets.length,2);assert.deepEqual(family.sets.map(s=>s.id).sort(),SET_IDS);
 assert.equal(family.parents.length,22);assert.equal(family.children.length,16);
 assert.equal(family.parents.filter(p=>p.set_code==='bp').length,9);
 assert.equal(family.parents.filter(p=>p.variant_key==='winner_stamp'&&p.printed_identity_modifier==='winner_stamp').length,4);
 for(const expected of manifest.parents) {
  const actual=family.parents.find(p=>p.id===expected.id);assert.ok(actual);
  for(const key of ['id','gv_id','set_id','name','identity_domain','variant_key','printed_identity_modifier'])assert.equal(actual[key],expected[key]);
  assert.equal(actual.number_plain,expected.printed_coordinate);
  assert.equal(family.children.filter(c=>c.card_print_id===actual.id).length,0);
 }
 assert.equal(new Set(family.parents.map(p=>p.id)).size,22);assert.equal(new Set(family.children.map(c=>c.id)).size,16);
 const rawId=`-${BigInt('0x'+hash({candidate:fingerprint,version:VERSION}).slice(0,15))}`,ref=`raw_imports:${rawId}|master-index:${MANIFEST}`;
 const children=sort(manifest.printings.map(p=>({id:printingCandidateId(p),card_print_id:p.card_print_id,finish_key:'reverse',printing_gv_id:p.printing_gv_id,is_provisional:false,provenance_source:VERSION,provenance_ref:ref,created_by:VERSION})));
 assert.deepEqual(sort(candidate.printing_inserts).map(p=>project(p,['id','card_print_id','finish_key','printing_gv_id'])),children.map(p=>project(p,['id','card_print_id','finish_key','printing_gv_id'])));
 const review=JSON.parse(artifacts.get(manifest.authority.review.ref));
 const reviews=sort(children.map(c=>({id:uuid(`review:${MANIFEST}:${c.id}`),card_printing_id:c.id,review_status:'verified',public_visibility:'visible',active:true,confidence:'high',
  reason:'Exact Best of Game regular-size reverse printing; intrinsic Winner stamp retained within the existing parent identity.',
  evidence_sources_checked:manifest.authority.source_artifacts.map(s=>s.url_or_identifier),
  evidence_sources_for_finish:manifest.printings.find(p=>p.card_print_id===c.card_print_id).evidence.map(e=>e.source_ref),expected_finish_keys:['reverse'],
  evidence:{manifest_fingerprint:MANIFEST,review_sha256:manifest.authority.review.sha256,raw_import_id:rawId,card_print_id:c.card_print_id,finish_key:'reverse'},
  source_report_path:ref,reviewed_by:VERSION,reviewed_at:new Date(review.reviewed_at).toISOString()})));
 const raw={id:rawId,source:VERSION,status:'processed',notes:'Local-only rehearsal of two reviewed Best of Game reverse children; all stored identities retained.',
  payload:{version:VERSION,master_manifest:manifest,review,source_artifact_bindings:manifest.authority.source_artifacts,candidate_fingerprint:fingerprint}};
 const plan=seal({version:VERSION,environment:'local_rehearsal_only',production_apply_available:false,candidate_fingerprint:fingerprint,manifest_fingerprint:MANIFEST,
  sets_before:sort(family.sets),parents_before:sort(family.parents),children_before:sort(family.children),schema,schema_sha256:hash(schema),protected_footprints:protectedFootprints,
  children,reviews,raw,expected:{retained_parents:22,retained_children:16,children_after:18,bp_children_after:9,raw:1,printing_inserts:2,reviews:2,updates:0},boundaries});
 assertBestOfGameRehearsal(plan,plan.fingerprint);return plan;
}

export function assertBestOfGameRehearsal(plan,expectedFingerprint) {
 const {fingerprint,...body}=plan;assert.equal(fingerprint,expectedFingerprint);assert.equal(hash(body),fingerprint,'Plan fingerprint drift');
 assert.equal(plan.version,VERSION);assert.equal(plan.environment,'local_rehearsal_only');assert.equal(plan.production_apply_available,false);assert.equal(plan.manifest_fingerprint,MANIFEST);
 assert.deepEqual(plan.boundaries,boundaries);assert.equal(hash(plan.schema),plan.schema_sha256);
 assert.equal(plan.parents_before.length,22);assert.equal(plan.children_before.length,16);assert.equal(plan.sets_before.length,2);
 assert.equal(plan.children.length,2);assert.equal(plan.reviews.length,2);
 assert.deepEqual(plan.expected,{retained_parents:22,retained_children:16,children_after:18,bp_children_after:9,raw:1,printing_inserts:2,reviews:2,updates:0});
 const manifest=plan.raw.payload.master_manifest;assert.equal(manifest.fingerprint,MANIFEST);
 const {fingerprint:mf,...mb}=manifest;assert.equal(hash(mb),mf);
 const ref=`raw_imports:${plan.raw.id}|master-index:${MANIFEST}`;
 assert.match(plan.raw.id,/^-\d+$/);assert.equal(plan.raw.source,VERSION);assert.equal(plan.raw.status,'processed');
 for(const c of plan.children) {
  const wanted=manifest.printings.find(p=>p.card_print_id===c.card_print_id);assert.ok(wanted);
  assert.equal(c.id,printingCandidateId(wanted));assert.equal(c.finish_key,'reverse');assert.equal(c.printing_gv_id,wanted.printing_gv_id);
  assert.deepEqual(Object.keys(c).sort(),[...childFields].sort());assert.equal(c.is_provisional,false);assert.equal(c.provenance_source,VERSION);assert.equal(c.provenance_ref,ref);assert.equal(c.created_by,VERSION);
  assert.equal(plan.children_before.filter(p=>p.card_print_id===c.card_print_id).length,0);
  const matches=plan.reviews.filter(r=>r.card_printing_id===c.id);assert.equal(matches.length,1);const r=matches[0];
  assert.deepEqual(Object.keys(r).sort(),[...reviewFields].sort());assert.equal(r.id,uuid(`review:${MANIFEST}:${c.id}`));
  assert.equal(r.review_status,'verified');assert.equal(r.public_visibility,'visible');assert.equal(r.active,true);assert.equal(r.evidence.card_print_id,c.card_print_id);assert.equal(r.evidence.finish_key,'reverse');assert.equal(r.evidence.raw_import_id,plan.raw.id);assert.deepEqual(r.expected_finish_keys,['reverse']);
 }
 assert.equal(new Set(plan.children.map(c=>c.id)).size,2);assert.equal(new Set(plan.children.map(c=>c.card_print_id)).size,2);
}

export async function readBestOfGameState(client,plan) {
 const parentIds=plan.parents_before.map(p=>p.id),childIds=plan.children.map(c=>c.id),reviewIds=plan.reviews.map(r=>r.id);
 const rows=async(sql,args)=>(await client.query(sql,args)).rows.map(r=>r.row);
 const sets=await rows('select to_jsonb(t) row from public.sets t where id=any($1::uuid[]) order by id',[SET_IDS]);
 const parents=await rows('select to_jsonb(t) row from public.card_prints t where set_id=any($1::uuid[]) order by id',[SET_IDS]);
 const children=await rows('select to_jsonb(t) row from public.card_printings t where card_print_id=any($1::uuid[]) or id=any($2::uuid[]) or printing_gv_id=any($3::text[]) order by id',[parentIds,childIds,plan.children.map(c=>c.printing_gv_id)]);
 const reviews=await rows('select to_jsonb(t) row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[]) or id=any($2::uuid[]) order by id',[childIds,reviewIds]);
 const raw=await rows("select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text) row from public.raw_imports t where id=$1::bigint",[plan.raw.id]);
 const footprints=[];
 for(const {schema,relation}of plan.schema.protected_relations) {
  let where='',args=[];
  if(schema==='public'&&relation==='card_printings') {where='where t.id<>all($1::uuid[])';args=[childIds];}
  if(schema==='public'&&relation==='card_printing_truth_reviews') {where='where t.id<>all($1::uuid[])';args=[reviewIds];}
  if(schema==='public'&&relation==='raw_imports') {where='where t.id<>$1::bigint';args=[plan.raw.id];}
  const q=`select count(*)::int rows,encode(sha256(convert_to(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),''),'UTF8')),'hex') digest from ${identifier(schema)}.${identifier(relation)} t ${where}`;
  const result=(await client.query(q,args)).rows[0];footprints.push({schema,relation,...result});
 }
 return {sets,parents,children,reviews,raw,footprints};
}

export function classifyBestOfGameState(plan,state) {
 assert.deepEqual(state.sets,plan.sets_before,'Set drift');assert.deepEqual(state.parents,plan.parents_before,'Parent drift');
 const existing=state.children.filter(c=>plan.children_before.some(p=>p.id===c.id));assert.deepEqual(existing,plan.children_before,'Retained child drift');
 const inserted=state.children.filter(c=>!plan.children_before.some(p=>p.id===c.id));
 if(!inserted.length&&!state.reviews.length&&!state.raw.length)return 'before';
 assert.deepEqual(inserted.map(c=>project(c,childFields)),plan.children,'Collision or partial children');
 for(const c of inserted)for(const key of ['image_source','image_path','image_url','image_alt_url','image_status','image_note'])assert.equal(c[key],null,'Unexpected new image');
 assert.deepEqual(state.reviews.map(r=>({...project(r,reviewFields),reviewed_at:new Date(r.reviewed_at).toISOString()})),plan.reviews,'Partial or changed review');
 assert.deepEqual(state.raw.map(r=>project(r,rawFields)),[plan.raw],'Partial or changed raw evidence');return 'exact';
}

export async function executeBestOfGameRehearsal({client,plan,expectedFingerprint,mode,beforeCommit=async()=>{}}) {
 assertBestOfGameRehearsal(plan,expectedFingerprint);assert.ok(['preflight','rollback','apply','readback'].includes(mode));
 // Production execution deliberately has no entry point in this local candidate.
 assert.ok(['127.0.0.1','::1','localhost'].includes(client.connectionParameters.host),'Local loopback client required');
 assert.equal(client.connectionParameters.database,LOCAL_DATABASE,'Dedicated rehearsal database required');
 const target=(await client.query('select current_database() database,host(inet_server_addr()) address')).rows[0];
 assert.equal(target.database,LOCAL_DATABASE);assert.ok(['127.0.0.1','::1'].includes(target.address),'Local server required');
 let commitAttempted=false,committed=false;
 try {
  await client.query(`begin isolation level serializable${['preflight','readback'].includes(mode)?' read only':''}`);
  await client.query("set local statement_timeout='45s';set local lock_timeout='3s'");
  if(['rollback','apply'].includes(mode)) {
   await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[VERSION]);
   await client.query('select id from public.card_prints where set_id=any($1::uuid[]) order by id for update',[SET_IDS]);
   await client.query('select id from public.card_printings where card_print_id=any($1::uuid[]) order by id for update',[plan.parents_before.map(p=>p.id)]);
  }
  assert.deepEqual(await readBestOfGameSchema(client),plan.schema,'Schema drift');assert.equal(plan.schema.rules.length,0,'Unreviewed rewrite rule');
  assert.ok(plan.schema.triggers.every(t=>t.table==='card_printing_truth_reviews'&&t.name==='trg_card_printing_truth_reviews_updated_at_v1'&&t.enabled==='O'&&/BEFORE UPDATE/.test(t.definition)),'Unreviewed trigger');
  const before=await readBestOfGameState(client,plan),classification=classifyBestOfGameState(plan,before);
  assert.deepEqual(before.footprints,plan.protected_footprints,'Protected state drift');if(mode==='readback')assert.equal(classification,'exact');
  const writes={raw:0,printing_inserts:0,reviews:0,updates:0};
  if(classification==='before'&&['rollback','apply'].includes(mode)) {
   assert.deepEqual((await client.query("select key from public.finish_keys where key='reverse' and is_active")).rows,[{key:'reverse'}]);
   const r=plan.raw;writes.raw=(await client.query('insert into public.raw_imports(id,source,status,notes,payload) values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
   for(const [table,fields,rows,key]of [['card_printings',childFields,plan.children,'printing_inserts'],['card_printing_truth_reviews',reviewFields,plan.reviews,'reviews']]) {
    writes[key]=(await client.query(`insert into public.${table}(${fields.join(',')}) select ${fields.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)])).rowCount;
   }
   assert.deepEqual(writes,{raw:1,printing_inserts:2,reviews:2,updates:0});
  }
  const after=await readBestOfGameState(client,plan),afterClass=classifyBestOfGameState(plan,after);assert.deepEqual(after.footprints,plan.protected_footprints,'Protected state changed');
  if(mode!=='preflight'||classification==='exact') {
   assert.equal(afterClass,'exact');
   const options=(await client.query('select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0) order by id',[plan.parents_before.map(p=>p.id)])).rows;
   const expected=sort([...plan.children_before,...plan.children]).map(c=>({id:c.id,card_print_id:c.card_print_id,finish_key:c.finish_key,printing_gv_id:c.printing_gv_id,finish_is_active:true}));
   assert.deepEqual(options,expected,'Public option mismatch');
  }
  const result={version:VERSION,mode,fingerprint:plan.fingerprint,before:classification,after:afterClass,writes,exact_readback:afterClass==='exact',productionWrites:0};
  if(mode==='apply') {
   await beforeCommit(result);
   assert.deepEqual(await readBestOfGameSchema(client),plan.schema,'Precommit schema drift');
   const last=await readBestOfGameState(client,plan);assert.equal(classifyBestOfGameState(plan,last),'exact');
   assert.deepEqual(last.footprints,plan.protected_footprints,'Precommit protected state drift');
   commitAttempted=true;await client.query('commit');committed=true;
  }else await client.query('rollback');
  if(mode==='rollback') {assert.deepEqual(await readBestOfGameState(client,plan),before,'Rollback mismatch');result.rollback_proven=true;}
  return {...result,committed,commit_uncertain:false};
 }catch(error){error.rollback_uncertain=false;await client.query('rollback').catch(()=>{error.rollback_uncertain=true;});error.commit_uncertain=commitAttempted&&!committed;throw error;}
}
