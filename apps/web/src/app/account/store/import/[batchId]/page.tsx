import Link from "next/link";
import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { importId, readCustomImport } from "@/lib/stores/customProductImportService";
import type { StoreOwner } from "@/lib/stores/storefrontTypes";
import CustomProductImporter from "@/components/stores/CustomProductImporter";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {title:"Import custom collectibles | Grookai Vault", robots:{index:false,follow:false}};
export default async function CustomImportPage({params}: {params:Promise<{batchId:string}>}) {
  const {batchId} = await params;
  let id; try { id = importId(batchId); } catch { notFound(); }
  const {supabase} = await requireServerUser(`/account/store/import/${id}`);
  let receipt, owner: StoreOwner;
  try {
    receipt = await readCustomImport(supabase,id);
    const {data,error} = await supabase.rpc("vendor_store_owner_v1"); if(error || !data) throw new Error("Owner unavailable");
    owner = data as StoreOwner;
  } catch {
    return <main className="mx-auto max-w-3xl space-y-4 px-4 py-8"><h1 className="text-2xl font-bold">Import unavailable</h1><p role="alert">Import status could not be loaded. Refresh this page before starting another import.</p><Link href="/account/store">Back to store workspace</Link></main>;
  }
  return <CustomProductImporter key={id} batchId={id} initialReceipt={receipt} canImport={Boolean(owner.store && owner.capabilities.store_app && owner.rollout.app_enabled && owner.rollout.custom_enabled)} />;
}
