import InventoryCostManager from "@/components/sales/InventoryCostManager";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Inventory aging & COG | Grookai Vault", robots: { index: false, follow: false } };

export default async function InventoryCostPage() {
  await requireServerUser("/account/store/inventory-cost");
  return <div style={{ minHeight: "100vh", background: "#101c17" }}><InventoryCostManager /></div>;
}
