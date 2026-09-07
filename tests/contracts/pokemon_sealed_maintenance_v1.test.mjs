import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePokemonSealedImageRetryV1,comparePokemonSealedSourcePriceV1,buildPokemonSealedAgingDetailV1,createPokemonSealedSourceCircuitV1} from '../../backend/pricing/pokemon_sealed_maintenance_v1.mjs';
const row = {status:'excluded',source_product_id:123,source_payload_hash:'a'.repeat(64),urls:['https://tcgplayer-cdn.tcgplayer.com/product/123_200w.jpg']};
test('image retry is bounded to original exact identity and public source',()=>{
  assert.deepEqual(validatePokemonSealedImageRetryV1(row),row.urls);
  for(const url of ['https://evil.test/123.jpg','https://tcgplayer-cdn.tcgplayer.com.evil.test/product/123_200w.jpg',
    'https://tcgplayer-cdn.tcgplayer.com/product/1234_200w.jpg',row.urls[0]+'?secret=x','http://tcgplayer-cdn.tcgplayer.com/product/123_200w.jpg'])
    assert.throws(()=>validatePokemonSealedImageRetryV1({...row,urls:[url]}));
  assert.throws(()=>validatePokemonSealedImageRetryV1({...row,status:'verified'}));
});
test('missing/null/ambiguous current price never becomes current factual price',()=>{
  const compare=results=>comparePokemonSealedSourcePriceV1({...row,market_price:'12'},{success:true,results});
  assert.equal(compare([]).disposition,'not_in_current_source_prices');
  for(const marketPrice of [null,0,-1,'12']) assert.equal(compare([{productId:123,subTypeName:'Normal',marketPrice}]).disposition,'current_source_market_price_unavailable');
  const p={productId:123,subTypeName:'Normal',marketPrice:12};
  assert.equal(compare([p,p]).disposition,'ambiguous_source_price');
  assert.equal(compare([{...p,subTypeName:'Holofoil'}]).disposition,'not_in_current_source_prices');
  assert.throws(()=>comparePokemonSealedSourcePriceV1(row,{results:[]}));
});
test('even matching fresh external quote requires governed warehouse reconciliation',()=>{
  const result=comparePokemonSealedSourcePriceV1({...row,market_price:12},{success:true,results:[{productId:123,subTypeName:'Normal',marketPrice:12}]});
  assert.equal(result.disposition,'current_source_price_requires_warehouse_reconciliation');
  assert.equal(result.equals_published_quote,true);
  assert.equal(Object.hasOwn(result,'observed_on'),false);
});
test('aging detail distinguishes approaching expiry from expired without redating',()=>{
  const rows=[4,7,8].map(age_days=>({age_days,observed_on:'2026-08-31'}));
  const result=buildPokemonSealedAgingDetailV1(rows);
  assert.deepEqual(result.map(r=>r.freshness_status),['aging','expires_next_day','expired']);
  assert.ok(result.every(r=>r.observed_on==='2026-08-31'));
  assert.throws(()=>buildPokemonSealedAgingDetailV1([{age_days:NaN}]));
});
test('access denied and rate limits stop the entire origin, not unrelated origins',()=>{
  for(const status of [401,403,429]) {
    const c=createPokemonSealedSourceCircuitV1();
    assert.equal(c.status('https://tcgcsv.com/a'),null);
    c.observe('https://tcgcsv.com/a',status);
    assert.equal(c.status('https://tcgcsv.com/b'),status);
    assert.equal(c.status('https://product-images.tcgplayer.com/a'),null);
  }
  const c=createPokemonSealedSourceCircuitV1();c.observe('https://tcgcsv.com/a',404);
  assert.equal(c.status('https://tcgcsv.com/b'),null);
});
