// Offline preparation guard. It neither connects to a database nor grants apply authority.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertMasterPrintingAuthority} from './master_index_printing_authority_v1.mjs';
export const JUNGLE_EDITION_MASTER_V1='JUNGLE_EDITION_MASTER_V1';
const SET='9fe66ee9-9d5b-4aca-9f86-f3afe913eee7';
const sha=b=>createHash('sha256').update(b).digest('hex');
const sameName=(a,b,n)=>a===b||(n==='57'&&new Set([a,b]).size===2&&[a,b].every(v=>['Nidoran♀','Nidoran ♀'].includes(v)));
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
export function assertJungleEditionMasterV1(manifest,artifacts,{asOf}={}){
 assertMasterPrintingAuthority(manifest,artifacts);
 assert.equal(manifest.set_code,'base2');assert.equal(manifest.authority.set_id,SET);
 assert.equal(manifest.scope,'base_release');assert.equal(manifest.game,'pokemon');assert.equal(manifest.language,'en');
 assert.deepEqual(manifest.expected,{parents:128,printings:128,finishes:{holo:32,normal:96}});
 const transition=manifest.jungle_transition;assert.equal(transition?.version,JUNGLE_EDITION_MASTER_V1);
 assert.equal(transition.execution_authorized,false);assert.equal(transition.write_ready,false);
 assert.deepEqual(transition.executable_deltas,[]);assert.equal(transition.auto_reassign_owned_copies,false);
 const input=ref=>{const record=transition.preparation_inputs.find(r=>r.ref===ref);assert.ok(record);const b=artifacts.get(ref);assert.ok(b);assert.equal(sha(b),record.sha256);return JSON.parse(String(b));};
 const snapshot=input('jungle:production-snapshot'),allocation=input('jungle:proposed-ids');
 assert.equal(snapshot.project_ref,'ycdxbpibncqcchqiihfz');assert.equal(snapshot.read_only,true);assert.equal(snapshot.tls_verified,true);assert.equal(snapshot.setId,SET);
 assert.ok(snapshot.sanity.cards>=40000&&snapshot.sanity.sets>=150&&snapshot.sanity.traits>=5000);
 const age=Date.parse(asOf)-Date.parse(snapshot.at);assert.ok(Number.isFinite(age)&&age>=0&&age<=86400000,'snapshot_stale_or_future');
 assert.equal(snapshot.allocationSha256,sha(artifacts.get('jungle:proposed-ids')));
 assert.deepEqual(snapshot.collisions,{parents:[],children:[]});assert.equal(snapshot.cards.length,83);assert.equal(snapshot.printings.length,84);
 assert.deepEqual(transition.preserved_parent_ids,[...snapshot.cards.map(c=>c.id)].sort());assert.deepEqual(transition.preserved_child_ids,[...snapshot.printings.map(c=>c.id)].sort());
 assert.equal(allocation.rows.length,128);assert.equal(allocation.databaseRowsCreated,0);
 const assigned=new Map(allocation.rows.map(r=>[r.card_print_id,r]));assert.equal(assigned.size,128);
 const pokemon=JSON.parse(String(artifacts.get('pokemon-tcg-data:base2')));assert.equal(pokemon.length,64);
 const master=JSON.parse(String(artifacts.get(manifest.master_index_ref)));assert.equal(master.version,JUNGLE_EDITION_MASTER_V1);assert.equal(master.facts.length,128);
 const keys=new Set(),allIds=new Set(),sourceVariants=new Set();let speciesCount=0;
 for(const parent of manifest.parents){
  assert.match(parent.id,uuid);assert.equal(parent.set_id,SET);assert.equal(parent.variant_key,'');assert.equal(parent.identity_domain,'pokemon_eng_standard');
  const number=parent.printed_coordinate,edition=parent.printed_identity_modifier?.slice(8);
  assert.ok(['first_edition','unlimited'].includes(edition));assert.match(number,/^(?:[1-9]|[1-5][0-9]|6[0-4])$/);
  assert.equal(parent.printed_identity_modifier,`edition:${edition}`);
  const key=`${number}:${edition}`;assert.ok(!keys.has(key));keys.add(key);
  assert.equal(parent.gv_id,`GV-PK-JU-${number}-${edition==='first_edition'?'FIRST-EDITION':'UNLIMITED'}`);
  const ids=assigned.get(parent.id);assert.ok(ids);assert.equal(ids.gv_id,parent.gv_id);assert.equal(ids.number,number);assert.equal(ids.edition,edition);
  const legacy=snapshot.cards.find(c=>c.id===parent.legacy_card_print_id);assert.ok(legacy);assert.equal(ids.legacy_card_print_id,legacy.id);assert.equal(legacy.variant_key,'');assert.equal(legacy.printed_identity_modifier,null);assert.equal(legacy.number,number);assert.equal(legacy.number_plain,number);assert.equal(legacy.name,parent.name);
  assert.equal(legacy.set_id,SET);assert.equal(legacy.set_code,'base2');assert.equal(legacy.identity_domain,'pokemon_eng_standard');assert.equal(legacy.set_identity_model,'standard');
  const child=manifest.printings.filter(p=>p.card_print_id===parent.id);assert.equal(child.length,1);const printing=child[0];assert.match(printing.id,uuid);assert.equal(printing.id,ids.card_printing_id);assert.equal(printing.printing_gv_id,ids.printing_gv_id);
  assert.ok(!snapshot.cards.some(c=>c.id===parent.id));assert.ok(!snapshot.printings.some(c=>c.id===printing.id));
  for(const id of [parent.id,printing.id]){assert.ok(!allIds.has(id));allIds.add(id);}
  const ref='tcgdex:base2-'+number,raw=JSON.parse(String(artifacts.get(ref))),pk=pokemon.find(c=>c.id==='base2-'+number);
  assert.equal(raw.id,'base2-'+number);assert.equal(raw.localId,number);assert.equal(raw.set.id,'base2');assert.equal(raw.set.cardCount.official,64);assert.ok(pk);assert.equal(pk.number,number);assert.ok(sameName(raw.name,parent.name,number)&&sameName(pk.name,parent.name,number),'source_name_conflict');
  const variants=raw.variants_detailed.filter(v=>v.size==='standard'&&!v.subtype&&JSON.stringify(v.stamp??[])===JSON.stringify(edition==='first_edition'?['1st-edition']:[]));assert.equal(variants.length,1,'ambiguous_structured_variant');
  const variant=variants[0];assert.ok(['normal','holo'].includes(variant.type));assert.equal(printing.finish_key,variant.type);assert.equal(printing.finish_key,Number(number)<=16?'holo':'normal','locked_profile_conflict');
  assert.equal(printing.printing_gv_id,`${parent.gv_id}-${printing.finish_key.toUpperCase()}`);
  // Provider variantId repeats across cards. Only the card + descriptor tuple is unique.
  const variantKey=`${raw.id}:${variant.variantId}`;assert.ok(!sourceVariants.has(variantKey));sourceVariants.add(variantKey);
  assert.equal(printing.source_card_id,raw.id);assert.equal(printing.source_variant_id,variant.variantId);
  assert.ok(printing.evidence.some(e=>e.source_ref===ref));assert.ok(printing.evidence.some(e=>e.source_ref==='psa:jungle-chart'));
  const fact=master.facts.find(f=>f.number===number&&f.edition===edition);assert.ok(fact);assert.equal(fact.name,parent.name);assert.equal(fact.finish_key,printing.finish_key);
  const members=manifest.species_memberships.filter(m=>m.card_print_id===parent.id);
  if(raw.category==='Pokemon'){
   assert.equal(pk.supertype,'Pokémon');assert.deepEqual(raw.dexId,pk.nationalPokedexNumbers);assert.equal(raw.dexId.length,1);assert.equal(members.length,1);
   const member=members[0],species=snapshot.species.filter(s=>s.national_dex_number===raw.dexId[0]&&!s.is_form&&s.active);assert.equal(species.length,1);assert.equal(member.species_id,species[0].id);assert.equal(member.national_dex_number,raw.dexId[0]);assert.equal(member.role,'primary');assert.equal(member.counts_for_completion,true);assert.deepEqual(member.evidence_refs,[ref,'pokemon-tcg-data:base2']);speciesCount++;
  }else{assert.equal(number,'64');assert.equal(raw.category,'Trainer');assert.equal(pk.supertype,'Trainer');assert.deepEqual(raw.dexId??[],[]);assert.deepEqual(pk.nationalPokedexNumbers??[],[]);assert.equal(members.length,0);}
  assert.equal(parent.image_url,null);assert.equal(parent.image_path,null);assert.deepEqual(parent.external_ids,{});assert.equal(parent.image_status,'missing');
 }
 assert.equal(keys.size,128);assert.equal(allIds.size,256);assert.equal(speciesCount,126);assert.equal(manifest.species_memberships.length,126);
 assert.deepEqual(transition.excluded_special_parent_ids,snapshot.cards.filter(c=>c.variant_key!==''||c.printed_identity_modifier!==null).map(c=>c.id).sort());
 assert.equal(transition.excluded_special_parent_ids.length,19);
 assert.ok(transition.protected_exceptions.some(e=>e.key==='electrode_18_edition_specific_artwork'));
 assert.ok(transition.protected_exceptions.some(e=>e.key==='nidoran_female_57'));
 return {status:'verified_preparation',parents:128,printings:128,speciesMemberships:126,distinctSpecies:new Set(manifest.species_memberships.map(m=>m.species_id)).size,existingParentsPreserved:83,existingChildrenPreserved:84,execution_authorized:false,productionWrites:0};
}
