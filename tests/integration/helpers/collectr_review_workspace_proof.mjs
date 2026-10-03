import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {parseCsv} from '../../../supabase/functions/vault-import-collection-v2/source.ts';
const origin='http://127.0.0.1:58863';

export async function proveCollectrReviewWorkspace({root,status,runDir,user,db}) {
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 const set=randomUUID(),card=randomUUID(),printing=randomUUID(),setName='Synthetic workspace '+set;
 await db.query("insert into sets(id,code,name,game) values($1,$2,$3,'pokemon')",[set,'syn-'+set,setName]);
 await db.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain) values($1,$2,$3,'Synthetic Ready','7',$4,(select id from games where code='pokemon'),'pokemon_eng_standard')",[card,set,'syn-'+set,'GV-WORKSPACE-'+card]);
 await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'holo')",[printing,card]);
 const base={'Product Name':'Synthetic Ready',Category:'Pokemon',Set:setName,'Card Number':'7',Variance:'Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'1',Notes:'Original, "quoted"\nÉtoile'};
 const source=[base,{...base,Notes:'Another copy',Quantity:'2'},...Array.from({length:60},(_,i)=>({...base,'Product Name':'Synthetic Missing '+i,'Card Number':String(100+i)})),{...base,Grade:'PSA 10'},{...base,'Card Number':''}];
 const headers=Object.keys(base),csvText=[headers,...source.map(row=>headers.map(key=>row[key]))].map(row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\r\n');
 const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows,before=await copies();
 const require=createRequire(root+'/apps/web/package.json'),{chromium,expect}=require('@playwright/test'),{createServerClient}=require('@supabase/ssr');
 let cookies=[];const auth=createServerClient(status.API_URL,status.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:value=>{cookies=value;}}});
 assert.equal((await auth.auth.setSession(user.session)).error,null);
 const browser=await chromium.launch();
 try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,secure:false,sameSite:'Lax'})));
  const page=await context.newPage();await page.goto(origin+'/vault/import');await expect(page.locator('#collectr-csv')).toBeEnabled();
  await page.locator('#collectr-csv').setInputFiles({name:'workspace.csv',mimeType:'text/csv',buffer:Buffer.from(csvText)});
  await page.getByText('64 source rows · 2 ready (3 copies) · 62 need review',{exact:true}).waitFor();
  await expect(page.locator('article')).toHaveCount(50);
  await page.getByRole('button',{name:'Show more (14 remaining)',exact:true}).click();await expect(page.locator('article')).toHaveCount(64);
  await page.getByRole('button',{name:'Needs review',exact:true}).click();await expect(page.locator('article')).toHaveCount(50);
  await page.getByLabel('Review task (source rows)',{exact:true}).selectOption('graded');await expect(page.locator('article')).toHaveCount(1);
  await page.getByLabel('Search this import',{exact:true}).fill('PSA 10');await expect(page.locator('article')).toHaveCount(1);
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download all 62 review rows',exact:true}).click();
  const download=await downloadEvent;assert.equal(download.suggestedFilename(),'collectr-review.csv');
  await download.saveAs(runDir+'/workspace-review.csv');assert.deepEqual(parseCsv(fs.readFileSync(runDir+'/workspace-review.csv','utf8')),source.slice(2));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:runDir+'/workspace-mobile.png',fullPage:true});
  await page.getByLabel('Search this import',{exact:true}).fill('does not exist');await expect(page.locator('article')).toHaveCount(0);
  await page.getByText('No entries match these filters. Clear filters to see the full preview.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.locator('article')).toHaveCount(50);
  await page.getByLabel('Search this import',{exact:true}).fill('workspace étoile');await expect(page.locator('article')).toHaveCount(50);
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:runDir+'/workspace-desktop.png',fullPage:true});
  // A filter showing one held row must not hide ready copies from the save.
  await page.getByRole('button',{name:'Needs review',exact:true}).click();await page.getByLabel('Review task (source rows)',{exact:true}).selectOption('number');await expect(page.locator('article')).toHaveCount(1);
  assert.deepEqual(await copies(),before);
  await page.getByRole('button',{name:'Save 3 ready copies and retain review rows',exact:true}).click();
  await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();
  await page.getByText('3 copies added. 62 source rows retained for review.',{exact:true}).waitFor();
  const after=await copies(),added=after.filter(c=>c.card_print_id===card);
  assert.equal(added.length,3);assert.ok(added.every(c=>c.card_printing_id===printing));
  assert.deepEqual(after.filter(c=>c.card_print_id!==card),before);
  await context.close();
 } finally {await browser.close();await auth.auth.stopAutoRefresh();}
 fs.writeFileSync(runDir+'/workspace-result.json',JSON.stringify({status:'PASS',sourceRows:64,downloadedReviewRows:62,filteredSaveCopies:3,pagination:true,originalValuesAndOrder:true,productionWrites:0},null,2),{flag:'wx'});
}
