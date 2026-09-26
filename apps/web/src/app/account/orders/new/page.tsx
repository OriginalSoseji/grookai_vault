import Link from "next/link";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { acquisitionAvailable } from "@/lib/orders/orderAcquisitionRuntime";
import { purchaseHref, purchaseSelection, acquisitionUuid } from "@/lib/orders/orderAcquisitionTypes";
import PurchaseReview from "@/components/orders/PurchaseReview";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Review order | Grookai Vault", robots: { index: false, follow: false } };
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;let selection, requestId: string | undefined;
  try {
    if (Object.keys(raw).some(k => !["store", "item", "kind", "quantity", "request"].includes(k)) || Object.values(raw).some(v => typeof v !== "string") || !/^\d{1,3}$/.test(String(raw.quantity))) throw new Error();
    selection = purchaseSelection({ storeId: raw.store, itemId: raw.item, kind: raw.kind, quantity: Number(raw.quantity) });
    if (raw.request !== undefined && (typeof raw.request !== "string" || !acquisitionUuid.test(raw.request))) throw new Error();
    requestId = raw.request as string | undefined;
  } catch { selection = undefined; }
  await requireServerUser(selection ? purchaseHref(selection, requestId) : "/account/orders");
  if (!selection || !acquisitionAvailable()) return <main className="mx-auto max-w-3xl space-y-4 px-4 py-8"><h1 className="text-3xl font-semibold">Ordering unavailable</h1><p>This selection cannot be ordered right now.</p><Link href="/account/orders" className="underline">Your purchases</Link></main>;
  return <PurchaseReview key={purchaseHref(selection)} selection={selection} initialRequestId={requestId} />;
}
