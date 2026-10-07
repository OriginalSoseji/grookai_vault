import Link from "next/link";
import { vendorPilot } from "@/lib/vendorPilot.mjs";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import StoreManager from "@/components/stores/StoreManager";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Manage your store | Grookai Vault", robots: { index: false, follow: false } };

export default async function StoreManagementPage({searchParams}: {searchParams:Promise<{product?:string|string[]; view?:string|string[]}>}) {
  const {product, view} = await searchParams;
  const id = typeof product === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product) ? product.toLowerCase() : undefined;
  const inventory = !id && view === "inventory";
  await requireServerUser(id ? `/account/store?product=${id}` : inventory ? "/account/store?view=inventory" : "/account/store");
  return <><div className="mx-auto max-w-6xl px-4 pt-3"><Link href="/account/store/receipts/start" className="text-sm underline">Receipts & customer book</Link></div><StoreManager pilot={vendorPilot} siteOrigin={getSiteOrigin()} key={id ?? (inventory ? "inventory" : "root")} initialProductId={id} initialInventory={inventory} /></>;
}
