import {NextRequest} from 'next/server';
import {squareFailure, squareOwner, squareReply} from '@/lib/square/http';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const owner = await squareOwner();
    if (!owner) return squareReply({error: 'Sign in to your grookai account.'}, 401);
    const raw = request.nextUrl.searchParams.get('offset') ?? '0';
    if (!/^(0|[1-9][0-9]{0,4})$/.test(raw) || Number(raw) > 20000) throw new Error('square_invalid_request');
    const offset = Number(raw);
    // Read through the authenticated owner SDK/RLS. This is a choice list, not
    // publication authority; select/sync reprove full public-printing eligibility.
    const {data, error} = await owner.client.from('vault_item_instances')
      .select('id,gv_vi_id,name,condition_label,asking_price_amount,asking_price_currency,card:card_prints!card_print_id(name,number)')
      .eq('user_id', owner.actorId).is('archived_at', null).eq('intent', 'sell').eq('pricing_mode', 'asking')
      .eq('asking_price_currency', 'USD').gt('asking_price_amount', 0).order('id').range(offset, offset + 99);
    if (error) throw new Error('square_state_unavailable');
    return squareReply({rows: data ?? [], nextOffset: data?.length === 100 ? offset + 100 : null});
  } catch (error) {return squareFailure(error);}
}
