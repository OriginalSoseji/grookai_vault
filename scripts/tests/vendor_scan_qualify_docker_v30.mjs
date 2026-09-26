// Launch only one dedicated offline qualification task. Never starts Docker,
// resets a database, pulls an image, or touches another container.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const [mode, shardArg = '0'] = process.argv.slice(2), shard = Number(shardArg);
assert.ok(['references', 'scans'].includes(mode)); assert.ok(mode === 'scans' ? shard === 0 : [0, 1].includes(shard));
const base = path.resolve('.local/integration/vendor-scan-runtime-v30'), pkg = path.join(base, 'linux-package');
const receipt = JSON.parse(fs.readFileSync(path.join(base, 'package.private.json'))), plan = path.join(pkg, 'qualification-plan.private.json');
assert.equal(hash(fs.readFileSync(plan)), receipt.planSha256);
for (const [file, sha] of Object.entries(receipt.files)) assert.equal(hash(fs.readFileSync(path.join(pkg, file))), sha);
const image = receipt.cachedDockerImage; assert.equal(image, 'sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5');
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
// These preflights are read-only. An unavailable engine is a hard stop.
assert.equal(docker(['info', '--format', '{{.OSType}}']), 'linux');
assert.equal(docker(['image', 'inspect', image, '--format', '{{.Id}}']), image);
const name = `gv-scan-v30-${mode}-${shard}`;
assert.equal(docker(['ps', '-a', '--filter', 'name=^/' + name + '$', '--format', '{{.Names}}']), '', 'Dedicated container exists; inspect it before resuming');
const mount = (source, target, writable = false) => {
  source = fs.realpathSync(source); assert.ok(!source.includes(',') && !target.includes(','));
  return ['--mount', `type=bind,source=${source},target=${target}${writable ? '' : ',readonly'}`];
};
const output = path.join(base, 'linux-output'); fs.mkdirSync(output, { recursive: true });
const args = ['run', '--rm', '--pull=never', '--name', name, '--network=none', '--read-only', '--cpus=1',
  '--memory=' + (mode === 'scans' ? '1536m' : '1g'), '--memory-swap=' + (mode === 'scans' ? '1536m' : '1g'), '--pids-limit=64',
  '--cap-drop=ALL', '--security-opt=no-new-privileges', '--tmpfs=/tmp:rw,noexec,nosuid,size=64m', '--workdir=/work',
  ...mount(pkg, '/work'), ...mount(output, '/proof', true)];
for (const root of receipt.mounts) { assert.match(root.name, /^(images|features)-[01]$/); args.push(...mount(root.source, '/' + root.name)); }
args.push(image, 'node', 'scripts/tests/vendor_scan_qualify_v30.mjs', mode, '/work/qualification-plan.private.json', receipt.planSha256, '/proof', String(shard), mode === 'references' ? '2' : '1');
const stamp = Date.now(), logPath = path.join(base, `${name}-${stamp}.log`), fd = fs.openSync(logPath, 'wx');
const intent = { at: new Date().toISOString(), name, image, mode, shard, planSha256: receipt.planSha256, logPath, network: 'none', readonlyInputs: true };
fs.writeFileSync(path.join(base, `${name}-${stamp}.intent.json`), JSON.stringify(intent, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ name, logPath, started: true }));
const child = spawn('docker', args, { stdio: ['ignore', fd, fd], windowsHide: true });
const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
fs.closeSync(fd);
fs.writeFileSync(path.join(base, `${name}-${stamp}.exit.json`), JSON.stringify({ ...intent, finishedAt: new Date().toISOString(), code }, null, 2), { flag: 'wx' });
assert.equal(code, 0, 'Qualification failed; preserve logs and partial journal');
console.log(JSON.stringify({ name, completed: true }));
