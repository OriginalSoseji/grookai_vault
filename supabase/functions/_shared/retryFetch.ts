// Codex: created 2025-11-03
import { fetchWithTimeout } from "./fetchWithTimeout.ts";

export type RetryOptions = {
  attempts?: number;      // total attempts including first (default 3)
  baseDelayMs?: number;   // initial backoff (default 500)
  maxDelayMs?: number;    // cap (default 4000)
  timeoutMs?: number;     // per-attempt timeout (default 20000)
  retryOn?: (res: Response | Error) => boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function retryFetch(input: RequestInfo, init: RequestInit = {}, opts: RetryOptions = {}) {
  const attempts   = opts.attempts ?? 3;
  const base       = opts.baseDelayMs ?? 500;
  const cap        = opts.maxDelayMs ?? 4000;
  const timeoutMs  = opts.timeoutMs ?? 20000;
  const retryOn    = opts.retryOn ?? ((r) => r instanceof Error || (r as Response).status >= 500);

  let lastErr: unknown = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchWithTimeout(input, { ...init, timeoutMs });
      if (!retryOn(res)) return res as Response;
      lastErr = res;
    } catch (e) {
      if (!retryOn(e as Error)) throw e;
      lastErr = e;
    }
    if (i < attempts - 1) {
      const delay = Math.min(cap, base * Math.pow(2, i));
      const jitter = Math.floor(Math.random() * (delay / 3));
      await sleep(delay + jitter);
    }
  }
  if (lastErr instanceof Response) return lastErr;
  throw lastErr instanceof Error ? lastErr : new Error("retryFetch: exhausted attempts");
}

