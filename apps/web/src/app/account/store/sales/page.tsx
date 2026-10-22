import SalesDesk from '@/components/sales/SalesDesk';
import { requireServerUser } from '@/lib/auth/requireServerUser';
import { methods } from '@/lib/sales/salesDesk.mjs';
import { salesDashboardDestination } from '@/lib/sales/salesDashboardState.mjs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { title: 'Sales desk | grookai vault', robots: { index: false, follow: false } };
export default async function SalesDeskPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
    await requireServerUser(salesDashboardDestination(await searchParams,[...methods,'Split payment']));
    return <div style={{minHeight:'100vh',background:'#101c17'}}><SalesDesk /></div>;
}
