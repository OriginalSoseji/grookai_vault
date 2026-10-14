import Link from "next/link";

type MobilePushedRouteHeaderProps = {
  backHref: string;
  backLabel: string;
  title: string;
};

export function MobilePushedRouteHeader({
  backHref,
  backLabel,
  title,
}: MobilePushedRouteHeaderProps) {
  return (
    <nav
      className="gv-mobile-pushed-route-header"
      aria-label={`${title} navigation`}
      data-mobile-pushed-route-header
    >
      <Link href={backHref} className="gv-mobile-pushed-route-back">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>{backLabel}</span>
      </Link>
      <p className="gv-mobile-pushed-route-title">{title}</p>
      <span className="gv-mobile-pushed-route-spacer" aria-hidden="true" />
    </nav>
  );
}

export default MobilePushedRouteHeader;
