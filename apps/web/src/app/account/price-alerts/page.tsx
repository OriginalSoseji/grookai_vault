import {requireServerUser} from "@/lib/auth/requireServerUser";
import {CollectorOwnerBoundary} from "@/components/vault/CollectorOwnerBoundary";
import {PriceAlerts} from "@/components/account/PriceAlerts";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {title:"Price alerts | Grookai Vault",robots:{index:false,follow:false}};
export default async function PriceAlertsPage() {
  const {user} = await requireServerUser("/account/price-alerts");
  return <CollectorOwnerBoundary ownerId={user.id} surface="Price alerts" reopenHref="/account/price-alerts"><PriceAlerts key={user.id} ownerId={user.id} /></CollectorOwnerBoundary>;
}
