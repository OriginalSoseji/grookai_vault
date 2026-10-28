import Link from "next/link";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { getOwnerVaultItems } from "@/lib/vault/getOwnerVaultItems";
import CollectorWorkspace from "@/components/vault/CollectorWorkspace";

export const dynamic = "force-dynamic";
export default async function CollectorWorkspacePage(
  { searchParams }: { searchParams: Promise<{ copy?: string; card?: string }> },
) {
  const params = await searchParams;
  const { user } = await requireServerUser("/vault/workspace");
  const { items, itemsError } = await getOwnerVaultItems(user.id);
  return (
    <div className="space-y-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Collector workspace</h1>
        <Link href="/vault" className="gv-secondary-button">Back to Vault</Link>
      </div>
      {itemsError
        ? <p role="alert">Copies could not be loaded. Reload this page.</p>
        : (
          <CollectorWorkspace
            items={items}
            ownerId={user.id}
            initialInstanceId={params.copy}
            initialCardPrintId={params.card}
          />
        )}
    </div>
  );
}
