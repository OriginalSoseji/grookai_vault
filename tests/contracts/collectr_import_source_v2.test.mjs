import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv, normalize, number, field} from '../../supabase/functions/vault-import-collection-v2/source.ts';

export const record = (overrides={}) => ({'Product Name':'Synthetic card','Category':'Pokemon','Set':'SV: 151','Card Number':'00065/165','Variance':'Reverse Holofoil','Grade':'Ungraded','Card Condition':'Lightly Played','Quantity':'2','Average Cost Paid':'$4.25','Date Added':'01/02/2026','Notes':'Keep\nall details','Portfolio Name':'Private collection',...overrides});
export function csv(rows) {
 const headers=[...new Set(rows.flatMap(row=>Object.keys(row)))];
 const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 return [headers,...rows.map(row=>headers.map(key=>row[key]??''))].map(row=>row.map(quote).join(',')).join('\r\n');
}
test('quoted multiline CSV retains every original field and original record',()=>{
 const rows=[record({Notes:'He said "hello"\r\nsecond line, comma'}),record({'Quantity':'3'})];
 assert.deepEqual(parseCsv('\ufeff'+csv(rows)),rows);
});
test('source normalization binds game, collector number, finish and purchase values',()=>{
 assert.deepEqual(normalize(record()),{name:'synthetic card',set:'151',number:'65',game:'pokemon',finishKey:'reverse',quantity:2,condition:'LP',acquisitionCost:4.25,createdAt:'2026-01-02T00:00:00.000Z',notes:'Keep\nall details'});
 assert.equal(number('swsh0001'),'SWSH1');assert.equal(number('TG01/TG30'),'TG1');
 assert.equal(field({'card name':'wrong','Product Name':'correct'},'product name','card name'),'correct');
});
for(const [label,overrides] of Object.entries({
 grade:{Grade:'PSA 10'},watchlist:{Watchlist:'true'},quantity:{Quantity:'-1'},fraction:{Quantity:'1.5'},
 numberless:{'Card Number':''},cost:{'Average Cost Paid':'NaN'},condition:{'Card Condition':'unknown'},
 date:{'Date Added':'2026-02-30'},game:{Category:'Riftbound'},finish:{Variance:'Master Ball'},
 edition:{Set:'Base Set (1st Edition & Shadowless)',Variance:'Holofoil'},
 unknown:{'Custom field':'retain me'},priceOverride:{'Price Override':'100'},
}))test(`${label} stays review-only, never simplified`,()=>assert.throws(()=>normalize(record(overrides))));
test('grade and watchlist protection is case insensitive',()=>{
 const row=record();delete row.Grade;row.gRaDe='CGC 9';assert.throws(()=>normalize(row));
});
test('market snapshot remains evidence rather than purchase cost',()=>{
  assert.equal(normalize(record({'Average Cost Paid':'','Market Price (As of today)':'$999'})).acquisitionCost,null);
});
test('Collectr zero price override is retained and does not block normal inventory',()=>{
 const rows=[record({'Price Override':'0'})];assert.deepEqual(parseCsv(csv(rows)),rows);assert.equal(normalize(rows[0]).acquisitionCost,4.25);
 assert.throws(()=>normalize(record({'Price Override':'100'})));
});
for(const invalid of ['Product Name,Set,Card Number\n"unfinished,x,1','Product Name,Set,Card Number\n"name"x,set,1','Product Name,Set,Card Number\nname,set,1,extra','Product Name,Set,Card Number,SET\nx,s,1,s'])test('malformed CSV fails visibly',()=>assert.throws(()=>parseCsv(invalid)));
