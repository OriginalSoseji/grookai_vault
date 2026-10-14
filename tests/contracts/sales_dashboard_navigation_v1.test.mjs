import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {paginateSalesRows,readSalesDashboardParams,writeSalesDashboardParams} from '../../apps/web/src/lib/sales/salesDashboardState.mjs';

test('sales dashboard filters round-trip through a shareable URL without losing its view',()=>{
  const methods=['Cash','Card (external terminal)','Split payment'];
  const state=readSalesDashboardParams('?view=dashboard&sales_from=2026-10-01&sales_to=2026-10-13&sales_q=Yuka+Morii&sales_method=Cash&sales_page=3','2026-10-13',methods);
  assert.deepEqual(state,{from:'2026-10-01',to:'2026-10-13',query:'Yuka Morii',method:'Cash',page:3});
  const params=writeSalesDashboardParams('?view=dashboard&unrelated=kept',{...state,query:' Wurmple ',method:'Split payment',page:2});
  assert.equal(params.get('view'),'dashboard');assert.equal(params.get('unrelated'),'kept');assert.equal(params.get('sales_q'),'Wurmple');assert.equal(params.get('sales_method'),'Split payment');assert.equal(params.get('sales_page'),'2');
});

test('sales dashboard rejects malformed URL filters and bounds rendered history pages',()=>{
  assert.deepEqual(readSalesDashboardParams('?sales_from=2026-02-30&sales_to=nope&sales_method=Wire&sales_page=-4','2026-10-13',['Cash']),{from:'2026-10-13',to:'2026-10-13',query:'',method:'',page:1});
  const rows=Array.from({length:121},(_,id)=>({id}));
  const middle=paginateSalesRows(rows,2,50);assert.equal(middle.pageCount,3);assert.equal(middle.start,50);assert.equal(middle.end,100);assert.deepEqual(middle.rows.map(row=>row.id),Array.from({length:50},(_,i)=>i+50));
  const bounded=paginateSalesRows(rows,99,50);assert.equal(bounded.page,3);assert.equal(bounded.rows.length,21);
});

test('sales history and saved-sale actions link to an exact private receipt',async()=>{
  const [dashboard,desk,cloud,styles]=await Promise.all([
    readFile(new URL('../../apps/web/src/components/sales/SalesDashboard.tsx',import.meta.url),'utf8'),
    readFile(new URL('../../apps/web/src/components/sales/SalesDesk.tsx',import.meta.url),'utf8'),
    readFile(new URL('../../apps/web/src/lib/receipts/receiptDesk.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../apps/web/src/components/sales/SalesDesk.module.css',import.meta.url),'utf8'),
  ]);
  assert.match(dashboard,/receipts\/cloud\?receipt=/);assert.match(desk,/receipts\/cloud\?receipt=/);
  assert.match(cloud,/initialReceiptId/);assert.match(cloud,/That receipt is unavailable in this account receipt book/);
  assert.match(styles,/bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\)/);
});
