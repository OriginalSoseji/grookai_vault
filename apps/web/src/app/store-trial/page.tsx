import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import { storeTrialEnabled, validStoreTrialCode, STORE_TRIAL_COOKIE } from "@/lib/stores/storeTrial";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Your store trial | Grookai Vault", robots: { index: false, follow: false } };
export default async function StoreTrialPage() {
  if (!storeTrialEnabled()) notFound();
  const code = (await cookies()).get(STORE_TRIAL_COOKIE)?.value;
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  return <main className="mx-auto max-w-2xl space-y-6 py-12">
    <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Vendor invitation</p>
    <h1 className="text-4xl font-bold tracking-tight">Make room for your next sale.</h1>
    <p className="text-lg text-slate-600">Set up your store, scan cards, and organize your inventory from your computer or phone.</p>
    <section className="space-y-4 rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">Try your store for up to 14 days</h2>
      <p>Use your own Grookai account, or create one with your email. Cards and photos you add become part of your real Vault inventory.</p>
      <p>Preview your store, set prices and sections, and review matches before adding cards. Nothing is listed automatically. Public web publishing, subscriptions, checkout and payments are disabled during this trial. No payment card is required.</p>
      {!validStoreTrialCode(code) ? <p role="alert">Open the complete invitation link you received to begin.</p> : !user ?
        <Link className="gv-primary-button inline-flex" href="/login?next=%2Fstore-trial&mode=signup">Create an account or sign in</Link> :
        <form action="/api/stores/trial/activate" method="post"><button className="gv-primary-button" type="submit">Start my store trial</button></form>}
      <p className="text-sm text-slate-500">Your inventory stays in your Vault when trial access ends. Store editing pauses, and you can still inspect your retained store data.</p>
    </section>
  </main>;
}
