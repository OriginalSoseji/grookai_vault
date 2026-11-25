import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {buildCardPrintGvIdV1} from './buildCardPrintGvIdV1.mjs';
import {genericPlayStampEvidenceRegistryV2,verifyGenericPlayStampSourceBytesV2,
  adjudicateGenericPlayStampEvidenceV2,capturedGenericPlayStampEvidenceInputV2}
  from '../identity/generic_play_stamp_identity_evidence_v2.mjs';

export const WAREHOUSE_PARENT_REGISTRY_V1='WAREHOUSE_PARENT_REGISTRY_V1';
const targets=genericPlayStampEvidenceRegistryV2().targets;
const evidenceRegistry=genericPlayStampEvidenceRegistryV2().fingerprint;
const assignedUuid=value=>{const h=hash(value);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
export function proposedReviewedPlayParentIdV1(baseParentId) {
  assert.ok(targets.some(t=>t.base.id===baseParentId),'reviewed_base_required_for_new_uuid_proposal');
  return assignedUuid({version:'REVIEWED_GENERIC_PLAY_PARENT_ASSIGNMENT_V1',canonical_base_id:baseParentId,
    identity_domain:'pokemon_eng_standard',printed_identity_modifier:'play_pokemon_stamp'});
}
const proposedIdentityId=(parentId,identity)=>assignedUuid({version:WAREHOUSE_PARENT_REGISTRY_V1,card_print_id:parentId,
  identity_domain:identity.identity_domain,identity_key_version:identity.identity_key_version,identity_key_hash:identity.identity_key_hash});
const fields=['set_id','set_code','game_id','identity_domain','variant_key','printed_identity_modifier','name','number_plain'];
const identityFields=['identity_domain','set_code_identity','printed_number','normalized_printed_name','source_name_raw',
  'identity_payload','identity_key_version','identity_key_hash'];
const projectionFunction='public.card_print_identity_backfill_projection_v1(jsonb,text,text,text,text,text,text,integer,text)';
const project=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));
async function projection(client,target) {
  const result=(await client.query(`select public.card_print_identity_backfill_projection_v1(s.source,s.code,s.code,
      $2::text,$2::text,$3::text,$4::text,null::integer,null::text) projection,
      s.printed_set_abbrev,s.game,s.identity_domain_default,
      pg_get_functiondef($5::regprocedure) projection_definition
    from public.sets s where s.id=$1`,[target.set_id,target.number_plain,target.name,target.variant_key,projectionFunction])).rows;
  assert.equal(result.length,1,'registry_exact_set_required');const row=result[0];
  assert.equal(row.game,'pokemon');assert.equal(row.identity_domain_default,'pokemon_eng_standard');
  assert.equal(row.projection.status,'ready','registry_current_identity_law_not_ready');
  assert.equal(row.projection.identity_domain,'pokemon_eng_standard');
  assert.equal(row.projection.identity_key_version,'pokemon_eng_standard:v1');
  assert.match(row.projection.identity_key_hash,/^[a-f0-9]{64}$/);
  const identity=project(row.projection,identityFields);
  assert.equal(identity.identity_payload.variant_key_current,target.variant_key);
  const gvId=buildCardPrintGvIdV1({setCode:target.set_code,printedSetAbbrev:row.printed_set_abbrev,
    number:identity.printed_number,numberPlain:identity.printed_number,variantKey:identity.identity_payload.variant_key_current});
  assert.ok(gvId,'registry_identity_public_id_required');
  return {identity,gv_id:gvId,projection_definition_sha256:createHash('sha256').update(row.projection_definition).digest('hex')};
}
function targetShape(value) {
  const t=project(value,fields);assert.equal(t.identity_domain,'pokemon_eng_standard');
  assert.equal(t.variant_key,'play_pokemon_stamp');assert.equal(t.printed_identity_modifier,t.variant_key);
  return t;
}
function reviewedTarget(productId,parent) {
  verifyGenericPlayStampSourceBytesV2();
  const target=targets.find(t=>String(t.product_id)===String(productId));assert.ok(target,'reviewed_parent_registry_scope_required');
  const shape=targetShape(parent);
  for(const key of ['set_id','set_code','game_id','identity_domain','name'])assert.equal(shape[key],target.base[key],'reviewed_registry_parent_changed:'+key);
  assert.equal(shape.number_plain,target.printed_number.split('/')[0],'reviewed_registry_printed_number_changed');
  return {target,shape};
}
async function assertCurrentReviewedBase(client,target,excludeNewId) {
  const base=(await client.query('select to_jsonb(p) row from public.card_prints p where id=$1',[target.base.id])).rows[0]?.row;
  assert.ok(base,'reviewed_underlying_base_missing');
  const identities=(await client.query('select to_jsonb(i) row from public.card_print_identity i where card_print_id=$1 and is_active order by id',[base.id])).rows.map(r=>r.row);
  const aliases=(await client.query(`select to_jsonb(a) row from public.card_print_identity_aliases a
    where active and (legacy_card_print_id=$1 or canonical_card_print_id=$1) order by id`,[base.id])).rows.map(r=>r.row);
  assert.ok(!aliases.some(a=>a.legacy_card_print_id===base.id),'reviewed_base_outgoing_alias_requires_reconciliation');
  const collisions=(await client.query(`select id from public.card_prints p where p.game_id=$1 and p.id<>$2 and
    (p.variant_key in('play_pokemon_stamp','prize_pack_stamp') or p.printed_identity_modifier in('play_pokemon_stamp','prize_pack_stamp'))
    and regexp_replace(split_part(p.number,'/',1),'^0+','')=regexp_replace(split_part($3::text,'/',1),'^0+','')
    and (p.set_id=$4 or lower(btrim(regexp_replace(normalize(p.name,NFKC),'\\s+',' ','g')))=lower(btrim($5::text)))`,
    [base.game_id,excludeNewId,base.number,base.set_id,base.name])).rows;
  const decision=adjudicateGenericPlayStampEvidenceV2({product_id:target.product_id,
    base:project(base,Object.keys(target.base)),active_base_identities:identities.map(i=>project(i,Object.keys(target.base_identity))),
    approved_base_aliases:aliases,existing_generic_stamp_parent_ids:collisions.map(r=>r.id),
    observation:capturedGenericPlayStampEvidenceInputV2(target.product_id).observation});
  assert.equal(decision.status,'NEW_CANONICAL_REQUIRED','reviewed_base_identity_alias_or_global_collision_changed');
}
export async function freezeReviewedPlayParentRegistryV1(client,{candidate,parent}) {
  const marker=candidate.reference_hints_payload?.generic_play_nine_intake;
  assert.equal(marker?.version,'GENERIC_PLAY_NINE_INTAKE_V1','reviewed_source_intake_required');
  const {target,shape}=reviewedTarget(candidate.tcgplayer_id,parent);
  const current=await projection(client,shape);
  const parentId=proposedReviewedPlayParentIdV1(target.base.id),identityId=proposedIdentityId(parentId,current.identity);
  await assertCurrentReviewedBase(client,target,parentId);
  const collisions=(await client.query(`select id from public.card_print_identity where is_active and identity_domain=$1
    and identity_key_version=$2 and identity_key_hash=$3 limit 2`,[current.identity.identity_domain,current.identity.identity_key_version,current.identity.identity_key_hash])).rows;
  assert.equal(collisions.length,0,'registry_active_identity_collision');
  assert.equal((await client.query('select id from public.card_prints where gv_id=$1 or id=$2 limit 2',[current.gv_id,parentId])).rows.length,0,'registry_global_public_id_or_uuid_collision');
  assert.equal((await client.query('select id from public.card_print_identity where id=$1',[identityId])).rows.length,0,'registry_proposed_identity_uuid_collision');
  const body={version:WAREHOUSE_PARENT_REGISTRY_V1,scope:'new_reviewed_generic_play_parent_only',product_id:String(candidate.tcgplayer_id),
    evidence_registry:evidenceRegistry,planned_parent_id:parentId,planned_identity_id:identityId,
    new_uuid_proposals_not_existing_records:true,target:shape,...current,existing_identity_updates:0,existing_parent_updates:0};
  return {...body,fingerprint:hash(body)};
}
export async function assertWarehouseParentRegistryV1(client,admission,parent,{parentId=null}={}) {
  const {fingerprint,...body}=admission;assert.equal(hash(body),fingerprint,'registry_admission_fingerprint_changed');
  assert.equal(admission.version,WAREHOUSE_PARENT_REGISTRY_V1);assert.equal(admission.scope,'new_reviewed_generic_play_parent_only');
  const {target,shape:expected}=reviewedTarget(admission.product_id,{...parent,number_plain:parent.number_plain??parent.number});
  assert.equal(admission.evidence_registry,evidenceRegistry);
  assert.equal(admission.planned_parent_id,proposedReviewedPlayParentIdV1(target.base.id),'registry_parent_uuid_proposal_changed');
  assert.equal(admission.planned_identity_id,proposedIdentityId(admission.planned_parent_id,admission.identity),'registry_identity_uuid_proposal_changed');
  assert.equal(admission.new_uuid_proposals_not_existing_records,true);
  if(parentId)assert.equal(parentId,admission.planned_parent_id,'registry_inserted_parent_uuid_changed');
  await assertCurrentReviewedBase(client,target,admission.planned_parent_id);
  assert.deepEqual(expected,admission.target,'registry_frozen_parent_changed');
  assert.equal(parent.gv_id,admission.gv_id,'registry_public_id_must_follow_identity');
  const current=await projection(client,expected);
  for(const key of ['identity','gv_id','projection_definition_sha256'])assert.deepEqual(current[key],admission[key],'registry_identity_law_drift:'+key);
  const collisions=(await client.query(`select id from public.card_print_identity where id=$4 or (is_active and identity_domain=$1
    and identity_key_version=$2 and identity_key_hash=$3) limit 2`,[current.identity.identity_domain,current.identity.identity_key_version,current.identity.identity_key_hash,admission.planned_identity_id])).rows;
  assert.equal(collisions.length,0,'registry_active_identity_collision');
  const publicIds=(await client.query('select id from public.card_prints where gv_id=$1 or id=$2 limit 2',[current.gv_id,admission.planned_parent_id])).rows;
  if(parentId)assert.deepEqual(publicIds.map(p=>p.id),[parentId],'registry_exact_inserted_parent_required');
  else assert.equal(publicIds.length,0,'registry_global_public_id_collision');
  return current;
}
export async function verifyWarehouseParentRegistryV1(client,parentId,admission) {
  const rows=(await client.query('select to_jsonb(i) row from public.card_print_identity i where card_print_id=$1 and is_active order by id',[parentId])).rows.map(r=>r.row);
  assert.equal(rows.length,1,'exact_one_active_parent_registry_required');const row=rows[0];
  assert.equal(row.id,admission.planned_identity_id,'registry_committed_identity_uuid_changed');
  assert.deepEqual(project(row,identityFields),admission.identity,'registry_committed_identity_changed');
  return row;
}
export async function applyWarehouseParentRegistryV1(client,parentId,admission,parent) {
  await assertWarehouseParentRegistryV1(client,admission,parent,{parentId});
  const existing=(await client.query(`select id from public.card_print_identity where card_print_id=$1 or
    (is_active and identity_domain=$2 and identity_key_version=$3 and identity_key_hash=$4)`,
    [parentId,admission.identity.identity_domain,admission.identity.identity_key_version,admission.identity.identity_key_hash])).rows;
  assert.equal(existing.length,0,'new_parent_registry_collision');
  const columns=['id','card_print_id',...identityFields,'is_active'];
  const row={id:admission.planned_identity_id,card_print_id:parentId,...admission.identity,is_active:true};
  assert.equal((await client.query(`insert into public.card_print_identity(${columns.join(',')})
    select ${columns.join(',')} from jsonb_populate_record(null::public.card_print_identity,$1::jsonb)`,[JSON.stringify(row)])).rowCount,1);
  return verifyWarehouseParentRegistryV1(client,parentId,admission);
}
