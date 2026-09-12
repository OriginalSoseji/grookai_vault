import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { assertCollectorStagingTarget } from '../src/lib/collectorStaging.mjs';

const root = new URL('../../../', import.meta.url);
assert.equal(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  'preview/collector-authenticated-20260910');
const hostedPath=process.env.COLLECTOR_HOSTED_TEST_CONFIG;
if(hostedPath)assert.equal(hostedPath.replaceAll('\\','/'),'C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844/private/browser-config.json');
const hosted=hostedPath?JSON.parse(readFileSync(hostedPath,'utf8')):null;
const status = hosted??JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', 'supabase status -o json'],
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
assertCollectorStagingTarget(status.API_URL,false,Boolean(hosted));
const artifactRoot = hosted?'C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844':'C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910';
const credentialPath = path.resolve(process.argv[2] ?? '');
assert.ok(credentialPath.toLowerCase().startsWith(path.resolve(artifactRoot).toLowerCase() + path.sep));
const account = JSON.parse(readFileSync(credentialPath, 'utf8'));
assert.match(account.email, /^collector-staging-\d+-\d+@example\.invalid$/);
const base = hosted?'https://grookai-collector-staging.vercel.app':'http://127.0.0.1:3167';
assert.equal(account.url, base + '/login');
const out = `${artifactRoot}/media-memory-${Date.now()}`;
mkdirSync(out, { recursive: true });
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const owner = createClient(status.API_URL, status.ANON_KEY, options);
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
const login = await owner.auth.signInWithPassword({ email: account.email, password: account.password });
if (login.error) throw login.error;
const userId = login.data.user.id;
const sample = await admin.from('card_prints').select('id', { count: 'exact', head: true });
assert.equal(sample.count, 326);
const read = await owner.from('vault_item_instances')
  .select('id,gv_vi_id,image_url,image_back_url,card_print_id,card_printing_id,notes,condition_label')
  .eq('user_id', userId).is('archived_at', null).order('created_at').limit(1).single();
