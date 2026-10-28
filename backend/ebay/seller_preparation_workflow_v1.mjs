import { randomUUID } from 'node:crypto';
import { EbaySellerApiError } from './seller_client_v1.mjs';
import { buildSellerListingPreparation, serializeSellerReview } from './seller_review_payload_v1.mjs';
import { bindSellerFeeReview } from './seller_fee_review_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };
const uuid = value => typeof value === 'string'
  && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);

// One bounded preparation step per invocation. Dependencies are composed by the
// server worker from the shared SDK and pinned provider clients, never supplied
// by the public request. Safe handoffs retire the old worker nonce in SQL.
export class EbaySellerPreparationWorkflow {
  #db; #load; #clients; #evidence; #download; #now;
  constructor({ db, loadContext, clientsForAccount, evidenceForCopy, downloadPhoto,
    now = () => Date.now() }) {
    if (!db || typeof db.rpc !== 'function' ||
        ![loadContext, clientsForAccount, evidenceForCopy, downloadPhoto, now].every(v => typeof v === 'function')) {
      fail('seller_configuration_unavailable');
    }
    this.#db = db; this.#load = loadContext; this.#clients = clientsForAccount;
    this.#evidence = evidenceForCopy; this.#download = downloadPhoto; this.#now = now;
  }

  async #call(name, payload) {
    let result;
    try { result = await this.#db.rpc(name, payload); }
    catch { fail('seller_state_unavailable'); }
    if (result?.error) {
      const code = /^seller_[a-z_]{1,72}$/.test(result.error.message ?? '')
        ? result.error.message : 'seller_state_unavailable';
      fail(code);
    }
    if (result?.data === null || result?.data === undefined) fail('seller_state_unavailable');
    return result.data;
  }

