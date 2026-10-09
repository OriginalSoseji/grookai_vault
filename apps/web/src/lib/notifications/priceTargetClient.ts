import {parsePriceTargets, type PriceTargetRequest, type PriceTargets, type PriceTargetCatalog} from "./priceTargets";
type Session = {user: {id: string}; access_token: string};
type Auth = {getSession(): Promise<{data: {session: Session | null}; error: unknown}>; onAuthStateChange(callback: (event: string, session: Session | null) => void): {data: {subscription: {unsubscribe(): void}}}};
export class PriceTargetAccountChanged extends Error {constructor() {super("Your account changed. Reopen price alerts.");}}
export class PriceTargetRejected extends Error {}
export function createPriceTargetClient(ownerId: string, auth: Auth, fetcher: typeof fetch, onClosed: () => void) {
  let active = true, closed = false;
  const current = () => active && !closed;
  const close = () => {if (current()) {closed = true; onClosed();}};
  const assertCurrent = () => {if (!current()) throw new PriceTargetAccountChanged();};
  const subscription = auth.onAuthStateChange((_, session) => {if (session?.user.id !== ownerId) close();}).data.subscription;
  const session = async () => {assertCurrent(); const r = await auth.getSession(); assertCurrent(); if (r.error || r.data.session?.user.id !== ownerId || !r.data.session.access_token) {close(); throw new PriceTargetAccountChanged();} return r.data.session;};
  async function request(path: string, body?: PriceTargetRequest) {
    const serialized = body ? JSON.stringify(body) : undefined;
    const captured = await session();
    let response: Response, value: unknown;
    try {
      response = await fetcher(path, {method: body ? "POST" : "GET", cache: "no-store", credentials: "omit", headers: {Authorization: `Bearer ${captured.access_token}`, Accept: "application/json", ...(body ? {"Content-Type":"application/json"} : {})}, ...(body ? {body: serialized} : {})});
      value = await response.json();
    } catch {assertCurrent(); throw Error(body ? "The save could not be confirmed. Keep this page open and retry the same request." : "Price alerts could not load. Please retry.");}
    await session();
    if (response.status === 401) {close(); throw new PriceTargetAccountChanged();}
    if (!response.ok) {
      const v = value as {definitive?: boolean; error?: string};
      if (v?.definitive === true) throw new PriceTargetRejected(typeof v.error === "string" ? v.error : "The change was rejected. Reload price alerts.");
      throw Error(body ? "The save could not be confirmed. Keep this page open and retry the same request." : "Price alerts could not load. Please retry.");
    }
    if (!value || typeof value !== "object" || !("ownerId" in value) || value.ownerId !== ownerId) {close(); throw new PriceTargetAccountChanged();}
    return value;
  }
  return {current, ready: session,
    async read(): Promise<PriceTargets> {return parsePriceTargets(ownerId, await request("/api/price-alerts"));},
    async catalog(query: string, offset = 0): Promise<PriceTargetCatalog> {const v = await request(`/api/price-alerts/catalog?q=${encodeURIComponent(query)}&offset=${offset}`); if (!("catalog" in v) || !v.catalog || typeof v.catalog !== "object" || !("cards" in v.catalog) || !Array.isArray(v.catalog.cards)) throw Error("Catalog search could not load."); return v.catalog as PriceTargetCatalog;},
    async save(body: PriceTargetRequest) {
      const v = await request("/api/price-alerts", body) as {id?: string; revision?: string};
      if (v.id !== body.id || v.revision !== (BigInt(body.expectedRevision)+1n).toString()) throw Error("The save could not be confirmed. Retry the same request.");
    },
    dispose() {active = false; subscription.unsubscribe();},
  };
}
