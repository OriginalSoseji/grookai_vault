import {createHash} from 'node:crypto';
import {printingManifestHash, PRINTING_COMPLETENESS_VERSION} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {MASTER_PRINTING_AUTHORITY_VERSION} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
const digest = value => createHash('sha256').update(value).digest('hex');
export const seal = value => {const {fingerprint, ...body}=value; return {...body,fingerprint:printingManifestHash(body)};};
export function fixture({otherParentNegativeFact=null}={}) {
  const parent = {id:'11111111-1111-4111-8111-111111111111',set_id:'22222222-2222-4222-8222-222222222222',
    gv_id:'GV-PK-TEST-1',name:'Fixture',printed_coordinate:'1',identity_domain:'pokemon_eng_standard',
    variant_key:'',printed_identity_modifier:null};
  const source = Buffer.from('Synthetic source bytes for a unit test, not real printing evidence.');
  const master = Buffer.from('Synthetic Master Index fixture.');
  const manifest = {version:PRINTING_COMPLETENESS_VERSION,game:'pokemon',language:'en',set_code:'test',
    scope:'base_release',identity_policy_version:'POKEMON_EN_PHYSICAL_V1',
    master_index_ref:'master',master_index_sha256:digest(master),parents:[parent],
    printings:[{card_print_id:parent.id,finish_key:'holo',printing_gv_id:parent.gv_id+'-HOLO',review_status:'verified',
      evidence:[{kind:'checked_checklist',source_ref:'source',sha256:digest(source),card_print_id:parent.id,finish_key:'holo'}]}],
    unresolved_variants:[],suppressed_printing_facts:[],expected:{parents:1,printings:1,finishes:{holo:1}},
    authority:{version:MASTER_PRINTING_AUTHORITY_VERSION,status:'verified_scope',set_id:parent.set_id,
      source_artifacts:[{ref:'source',sha256:digest(source),kind:'checked_checklist',
        url_or_identifier:'unit-test-only',retrieved_at:'2026-09-17T00:00:00Z'}],
      protected_facts:[],forbidden_facts:[],conflicts:[]}};
  if (otherParentNegativeFact) {
    if (!['forbidden','suppressed'].includes(otherParentNegativeFact)) throw new Error('unknown fixture negative fact');
    const other={...parent,id:'66666666-6666-4666-8666-666666666666',gv_id:'GV-PK-TEST-2',name:'Other fixture',printed_coordinate:'2'};
    manifest.parents.push(other);
    manifest.printings.push({...manifest.printings[0],card_print_id:other.id,printing_gv_id:other.gv_id+'-HOLO',
      evidence:manifest.printings[0].evidence.map(e=>({...e,card_print_id:other.id}))});
    manifest.expected={parents:2,printings:2,finishes:{holo:2}};
    const negative={card_print_id:other.id,finish_key:'normal',reason:'Synthetic negative fact'};
    if (otherParentNegativeFact==='forbidden') manifest.authority.forbidden_facts.push(negative);
    else manifest.suppressed_printing_facts.push(negative);
  }
  const review = Buffer.from(JSON.stringify({status:'verified_scope',master_index_sha256:digest(master),
    game:manifest.game,language:manifest.language,set_code:manifest.set_code,scope:manifest.scope,
    reviewer:'unit-test-only',reviewed_at:'2026-09-17T00:00:00Z',projection_sha256:printingManifestHash(manifest)}));
  manifest.authority.review={ref:'review',sha256:digest(review)};
  const artifacts=new Map([['source',source],['master',master],['review',review]]);
  const target={candidate_id:'33333333-3333-4333-8333-333333333333',card_print_id:parent.id,
    finish_key:'holo',printing_gv_id:parent.gv_id+'-HOLO'};
  return {manifest:seal(manifest),artifacts,target,
    parent:{...parent,game:manifest.game,language:manifest.language,set_code:manifest.set_code}};
}
