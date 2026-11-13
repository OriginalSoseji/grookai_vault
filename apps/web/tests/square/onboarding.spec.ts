import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import AxeBuilder from '@axe-core/playwright';

const root='C:/grookai_square_onboarding_20261112';
const qualification='C:/grookai_vault_operator_artifacts/square_onboarding_20261112/candidate-v3';
const artifacts=qualification+'/web-v4';
fs.mkdirSync(artifacts,{recursive:true});
const lab=qualification+'/fresh-495',project='square-onboard-fresh-v3-495-20261113';
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
if(cfg.API_URL!=='http://127.0.0.1:63341'||fs.existsSync(lab+'/supabase/.temp/project-ref'))throw Error('Unqualified local test target');
if(!JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal)throw Error('Local network must be isolated');
const {localSupabaseStatusSecret}=createRequire(root+'/backend/package.json')(root+'/scripts/lib/local_supabase_cli_status_v1.mjs') as {localSupabaseStatusSecret:(status:Record<string,unknown>)=>string};
const admin=createClient(cfg.API_URL,localSupabaseStatusSecret(cfg),{auth:{persistSession:false,autoRefreshToken:false}});
const sql=(query:string)=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',windowsHide:true}).trim();
const pin=createHash('sha256').update(fs.readFileSync(root+'/supabase/migrations/20261113050000_square_self_service_onboarding_v1.sql')).digest('hex');
type BrowserUser={id:string;email:string;password:string};
let browserUser:BrowserUser;
let setupUser:BrowserUser;
const checks:string[]=[];
const sourceFiles=['apps/web/src/components/square/SquareManager.tsx','apps/web/src/components/square/SquareReturn.tsx','apps/web/src/components/square/SquareManager.module.css','apps/web/src/app/api/square/route.ts','apps/web/src/app/api/square/oauth/launch/route.ts','apps/web/src/app/api/square/oauth/callback/route.ts','apps/web/src/app/square/return/page.tsx','apps/web/src/app/square/reconnect/page.tsx','backend/square/service_v1.mjs','backend/square/commerce_backend_v2.mjs','apps/web/tests/square/onboarding.spec.ts','apps/web/next.config.mjs','apps/web/src/lib/collectorStaging.mjs'];
const hashSource=(file:string)=>createHash('sha256').update(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')).digest('hex');
const sourceHashes=Object.fromEntries(sourceFiles.map(file=>[file,hashSource(file)]));
test.beforeAll(async()=>{
  expect(sql('select count(*) from supabase_migrations.schema_migrations')).toBe('495');
  expect(sql('select enabled from grookai_square.onboarding_controls where singleton')).toBe('t');
  const email='square-browser-'+randomUUID()+'@fixture.invalid',password='Local-'+randomUUID()+'!';
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});expect(created.error).toBeNull();
  browserUser={id:created.data.user!.id,email,password};
  sql(`insert into public.user_entitlements(user_id,tier,role,features) values('${browserUser.id}','vendor','vendor','{"vendor_tools":true}');`);
  fs.writeFileSync(lab+'/browser-user-'+browserUser.id+'.private.json',JSON.stringify(browserUser),{flag:'wx',mode:0o600});
  const setupEmail='square-setup-'+randomUUID()+'@fixture.invalid',setupPassword='Local-'+randomUUID()+'!';
  const setup=await admin.auth.admin.createUser({email:setupEmail,password:setupPassword,email_confirm:true});expect(setup.error).toBeNull();
  setupUser={id:setup.data.user!.id,email:setupEmail,password:setupPassword};
  sql(`insert into public.user_entitlements(user_id,tier,role,features) values('${setupUser.id}','vendor','vendor','{"vendor_tools":true}');`);
  fs.writeFileSync(lab+'/setup-user-'+setupUser.id+'.private.json',JSON.stringify(setupUser),{flag:'wx',mode:0o600});
  const owner=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  expect((await owner.auth.signInWithPassword({email:setupEmail,password:setupPassword})).error).toBeNull();
  expect((await owner.rpc('square_onboarding_enroll_v1')).error).toBeNull();
  const catalogModule=await import(pathToFileURL(root+'/backend/square/service_v1.mjs').href);
  const merchant='web'+setupUser.id.replaceAll('-','');let state='';
  const catalog=new catalogModule.SquareCatalogService({config:{environment:'sandbox',appId:'sandbox-fixture-app',appSecret:'fixture-only-secret',encryptionKey:Buffer.alloc(32,17).toString('base64'),callbackUrl:'https://example.invalid/api/square/oauth/callback',linkingEnabled:true,catalogEnabled:true,commerceEnabled:true},
    rpc:async(action:string,data:Record<string,unknown>)=>{const result=await admin.rpc('square_commerce_service_v2',{p_action:action,p_data:data});if(result.error)throw Error(result.error.message);return result.data;},
    clientFactory:()=>({authorizationUrl:(input:{state:string})=>{state=input.state;return'https://connect.squareupsandbox.com/oauth2/authorize';},obtainToken:async()=>({merchantId:merchant,accessToken:'synthetic-local-access',refreshToken:'synthetic-local-refresh',expiresAt:'2099-01-01T00:00:00Z'}),merchant:async()=>({id:merchant})})});
  const start=await catalog.start(setupUser.id,{clientReturn:'web'}),launch=await catalog.launch(new URL(start.launchUrl).searchParams.get('capability'));
  await catalog.callback({state,browserNonce:launch.browserNonce,code:'local-fixture-only'});
});
test.afterAll(()=>{
  if(checks.length!==9)return;
  for(const[file,pin]of Object.entries(sourceHashes))expect(hashSource(file)).toBe(pin);
  fs.writeFileSync(artifacts+'/web-proof.json',JSON.stringify({pass:true,candidateSha256:pin,checks,actualLocalAuth:true,simulatedSquareProvider:true,noInventoryPublished:true,sourceHashes,productionWrites:0},null,2),{flag:'wx'});
});
async function signIn(page:import('@playwright/test').Page,user:BrowserUser){
  await page.goto('/login?next=%2Faccount%2Fconnections%2Fsquare');
  await page.getByRole('textbox',{name:'Email',exact:true}).fill(user.email);
  await page.getByRole('textbox',{name:'Password',exact:true}).fill(user.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/\/account\/connections\/square$/);
  await expect(page.getByRole('heading',{name:/^(Connect Square|Square)$/})).toBeVisible();
}
async function locations(page:import('@playwright/test').Page,rows:Array<{id:string;name:string}>,fail=false){
  await page.route('**/api/square',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='locations'){
      await route.fulfill({status:fail?503:200,json:fail?{error:'Fixture provider unavailable'}:{locations:rows}});return;
    }
    await route.continue();
  });
}
async function accessible(page:import('@playwright/test').Page){
  const result=await new AxeBuilder({page}).include('[aria-busy]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(violation=>violation.impact==='serious'||violation.impact==='critical')).toEqual([]);
}

test('new vendor can start Square after actual grookai website sign-in and cancel without a second login',async({page})=>{
  await signIn(page,browserUser);
  const connect=page.getByRole('button',{name:'Connect Square',exact:true});await expect(connect).toBeEnabled();
  expect(sql(`select count(*) from grookai_square.onboarding_grants where owner_id='${browserUser.id}'`)).toBe('0');
  await page.screenshot({path:artifacts+'/web-new-vendor-desktop.png',fullPage:true});
  await accessible(page);
  await page.getByRole('button',{name:'Use light mode',exact:true}).click();
  await accessible(page);
  await page.screenshot({path:artifacts+'/web-new-vendor-desktop-light.png',fullPage:true});
  await page.getByRole('button',{name:'Use dark mode',exact:true}).click();
  let providerUrl:URL|undefined;let oauthCookies='';
  await page.route('**/api/square/oauth/launch?*',async route=>{
    const response=await route.fetch({maxRedirects:0});expect(response.status()).toBe(303);
    providerUrl=new URL(response.headers().location);
    expect(providerUrl.origin).toBe('https://connect.squareupsandbox.com');
    oauthCookies=response.headersArray().filter(header=>header.name.toLowerCase()==='set-cookie').map(header=>header.value.split(';')[0]).join('; ');
    const headers:Record<string,string>={...response.headers(),'content-type':'text/html'};delete headers.location;
    // Hold the external provider boundary locally; no browser or token request
    // reaches Square. Preserve the actual server nonce and consumed capability.
    await route.fulfill({status:200,headers,body:'<h1>Local Square consent boundary</h1>'});
  });
  await page.route('**/api/square',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='link'){
      const response=await route.fetch(),value=await response.json(),launch=new URL(value.launchUrl);
      expect(launch.origin).toBe('https://example.invalid');expect(launch.pathname).toBe('/api/square/oauth/launch');
      // Local HTTP transport substitutes only the test callback origin. The
      // actual one-use capability, server state, cookies and routes are retained.
      value.launchUrl='http://127.0.0.1:63380'+launch.pathname+launch.search;
      await route.fulfill({response,json:value});return;
    }await route.continue();
  });
  await connect.click();await expect(page.getByRole('heading',{name:'Local Square consent boundary',exact:true})).toBeVisible();
  const state=providerUrl!.searchParams.get('state');expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(sql(`select count(*) from grookai_square.onboarding_grants where owner_id='${browserUser.id}'`)).toBe('1');
  // Local HTTP cannot promise browser delivery of production Secure cookies.
  // Replay the real returned cookie on the actual callback, then navigate the
  // unchanged grookai browser session to its sanitized server destination.
  const callback=await page.context().request.get('/api/square/oauth/callback?state='+encodeURIComponent(state!)+'&error=access_denied',{headers:{Cookie:oauthCookies},maxRedirects:0});
  expect(callback.status()).toBe(303);
  await page.goto(callback.headers().location);
  await expect(page).toHaveURL(/\/account\/connections\/square\?status=reconnect_required$/);
  await expect(page.getByText('The Square connection was not completed. You can connect again.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Connect Square',exact:true})).toBeEnabled();
  expect(page.url()).not.toContain(state!);checks.push('actual fresh vendor website login, real start/launch, safe cancellation and retained grookai session');
});
test('leaving a slow connection request cannot redirect the user back into Square',async({page})=>{
  let finish:()=>void=()=>{},requested=false;
  const held=new Promise<void>(resolve=>{finish=resolve;});
  const launches:string[]=[];
  page.on('request',request=>{if(request.isNavigationRequest()&&new URL(request.url()).pathname==='/api/square/oauth/launch')launches.push('launch');});
  await page.route('**/api/square',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='link'){
      requested=true;await held;
      await route.fulfill({json:{launchUrl:'http://127.0.0.1:63380/api/square/oauth/launch?capability='+'a'.repeat(43)}});return;
    }await route.continue();
  });
  await signIn(page,browserUser);
  await page.getByRole('button',{name:'Connect Square',exact:true}).click();
  await expect.poll(()=>requested).toBe(true);
  await page.getByRole('link',{name:'Back to account',exact:true}).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading',{name:'Your grookai profile',exact:true})).toBeVisible();
  finish();await page.waitForTimeout(1000);
  expect(launches).toEqual([]);await expect(page).toHaveURL(/\/account$/);
  checks.push('leaving a slow connection request cancels the browser handoff');
});
test('a single location is selected automatically without saving or allocating inventory',async({page})=>{
  await locations(page,[{id:'fixtureLocation',name:'My shop'}]);
  await signIn(page,setupUser);
  await expect(page.getByRole('combobox',{name:'Square location',exact:true}).first()).toHaveValue('fixtureLocation');
  await expect(page.getByRole('button',{name:'Enable automatic Square sales',exact:true})).toBeEnabled();
  expect(sql(`select location_id is null from grookai_square.connections where owner_id='${setupUser.id}'`)).toBe('t');
  expect(sql('select count(*) from grookai_square.allocations')).toBe('0');checks.push('automatic single-location loading performs no configuration or stock writes');
});
test('multiple locations need a deliberate choice',async({page})=>{
  await locations(page,[{id:'one',name:'First shop'},{id:'two',name:'Second shop'}]);await signIn(page,setupUser);
  const select=page.getByRole('combobox',{name:'Square location',exact:true}).first();
  await expect(select).toHaveValue('');await expect(page.getByRole('button',{name:'Enable automatic Square sales',exact:true})).toBeDisabled();
  await select.selectOption('two');await expect(page.getByRole('button',{name:'Enable automatic Square sales',exact:true})).toBeEnabled();
  expect(sql(`select location_id is null from grookai_square.connections where owner_id='${setupUser.id}'`)).toBe('t');checks.push('multiple-location choice stays unsaved until explicit enable');
});
test('missing locations give recovery guidance',async({page})=>{
  await locations(page,[]);await signIn(page,setupUser);
  await expect(page.getByText('No active USD location was found.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry locations',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Enable automatic Square sales',exact:true})).toBeDisabled();checks.push('empty merchant locations have actionable recovery');
});
test('location outages can be retried without reconnecting',async({page})=>{
  let fail=true;
  await page.route('**/api/square',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='locations'){
      await route.fulfill({status:fail?503:200,json:fail?{error:'Unavailable'}:{locations:[{id:'fixtureLocation',name:'My shop'}]}});return;
    }await route.continue();
  });
  await signIn(page,setupUser);await expect(page.getByText('Could not load Square locations. Try again.')).toBeVisible();
  fail=false;await page.getByRole('button',{name:'Retry locations',exact:true}).click();
  await expect(page.getByRole('button',{name:'Enable automatic Square sales',exact:true})).toBeEnabled();checks.push('provider read failure is recoverable in place');
});
test('explicit enable persists actual owner settings; phone and desktop show the ready workflow',async({page})=>{
  const catalogModule=await import(pathToFileURL(root+'/backend/square/service_v1.mjs').href);
  const catalog=new catalogModule.SquareCatalogService({config:{environment:'sandbox',appId:'sandbox-fixture-app',appSecret:'fixture-only-secret',encryptionKey:Buffer.alloc(32,17).toString('base64'),callbackUrl:'https://example.invalid/api/square/oauth/callback',linkingEnabled:true,catalogEnabled:true,commerceEnabled:true},
    rpc:async(action:string,data:Record<string,unknown>)=>{const result=await admin.rpc('square_commerce_service_v2',{p_action:action,p_data:data});if(result.error)throw Error(result.error.message);return result.data;},
    clientFactory:()=>({locations:async()=>[{id:'fixtureLocation',name:'My shop'}]})});
  let configured=0;
  await page.route('**/api/square',async route=>{
    const body=route.request().method()==='POST'?route.request().postDataJSON():null;
    if(body?.action==='locations'){await route.fulfill({json:{locations:[{id:'fixtureLocation',name:'My shop'}]}});return;}
    if(body?.action==='configure'){
      expect(body.autoSync).toBe(true);expect(body.locationId).toBe('fixtureLocation');configured++;
      const result=await catalog.configure(setupUser.id,body.connectionId,{locationId:body.locationId,autoSync:body.autoSync});
      await route.fulfill({json:result});return;
    }await route.continue();
  });
  await signIn(page,setupUser);
  await page.getByRole('button',{name:'Enable automatic Square sales',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Automatic Square sales are on',exact:true})).toBeVisible();
  expect(configured).toBe(1);
  expect(sql(`select auto_sync from grookai_square.connections where owner_id='${setupUser.id}'`)).toBe('t');
  expect(sql(`select p.auto_enroll and p.sell_on_square from grookai_square.preferences p join grookai_square.connections c on c.id=p.connection_id where c.owner_id='${setupUser.id}'`)).toBe('t');
  expect(sql('select count(*) from grookai_square.allocations')).toBe('0');
  await expect(page.getByRole('button',{name:'Reconnect Square',exact:true})).toBeHidden();
  await expect(page.getByRole('button',{name:'Enable automatic Square sales',exact:true})).toHaveCount(0);
  expect(await page.locator('main').last().evaluate(element=>getComputedStyle(element).fontFamily)).toContain('Roboto');
  await page.screenshot({path:artifacts+'/web-ready-desktop.png',fullPage:true});
  await page.setViewportSize({width:393,height:852});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:artifacts+'/web-ready-phone.png',fullPage:true});
  await accessible(page);
  await page.getByRole('button',{name:'Use light mode',exact:true}).click();
  await accessible(page);
  await page.screenshot({path:artifacts+'/web-ready-phone-light.png',fullPage:true});
  checks.push('explicit owner confirmation persists real configuration/preferences without inventory publication; desktop/phone layout and Roboto checked');
});
test('slow location reads serialize with seller operations and ordinary reloads preserve draft choices',async({page})=>{
  let locationsCalled=0,processed=0;
  let releaseLocations!:()=>void;
  const held=new Promise<void>(resolve=>{releaseLocations=resolve;});
  await page.route('**/api/square',async route=>{
    const body=route.request().method()==='POST'?route.request().postDataJSON():null;
    if(body?.action==='locations'){
      locationsCalled++;
      const leaseToken=randomUUID(),connectionId=body.connectionId;
      const lease=await admin.rpc('square_commerce_service_v2',{p_action:'claim',p_data:{ownerId:setupUser.id,connectionId,leaseToken}});expect(lease.error).toBeNull();
      try{await held;}finally{expect((await admin.rpc('square_commerce_service_v2',{p_action:'release',p_data:{ownerId:setupUser.id,connectionId,leaseToken,fence:lease.data.lease_fence}})).error).toBeNull();}
      await route.fulfill({json:{locations:[{id:'fixtureLocation',name:'My shop'},{id:'draftLocation',name:'Other shop'}]}});return;
    }
    if(body?.action==='process'){processed++;await route.fulfill({json:{succeeded:0,failed:0,reviews:0,adoptions:[]}});return;}
    await route.continue();
  });
  try{
    await signIn(page,setupUser);
    await expect.poll(()=>locationsCalled).toBe(1);
    await expect(page.getByRole('button',{name:'Sync pending cards',exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Check Square sales',exact:true})).toBeDisabled();
    await page.getByText('Connection settings',{exact:true}).click();
    await expect(page.getByRole('button',{name:'Reconnect Square',exact:true})).toBeDisabled();
    expect(sql(`select lease_token is not null from grookai_square.connections where owner_id='${setupUser.id}'`)).toBe('t');
    expect(processed).toBe(0);
    releaseLocations();
    const sync=page.getByRole('button',{name:'Sync pending cards',exact:true});await expect(sync).toBeEnabled();
    const location=page.getByRole('combobox',{name:'Square location',exact:true});await location.selectOption('draftLocation');
    const autoSync=page.getByRole('checkbox',{name:'Keep names, conditions and asking prices updated automatically.',exact:true});await autoSync.uncheck();
    for(let n=1;n<=2;n++){
      const refreshed=page.waitForResponse(response=>response.request().method()==='GET'&&new URL(response.url()).pathname==='/api/square');
      await sync.click();await refreshed;await expect(sync).toBeEnabled();
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      expect(processed).toBe(n);expect(locationsCalled).toBe(1);
      await expect(location).toHaveValue('draftLocation');await expect(autoSync).not.toBeChecked();
    }
    expect(sql(`select location_id='fixtureLocation' and auto_sync from grookai_square.connections where owner_id='${setupUser.id}'`)).toBe('t');
    expect(sql('select count(*) from grookai_square.allocations')).toBe('0');
    checks.push('a held actual local connection lease disables competing operations; two actual workspace reloads neither reread locations nor discard unsaved location/catalog choices; command/provider replies are simulated and publish no inventory');
  }finally{releaseLocations();}
});

test('an existing seller can recover from authorization failure without losing settings',async({page})=>{
  let failed=false;
  await page.route('**/api/square',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='locations'){
      if(!failed){
        failed=true;
        const connectionId=route.request().postDataJSON().connectionId,leaseToken=randomUUID();
        const lease=await admin.rpc('square_commerce_service_v2',{p_action:'claim',p_data:{ownerId:setupUser.id,connectionId,leaseToken}});expect(lease.error).toBeNull();
        const denied=await admin.rpc('square_connection_authorization_failed_v1',{p_connection:connectionId,p_owner:setupUser.id,p_token:leaseToken,p_fence:lease.data.lease_fence});expect(denied.error).toBeNull();
        expect((await admin.rpc('square_commerce_service_v2',{p_action:'release',p_data:{ownerId:setupUser.id,connectionId,leaseToken,fence:lease.data.lease_fence}})).error).toBeNull();
      }
      await route.fulfill({status:409,json:{error:'Reconnect Square to continue.',code:'square_authorization_required'}});return;
    }await route.continue();
  });
  await signIn(page,setupUser);
  await expect(page.getByText('Could not load Square locations. Try again.')).toBeVisible();
  await page.getByRole('button',{name:'Retry locations',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reconnect Square',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Reconnect Square',exact:true})).toBeVisible();
  expect(sql(`select p.auto_enroll and p.sell_on_square from grookai_square.preferences p join grookai_square.connections c on c.id=p.connection_id where c.owner_id='${setupUser.id}'`)).toBe('t');
  expect(sql('select count(*) from grookai_square.allocations')).toBe('0');
  const grant=sql(`select to_json(g) from grookai_square.onboarding_grants g where owner_id='${setupUser.id}'`);
  const revision=Number(sql('select revision from grookai_square.onboarding_controls where singleton'));
  expect((await admin.rpc('square_onboarding_controls_set_v1',{p_expected_revision:revision,p_enabled:false})).error).toBeNull();
  let reconnectStarted=false;
  await page.route('**/api/square/oauth/launch?*',async route=>{
    // Stop at the external consent boundary; this test verifies the real owner
    // POST route without contacting Square or consuming the launch capability.
    await route.fulfill({status:200,contentType:'text/html',body:'<h1>Reconnect consent boundary</h1>'});
  });
  await page.route('**/api/square',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='link'){
      const response=await route.fetch();expect(response.status()).toBe(200);
      const value=await response.json(),launch=new URL(value.launchUrl);
      expect(launch.origin).toBe('https://example.invalid');expect(launch.pathname).toBe('/api/square/oauth/launch');
      // As in the new-vendor test, substitute only the fixture callback origin
      // so the production same-origin launch guard remains fully exercised.
      value.launchUrl='http://127.0.0.1:63380'+launch.pathname+launch.search;
      reconnectStarted=true;await route.fulfill({response,json:value});return;
    }await route.fallback();
  });
  await page.getByRole('button',{name:'Reconnect Square',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Reconnect consent boundary',exact:true})).toBeVisible();
  expect(reconnectStarted).toBe(true);
  expect(sql(`select to_json(g) from grookai_square.onboarding_grants g where owner_id='${setupUser.id}'`)).toBe(grant);
  expect(sql(`select p.auto_enroll and p.sell_on_square from grookai_square.preferences p join grookai_square.connections c on c.id=p.connection_id where c.owner_id='${setupUser.id}'`)).toBe('t');
  checks.push('existing seller authorization recovery preserves preferences and the actual owner POST can reconnect while new enrollment is paused, without changing the grant or contacting Square');
});
