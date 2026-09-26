import { requireServerUser } from "@/lib/auth/requireServerUser";
import VendorSellerManager from "@/components/stores/VendorSellerManager";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Seller payments | Grookai Vault", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function VendorSellerPaymentsPage() {
  await requireServerUser("/account/store/payments");
  return <VendorSellerManager />;
}
