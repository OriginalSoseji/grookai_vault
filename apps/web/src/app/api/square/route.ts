import {NextRequest} from 'next/server';
import {squareBackend, squareBody, squareFailure, squareId, squareOriginAllowed, squareOwner, squareReply, squareText} from '@/lib/square/http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  try {
    const owner = await squareOwner();
    if (!owner) return squareReply({error: 'Sign in to your grookai account.'}, 401);
    const {data, error} = await owner.client.rpc('square_workspace_v1');
    if (error || !data) throw new Error('square_state_unavailable');
    const commerce=await owner.client.rpc('square_commerce_workspace_v2');
    if(commerce.error)throw new Error('square_state_unavailable');
    const onboarding=await owner.client.rpc('square_onboarding_access_v1');
    if(onboarding.error)throw new Error('square_state_unavailable');
    return squareReply({...data,onboarding:onboarding.data,commerce:{...commerce.data,enabled:commerce.data.enabled&&process.env.GROOKAI_SQUARE_COMMERCE_ENABLED==='true'},linkingEnabled: (data.linkingEnabled || onboarding.data.available) && process.env.GROOKAI_SQUARE_LINKING_ENABLED === 'true',
      catalogEnabled: data.catalogEnabled && process.env.GROOKAI_SQUARE_CATALOG_ENABLED === 'true'});
  } catch (error) {return squareFailure(error);}
}
export async function POST(request: NextRequest) {
  if (!squareOriginAllowed(request)) return squareReply({error: 'Invalid request origin.'}, 403);
  try {
    const owner = await squareOwner();
    if (!owner) return squareReply({error: 'Sign in to your grookai account.'}, 401);
    const body = await squareBody(request), backend = squareBackend();
    if (body.action === 'link') {
      const access=await owner.client.rpc('square_onboarding_enroll_v1');
      if(access.error)throw new Error(/^square_[a-z_]{1,80}$/.test(access.error.message)?access.error.message:'square_state_unavailable');
      return squareReply(await backend.start(owner.actorId,{clientReturn:body.clientReturn==='native'?'native':'web'}));
    }
    if(body.action==='prepareRemoval')return squareReply(await backend.commerce.prepareVaultRemoval(owner.actorId,squareId(body.instanceId)));
    const connectionId = squareId(body.connectionId);
    if(body.action==='preferences')return squareReply(await backend.commerce.preferences(owner.actorId,connectionId,
      {autoEnroll:body.autoEnroll===true,sellOnSquare:body.sellOnSquare===true,confirmed:body.confirmed===true}));
    if(body.action==='process')return squareReply(await backend.commerce.processConnection(owner.actorId,connectionId,{maxTargets:5,manual:true}));
    if(body.action==='notify')return squareReply(await backend.commerce.processConnection(owner.actorId,connectionId,{maxTargets:2,manual:false}));
    if(body.action==='reconcile')return squareReply(await backend.commerce.reconcile(owner.actorId,connectionId));
    if(body.action==='withdraw')return squareReply(await backend.commerce.withdraw(owner.actorId,connectionId,squareId(body.targetId)));
    if(body.action==='releaseStock')return squareReply(await backend.commerce.releaseStock(owner.actorId,connectionId,squareId(body.targetId),
      {confirmed:body.confirmed===true,physicalCopyPresent:body.physicalCopyPresent===true,registerOnline:body.registerOnline===true}));
    if(body.action==='return')return squareReply(await backend.commerce.receiveReturn(owner.actorId,connectionId,squareId(body.saleId),body.confirmed===true));
    if (body.action === 'locations') return squareReply(await backend.locations(owner.actorId, connectionId));
    if (body.action === 'configure') return squareReply(await backend.configure(owner.actorId, connectionId,
      {locationId: squareText(body.locationId), autoSync: body.autoSync === true}));
    if (body.action === 'pause') return squareReply(await backend.pause(owner.actorId, connectionId));
    if (body.action === 'disconnect') return squareReply(await backend.disconnect(owner.actorId, connectionId));
    if (body.action === 'select' || body.action === 'deselect') {
      if (!Array.isArray(body.instanceIds)) throw new Error('square_invalid_selection');
      const instanceIds = body.instanceIds.map(squareId);
      return squareReply(body.action === 'select' ? await backend.select(owner.actorId, connectionId, {instanceIds, confirmed: body.confirmed === true})
        : await backend.deselect(owner.actorId, connectionId, instanceIds));
    }
    const targetId = squareId(body.targetId), requestId = squareId(body.requestId);
    if (body.action === 'sync') return squareReply(await backend.sync(owner.actorId, connectionId, targetId, requestId));
    if (body.action === 'adopt') return squareReply(await backend.adopt(owner.actorId, connectionId, targetId,
      {itemId: squareText(body.itemId), variationId: squareText(body.variationId), expectedReviewHash: squareText(body.expectedReviewHash), requestId, confirmed: body.confirmed === true}));
    throw new Error('square_invalid_request');
  } catch (error) {return squareFailure(error);}
}
