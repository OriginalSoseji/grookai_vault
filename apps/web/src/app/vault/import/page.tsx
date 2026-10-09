import { CollectorOwnerBoundary } from "@/components/vault/CollectorOwnerBoundary";
import { CollectionImportClientV2 } from "@/app/vault/import/CollectionImportClientV2";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VaultImportPage() {
  const { user } = await requireServerUser("/vault/import");

  return <CollectorOwnerBoundary ownerId={user.id} surface="Imports" reopenHref="/vault/import"><CollectionImportClientV2 key={user.id} ownerId={user.id} /></CollectorOwnerBoundary>;
}
