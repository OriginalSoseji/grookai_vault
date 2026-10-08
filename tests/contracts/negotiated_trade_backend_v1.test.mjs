import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8').replaceAll('\r\n','\n');
const sql=read('supabase/migrations/20261008060000_vendor_negotiated_trade_v1.sql');
const body=name=>sql.slice(sql.indexOf('create or replace function public.'+name)).split('end $$;')[0];
test('new writer preserves old authority and uses the existing owner lock and durable journal',()=>{
 for(const n of [1,2,3,4])assert.ok(!sql.includes('create or replace function public.vendor_sales_cart_complete_v'+n+'('));
 const writer=body('vendor_sales_cart_complete_v5');
 assert.ok(writer.indexOf('for update')<writer.indexOf('select * into prior'));
 assert.ok(writer.indexOf('return jsonb_build_object')<writer.indexOf('if not public.vendor_sales_negotiated_trade_available_v1()'));
 assert.ok(writer.indexOf('vendor_negotiated_trade_request_validate_v1(p_cart)')<writer.indexOf('vault_add_card_instance_v1'));
 assert.match(writer,/insert into public.vendor_sales_cart_receipts\(owner_id,request_id,request,receipt,dispositions\)/);
 assert.match(writer,/vendor_receipt_book_save_v1\(book_row.revision,p_request_id,book\)/);
 assert.match(writer,/prior.request is distinct from p_cart/);
});
test('independent credit and known-zero USD cost never derive a reference price',()=>{
 assert.doesNotMatch(sql,/end \$\$;\s+or |p_cart->'version' is distinct from '3'::jsonb/);
 assert.equal((sql.match(/create or replace function /g)??[]).length,10);
 const writer=body('vendor_sales_cart_complete_v5');
 assert.match(writer,/credit:=\(trade->>'creditMinor'\)::bigint/);
 assert.match(writer,/acquisition_cost=credit::numeric\/100,acquisition_currency='USD'/);
 assert.match(writer,/p.finish_is_active=true/);
 assert.doesNotMatch(writer,/value_minor\*quantity\*rate|description:=left\(description,155\)|Trade credit: USD/);
 assert.match(writer,/'tradeIn',jsonb_build_object\('version',2/);
});
test('owner-bound recovery needs the exact payload but no write or entry switch',()=>{
 const read=body('vendor_sales_cart_read_v2');
 assert.match(read,/actor uuid:=auth.uid\(\)/);assert.match(read,/owner_id=actor and request_id=p_request_id/);
 assert.match(read,/prior.request is distinct from p_cart/);assert.match(read,/'cart',prior.request/);
 assert.doesNotMatch(read,/available_v|insert into|update public|delete from/);
});
test('book dispatch preserves old checks and validates new envelope before source ownership',()=>{
 const book=body('vendor_receipt_book_validate_v1');
 assert.match(book,/vendor_purchase_receipt_validate_v1/);
 assert.match(book,/if r->'tradeIn'->'version'='2'::jsonb then\s+perform public.vendor_negotiated_trade_receipt_validate_v1\(r\);\s+else\s+perform public.vendor_sales_trade_snapshot_validate_v1/);
 assert.ok(book.indexOf('vendor_negotiated_trade_receipt_validate_v1')<book.indexOf('Recorded sale unavailable'));
 assert.match(sql,/enabled boolean not null default false/);
 assert.match(sql,/revoke all on public.vendor_negotiated_trade_control from public,anon,authenticated/);
});
test('fresh replay harness stays isolated, freezes sources and never reuses populated fixtures',()=>{
 const lab=read('scripts/schema/product_negotiated_trade_lab_v1.mjs');
 assert.match(lab,/\[port,'db',5432\]/);assert.doesNotMatch(lab,/5433/);
 assert.match(lab,/c:\/gv_product_negotiated_trade_20261007/);
 assert.match(lab,/Never reuse a prior preparation\/reset intent/);
 assert.match(lab,/--local/);assert.match(lab,/--internal/);assert.match(lab,/HostIp,'127.0.0.1'/);
 assert.match(lab,/f649c12aa378ab0a6e7d29851e300904a54ddb76/);
 assert.match(lab,/retainedFixtureResets:0/);
});
test('ordinary checks bind the new lab, use read-only credentials and preserve table fingerprints',()=>{
 const checks=read('scripts/tests/run_product_negotiated_trade_checks_v1.mjs');
 assert.match(checks,/c:\/gv_product_negotiated_trade_20261007/);
 assert.match(checks,/product-trade-full-433-v4-20261007/);
 assert.match(checks,/127.0.0.1:33560\/postgres\?options=-c%20default_transaction_read_only%3Don/);
 assert.match(checks,/row\.retained\[table\]/);assert.match(checks,/assert.deepEqual\(after, before/);
 assert.match(checks,/negotiated:false,trade:false,payments:false,purchase:false,cart:false,cloud:false,capture:false,edit:false/);
 assert.doesNotMatch(checks,/product_offer_policy_20261007|product-buy-full-432|33280/);
});
