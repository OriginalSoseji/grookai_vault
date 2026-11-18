async page=>{
 const url='http://127.0.0.1:56377';
 await page.goto(url);await page.setViewportSize({width:1200,height:800});
 const fixture=await(await page.request.get(`${url}/fixture.json`)).json();
 const printing=page.getByRole('combobox',{name:'Exact printing',exact:true});
 const condition=page.getByRole('combobox',{name:'Condition',exact:true});
 const loaded=async(id,cnd)=>page.waitForFunction(({id,cnd})=>{const node=document.querySelector('[data-condition-preview-state]');return node?.getAttribute('data-selected-printing')===id&&node?.getAttribute('data-selected-condition')===cnd&&node?.getAttribute('data-condition-preview-state')==='loaded';},{id,cnd});
 const check=async(id,cnd)=>{
  await loaded(id,cnd);const expected=fixture.prices.find(row=>row.card_printing_id===id&&row.condition===cnd);
  const price=page.locator('[data-condition-amount]');
  if(expected.status==='available'){if(Number(await price.getAttribute('data-condition-amount'))!==expected.amount)throw new Error('Browser source amount mismatch');}
  else if(await price.count()!==0)throw new Error('Unavailable condition inherited a price');
 };
 let checked=0;
 for(const row of fixture.catalog){await printing.selectOption(row.id);for(const cnd of ['NM','LP','MP','HP','DMG']){await condition.selectOption(cnd);await check(row.id,cnd);checked++;}}
 const first=fixture.catalog[0].id;
 await printing.selectOption(first);
 await page.request.post(`${url}/__test/mode?mode=delayedNM`);
 await condition.selectOption('NM');await condition.selectOption('LP');await check(first,'LP');await page.waitForTimeout(1050);await check(first,'LP');
 await page.request.post(`${url}/__test/mode?mode=errorOnce`);await condition.selectOption('MP');await page.getByText('Condition preview could not load.',{exact:true}).waitFor();
 if(await page.locator('[data-condition-amount]').count()!==0)throw new Error('Error retained old price');
 await page.getByRole('button',{name:'Retry',exact:true}).click();await check(first,'MP');
 await page.request.post(`${url}/__test/mode?mode=mismatch`);await condition.selectOption('DMG');await page.getByText('Condition preview could not load.',{exact:true}).waitFor();
 if(await page.locator('[data-condition-amount]').count()!==0)throw new Error('Mismatched response rendered a price');
 await page.request.post(`${url}/__test/mode?mode=normal`);await page.getByRole('button',{name:'Retry',exact:true}).click();await check(first,'DMG');
 await condition.selectOption('NM');await check(first,'NM');
 await page.screenshot({path:'.tmp/condition-pricing-ui/desktop.png',fullPage:true});
 await page.setViewportSize({width:320,height:800});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile layout overflows horizontally');
 if((await condition.boundingBox()).height<44)throw new Error('Condition control is below minimum target height');
 await page.screenshot({path:'.tmp/condition-pricing-ui/mobile.png',fullPage:true});
 await page.evaluate(()=>document.documentElement.classList.add('gv-dark'));await page.screenshot({path:'.tmp/condition-pricing-ui/mobile-dark.png',fullPage:true});
 return{status:'passed',exact_condition_selections:checked,source_available:fixture.prices.filter(row=>row.status==='available').length,source_unavailable:fixture.prices.filter(row=>row.status==='unavailable').length,stale_response_ignored:true,failed_request_clears_price:true,retry_passed:true,mismatched_response_rejected:true,mobile_320px_no_overflow:true};
}
