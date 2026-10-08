import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [name,args]of [
 ['cannot grant PrePush authority',['-Phase','PrePush']],
 ['rejects combined economics scope',['-Phase','AuditLinkedSchema','-ProductEconomicsBaselineV1']],
 ['rejects caller-selected migration set',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261008021000']],
 ['rejects caller-selected destination',['-Phase','AuditLinkedSchema','-AuditOutDir','C:/untrusted-purchase-output']],
])test('purchase baseline '+name,()=>{
 const result=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-ProductPurchaseBaselineV1',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1024*1024});
 assert.ifError(result.error);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/ProductPurchaseBaselineV1 supports only the read-only linked audit before purchase SQL/);
});
test('legacy book validation and sale-cost capture retain their exact prior behavior outside purchase dispatch',()=>{
 const sql=fs.readFileSync(root+'supabase/migrations/20261008021000_vendor_purchase_v1.sql','utf8').replaceAll('\r','');
 const oldBook=fs.readFileSync(root+'supabase/migrations/20261006140000_sales_split_payments_v1.sql','utf8').replaceAll('\r','');
 const oldCost=fs.readFileSync(root+'supabase/migrations/20261007180000_vendor_cost_evidence_v1.sql','utf8').replaceAll('\r','');
 const book=source=>source.slice(source.indexOf('create or replace function public.vendor_receipt_book_validate_v1(')).split('\n$$;')[0]+'\n$$;';
 const capture=source=>source.slice(source.indexOf('create or replace function public.vendor_sale_cost_capture_v1()')).split('end $$;')[0]+'end $$;';
 const newBook=book(sql).replace(/\n    if r->'version'='2'::jsonb and r->>'kind'='purchase' then[\s\S]*?\n      continue;\n    end if;/,'');
 assert.equal(newBook,book(oldBook));
 assert.equal(capture(sql).replace("  if new.request->'version'='4'::jsonb and new.request->>'kind'='purchase' then return new; end if;\n",''),capture(oldCost));
});
