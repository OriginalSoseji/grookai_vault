import { parseBackup } from './receiptBook.mjs';

export const CLOUD_BOOK_LIMIT = 10000000;
export function parseCloudWrite(input) {
  if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0 ||
      typeof input.requestId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw Error('Invalid receipt save request.');
  }
  const book = parseBackup(JSON.stringify(input.book));
  if (new TextEncoder().encode(JSON.stringify(book)).byteLength > CLOUD_BOOK_LIMIT) throw Error('Receipt book is too large.');
  return { revision:input.revision, requestId:input.requestId, book };
}

// Receipt books use the existing authenticated Supabase SDK, not a Vercel
// function whose 4.5 MB payload cap is smaller than the supported book size.
// Auth.uid() in the RPC is the owner authority; the local session check also
// prevents an already-open editor saving into a newly switched account.
export function receiptRpcTransport(client) {
  let owner;
  return async (_path, init) => {
    const {data:{session}} = await client.auth.getSession();
    if (!session || (owner && owner !== session.user.id)) return new Response(null,{status:401});
    owner ??= session.user.id;
    let result;
    if (init.method === 'PUT') {
      const input = parseCloudWrite(JSON.parse(init.body));
      result = await client.rpc('vendor_receipt_book_save_v1', {
        p_revision:input.revision,p_request_id:input.requestId,p_book:input.book,
      }).abortSignal(init.signal);
    } else result = await client.rpc('vendor_receipt_book_read_v1').abortSignal(init.signal);
    // PostgREST's SDK converts transport failures into status-zero results.
    if (result.error && (result.status === 0 || !result.error.code)) throw Error('Receipt RPC could not be reached');
    if (result.error) return new Response(null,{status:result.error.code==='PT409'?409:result.error.code==='42501'?401:503});
    return Response.json(result.data);
  };
}

// A stable operation ID survives a network retry. We never retry against a newer
// revision automatically: that could overwrite another device's customer edits.
export async function openCloudReceiptBook(transport) {
  async function call(init) {
    let response;
    try { response = await transport('receipt-book', {cache:'no-store', signal:AbortSignal.timeout(20000), ...init}); }
    catch { throw Error('The account could not be reached. Your draft is still here. Retry, or reload to check whether the last save completed.'); }
    if (!response.ok) {
      if (response.status === 409) throw Error('Another device changed your receipt book. Your draft has not replaced it. Back up your draft details, then reload the account book before saving.');
      if (response.status === 401) throw Error('Please sign in again. Your draft has not been cleared.');
      throw Error('The account receipt book is unavailable. Your draft has not been cleared.');
    }
    const result = await response.json();
    if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw Error('Invalid account response. Reload to check your saved receipts.');
    return {revision:result.revision, book:parseBackup(JSON.stringify(result.book))};
  }
  let current = await call(), pending;
  return {
    book: current.book,
    async save(book) {
      const canonical = parseBackup(JSON.stringify(book));
      const raw = JSON.stringify(canonical);
      if (!pending || pending.raw !== raw) pending = {raw, requestId:crypto.randomUUID(), revision:current.revision};
      const result = await call({method:'PUT', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({revision:pending.revision, requestId:pending.requestId, book:canonical})});
      if (JSON.stringify(result.book) !== raw || result.revision !== pending.revision+1) {
        throw Error('The saved result needs checking. Reload your account book before recording another sale.');
      }
      current = result; pending = null;
    },
  };
}
