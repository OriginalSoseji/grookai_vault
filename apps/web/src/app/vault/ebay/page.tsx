import { requireServerUser } from '@/lib/auth/requireServerUser';
import SellerWorkspace from '@/components/ebay/SellerWorkspace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EbaySellerPage({ searchParams }: {
  searchParams: Promise<{ instanceId?: string; draftId?: string; link?: string }>;
}) {
  const params = await searchParams;
  const instanceId = typeof params.instanceId === 'string' && /^[0-9a-f-]{36}$/.test(params.instanceId) ? params.instanceId : null;
  const draftId = typeof params.draftId === 'string' && /^[0-9a-f-]{36}$/.test(params.draftId) ? params.draftId : null;
  const { user } = await requireServerUser('/vault/ebay');
  return <SellerWorkspace key={`${user.id}:${instanceId}:${draftId}`} actorId={user.id} instanceId={instanceId} draftId={draftId}
    linkStatus={['linked', 'denied', 'unconfirmed'].includes(params.link ?? '') ? params.link ?? null : null} />;
}
