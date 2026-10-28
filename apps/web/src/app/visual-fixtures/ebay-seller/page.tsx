import { notFound } from 'next/navigation';
import { isLocalVisualParityFixtureMode } from '@/lib/visualParity/fixtureMode';
import SellerWorkspace from '@/components/ebay/SellerWorkspace';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true }, title: 'Local seller fixture' };

export default async function SellerFixture({ searchParams }: { searchParams: Promise<{ draftId?: string }> }) {
  if (!(await isLocalVisualParityFixtureMode())) notFound();
  const draftId = (await searchParams).draftId ?? null;
  if (draftId && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(draftId)) notFound();
  return <main id="main-content"><PageContainer><SellerWorkspace key={draftId ?? 'new'} actorId="ed000000-0000-4000-8000-000000000001"
    instanceId="ed000000-0000-4000-8000-000000000002" draftId={draftId} linkStatus={null} /></PageContainer></main>;
}
