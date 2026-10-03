import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {classifyEvidence} from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';

export const VERSION='POKEMON_CLASSIC_IDENTITY_EVIDENCE_V1';
export const DECKS=Object.freeze([
 {printed_code:'CLV',set_key:'classic-clv',title:'Venusaur & Lugia ex Deck',slug:'venusaur'},
 {printed_code:'CLC',set_key:'classic-clc',title:'Charizard & Ho-Oh ex Deck',slug:'charizard'},
 {printed_code:'CLB',set_key:'classic-clb',title:'Blastoise & Suicune ex Deck',slug:'blastoise'},
]);
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&(?:#0?39|apos|#8217|rsquo);/g,"'").replace(/&eacute;/g,'é').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const text=s=>decode(s.replace(/<[^>]+>/g,'')).trim();
const energy=s=>s.replace(/\{([GFRLWP])\}/g,(_,c)=>({G:'Grass',F:'Fighting',R:'Fire',L:'Lightning',W:'Water',P:'Psychic'}[c]));
export function identityNameKey(s){
 // Bounded, visible aliases in these checklists. Never strip arbitrary qualifiers.
 return energy(decode(s)).replace(/^Basic (?=(?:Grass|Fighting|Fire|Lightning|Water|Psychic) Energy$)/,'').replace(/^Boss's Orders \[Giovanni\]$/,"Boss's Orders")
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
}
function assertDeck(rows,code,{quantities=false}={}){
 assert.equal(rows.length,34,`${code}:whole34_required`);
 assert.deepEqual(rows.map(r=>r.number).sort(),Array.from({length:34},(_,i)=>String(i+1).padStart(3,'0')),`${code}:exact_coordinates_required`);
 if(quantities)assert.equal(rows.reduce((n,r)=>n+r.quantity,0),60,`${code}:physical60_required`);
}
export function parseClassicBulbapedia(html){
 const start=html.indexOf('id="English_decks"'),end=html.indexOf('id="Japanese_.26_Traditional_Chinese_decks"',start);
 assert.ok(start>=0&&end>start,'explicit_english_section_required');
 const section=html.slice(start,end),headers=[...section.matchAll(/<big><b>([\s\S]*?)<\/b><\/big>/g)];
 assert.equal(headers.length,3,'exact_three_named_decks_required');
 const seen=new Set(),rows=[];
 for(let i=0;i<headers.length;i++){
  const deck=DECKS.find(d=>d.title===text(headers[i][1]));assert.ok(deck,'unknown_english_deck');assert.ok(!seen.has(deck.printed_code),'duplicate_deck');seen.add(deck.printed_code);
  const part=section.slice(headers[i].index,headers[i+1]?.index??section.length);
  const cards=[...part.matchAll(/<tr>\s*<td[^>]*>(\d{3})\/034\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>(\d+)×\s*<\/td><\/tr>/g)].map(m=>{
   let name=text(m[2]);if(/alt="(?:ex|Pokémon ex)"|title="Pokémon ex"/.test(m[2])&&!/ ex$/.test(name))name+=' ex';
   const href=m[2].match(/href="(\/wiki\/[^"#]+)"/)?.[1];assert.ok(href,'card_article_required');
   return{deck_code:deck.printed_code,number:m[1],name,quantity:Number(m[3]),card_url:new URL(href,'https://bulbapedia.bulbagarden.net').href};
  });assertDeck(cards,deck.printed_code,{quantities:true});rows.push(...cards);
 }
 return rows;
}
export function parseClassicPkmncards(html,deck){
 const cards=[...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(a=>{
  const link=a[1].match(/<a href="([^"]+)" title="([^"]+)" class="card-image-link"/);assert.ok(link,'card_link_required');
  const title=decode(link[2]);assert.ok(title.includes(`(${deck.printed_code})`),'printed_deck_mismatch');
  const number=title.match(/#(\d{3})$/)?.[1];assert.ok(number,'printed_number_required');
  const card_url=link[1];assert.equal(new URL(card_url).hostname,'pkmncards.com');
  assert.ok(card_url.includes(`-classic-${deck.slug}-${deck.printed_code.toLowerCase()}-${number}/`),'card_url_scope_mismatch');
  return{deck_code:deck.printed_code,number,name:title.split(' · ')[0],card_url};
 });assertDeck(cards,deck.printed_code);return cards;
}
function checkedSource(s,key,host){
 assert.equal(s.key,key);assert.equal(new URL(s.url).hostname,host);assert.equal(new URL(s.final_url).hostname,host);
 assert.equal(s.status,200);assert.ok(Number.isFinite(Date.parse(s.retrieved_at)));assert.match(s.sha256,/^[a-f0-9]{64}$/);
 assert.equal(sha256(s.bytes),s.sha256,'source_bytes_hash_mismatch');return s.bytes.toString('utf8');
}
export function qualifyClassicIdentities({sources,namespace}){
 assert.equal(namespace.project,'ycdxbpibncqcchqiihfz');assert.equal(namespace.read_only,true);assert.equal(namespace.verified_tls,true);
 assert.ok(namespace.sanity.cards>=40000&&namespace.sanity.sets>=150&&namespace.sanity.traits>=5000);
 assert.equal(namespace.sets.length,namespace.sanity.sets,'complete_global_set_inventory_required');
 assert.equal(new Set(namespace.sets.map(s=>s.id)).size,namespace.sets.length,'duplicate_set_inventory');
 assert.ok(Number.isFinite(Date.parse(namespace.observed_at)));
 assert.equal(sources.length,4);assert.equal(new Set(sources.map(s=>s.key)).size,4);
 const bulb=sources.find(s=>s.key==='bulbapedia');assert.ok(bulb);
 const bRows=parseClassicBulbapedia(checkedSource(bulb,'bulbapedia','bulbapedia.bulbagarden.net'));
 const records=[],joins=[],sets=[];
 for(const deck of DECKS){
  assert.equal(namespace.sets.filter(s=>s.code.toLowerCase()===deck.set_key).length,0,`canonical_code_occupied:${deck.set_key}`);
  const key='pkmncards-'+deck.printed_code.toLowerCase(),p=sources.find(s=>s.key===key);assert.ok(p);
  const pRows=parseClassicPkmncards(checkedSource(p,key,'pkmncards.com'),deck);
  const set_name='Pokémon Trading Card Game Classic: '+deck.title;
  for(const card of pRows){
   const b=bRows.find(r=>r.deck_code===deck.printed_code&&r.number===card.number);assert.ok(b);
   assert.equal(identityNameKey(b.name),identityNameKey(card.name),`independent_identity_conflict:${deck.printed_code}:${card.number}`);
   const card_name=energy(card.name);
   for(const [source,row,kind,source_key]of [[p,card,'collector_reference','pkmncards'],[bulb,b,'human_readable_checklist','bulbapedia_set_list']]){
    records.push({source_key,source_kind:kind,source_url:row.card_url,set_key:deck.set_key,set_name,card_number:card.number,card_name,
     source_card_name:row.name,printed_deck_code:deck.printed_code,printed_total:'034',finish_key:null,rarity:null,evidence_type:'card_identity',
     evidence_label:`English ${deck.printed_code} ${card.number}/034 ${row.name}`,language:'en',retrieved_at:source.retrieved_at,
     raw_snapshot_ref:`source_snapshots/${source.key}.html.gz#sha256=${source.sha256}`,raw_snapshot_sha256:source.sha256,
     notes:'Exact English deck checklist identity only; no finish or production admission authority.'});
   }
   joins.push({deck_code:deck.printed_code,set_key:deck.set_key,number:card.number,printed_total:'034',card_name,pkmncards_name:card.name,bulbapedia_name:b.name,quantity:b.quantity});
  }
  sets.push({...deck,set_name,expected_parents:34,physical_deck_cards:60,identity_status:'source_agreed_card_identity',completion_status:'card_identity_complete_finish_incomplete',finish_reviews_approved:0,
   original_code_owners:namespace.sets.filter(s=>s.code.toLowerCase()===deck.printed_code.toLowerCase()).map(s=>({id:s.id,game:s.game,code:s.code,name:s.name}))});
 }
 const classified=classifyEvidence(records);
 assert.equal(classified.cards.length,102);assert.ok(classified.cards.every(c=>c.status==='master_verified'&&c.source_count===2));
 assert.equal(classified.printings.length,0);assert.equal(classified.conflicts.length,0);assert.equal(classified.manual_review.length,0);
 const body={version:VERSION,policy:'exact_english_classic_two_independent_checklists_identity_only_v1',review_actor:'automated source qualification; no human signature',
  write_ready:false,production_writes:0,active_master_changed:false,completion_status:'card_identity_complete_finish_incomplete',namespace_observed_at:namespace.observed_at,
  namespace_sha256:sha256(JSON.stringify(namespace)),sets,records,joins,cards:classified.cards,printings:[],finish_reviews_approved:0,
  blockers:['Exact English card-level finish qualification and three printing truth manifests remain required.','Guarded Master staging, non-regression and completion exports are required before active Master integration.','Fresh governed canonical/set/mapping package, local SQL qualification, normal hooks and immutable apply/readback are required.'],
  sources:sources.map(({bytes,file,...s})=>s)};
 return {...body,fingerprint:sha256(JSON.stringify(body))};
}
