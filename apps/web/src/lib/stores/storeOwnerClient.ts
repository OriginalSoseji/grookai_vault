// Private store requests stay bound to the authenticated owner of their editor.
type Session = { user: { id: string }; access_token: string };
type Auth = {
  getSession(): Promise<{ data: { session: Session | null }; error: unknown }>;
  onAuthStateChange(callback: (event: string, session: Session | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
};
export class StoreOwnerChanged extends Error {
  constructor() { super("Your account changed. Reopen Store to continue."); }
}
export function createStoreOwnerClient(ownerId: string, auth: Auth, fetcher: typeof fetch, onClosed: () => void, family: "owner" | "team" = "owner") {
  let active = true, closed = false;
  const current = () => active && !closed;
  const close = () => { if (current()) { closed = true; onClosed(); } };
  const assertCurrent = () => { if (!current()) throw new StoreOwnerChanged(); };
  const subscription = auth.onAuthStateChange((_, session) => { if (session?.user.id !== ownerId) close(); }).data.subscription;
  async function session() {
    assertCurrent();
    const result = await auth.getSession();
    assertCurrent();
    if (result.error || result.data.session?.user.id !== ownerId || !result.data.session.access_token) {
      close(); throw new StoreOwnerChanged();
    }
    return result.data.session;
  }
  async function ownerFetch(path: string, init: RequestInit = {}) {
    const target = new URL(path, "https://store.invalid");
    const prefix = `/api/stores/${family}`;
    if (target.origin !== "https://store.invalid" || target.hash ||
        !(target.pathname === prefix || target.pathname.startsWith(prefix + "/"))) {
      throw new Error("Unexpected private store endpoint");
    }
    const captured = await session();
    assertCurrent();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${captured.access_token}`);
    headers.set("Accept", "application/json");
    // The token is fixed before handoff. Ambient cookies cannot retarget old work.
    const response = await fetcher(target.pathname + target.search, { ...init, headers, credentials: "omit", cache: "no-store" });
    await session();
    return response;
  }
  async function request<T>(path: string, body?: Record<string, unknown> | FormData): Promise<T> {
    const response = await ownerFetch(path, body ? {
      method: "POST", body: body instanceof FormData ? body : JSON.stringify(body),
      ...(body instanceof FormData ? {} : { headers: { "Content-Type": "application/json" } }),
    } : {});
    const text = await response.text();
    await session();
    let value: unknown; try { value = JSON.parse(text); } catch { value = null; }
    if (!response.ok) {
      if (response.status === 401) { close(); throw new StoreOwnerChanged(); }
      const error = value && typeof value === "object" && "error" in value ? String(value.error) : "Store request could not be confirmed. Reopen the store and check its current state before retrying.";
      throw new Error(error);
    }
    const target = new URL(path, "https://store.invalid");
    if (!body && target.pathname === "/api/stores/owner" &&
        (!value || typeof value !== "object" || !("actorId" in value) || value.actorId !== ownerId)) {
      close(); throw new StoreOwnerChanged();
    }
    return value as T;
  }
  return { ownerId, request, ownerFetch, assertCurrent, current, ready: session,
    dispose() { active = false; subscription.unsubscribe(); } };
}
