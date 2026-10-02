import Link from "next/link";
import ReceiptDesk from "@/components/receipts/ReceiptDesk";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { DISPOSITION_COLUMNS, mapDispositionReceipt, type DispositionRow } from "@/lib/vault/vaultDisposition";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Receipt desk | Grookai Vault", robots: { index:false,follow:false } };
export default async function ReceiptsPage({searchParams}:{searchParams:Promise<{sale?:string|string[]}>}) {
  const {sale}=await searchParams;
  const valid=typeof sale==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sale);
  const {supabase,user}=await requireServerUser('/account/store/receipts'+(valid?'?sale='+encodeURIComponent(sale):''));
  let prefill=null;
  if(sale){
    if(!valid)return <p className="p-6">This recorded-sale link is invalid.</p>;
    const {data,error}=await supabase.from('vault_item_instance_dispositions').select(DISPOSITION_COLUMNS).eq('id',sale).eq('user_id',user.id).maybeSingle();
    if(error||!data)return <p className="p-6">This recorded sale is unavailable for your account.</p>;
    const r=mapDispositionReceipt(data as DispositionRow);
    if(r.type!=='sale'||r.salePrice===null||r.saleCurrency!=='USD')return <p className="p-6">This receipt desk supports completed USD sales.</p>;
    prefill={description:r.gvviId,price:r.salePrice.toFixed(2),customerName:r.counterparty||'',sourceDispositionId:r.id};
  }
  return <><nav className="mx-auto max-w-6xl px-5 pt-6 text-sm"><Link className="underline" href="/account/store">Store workspace</Link><span className="px-3">·</span><Link className="underline" href="/vault/transactions">Recorded sales</Link></nav><ReceiptDesk accountKey={user.id} prefill={prefill}/></>;
}
