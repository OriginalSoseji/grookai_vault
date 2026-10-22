import InventoryAcquisitionDesk from "@/components/sales/InventoryAcquisitionDesk";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Buy / intake | grookai vault", robots: { index: false, follow: false } };

export default async function BuyInventoryPage() {
  const { user } = await requireServerUser("/account/store/sales/buy");
  return <div style={{ minHeight: "100vh", background: "#101c17" }}><InventoryAcquisitionDesk owner={user.id} /></div>;
}
