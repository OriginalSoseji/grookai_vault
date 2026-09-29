import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../apps/web/src/lib/import/importVaultItems.ts',import.meta.url),'utf8');
test('bulk ownership writes stay within the actor-bound execution boundary',()=>{
 assert.match(source,/return executeOwnerWriteV1<ImportVaultItemsResult>/);
 assert.match(source,/actor_id: userId/);assert.match(source,/assertAuthenticatedVaultUser\(client, userId\)/);
 assert.match(source,/context\.adminClient\.rpc\("admin_import_vault_receipted_v1"/);
});
test('old per-copy and compatibility-mirror writers are retired from web imports',()=>{
 assert.doesNotMatch(source,/admin_vault_instance_create_v1|resolveActiveVaultAnchor|mirrorLegacyBucketQuantity|\.from\("vault_items"\)/);
 assert.match(source,/verifyImportReceipt\(receipt, targets, requestId\)/);
});
