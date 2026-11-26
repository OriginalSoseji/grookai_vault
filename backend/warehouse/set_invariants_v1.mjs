import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';

export const WAREHOUSE_SET_INVARIANTS_V1='WAREHOUSE_SET_INVARIANTS_V1';
const rows=async(client,sql,args)=>(await client.query(sql,args)).rows;
const digestSql=`count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by t.id),'')) digest`;

async function snapshot(client,scope) {
  const mappingIds=[...scope.new_parent_mapping_ids,...(scope.parent_mapping_updates??[]).map(m=>m.id)];
  const args=[scope.set_id,scope.new_parent_ids,scope.new_printing_ids,scope.new_identity_ids,scope.new_review_ids,mappingIds];
  const parentIds=`select id from public.card_prints where set_id=$1`;
  const childIds=`select id from public.card_printings where card_print_id in (${parentIds})`;
  const counts=(await rows(client,`select
    (select count(*)::int from public.card_prints where set_id=$1) parents,
    (select count(*)::int from public.card_printings where card_print_id in (${parentIds})) printings,
    (select count(*)::int from (select card_print_id,finish_key from public.card_printings
      where card_print_id in (${parentIds}) group by 1,2 having count(*)>1)d) duplicate_identities`,[scope.set_id]))[0];
  const finishes=Object.fromEntries((await rows(client,`select finish_key,count(*)::int n from public.card_printings
    where card_print_id in (${parentIds}) group by finish_key order by finish_key`,[scope.set_id])).map(r=>[r.finish_key,r.n]));
  const protectedRows={};
  for(const [table,predicate]of [
    ['card_prints',`set_id=$1 and not(id=any($2::uuid[]))`],
    ['card_printings',`card_print_id in (${parentIds}) and not(id=any($3::uuid[]))`],
    ['card_print_identity',`card_print_id in (${parentIds}) and not(id=any($4::uuid[]))`],
    ['card_printing_truth_reviews',`card_printing_id in (${childIds}) and not(id=any($5::uuid[]))`],
    ['external_mappings',`card_print_id in (${parentIds}) and not(id=any($6::bigint[]))`],
    ['external_printing_mappings',`card_printing_id in (${childIds})`],
    ['vault_item_instances',`card_print_id in (${parentIds})`],
    ['vault_item_instance_dispositions',`card_print_id in (${parentIds})`],
    ['binder_custom_slots',`card_printing_id in (${childIds})`],
  ]) {
    // Passing all typed parameters keeps each query bounded to this exact set;
    // unused parameters are declared by the materialized parameter frame.
    protectedRows[table]=(await rows(client,`with frame as(select $1::uuid s,$2::uuid[] p,$3::uuid[] c,$4::uuid[] i,$5::uuid[] r,$6::bigint[] m)
      select ${digestSql} from public.${table} t where ${predicate}`,args))[0];
  }
  const violations=scope.negative_facts.length?(await rows(client,`select p.id from public.card_printings p
    join jsonb_to_recordset($1::jsonb) f(card_print_id uuid,finish_key text)
    on p.card_print_id=f.card_print_id and p.finish_key=f.finish_key`,[JSON.stringify(scope.negative_facts)])):[];
  assert.equal(violations.length,0,'warehouse_suppressed_or_forbidden_printing_present');
  assert.equal(counts.duplicate_identities,0,'warehouse_duplicate_exact_printing_identity');
  return {counts:{parents:counts.parents,printings:counts.printings,finishes},protected_rows:protectedRows,
    duplicate_identities:0,negative_fact_violations:0};
}

export async function prepareWarehouseSetInvariantsV1(client,executions,{parentMappingAdditions=[]}={}) {
  const scopes=new Map();
  for(const execution of executions) {
    const mutation=execution.mutation;
    if(!['insert_card_print','reviewed_printing_admission'].includes(mutation.type))continue;
    const admission=mutation.admission,registry=mutation.parent_registry_admission;
    const setId=registry?.target.set_id??admission?.parent.set_id;
    assert.ok(setId,'warehouse_mutation_set_scope_required');
    if(!scopes.has(setId))scopes.set(setId,{set_id:setId,new_parent_ids:[],new_printing_ids:[],new_identity_ids:[],new_review_ids:[],
      new_parent_mapping_ids:parentMappingAdditions.filter(m=>m.set_id===setId).map(m=>m.id).sort(),
      negative_facts:[],manifest_fingerprints:[],parent_delta:0,printing_delta:0,finish_deltas:{}});
    const scope=scopes.get(setId);
    if(registry) {
      scope.new_parent_ids.push(registry.planned_parent_id);scope.new_identity_ids.push(registry.planned_identity_id);scope.parent_delta++;
    } else if(admission) {
      const manifest=admission.bundle.manifest;
      assert.equal(manifest.authority.conflicts.length,0,'warehouse_unresolved_source_conflict');
      scope.manifest_fingerprints.push(manifest.fingerprint);
      scope.negative_facts.push(...manifest.authority.forbidden_facts,...manifest.suppressed_printing_facts);
      if(!admission.existing) {
        scope.new_printing_ids.push(admission.expected.child.id);scope.new_review_ids.push(admission.expected.review.id);
        scope.printing_delta++;const finish=admission.target.finish_key;
        scope.finish_deltas[finish]=(scope.finish_deltas[finish]??0)+1;
      }
    }
  }
  const profiles=[];
  for(const scope of [...scopes.values()].sort((a,b)=>a.set_id.localeCompare(b.set_id))) {
    for(const key of ['new_parent_ids','new_printing_ids','new_identity_ids','new_review_ids','manifest_fingerprints'])
      scope[key]=[...new Set(scope[key])].sort();
    scope.negative_facts=[...new Map(scope.negative_facts.map(f=>[hash(f),f])).entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,f])=>f);
    const before=await snapshot(client,scope),afterCounts=structuredClone(before.counts);
    afterCounts.parents+=scope.parent_delta;afterCounts.printings+=scope.printing_delta;
    for(const [finish,n]of Object.entries(scope.finish_deltas))afterCounts.finishes[finish]=(afterCounts.finishes[finish]??0)+n;
    const body={version:WAREHOUSE_SET_INVARIANTS_V1,scope,before,expected_after_counts:afterCounts};
    profiles.push({...body,fingerprint:hash(body)});
  }
  return profiles;
}

