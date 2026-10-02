import { parseBackup } from './receiptBook.mjs';

export const CLOUD_BOOK_LIMIT = 10000000;
export function parseCloudWrite(input) {
  if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0 ||
      typeof input.requestId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw Error('Invalid receipt save request.');
  }
  return { revision:input.revision, requestId:input.requestId, book:parseBackup(JSON.stringify(input.book)) };
}

// A stable operation ID survives a network retry. We never retry against a newer
// revision automatically: that could overwrite another device's customer edits.
export async function openCloudReceiptBook(transport = fetch) {
  async function call(init) {
    let response;
    try { response = await transport('/api/receipts/book', {cache:'no-store', credentials:'same-origin', signal:AbortSignal.timeout(20000), ...init}); }
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
