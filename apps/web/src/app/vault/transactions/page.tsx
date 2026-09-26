import Link from "next/link";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { EMPTY_HISTORY_FILTERS, historyFilters, historyHref, readDispositionHistory } from "@/lib/vault/vaultDispositionHistory";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Transaction history | Grookai Vault", robots: { index: false, follow: false } };
const inputStyle = "min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
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
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-2"><h1 className="text-3xl font-bold text-slate-950">Transaction history</h1><p className="text-sm text-slate-600">Your private records of sales and trades completed outside Grookai. Amounts are entered by you; these receipts do not confirm an online payment.</p></div>
      <nav aria-label="History navigation" className="flex flex-wrap gap-3 text-sm font-semibold"><Link href="/account/store">Store workspace</Link><Link href="/vault">Back to Vault</Link></nav>
    </header>
    <form key={historyHref(filters)} action="/vault/transactions" method="get" className="grid grid-cols-1 items-end gap-3 rounded-xl sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] border border-slate-200 bg-white p-4">
      <label className="grid gap-1 text-sm font-medium">Search by<select name="field" aria-label="Search by" defaultValue={filters.field} className={inputStyle}><option value="gvvi">Copy ID (GVVI)</option><option value="counterparty">Buyer or trade partner</option></select></label>
      <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium">Search receipts<input className={inputStyle} name="q" defaultValue={filters.query} maxLength={120} placeholder="Copy ID or partner name" /></label>
      <label className="grid gap-1 text-sm font-medium">Transaction type<select name="type" aria-label="Transaction type" defaultValue={filters.type} className={inputStyle}><option value="all">Sales and trades</option><option value="sale">Sales</option><option value="trade">Trades</option></select></label>
      <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white" type="submit">Search</button><Link className="px-2 py-2 text-sm" href="/vault/transactions">Clear filters</Link>
    </form>
    {failure ? <div role="alert" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4"><p>{failure}</p><Link className="underline" href="/vault/transactions">Start from newest receipts</Link></div> : result?.items.length ? <>
      <p className="text-sm text-slate-500">Newest first · {result.items.length} receipts on this page</p>
      <ol className="grid gap-3" aria-label="Transaction receipts">{result.items.map(item => <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.type === "sale" ? "Sale" : "Trade"}</span><h2 className="break-all font-semibold"><Link className="text-emerald-800 underline" href={`/vault/gvvi/${encodeURIComponent(item.gvviId)}`} prefetch={false}>{item.gvviId}</Link></h2><time className="text-xs text-slate-500" dateTime={item.recordedAt}>{new Date(item.recordedAt).toLocaleString("en-US", {timeZone:"UTC"})} UTC</time></div>
          <div className="text-right text-sm font-semibold">{item.salePrice !== null ? money(item.salePrice, item.saleCurrency) : item.cashAmount !== null ? `Cash ${item.cashDirection}: ${money(item.cashAmount, item.cashCurrency)}` : "No cash recorded"}</div></div>
        {item.counterparty && <p className="mt-2 break-words text-sm">Partner: {item.counterparty}</p>}
        {item.tradeReceived && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">Received: {item.tradeReceived}</p>}
      </li>)}</ol>
      <nav aria-label="Receipt pages" className="flex flex-wrap justify-between gap-3 text-sm font-semibold">{filters.after ? <Link href={historyHref({...filters, after:""})}>Newest matching receipts</Link> : <span />}{result.next && <Link href={historyHref({...filters, after:result.next})}>Older receipts</Link>}</nav>
    </> : <div className="rounded-xl border border-slate-200 p-6"><h2 className="font-semibold">No matching receipts</h2><p className="mt-2 text-sm text-slate-600">Record a completed sale or trade from an exact copy in your Vault, or change your search.</p></div>}
  </main>;
}
