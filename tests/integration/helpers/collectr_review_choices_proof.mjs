import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const origin='http://127.0.0.1:58863';

export async function proveCollectrReviewChoices({root,status,runDir,user,db,caller}) {
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 const set=randomUUID(),setName='Synthetic review '+set;
 await db.query('insert into sets(id,code,name,game) values($1,$2,$3,$4)',[set,'syn-'+set,setName,'pokemon']);
 const candidates=[];
 for(const variant of ['', 'play_pokemon_stamp','prerelease_stamp']){
  const id=randomUUID(),gv='GV-REVIEW-'+id,printing=variant==='prerelease_stamp'?null:randomUUID();
  await db.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,variant_key) values($1,$2,$3,'Synthetic Choice','7',$4,(select id from games where code='pokemon'),'pokemon_eng_standard',$5)",[id,set,'syn-'+set,gv,variant]);
  if(printing)await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'reverse')",[printing,id]);
  candidates.push({id,gv,printing});
 }
 const [ordinary,stamped,unverified]=candidates;
 const base={'Product Name':'Synthetic Choice',Category:'Pokemon',Set:setName,'Card Number':'007',Variance:'Reverse Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'4.25','Portfolio Name':'Synthetic private','Notes':'Original retained source'};
 const source=[base,{...base,Grade:'PSA 10',Quantity:'1'},{...base,Variance:'Surge Foil',Quantity:'1'}];
 const headers=Object.keys(base),csvText=[headers,...source.map(r=>headers.map(k=>r[k]))].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
 const target=c=>({sourceIndices:[0],cardId:c.id,gvId:c.gv,cardPrintingId:c.printing});
 const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows;
 const before=await copies();
 const send=attempt=>fetch(origin+'/api/vault/import',{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({operation:'save',ownerUserId:user.id,attempt:{version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,fileName:'review.csv',...attempt}})});
 for(const bad of [{...target(unverified),cardPrintingId:stamped.printing},{...target(stamped),sourceIndices:[1]},{...target(stamped),sourceIndices:[2]}])assert.equal((await send({targets:[bad]})).status,400);
 assert.deepEqual(await copies(),before);
 const require=createRequire(root+'/apps/web/package.json'),{chromium,expect}=require('@playwright/test'),{createServerClient}=require('@supabase/ssr');
 let cookies=[];
 const auth=createServerClient(status.API_URL,status.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{cookies=values;}}});
 assert.equal((await auth.auth.setSession(user.session)).error,null);
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,secure:false,sameSite:'Lax'})));
  const page=await context.newPage();
  await page.goto(origin+'/vault/import');
  await page.getByRole('heading',{name:'Import your collection',exact:true}).waitFor();
  const upload=()=>page.locator('#collectr-csv').setInputFiles({name:'review.csv',mimeType:'text/csv',buffer:Buffer.from(csvText)});
  const radio=c=>page.locator('label').filter({hasText:c.gv}).locator('input[type="radio"]');
  const open=async()=>{
   const summary=page.getByText('Review matching cards (3)',{exact:true});
   if(!await summary.evaluate(element=>element.closest('details').open))await summary.click();
  };
  const none=()=>page.getByText('3 source rows · 0 ready (0 copies) · 3 need review',{exact:true}).waitFor();
  const chosen=()=>page.getByText('3 source rows · 1 ready (2 copies) · 2 need review',{exact:true}).waitFor();
  await upload();await none();await open();
  await expect(page.getByRole('radio',{name:'Keep in review',exact:true})).toBeChecked();
  await expect(radio(unverified)).toBeDisabled();
  const link=page.getByRole('link',{name:`View Synthetic Choice, ${stamped.gv}, card and printing`,exact:true});
  await expect(link).toHaveAttribute('href',`/card/${stamped.gv}?printing=${stamped.printing}`);await expect(link).toHaveAttribute('target','_blank');
  await radio(ordinary).check();await chosen();await radio(stamped).check();await chosen();
  await page.getByRole('radio',{name:'Keep in review',exact:true}).check();await none();
  await radio(stamped).check();await chosen();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:runDir+'/review-choices-mobile.png',fullPage:true});
  let interrupted=false;
  await page.route('**/api/vault/import',async route=>{
   if(!interrupted&&route.request().postDataJSON().operation==='save'){
    interrupted=true;const response=await route.fetch();assert.equal(response.status(),200,await response.text());await route.abort('failed');
   }else await route.continue();
  });
  await page.getByRole('button',{name:'Save 2 ready copies and retain review rows',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.ok(interrupted);
  for(const input of await page.getByRole('radio').all())await expect(input).toBeDisabled();
  await expect(page.getByRole('button',{name:'Review selections again'})).toHaveCount(0);
  const pending=await page.evaluate(id=>JSON.parse(sessionStorage.getItem('vault-import:v2:'+id)),user.id);
  assert.equal(pending.csvText,csvText);assert.deepEqual(pending.targets,[target(stamped)]);
  await page.reload();await page.getByRole('button',{name:'Retry saved import',exact:true}).click();
  await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();
  await page.getByText('2 copies added. 2 source rows retained for review.',{exact:true}).waitFor();
  const after=await copies(),added=after.filter(c=>c.card_print_id===stamped.id);
  assert.equal(added.length,2);for(const c of added){assert.equal(c.card_printing_id,stamped.printing);assert.equal(c.condition_label,'LP');assert.equal(Number(c.acquisition_cost),4.25);assert.equal(c.notes,base.Notes);}
  assert.deepEqual(after.filter(c=>!candidates.some(x=>x.id===c.card_print_id)),before);
  const sha=createHash('sha256').update(csvText).digest('hex');
  const doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',sha).single();assert.equal(doc.error,null);assert.deepEqual(doc.data.source_rows,source);
  // A new attempt cannot rebind the same source row to another card. A
  // confirmed conflict may reopen review; an uncertain save above could not.
  await upload();await none();await open();await radio(ordinary).check();
  await page.getByRole('button',{name:'Save 2 ready copies and retain review rows',exact:true}).click();
  await page.getByRole('button',{name:'Review selections again',exact:true}).waitFor();
  assert.deepEqual(await copies(),after);
  await page.getByRole('button',{name:'Review selections again',exact:true}).click();await none();await open();
  await radio(stamped).check();await page.getByRole('button',{name:'Save 2 ready copies and retain review rows',exact:true}).click();
  await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();
  await page.getByText('0 copies added. 2 source rows retained for review.',{exact:true}).waitFor();
  assert.deepEqual(await copies(),after);
  await page.screenshot({path:runDir+'/review-choices-verified.png',fullPage:true});
  fs.writeFileSync(runDir+'/review-choices-result.json',JSON.stringify({status:'PASS',choices:3,unverifiedDisabled:true,noAutomaticChoice:true,sourcePreserved:true,finishPreserved:true,gradesHeld:true,retrySameTargets:true,retargetRejected:true,confirmedFailureReview:true,exactCopies:2,productionWrites:0},null,2),{flag:'wx'});
  await context.close();
 // The parent harness owns this shared session; revoking it here would break
 // the following browser journey that deliberately uses the same account.
 }finally{await browser.close();await auth.auth.stopAutoRefresh();}
}
