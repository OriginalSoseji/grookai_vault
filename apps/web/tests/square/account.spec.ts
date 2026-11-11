import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';
const lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const fixture=JSON.parse(fs.readFileSync(lab+'/runtime-fixture.private.json','utf8'));
const env=dotenv.parse(fs.readFileSync('.env.local'));
const auth=(role: 'owner'|'other')=>({Authorization:'Bearer '+fixture[role].accessToken});

test.beforeAll(async()=>{
  // Retained users outlive their original fixture JWTs. Obtain fresh sessions
  // from real local Auth rather than depending on an old one-hour token.
  for(const role of ['owner','other'] as const){
    const client=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const login=await client.auth.signInWithPassword({email:fixture[role].email,password:fixture[role].password});
    expect(login.error).toBeNull();expect(login.data.session).not.toBeNull();
    fixture[role].accessToken=login.data.session!.access_token;
  }
});

test('actual SDK owner sessions, RLS reads, foreign-origin rejection and safe status DTO',async({request})=>{
  expect((await request.get('/api/square')).status()).toBe(401);
  const owner=await request.get('/api/square',{headers:auth('owner')});expect(owner.status()).toBe(200);
  const value=await owner.json();expect(value.connections).toHaveLength(1);expect(value.connections[0].targets.length).toBeGreaterThanOrEqual(2);
  expect(JSON.stringify(value)).not.toMatch(/token_ciphertext|state_ciphertext|lease_token|synthetic-access|synthetic-refresh/);
  const other=await request.get('/api/square',{headers:auth('other')});expect((await other.json()).connections).toHaveLength(0);
  const choices=await request.get('/api/square/candidates',{headers:auth('owner')});expect(choices.status()).toBe(200);
  const rows=(await choices.json()).rows;expect(rows.length).toBeGreaterThanOrEqual(2);
  const ownerClient=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{global:{headers:auth('owner')},auth:{persistSession:false,autoRefreshToken:false}});
  const actual=await ownerClient.from('vault_item_instances').select('id,user_id');expect(actual.error).toBeNull();
  expect(rows.every((row:{id:string})=>actual.data!.some(copy=>copy.id===row.id&&copy.user_id===fixture.owner.id))).toBe(true);
  const foreign=await request.get('/api/square/candidates',{headers:auth('other')});expect((await foreign.json()).rows).toHaveLength(1);
  const denied=await request.post('/api/square',{headers:{...auth('owner'),Origin:'https://foreign.invalid'},data:{action:'pause',connectionId:fixture.connectionId}});
  expect(denied.status()).toBe(403);
  const impersonation=await request.post('/api/square',{headers:auth('other'),data:{action:'pause',ownerId:fixture.owner.id,connectionId:fixture.connectionId}});
  expect(impersonation.status()).toBe(404);
  expect((await request.get('/api/square/candidates?offset=1e3',{headers:auth('owner')})).status()).toBe(400);
  const oversized=await request.post('/api/square',{headers:{...auth('owner'),'Content-Type':'application/json'},data:JSON.stringify({action:'link',padding:'x'.repeat(66000)})});
  expect(oversized.status()).toBe(400);
});

test('real launch/callback routes bind browser state and reject reuse without contacting Square',async({request})=>{
  const start=await request.post('/api/square',{headers:auth('owner'),data:{action:'link'}});expect(start.status()).toBe(200);
  const launch=new URL((await start.json()).launchUrl);
  const begun=await request.get(launch.pathname+launch.search,{maxRedirects:0});expect(begun.status()).toBe(303);
  const provider=new URL(begun.headers().location);expect(provider.hostname).toBe('connect.squareupsandbox.com');
  const cookie=begun.headers()['set-cookie'];expect(cookie).toContain('HttpOnly');expect(cookie).toContain('Secure');expect(cookie).toContain('SameSite=lax');
  const state=provider.searchParams.get('state')!;
  const callback='/api/square/oauth/callback?'+new URLSearchParams({state,error:'access_denied'}).toString();
  const wrong=await request.get(callback,{maxRedirects:0,headers:{Cookie:'grookai-square-oauth=wrong-browser'}});expect(wrong.status()).toBe(303);
  const valid=await request.get(callback,{maxRedirects:0,headers:{Cookie:cookie.split(';')[0]}});expect(valid.status()).toBe(303);
  expect(new URL(valid.headers().location).searchParams.get('status')).toBe('reconnect_required');
  const replay=await request.get(callback,{maxRedirects:0,headers:{Cookie:cookie.split(';')[0]}});expect(replay.status()).toBe(303);
  expect(replay.headers().location).not.toContain(state);
  expect(replay.headers().location).not.toContain('access_denied');
});

test('signed-in desktop/phone page uses real owner data, explicit selection and confirmation',async({page,context})=>{
  const cookies:Array<{name:string;value:string;options:Record<string,unknown>}>=[];
  // Use the official SSR SDK with actual local Auth, never construct a JWT.
  const client=createServerClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[],setAll:values=>{cookies.push(...values);}}});
  const login=await client.auth.signInWithPassword({email:fixture.owner.email,password:fixture.owner.password});expect(login.error).toBeNull();
  await context.addCookies(cookies.map(cookie=>({name:cookie.name,value:cookie.value,url:'http://127.0.0.1:61850',httpOnly:false,sameSite:'Lax'})));
  await page.goto('/account/connections/square');
  await expect(page.getByRole('heading',{name:'Connect Square',exact:true})).toBeVisible();
  await expect(page.getByText('Automatic catalog updates: on for selected cards.')).toBeVisible();
  await page.getByRole('button',{name:'Load priced cards',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sync selected cards',exact:true})).toBeDisabled();
  const copy=fixture.copies.find((row:{owner_id:string})=>row.owner_id===fixture.owner.id);
  await page.getByRole('checkbox',{name:new RegExp(copy.gvvi)}).check();
  await expect(page.getByRole('button',{name:'Sync 1 selected card',exact:true})).toBeDisabled();
  await page.getByRole('checkbox',{name:'Create or update these selected items in my Square catalog using their grookai QR links.'}).check();
  await expect(page.getByRole('button',{name:'Sync 1 selected card',exact:true})).toBeEnabled();
  expect(await page.locator('main').last().evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Roboto');
  await page.screenshot({path:lab+'/ui-proof-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Sync 1 selected card',exact:true}).click({trial:true});
  await page.screenshot({path:lab+'/ui-proof-phone.png',fullPage:true});
  await expect(page.getByText('This selection updates catalog details.',{exact:false})).toBeVisible();
  // Intentionally do not submit the final sync button to a real Square server.
});
