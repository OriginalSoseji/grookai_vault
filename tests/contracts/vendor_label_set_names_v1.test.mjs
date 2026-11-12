import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
test('label entry points take canonical full set names without code fallbacks',()=>{
 for(const file of ['lib/widgets/vault/vault_copy_sale_sheet.dart','lib/screens/gvvi/public_gvvi_screen.dart'])assert.match(read(file),/setName:\s*data\.canonicalSetName\s*\?\?\s*''/);
 assert.match(read('lib/screens/gvvi/vendor_pricing_workspace_screen.dart'),/setName:\s*row\.setName\s*\?\?\s*''/);
 for(const file of ['apps/web/src/app/vault/gvvi/[gvvi_id]/qr/page.tsx','apps/web/src/app/vault/labels/page.tsx']){
  const source=read(file);assert.match(source,/setName: (?:detail|copy!)\.canonicalSetName \?\? ""/);assert.doesNotMatch(source,/setName:.*setCode/);
 }
 for(const file of ['lib/services/printing/p21_label.dart','lib/services/printing/identity_label_raster.dart'])assert.match(read(file),/full set name is unavailable/);
 assert.match(read('apps/web/src/components/gvvi/VendorIdentityLabels.tsx'),/!missingSetName && createPortal/);
});
