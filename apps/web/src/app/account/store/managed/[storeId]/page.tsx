import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import StoreTeamWorkspace from "@/components/stores/StoreTeamWorkspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Manager workspace | Grookai Vault", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)) notFound();
  await requireServerUser(`/account/store/managed/${storeId}`); return <StoreTeamWorkspace storeId={storeId} />;
}