export async function assertWarehouseSetInvariantsV1(client,profiles,{after=false}={}) {
  for(const profile of profiles) {
    const {fingerprint,...body}=profile;assert.equal(hash(body),fingerprint,'warehouse_set_profile_changed');
    assert.equal(profile.version,WAREHOUSE_SET_INVARIANTS_V1);
    const actual=await snapshot(client,profile.scope);
    assert.deepEqual(actual.protected_rows,profile.before.protected_rows,'warehouse_existing_set_rows_or_references_changed');
    assert.deepEqual(actual.counts,after?profile.expected_after_counts:profile.before.counts,'warehouse_exact_set_counts_changed');
    const inserts=profile.scope.parent_mapping_inserts??[],updates=profile.scope.parent_mapping_updates??[];
    if(inserts.length||updates.length){
      const allowed=[...inserts,...updates],observed=(await rows(client,`select (to_jsonb(t)-'id')||jsonb_build_object('id',t.id::text) row
        from public.external_mappings t where id=any($1::bigint[])order by id`,[allowed.map(m=>m.id)])).map(r=>r.row);
      assert.equal(observed.length,after?allowed.length:updates.length,'warehouse_authorized_mapping_count_changed');
      for(const update of updates){const row=observed.find(r=>r.id===update.id);assert.ok(row);
        assert.equal(hash(row),after?update.after_sha256:update.before_sha256,'warehouse_authorized_mapping_row_changed');}
      for(const insert of inserts){const row=observed.find(r=>r.id===insert.id);
        if(after){assert.ok(row);assert.equal(hash(row),insert.after_sha256,'warehouse_authorized_mapping_insert_changed');}
        else assert.equal(row,undefined,'warehouse_authorized_mapping_insert_collision');}
    }
  }
  return {sets:profiles.length,exact:true,protected_rows_preserved:true};
}

// A review of an already existing child changes no parent/printing/finish count.
// Explicit mapping deltas are excluded from retained-row digests only when their
// complete before/after hashes are separately asserted above.
export async function prepareWarehouseExistingReviewSetInvariantsV1(client,{targets,manifests,mappingMutations=[]}) {
  const scopes=new Map();
  for(const target of targets){const setId=target.parent.set_id,manifest=manifests.get(target.set_code);assert.ok(setId&&manifest);
    assert.equal(manifest.authority.conflicts.length,0,'warehouse_unresolved_source_conflict');
    if(!scopes.has(setId))scopes.set(setId,{set_id:setId,new_parent_ids:[],new_printing_ids:[],new_identity_ids:[],
      new_review_ids:[],new_parent_mapping_ids:[],parent_mapping_inserts:[],parent_mapping_updates:[],negative_facts:[],manifest_fingerprints:[]});
    const scope=scopes.get(setId);scope.new_review_ids.push(target.review.id);scope.manifest_fingerprints.push(manifest.fingerprint);
    scope.negative_facts.push(...manifest.authority.forbidden_facts,...manifest.suppressed_printing_facts);
  }
  assert.equal(new Set(mappingMutations.map(m=>m.after.id)).size,mappingMutations.length,'warehouse_mapping_delta_duplicate');
  for(const mutation of mappingMutations){assert.ok(['insert','update'].includes(mutation.type));
    const target=targets.find(t=>t.parent.id===mutation.after.card_print_id);assert.ok(target,'warehouse_mapping_owner_outside_review_scope');
    const scope=scopes.get(target.parent.set_id),id=String(mutation.after.id);assert.match(id,/^-?\d+$/);
    assert.equal(mutation.after.source,'tcgplayer');
    if(mutation.type==='insert'){assert.equal(mutation.before,null);scope.new_parent_mapping_ids.push(id);
      scope.parent_mapping_inserts.push({id,after_sha256:hash(mutation.after)});}
    else{assert.equal(String(mutation.before.id),id);for(const key of['card_print_id','source','active'])
        assert.deepEqual(mutation.before[key],mutation.after[key],'warehouse_mapping_protected_field_changed:'+key);
      scope.parent_mapping_updates.push({id,before_sha256:hash(mutation.before),after_sha256:hash(mutation.after)});}
  }
  const profiles=[];
  for(const scope of [...scopes.values()].sort((a,b)=>a.set_id.localeCompare(b.set_id))){
    for(const key of['new_review_ids','new_parent_mapping_ids','manifest_fingerprints'])scope[key]=[...new Set(scope[key])].sort();
    scope.negative_facts=[...new Map(scope.negative_facts.map(f=>[hash(f),f])).entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,f])=>f);
    scope.parent_mapping_inserts.sort((a,b)=>a.id.localeCompare(b.id));scope.parent_mapping_updates.sort((a,b)=>a.id.localeCompare(b.id));
    const before=await snapshot(client,scope),body={version:WAREHOUSE_SET_INVARIANTS_V1,scope,before,expected_after_counts:structuredClone(before.counts)};
    profiles.push({...body,fingerprint:hash(body)});
  }
  return profiles;
}