  async step({ actorId, draftId, requestId, revision, operationId = null }) {
    if (![actorId, draftId, requestId].every(uuid) || !Number.isSafeInteger(revision)
        || revision < 1 || (operationId !== null && !uuid(operationId))) fail('seller_request_invalid');
    const nonce = randomUUID();
    const claim = operationId === null
      ? await this.#call('ebay_seller_operation_claim_v1', { p_actor: actorId,
        p_draft_id: draftId, p_request_id: requestId, p_kind: 'prepare',
        p_expected_revision: revision, p_expected_hash: null, p_claim_nonce: nonce })
      : await this.#call('ebay_seller_operation_resume_v1', { p_actor: actorId,
        p_operation_id: operationId, p_claim_nonce: nonce });
    if (!uuid(claim.operationId) || !['running', 'succeeded', 'failed', 'uncertain'].includes(claim.status)
        || typeof claim.claimGranted !== 'boolean') fail('seller_state_unavailable');
    if (!claim.claimGranted) return { operationId: claim.operationId, status: claim.status,
      recovered: true, continuationReady: false };
    const authority = { p_actor: actorId, p_operation_id: claim.operationId, p_claim_nonce: nonce };
    const checkpoint = async (from, to, receipt) => {
      const result = await this.#call('ebay_seller_operation_checkpoint_v1', { ...authority,
        p_expected_stage: from, p_next_stage: to, ...(receipt === undefined ? {} : { p_receipt: receipt }) });
      if (result.status !== 'running' || result.advanced !== true || result.stage !== to) fail('seller_operation_result_uncertain');
    };
    const photoReceipt = async (photoId, transition, receipt) => {
      const result = await this.#call('ebay_seller_photo_receipt_v1', { ...authority,
        p_photo_id: photoId, p_transition: transition,
        ...(receipt === undefined ? {} : { p_receipt: receipt }) });
      if (result.status !== 'running' || result.advanced !== true) fail('seller_operation_result_uncertain');
    };
    try {
      const context = await this.#load({ actorId, draftId });
      if (!context || context.draft?.id !== draftId || context.draft.user_id !== actorId
          || context.draft.account_id !== claim.accountId || context.draft.revision !== revision
          || context.draft.state !== 'preparing' || claim.sku !== 'gv-' + draftId
          || !uuid(claim.accountId) || !Array.isArray(context.photos)
          || !context.photos.length || context.photos.length > 12) fail('seller_state_unavailable');
      const clients = await this.#clients({ actorId, accountId: claim.accountId });
      if (claim.stage === 'claimed') {
        const pending = context.photos.find(photo => photo.state !== 'hosted');
        if (pending) {
          if (!uuid(pending.id) || pending.user_id !== actorId || pending.draft_id !== draftId
              || !['awaiting_upload', 'ready'].includes(pending.state)) fail('seller_photo_requires_reconciliation');
          // Validate/download the registered private object before declaring a
          // provider upload intent. No user URL or catalog image is fetched.
          const bytes = await this.#download({ actorId, draftId, photo: pending });
          await photoReceipt(pending.id, 'start_upload');
          const uploaded = await clients.media.uploadCopyPhoto(bytes);
          await photoReceipt(pending.id, 'uploaded', { imageId: uploaded.imageId,
            sourceSha256: uploaded.sourceSha256 });
          const image = uploaded.image ?? await clients.media.getImage(uploaded.imageId);
          await photoReceipt(pending.id, 'hosted', { imageId: uploaded.imageId,
            imageUrl: image.imageUrl, expiresAt: image.expiresAt });
        } else {
          const evidence = await this.#evidence({ actorId, accountId: claim.accountId,
            copy: context.copy, input: context.draft.input, client: clients.listing });
          const preparation = buildSellerListingPreparation({ actorId, draftId, revision,
            sellerAccountId: claim.accountId, copy: context.copy, input: context.draft.input,
            evidence, photos: context.photos.map(p => ({ id: p.id, ownerId: p.user_id,
              draftId: p.draft_id, sha256: p.source_sha256, imageUrl: p.image_url, expiresAt: p.expires_at })), now: this.#now() });
          await checkpoint('claimed', 'photos_ready', { preparationJson: serializeSellerReview(preparation.snapshot),
            preparationHash: preparation.preparationHash });
        }
      } else {
        const snapshot = claim.snapshot?.preparation;
        if (!snapshot || snapshot.actorId !== actorId || snapshot.draftId !== draftId
            || snapshot.revision !== revision || snapshot.sellerAccountId !== claim.accountId) fail('seller_state_unavailable');
        if (claim.stage === 'photos_ready') {
          await checkpoint('photos_ready', 'inventory_started');
          await clients.listing.putInventoryItem(claim.sku, snapshot.inventory);
          await checkpoint('inventory_started', 'inventory_written');
        } else if (claim.stage === 'inventory_written') {
          await checkpoint('inventory_written', 'offer_started');
          let offerId = claim.offerId;
          if (offerId) await clients.listing.updateOffer(offerId, snapshot.offer);
          else offerId = (await clients.listing.createOffer(snapshot.offer)).offerId;
          await checkpoint('offer_started', 'offer_created', { offerId });
        } else if (['offer_created', 'fees_started'].includes(claim.stage)) {
          if (claim.stage === 'offer_created') await checkpoint('offer_created', 'fees_started');
          const requestedAt = this.#now();
          const response = await clients.listing.getListingFees(claim.offerId);
          const review = bindSellerFeeReview({ preparation: { snapshot,
            preparationHash: claim.snapshot.preparationHash, inventory: snapshot.inventory, offer: snapshot.offer },
          receipt: { requestedOfferId: claim.offerId, offerId: claim.offerId,
            sellerAccountId: claim.accountId, draftId, draftRevision: revision,
            preparationHash: claim.snapshot.preparationHash, requestedAt, response }, now: this.#now() });
          const result = await this.#call('ebay_seller_operation_complete_v1', { ...authority,
            p_receipt: { reviewHash: review.reviewHash, feeQuote: review.feeQuote },
            p_review_json: serializeSellerReview(review.snapshot) });
          if (!['succeeded', 'failed', 'uncertain'].includes(result.status)) fail('seller_state_unavailable');
          return { operationId: claim.operationId, status: result.status, state: result.state,
            continuationReady: false, recovered: result.recovered === true };
        } else fail('seller_operation_requires_reconciliation');
      }
      const yielded = await this.#call('ebay_seller_operation_yield_v1', authority);
      if (yielded.status !== 'running' || yielded.continuationReady !== true) fail('seller_state_unavailable');
      return { operationId: claim.operationId, status: 'running', continuationReady: true, recovered: false };
    } catch (error) {
      const safe = error instanceof EbaySellerApiError ? error
        : new EbaySellerApiError('seller_operation_result_uncertain', { uncertain: true });
      try {
        await this.#call('ebay_seller_operation_fail_v1', { ...authority,
          p_uncertain: safe.uncertain || safe.code === 'seller_state_unavailable', p_error_code: safe.code });
      } catch {
        // A lost handoff acknowledgement has already retired this nonce. It
        // cannot overwrite the safe checkpoint or replay its provider call.
      }
      throw safe;
    }
  }
}