if (read.error) throw read.error;
const instance = read.data;
assert.equal(instance.card_print_id, '98d26f6e-83e8-4990-8e42-ea2e3aadb111');
assert.equal(instance.image_url, null, 'Do not overwrite an existing test photo');
assert.equal(instance.image_back_url, null, 'Do not overwrite an existing test photo');
for (const side of ['front', 'back']) {
  const objects = await owner.storage.from('user-card-images').list(`${userId}/vault-instances/${instance.id}/${side}`);
  if (objects.error) throw objects.error;
  assert.equal(objects.data.length, 0, 'Do not overwrite an existing Storage object');
}
const report = { endpoint: status.API_URL, instanceId: instance.id, evidence: [], errors: [], blockers: [] };
const browser = await chromium.launch();
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  if(hosted)await page.context().request.get(base+'/robots.txt',{headers:{'x-vercel-protection-bypass':hosted.BYPASS,'x-vercel-set-bypass-cookie':'true'}});
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(base + '/login?next=' + encodeURIComponent(`/vault/gvvi/${instance.gv_vi_id}`));
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => url.pathname === `/vault/gvvi/${instance.gv_vi_id}`, { timeout: 90000 });
  await page.waitForLoadState('networkidle');
  const reference = await page.request.get(base + '/api/canon/cards/GV-PK-MEW-200/image');
  assert.equal(reference.status(), 200);
  const buffer = await reference.body();
  const mimeType = reference.headers()['content-type'].split(';')[0];
  assert.match(mimeType, /^image\//);
  const imageHash = createHash('sha256').update(buffer).digest('hex');
  for (const side of ['front', 'back']) {
    const label = side === 'front' ? 'Front' : 'Back';
    const tile = page.locator('div.space-y-3').filter({ has: page.getByText(`${label} photo`, { exact: true }) }).last();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'),
      tile.getByRole('button', { name: 'Upload', exact: true }).click()]);
    await chooser.setFiles({ name: `local-test-${side}.jpg`, mimeType, buffer });
    await page.getByText(`${label} photo saved.`, { exact: true }).waitFor({ timeout: 45000 });
    const field = side === 'front' ? 'image_url' : 'image_back_url';
    const targetPath = `${userId}/vault-instances/${instance.id}/${side}/current`;
    await expect.poll(async () => {
      const r = await owner.from('vault_item_instances').select(field).eq('id', instance.id).single();
      if (r.error) throw r.error;
      return r.data[field];
    }).toBe(targetPath);
    const downloaded = await owner.storage.from('user-card-images').download(targetPath);
    if (downloaded.error) throw downloaded.error;
    assert.equal(createHash('sha256').update(Buffer.from(await downloaded.data.arrayBuffer())).digest('hex'), imageHash);
    await page.reload({ waitUntil: 'networkidle' });
    await expect.poll(() => page.getByRole('img', { name: `${label} photo`, exact: true })
      .evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    report.evidence.push({ workflow: `${side} upload, database pointer, byte readback and reload`, sha256: imageHash });
  }
  await page.screenshot({ path: `${out}/photos.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('img', { name: 'Back photo', exact: true }).scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${out}/photos-mobile.png`, fullPage: true });
  report.evidence.push({ workflow: 'photo layout at 1440 and 390 pixels', passed: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  // Remove only the two paths proven absent before this execution.
  for (const side of ['front', 'back']) {
    const label = side === 'front' ? 'Front' : 'Back';
    const tile = page.locator('div.space-y-3').filter({ has: page.getByText(`${label} photo`, { exact: true }) }).last();
    await tile.getByRole('button', { name: 'Remove', exact: true }).click();
    await page.getByText(`${label} photo removed.`, { exact: true }).waitFor({ timeout: 30000 });
    const list = await owner.storage.from('user-card-images').list(`${userId}/vault-instances/${instance.id}/${side}`);
    if (list.error) throw list.error;
    assert.equal(list.data.length, 0);
  }
  const restored = await owner.from('vault_item_instances')
    .select('id,gv_vi_id,image_url,image_back_url,card_print_id,card_printing_id,notes,condition_label')
    .eq('id', instance.id).single();
  if (restored.error) throw restored.error;
  assert.deepEqual(restored.data, instance);
  report.evidence.push({ workflow: 'both photos removed; identity, condition and notes preserved', passed: true });

  const memory = await owner.rpc('collector_memory_create_v1', {
    p_gv_vi_id: instance.gv_vi_id, p_memory_type: 'note',
    p_note: 'Local staging memory verification. Synthetic account; not a real collector story.',
  });
  if (memory.error) throw memory.error;
  const memoryId = Array.isArray(memory.data) ? memory.data[0].id : memory.data.id;
  report.memoryId = memoryId;
  await page.goto(`${base}/memory/${memoryId}`, { waitUntil: 'networkidle' });
  await page.getByText('Your collector Memory', { exact: false }).waitFor();
  await page.getByText('Local staging memory verification. Synthetic account; not a real collector story.', { exact: true }).waitFor();
  const observerAccount = { email: `collector-staging-${Date.now()}-9@example.invalid`, password: randomBytes(24).toString('base64url') };
  const observerCreated = await admin.auth.admin.createUser({ ...observerAccount, email_confirm: true });
  if (observerCreated.error) throw observerCreated.error;
  const observer = createClient(status.API_URL, status.ANON_KEY, options);
  const observerLogin = await observer.auth.signInWithPassword(observerAccount);
  if (observerLogin.error) throw observerLogin.error;
  try {
    const readMemory = async () => {
      const result = await observer.rpc('collector_memory_accessible_by_id_v1', { p_memory_id: memoryId });
      if (result.error) throw result.error;
      return result.data;
    };
    assert.equal((await readMemory()).length, 0);
    const published = await owner.rpc('collector_memory_set_public_v1', { p_memory_id: memoryId, p_is_public: true });
    if (published.error) throw published.error;
    assert.equal((await readMemory()).length, 1);
    report.evidence.push({ workflow: 'memory private denial and explicit public read by another collector', passed: true });
  } finally {
    const hidden = await owner.rpc('collector_memory_set_public_v1', { p_memory_id: memoryId, p_is_public: false });
    if (hidden.error) throw hidden.error;
    const denied = await observer.rpc('collector_memory_accessible_by_id_v1', { p_memory_id: memoryId });
    if (denied.error) throw denied.error;
    assert.equal(denied.data.length, 0);
    await observer.auth.signOut({ scope: 'local' });
  }
  report.evidence.push({ workflow: 'memory made private again; observer immediately denied', passed: true });
  await page.screenshot({ path: `${out}/memory.png`, fullPage: true });
  await page.goto(base + '/card/GV-PK-MEW-200', { waitUntil: 'networkidle' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByText('Link copied', { exact: true }).waitFor();
  const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  assert.equal(shared.origin, base);
  assert.equal(shared.pathname, '/card/GV-PK-MEW-200');
  const printingIdentity = await owner.from('card_printings').select('printing_gv_id')
    .eq('id', instance.card_printing_id).eq('card_print_id', instance.card_print_id).single();
  if (printingIdentity.error) throw printingIdentity.error;
  assert.equal(shared.searchParams.get('printing'), printingIdentity.data.printing_gv_id);
  await page.goto(shared.href, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.gv-detail-finish-field select').inputValue(), instance.card_printing_id);
  report.evidence.push({ workflow: 'Share clipboard fallback retains local origin and exact printing', passed: true });
  await page.getByRole('link', { name: 'Update image', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/submit');
  assert.ok(page.url().includes('GV-PK-MEW-200'));
  report.evidence.push({ workflow: 'image correction reaches signed-in intake with canonical context', passed: true });
  assert.deepEqual(report.errors, []);
} catch (error) {
  if (page) {
    report.pageText = await page.locator('body').innerText().catch(() => 'unavailable');
    await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  }
  report.blockers.push(error.stack ?? error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await owner.auth.signOut({ scope: 'local' });
  writeFileSync(`${out}/result.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ artifact: `${out}/result.json`, ...report }));
}
