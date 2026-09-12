import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { createConnection } from 'node:net';
import { writeFileSync, appendFileSync, openSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const api='http://127.0.0.1:54361';
const site='http://127.0.0.1:3168';
const imagePath='warehouse-derived/self-hosted-images-v1/card_prints/sv03.5/gv-pk-mew-200/dd139e022c3b5ed82a68cdf0.webp';
const run=(name,args,input)=>execFileSync(name,args,{cwd:root,input,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true,maxBuffer:64*1024*1024,timeout:240000});
const inspect=name=>JSON.parse(run('docker',['inspect',name]))[0];
const envObject=container=>Object.fromEntries(container.Config.Env.map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)];}));
async function unused(port) {
  await new Promise((resolve,reject)=>{
    const socket=createConnection({port,host:'127.0.0.1'});
    socket.once('connect',()=>{socket.destroy();reject(new Error(`Port ${port} already used`));});
    socket.once('error',error=>error.code==='ECONNREFUSED'?resolve():reject(error));
  });
}
async function ready(url) {
  for(let attempt=0;attempt<60;attempt++) {
    try { const response=await fetch(url,{signal:AbortSignal.timeout(1500)}); if(response.ok) return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error(`Fixture service unavailable: ${new URL(url).pathname}`);
}

// Real GoTrue and PostgREST, each bound to the newly restored fixture database.
// No mock RPCs, production credentials, scheduled functions or source database writes.
export async function startFixtureRuntime({database,out,local}) {
  assert.match(database,/^collector_pricing_replay_\d+$/);
  assert.equal(local.API_URL,'http://127.0.0.1:54321');
  assert.equal(run('git',['branch','--show-current']).trim(),'preview/collector-authenticated-20260910');
  for(const port of [54361,54362,54363,3168]) await unused(port);
  const authSource=inspect('supabase_auth_ycdxbpibncqcchqiihfz');
  const restSource=inspect('supabase_rest_ycdxbpibncqcchqiihfz');
  const network='supabase_network_ycdxbpibncqcchqiihfz';
  assert.ok(authSource.NetworkSettings.Networks[network]);
  const authOriginal=envObject(authSource), restOriginal=envObject(restSource);
  const auth={};
  for(const [key,value] of Object.entries(authOriginal)) {
    if (/^GOTRUE_(DB_|JWT_|API_|SECURITY_|PASSWORD_|RATE_LIMIT_)/.test(key)) auth[key]=value;
  }
  const pinDatabase=value=>{
    const url=new URL(value);
    assert.equal(url.hostname,'supabase_db_ycdxbpibncqcchqiihfz');
    assert.equal(url.pathname,'/postgres');
    url.pathname='/'+database; return url.toString();
  };
  auth.GOTRUE_DB_DATABASE_URL=pinDatabase(auth.GOTRUE_DB_DATABASE_URL);
  Object.assign(auth,{API_EXTERNAL_URL:api,GOTRUE_SITE_URL:site,GOTRUE_URI_ALLOW_LIST:site+'/**',
    GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'true',GOTRUE_DISABLE_SIGNUP:'true',
    GOTRUE_JWT_ISSUER:api+'/auth/v1',GOTRUE_EXTERNAL_PHONE_ENABLED:'false'});
  const rest=Object.fromEntries(Object.entries(restOriginal).filter(([key])=>key.startsWith('PGRST_')));
  rest.PGRST_DB_URI=pinDatabase(rest.PGRST_DB_URI);
  rest.PGRST_DB_SCHEMAS='public';
  const names=[]; let gateway, web;
  const close=async()=>{
    if(web) {
      if(web.exitCode===null && web.signalCode===null) {
        const stopped=new Promise(resolve=>web.once('exit',resolve));web.kill();await stopped;
      }
      web=null;
    }
    if(gateway) { gateway.closeAllConnections(); await new Promise(resolve=>gateway.close(resolve));gateway=null; }
    for(const name of names.reverse()) {
      const current=inspect(name);
      assert.equal(current.Config.Labels['grookai.fixture.database'],database);
      run('docker',['stop',name]);
      assert.equal(inspect(name).State.Running,false);
    }
  };
  try {
    // Secret files are local-only and accessible only to the operator and SYSTEM.
    const who=run('whoami',[]).trim();
    run('icacls',[out,'/inheritance:r','/grant:r',`${who}:(OI)(CI)F`,'SYSTEM:(OI)(CI)F']);
    const imageResult=await createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
      .storage.from('user-card-images').download(imagePath);
    if(imageResult.error) throw new Error('Existing local sample artwork is unavailable');
    const imageBytes=Buffer.from(await imageResult.data.arrayBuffer());
    writeFileSync(`${out}/sample-artwork.webp`,imageBytes);
    writeFileSync(`${out}/sample-artwork.json`,JSON.stringify({source:local.API_URL,bucket:'user-card-images',path:imagePath,
      sha256:createHash('sha256').update(imageBytes).digest('hex'),bytes:imageBytes.length,sourceWrites:0}));
    for(const [kind,vars,source,port,target] of [['auth',auth,authSource,54362,9999],['rest',rest,restSource,54363,3000]]) {
      const name=`${database}_${kind}`;
      const envFile=`${out}/${kind}.private.env`;
      assert.ok(Object.values(vars).every(v=>!/[\r\n]/.test(v)));
      writeFileSync(envFile,Object.entries(vars).map(([k,v])=>`${k}=${v}`).join('\n'));
      run('docker',['run','-d','--name',name,'--label',`grookai.fixture.database=${database}`,
        '--network',network,'-p',`127.0.0.1:${port}:${target}`,'--env-file',envFile,source.Config.Image]);
      names.push(name);
    }
    gateway=createServer((incoming,response)=>{
      const origin=incoming.headers.origin;
      if(origin && origin!==site) {response.writeHead(403);response.end();return;}
      if(origin) {response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Vary','Origin');}
      response.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,accept-profile,content-profile');
      response.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
      if(incoming.method==='OPTIONS'){response.writeHead(204);response.end();return;}
      const url=new URL(incoming.url,api);
      if(['GET','HEAD'].includes(incoming.method)&&[
        '/storage/v1/object/user-card-images/'+imagePath,
        '/storage/v1/object/authenticated/user-card-images/'+imagePath,
      ].includes(url.pathname)) {
        response.writeHead(200,{'Content-Type':'image/webp','Content-Length':imageBytes.length});
        response.end(incoming.method==='HEAD'?undefined:imageBytes);return;
      }
      const prefix=url.pathname.startsWith('/auth/v1/')?'/auth/v1':url.pathname.startsWith('/rest/v1/')?'/rest/v1':null;
      if(!prefix){response.writeHead(404);response.end();return;}
      const headers={...incoming.headers,host:`127.0.0.1:${prefix==='/auth/v1'?54362:54363}`};
      delete headers.origin;
      const upstream=request({host:'127.0.0.1',port:prefix==='/auth/v1'?54362:54363,
        path:url.pathname.slice(prefix.length)+url.search,method:incoming.method,headers},res=>{
        if(res.statusCode>=400) {
          let body='';res.on('data',chunk=>{if(body.length<2000)body+=chunk.toString();});
          res.on('end',()=>appendFileSync(`${out}/api-errors.jsonl`,JSON.stringify({path:url.pathname,status:res.statusCode,body:body.slice(0,2000)})+'\n'));
        }
        response.writeHead(res.statusCode,Object.fromEntries(Object.entries(res.headers).filter(([key])=>!key.startsWith('access-control-'))));res.pipe(response);
      });
      upstream.on('error',()=>{response.writeHead(502);response.end();});incoming.pipe(upstream);
    });
    await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(54361,'127.0.0.1',resolve);});
    await ready(api+'/auth/v1/health');
    const options={auth:{persistSession:false,autoRefreshToken:false}};
    const admin=createClient(api,local.SECRET_KEY,options);
    let probe;
    for(let attempt=0;attempt<40;attempt++) {
      probe=await admin.from('card_prints').select('id',{head:true,count:'exact'});
      if(!probe.error) break;
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(probe.error) throw new Error(`Fixture API probe: ${probe.error.code} ${probe.error.message}`);
    assert.equal(probe.count,326);
    const users=[];
    for(const suffix of ['owner','outsider']) {
      const credential={email:`${database}-${suffix}@example.invalid`,password:randomBytes(24).toString('base64url')};
      const created=await admin.auth.admin.createUser({...credential,email_confirm:true});
      if(created.error) throw new Error(`Local fixture user creation failed: ${created.error.status}`);
      users.push({...credential,id:created.data.user.id});
    }
    const startWeb=async()=>{
      const env={...process.env};
      for(const key of Object.keys(env)) if(/SUPABASE|DATABASE|POSTGRES|PGPASSWORD|OPENAI|ANTHROPIC|PSA|UPSTASH|VERCEL|BRIDGE_IMPORT|RESEND|SENDGRID|SENTRY|POSTHOG|AWS|S3_|TCGPLAYER|EBAY|BINDER|SITE_URL|COLLECTOR/i.test(key)) delete env[key];
      Object.assign(env,{SUPABASE_URL:api,SUPABASE_PUBLISHABLE_KEY:local.ANON_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,
        NEXT_PUBLIC_SITE_URL:site,SITE_URL:site,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB:'true',
        NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',NEXT_TELEMETRY_DISABLED:'1',
        GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED:'true',GROOKAI_BINDERS_PERSONAL_V1_ENABLED:'true',
        GROOKAI_BINDERS_SET_V1_ENABLED:'true',GROOKAI_BINDERS_CUSTOM_V1_ENABLED:'true'});
      const buildLog=openSync(`${out}/build.log`,'a');
      // Keep the gateway event loop alive while Next collects static route data.
      await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],
          {cwd:root+'/apps/web',env:{...env,NODE_OPTIONS:'--use-system-ca'},windowsHide:true,stdio:['ignore',buildLog,buildLog]});
        const timer=setTimeout(()=>child.kill(),240000);
        child.once('error',error=>{clearTimeout(timer);reject(error);});
        child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(`Fixture build exited ${code}`));});
      }).finally(()=>closeSync(buildLog));
      const output=openSync(`${out}/web.log`,'a'), errors=openSync(`${out}/web.err`,'a');
      web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3168'],
        {cwd:root+'/apps/web',env,windowsHide:true,stdio:['ignore',output,errors]});
      closeSync(output);closeSync(errors);
      await ready(site+'/login');
    };
    return {users,admin,close,startWeb,async verifyBrowser(){
      const browser=await chromium.launch();const errors=[];
      try {
        const page=await browser.newPage({viewport:{width:1440,height:1050}});
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto(site+'/login?next=/vault');
        await page.locator('input[type=email]').fill(users[0].email);
        await page.locator('input[type=password]').fill(users[0].password);
        await page.getByRole('button',{name:'Sign in',exact:true}).click();
        await page.waitForURL(site+'/vault',{timeout:60000});
        await page.waitForLoadState('networkidle');
        const vaultText=await page.locator('main').innerText();
        assert.match(vaultText,/\$24\.68/);
        await expect.poll(()=>page.locator('main img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth>0).length)).toBeGreaterThan(0);
        await expect(page.getByText('TEST FIXTURES ONLY - Prices are synthetic, not live market data',{exact:true})).toBeVisible();
        await page.screenshot({path:`${out}/priced-vault-desktop.png`,fullPage:true});
        await page.setViewportSize({width:390,height:844});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.screenshot({path:`${out}/priced-vault-mobile.png`,fullPage:true});
        await page.goto(site+'/card/GV-PK-MEW-200',{waitUntil:'networkidle'});
        const cardText=await page.locator('main').innerText();
        assert.match(cardText,/\$12\.34/);
        await expect.poll(()=>page.locator('main img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth>0).length)).toBeGreaterThan(0);
        await page.screenshot({path:`${out}/priced-card-mobile.png`,fullPage:true});
        const outsider=await browser.newPage();
        await outsider.goto(site+'/login?next=/vault');
        await outsider.locator('input[type=email]').fill(users[1].email);
        await outsider.locator('input[type=password]').fill(users[1].password);
        await outsider.getByRole('button',{name:'Sign in',exact:true}).click();
        await outsider.waitForURL(site+'/vault',{timeout:60000});
        await outsider.waitForLoadState('networkidle');
        const outsiderText=await outsider.locator('main').innerText();
        assert.doesNotMatch(outsiderText,/\$24\.68|Blastoise ex/);
        await page.goto(site+'/binders/new?q=151',{waitUntil:'networkidle'});
        await page.locator('input[name=title]').fill('Synthetic master-set integration fixture');
        await page.locator('input[name=targetKind][value=set]').check();
        const available=await page.locator('select[name=setId] option:not([disabled])').allTextContents();
        assert.equal(available.length,1,'Only the fixture-authorized set can be selected');
        await page.locator('select[name=setId]').selectOption({index:1});
        await page.getByRole('button',{name:'Create Binder',exact:true}).click();
        await page.waitForURL(/\/binders\/[0-9a-f-]{36}/,{timeout:60000});
        await page.waitForLoadState('networkidle');
        await page.getByRole('link',{name:'Choose eligible copies',exact:true}).click();
        await page.getByRole('button',{name:'Add your copy',exact:true}).first().click();
        await page.getByRole('button',{name:'Remove contribution',exact:true}).waitFor();
        const setBinderText=await page.locator('main').innerText();
        assert.match(setBinderText,/1 of 1/);
        const setBinderUrl=page.url().split('?')[0];
        await page.screenshot({path:`${out}/set-binder-mobile.png`,fullPage:true});
        await outsider.goto(setBinderUrl,{waitUntil:'networkidle'});
        await outsider.getByRole('heading',{name:'Binder unavailable',exact:true}).waitFor();
        await page.getByRole('button',{name:'Remove contribution',exact:true}).click();
        await expect(page.getByRole('button',{name:'Remove contribution',exact:true})).toHaveCount(0);
        await page.goto(site+'/vault',{waitUntil:'networkidle'});
        assert.match(await page.locator('main').innerText(),/\$24\.68/);
        assert.equal(errors.length,0,JSON.stringify(errors));
        return {passed:true,vaultText,cardText,outsiderText,setBinderText,setBinderUrl,errors,realGoTrue:true,realPostgrest:true};
      } finally {await browser.close();}
    }};
  } catch(error) {await close();throw error;}
}
