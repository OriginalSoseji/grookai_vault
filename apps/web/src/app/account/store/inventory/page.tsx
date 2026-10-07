import { requireServerUser } from "@/lib/auth/requireServerUser";
import VendorInventory from "@/components/workspace/VendorInventory";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Inventory | Grookai Vault", robots: { index: false, follow: false } };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["q", "game", "price", "kind"]) {
    if (typeof search[key] === "string") query.set(key, search[key].slice(0, 120));
  }
  const { user } = await requireServerUser(`/account/store/inventory${query.size ? `?${query}` : ""}`);
  return <VendorInventory key={user.id} ownerId={user.id} />;
}
