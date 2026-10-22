import { requireServerUser } from "@/lib/auth/requireServerUser";
import { ManagedStores } from "@/components/stores/StoreTeamWorkspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Stores you manage | grookai vault", robots: { index: false, follow: false } };
export default async function Page() { await requireServerUser("/account/store/managed"); return <ManagedStores />; }
