import Link from 'next/link';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import s from '@/components/ebay/SellerWorkspace.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false }, title: 'eBay connection · grookai vault' };

export default async function EbaySellerReturn({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const linked = status === 'linked';
  const label = linked ? 'Return to grookai to check your saved seller connection.'
    : status === 'denied' ? 'You cancelled the eBay connection. Return to grookai when you’re ready.'
    : 'The connection result is unconfirmed. Return to grookai and refresh its saved status before starting again.';
  // Public status only. A query string cannot establish a linked account;
  // authenticated server readback remains the connection authority.
  return <section className={s.workspace} aria-label="eBay connection result"><div className={s.copy}>
    {linked && <span className={s.copyIcon}><CheckCircle2 size={24} /></span>}
    <div><h1>eBay connection</h1><p className={s.muted}>{label}</p></div></div>
    <div className={s.actions}><a className={`${s.button} ${s.primary}`} href="grookai://ebay-seller">Open grookai<ArrowUpRight size={16} /></a>
      <Link className={s.button} href="/vault/ebay">Continue on the website</Link></div></section>;
}
