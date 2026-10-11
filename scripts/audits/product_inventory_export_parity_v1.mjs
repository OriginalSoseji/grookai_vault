// Compare actual SQL/browser documents through the real Dart and TypeScript serializers.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const root='C:/gv_product_inventory_export_20261008',base='C:/grookai_vault_operator_artifacts/product_inventory_export_20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);assert.equal(process.argv.length,2);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=base+'/ui-1791523581076',rpc=run+'/rpc-1791523960063',web=run+'/web-1791525578515';
assert.equal(read(rpc+'/result.json').status,'passed');assert.equal(read(web+'/result.json').status,'passed');
const corpus=read(root+'/test/fixtures/inventory_export_cases.json');
const vectors=corpus.cases.filter(c=>c.valid).map(c=>({name:c.name,ownerId:corpus.ownerId,document:c.document}));
for(const [name,path]of [['actual_sql',rpc+'/export.private.json'],['browser_download',web+'/download.private.json'],['empty_download',web+'/empty.private.json']]){const document=read(path);vectors.push({name,ownerId:document.ownerId,document});}
const require=createRequire(root+'/apps/web/package.json'),ts=require('typescript'),context={exports:{},TextEncoder};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/apps/web/src/lib/vault/inventoryExport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const native=JSON.parse(execFileSync('C:/src/flutter/bin/cache/dart-sdk/bin/dart.exe',['scripts/tests/inventory_export_parity.dart'],{cwd:root,input:JSON.stringify(vectors),encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:16*1024*1024}));
assert.equal(native.length,vectors.length);
for(const [i,v]of vectors.entries()){
 const parsed=context.exports.inventoryExport(v.ownerId,v.document);assert.equal(native[i].name,v.name);
 assert.equal(native[i].json,context.exports.inventoryExportJson(parsed),v.name+' JSON bytes');
 assert.equal(native[i].csv,context.exports.inventoryExportCsv(parsed),v.name+' CSV bytes');
}
const result={status:'passed',at:new Date().toISOString(),vectors:vectors.map(v=>v.name),exactUtf8JsonAndCsvParity:true,
 sourceHashes:Object.fromEntries(['apps/web/src/lib/vault/inventoryExport.ts','lib/services/vault/inventory_export.dart','scripts/tests/inventory_export_parity.dart', 'scripts/audits/product_inventory_export_parity_v1.mjs'].map(p=>[p,sha(root+'/'+p)])),
 inputHashes:Object.fromEntries([rpc+'/export.private.json',web+'/download.private.json',web+'/empty.private.json',root+'/test/fixtures/inventory_export_cases.json'].map(p=>[p,sha(p)])),productionWrites:0,providerCalls:0};
fs.writeFileSync(base+'/SERIALIZER_PARITY_V2.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'passed',vectors:vectors.length,exactUtf8JsonAndCsvParity:true}));
