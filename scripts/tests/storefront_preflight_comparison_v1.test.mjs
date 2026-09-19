import test from 'node:test';
import assert from 'node:assert/strict';
import { compareStorefrontFootprints as compare } from '../schema/compare_storefront_footprints_v1.mjs';
const snapshot = objects => ({ transaction_read_only: 'on', objects });
const column = (table, value) => ({ kind:'column', key:`public.${table}.name`, value });
const source = 'create table public.vendor_stores (id uuid);';

test('JSON key order is not schema drift; results never authorize apply', () => {
  const result = compare(snapshot([column('card_prints',{type:'text',position:1})]),
    snapshot([column('card_prints',{position:1,type:'text'})]),source);
  assert.equal(result.delta.length,0);assert.equal(result.applyAuthorized,false);
  assert.equal(result.strictPrePushPassed,false);
});
test('only position changes on the three known tables are classified separately', () => {
  const before = snapshot([column('card_prints',{type:'text',position:1})]);
  assert.equal(compare(before,snapshot([column('card_prints',{type:'text',position:2})]),source).columnOrder.length,1);
  assert.equal(compare(before,snapshot([column('card_prints',{type:'integer',position:2})]),source).unexpected.length,1);
  assert.equal(compare(snapshot([column('vault_items',{position:1})]),snapshot([column('vault_items',{position:2})]),source).unexpected.length,1);
});
test('shared definition changes, missing objects and undeclared additions remain unexplained', () => {
  const fn = hash => ({kind:'function',key:'public.get_public_card_printing_options_v1()',value:{definition_hash:hash}});
  assert.equal(compare(snapshot([fn('before')]),snapshot([fn('after')]),source).unexpected.length,1);
  assert.equal(compare(snapshot([fn('before')]),snapshot([]),source).unexpected.length,1);
  assert.equal(compare(snapshot([]),snapshot([column('undeclared_table',{type:'text'})]),source).unexpected.length,1);
  assert.equal(compare(snapshot([]),snapshot([column('vendor_stores',{type:'text'})]),source).additions.length,1);
});
test('duplicate objects and non-read-only captures are rejected', () => {
  const c=column('card_prints',{type:'text'});
  assert.throws(()=>compare(snapshot([c,c]),snapshot([]),source),/Duplicate/);
  assert.throws(()=>compare({transaction_read_only:'off',objects:[]},snapshot([]),source));
});
