import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../apps/web/src/components/vault/VaultInstanceNotesMediaCard.tsx', import.meta.url), 'utf8');
test('private signed Vault media bypasses the long-lived public image optimizer', () => {
  assert.match(source, /<Image src=\{imageUrl\}[^>]*unoptimized/);
});
test('thrown upload errors restore the displayed image and do not claim success', () => {
  assert.match(source, /catch \{\s+if \(side === "front"\) \{\s+setFrontImageUrl\(previousUrl\)/);
  assert.match(source, /Could not confirm the photo upload\. Reload this copy before trying again\./);
});
test('blob previews are released when replaced or unmounted, not before refresh', () => {
  assert.match(source, /useEffect\(\(\) => \(\) => \{\s+if \(frontImageUrl\?\.startsWith\("blob:"\)\) URL\.revokeObjectURL\(frontImageUrl\)/);
  assert.match(source, /useEffect\(\(\) => \(\) => \{\s+if \(backImageUrl\?\.startsWith\("blob:"\)\) URL\.revokeObjectURL\(backImageUrl\)/);
  assert.doesNotMatch(source, /revokeObjectURL\(objectUrl\)/);
});
