import SalesDesk from '@/components/sales/SalesDesk';
import { requireServerUser } from '@/lib/auth/requireServerUser';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { title: 'Sales desk | Grookai Vault', robots: { index: false, follow: false } };
export default async function SalesDeskPage() {
    await requireServerUser('/account/store/sales');
    return <div style={{minHeight:'100vh',background:'#101c17'}}><SalesDesk /></div>;
}
