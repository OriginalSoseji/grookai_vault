import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('apps/web/package.json'));
const {chromium,expect}=require('@playwright/test');
assert.equal(process.argv.length,2);
const local='.local/storefront/supabase-verification';
const f=JSON.parse(fs.readFileSync(local+'/desktop-private.json'));
assert.match(f.slug,/^desktop-shop-\d+$/);
const base='http://127.0.0.1:15440',results=[],errors=[];
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.message});await page.screenshot({path:local+'/desktop-failure.png',fullPage:true});throw e;}};
const button=name=>page.getByRole('button',{name,exact:true});
const notice=text=>expect(page.getByRole('status').filter({hasText:text})).toBeVisible({timeout:30000});
const api=(route,body)=>context.request.fetch(base+route,{method:body?'POST':'GET',headers:body?{origin:base}:{},...(body?{data:body}:{})});
const login=async(p,role)=>{await p.goto(base+'/account/store');await p.waitForURL(/\/login\?next=/);await p.getByLabel('Email',{exact:true}).fill(f.users[role].email);await p.getByLabel('Password',{exact:true}).fill(f.users[role].password);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL(base+'/account/store',{timeout:30000});await p.getByRole('button',{name:'Store details',exact:true}).waitFor();};
let product,owner;
try{
 await check('real browser sign-in returns to desktop store setup and creates only a draft',async()=>{
  await login(page,'owner');await button('Store details').click();
  await page.getByLabel('Store name',{exact:true}).fill('Desktop collector shop');
  await page.getByLabel('Store URL slug',{exact:true}).fill(f.slug);
  await page.getByLabel('About your store',{exact:true}).fill('A store managed entirely from a computer.');
  await button('Create draft store').click();await notice('Saved.');
  owner=await (await api('/api/stores/owner')).json();assert(owner.store);assert(!owner.store.app_published&&!owner.store.web_published);
  assert.equal((await fetch(base+'/api/stores/'+f.slug)).status,404);
 });
 await check('desktop branding upload and owner-only draft media with origin/type guards',async()=>{
  await page.getByLabel('Upload logo',{exact:true}).setInputFiles('.local/storefront/device-fixture.png');await notice('Branding updated.');
  await expect(page.getByAltText('Current store logo')).toBeVisible();
  assert.equal((await fetch(base+'/api/stores/owner/media?kind=logo')).status,401);
  const wrongOrigin=await context.request.post(base+'/api/stores/owner/media',{headers:{origin:'https://forged.invalid'},multipart:{kind:'logo',file:{name:'image.png',mimeType:'image/png',buffer:fs.readFileSync('.local/storefront/device-fixture.png')}}});assert.equal(wrongOrigin.status(),403);
  const invalid=await context.request.post(base+'/api/stores/owner/media',{headers:{origin:base},multipart:{kind:'logo',file:{name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<script>fake image</script>')}}});assert.equal(invalid.status(),400);
  const oversized=await context.request.post(base+'/api/stores/owner/media',{headers:{origin:base},multipart:{kind:'logo',file:{name:'big.png',mimeType:'image/png',buffer:Buffer.alloc(6*1024*1024+1)}}});assert.equal(oversized.status(),413);
 });
 await check('create and explicitly select a section from desktop',async()=>{
  await button('Sections').click();await page.getByLabel('New Wall section',{exact:true}).fill('Desktop showcase');await button('Create section').click();await notice('Wall section created.');
  await page.getByLabel('Desktop showcase',{exact:true}).click();await notice('Saved.');
  owner=await (await api('/api/stores/owner')).json();assert(owner.sections.some(x=>x.name==='Desktop showcase'&&x.selected));
 });
 await check('custom draft authoring, multiple photos, section assignment and preview',async()=>{
  await button('Custom collectibles').click();await button('Add collectible').click();
  await page.getByLabel('Title',{exact:true}).fill('Desktop display collectible');await page.getByLabel('Description',{exact:true}).fill('Seller-described collectible with two photos.');
  await page.getByLabel('Asking price (USD)',{exact:true}).fill('42.50');await page.getByLabel('Available quantity',{exact:true}).fill('2');await page.getByLabel('Private SKU',{exact:true}).fill('DESKTOP-PRIVATE-SKU');
  await button('Save collectible draft').click();await notice('Collectible saved.');
  await page.getByLabel('Add photos',{exact:true}).setInputFiles(['.local/storefront/device-fixture.png','.local/storefront/device-fixture.png']);await notice('Photos attached.');
  await page.getByLabel('Desktop showcase',{exact:true}).click();await notice('Saved.');
  product=(await (await api('/api/stores/owner/products')).json()).products[0];assert.equal(product.photo_paths.length,2);assert.equal(product.published,false);assert.equal(product.section_ids.length,1);
  const before=product.photo_paths;await page.getByRole('button',{name:'Move photo 2 earlier',exact:true}).click();await notice('Saved.');
  product=(await (await api('/api/stores/owner/products')).json()).products[0];assert.deepEqual(product.photo_paths,[before[1],before[0]]);
  const preview=await context.newPage();await preview.goto(base+`/store/${f.slug}/products/${product.id}?preview=1`);await expect(preview.getByRole('heading',{name:'Desktop display collectible',exact:true})).toBeVisible();await preview.close();
  await page.screenshot({path:local+'/desktop-product-editor.png',fullPage:true});
 });
 await check('publication remains explicit for product, app and public web; slug freezes',async()=>{
  await button('Publish collectible').click();await notice('Publication updated.');assert.equal((await fetch(base+'/api/stores/'+f.slug)).status,404);
  await button('Overview').click();await button('Publish in app').click();await notice('Store published.');assert.equal((await fetch(base+'/api/stores/'+f.slug)).status,404);
  await button('Publish web store').click();await notice('Store published.');
  const pub=await fetch(base+'/api/stores/'+f.slug);assert.equal(pub.status,200);assert(!JSON.stringify(await pub.json()).includes('DESKTOP-PRIVATE-SKU'));
  await page.screenshot({path:local+'/desktop-overview.png',fullPage:true});
  await button('Store details').click();await expect(page.getByLabel('Store URL slug',{exact:true})).toBeDisabled();
 });
 await check('desktop inventory keeps exact copies and excludes unassigned printing',async()=>{
  await button('Vault inventory').click();
  await expect(page.getByText('Printing unassigned',{exact:true}).first()).toBeVisible();
  await expect(page.getByLabel(`Select ${f.gvvis.unassigned}`,{exact:true})).toBeDisabled();
  await page.getByLabel(`Select ${f.gvvis.copy}`,{exact:true}).click();await notice('Copy selected.');
  const data=await (await fetch(base+'/api/stores/'+f.slug)).json();assert(data.items.some(x=>x.id===f.ids.copy));assert(!data.items.some(x=>x.id===f.ids.unassigned));
  await page.screenshot({path:local+'/desktop-inventory.png',fullPage:true});
  await page.getByLabel('Search copies',{exact:true}).fill('Desktop Pikachu');
  await button('Apply').click();await expect(button('Apply')).toBeEnabled();
  await button('Overview').click();await button('Vault inventory').click();
  await expect(page.getByLabel('Search copies',{exact:true})).toHaveValue('Desktop Pikachu');
 });
 await check('existing desktop copy tools update price and condition in the selected store copy',async()=>{
  const copyPage=await context.newPage();copyPage.on('pageerror',e=>errors.push(e.message));
  await copyPage.goto(base+'/vault/gvvi/'+f.gvvis.copy);
  await copyPage.getByLabel('Amount',{exact:true}).fill('30');
  await copyPage.getByRole('button',{name:'Save pricing',exact:true}).click();
  await expect(copyPage.getByText('Pricing saved.',{exact:true})).toBeVisible();
  await copyPage.getByRole('combobox',{name:/^Condition/}).selectOption('LP');
  await expect(copyPage.getByText('Condition saved.',{exact:true})).toBeVisible();
  await copyPage.close();
  const data=await (await fetch(base+'/api/stores/'+f.slug)).json();
  const selected=data.items.find(x=>x.id===f.ids.copy);assert.equal(selected.asking_price_amount,30);assert.equal(selected.condition_label,'LP');
 });
 await check('global navigation protects drafts while preview leaves the editor open',async()=>{
  await button('Custom collectibles').click();await button('Edit Desktop display collectible').click();
  await page.getByLabel('Title',{exact:true}).fill('Draft protected from global navigation');
  let dialogs=0;page.removeAllListeners('dialog');page.on('dialog',async d=>{dialogs++;await d.dismiss();});
  const previewPromise=page.waitForEvent('popup');
  await page.getByRole('link',{name:'Preview collectible ↗',exact:true}).click();
  const preview=await previewPromise;await preview.waitForLoadState('domcontentloaded');await preview.close();
  assert.equal(dialogs,0,'New-tab preview must preserve the editor without a discard prompt');
  const vault=page.getByRole('navigation',{name:'Primary navigation',exact:true}).getByRole('link',{name:'Vault',exact:true});
  await vault.click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Draft protected from global navigation');
  assert.equal(dialogs,1);assert.equal(page.url(),base+'/account/store');
  page.removeAllListeners('dialog');page.on('dialog',d=>d.accept());
  await vault.click();await page.waitForURL(base+'/vault');
  await page.goto(base+'/account/store');await button('Custom collectibles').waitFor();
  product=(await (await api('/api/stores/owner/products')).json()).products[0];
  assert.equal(product.title,'Desktop display collectible','Discarding must not save changes');
 });
 await check('concurrent edit rejects stale save and retains entered draft until explicit reload',async()=>{
  await button('Custom collectibles').click();await button('Edit Desktop display collectible').click();
  await page.getByLabel('Title',{exact:true}).fill('Unsaved desktop title');
  page.removeAllListeners('dialog');page.once('dialog',d=>d.dismiss());
  await button('Overview').click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Unsaved desktop title');
  page.on('dialog',d=>d.accept());
  product=(await (await api('/api/stores/owner/products')).json()).products[0];
  const changed=await api('/api/stores/owner/products',{id:product.id,version:product.version,action:'save',data:{available_quantity:3}});assert.equal(changed.status(),200);
  await button('Save collectible changes').click();await expect(page.getByRole('alert').filter({hasText:'Product changed'})).toContainText('Reload before saving');await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Unsaved desktop title');
  await button('Reload latest version').click();await notice('Latest version loaded.');await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Desktop display collectible');
  await expect(page.getByLabel('Available quantity',{exact:true})).toHaveValue('3');
 });
 await check('stock zero unpublishes; restoring stock requires explicit republishing',async()=>{
  await page.getByLabel('Available quantity',{exact:true}).fill('0');await button('Save collectible changes').click();await notice('Collectible saved.');await expect(button('Publish collectible')).toBeDisabled();
  await page.getByLabel('Available quantity',{exact:true}).fill('4');await button('Save collectible changes').click();await notice('Collectible saved.');await expect(button('Publish collectible')).toBeEnabled();
  product=(await (await api('/api/stores/owner/products')).json()).products[0];assert.equal(product.published,false);
  await button('Publish collectible').click();await notice('Publication updated.');
 });
 await check('foreign owner cannot load/edit/upload private products; app-only owner cannot publish web',async()=>{
  const other=await browser.newContext({viewport:{width:1280,height:900}});await other.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const p=await other.newPage();
  await login(p,'other');await p.getByRole('button',{name:'Store details',exact:true}).click();await p.getByLabel('Store name',{exact:true}).fill('App-only desktop shop');await p.getByLabel('Store URL slug',{exact:true}).fill('other-'+f.run);await p.getByRole('button',{name:'Create draft store',exact:true}).click();await expect(p.getByRole('status').filter({hasText:'Saved.'})).toBeVisible();
  await p.getByRole('button',{name:'Overview',exact:true}).click();await expect(p.getByRole('button',{name:'Publish web store',exact:true})).toBeDisabled();
  const read=await other.request.get(base+'/api/stores/owner/products?id='+product.id);assert.equal((await read.json()).products.length,0);
  const media=await other.request.get(base+`/api/stores/owner/media?product=${product.id}&photo=${product.photo_paths[0].split('/').pop()}`);assert.equal(media.status(),404);
  const upload=await other.request.post(base+'/api/stores/owner/media',{headers:{origin:base},multipart:{kind:'product',product:product.id,file:{name:'photo.png',mimeType:'image/png',buffer:fs.readFileSync('.local/storefront/device-fixture.png')}}});assert.equal(upload.status(),404);
  const edit=await other.request.post(base+'/api/stores/owner/products',{headers:{origin:base},data:{id:product.id,version:product.version,action:'save',data:{title:'Forged'}}});assert.equal(edit.status(),403);
  const publish=await other.request.post(base+'/api/stores/owner',{headers:{origin:base},data:{action:'publish',surface:'web',publish:true}});assert.equal(publish.status(),403);
  await other.close();
 });
 await check('responsive management and archive retain history without checkout controls',async()=>{
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:local+'/desktop-responsive-editor.png',fullPage:true});
  assert.equal(await page.getByRole('button',{name:/checkout|buy now/i}).count(),0);
  await button('Archive collectible').click();await notice('Collectible archived.');await expect(button('Publish collectible')).toBeDisabled();
  product=(await (await api('/api/stores/owner/products')).json()).products[0];assert(product.archived_at);assert(!product.published);
  assert.equal(errors.length,0,errors.join('\n'));
 });
}finally{
 await browser.close();
 fs.writeFileSync(local+'/desktop-browser-receipt.json',JSON.stringify({recordedAt:new Date().toISOString(),realLocalAuth:true,results,pageErrors:errors},null,2)+'\n');
}
