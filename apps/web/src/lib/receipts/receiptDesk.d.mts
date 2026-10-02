export type ReceiptDeskOptions = { accountKey?: string; storeName?: string; prefill?: {description:string;price:string;customerName:string;sourceDispositionId:string}|null; storage?: Storage };
export function mountReceiptDesk(root: HTMLElement, options?: ReceiptDeskOptions): () => void;
