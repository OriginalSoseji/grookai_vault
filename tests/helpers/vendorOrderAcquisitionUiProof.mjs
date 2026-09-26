import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {acquisitionIds} from '../../apps/web/src/lib/orders/orderAcquisitionService.ts';
import {purchaseHref} from '../../apps/web/src/lib/orders/orderAcquisitionTypes.ts';

export async function proveAcquisitionUi({db,context,login,sp,buyer,s,base,expect,dir,products,photoPaths,orders,reservations,checks}) {
 const product=randomUUID(),photo=`${s.store}/products/${product}/synthetic.jpg`;products.push(product);photoPaths.push(photo);
 await db.query("insert into storage.objects(bucket_id,name) values('vendor-store-media',$1)",[photo]);
 await db.query("insert into vendor_store_custom_products(id,store_id,title,description,asking_price_amount,available_quantity,photo_paths,published) values($1,$2,'Quote journey collectible','Synthetic fixture',12.34,3,array[$3],true)",[product,s.store,photo]);
 await db.query("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Quote fixture',true,true) on conflict(user_id) do update set slug=excluded.slug,display_name=excluded.display_name,public_profile_enabled=true,vault_sharing_enabled=true",[s.owner,`quote-${product}`]);
 await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor','{\"store_app\":true,\"store_web\":true}')",[s.owner]);
 await db.query('update vendor_stores set app_published=true,web_published=true where id=$1',[s.store]);
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 await db.query('update vendor_stock_rollout set reservations_enabled=true');
 await db.query('update vendor_orders_rollout set orders_enabled=true');
 const selection={storeId:s.store,itemId:product,kind:'custom',quantity:2},href=purchaseHref(selection);
 const bc=await context(),page=await login(bc,buyer,href);
 const slug=(await db.query('select slug from vendor_stores where id=$1',[s.store])).rows[0].slug;
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/store/'+slug);
 await expect(page.getByRole('link',{name:'Review order',exact:true})).toHaveCount(1);
 await page.getByRole('link',{name:'Review order',exact:true}).click();await expect(page.getByRole('heading',{name:'Review your order',exact:true})).toBeVisible();
 const before=(await db.query('select count(*) n from vendor_stock_reservations where product_id=$1',[product])).rows[0].n;
 await page.goto(base+href);assert.equal((await db.query('select count(*) n from vendor_stock_reservations where product_id=$1',[product])).rows[0].n,before);
 await page.getByRole('button',{name:'Get quote',exact:true}).click();await expect(page.getByText('$24.68 USD',{exact:true})).toBeVisible();
 const anchor=new URL(page.url()).searchParams.get('request'),ids=acquisitionIds(buyer.id,anchor);orders.push(ids.order);reservations.push(ids.reservation);
 assert.equal((await db.query('select count(*) n from vendor_orders where id=$1',[ids.order])).rows[0].n,'0');
 const expiry=(await db.query('select expires_at from vendor_stock_reservations where id=$1',[ids.reservation])).rows[0].expires_at;
 await page.screenshot({path:path.join(dir,'desktop-quote-review.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Get quote',exact:true}).click();await expect(page.getByText('$24.68 USD',{exact:true})).toBeVisible();
 assert.deepEqual((await db.query('select expires_at from vendor_stock_reservations where id=$1',[ids.reservation])).rows[0].expires_at,expiry);
 await page.getByRole('button',{name:'Confirm order',exact:true}).click();await page.waitForURL(base+'/account/orders/'+ids.order);
 await expect(page.getByRole('button',{name:'Continue to payment',exact:true})).toBeVisible();
 assert.deepEqual((await db.query('select paid,unit_amount_minor,quantity from vendor_orders where id=$1',[ids.order])).rows[0],{paid:false,unit_amount_minor:'1234',quantity:2});
 assert.equal((await db.query('select count(*) n from vendor_order_attempts where order_id=$1',[ids.order])).rows[0].n,'1');
 await page.goto(base+purchaseHref(selection,anchor));await page.getByRole('button',{name:'Get quote',exact:true}).click();await page.waitForURL(base+'/account/orders/'+ids.order);
 await sp.goto(base+'/account/orders/'+ids.order);await expect(sp.getByRole('button',{name:'Continue to payment',exact:true})).toHaveCount(0);
 // Browser-only failed redirect fixture: provider transport remains blocked.
 await bc.route('**/api/vendor-orders/checkout',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({state:'open',orderId:ids.order,url:'https://evil.invalid/pay'})}));
 await page.getByRole('button',{name:'Continue to payment',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Unexpected payment destination.'})).toHaveText('Unexpected payment destination.');assert.equal(new URL(page.url()).pathname,'/account/orders/'+ids.order);
 await bc.unroute('**/api/vendor-orders/checkout');
 checks.push('compiled store entry and sign-in preserves purchase destination; GET without mutation; actual quote/hold/confirmation with server totals, reload-stable expiry and one durable order/attempt; buyer-only payment control rejects mocked foreign destination');
 const cancelHref=purchaseHref({...selection,quantity:1});await page.goto(base+cancelHref);await page.getByRole('button',{name:'Get quote',exact:true}).click();await expect(page.getByText('$12.34 USD',{exact:true})).toBeVisible();
 const cancel=acquisitionIds(buyer.id,new URL(page.url()).searchParams.get('request'));reservations.push(cancel.reservation);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:path.join(dir,'mobile-quote-review.png'),fullPage:true});
 await page.getByRole('button',{name:'Release hold',exact:true}).click();await expect(page.getByRole('button',{name:'Get quote',exact:true})).toBeVisible();
 assert.equal((await db.query('select state from vendor_stock_reservations where id=$1',[cancel.reservation])).rows[0].state,'released');assert.equal(new URL(page.url()).searchParams.has('request'),false);
 checks.push('compiled mobile quote and explicit hold cancellation clear retry anchor only after database release');
}
