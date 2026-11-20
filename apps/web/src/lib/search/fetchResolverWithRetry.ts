const INCOMPLETE_SEARCH_TIMEOUT =
  "Search timed out before the complete matching set could be checked. Please narrow your search or try again.";

type ResolverFailure = {
  ok?: boolean;
  error?: string;
  sort_degraded_reason?: string | null;
};

// Retry this exact, idempotent GET once only after the server reports the
// specific incomplete-search timeout. Soft timeouts and other errors stay visible.
export async function fetchResolverWithRetry<T extends ResolverFailure>(
  url: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  allowRetry = true,
): Promise<{ response: Response; payload: T }> {
  const read = async () => {
    const response = await fetcher(url, { signal });
    const payload = (await response.json()) as T;
    return { response, payload };
  };

  const first = await read();
  if (
    allowRetry &&
    !signal.aborted &&
    first.response.status === 503 &&
    first.payload?.ok === false &&
    first.payload?.sort_degraded_reason === "resolver_timeout" &&
    first.payload?.error === INCOMPLETE_SEARCH_TIMEOUT
  ) {
    return read();
  }
  return first;
}
