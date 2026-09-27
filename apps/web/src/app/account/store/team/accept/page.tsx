import { requireServerUser } from "@/lib/auth/requireServerUser";
import StoreTeamAccept from "@/components/stores/StoreTeamAccept";
export const dynamic = "force-dynamic";
export const metadata = { title: "Accept store invitation | Grookai Vault", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const query = await searchParams; const token = typeof query.token === "string" && /^[0-9a-f]{64}$/.test(query.token) ? query.token : "";
  await requireServerUser(`/account/store/team/accept${token ? `?token=${token}` : ""}`);
  return <StoreTeamAccept token={token} />;
}
