type Session = { user: { id: string }; access_token: string };
type Auth = {
  getSession(): Promise<{ data: { session: Session | null }; error: unknown }>;
  onAuthStateChange(callback: (event: string, session: Session | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
};
const endpoints = new Set(["acquire", "cancel", "checkout", "fulfillment", "refunds", "resolutions"]
  .map(name => `/api/vendor-orders/${name}`));
export class OrderOwnerChanged extends Error {
  constructor() { super("Your account changed. Reopen Orders to continue."); }
}
export function createOrderOwnerClient(ownerId: string, auth: Auth, fetcher: typeof fetch, onClosed: () => void) {
  let active = true, closed = false;
  const current = () => active && !closed;
  const close = () => { if (current()) { closed = true; onClosed(); } };
  const assertCurrent = () => { if (!current()) throw new OrderOwnerChanged(); };
  const subscription = auth.onAuthStateChange((_, session) => {
    if (session?.user.id !== ownerId) close();
  }).data.subscription;
  async function ready() {
    assertCurrent();
    const result = await auth.getSession();
    assertCurrent();
    if (result.error || result.data.session?.user.id !== ownerId || !result.data.session.access_token) {
      close(); throw new OrderOwnerChanged();
    }
    return result.data.session;
  }
  async function send(path: string, body: unknown) {
    if (!endpoints.has(path)) throw new Error("Unexpected private order endpoint");
    // Capture the command before awaiting Auth; never rebuild it after handoff.
    const serialized = JSON.stringify(body), captured = await ready();
    assertCurrent();
    let response: Response;
    try {
      response = await fetcher(path, { method: "POST", credentials: "omit", cache: "no-store",
        headers: { Authorization: `Bearer ${captured.access_token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: serialized });
    } catch {
      await ready();
      throw new Error("The order action could not be confirmed. Check its saved status or retry the same action.");
    }
    await ready();
    if (response.status === 401) { close(); throw new OrderOwnerChanged(); }
    let data;
    try { data = await response.json(); } catch {
      await ready();
      throw new Error("The order action could not be confirmed. Check its saved status or retry the same action.");
    }
    await ready();
    return { response, data };
  }
  return { ownerId, send, ready, assertCurrent, current,
    dispose() { active = false; subscription.unsubscribe(); } };
}
