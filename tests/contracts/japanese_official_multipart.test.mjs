import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOfficialJapaneseCardDetail} from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs';
import {requiresJapaneseComponentReconciliation} from '../../scripts/audits/japanese_master_index_v4/card_assertion_contract_v1.mjs';

const positions=['\u5de6\u4e0a','\u53f3\u4e0a','\u5de6\u4e0b','\u53f3\u4e0b'];
function html(parts){return `<h1 class="Heading1">Pikachu V-UNION</h1><span class="type">V-UNION</span>
  <img class="fit" src="/assets/composite.jpg"><div class="subtext Text-fjalla"><div class="subtext-list">${parts.map((n,i)=>
    `<div class="subtext-set"><img class="img-regulation" alt="S8a">&nbsp;${n}&nbsp;/&nbsp;028&nbsp;(${positions[i]})</div>`).join('')}</div></div>`;}

test('nested official V-UNION blocks retain every piece instead of certifying the first number',()=>{
  const detail=parseOfficialJapaneseCardDetail(html(['025','026','027','028']),'40090');
  assert.equal(detail.card_number_raw,null);assert.equal(detail.card_number_numerator,null);assert.equal(detail.card_number_denominator,null);
  assert.equal(detail.source_fields.primary_listed_card_number_raw,'025');
  assert.equal(detail.source_fields.card_representation_kind,'multi_part_card_assembly');
  assert.deepEqual(detail.source_fields.printed_number_components.map(p=>[p.printed_number,p.printed_total,p.printed_position_raw,p.source_set_code]),
    ['025','026','027','028'].map((n,i)=>[n,28,positions[i],'S8a']));
  assert.ok(requiresJapaneseComponentReconciliation({source_id:'official_jp_cards',...detail}));
});

test('ordinary single-coordinate pages remain single-coordinate evidence',()=>{
  const detail=parseOfficialJapaneseCardDetail('<h1 class="Heading1">Single</h1><div class="subtext"><img class="img-regulation" alt="S8a">001 / 028</div>','1');
  assert.equal(detail.card_number_raw,'001');assert.equal(detail.card_number_denominator,28);
  assert.equal(detail.source_fields.card_representation_kind,undefined);
  assert.equal(requiresJapaneseComponentReconciliation({source_id:'official_jp_cards',...detail}),false);
});

test('incomplete or duplicated component lists cannot become a single printing',()=>{
  for(const numbers of [['025','026'],['025','025','027','028']]){
    const detail=parseOfficialJapaneseCardDetail(html(numbers),'1');assert.equal(detail.card_number_raw,null);
    assert.ok(requiresJapaneseComponentReconciliation({source_id:'official_jp_cards',...detail}));
  }
});

test('legacy official V-UNION assertion is held even without the new parser fields',()=>{
  assert.ok(requiresJapaneseComponentReconciliation({source_id:'official_jp_cards',category:'V-UNION',card_number_raw:'025'}));
  assert.equal(requiresJapaneseComponentReconciliation({source_id:'warehouse_product',category:'V-UNION',card_number_raw:'025',source_fields:{component_position:'top_left'}}),false);
});
