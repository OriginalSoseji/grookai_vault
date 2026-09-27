// Keep the same request after an ambiguous transport failure; SQL creates once.
export class TeamRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export async function teamWrite<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, { method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new TeamRequestError(data.error ?? "Save failed", response.status);
  return data as T;
}
export const definitiveRejection = (error: unknown) => error instanceof TeamRequestError && [400,401,403].includes(error.status);
