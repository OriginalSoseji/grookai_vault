import Link from "next/link";
import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import CloudReceiptDesk from "@/components/receipts/CloudReceiptDesk";
import { readReceiptSale, receiptDestination, receiptSaleId } from "@/lib/receipts/receiptSale";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title:"Account receipts | grookai vault", robots:{index:false,follow:false} };
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function receiptId(value:string|string[]|undefined){const candidate=Array.isArray(value)?value[0]:value;return candidate&&uuid.test(candidate)?candidate:null;}
export default async function CloudReceiptsPage({ searchParams }: { searchParams: Promise<{ sale?: string | string[]; receipt?:string|string[] }> }) {
  if (process.env.GROOKAI_RECEIPT_CLOUD_ENABLED !== "true") notFound();
  const { sale,receipt } = await searchParams,initialReceiptId=receiptId(receipt);
  const destination=initialReceiptId?`/account/store/receipts/cloud?receipt=${encodeURIComponent(initialReceiptId)}`:receiptDestination(true, receiptSaleId(sale) || undefined);
  const { supabase, user } = await requireServerUser(destination);
  if(receipt!==undefined&&!initialReceiptId)return <p className="p-6" role="alert">This receipt link is invalid.</p>;
  let prefill;
  try { prefill = await readReceiptSale(supabase, user.id, sale); }
  catch (error) { return <p className="p-6" role="alert">{(error as Error).message}</p>; }
  return <><nav className="mx-auto max-w-6xl px-5 pt-6 text-sm"><Link className="underline" href="/account/store/receipts">Device receipts & backups</Link><span className="px-3">·</span><Link className="underline" href="/vault/transactions">Recorded sales</Link><span className="px-3">·</span><Link className="underline" href="/account/store">Store workspace</Link></nav><CloudReceiptDesk key={prefill?.sourceDispositionId || initialReceiptId || "new"} prefill={prefill} initialReceiptId={initialReceiptId}/></>;
}
