import { CollectorOwnerBoundary } from "@/components/vault/CollectorOwnerBoundary";
import { StoreOwnerScope } from "@/components/stores/StoreOwnerScope";
import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import StoreTeamWorkspace from "@/components/stores/StoreTeamWorkspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Manager workspace | Grookai Vault", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)) notFound();
  const { user } = await requireServerUser(`/account/store/managed/${storeId}`); return <CollectorOwnerBoundary ownerId={user.id} surface="Store" reopenHref="/account/store/managed"><StoreOwnerScope ownerId={user.id} family="team" reopenHref="/account/store/managed"><StoreTeamWorkspace storeId={storeId} /></StoreOwnerScope></CollectorOwnerBoundary>;
}
