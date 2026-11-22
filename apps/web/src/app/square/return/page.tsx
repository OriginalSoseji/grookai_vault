import SquareReturn from '@/components/square/SquareReturn';
export const dynamic = 'force-dynamic';
export default async function SquareReturnPage({searchParams}: {searchParams: Promise<{status?: string}>}) {
  const {status} = await searchParams;
  return <SquareReturn connected={status === 'connected'} native />;
}
