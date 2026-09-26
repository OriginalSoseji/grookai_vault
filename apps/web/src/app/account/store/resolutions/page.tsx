import Link from "next/link";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { readResolutionQueue } from "@/lib/orders/orderResolutionQueue";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Resolution reviews | Grookai Vault", robots: { index: false, follow: false } };
export default async function ResolutionQueuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams, before = typeof search.before === "string" ? search.before : undefined;
  const { supabase, user } = await requireServerUser("/account/store/resolutions");
  let queue: Awaited<ReturnType<typeof readResolutionQueue>> = null, failed = false;
  try { queue = await readResolutionQueue(supabase, user.id, createServerAdminClient, before); } catch { failed = true; }
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><Link href="/founder" className="text-sm underline">Founder tools</Link>
    <h1 className="text-3xl font-bold">Resolution reviews</h1>
    {!queue ? <p>{failed ? "Reviews could not be loaded. Reload this page to try again." : "Resolution reviews are unavailable for the signed-in account."}</p> : <>
      <p className="text-sm text-slate-600">Review buyer agreements and retained decisions. Acceptance records the review; final financial clearance remains separate.</p>
      {!queue.rows.length && <p>No reviews on this page.</p>}
      <ul className="space-y-3">{queue.rows.map(row => <li key={row.orderId} className="rounded-lg border border-slate-200 p-4">
        <Link className="break-all font-semibold underline" href={`/account/store/resolutions/${row.orderId}`}>Review order {row.orderId}</Link>
        <p className="mt-2 text-sm">{({ requested: "Awaiting buyer", agreed: "Awaiting review", declined: "Declined", withdrawn: "Withdrawn", accepted: "Reviewed", rejected: "Further review required" })[row.state]}</p>
      </li>)}</ul>
      {queue.next && <Link className="inline-block underline" href={`/account/store/resolutions?before=${queue.next}`}>Older requests</Link>}
    </>}
  </main>;
}
