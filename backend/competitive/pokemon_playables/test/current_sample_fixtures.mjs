import {fixture} from './fixtures.mjs';
import {sha256} from '../common.mjs';
import {createLimitlessPublishedProposal} from '../adapters/limitless_published_decklists_v1.mjs';

export function setupCurrentSampleFixture(){
  const f=fixture(),catalog=structuredClone(f.input.catalog),source={...structuredClone(f.input.sources[1]),id:'profiles',allowed_kinds:['gameplay'],allowed_origins:['https://api.tcgdex.net']};
  const make=(id,url,body)=>{const body_text=JSON.stringify(body);return{id,source_id:source.id,kind:'gameplay',url,observed_at:'2026-11-12T00:00:00.000Z',body_text,body_sha256:sha256(body_text)};};
  const numbers=['001','002','102','003'];catalog.forEach((card,i)=>Object.assign(card,{set_code:'test',number:numbers[i]}));
  catalog[3].name='Basic Grass Energy';
  const profiles=catalog.map((card,i)=>({id:`test-${numbers[i]}`,localId:numbers[i],set:{id:'test'},name:card.name,
    ...(i===0?{category:'Pokemon',hp:60,stage:'Basic',types:['Colorless'],attacks:[{name:'Synthetic attack',damage:10}]}:
      i===3?{category:'Energy',energyType:'Normal',effect:'Synthetic effect.'}:{category:'Trainer',trainerType:'Supporter',effect:'Synthetic draw.'})}));
  const receipts=profiles.map((profile,i)=>make(`profile-${i}`,`https://api.tcgdex.net/v2/en/cards/${profile.id}`,profile));
  receipts.push(make('set-test','https://api.tcgdex.net/v2/en/sets/test',{id:'test',name:'Synthetic Set',tcgOnline:'TEST',cards:profiles.map(({id,localId,name})=>({id,localId,name}))}));
  const id='000000000000000000000001',original=(key,body,url)=>{const body_text=typeof body==='string'?body:JSON.stringify(body);return{retain_until:'2026-11-20T00:00:00.000Z',receipt:{
    id:`native-${key}`,source_id:'original-native',kind:'tournament',url,observed_at:'2026-11-12T00:00:00.000Z',body_text,body_sha256:sha256(body_text)}};};
  const standings=Array.from({length:2},(_,i)=>({player:`synthetic-private-player-${i}`,decklist:{pokemon:[{set:'TEST',number:'001',name:catalog[0].name,count:4}],
    trainer:[{set:'TEST',number:'002',name:catalog[1].name,count:2},{set:'TEST',number:'102',name:catalog[2].name,count:2}],energy:[{set:'TEST',number:'003',name:catalog[3].name,count:52}]}}));
  const originals={details:original('details',{id,game:'PTCG',format:'STANDARD',isPublic:true,isOnline:false,players:2},`https://play.limitlesstcg.com/api/tournaments/${id}/details`),
    standings:original('standings',standings,`https://play.limitlesstcg.com/api/tournaments/${id}/standings`),
    standings_page:original('page','<div class="standings completed"></div>',`https://play.limitlesstcg.com/tournament/${id}/standings`)};
  const native_source={...structuredClone(f.input.sources[0]),id:'native',adapter:'pokemon_limitless_published_decklists_v1',allowed_origins:['https://play.limitlesstcg.com'],
    decklist_scope:{game:'pokemon',format:'standard',platform:'paper',region:f.input.ruleset.region,ruleset_id:f.input.ruleset.id,
      date_policy:'explicit_event_play_time_v1',source_event_ids:[id],event_keys:{[id]:'synthetic-event'}}};
  const event_context={source_event_id:id,event_key:'synthetic-event',revision:1,status:'complete',game:'pokemon',format:'standard',platform:'paper',region:f.input.ruleset.region,
    ruleset_id:f.input.ruleset.id,date_policy:'explicit_event_play_time_v1',publication_kind:'completed_event_decklists',participant_count:2,population:'full_field',played_at:'2026-11-10T12:00:00.000Z'};
  const proposal=createLimitlessPublishedProposal({event_id:id,source_id:'native',event_context,originals});
  const current_bindings={catalog,mappings:catalog.map((card,i)=>({id:`owner-${i}`,source:'tcgdex',active:true,external_id:profiles[i].id,card_print_id:card.id}))};
  const coordinates=profiles.map((profile,i)=>({set:'TEST',number:numbers[i],name:profile.name,section:i===0?'pokemon':i===3?'energy':'trainer',
    current_catalog_binding_proposed:true,card_print_id:catalog[i].id,identity_id:catalog[i].identity_id,identity_key_hash:catalog[i].identity_key_hash}));
  const sample={version:'pokemon_current_decklist_sample:v1',coordinates,retain_until:'2026-11-19T00:00:00.000Z'};
  const input={version:'pokemon_playables_input:v1',sources:[source],receipts,matching:{profile_source_id:source.id,set_receipt_ids:['set-test']}};
  const retention_bounds=Object.fromEntries(receipts.map(receipt=>[receipt.id,'2026-11-18T00:00:00.000Z']));retention_bounds[proposal.receipt.id]=proposal.receipt.retain_until;
  return{sample,input,native_source,native_proposals:[proposal],current_bindings,retention_bounds,policy:f.policy,ruleset:f.input.ruleset};
}
