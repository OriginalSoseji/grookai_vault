import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const units = ['grookai-commerce-orders.service', 'grookai-commerce-billing.service', 'grookai-commerce-health.service'];
const filePattern = /^[0-9a-f-]{36}\.json$/;
export function readCommerceAlertConfig(env, args) {
  if (env.GROOKAI_COMMERCE_ALERTS_ENABLED !== 'true') throw new Error('Commerce alert delivery disabled');
  const retry = args.length === 1 && args[0] === '--retry';
  const unit = args.length === 1 && args[0].startsWith('--unit=') ? args[0].slice(7) : null;
  if (!retry && !units.includes(unit)) throw new Error('Commerce alert mode required');
  const url = new URL(env.GROOKAI_COMMERCE_ALERT_URL ?? '');
  const local = env.GROOKAI_COMMERCE_ALERT_TEST === 'true' && url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port;
  if ((!local && url.protocol !== 'https:') || url.username || url.password || url.hash) throw new Error('Invalid alert destination');
  const token = env.GROOKAI_COMMERCE_ALERT_TOKEN;
  if (typeof token !== 'string' || token.length < 32 || token.length > 512 || !/^[A-Za-z0-9._-]+$/.test(token)) throw new Error('Alert credential required');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(env.GROOKAI_COMMERCE_ALERT_OWNER ?? '')) throw new Error('Alert owner required');
  const stateDir = env.GROOKAI_COMMERCE_ALERT_STATE_DIR;
  if (!stateDir || !path.isAbsolute(stateDir)) throw new Error('Private alert state directory required');
  return { unit, retry, url: url.href, token, owner: env.GROOKAI_COMMERCE_ALERT_OWNER, stateDir };
}

// Persist before sending. At-least-once delivery uses a stable notification ID;
// the receiver must deduplicate it, including a crash after remote acceptance.
// No raw journal, account, order, payment, credential or response body is sent.
export async function deliverCommerceAlerts(config, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  await fs.mkdir(config.stateDir, { recursive: true, mode: 0o700 });
  if (!config.retry) {
    const createdAt = now(), clock = Date.parse(createdAt), pointer = path.join(config.stateDir, `${config.unit}.last`);
    if (!Number.isFinite(clock)) throw new Error('Invalid alert clock');
    let previous = null;
    try { previous = JSON.parse(await fs.readFile(pointer, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    let coalesced = false;
    if (previous) {
      if (!filePattern.test(`${previous.id}.json`) || !Number.isFinite(Date.parse(previous.createdAt))) throw new Error('Invalid alert pointer');
      let pending = false;
      try { await fs.access(path.join(config.stateDir, `${previous.id}.json`)); pending = true; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const age = clock - Date.parse(previous.createdAt);
      coalesced = pending || (age >= 0 && age < 15 * 60_000);
    }
    if (!coalesced) {
      const id = randomUUID(), payload = { version: 1, notificationId: id, event: 'commerce_unit_failed', unit: config.unit, owner: config.owner, createdAt };
      const temp = path.join(config.stateDir, `${id}.pending`), target = path.join(config.stateDir, `${id}.json`);
      await fs.writeFile(temp, JSON.stringify(payload), { flag: 'wx', mode: 0o600 });
      await fs.rename(temp, target);
      const pointerTemp = path.join(config.stateDir, `${id}.pointer-pending`);
      await fs.writeFile(pointerTemp, JSON.stringify({ id, createdAt }), { flag: 'wx', mode: 0o600 });
      await fs.rename(pointerTemp, pointer);
    }
  }
  const names = (await fs.readdir(config.stateDir)).filter(name => filePattern.test(name)).sort();
  let cursor = '';
  try { cursor = await fs.readFile(path.join(config.stateDir, 'cursor'), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (cursor && !filePattern.test(cursor)) throw new Error('Invalid alert cursor');
  // A repeatedly rejected/invalid message cannot starve later notifications.
  const next = [...names.filter(name => name > cursor), ...names.filter(name => name <= cursor)];
  let delivered = 0, failed = 0, attempted = 0;
  // Directory entries are queued messages only; completed messages are retained
  // in a separate archive, so a growing archive cannot starve pending delivery.
  for (const name of next.slice(0, 10)) {
    attempted++;
    try {
      const file = path.join(config.stateDir, name), stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2048) throw new Error('Invalid notification');
      const payload = JSON.parse(await fs.readFile(file, 'utf8'));
      if (Object.keys(payload).sort().join(',') !== 'createdAt,event,notificationId,owner,unit,version' || payload.version !== 1 ||
          payload.notificationId !== name.slice(0, -5) || !units.includes(payload.unit) || payload.event !== 'commerce_unit_failed' ||
          !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(payload.owner) || typeof payload.createdAt !== 'string' || !Number.isFinite(Date.parse(payload.createdAt))) throw new Error('Invalid notification');
      const response = await fetcher(config.url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json', 'idempotency-key': payload.notificationId }, body: JSON.stringify(payload) });
      await response.body?.cancel();
      if (!response.ok) throw new Error('Delivery failed');
      const archive = path.join(config.stateDir, 'delivered');
      await fs.mkdir(archive, { recursive: true, mode: 0o700 });
      await fs.rename(file, path.join(archive, name));
      delivered++;
    } catch { failed++; }
    const cursorTemp = path.join(config.stateDir, `${randomUUID()}.cursor-pending`);
    await fs.writeFile(cursorTemp, name, { flag: 'wx', mode: 0o600 });
    await fs.rename(cursorTemp, path.join(config.stateDir, 'cursor'));
  }
  return { worker: 'vendor-commerce-alert-v1', attempted, delivered, failed, remaining: names.length - delivered, healthy: failed === 0 && names.length === delivered };
}

async function main() {
  await import('../env.mjs');
  const result = await deliverCommerceAlerts(readCommerceAlertConfig(process.env, process.argv.slice(2)));
  console.log(JSON.stringify(result));
  if (!result.healthy) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => { console.error('[vendor-commerce-alert-v1] delivery incomplete; inspect private spool and receiver'); process.exitCode = 1; });
