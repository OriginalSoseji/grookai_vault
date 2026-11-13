import Link from "next/link";
import {requireServerUser} from "@/lib/auth/requireServerUser";
import {resolveServerUserEntitlement} from "@/lib/entitlements/resolveServerUserEntitlement";
import VendorPricingSettings from "@/components/vault/VendorPricingSettings";
import type {PricingWorkspace} from "@/lib/vendorPricing/types";

export const dynamic = "force-dynamic";
export default async function PricingSettingsPage() {
  const {supabase, user} = await requireServerUser("/account/pricing");
  const entitlement = await resolveServerUserEntitlement(user);
  if (!entitlement.capabilities.canUseVendorTools) return <p className="py-8">Vendor tools are required to use pricing rules.</p>;
  const {data, error} = await supabase.rpc("vendor_pricing_v1", {p_action: "workspace", p_data: {}});
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <Link href="/account?tab=vendor-tools" className="text-sm underline">Vendor tools</Link>
    <div className="space-y-2"><h1 className="text-2xl font-semibold">Pricing rules</h1>
      <p className="text-sm text-[var(--gv-text-secondary)]">Set your default once. Automatic prices follow fresh market updates, including in Square. My price stays fixed until you choose a rule again.</p></div>
    {error ? <p role="alert">Pricing settings are temporarily unavailable. Existing prices are retained.</p>
      : <VendorPricingSettings initial={data as PricingWorkspace} />}
  </main>;
}
