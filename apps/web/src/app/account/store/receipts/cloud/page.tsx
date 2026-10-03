import Link from "next/link";
import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import CloudReceiptDesk from "@/components/receipts/CloudReceiptDesk";
import { readReceiptSale, receiptDestination, receiptSaleId } from "@/lib/receipts/receiptSale";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title:"Account receipts | Grookai Vault", robots:{index:false,follow:false} };
export default async function CloudReceiptsPage({ searchParams }: { searchParams: Promise<{ sale?: string | string[] }> }) {
  if (process.env.GROOKAI_RECEIPT_CLOUD_ENABLED !== "true") notFound();
  const { sale } = await searchParams;
  const { supabase, user } = await requireServerUser(receiptDestination(true, receiptSaleId(sale) || undefined));
  let prefill;
  try { prefill = await readReceiptSale(supabase, user.id, sale); }
  catch (error) { return <p className="p-6" role="alert">{(error as Error).message}</p>; }
  return <><nav className="mx-auto max-w-6xl px-5 pt-6 text-sm"><Link className="underline" href="/account/store/receipts">Device receipts & backups</Link><span className="px-3">·</span><Link className="underline" href="/vault/transactions">Recorded sales</Link><span className="px-3">·</span><Link className="underline" href="/account/store">Store workspace</Link></nav><CloudReceiptDesk key={prefill?.sourceDispositionId || "new"} prefill={prefill}/></>;
}
