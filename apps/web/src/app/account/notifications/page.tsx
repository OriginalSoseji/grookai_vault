import Link from "next/link";
import { NotificationSettingsForm } from "@/components/account/NotificationSettingsForm";
import { CollectorOwnerBoundary } from "@/components/vault/CollectorOwnerBoundary";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationSettingsPage() {
  const { user } = await requireServerUser("/account/notifications");
  return (
    <div className="space-y-5 py-6">
      <Link href="/account" className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600">← Account</Link>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Notifications</h1>
      <CollectorOwnerBoundary ownerId={user.id} surface="Notifications" reopenHref="/account/notifications">
        <NotificationSettingsForm ownerId={user.id} />
      </CollectorOwnerBoundary>
    </div>
  );
}
