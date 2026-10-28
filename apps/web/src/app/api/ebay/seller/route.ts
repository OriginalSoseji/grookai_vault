import { NextRequest } from 'next/server';
import { sellerBackend, sellerBody, sellerFailure, sellerId, sellerOriginAllowed,
  sellerOwner, sellerReply, sellerRevision } from '@/lib/ebay/sellerHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const owner = await sellerOwner();
    if (!owner) return sellerReply({ error: 'Sign in to your grookai account.' }, 401);
    const draftId = request.nextUrl.searchParams.get('draftId');
    const { data, error } = draftId
      ? await owner.client.rpc('ebay_seller_draft_status_v1', { p_draft_id: sellerId(draftId) })
      : await owner.client.rpc('ebay_seller_workspace_v1', {
        p_instance_id: request.nextUrl.searchParams.has('instanceId')
          ? sellerId(request.nextUrl.searchParams.get('instanceId')) : null });
    if (error) throw new Error('seller_state_unavailable');
    return sellerReply(draftId ? { draft: data } : data);
  } catch (error) { return sellerFailure(error); }
}

export async function POST(request: NextRequest) {
  if (!sellerOriginAllowed(request)) return sellerReply({ error: 'Invalid request origin.' }, 403);
  try {
    const owner = await sellerOwner();
    if (!owner) return sellerReply({ error: 'Sign in to your grookai account.' }, 401);
    const body = await sellerBody(request);
    if (body.action === 'record_sale') {
      const amount = sellerRevision(body.salePriceCents);
      if (body.confirmed !== true || amount > 100000000) throw new Error('seller_confirmed_sale_amount_required');
      const { data, error } = await owner.client.rpc('ebay_seller_record_sale_v1', {
        p_draft_id: sellerId(body.draftId), p_request_id: sellerId(body.requestId),
        p_expected_revision: sellerRevision(body.revision), p_sale_price_cents: amount, p_confirmed: true,
      });
      if (error) throw new Error(/^seller_[a-z_]{1,72}$/.test(error.message) ? error.message : 'seller_state_unavailable');
      return sellerReply(data);
    }
    const backend = sellerBackend();
    if (body.action === 'link') return sellerReply(await backend.oauth.start(owner.actorId));
    if (body.action === 'metadata') return sellerReply(await backend.metadata(owner.actorId, {
      instanceId: sellerId(body.instanceId), accountId: sellerId(body.accountId) }));
    const draftId = sellerId(body.draftId);
    const revision = sellerRevision(body.revision, body.action === 'save');
    if (body.action === 'save') {
      if (!body.listing || typeof body.listing !== 'object' || Array.isArray(body.listing)) throw new Error('seller_request_invalid');
      return sellerReply(await backend.saveDraft(owner.actorId, { draftId, revision,
        instanceId: sellerId(body.instanceId), accountId: sellerId(body.accountId),
        listing: body.listing as Record<string, unknown> }));
    }
    if (body.action === 'photo') return sellerReply(await backend.registerPhoto(owner.actorId, {
      draftId, revision, photoId: sellerId(body.photoId) }));
    if (body.action === 'remove_photo') return sellerReply(await backend.removePhoto(owner.actorId, {
      draftId, revision, photoId: sellerId(body.photoId) }));
    const requestId = sellerId(body.requestId);
    if (body.action === 'prepare') return sellerReply(await backend.preparation.step({
      actorId: owner.actorId, draftId, requestId, revision,
      operationId: body.operationId === undefined ? null : sellerId(body.operationId) }));
    if (body.action === 'edit' || body.action === 'abandon') return sellerReply(await backend.draftAction(owner.actorId, {
      draftId, requestId, revision, action: body.action }));
    if (body.action === 'publish' || body.action === 'withdraw' || body.action === 'reconcile') {
      if (body.action === 'publish' && body.confirmed !== true) throw new Error('seller_request_invalid');
      if (body.action === 'withdraw' && body.confirmed !== true) throw new Error('seller_request_invalid');
      return sellerReply(await backend.publication.execute({ actorId: owner.actorId,
        draftId, requestId, revision, kind: body.action,
        reviewHash: body.action === 'publish' && typeof body.reviewHash === 'string' ? body.reviewHash : null }));
    }
    throw new Error('seller_request_invalid');
  } catch (error) { return sellerFailure(error); }
}
