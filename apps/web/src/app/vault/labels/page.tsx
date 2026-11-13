import Link from "next/link";
import {notFound} from "next/navigation";
import VendorIdentityLabels from "@/components/gvvi/VendorIdentityLabels";
import {requireServerUser} from "@/lib/auth/requireServerUser";
import {resolveServerUserEntitlement} from "@/lib/entitlements/resolveServerUserEntitlement";
import {getPublicVaultInstanceByGvvi} from "@/lib/vault/getPublicVaultInstanceByGvvi";
import {renderVendorLabelQr} from "@/lib/gvvi/vendorQr";
import VendorLabelPicker from "@/components/gvvi/VendorLabelPicker";
export const dynamic = "force-dynamic";
export default async function BatchLabelsPage({searchParams}: {searchParams: Promise<{copies?: string; page?: string}>}) {
  const {supabase, user} = await requireServerUser("/vault/labels");
  const entitlement = await resolveServerUserEntitlement(user);
  if (!entitlement.capabilities.canUseVendorTools) notFound();
  const params = await searchParams;
  const raw = params.copies ?? "";
  if (!raw) {
    const page = Number(params.page ?? 0);
    if (!Number.isInteger(page) || page < 0 || page > 10000) notFound();
    const {data, error} = await supabase.from("vault_item_instances").select("gv_vi_id").eq("user_id", user.id).eq("intent", "sell").is("archived_at", null).not("asking_price_amount", "is", null).order("id").range(page * 50, page * 50 + 49);
    const details = error ? [] : await Promise.all((data ?? []).map(copy => getPublicVaultInstanceByGvvi(copy.gv_vi_id)));
    const eligible = details.filter(copy => copy?.isVendorOffer && copy.ownerUserId === user.id);
    return <main className="mx-auto max-w-3xl space-y-6 px-4 py-6"><Link href="/vault" className="gv-secondary-button">Back to Vault</Link><h1 className="text-2xl font-semibold">Print card labels</h1>
      {error ? <p role="alert">Your copies could not be loaded. Try again.</p> : <VendorLabelPicker key={page} copies={eligible.map(copy => ({id: copy!.gvviId, name: copy!.cardName, setName: copy!.canonicalSetName ?? "", number: copy!.number ?? ""}))} />}
      <nav className="flex gap-3" aria-label="Copy pages">{page > 0 && <Link className="gv-secondary-button" href={`/vault/labels?page=${page - 1}`}>Previous copies</Link>}{data?.length === 50 && <Link className="gv-secondary-button" href={`/vault/labels?page=${page + 1}`}>More copies</Link>}</nav>
    </main>;
  }
  const ids = [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))];
  if (ids.length > 50 || ids.some(id => !/^GVVI-[A-Z0-9]{8}-\d{6}$/.test(id))) notFound();
  const copies = await Promise.all(ids.map(id => getPublicVaultInstanceByGvvi(id)));
  if (copies.some(copy => !copy?.isVendorOffer || copy.ownerUserId !== user.id || copy.askingPriceAmount === null)) notFound();
  const labels = await Promise.all(copies.map(async copy => ({gvviId: copy!.gvviId, name: copy!.cardName, setName: copy!.canonicalSetName ?? "", number: copy!.number ?? "", ...await renderVendorLabelQr(copy!.gvviId)})));
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-6"><div className="space-y-3 print:hidden"><Link href="/vault" className="gv-secondary-button">Back to Vault</Link><h1 className="text-2xl font-semibold">Print card labels</h1></div>{labels.length ? <VendorIdentityLabels labels={labels} /> : <p>Select up to 50 For sale copies in your Vault to print their labels.</p>}</main>;
}
