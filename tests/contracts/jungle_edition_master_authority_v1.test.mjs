import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,randomUUID} from 'node:crypto';
import {printingManifestHash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {assertJungleEditionMasterV1 as validate} from '../../backend/catalog/jungle_edition_master_authority_v1.mjs';
const root=new URL('../../docs/catalog/master_printing_authority_v1/jungle_editions/',import.meta.url);
const frozen=JSON.parse(fs.readFileSync(new URL('manifest.json',root))),master=fs.readFileSync(new URL('master.json',root));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=x=>Buffer.from(JSON.stringify(x));
const asOf='2026-10-01T18:00:00Z';
// Synthetic raw evidence here exercises the guard; real-source validation has its
// separate private receipt. Never treat these fixtures as source authority.
function fixture(){
 const manifest=structuredClone(frozen),artifacts=new Map();
 for(const s of manifest.authority.source_artifacts)artifacts.set(s.ref,bytes({synthetic_fixture:true,ref:s.ref}));
 artifacts.set(manifest.master_index_ref,master);
 const cards=[],pokemon=[],species=[],allocation=[];
 for(let n=1;n<=64;n++){
  const number=String(n),parents=manifest.parents.filter(p=>p.printed_coordinate===number),first=parents[0],facts=JSON.parse(String(master)).facts.find(f=>f.number===number),dex=facts.national_dex_numbers;
  cards.push({id:first.legacy_card_print_id,set_id:manifest.authority.set_id,set_code:'base2',identity_domain:'pokemon_eng_standard',set_identity_model:'standard',name:first.name,number,number_plain:number,variant_key:'',printed_identity_modifier:null});
  const raw={id:'base2-'+number,localId:number,set:{id:'base2',cardCount:{official:64}},name:first.name,category:n===64?'Trainer':'Pokemon',dexId:dex,variants_detailed:parents.map(p=>{const c=manifest.printings.find(c=>c.card_print_id===p.id);return{type:c.finish_key,size:'standard',stamp:p.printed_identity_modifier==='edition:first_edition'?['1st-edition']:[],variantId:c.source_variant_id}})};
  artifacts.set('tcgdex:base2-'+number,bytes(raw));pokemon.push({id:raw.id,number,name:first.name,supertype:n===64?'Trainer':'Pokémon',nationalPokedexNumbers:dex});
  for(const p of parents){const c=manifest.printings.find(c=>c.card_print_id===p.id);allocation.push({number,edition:p.printed_identity_modifier.slice(8),card_print_id:p.id,card_printing_id:c.id,gv_id:p.gv_id,printing_gv_id:c.printing_gv_id,legacy_card_print_id:p.legacy_card_print_id});}
 }
 for(const id of manifest.jungle_transition.excluded_special_parent_ids)cards.push({id,variant_key:'synthetic-special',printed_identity_modifier:'synthetic-special'});
 for(const m of manifest.species_memberships)if(!species.some(s=>s.id===m.species_id))species.push({id:m.species_id,national_dex_number:m.national_dex_number,is_form:false,active:true});
 artifacts.set('pokemon-tcg-data:base2',bytes(pokemon));artifacts.set('jungle:proposed-ids',bytes({rows:allocation,databaseRowsCreated:0}));
 artifacts.set('jungle:production-snapshot',bytes({at:asOf,project_ref:'ycdxbpibncqcchqiihfz',read_only:true,tls_verified:true,setId:manifest.authority.set_id,sanity:{cards:40000,sets:150,traits:5000},allocationSha256:hash(artifacts.get('jungle:proposed-ids')),cards,printings:manifest.jungle_transition.preserved_child_ids.map(id=>({id})),collisions:{parents:[],children:[]},species}));
 const f={manifest,artifacts};seal(f);return f;
}
function changeArtifact(f,ref,fn){const x=JSON.parse(String(f.artifacts.get(ref)));fn(x);f.artifacts.set(ref,bytes(x));}
function seal({manifest:m,artifacts:a}){
 for(const s of m.authority.source_artifacts)s.sha256=hash(a.get(s.ref));
 for(const c of m.printings)for(const e of c.evidence)e.sha256=hash(a.get(e.source_ref));
 for(const p of m.jungle_transition.preparation_inputs)p.sha256=hash(a.get(p.ref));
 m.master_index_sha256=hash(a.get(m.master_index_ref));
 const projection=structuredClone(m);delete projection.fingerprint;delete projection.authority.review;
 const review={status:'verified_scope',master_index_sha256:m.master_index_sha256,game:m.game,language:m.language,set_code:m.set_code,scope:m.scope,reviewer:'synthetic test fixture only',reviewed_at:asOf,projection_sha256:printingManifestHash(projection)};
 a.set(m.authority.review.ref,bytes(review));m.authority.review.sha256=hash(a.get(m.authority.review.ref));delete m.fingerprint;m.fingerprint=printingManifestHash(m);
}
test('complete preparation keeps two editions,126 memberships and all legacy identities',()=>{const f=fixture();assert.deepEqual(validate(f.manifest,f.artifacts,{asOf}),{status:'verified_preparation',parents:128,printings:128,speciesMemberships:126,distinctSpecies:47,existingParentsPreserved:83,existingChildrenPreserved:84,execution_authorized:false,productionWrites:0});});
const cases=[
 ['wrong species despite a recomputed envelope',f=>f.manifest.species_memberships[0].national_dex_number=999],
 ['species copied from another parent',f=>f.manifest.species_memberships[0].species_id=randomUUID()],
 ['legacy membership used as evidence',f=>f.manifest.species_memberships[0].evidence_refs=['legacy:mapping']],
 ['Trainer membership',f=>{const p=f.manifest.parents.find(p=>p.printed_coordinate==='64');f.manifest.species_memberships.push({...f.manifest.species_memberships[0],card_print_id:p.id})}],
 ['species providers disagree',f=>changeArtifact(f,'tcgdex:base2-1',x=>x.dexId=[999])],
 ['male Nidoran substituted',f=>changeArtifact(f,'tcgdex:base2-57',x=>x.name='Nidoran♂')],
 ['duplicate exact provider variant',f=>changeArtifact(f,'tcgdex:base2-1',x=>x.variants_detailed.push(x.variants_detailed[0]))],
 ['special variant admitted as ordinary',f=>changeArtifact(f,'tcgdex:base2-1',x=>x.variants_detailed[0].subtype='missing-expansion-symbol')],
 ['price keys substituted for detailed finish',f=>changeArtifact(f,'tcgdex:base2-1',x=>{x.pricing={holo:10};x.variants_detailed=[]})],
 ['edition inferred from another stamp',f=>changeArtifact(f,'tcgdex:base2-1',x=>x.variants_detailed[0].stamp=['pre-release'])],
 ['source card reference mixed across cards',f=>f.manifest.printings[0].source_card_id='base2-2'],
 ['legacy image cloned',f=>f.manifest.parents[0].image_url='https://example.invalid/legacy.png'],
 ['provider ID cloned',f=>f.manifest.parents[0].external_ids={tcgplayer:'45120'}],
 ['ownership automatically reassigned',f=>f.manifest.jungle_transition.auto_reassign_owned_copies=true],
 ['execution authority manufactured',f=>f.manifest.jungle_transition.execution_authorized=true],
 ['executable deltas inserted',f=>f.manifest.jungle_transition.executable_deltas=[{insert:'card_prints'}]],
 ['legacy preservation removed',f=>f.manifest.jungle_transition.preserved_parent_ids.pop()],
 ['global collision present',f=>changeArtifact(f,'jungle:production-snapshot',x=>x.collisions.parents.push({id:f.manifest.parents[0].id}))],
 ['wrong source project',f=>changeArtifact(f,'jungle:production-snapshot',x=>x.project_ref='other')],
 ['legacy identity domain changed',f=>changeArtifact(f,'jungle:production-snapshot',x=>x.cards[0].identity_domain='pokemon_jpn')],
 ['read-write source capture',f=>changeArtifact(f,'jungle:production-snapshot',x=>x.read_only=false)],
 ['future source capture',f=>changeArtifact(f,'jungle:production-snapshot',x=>x.at='2026-10-02T18:00:00Z')],
 ['stale source capture',f=>changeArtifact(f,'jungle:production-snapshot',x=>x.at='2026-09-29T18:00:00Z')],
 ['artwork exception removed',f=>f.manifest.jungle_transition.protected_exceptions=f.manifest.jungle_transition.protected_exceptions.filter(x=>x.key!=='electrode_18_edition_specific_artwork')],
];
for(const [name,mutate]of cases)test('holds '+name,()=>{const f=fixture();mutate(f);seal(f);assert.throws(()=>validate(f.manifest,f.artifacts,{asOf}));});
test('raw evidence changes fail before semantic review',()=>{const f=fixture();f.artifacts.set('tcgdex:base2-1',bytes({changed:true}));assert.throws(()=>validate(f.manifest,f.artifacts,{asOf}),/artifact_hash_mismatch/);});
