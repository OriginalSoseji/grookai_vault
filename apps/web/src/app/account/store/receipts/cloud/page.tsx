import Link from "next/link";
import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import CloudReceiptDesk from "@/components/receipts/CloudReceiptDesk";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title:"Account receipts | Grookai Vault", robots:{index:false,follow:false} };
export default async function CloudReceiptsPage() {
  if (process.env.GROOKAI_RECEIPT_CLOUD_ENABLED !== "true") notFound();
  await requireServerUser("/account/store/receipts/cloud");
  return <><nav className="mx-auto max-w-6xl px-5 pt-6 text-sm"><Link className="underline" href="/account/store/receipts">Device receipts & backups</Link><span className="px-3">·</span><Link className="underline" href="/account/store">Store workspace</Link></nav><CloudReceiptDesk/></>;
}
