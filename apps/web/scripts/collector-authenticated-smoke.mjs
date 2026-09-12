import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { assertCollectorStagingTarget } from '../src/lib/collectorStaging.mjs';

const root = new URL('../../../', import.meta.url);
const hostedPath=process.env.COLLECTOR_HOSTED_TEST_CONFIG;
if(hostedPath) assert.equal(hostedPath.replaceAll('\\','/'),'C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844/private/browser-config.json');
const hosted=hostedPath?JSON.parse(readFileSync(hostedPath,'utf8')):null;
const status = hosted??JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', 'supabase status -o json'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }));
assertCollectorStagingTarget(status.API_URL,false,Boolean(hosted));
const releaseLocal = process.env.COLLECTOR_RELEASE_LOCAL_PORT === '3169';
if (process.env.COLLECTOR_RELEASE_LOCAL_PORT) assert.equal(process.env.COLLECTOR_RELEASE_LOCAL_PORT, '3169');
assert.ok(!(releaseLocal && hosted));
const base = hosted?'https://grookai-collector-staging.vercel.app':releaseLocal?'http://127.0.0.1:3169':'http://127.0.0.1:3167';
const out = hosted?`C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844/browser-${Date.now()}`:releaseLocal?`C:/grookai_vault_operator_artifacts/collector_polish/production_release_20260912/browser-${Date.now()}`:`C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/${Date.now()}`;
mkdirSync(out, { recursive: true });
const admin = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [], errors = [], failures = [], accounts = [];
const browser = await chromium.launch();
try {
  for (let i = 0; i < 2; i++) {
    const email = `collector-staging-${Date.now()}-${i}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    accounts.push({ id: data.user.id, email, password });
  }
  const owner = accounts[0];
  // Local operator access only; never include this file in source/deployment packages.
  writeFileSync(`${out}/local-test-account.json`, JSON.stringify({ url: base + '/login', email: owner.email, password: owner.password }, null, 2));
  execFileSync('icacls.exe', [`${out}/local-test-account.json`, '/inheritance:r', '/grant:r',
    `${process.env.USERDOMAIN}\\${process.env.USERNAME}:(F)`, 'SYSTEM:(F)'], { stdio: 'pipe' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  if(hosted){
    await context.request.get(base+'/robots.txt',{headers:{'x-vercel-protection-bypass':hosted.BYPASS,'x-vercel-set-bypass-cookie':'true'}});
    assert.ok((await context.cookies(base)).some(c=>c.name.includes('vercel')));
  }
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.goto(base + '/login?next=/card/GV-PK-MEW-200', { timeout: 120000 });
  await page.locator('input[type=email]').fill(owner.email);
  await page.locator('input[type=password]').fill(owner.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/card/GV-PK-MEW-200', { timeout: 90000 });
  await page.getByRole('heading', { name: 'Blastoise ex', exact: true }).waitFor({ timeout: 90000 });
  results.push({ workflow: 'email-password-login', passed: true });
  const { data: card, error: cardError } = await admin.from('card_prints').select('id').eq('gv_id', 'GV-PK-MEW-200').single();
  if (cardError) throw cardError;
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 30000 });
  await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
  const saved = await admin.from('wishlist_items').select('id').eq('user_id', owner.id).eq('card_id', card.id);
  assert.equal(saved.data?.length, 1);
  await page.reload();
  await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
  results.push({ workflow: 'save-and-reload', persistedRows: 1 });
  await page.goto(base + '/saved', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Saved cards', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Blastoise ex', exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
  results.push({ workflow: 'saved-card-list-discovery', passed: true });
  await page.goto(base + '/card/GV-PK-MEW-200', { waitUntil: 'networkidle' });
  await page.locator('select[name=condition]').selectOption('LP');
  await page.locator('input[name=quantity]').fill('2');
  const selectedPrinting = await page.locator('.gv-detail-finish-field select').inputValue();
  await page.getByRole('button', { name: 'Add to Vault', exact: true }).click();
  await page.getByText('2 copies are now in your vault.', { exact: true }).waitFor({ timeout: 60000 });
  const owned = await admin.from('vault_item_instances').select('id,gv_vi_id,condition_label,card_printing_id,archived_at').eq('user_id', owner.id).eq('card_print_id', card.id).is('archived_at', null);
  if (owned.error) throw owned.error;
  assert.equal(owned.data.length, 2);
  assert.ok(owned.data.every(row => row.condition_label === 'LP' && row.card_printing_id === selectedPrinting));
  results.push({ workflow: 'vault-two-LP-exact-printing-copies', rows: owned.data });
  const other = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await other.auth.signInWithPassword(accounts[1]);
  if (login.error) throw login.error;
  for (const table of ['wishlist_items','vault_item_instances']) {
    const hidden = await other.from(table).select('id').eq('user_id', owner.id);
    if (hidden.error) throw hidden.error;
    assert.equal(hidden.data.length, 0);
  }
  results.push({ workflow: 'cross-account-owner-read-isolation', passed: true });
  const forbiddenWrite = await other.from('vault_item_instances').update({ condition_label: 'DMG' })
    .eq('id', owned.data[0].id).select('id');
  assert.equal(forbiddenWrite.data?.length ?? 0, 0);
  const unchanged = await admin.from('vault_item_instances').select('condition_label').eq('id', owned.data[0].id).single();
  assert.equal(unchanged.data?.condition_label, 'LP');
  const forbiddenSave = await other.from('wishlist_items').insert({ user_id: owner.id, card_id: card.id });
  assert.ok(forbiddenSave.error);
  results.push({ workflow: 'cross-account-owner-write-isolation', passed: true });
  for (const route of ['/vault','/wall','/binders','/network','/network/discover','/sets']) {
    const started = Date.now();
    const response = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 120000 });
    if (route === '/sets') {
      for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 600) {
        await page.evaluate(y => scrollTo(0,y), y);
        await page.waitForTimeout(200);
      }
      await page.waitForFunction(() => [...document.querySelectorAll('.gv-collector-set-cover img')].length === 5 &&
        [...document.querySelectorAll('.gv-collector-set-cover img')].every(image => image.naturalWidth > 0), null, { timeout: 20000 });
    }
    const text = await page.locator('main').first().innerText();
    assert.doesNotMatch(text, /PAGE NOT FOUND|Binders could not load|Application error/);
    await page.screenshot({ path: `${out}/${route.replaceAll('/','_')}.png`, fullPage: true });
    results.push({ route, status: response.status(), elapsedMs: Date.now() - started, text: text.slice(0, 1800) });
  }
  await page.goto(base + '/binders/new', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('input[name=title]').fill('Staging 151 collection');
  await page.locator('input[name=targetKind][value=custom]').check();
  await page.getByPlaceholder('Pikachu Base Set 58 or reverse holo').fill('Blastoise');
  await page.locator('li').filter({ hasText: '#200' }).getByRole('button', { name: 'Add Blastoise ex to checklist', exact: true }).click();
  await page.locator('input[name=customChecklistConfirmation]').check();
  await page.getByRole('button', { name: 'Create Binder', exact: true }).click();
  await page.waitForURL(/\/binders\/[0-9a-f-]{36}/, { timeout: 60000 });
  const createdBinder = await admin.from('binders').select('id,title').eq('owner_user_id', owner.id).eq('title','Staging 151 collection');
  if (createdBinder.error) throw createdBinder.error;
  assert.equal(createdBinder.data.length, 1);
  results.push({ workflow: 'create-custom-binder', persistedRows: 1 });
  const binderUrl = page.url();
  await page.getByRole('link', { name: 'Choose eligible copies', exact: true }).click();
  await page.getByRole('button', { name: 'Add your copy', exact: true }).first().click();
  await expect.poll(async () => {
    const read = await admin.from('binder_contributions').select('id').eq('binder_id', createdBinder.data[0].id).eq('state', 'active');
    if (read.error) throw read.error;
    return read.data.length;
  }).toBe(1);
  await page.goto(binderUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Remove contribution', exact: true }).click();
  await expect.poll(async () => {
    const read = await admin.from('binder_contributions').select('id').eq('binder_id', createdBinder.data[0].id).eq('state', 'active');
    if (read.error) throw read.error;
    return read.data.length;
  }).toBe(0);
  const afterBinder = await admin.from('vault_item_instances').select('id').eq('user_id', owner.id).is('archived_at', null);
  assert.equal(afterBinder.data?.length, 2);
  results.push({ workflow: 'binder-contribute-withdraw-preserves-ownership', passed: true });

  await page.goto(base + '/account', { waitUntil: 'networkidle' });
  const slug = `staging-${Date.now()}`;
  await page.getByPlaceholder('your-name', { exact: true }).fill(slug);
  await page.getByPlaceholder('Your collector name', { exact: true }).fill('Local workflow collector');
  await page.getByRole('checkbox', { name: /^Enable public profile/ }).check();
  await page.getByRole('checkbox', { name: /^Enable vault sharing/ }).check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect.poll(async () => {
    const read = await admin.from('public_profiles').select('slug').eq('user_id', owner.id).maybeSingle();
    if (read.error) throw read.error;
    return read.data?.slug;
  }).toBe(slug);
  results.push({ workflow: 'profile-settings-persistence', passed: true });

  await page.goto(base + '/wall', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '+ Add Section', exact: true }).click();
  await page.getByRole('textbox', { name: 'Section name', exact: true }).fill('Staging grails');
  await page.getByRole('button', { name: 'Add Section', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename Staging grails', exact: true }).waitFor();
  const section = await admin.from('wall_sections').select('id').eq('user_id', owner.id).eq('name', 'Staging grails').single();
  if (section.error) throw section.error;
  await page.getByRole('textbox', { name: 'Rename Staging grails', exact: true }).fill('Staging favorites');
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rename Staging favorites', exact: true }).waitFor();
  results.push({ workflow: 'wall-section-create-and-rename', passed: true });

  const copyUrl = base + '/vault/gvvi/' + owned.data[0].gv_vi_id;
  await page.goto(copyUrl, { waitUntil: 'networkidle' });
  await page.getByRole('combobox', { name: /^Intent/ }).selectOption('showcase');
  await page.getByText('Copy intent saved.', { exact: true }).waitFor();
  let exactCopy = await admin.from('vault_item_instances').select('intent,condition_label').eq('id', owned.data[0].id).single();
  assert.equal(exactCopy.data?.intent, 'showcase');
  const viewer = await browser.newPage();
  if(hosted){
    await viewer.context().request.get(base+'/robots.txt',{headers:{'x-vercel-protection-bypass':hosted.BYPASS,'x-vercel-set-bypass-cookie':'true'}});
    assert.ok((await viewer.context().cookies(base)).some(c=>c.name.includes('vercel')));
  }
  await viewer.goto(base + '/network', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await viewer.locator(`a[href="/u/${slug}"]`).first().waitFor();
  assert.doesNotMatch(await viewer.locator('main').innerText(), /Private staging note/);
  results.push({ workflow: 'public-pulse-showcase-visible', passed: true });
  await page.getByRole('button', { name: /Staging favorites.*Add to section/ }).click();
  await page.getByRole('button', { name: /Staging favorites.*Added/ }).waitFor();
  const membership = await admin.from('wall_section_memberships').select('section_id').eq('section_id', section.data.id).eq('vault_item_instance_id', owned.data[0].id);
  assert.equal(membership.data?.length, 1);
  await page.getByRole('button', { name: /Staging favorites.*Added/ }).click();
  await page.getByRole('button', { name: /Staging favorites.*Add to section/ }).waitFor();
  const removedMembership = await admin.from('wall_section_memberships').select('section_id').eq('section_id', section.data.id).eq('vault_item_instance_id', owned.data[0].id);
  assert.equal(removedMembership.data?.length, 0);
  await page.getByRole('combobox', { name: /^Intent/ }).selectOption('hold');
  await expect.poll(async () => (await admin.from('vault_item_instances').select('intent').eq('id', owned.data[0].id).single()).data?.intent).toBe('hold');
  await viewer.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await viewer.getByRole('heading', { name: 'Pulse', exact: true }).waitFor();
  assert.equal(await viewer.locator(`a[href="/u/${slug}"]`).count(), 0);
  results.push({ workflow: 'private-hold-removed-from-pulse', passed: true });
  await viewer.close();
  await page.getByRole('combobox', { name: 'Condition', exact: true }).selectOption('MP');
  await page.getByText('Condition saved.', { exact: true }).waitFor();
  exactCopy = await admin.from('vault_item_instances').select('intent,condition_label').eq('id', owned.data[0].id).single();
  assert.equal(exactCopy.data?.condition_label, 'MP');
  results.push({ workflow: 'copy-wall-intent-section-membership-condition', passed: true });
  await page.getByPlaceholder('Add exact-copy notes for condition, provenance, or anything you want to remember.').fill('Private staging note');
  await page.getByRole('button', { name: 'Save notes', exact: true }).click();
  await expect.poll(async () => (await admin.from('vault_item_instances').select('notes').eq('id', owned.data[0].id).single()).data?.notes).toBe('Private staging note');
  results.push({ workflow: 'copy-private-note-persistence', passed: true });
  for (const width of [1440,390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/card/GV-PK-MEW-200', { waitUntil: 'networkidle', timeout: 90000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${out}/detail-${width}.png`, fullPage: true });
    results.push({ workflow: 'detail-layout', width, noOverflow: true });
  }
  const start = Date.now();
  const search = await context.request.get(base + '/api/search/suggestions?q=Blastoise&game=pokemon');
  const json = await search.json();
  assert.equal(search.status(), 200);
  assert.ok(json.rows.length > 0);
  results.push({ workflow: 'autocomplete', rows: json.rows.length, elapsedMs: Date.now() - start });
  await page.goto(base + '/saved', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await page.getByRole('heading', { name: 'No saved cards yet', exact: true }).waitFor();
  const removedSave = await admin.from('wishlist_items').select('id').eq('user_id', owner.id).eq('card_id', card.id);
  assert.equal(removedSave.data?.length, 0);
  results.push({ workflow: 'unsave-readback', passed: true });
  await page.goto(copyUrl, { waitUntil: 'networkidle' });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove from vault', exact: true }).click();
  await page.waitForURL('**/vault', { timeout: 30000 });
  const archived = await admin.from('vault_item_instances').select('archived_at,notes,card_printing_id').eq('id', owned.data[0].id).single();
  assert.ok(archived.data?.archived_at);
  assert.equal(archived.data.notes, 'Private staging note');
  assert.equal(archived.data.card_printing_id, selectedPrinting);
  const remaining = await admin.from('vault_item_instances').select('id').eq('user_id', owner.id).is('archived_at', null);
  assert.equal(remaining.data?.length, 1);
  results.push({ workflow: 'remove-exact-copy-preserves-history-other-copy', passed: true });
  await page.goto(base + '/account', { waitUntil: 'networkidle', timeout: 90000 });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL('**/login', { timeout: 30000 });
  await page.goto(base + '/vault', { waitUntil: 'domcontentloaded' });
  assert.equal(new URL(page.url()).pathname, '/login');
  await page.goto(base + '/saved', { waitUntil: 'domcontentloaded' });
  assert.equal(new URL(page.url()).pathname, '/login');
  results.push({ workflow: 'sign-out-and-private-route-denial', passed: true });
} catch (error) {
  errors.push(String(error));
  const pages = browser.contexts().flatMap(context => context.pages());
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: `${out}/failure-${i}.png`, fullPage: true }).catch(() => {});
    writeFileSync(`${out}/failure-${i}.txt`, await pages[i].locator('body').innerText().catch(() => 'unavailable'));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(`${out}/smoke.json`, JSON.stringify({ base, results, errors, failures, accountIds: accounts.map(a => a.id) }, null, 2));
  console.log(JSON.stringify({ out, results, errors, failures }, null, 2));
  await browser.close();
}
