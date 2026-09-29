import { ImportClient } from "@/app/vault/import/ImportClient";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VaultImportPage() {
  const { user } = await requireServerUser("/vault/import");

  return <ImportClient key={user.id} ownerId={user.id} />;
}
