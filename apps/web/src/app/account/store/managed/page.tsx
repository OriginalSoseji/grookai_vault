import { CollectorOwnerBoundary } from "@/components/vault/CollectorOwnerBoundary";
import { StoreOwnerScope } from "@/components/stores/StoreOwnerScope";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { ManagedStores } from "@/components/stores/StoreTeamWorkspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Stores you manage | Grookai Vault", robots: { index: false, follow: false } };
export default async function Page() { const { user } = await requireServerUser("/account/store/managed"); return <CollectorOwnerBoundary ownerId={user.id} surface="Store" reopenHref="/account/store/managed"><StoreOwnerScope ownerId={user.id} family="team" reopenHref="/account/store/managed"><ManagedStores /></StoreOwnerScope></CollectorOwnerBoundary>; }
