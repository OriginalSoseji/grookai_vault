import SalesReports from "@/components/sales/SalesReports";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Reports | Grookai Vault", robots: { index: false, follow: false } };

export default async function ReportsPage() {
  const { user } = await requireServerUser("/account/store/reports");
  return <SalesReports ownerId={user.id} />;
}
