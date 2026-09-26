// Fixed physical device and separate proof package. Never installs over Grookai.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), out = path.join(root, '.local/storefront/native_auth');
assert.equal(process.argv.length, 2);
const adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe'), pkg = 'com.grookai.storefrontauthproof';
const devices = execFileSync(adb, ['devices'], { encoding: 'utf8' }).split(/\r?\n/).filter(x => /\sdevice$/.test(x.trim())).map(x => x.trim().split(/\s+/)[0]);
assert.equal(devices.length, 1, 'Use one connected test device');
const serial = devices[0];
assert.match(serial, /^[a-zA-Z0-9._:-]+$/);
const fixture = JSON.parse(fs.readFileSync(path.join(out, 'fixture-private.json')));
assert.match(fixture.slug, /^native-proof-[0-9]+$/);
assert.match(fixture.productId, /^[0-9a-f-]{36}$/);
const run = (args, encoding = 'utf8') => execFileSync(adb, ['-s', serial, ...args], { encoding, timeout: 15000, windowsHide: true });
assert.equal(run(['get-state']).trim(), 'device');
const versions = p => Object.fromEntries(fs.readFileSync(p, 'utf8').split(/\r?\n(?=  [a-z][a-z0-9_]*:\r?\n)/).slice(1).map(s => [s.match(/^  ([^:]+)/)[1], s.match(/    version: "?([^"\r\n]+)/)?.[1]]));
const a = versions(path.join(root, 'pubspec.lock')), b = versions(path.join(out, 'pubspec.lock'));
assert.deepEqual(Object.keys(a).filter(k => b[k] && a[k] !== b[k]), []);
const log = fs.createWriteStream(path.join(out, 'journey.log'));
const actions = [];
const seen = new Set();
let buffer = '';
const routes = { NATIVE_SEND_STORE_LOGIN: `grookai://store/${fixture.slug}`, NATIVE_SEND_PRODUCT_PREVIEW: `grookai://store/${fixture.slug}/products/${fixture.productId}?preview=1`, NATIVE_SEND_VISITOR_PRODUCT: `grookai://store/${fixture.slug}/products/${fixture.productId}`, NATIVE_SEND_VISITOR_PREVIEW: `grookai://store/${fixture.slug}/products/${fixture.productId}?preview=1` };
const captures = ['NATIVE_STORE_AUTH_PASSED', 'NATIVE_MANAGEMENT_PASSED', 'NATIVE_PRODUCT_PREVIEW_AUTH_PASSED', 'NATIVE_VISITOR_PRODUCT_AUTH_PASSED', 'NATIVE_FOREIGN_PREVIEW_DENIED'];
const child = spawn('pwsh', ['-NoProfile', '-Command', `flutter test --no-pub --dart-define-from-file=fixture-defines.json -d ${serial} integration_test/full_app_auth_test.dart; exit $LASTEXITCODE`], { cwd: out, env: { ...process.env, DEBUG: '' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
function output(data) {
    log.write(data);
    buffer = (buffer + data.toString()).slice(-12000);
    for (const [marker, uri] of Object.entries(routes))
        if (buffer.includes(marker) && !seen.has(marker)) {
            seen.add(marker);
            const result = run(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', uri, '-n', `${pkg}/.MainActivity`]);
            actions.push({ marker, uri, result, at: new Date().toISOString() });
            console.log(marker + ' delivered');
        }
    for (const marker of captures)
        if (buffer.includes(marker) && !seen.has(marker)) {
            seen.add(marker);
            fs.writeFileSync(path.join(out, marker.toLowerCase() + '.png'), run(['exec-out', 'screencap', '-p'], null));
            console.log(marker);
        }
}
child.stdout.on('data', output);
child.stderr.on('data', output);
const exitCode = await new Promise(resolve => child.on('exit', resolve));
log.end();
fs.writeFileSync(path.join(out, 'journey-receipt.json'), JSON.stringify({ recordedAt: new Date().toISOString(), device: run(['shell', 'getprop', 'ro.product.model']).trim(), package: pkg, exitCode, commonPackageVersionDifferences: 0, actions, captures: captures.filter(x => seen.has(x)), completed: buffer.includes('NATIVE_AUTH_PROOF_COMPLETE') }, null, 2) + '\n');
assert.equal(exitCode, 0, 'Inspect private journey.log');
assert(buffer.includes('NATIVE_AUTH_PROOF_COMPLETE'));
console.log('Full native auth journey passed');
