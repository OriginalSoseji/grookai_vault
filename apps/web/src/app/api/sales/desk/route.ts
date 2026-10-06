import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { getSiteOrigin } from '@/lib/getSiteOrigin';
import { GET as resolveSearch } from '@/app/api/resolver/search/route';
import { getPublicCardPrintingOptions } from '@/lib/cards/getPublicCardPrintingOptions';
import { resolveCardImageFieldsV1 } from '@/lib/canon/resolveCardImageFieldsV1';
import { resolveDisplayIdentity } from '@/lib/cards/resolveDisplayIdentity';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
async function session() { const client = await createServerComponentClient(); const { data: { user }, error } = await client.auth.getUser(); if (error || !user)
    return null; return { client, user }; }
export async function GET(req: NextRequest) {
    try {
        const ctx = await session();
        if (!ctx)
            return json({ error: 'Sign in required' }, 401);
        const { client, user } = ctx;
        const p = req.nextUrl.searchParams, action = p.get('action') ?? 'session';
        if (action === 'session') {
            const { data: available, error } = await client.rpc('vendor_sales_cart_available_v1');
            if (error)
                throw error;
            const { data: trades } = await client.rpc('vendor_sales_trade_available_v1');
            const { data: payments } = await client.rpc('vendor_sales_payments_available_v1');
            return json({ owner: user.id, payments: payments === true, available: available === true, trades: trades === true });
        }
        if (action === 'book') {
            const { data, error } = await client.rpc('vendor_receipt_book_read_v1');
            if (error)
                throw error;
            return json(data);
        }
        if (action === 'recover') {
            if (!uuid(p.get('id')))
                return json({ error: 'Invalid request' }, 400);
            const { data, error } = await client.rpc('vendor_sales_cart_read_v1', { p_request_id: p.get('id') });
            if (error)
                throw error;
            return json({ receipt: data });
        }
        if (!['stock', 'catalog'].includes(action))
            return json({ error: 'Unknown read' }, 400);
        const q = (p.get('q') ?? '').trim(), game = p.get('game') ?? 'pokemon', offset = Number(p.get('offset') ?? 0), copyOffset = Number(p.get('copyOffset') ?? 0);
        if (q.length > 120 || !['pokemon', 'mtg', 'one_piece'].includes(game) || ![offset, copyOffset].every(n => Number.isInteger(n) && n >= 0 && n <= 10000))
            return json({ error: 'Invalid search' }, 400);
        type CardRow = {
            id: string;
            gv_id?: string;
            name: string;
            number?: string;
            set_code?: string;
            image_url?: string;
            image_source?: string;
            image_path?: string;
            image_status?: string;
            image_note?: string;
            tcgplayer_id?: string;
            variant_key?: string;
            printed_identity_modifier?: string;
            set_identity_model?: string;
            search_card_printing_id?: string;
        };
        let cards: CardRow[] = [], pagination: {
            next_offset?: number | null;
            total_count?: number;
        } | null = null;
        const exactCopy = /^GVVI-[A-Z0-9-]+$/i.test(q);
        if (q.length >= 2 && !exactCopy) {
            const url = new URL('/api/resolver/search', req.url);
            for (const [k, v] of Object.entries({ q, game, pagination: '1', offset: String(offset), limit: '48', ...(action === 'stock' ? { owned: 'owned' } : {}) }))
                url.searchParams.set(k, v);
            const response = await resolveSearch(new NextRequest(url, { headers: req.headers }));
            const found = await response.json();
            if (!response.ok || found.sort_degraded_reason || String(found.source).includes('_degraded_') || !Array.isArray(found.rows))
                throw Error('Search unavailable');
            cards = found.rows;
            pagination = found.pagination ?? null;
            if (action === 'catalog') {
                const options = await getPublicCardPrintingOptions(client, [...new Set(cards.map(c => c.id))]);
                return json({ cards: cards.map(c => ({ ...c, image: c.image_url ?? null, printings: options.filter(o => o.card_print_id === c.id && o.printing_gv_id && (!c.search_card_printing_id || c.search_card_printing_id === o.id)) })), next: pagination?.next_offset != null ? { offset: pagination.next_offset, copyOffset: 0 } : null, total: pagination?.total_count ?? null });
            }
            if (!cards.length)
                return json({ cards: [], next: null, total: 0 });
        }
        else if (action === 'catalog')
            return json({ cards: [], next: null, total: null });
        // An empty slab embed filters slab-only copies without loading the owner's
        // entire inventory. Keep the unfiltered relation for its canonical parent.
        let query = client.from('vault_item_instances').select('id,gv_vi_id,card_print_id,card_printing_id,condition_label,asking_price_amount,asking_price_currency,slab_cert_id,slab:slab_certs(card_print_id,grader,grade),match_slab:slab_certs()').eq('user_id', user.id).is('archived_at', null);
        if (exactCopy)
            query = query.eq('gv_vi_id', q.toUpperCase());
        else if (q.length >= 2) {
            const candidateIds = [...new Set(cards.map(c => c.id))];
            if (!candidateIds.every(uuid))
                throw Error('Invalid resolved identity');
            query = query.in('match_slab.card_print_id', candidateIds).or(`card_print_id.in.(${candidateIds.join(',')}),and(card_print_id.is.null,match_slab.not.is.null)`);
        }
        const { data: raw, error } = await query.order('created_at', { ascending: false }).order('id').range(copyOffset, copyOffset + 48);
        if (error)
            throw error;
        const copies = (raw ?? []).slice(0, 48).map(c => { const slab = (Array.isArray(c.slab) ? c.slab[0] : c.slab) as {
            card_print_id: string;
            grader: string;
            grade: string;
        } | null; return { ...c, slab, card_print_id: c.card_print_id ?? slab?.card_print_id }; }), ids = [...new Set(copies.map(c => c.card_print_id).filter(Boolean))];
        if (!copies.length)
            return json({ cards: [], next: pagination?.next_offset != null ? { offset: pagination.next_offset, copyOffset: 0 } : null, total: null });
        const { data: parents, error: parentError } = await client.from('card_prints').select('id,gv_id,name,number,set_code,variant_key,printed_identity_modifier,set_identity_model,tcgplayer_id,image_source,image_path,image_url,image_alt_url,image_status,image_note').in('id', ids);
        if (parentError)
            throw parentError;
        const options = await getPublicCardPrintingOptions(client, ids);
        const rows = await Promise.all(copies.map(async (copy) => { const c = parents?.find(c => c.id === copy.card_print_id); const printing = options.find(o => o.id === copy.card_printing_id); return { instanceId: copy.id, gvviId: copy.gv_vi_id, id: copy.card_print_id, gv_id: c?.gv_id, name: c ? resolveDisplayIdentity(c).display_name : 'Unresolved card', number: c?.number, set_code: c?.set_code, condition: copy.slab ? [copy.slab.grader, copy.slab.grade].filter(Boolean).join(' ') : copy.condition_label, printing: printing?.finish_label ?? (copy.slab_cert_id ? 'Slab' : 'Printing unassigned'), image: c ? (await resolveCardImageFieldsV1(c)).display_image_url : null, askingMinor: copy.asking_price_currency === 'USD' && copy.asking_price_amount != null ? Math.round(Number(copy.asking_price_amount) * 100) : null, tcgplayer_id: c?.tcgplayer_id }; }));
        return json({ cards: rows.filter(row => !cards.length || cards.some(c => c.id === row.id && (!c.search_card_printing_id || copies.find(i => i.id === row.instanceId)?.card_printing_id === c.search_card_printing_id))), next: (raw?.length ?? 0) > 48 ? { offset, copyOffset: copyOffset + 48 } : pagination?.next_offset != null ? { offset: pagination.next_offset, copyOffset: 0 } : null, total: null });
    }
    catch {
        return json({ error: 'The sales desk could not load this request. Retry; your saved deals are unchanged.' }, 503);
    }
}
export async function POST(req: NextRequest) {
    const origin = req.headers.get('origin');
    if ((origin && origin !== getSiteOrigin()) || (!origin && !/^Bearer \S+$/i.test(req.headers.get('authorization') ?? '')))
        return json({ error: 'Invalid origin' }, 403);
    try {
        const ctx = await session();
        if (!ctx)
            return json({ error: 'Sign in required' }, 401);
        const raw = await req.text();
        if (raw.length > 100000)
            return json({ error: 'Request too large' }, 413);
        let b;
        try {
            b = JSON.parse(raw);
        }
        catch {
            return json({ error: 'Invalid request', rejected: true }, 400);
        }
        if (!b || !uuid(b.id) || !['sale', 'catalog'].includes(b.action))
            return json({ error: 'Invalid request', rejected: true }, 400);
        if (b.owner !== ctx.user.id)
            return json({ error: 'Your account changed. Reopen the sales desk.', rejected: false }, 409);
        const { data, error } = b.action === 'catalog' ? await ctx.client.rpc('vendor_sales_catalog_add_v1', { p_request_id: b.id, p_card: b.card }) : await ctx.client.rpc(b.cart?.version === 3 ? 'vendor_sales_cart_complete_v3' : b.cart?.version === 2 ? 'vendor_sales_cart_complete_v2' : 'vendor_sales_cart_complete_v1', { p_request_id: b.id, p_cart: b.cart });
        if (error) {
            const rejected = ['22023', 'PT409', '23514', '23505', '42501', '22P02'].includes(error.code);
            return json({ error: rejected ? 'Request rejected. Review availability and details.' : 'Result unconfirmed. Recover this same request.', rejected }, rejected ? 409 : 503);
        }
        return json({ result: data });
    }
    catch {
        return json({ error: 'Result unconfirmed. Recover this same request.', rejected: false }, 503);
    }
}
