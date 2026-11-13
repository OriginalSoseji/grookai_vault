import Link from "next/link";
import {notFound} from "next/navigation";
import VendorIdentityLabels from "@/components/gvvi/VendorIdentityLabels";
import {requireServerUser} from "@/lib/auth/requireServerUser";
import {resolveServerUserEntitlement} from "@/lib/entitlements/resolveServerUserEntitlement";
import {renderVendorLabelQr} from "@/lib/gvvi/vendorQr";
import {getPublicVaultInstanceByGvvi} from "@/lib/vault/getPublicVaultInstanceByGvvi";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function VendorQrPrintPage(props: {params: Promise<{gvvi_id: string}>}) {
  const {gvvi_id: gvviId} = await props.params;
  const {user} = await requireServerUser(`/vault/gvvi/${gvviId}/qr`);
  const [entitlement, detail] = await Promise.all([resolveServerUserEntitlement(user), getPublicVaultInstanceByGvvi(gvviId)]);
  if (!entitlement.capabilities.canUseVendorTools || !detail?.isVendorOffer || detail.ownerUserId !== user.id || detail.askingPriceAmount === null) notFound();
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
    <div className="space-y-3 print:hidden"><Link href={`/vault/gvvi/${encodeURIComponent(detail.gvviId)}`} className="gv-secondary-button">Back to card</Link><h1 className="text-2xl font-semibold">Physical card label</h1><p className="text-sm text-[var(--gv-text-secondary)]">Card identity and permanent grookai QR. No price is printed.</p></div>
    <VendorIdentityLabels labels={[{gvviId: detail.gvviId, name: detail.cardName, setName: detail.canonicalSetName ?? "", number: detail.number ?? "", ...await renderVendorLabelQr(detail.gvviId)}]} />
  </main>;
}
