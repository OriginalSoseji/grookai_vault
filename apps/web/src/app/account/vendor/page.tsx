import Link from "next/link";
import VendorWorkspaceNavigation from "@/components/vendor/VendorWorkspaceNavigation";
import VendorSquareSummary from "@/components/vendor/VendorSquareSummary";
import {requireServerUser} from "@/lib/auth/requireServerUser";
import {resolveServerUserEntitlement} from "@/lib/entitlements/resolveServerUserEntitlement";
import type {PricingWorkspace} from "@/lib/vendorPricing/types";

export const dynamic = "force-dynamic";

export default async function VendorHomePage() {
  const {supabase, user} = await requireServerUser("/account/vendor");
  const entitlement = await resolveServerUserEntitlement(user);
  if (!entitlement.capabilities.canUseVendorTools) return <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
    <h1 className="text-2xl font-semibold">Vendor Mode</h1>
    <p>Vendor tools are required to use this workspace.</p>
    <Link href="/account" className="gv-secondary-button">Back to account</Link>
  </main>;
  const {data, error} = await supabase.rpc("vendor_pricing_v1", {p_action: "workspace", p_data: {}});
  const pricing = !error && data?.ok !== false ? data as PricingWorkspace | null : null;
  const defaultRule = pricing?.rules.find(rule => rule.id === pricing.settings.default_rule_id);
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2"><h1 className="text-2xl font-semibold">Vendor Mode</h1>
        <p className="max-w-lg text-sm text-[var(--gv-text-secondary)]">Add a card privately. Choose For sale when you’re ready, then print its QR label.</p></div>
      <Link href="/explore" className="gv-primary-button">Add card</Link>
    </header>
    <VendorWorkspaceNavigation />
    <section className="space-y-2 border-y border-[var(--gv-border-soft)] py-5" aria-labelledby="vendor-inventory-heading">
      <h2 id="vendor-inventory-heading" className="text-lg font-semibold">Your inventory</h2>
      <p className="text-sm text-[var(--gv-text-secondary)]">Manage each physical copy in your Vault. Set its condition, choose Automatic or My price, and explicitly save it For sale.</p>
      <Link href="/vault" className="gv-secondary-button">Open inventory</Link>
    </section>
    <section className="space-y-2" aria-labelledby="vendor-pricing-heading">
      <h2 id="vendor-pricing-heading" className="text-lg font-semibold">Pricing</h2>
      {!pricing ? <p role="status" className="text-sm">Pricing status is unavailable. Your saved prices are retained.</p> : <>
        <p className="text-sm">{defaultRule ? `Default: ${defaultRule.name}` : "Choose your default pricing rule"}</p>
        <p className="text-sm text-[var(--gv-text-secondary)]">{!pricing.enabled ? "Automatic repricing is paused. Last confirmed prices are retained." : defaultRule && pricing.settings.auto_for_new ? "New unpriced cards use your default. Automatic prices follow fresh market updates each day; My price stays fixed." : "Automatic pricing is available when you choose a rule for a card. New cards keep their current pricing choice."}</p>
      </>}
      <Link href="/account/pricing" className="gv-secondary-button">Manage pricing</Link>
    </section>
    <VendorSquareSummary />
    <section className="space-y-2" aria-labelledby="vendor-labels-heading">
      <h2 id="vendor-labels-heading" className="text-lg font-semibold">Labels</h2>
      <p className="text-sm text-[var(--gv-text-secondary)]">Select the physical copies you want to label. Labels show the card name, full set name, number, and permanent QR. No price is printed, so daily price changes don’t require a new label.</p>
      <Link href="/vault/labels" className="gv-secondary-button">Choose card labels</Link>
    </section>
  </main>;
}
