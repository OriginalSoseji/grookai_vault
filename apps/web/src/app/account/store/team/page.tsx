import { requireServerUser } from "@/lib/auth/requireServerUser";
import StoreTeamOwner from "@/components/stores/StoreTeamOwner";
export const dynamic = "force-dynamic";
export const metadata = { title: "Store team | grookai vault", robots: { index: false, follow: false } };
export default async function Page() { await requireServerUser("/account/store/team"); return <StoreTeamOwner />; }
