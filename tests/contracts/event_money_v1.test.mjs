import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {eventMoneyInput,eventMoneyText} from '../../apps/web/src/lib/sales/vendorEvents.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/event_money_v1.json',import.meta.url)));
test('event money editor accepts exact decimal cents and refuses ambiguous formats',()=>{for(const [input,expected]of cases.inputs)assert.equal(eventMoneyInput(input),expected,input);});
test('event money editor restores exact saved expense values',()=>{for(const [input,expected]of cases.outputs){assert.equal(eventMoneyText(input),expected);assert.equal(eventMoneyInput(expected),input);}for(const input of cases.invalidOutputs)assert.throws(()=>eventMoneyText(input));});
