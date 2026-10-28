import Link from "next/link";

/** Only used on authenticated owner copy surfaces; the destination rechecks ownership. */
export default function EbaySellerLink({ instanceId }: { instanceId: string }) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(instanceId)) return null;
  return (
    <Link
      href={`/vault/ebay?instanceId=${encodeURIComponent(instanceId)}`}
      prefetch={false}
      className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[var(--gv-border-soft)] px-3 py-2 text-sm font-medium text-[var(--gv-primary)] transition hover:bg-[var(--gv-surface-container)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gv-primary)]"
    >
      List on eBay
    </Link>
  );
}
