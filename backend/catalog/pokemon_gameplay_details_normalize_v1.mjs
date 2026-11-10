// Typed source normalization only. No database, identity or printing writer.
export const POKEMON_GAMEPLAY_DETAILS_VERSION_V1='pokemon_gameplay_details:v1';
export const GAMEPLAY_ENERGY_TYPES_V1=Object.freeze(['Grass','Fire','Water','Lightning','Psychic','Fighting','Darkness','Metal','Colorless','Dragon','Fairy']);
const own=(o,k)=>Object.hasOwn(o,k),text=v=>{
 if(v===null||v===undefined||v==='')return null;if(typeof v!=='string')throw Error('GAMEPLAY_TEXT_TYPE');const s=v.normalize('NFC').trim();return s||null;
};
function arrayField(o,k,normalize){if(!own(o,k)||o[k]===null)return null;if(!Array.isArray(o[k]))throw Error('GAMEPLAY_ARRAY_TYPE:'+k);if(o[k].length>64)throw Error('GAMEPLAY_ARRAY_SCOPE:'+k);return o[k].map(normalize);}
function energy(value){const v=typeof value==='string'?value.trim():value;if(!GAMEPLAY_ENERGY_TYPES_V1.includes(v))throw Error('GAMEPLAY_ENERGY_VOCABULARY');return v;}
function costField(o,k){const cost=arrayField(o,k,energy);if(cost&&cost.length>20)throw Error('GAMEPLAY_ATTACK_COST_SCOPE');return cost;}
function ability(a,key){if(!a||typeof a!=='object'||Array.isArray(a))throw Error('GAMEPLAY_ABILITY_SHAPE');return{name:required(a.name),kind:required(a.type),text:text(a[key])};}
function required(v){const s=text(v);if(!s)throw Error('GAMEPLAY_REQUIRED_SOURCE_TEXT');return s;}
function damage(v){if(v===null||v===undefined||v==='')return null;if(typeof v==='number'){if(!Number.isFinite(v)||v<0)throw Error('GAMEPLAY_DAMAGE_VALUE');return String(v);}const s=required(v);if(s.length>64)throw Error('GAMEPLAY_DAMAGE_SCOPE');return s;}
function weakness(w){if(!w||typeof w!=='object'||Array.isArray(w))throw Error('GAMEPLAY_WEAKNESS_SHAPE');return{type:energy(w.type),value:typeof w.value==='number'?String(w.value):required(w.value)};}
function count(v){if(v==null)return null;if(!Number.isInteger(v)||v<0||v>20)throw Error('GAMEPLAY_RETREAT_COUNT');return v;}
export function normalizePokemonApiDetailsV1(c){
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('GAMEPLAY_SOURCE_CARD_OBJECT');
 const attacks=arrayField(c,'attacks',a=>{
  if(!a||typeof a!=='object'||Array.isArray(a))throw Error('GAMEPLAY_ATTACK_SHAPE');
  const cost=costField(a,'cost');
  if(a.convertedEnergyCost!=null&&(!Number.isInteger(a.convertedEnergyCost)||a.convertedEnergyCost<0||cost&&a.convertedEnergyCost!==cost.length))throw Error('GAMEPLAY_ATTACK_COST_DISAGREEMENT');
  return{name:required(a.name),cost,damage:damage(a.damage),text:text(a.text)};
 });
 let abilities=arrayField(c,'abilities',a=>ability(a,'text'));
 if(c.ancientTrait!=null){if(typeof c.ancientTrait!=='object'||Array.isArray(c.ancientTrait))throw Error('GAMEPLAY_ANCIENT_TRAIT_SHAPE');abilities=[...(abilities??[]),{name:required(c.ancientTrait.name),kind:'Ancient Trait',text:text(c.ancientTrait.text)}];}
 const retreat_cost=arrayField(c,'retreatCost',energy),retreat_count=count(c.convertedRetreatCost);if(retreat_cost&&retreat_count!==null&&retreat_cost.length!==retreat_count)throw Error('GAMEPLAY_RETREAT_DISAGREEMENT');
 return{attacks,abilities,weaknesses:arrayField(c,'weaknesses',weakness),resistances:arrayField(c,'resistances',weakness),rules:arrayField(c,'rules',required),retreat_cost,retreat_count,evolves_from_label:text(c.evolvesFrom),card_text:null,flavor_text:text(c.flavorText)};
}
export function normalizeTcgdexDetailsV1(c){
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('GAMEPLAY_SOURCE_CARD_OBJECT');
 return{attacks:arrayField(c,'attacks',a=>{if(!a||typeof a!=='object'||Array.isArray(a))throw Error('GAMEPLAY_ATTACK_SHAPE');return{name:required(a.name),cost:costField(a,'cost'),damage:damage(a.damage),text:text(a.effect)};}),abilities:arrayField(c,'abilities',a=>ability(a,'effect')),weaknesses:arrayField(c,'weaknesses',weakness),resistances:arrayField(c,'resistances',weakness),rules:arrayField(c,'rules',required),retreat_cost:null,retreat_count:count(c.retreat),evolves_from_label:text(c.evolveFrom),card_text:text(c.effect),flavor_text:text(c.description)};
}
export function normalizePokemonApiStatsV1(c){
 const h=typeof c.hp==='string'?c.hp.trim():c.hp,hp=h==null?null:Number.isInteger(h)?h:typeof h==='string'&&/^\d+$/.test(h)?Number(h):null,types=c.types==null?null:Array.isArray(c.types)&&c.types.length?c.types.map(energy):null;
 if(c.hp!=null&&(hp===null||hp<=0||hp>1000))throw Error('GAMEPLAY_STATS_HP_REVIEW');
 if(c.types!=null&&!types)throw Error('GAMEPLAY_STATS_TYPES_REVIEW');
 if(!['Pokémon','Trainer','Energy'].includes(c.supertype)||!Array.isArray(c.subtypes)||!c.subtypes.length)throw Error('GAMEPLAY_STATS_CATEGORY_REVIEW');
 const stages={'Basic':'Basic','Stage 1':'Stage 1','Stage 2':'Stage 2','VMAX':'VMAX','VSTAR':'VSTAR','Restored':'Restored','MEGA':'Mega Evolution','BREAK':'BREAK Evolution'},trainers=['Item','Supporter','Stadium','Pokémon Tool','Technical Machine',"Rocket's Secret Machine"],energies=['Basic','Special'];
 const categories=c.subtypes.filter(v=>c.supertype==='Pokémon'?Object.hasOwn(stages,v):c.supertype==='Trainer'?trainers.includes(v):energies.includes(v));
 if(categories.length!==1||c.supertype==='Pokémon'&&(!hp||!types)||c.subtypes.some(v=>['LEGEND','V-UNION'].includes(v)))throw Error('GAMEPLAY_STATS_SUBTYPE_REVIEW');
 if(c.supertype!=='Pokémon'&&(hp!==null||types!==null||c.nationalPokedexNumbers!=null))throw Error('GAMEPLAY_STATS_NON_POKEMON_APPLICABILITY_REVIEW');
 const dex=Array.isArray(c.nationalPokedexNumbers)&&c.nationalPokedexNumbers.length===1&&Number.isInteger(c.nationalPokedexNumbers[0])&&c.nationalPokedexNumbers[0]>0?c.nationalPokedexNumbers[0]:null;
 return{hp,types,supertype:c.supertype,card_category:c.supertype==='Pokémon'?stages[categories[0]]:categories[0],national_dex:dex};
}
