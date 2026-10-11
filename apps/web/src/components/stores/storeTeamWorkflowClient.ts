// Keep the same request after an ambiguous transport failure; SQL creates once.
export class TeamRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export async function teamWrite<T>(url: string, body: Record<string, unknown>, fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch, assertCurrent: () => Promise<unknown> = async () => {}): Promise<T> {
  let response: Response;
  let data: { error?: string } & T;
  try {
    response = await fetcher(url, { method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    data = await response.json();
  } catch (error) {
    if (error instanceof TypeError || error instanceof SyntaxError) {
      throw new Error("The save could not be confirmed. Retry to check the same request.");
    }
    throw error;
  }
  await assertCurrent();
  if (!response.ok) throw new TeamRequestError(data.error ?? "Save failed", response.status);
  return data as T;
}
export const definitiveRejection = (error: unknown) => error instanceof TeamRequestError && [400,401,403].includes(error.status);
