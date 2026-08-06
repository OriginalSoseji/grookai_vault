import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  TARGET_SLUGS,
  buildMutationContract,
  mutationContractHash,
} from '../../scripts/ops/public_test_profile_quarantine_v1.mjs';

test('public test profile quarantine freezes the exact automation profile set', () => {
  assert.equal(TARGET_SLUGS.length, 25);
  assert.equal(new Set(TARGET_SLUGS).size, 25);
  assert.deepEqual([...TARGET_SLUGS].sort(), [...TARGET_SLUGS]);
  assert.match(mutationContractHash(), /^[a-f0-9]{64}$/);
});

test('quarantine disables only profile publication and preserves accounts and collection data', () => {
  assert.deepEqual(buildMutationContract().mutation, {
    table: 'public.public_profiles',
    public_profile_enabled: false,
    vault_sharing_enabled: false,
    delete_rows: false,
    delete_accounts: false,
    mutate_vault_rows: false,
  });
});

test('quarantine implementation is exact, reversible, and contains no destructive SQL', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/ops/public_test_profile_quarantine_v1.mjs', import.meta.url),
    'utf8',
  );

  assert.match(source, /where slug = any\(\$1::text\[\]\)/);
  assert.match(source, /recovery_payload/);
  assert.match(source, /GROOKAI_PUBLIC_TEST_PROFILE_QUARANTINE_ACK/);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\btruncate\b/i);
  assert.doesNotMatch(source, /auth\.users/i);
  assert.doesNotMatch(source, /vault_item_instances\s+set/i);
});
