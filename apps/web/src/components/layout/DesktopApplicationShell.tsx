import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  DESKTOP_PRIMARY_NAV,
  DESKTOP_SECONDARY_NAV,
  getDesktopRouteState,
  type DesktopWallAvailability,
} from "@/lib/desktopShellManifest";

type DesktopApplicationShellProps = {
  pathname: string;
  isAuthenticated: boolean;
  profileHref: string | null;
  networkUnreadCount: number;
  wallAvailability: DesktopWallAvailability;
  dexEnabled: boolean;
  bindersEnabled: boolean;
  compareCount: number;
  searchHref: string;
  compareHref: string;
};

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-950 ring-1 ring-amber-200"
      aria-label={`${count} unread`}
    >
      {label}
    </span>
  );
}

export function DesktopApplicationShell({
  pathname,
  isAuthenticated,
  profileHref,
  networkUnreadCount,
  wallAvailability,
  dexEnabled,
  bindersEnabled,
  compareCount,
  searchHref,
  compareHref,
}: DesktopApplicationShellProps) {
  const routeState = getDesktopRouteState(pathname);
  const secondaryItems = DESKTOP_SECONDARY_NAV.filter((item) => {
    if (item.key === "dex") return dexEnabled;
    if (item.key === "binders") return isAuthenticated && bindersEnabled;
    if (item.key === "messages") return isAuthenticated;
    return true;
  });

  return (
    <div className="gv-desktop-site-header" data-desktop-application-shell>
      <div className="gv-desktop-shell-top">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-lg font-semibold text-slate-950 dark:text-white">
          <Image
            src="/grookai-logo-64.png"
            alt="Grookai Vault logo"
            width={36}
            height={36}
            className="gv-brand-mark shrink-0"
          />
          <span className="truncate">Grookai Vault</span>
        </Link>

        <div className="flex min-w-0 items-center justify-end gap-2">
          {wallAvailability === "unavailable" ? (
            <span
              data-wall-availability="unavailable"
              className="inline-flex min-h-8 items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 text-xs font-medium text-amber-900"
            >
              Wall status unavailable
            </span>
          ) : null}
          <ThemeToggle />
          {isAuthenticated ? (
            <details className="gv-desktop-account-menu relative">
              <summary className="gv-secondary-button min-h-9 cursor-pointer list-none px-3 py-2 text-sm">
                Account
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid w-48 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-950">
                {profileHref ? <Link href={profileHref} className="gv-desktop-menu-link">Public profile</Link> : null}
                <Link href="/account" className="gv-desktop-menu-link">Account settings</Link>
                <Link href="/support" className="gv-desktop-menu-link">Support</Link>
              </div>
            </details>
          ) : (
            <Link href="/login" className="gv-secondary-button min-h-9 px-3 py-2 text-sm">Login</Link>
          )}
        </div>
      </div>

      <div className="gv-desktop-shell-nav-frame">
        <nav className="gv-desktop-primary-nav" aria-label="Primary navigation" data-desktop-primary-navigation>
          {DESKTOP_PRIMARY_NAV.map((item) => {
            const href = item.key === "search" ? searchHref : item.href;
            const active = routeState.activePrimary === item.key;
            return (
              <Link
                key={item.key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`gv-desktop-primary-link ${active ? "gv-desktop-primary-link-active" : ""}`}
              >
                <span>{item.label}</span>
                {item.key === "pulse" ? <UnreadBadge count={networkUnreadCount} /> : null}
              </Link>
            );
          })}
        </nav>

        <nav className="gv-desktop-secondary-nav" aria-label="Collection and account tools" data-desktop-secondary-navigation>
          {secondaryItems.map((item) => {
            const href = item.key === "compare" ? compareHref : item.href;
            const active = routeState.activeSecondary === item.key;
            const label = item.key === "compare" && compareCount > 0
              ? `Compare (${compareCount})`
              : item.label;
            return (
              <Link
                key={item.key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`gv-desktop-secondary-link ${active ? "gv-desktop-secondary-link-active" : ""}`}
              >
                <span>{label}</span>
                {item.key === "messages" ? <UnreadBadge count={networkUnreadCount} /> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {routeState.context ? (
        <div className="gv-desktop-route-context" data-desktop-route-context>
          <Link href={routeState.context.parentHref}>Back to {routeState.context.parentLabel}</Link>
          <span aria-hidden="true">/</span>
          <span>{routeState.context.currentLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export default DesktopApplicationShell;
