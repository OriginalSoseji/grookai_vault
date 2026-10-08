import Link from 'next/link';
import {requireServerUser} from '@/lib/auth/requireServerUser';
import {PortfolioHistory} from '@/components/vault/PortfolioHistory';
export const dynamic='force-dynamic';
export const revalidate=0;
export default async function CollectionHistoryPage(){
 const {user}=await requireServerUser('/vault/history');
 return <main className="mx-auto max-w-5xl px-4 py-6"><Link href="/vault" className="text-sm underline">Back to Vault</Link><PortfolioHistory ownerId={user.id}/></main>;
}
