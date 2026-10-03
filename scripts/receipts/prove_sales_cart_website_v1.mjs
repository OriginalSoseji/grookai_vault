// Website opens the same receipt for native and multi-copy sales. Local only.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{randomUUID,createHash}from'node:crypto';
const root='C:/gv_ipad_sales_cart_20261003',base='http://127.0.0.1:15470',out='C:/grookai_vault_operator_artifacts/ipad_sales_cart_20261003/web-'+Date.now();
assert.equal(process.cwd().replaceAll('\\','/'),root);fs.mkdirSync(out);
const cfg=JSON.parse(fs.readFileSync(root+'/.local/sales-cart/runtime.private.json')),f=JSON.parse(fs.readFileSync(root+'/.local/sales-cart/native-fixture.private.json'));
assert.equal(cfg.API_URL,'http://127.0.0.1:64801');assert.equal(new URL(cfg.DB_URL).port,'64800');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');
const req=createRequire(root+'/package.json'),web=createRequire(root+'/apps/web/package.json');
const{Client}=req('pg'),{createClient}=web('@supabase/supabase-js'),{chromium,expect}=web('@playwright/test');
const db=new Client({connectionString:cfg.DB_URL});await db.connect();
const owner=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false}});
assert.equal((await owner.auth.signInWithPassword({email:f.email,password:f.password})).error,null);
const copies=[],anchors=[],checks=[],errors=[];let browser,failure;
try{
 const beforeCount=(await owner.rpc('vendor_receipt_book_read_v1')).data.book.receipts.length;
 const native=(await db.query("select receipt from vendor_sales_cart_receipts where owner_id=$1 and receipt->>'totalMinor'='2234'",[f.owner])).rows[0].receipt;
 for(let i=0;i<2;i++){
  const id=randomUUID(),anchor=randomUUID();copies.push(id);anchors.push(anchor);
  await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Web cart card','GV-PK-IPADPOS-001')",[anchor,f.owner,f.card]);
  await db.query('insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id) values($1,$2,$3,$4,$5)',[id,f.owner,f.card,anchor,'GVVI-IPADWEB-'+String(i+1).padStart(6,'0')]);
 }
 const cart={version:1,storeName:'Web mixed cart proof',method:'Cash',taxMinor:0,note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''},items:copies.map(id=>({instanceId:id,description:'Web card',quantity:1,unitMinor:1000}))};
 const recorded=await owner.rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:cart});assert.equal(recorded.error,null);
 const sources=(await db.query('select id from vault_item_instance_dispositions where vault_item_instance_id=any($1::uuid[])',[copies])).rows.map(r=>r.id);
 browser=await chromium.launch({headless:true});
 const c=await browser.newContext({viewport:{width:1194,height:834}});await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/account/store/receipts/start?sale='+native.sourceDispositionId);await p.waitForURL(/\/login\?next=/);
 assert.equal(new URL(p.url()).searchParams.get('next'),'/account/store/receipts/start?sale='+native.sourceDispositionId);
 await p.getByLabel('Email',{exact:true}).fill(f.email);await p.getByLabel('Password',{exact:true}).fill(f.password);await p.getByRole('button',{name:'Sign in',exact:true}).click();
 await p.waitForURL(base+'/account/store/receipts/cloud?sale='+native.sourceDispositionId,{timeout:60000});
 await expect(p.locator('dd.rd-total')).toHaveText('$22.34',{timeout:30000});await expect(p.locator('[data-sale]')).toHaveCount(0);
 checks.push('Actual iPad receipt reopens on the website through authenticated source link');
 for(const source of sources){await p.goto(base+'/account/store/receipts/cloud?sale='+source);await expect(p.locator('dd.rd-total')).toHaveText('$20.00',{timeout:30000});await expect(p.locator('[data-sale]')).toHaveCount(0);await expect(p.locator('[data-open]')).toHaveCount(beforeCount+1);}
 checks.push('Both exact copies resolve to the same full-cart receipt, with no new draft or duplicate');
 await p.screenshot({path:out+'/web-receipt.png',fullPage:true});await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const book=(await owner.rpc('vendor_receipt_book_read_v1')).data;assert.equal(book.book.receipts.length,beforeCount+1);assert.deepEqual(errors,[]);
 checks.push('Mobile layout has no overflow and reads caused no extra receipt writes');
}catch(error){failure=error;}finally{
 await browser?.close();await db.query('begin');await db.query('set local session_replication_role=replica');await db.query('delete from vault_item_instance_dispositions where vault_item_instance_id=any($1::uuid[])',[copies]);await db.query('delete from vault_item_instances where id=any($1::uuid[])',[copies]);await db.query('delete from vault_items where id=any($1::uuid[])',[anchors]);await db.query('set local session_replication_role=origin');await db.query('commit');await db.end();
}
const paths=['apps/web/src/lib/receipts/receiptSale.ts','scripts/receipts/prove_sales_cart_website_v1.mjs'];
const result={status:failure?'failed':'passed',at:new Date().toISOString(),checks,productionWrites:0,sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(root+'/'+p)).digest('hex')]))};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(failure){fs.writeFileSync(out+'/failure.private.txt',String(failure.stack));throw Error('Website proof failed; inspect private evidence at '+out);}
fs.writeFileSync('C:/grookai_vault_operator_artifacts/ipad_sales_cart_20261003/web-proof.json',JSON.stringify(result,null,2));
