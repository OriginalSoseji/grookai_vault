import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCustomProductCsv as parse, normalizeCustomImportRows as normalize, CUSTOM_IMPORT_TEMPLATE, CUSTOM_IMPORT_MAX_BYTES} from '../../apps/web/src/lib/stores/customProductImport.ts';
test('quoted commas, escaped quotes, newlines and UTF8 BOM preserve seller text',()=>{
 const rows=parse('\uFEFFtitle,description,available_quantity,asking_price_amount,private_sku\r\n"Plush, large","Tag says ""sample""\nSecond line",2,13.25,SKU-1\r\n');
 assert.equal(rows.length,1);assert.equal(rows[0].title,'Plush, large');assert.equal(rows[0].description,'Tag says "sample"\nSecond line');assert.equal(rows[0].available_quantity,2);assert.equal(rows[0].asking_price_amount,13.25);assert.equal(rows[0].private_sku,'SKU-1');
});
test('incomplete descriptions/prices and zero stock remain valid drafts',()=>{
 const [row]=parse('title,available_quantity\nFigure,0');assert.equal(row.description,'');assert.equal(row.asking_price_amount,null);assert.equal(row.available_quantity,0);
 assert.equal(Object.hasOwn(row,'published'),false);assert.equal(Object.hasOwn(row,'gv_vi_id'),false);
});
for(const csv of ['',CUSTOM_IMPORT_TEMPLATE,'title,title,available_quantity\na,b,1','title,available_quantity,published\na,1,true','title,available_quantity,gv_vi_id\na,1,x','title\na','title,available_quantity\n,1','title,available_quantity\na,1,extra','title,available_quantity\n"a,1','title,available_quantity\n"a"junk,1','title,available_quantity\na"b,1'])test(`reject invalid CSV ${csv.slice(0,38)}`,()=>assert.throws(()=>parse(csv)));
for(const quantity of ['-1','1.5','1e2','+1','', '1000001','Infinity'])test(`reject quantity ${quantity}`,()=>assert.throws(()=>parse(`title,available_quantity\na,${quantity}`)));
for(const price of ['-1','1.001','1e2','+1','$1','NaN','100000000'])test(`reject price ${price}`,()=>assert.throws(()=>parse(`title,available_quantity,asking_price_amount\na,1,${price}`)));
test('boundary prices and quantities are exact',()=>{
 const rows=parse('title,available_quantity,asking_price_amount\na,1000000,99999999.99\nb,0,0');assert.equal(rows[0].asking_price_amount,99999999.99);assert.equal(rows[1].asking_price_amount,0);
});
test('all rows validate before any result is returned',()=>assert.throws(()=>parse('title,available_quantity\ngood,1\nbad,-1'),/Row 3/));
test('row and byte limits apply before import',()=>{
 assert.equal(parse('title,available_quantity\n'+Array(100).fill('a,1').join('\n')).length,100);
 assert.throws(()=>parse('title,available_quantity\n'+Array(101).fill('a,1').join('\n')));
 assert.throws(()=>parse('é'.repeat(CUSTOM_IMPORT_MAX_BYTES/2+1)),/1 MiB/);
});
test('text limits count Unicode code points consistently with PostgreSQL',()=>{
 assert.equal(parse(`title,available_quantity\n${'😀'.repeat(120)},1`)[0].title.length,240);
 assert.throws(()=>parse(`title,available_quantity\n${'😀'.repeat(121)},1`));
});
test('server rejects forged authority, types and fractional cents',()=>{
 for(const row of [{title:'a',available_quantity:1,published:true},{title:'a',available_quantity:'1'},{title:'a',available_quantity:1,description:{}},{title:'a',available_quantity:1,asking_price_amount:1.001},{title:'a\0',available_quantity:1}])assert.throws(()=>normalize([row]));
});
test('reordered headers normalize to the same immutable payload',()=>{
 assert.deepEqual(parse('title,available_quantity,private_sku\na,2,s'),parse('private_sku,available_quantity,title\ns,2,a'));
});
test('duplicate SKU rows remain separate products, never stock reconciliation',()=>assert.equal(parse('title,available_quantity,private_sku\na,1,s\nb,2,s').length,2));
