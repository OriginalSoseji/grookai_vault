import Link from "next/link";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { EMPTY_HISTORY_FILTERS, historyFilters, historyHref, readDispositionHistory } from "@/lib/vault/vaultDispositionHistory";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Transaction history | grookai vault", robots: { index: false, follow: false } };
const inputStyle = "min-h-11 min-w-0 w-full rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] px-3 py-2 text-sm text-[var(--gv-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gv-primary)]";
const money = (amount: number, currency: string | null) => `${currency ?? "USD"} ${amount.toFixed(2)}`;

export default async function TransactionHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  let filters = EMPTY_HISTORY_FILTERS, failure: string | null = null;
  try { filters = historyFilters(await searchParams); } catch (error) { failure = (error as Error).message; }
  const { supabase } = await requireServerUser(historyHref(filters));
  let result: Awaited<ReturnType<typeof readDispositionHistory>> | null = null;
  if (!failure) {
    try { result = await readDispositionHistory(supabase, filters); }
    catch { failure = "Transaction history could not be loaded. Try again."; }
  }
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 text-[var(--gv-text-primary)] sm:py-7">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-2xl space-y-1"><p className="gv-eyebrow">Private records</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Transaction history</h1><p className="text-sm leading-6 text-[var(--gv-text-secondary)]">Sales and trades completed outside grookai. These receipts are private records and do not confirm an online payment.</p></div>
      <nav aria-label="History navigation" className="flex flex-wrap gap-2 text-sm font-semibold"><Link className="gv-secondary-button !rounded-lg" href="/account/store">Seller workspace</Link><Link className="gv-secondary-button !rounded-lg" href="/vault">Back to Vault</Link></nav>
    </header>
    <form key={historyHref(filters)} action="/vault/transactions" method="get" className="grid grid-cols-1 items-end gap-3 rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-4 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]">
      <label className="grid gap-1 text-sm font-medium">Search by<select name="field" aria-label="Search by" defaultValue={filters.field} className={inputStyle}><option value="gvvi">Copy ID (GVVI)</option><option value="counterparty">Buyer or trade partner</option></select></label>
      <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium">Search receipts<input className={inputStyle} name="q" defaultValue={filters.query} maxLength={120} placeholder="Copy ID or partner name" /></label>
      <label className="grid gap-1 text-sm font-medium">Transaction type<select name="type" aria-label="Transaction type" defaultValue={filters.type} className={inputStyle}><option value="all">Sales and trades</option><option value="sale">Sales</option><option value="trade">Trades</option></select></label>
      <button className="gv-primary-button !min-h-11 !rounded-lg" type="submit">Search</button><Link className="gv-secondary-button !rounded-lg" href="/vault/transactions">Clear filters</Link>
    </form>
    {failure ? <div role="alert" className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"><p>{failure}</p><Link className="inline-flex min-h-11 items-center font-semibold text-[var(--gv-primary)] underline underline-offset-4" href="/vault/transactions">Start from newest receipts</Link></div> : result?.items.length ? <>
      <p className="text-sm text-[var(--gv-text-secondary)]">Newest first · {result.items.length} receipts on this page</p>
      <ol className="grid gap-3" aria-label="Transaction receipts">{result.items.map(item => <li key={item.id} className="rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--gv-text-secondary)]">{item.type === "sale" ? "Sale" : "Trade"}</span><h2 className="break-all font-semibold"><Link className="inline-flex min-h-11 items-center text-[var(--gv-primary)] underline underline-offset-4" href={`/vault/gvvi/${encodeURIComponent(item.gvviId)}`} prefetch={false}>{item.gvviId}</Link></h2><time className="text-xs text-[var(--gv-text-secondary)]" dateTime={item.recordedAt}>{new Date(item.recordedAt).toLocaleString("en-US", {timeZone:"UTC"})} UTC</time></div>
          <div className="text-sm sm:text-right"><span className="block text-xs text-[var(--gv-text-secondary)]">{item.salePrice !== null ? "Sale amount" : item.cashAmount !== null ? `Cash ${item.cashDirection}` : "Cash"}</span><strong className="block font-semibold">{item.salePrice !== null ? money(item.salePrice, item.saleCurrency) : item.cashAmount !== null ? money(item.cashAmount, item.cashCurrency) : "None"}</strong></div></div>
        {item.counterparty && <p className="mt-2 break-words text-sm">Partner: {item.counterparty}</p>}
        {item.tradeReceived && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--gv-text-secondary)]">Received in trade: {item.tradeReceived}</p>}
        {item.type === "sale" && item.saleCurrency === "USD" && item.salePrice !== null && item.salePrice > 0 && item.salePrice <= 1000000 && <Link className="gv-secondary-button !rounded-lg mt-3" href={`/account/store/receipts/start?sale=${encodeURIComponent(item.id)}`}>Create or view receipt</Link>}
      </li>)}</ol>
      <nav aria-label="Receipt pages" className="flex flex-wrap justify-between gap-3 text-sm font-semibold">{filters.after ? <Link className="inline-flex min-h-11 items-center text-[var(--gv-primary)] underline underline-offset-4" href={historyHref({...filters, after:""})}>Newest matching receipts</Link> : <span />}{result.next && <Link className="inline-flex min-h-11 items-center text-[var(--gv-primary)] underline underline-offset-4" href={historyHref({...filters, after:result.next})}>Older receipts</Link>}</nav>
    </> : <div className="rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-5"><h2 className="font-semibold">No matching receipts</h2><p className="mt-2 text-sm leading-6 text-[var(--gv-text-secondary)]">Record a completed sale or trade from an exact copy in your Vault, or clear your search to see all receipts.</p><Link className="gv-secondary-button !rounded-lg mt-3" href="/vault">Open Vault</Link></div>}
  </main>;
}
