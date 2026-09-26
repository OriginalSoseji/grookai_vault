import Link from "next/link";
import OrderResolutions from "@/components/orders/OrderResolutions";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { readResolutions } from "@/lib/orders/orderResolutions";
import { canOfferResolution } from "@/lib/orders/orderResolutionsRuntime";
import { acquisitionUuid } from "@/lib/orders/orderAcquisitionTypes";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Order resolution review | Grookai Vault", robots: { index: false, follow: false } };
export default async function ResolutionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const href = acquisitionUuid.test(id) ? `/account/store/resolutions/${id}` : "/account/store/resolutions";
  const { supabase } = await requireServerUser(href);
  const value = await readResolutions(supabase, id).catch(() => null);
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><Link href="/account/store/resolutions" className="text-sm underline">Resolution reviews</Link>
    <h1 className="text-3xl font-bold">Order resolution review</h1>
    {value?.role === "operator" ? <OrderResolutions value={value} enabled={canOfferResolution()} />
      : <p>This review is unavailable for the signed-in account.</p>}
  </main>;
}
