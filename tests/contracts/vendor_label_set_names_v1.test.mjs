import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
test('every native card-label constructor uses its canonical name source',()=>{
 const files=directory=>fs.readdirSync(new URL('../../'+directory,import.meta.url),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(directory+'/'+entry.name):entry.name.endsWith('.dart')?[directory+'/'+entry.name]:[]);
 let count=0;
 for(const file of [...files('lib/screens'),...files('lib/widgets')]){
  for(const match of read(file).matchAll(/\bP21LabelContent\s*\(([\s\S]*?)\bqrUri\s*:/g)){
   count++;
   assert.match(match[1],/setName:\s*(?:data\.canonicalSetName|row\.setName)\s*\?\?\s*''\s*,/,file+' must block missing full set names');
   assert.doesNotMatch(match[1],/setName:\s*data\.set(?:Name|Code)\b/,file+' cannot use a display fallback');
  }
 }
 assert.ok(count>=3,'All existing physical-card print entry points must be checked');
});
test('label entry points take canonical full set names without code fallbacks',()=>{
 for(const file of ['lib/widgets/vault/vault_copy_sale_sheet.dart','lib/screens/gvvi/public_gvvi_screen.dart'])assert.match(read(file),/setName:\s*data\.canonicalSetName\s*\?\?\s*''/);
 assert.match(read('lib/screens/gvvi/vendor_pricing_workspace_screen.dart'),/setName:\s*row\.setName\s*\?\?\s*''/);
 for(const file of ['apps/web/src/app/vault/gvvi/[gvvi_id]/qr/page.tsx','apps/web/src/app/vault/labels/page.tsx']){
  const source=read(file);assert.match(source,/setName: (?:detail|copy!)\.canonicalSetName \?\? ""/);assert.doesNotMatch(source,/setName:.*setCode/);
 }
 for(const file of ['lib/services/printing/p21_label.dart','lib/services/printing/identity_label_raster.dart'])assert.match(read(file),/full set name is unavailable/);
 assert.match(read('apps/web/src/components/gvvi/VendorIdentityLabels.tsx'),/!missingSetName && createPortal/);
});
