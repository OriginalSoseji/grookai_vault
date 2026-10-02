export const CLOUD_BOOK_LIMIT: number;
export function parseCloudWrite(input: unknown): {revision:number;requestId:string;book:unknown};
export function openCloudReceiptBook(transport?: typeof fetch): Promise<{book:unknown;save(book:unknown):Promise<void>}>;
