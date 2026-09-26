export class ScanProcessError extends Error { code: string; constructor(code: string); }
export function runScanProcess<T = unknown>(entry: string | URL, payload: unknown, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<T>;
export function readScanBody(body: ReadableStream<Uint8Array> | null, options: { maxBytes: number; timeoutMs?: number; signal?: AbortSignal }): Promise<Buffer>;
