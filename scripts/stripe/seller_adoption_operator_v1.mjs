// Operator-only plan/apply boundary. Never imported by a browser or public route.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { verifySellerAdoption, sellerOwnerEmailHash } from '../../apps/web/src/lib/payments/vendorSellerAdoption.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha = /^[a-f0-9]{64}$/;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const adoptionPlanHash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function keys(value, expected) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Invalid operator record');
  assert.deepEqual(Object.keys(value).sort(), expected.split(' ').sort(), 'Unexpected operator fields');
}
function context(input) {
  assert.match(input.projectRef, /^[a-z0-9-]{3,80}$/);
  assert.match(input.migrationSha256, sha);
  assert.match(input.scope.accountId, /^acct_[A-Za-z0-9]+$/);
  assert.equal(typeof input.scope.livemode, 'boolean');
}
async function inspect(repo, ownerId, storeId) {
  const current = await repo.inspect(ownerId, storeId);
  assert.equal(current.owner?.id, ownerId, 'Owner mismatch');
  assert.equal(current.storeId, storeId, 'Store mismatch');
  assert.equal(current.owner.emailConfirmed, true, 'Owner email unconfirmed');
  assert.equal(current.eligible, true, 'Owner is not eligible for seller connection');
  return current;
}

export function createSellerAdoptionOperator(input) {
  context(input);
  const { repo, stripe, scope, projectRef, migrationSha256 } = input;
  const clock = input.clock ?? (() => Math.floor(Date.now() / 1000));
  return {
    async plan({ ownerId, storeId, connectedAccountId }) {
      assert.match(ownerId, uuid); assert.match(storeId, uuid);
      assert.match(connectedAccountId, /^acct_[A-Za-z0-9]+$/);
      const current = await inspect(repo, ownerId, storeId);
      assert.equal(current.hasBinding, false, 'Existing seller binding');
      assert.equal(current.hasGrant, false, 'Existing seller approval');
      if (current.replaceableGrantId != null) assert.match(current.replaceableGrantId, uuid);
      const now = clock();
      const grant = { id: randomUUID(), ownerId, storeId, platformAccountId: scope.accountId,
        connectedAccountId, livemode: scope.livemode, ownerEmailSha256: sellerOwnerEmailHash(current.owner.email),
        createdAt: now, expiresAt: now + 86400 };
      // This grant-shaped value is a proposed scope only; plan() performs no write.
      const evidence = await verifySellerAdoption(stripe, scope, grant, current.owner, clock);
      const body = { version: 'vendor-seller-approval-plan-v1', projectRef, migrationSha256,
        grant, providerEvidenceSha256: evidence.sha256, createdAt: now, expiresAt: now + 1800,
        ...(current.replaceableGrantId ? { replacesGrantId: current.replaceableGrantId } : {}) };
      return { ...body, sha256: adoptionPlanHash(body) };
    },
    async apply(plan, approvedSha256) {
      keys(plan, 'version projectRef migrationSha256 grant providerEvidenceSha256 createdAt expiresAt sha256' +
        (Object.hasOwn(plan, 'replacesGrantId') ? ' replacesGrantId' : ''));
      if (Object.hasOwn(plan, 'replacesGrantId')) assert.match(plan.replacesGrantId, uuid);
      keys(plan.grant, 'id ownerId storeId platformAccountId connectedAccountId livemode ownerEmailSha256 createdAt expiresAt');
      const { sha256, ...body } = plan;
      assert.match(approvedSha256, sha); assert.equal(approvedSha256, sha256, 'Approval hash mismatch');
      assert.equal(adoptionPlanHash(body), sha256, 'Plan changed after approval');
      assert.equal(plan.version, 'vendor-seller-approval-plan-v1');
      assert.equal(plan.projectRef, projectRef, 'Database project mismatch');
      assert.equal(plan.migrationSha256, migrationSha256, 'Migration changed after approval');
      assert.match(plan.providerEvidenceSha256, sha);
      assert.ok(Number.isSafeInteger(plan.createdAt) && Number.isSafeInteger(plan.expiresAt));
      assert.equal(plan.expiresAt - plan.createdAt, 1800);
      assert.equal(plan.grant.createdAt, plan.createdAt);
      assert.equal(plan.grant.expiresAt - plan.grant.createdAt, 86400);
      const now = clock();
      assert.ok(plan.createdAt <= now && now < plan.expiresAt, 'Operator plan expired');
      for (const id of [plan.grant.id, plan.grant.ownerId, plan.grant.storeId]) assert.match(id, uuid);
      assert.equal(plan.grant.platformAccountId, scope.accountId);
      assert.equal(plan.grant.livemode, scope.livemode);
      // Deployment proof and immutable migration bytes are verified by the adapter
      // before any write, separately from the human-reviewed account scope.
      await repo.assertReleased(migrationSha256);
      const current = await inspect(repo, plan.grant.ownerId, plan.grant.storeId);
      assert.equal(current.hasBinding, false, 'Existing seller binding');
      assert.equal(sellerOwnerEmailHash(current.owner.email), plan.grant.ownerEmailSha256, 'Owner email changed');
      const evidence = await verifySellerAdoption(stripe, scope, plan.grant, current.owner, clock);
      assert.ok(clock() < plan.expiresAt, 'Operator plan expired during verification');
      const result = await repo.issue(plan, evidence);
      assert.equal(result.id, plan.grant.id, 'Grant readback mismatch');
      assert.equal(result.approval_sha256, approvedSha256, 'Approval readback mismatch');
      assert.equal(result.enabled, true, 'Approval is revoked');
      return { version: 'vendor-seller-approval-result-v1', grantId: result.id, approvalSha256: approvedSha256,
        expiresAt: plan.grant.expiresAt, bindingCreated: false, providerWrites: 0 };
    },
  };
}
