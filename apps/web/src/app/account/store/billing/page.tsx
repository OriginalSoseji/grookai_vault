import { requireServerUser } from "@/lib/auth/requireServerUser";
import VendorBillingManager from "@/components/stores/VendorBillingManager";
export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"Store subscription | Grookai Vault",robots:{index:false,follow:false}};
export default async function VendorBillingPage(){await requireServerUser("/account/store/billing");return <VendorBillingManager/>;}
