import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {test} from 'node:test';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
const path=new URL('../../apps/web/src/lib/vault/inventoryExport.ts',import.meta.url);
const output=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},TextEncoder};vm.runInNewContext(output,context);
const {inventoryExport:parse,inventoryExportJson:json,inventoryExportCsv:csv,inventoryCsvCell:cell,inventoryExportError:message}=context.exports;
const corpus=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/inventory_export_cases.json',import.meta.url)));
for(const example of corpus.cases)test('inventory shared corpus: '+example.name,()=>{
 const call=()=>parse(corpus.ownerId,example.document);
 if(example.valid)assert.deepEqual(JSON.parse(json(call())),example.document);
 else assert.throws(call);
});
test('export detaches SDK response and revalidates before serialization',()=>{
 const source=structuredClone(corpus.cases[0].document),snapshot=parse(corpus.ownerId,source);
 source.copies[0].record.notes='Changed';assert.notEqual(snapshot.copies[0].record.notes,'Changed');
 snapshot.copies[0].record.user_id='bad';assert.throws(()=>json(snapshot));assert.throws(()=>csv(snapshot));
});
for(const value of ['=SUM(A1:A9)',' +1','\t-2','\r\n@formula','\u0001=1'])test('CSV formula neutralization '+JSON.stringify(value),()=>{
 assert.equal(cell(value),'"\''+value.replaceAll('"','""')+'"');
});
test('CSV preserves literal commas, quotes and line breaks in one quoted cell',()=>{
 assert.equal(cell('a,"b"\nc'),'"a,""b""\nc"');assert.equal(cell(null),'""');
});
test('CSV has one record per physical copy and retains exact decimal text',()=>{
 const result=csv(parse(corpus.ownerId,corpus.cases[0].document));
 assert.ok(result.startsWith('\uFEFF"Copy ID","Kind"'));
 assert.ok(result.endsWith('\r\n'));
 for(const c of corpus.cases[0].document.copies)assert.equal(result.split('"'+c.record.id+'"').length,2);
 assert.ok(result.includes('"0.00000000000000000001"'));assert.ok(result.includes('"9999999999.9900000001"'));
 assert.ok(result.includes('"00123","10.00"'));assert.ok(result.includes('"Legacy grader","9.5"'));
 assert.ok(result.includes('Original, ""quoted""\n=literal field'));
});
test('availability and size failures are distinct and raw provider errors stay private',()=>{
 assert.match(message({code:'PGRST202'}),/not available/);
 assert.match(message({message:'inventory_export_too_many_copies'}),/20,000/);
 assert.match(message({message:'inventory_export_too_large'}),/size limit/);
 assert.doesNotMatch(message({message:'private database secret'}),/secret/);
});
