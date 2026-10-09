import {InventoryExport} from "@/components/vault/InventoryExport";
import {CollectorOwnerBoundary} from "@/components/vault/CollectorOwnerBoundary";
import {requireServerUser} from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {title: "Export inventory | Grookai Vault", robots: {index: false, follow: false}};

export default async function InventoryExportPage() {
  const {user} = await requireServerUser("/vault/export");
  return <CollectorOwnerBoundary ownerId={user.id} surface="Inventory export" reopenHref="/vault/export"><InventoryExport key={user.id} ownerId={user.id} /></CollectorOwnerBoundary>;
}
