import { requireServerUser } from "@/lib/auth/requireServerUser";
import StoreManager from "@/components/stores/StoreManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Manage your store | Grookai Vault", robots: { index: false, follow: false } };

export default async function StoreManagementPage() {
  await requireServerUser("/account/store");
  return <StoreManager />;
}
