import {SavedImports} from "@/components/import/SavedImports";
import {CollectorOwnerBoundary} from "@/components/vault/CollectorOwnerBoundary";
import {requireServerUser} from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SavedImportsPage() {
  const {user} = await requireServerUser("/vault/import/history");
  return <CollectorOwnerBoundary ownerId={user.id} surface="Saved imports" reopenHref="/vault/import/history">
    <SavedImports key={user.id} ownerId={user.id} />
  </CollectorOwnerBoundary>;
}
