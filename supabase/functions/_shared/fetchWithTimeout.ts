// Codex: created 2025-11-03
export async function fetchWithTimeout(input: RequestInfo, init: (RequestInit & { timeoutMs?: number }) = {}) {
  const { timeoutMs = 20000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

