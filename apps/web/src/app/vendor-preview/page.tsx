import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import { vendorPilot, validPilotCode, VENDOR_PILOT_COOKIE } from "@/lib/vendorPilot.mjs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vendor preview | Grookai Vault", robots: { index: false, follow: false } };
export default async function VendorPreview() {
  if (!vendorPilot) notFound();
  const code = (await cookies()).get(VENDOR_PILOT_COOKIE)?.value;
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  return <div className="mx-auto max-w-2xl space-y-6 py-10">
    <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Vendor preview</p>
    <h1 className="text-4xl font-bold tracking-tight">Build your store. Tell us what you think.</h1>
    <p className="text-lg text-slate-600">Try store setup, branding, custom collectibles and inventory management from your computer or phone.</p>
    <div className="rounded-2xl border bg-white p-6 space-y-4">
      <h2 className="text-xl font-semibold">Your own preview account</h2>
      <p>Use your own email and a password for this preview. Your preview inventory is separate from your live Grookai Vault.</p>
      <p>The catalog contains sample cards. You can add custom collectibles, upload photos and preview your store. Payments, subscriptions and checkout are disabled. No card or Stripe account is needed.</p>
      <p>Try the scan review workspace under Vault inventory. Upload a batch and get card suggestions from the sample catalog using artwork and printed text, including rotated scans. Review each match and choose its finish; use manual search when a card cannot be verified. Set condition, price and sections, then add the reviewed copies to your preview inventory. Unsubmitted drafts stay in this browser. Keep the original draft if an upload is interrupted so you can resume it.</p>
      {!validPilotCode(code) ? <p role="alert">Open the complete review link you received to start your trial.</p> : !user ?
        <Link className="gv-primary-button inline-flex" href="/login?next=%2Fvendor-preview&mode=signup">Create your preview account or sign in</Link> :
        <form action="/api/vendor-preview/activate" method="post"><button className="gv-primary-button" type="submit">Open my store workspace</button></form>}
      <p className="text-sm text-slate-500">Preview access lasts 14 days. Nothing is listed automatically. Keep a copy of any inventory or photos you want to retain.</p>
    </div>
  </div>;
}
