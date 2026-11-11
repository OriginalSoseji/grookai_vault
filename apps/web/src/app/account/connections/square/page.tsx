import {requireServerUser} from '@/lib/auth/requireServerUser';
import SquareManager from '@/components/square/SquareManager';
export const dynamic = 'force-dynamic';
export default async function SquareAccountPage({searchParams}: {searchParams: Promise<{status?: string}>}) {
  await requireServerUser('/account/connections/square');
  const {status} = await searchParams;
  return <SquareManager initialStatus={status === 'connected' || status === 'reconnect_required' ? status : undefined} />;
}
