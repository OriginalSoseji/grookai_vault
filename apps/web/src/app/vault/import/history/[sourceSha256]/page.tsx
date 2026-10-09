import {notFound} from "next/navigation";
import {SavedImports} from "@/components/import/SavedImports";
import {CollectorOwnerBoundary} from "@/components/vault/CollectorOwnerBoundary";
import {requireServerUser} from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SavedImportPage({params}: {params: Promise<{sourceSha256: string}>}) {
  const {sourceSha256} = await params;
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) notFound();
  const {user} = await requireServerUser(`/vault/import/history/${sourceSha256}`);
  return <CollectorOwnerBoundary ownerId={user.id} surface="Saved imports" reopenHref="/vault/import/history">
    <SavedImports key={`${user.id}:${sourceSha256}`} ownerId={user.id} sourceSha256={sourceSha256} />
  </CollectorOwnerBoundary>;
}
