import { CollectorOwnerBoundary } from "@/components/vault/CollectorOwnerBoundary";
import { StoreOwnerScope } from "@/components/stores/StoreOwnerScope";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import StoreTeamOwner from "@/components/stores/StoreTeamOwner";
export const dynamic = "force-dynamic";
export const metadata = { title: "Store team | Grookai Vault", robots: { index: false, follow: false } };
export default async function Page() { const { user } = await requireServerUser("/account/store/team"); return <CollectorOwnerBoundary ownerId={user.id} surface="Store" reopenHref="/account/store/team"><StoreOwnerScope ownerId={user.id} family="team" reopenHref="/account/store/team"><StoreTeamOwner /></StoreOwnerScope></CollectorOwnerBoundary>; }
