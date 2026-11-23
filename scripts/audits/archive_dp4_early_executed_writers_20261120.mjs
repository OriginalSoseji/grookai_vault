import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const entries = [
  ['identity80', 'identity80', 'fdcf3d7831a38404867ea08c89f94db62eaa31b9', '6820cb906124443b4bf0079f5468dcbba2949850255fa1fa0eb99c7ac2f51714'],
  ['artist84', 'artist84', '3b0a80ad36c9f03426173858093b45ca953e59db', '78bce17bece89bafc617f22b192808881508a93a811dded3f1d42a2595c8995a'],
  ['family', 'family_containment', 'c6b7079f28111ef19ff45a5299fd18f1b06b9640', 'a4b66004d60358fe0121a7d9b27e2816d9275c0ccbafcde0499ade0bb5467364'],
  ['subject', 'subject_repair', '9b9b7b126c4f6a02138346e25f5bfe28fd57e09d', 'a0a6bc1a07db6760f0ec847533fb9efa335af22ea0ff506f3937d83042c08b54'],
];
const shared = ['backend/lib/contracts/contract_scope_v1.mjs', 'backend/lib/contracts/execute_canon_write_v1.mjs', 'backend/lib/contracts/run_post_write_proofs_v1.mjs'];
for (const [name, stem, commit, expected] of entries) {
  const paths = [`backend/catalog/jpn_dp4_${stem}_v1.mjs`, `backend/catalog/jpn_dp4_${stem}_policy_v1.mjs`, ...shared];
  const files = paths.map((path, index) => {
    // These two executions used mixed-ending working files; Git normalized
    // them at commit. Their exact bytes remain in the earlier checkouts.
    const localRoot = name === 'identity80' ? 'C:/grookai_jpn_dp4_identity80_20261119'
      : name === 'subject' ? 'C:/grookai_web_security_20261119' : null;
    const bytes = localRoot && index < 2 ? fs.readFileSync(`${localRoot}/${path}`)
      : execFileSync('git', ['show', `${commit}:${path}`]);
    return { path, sha256: sha(bytes), content_base64: bytes.toString('base64') };
  });
  const fingerprint = sha(Buffer.from(JSON.stringify(files.map(({ path, sha256 }) => [path, sha256]))));
  assert.equal(fingerprint, expected, `${name} executed writer fingerprint`);
  const archive = { version: 'DP4_EXECUTED_WRITER_ARCHIVE_V1', name, fingerprint, files };
  const output = `docs/audits/jpn_dp4_execution_writer_archives_20261120/${name}-writer.json.gz`;
  if (!fs.existsSync(output)) fs.writeFileSync(output, gzipSync(Buffer.from(JSON.stringify(archive)), { level: 9 }), { flag: 'wx' });
}
console.log('Archived and verified the early and family executed writers.');
