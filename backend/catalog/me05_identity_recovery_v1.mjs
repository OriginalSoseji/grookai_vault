import assert from 'node:assert/strict';
import { deterministicUuidV5, sha256, stableJson } from '../pricing/one_piece_canonical_import_staging_v1.mjs';

export const VERSION = 'ME05_EXISTING_IDENTITY_RECOVERY_20261002_V1';
export const SET_ID = '6f0ede4b-c59a-5b22-ac0f-d0bd6ed2b6c4';
export const DOMAIN = 'pokemon_eng_standard';
export const digest = value => sha256(stableJson(JSON.parse(JSON.stringify(value))));
const ordered = rows => [...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const normalizedName = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const coordinate = value => String(value).split('/')[0].replace(/^0+(?=\d)/,'');
const withoutTimes = ({created_at,updated_at,...row}) => row;

// Fixed whole-set repair. This is not a new ingestion or generic identity writer.
export function validateMe05RecoveryPlan(plan, masterFacts) {
  assert.equal(plan.version,VERSION);
  const {fingerprint,...body}=plan;assert.equal(fingerprint,digest(body),'plan fingerprint');
  assert.equal(plan.before.set.id,SET_ID);assert.equal(plan.before.set.code,'me05');
  assert.equal(plan.before.set.game,'pokemon');assert.equal(plan.before.set.identity_model,'standard');
  assert.equal(plan.before.set.identity_domain_default,'pokemon');
  assert.equal(plan.before.set.source.new_set_release_ingestion_v1.target_key,'pitch_black_en');
  assert.equal(plan.before.set.source.new_set_release_ingestion_v1.source_ids.tcgcsv_group_id,24688);
  assert.equal(plan.before.parents.length,120);assert.equal(plan.before.identities.length,0);
  assert.equal(plan.before.evidence.length,0);assert.equal(plan.identities.length,120);
  assert.equal(plan.before.printings.length,199);assert.equal(plan.before.reviews.length,199);
  assert.equal(plan.before.mappings.length,120);assert.equal(masterFacts.length,120);
  assert.equal(new Set(masterFacts.map(f=>coordinate(f.card_number))).size,120);
  assert.equal(digest(masterFacts),plan.master_facts_sha256,'master facts drift');
  assert.equal(new Set(plan.before.parents.map(p=>p.id)).size,120);
  assert.equal(new Set(plan.identities.map(p=>p.id)).size,120);
  assert.equal(new Set(plan.identities.map(p=>p.identity_key_hash)).size,120);
  for(const parent of plan.before.parents){
    assert.equal(parent.set_id,SET_ID);assert.equal(parent.set_code,'me05');assert.equal(parent.identity_domain,'pokemon');
    assert.equal(parent.variant_key,'');assert.equal(parent.printed_identity_modifier,null);
    assert.equal(parent.set_identity_model,'standard');assert.equal(parent.printed_total,84);
    const facts=masterFacts.filter(f=>coordinate(f.card_number)===coordinate(parent.number)&&normalizedName(f.card_name)===normalizedName(parent.name));
    assert.equal(facts.length,1,'exact Master match');const fact=facts[0];
    assert.equal(fact.status,'master_verified');assert.equal(fact.set_key,'me05');assert.ok(fact.source_evidence.length>=2);
    const identities=plan.identities.filter(i=>i.card_print_id===parent.id);assert.equal(identities.length,1);
    const identity=identities[0];assert.equal(identity.id,deterministicUuidV5(`${VERSION}:${parent.id}`));
    assert.equal(identity.identity_domain,DOMAIN);assert.equal(identity.identity_key_version,`${DOMAIN}:v1`);
    assert.equal(identity.set_code_identity,'me05');assert.equal(identity.printed_number,parent.number);
    assert.equal(identity.normalized_printed_name,parent.name.trim().toLowerCase().replace(/\s+/g,' '));
    assert.equal(identity.source_name_raw,null);assert.equal(identity.is_active,true);assert.match(identity.identity_key_hash,/^[a-f0-9]{64}$/);
    const children=plan.before.printings.filter(p=>p.card_print_id===parent.id);assert.ok(children.length>0);
    for(const child of children){
      const reviews=plan.before.reviews.filter(r=>r.card_printing_id===child.id);assert.equal(reviews.length,1);
      assert.equal(reviews[0].active,true);assert.equal(reviews[0].review_status,'verified');
      assert.equal(reviews[0].public_visibility,'visible');assert.ok(reviews[0].evidence.manifest_fingerprint);
    }
    const mappings=plan.before.mappings.filter(m=>m.card_print_id===parent.id);assert.equal(mappings.length,1);
    assert.equal(mappings[0].source,'tcgcsv');assert.equal(mappings[0].active,true);assert.match(mappings[0].external_id,/^tcgcsv:24688:[0-9]+$/);
  }
  assert.deepEqual(plan.evidence,buildMe05IdentityEvidence(plan.identities,masterFacts,plan.master_sha256));
  return plan;
}

export function buildMe05IdentityEvidence(identities,masterFacts,masterSha){
  return ordered(identities.map(identity=>{
    const fact=masterFacts.find(f=>coordinate(f.card_number)===coordinate(identity.printed_number));assert.ok(fact);
    const subject={identity_domain:DOMAIN,language_scope:'en',set_code_identity:'me05',printed_number:identity.printed_number,printed_name:fact.card_name};
    const payload={master_index_sha256:masterSha,master_fact:fact,recovery:VERSION};
    return {id:deterministicUuidV5(`${VERSION}:evidence:${identity.card_print_id}`),card_print_identity_id:identity.id,
      card_print_id:identity.card_print_id,acquisition_key:`${VERSION}:${identity.card_print_id}`,source_key:'english_master_index',
      evidence_key_hash:digest({subject,payload}),evidence_subject:subject,evidence_payload:payload,active:true};
  }));
}

export async function readMe05RecoveryState(client){
  const q=async(sql,args)=>(await client.query(sql,args)).rows;
  const sets=await q('select * from public.sets where id=$1',[SET_ID]);assert.equal(sets.length,1);
  const parents=await q('select * from public.card_prints where set_id=$1 order by id',[SET_ID]);
  const ids=parents.map(p=>p.id);
  const identities=await q('select * from public.card_print_identity where card_print_id=any($1::uuid[]) order by id',[ids]);
  const evidence=await q('select * from public.card_print_identity_source_evidence where card_print_id=any($1::uuid[]) order by id',[ids]);
  const printings=await q('select * from public.card_printings where card_print_id=any($1::uuid[]) order by id',[ids]);
  const reviews=await q('select * from public.card_printing_truth_reviews where card_printing_id=any($1::uuid[]) order by id',[printings.map(p=>p.id)]);
  const mappings=await q('select * from public.external_mappings where card_print_id=any($1::uuid[]) order by id',[ids]);
  return JSON.parse(JSON.stringify({set:sets[0],parents,identities,evidence,printings,reviews,mappings}));
}

export function assertMe05RecoveryReadback(plan,actual,{after=false}={}){
  const expected=structuredClone(plan.before);
  if(after){
    expected.set.identity_domain_default=DOMAIN;
    expected.parents.forEach(p=>{p.identity_domain=DOMAIN;});
    expected.identities=ordered(plan.identities);expected.evidence=ordered(plan.evidence);
    actual={...actual,identities:ordered(actual.identities.map(withoutTimes)),evidence:ordered(actual.evidence.map(withoutTimes))};
  }
  assert.equal(digest(actual),digest(expected),after?'post-write preservation mismatch':'frozen state drift');
}

export async function assertMe05Projections(client,plan){
  const result=await client.query(`select cp.id, public.card_print_identity_backfill_projection_v1(s.source,cp.set_code,s.code,
    cp.number,cp.number_plain,cp.name,cp.variant_key,cp.printed_total,cp.printed_set_abbrev) projection
    from public.card_prints cp join public.sets s on s.id=cp.set_id where s.id=$1 order by cp.id`,[SET_ID]);
  assert.equal(result.rows.length,120);
  for(const row of result.rows){
    const {status,taxonomy_class,...projection}=row.projection;assert.equal(status,'ready');
    const expected=plan.identities.find(i=>i.card_print_id===row.id);const {id,card_print_id,is_active,...identity}=expected;
    assert.deepEqual(projection,identity,'database identity projection drift');
  }
  const collisions=await client.query('select id from public.card_print_identity where identity_key_hash=any($1::text[]) or id=any($2::uuid[])',
    [plan.identities.map(i=>i.identity_key_hash),plan.identities.map(i=>i.id)]);
  assert.equal(collisions.rows.length,0,'existing identity collision');
}

// Caller owns transaction, maintenance authorization, receipt, and independent readback.
// SHARE locks freeze protected children and mappings. Row locks protect durable parents.
export async function applyMe05IdentityRecovery(client,plan,masterFacts){
  validateMe05RecoveryPlan(plan,masterFacts);
  await client.query('lock table public.card_print_identity, public.card_print_identity_source_evidence in share row exclusive mode');
  await client.query('lock table public.card_printings, public.card_printing_truth_reviews, public.external_mappings in share mode');
  await client.query('select id from public.sets where id=$1 for update',[SET_ID]);
  await client.query('select id from public.card_prints where set_id=$1 order by id for update',[SET_ID]);
  assertMe05RecoveryReadback(plan,await readMe05RecoveryState(client));
  await assertMe05Projections(client,plan);
  let result=await client.query('update public.sets set identity_domain_default=$1 where id=$2 and identity_domain_default=$3',[DOMAIN,SET_ID,'pokemon']);assert.equal(result.rowCount,1);
  result=await client.query('update public.card_prints set identity_domain=$1 where set_id=$2 and identity_domain=$3',[DOMAIN,SET_ID,'pokemon']);assert.equal(result.rowCount,120);
  result=await client.query(`insert into public.card_print_identity
    (id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active)
    select id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active
    from jsonb_to_recordset($1::jsonb) as r(id uuid,card_print_id uuid,identity_domain text,set_code_identity text,printed_number text,
    normalized_printed_name text,source_name_raw text,identity_payload jsonb,identity_key_version text,identity_key_hash text,is_active boolean)`,[JSON.stringify(plan.identities)]);assert.equal(result.rowCount,120);
  result=await client.query(`insert into public.card_print_identity_source_evidence
    (id,card_print_identity_id,card_print_id,acquisition_key,source_key,evidence_key_hash,evidence_subject,evidence_payload,active)
    select id,card_print_identity_id,card_print_id,acquisition_key,source_key,evidence_key_hash,evidence_subject,evidence_payload,active
    from jsonb_to_recordset($1::jsonb) as r(id uuid,card_print_identity_id uuid,card_print_id uuid,acquisition_key text,source_key text,
    evidence_key_hash text,evidence_subject jsonb,evidence_payload jsonb,active boolean)`,[JSON.stringify(plan.evidence)]);assert.equal(result.rowCount,120);
  const after=await readMe05RecoveryState(client);assertMe05RecoveryReadback(plan,after,{after:true});return after;
}
