import { randomUUID } from 'node:crypto';
import { EbaySellerApiError } from './seller_client_v1.mjs';
import { observeEbayOffer } from './seller_offer_observation_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };
const uuid = value => typeof value === 'string'
  && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const projection = value => ({ operationId: value.operationId, status: value.status,
  ...(typeof value.state === 'string' ? { state: value.state } : {}),
  recovered: value.recovered === true });

// Thin HTTP adapters supply a verified actor, never a client owner attestation.
// Both factories are server-owned: token authority runs only after SQL claims
// the operation; the client always uses the pinned production provider origin.
export class EbaySellerPublicationWorkflow {
  #db; #clientForAccount; #verifyReview;
  constructor({ db, clientForAccount, verifyPublicationReview }) {
    if (!db || typeof db.rpc !== 'function' || typeof clientForAccount !== 'function'
        || typeof verifyPublicationReview !== 'function') {
      fail('seller_configuration_unavailable');
    }
    this.#db = db;
    this.#clientForAccount = clientForAccount;
    this.#verifyReview = verifyPublicationReview;
  }

  async #call(name, payload) {
    let result;
    try { result = await this.#db.rpc(name, payload); }
    catch { fail('seller_state_unavailable'); }
    if (result?.error) {
      const message = result.error.message;
      fail(/^seller_[a-z_]{1,72}$/.test(message ?? '') ? message : 'seller_state_unavailable');
    }
    if (result?.data === undefined || result.data === null) fail('seller_state_unavailable');
    return result.data;
  }

  async execute({ actorId, draftId, requestId, revision, kind, reviewHash = null }) {
    if (![actorId, draftId, requestId].every(uuid)
        || !Number.isSafeInteger(revision) || revision < 1
        || !['publish', 'withdraw', 'reconcile'].includes(kind)
        || (kind === 'publish' && (typeof reviewHash !== 'string' || !/^[a-f0-9]{64}$/.test(reviewHash)))
        || (kind !== 'publish' && reviewHash !== null)) fail('seller_request_invalid');
    const nonce = randomUUID();
    const claim = await this.#call('ebay_seller_operation_claim_v1', {
      p_actor: actorId, p_draft_id: draftId, p_request_id: requestId, p_kind: kind,
      p_expected_revision: revision, p_expected_hash: reviewHash, p_claim_nonce: nonce,
    });
    if (!uuid(claim.operationId) || !['running', 'succeeded', 'failed', 'uncertain'].includes(claim.status)
        || typeof claim.claimGranted !== 'boolean') fail('seller_state_unavailable');
    if (!claim.claimGranted) return projection(claim);
    const operationId = claim.operationId;
    let intentAcknowledged = false;
    try {
      if (claim.status !== 'running' || claim.stage !== 'claimed' || !uuid(claim.accountId)
          || claim.sku !== 'gv-' + draftId || (kind !== 'reconcile' && !identifier(claim.offerId))
          || (kind === 'withdraw' && !identifier(claim.listingId))) fail('seller_state_unavailable');
      const client = await this.#clientForAccount({ actorId, accountId: claim.accountId });
      if (kind === 'publish') await this.#verifyReview({ actorId, draftId, revision,
        accountId: claim.accountId, reviewHash, snapshot: claim.snapshot, client });
      const stage = kind === 'publish' ? 'publish_started'
        : kind === 'withdraw' ? 'withdraw_started' : 'observing';
      const intent = await this.#call('ebay_seller_operation_checkpoint_v1', {
        p_actor: actorId, p_operation_id: operationId, p_claim_nonce: nonce,
        p_expected_stage: 'claimed', p_next_stage: stage,
      });
      if (intent.status !== 'running' || intent.advanced !== true || intent.stage !== stage) {
        fail('seller_operation_result_uncertain');
      }
      intentAcknowledged = true;
      let receipt;
      if (kind === 'publish') {
        const result = await client.publishOffer(claim.offerId);
        if (!identifier(result?.listingId)) throw new EbaySellerApiError('provider_result_uncertain', { uncertain: true });
        receipt = { offerId: claim.offerId, listingId: result.listingId };
      } else if (kind === 'withdraw') {
        const result = await client.withdrawOffer(claim.offerId);
        if (result?.listingId !== claim.listingId) throw new EbaySellerApiError('provider_result_uncertain', { uncertain: true });
        receipt = { offerId: claim.offerId, listingId: result.listingId, evidence: 'withdraw_response' };
      } else {
        let offerId = claim.offerId;
        if (offerId === null || offerId === undefined) {
          const candidates = await client.getOffersForSku(claim.sku);
          if (!Array.isArray(candidates?.offers) || !Number.isSafeInteger(candidates.total)
              || candidates.total !== candidates.offers.length) fail('seller_offer_discovery_incomplete');
          if (candidates.total === 0) fail('seller_offer_not_observed_yet');
          if (candidates.total !== 1 || !identifier(candidates.offers[0]?.offerId)) {
            fail('seller_multiple_offers_require_review');
          }
          offerId = candidates.offers[0].offerId;
        }
        receipt = observeEbayOffer(await client.getOffer(offerId), {
          sku: claim.sku, offerId, listingId: claim.listingId ?? null,
        });
      }
      const completed = await this.#call('ebay_seller_operation_complete_v1', {
        p_actor: actorId, p_operation_id: operationId, p_claim_nonce: nonce, p_receipt: receipt,
      });
      if (!['succeeded', 'failed', 'uncertain'].includes(completed.status)) fail('seller_state_unavailable');
      return projection({ ...completed, operationId });
    } catch (error) {
      const safe = error instanceof EbaySellerApiError ? error
        : new EbaySellerApiError('seller_operation_result_uncertain', { uncertain: true });
      try {
        await this.#call('ebay_seller_operation_fail_v1', {
          p_actor: actorId, p_operation_id: operationId, p_claim_nonce: nonce,
          p_uncertain: safe.uncertain || safe.code === 'seller_state_unavailable'
            || (intentAcknowledged && kind !== 'reconcile'), p_error_code: safe.code,
        });
      } catch {
        // The committed intent/lease and reservation remain durable. Never
        // repeat a provider mutation because its completion receipt was lost.
      }
      throw safe;
    }
  }
}
