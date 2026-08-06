import Link from "next/link";
import {
  MOBILE_PRIMARY_DOCK,
  type MobilePrimaryDockKey,
} from "@/lib/mobileParity/shellManifest";
import styles from "./MobileParityDock.module.css";

function DockIcon({ name }: { name: MobilePrimaryDockKey }) {
  const iconClass = styles.icon;

  switch (name) {
    case "pulse":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 6.75h14M5 12h14M5 17.25h8" />
          <circle cx="18" cy="17.25" r="2" />
        </svg>
      );
    case "wall":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4.5" width="16" height="15" rx="3" />
          <path d="M7.5 15.5c1.5-2 2.6-3 3.5-3 .85 0 1.5.55 2.25 1.2.7.62 1.15.92 1.75.92.8 0 1.55-.54 2.5-1.72" />
          <circle cx="9.25" cy="9.25" r="1.25" />
        </svg>
      );
    case "scan":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M7 3.75H5.75a2 2 0 0 0-2 2V7M17 3.75h1.25a2 2 0 0 1 2 2V7M7 20.25H5.75a2 2 0 0 1-2-2V17M17 20.25h1.25a2 2 0 0 0 2-2V17M7.75 9.5h8.5M7.75 14.5h8.5" />
        </svg>
      );
    case "vault":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.75 8.25h16.5l-1.1 9.08a2 2 0 0 1-1.98 1.67H6.83a2 2 0 0 1-1.98-1.67L3.75 8.25Z" />
          <path d="M8.25 8.25V6.5A3.75 3.75 0 0 1 12 2.75 3.75 3.75 0 0 1 15.75 6.5v1.75" />
        </svg>
      );
    case "search":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10.75" cy="10.75" r="6.5" />
          <path d="m15.5 15.5 4.25 4.25" />
        </svg>
      );
  }
}

export function MobileParityDock({
  activeKey,
  pulseUnreadCount = 0,
  wallHref,
}: {
  activeKey: Exclude<MobilePrimaryDockKey, "scan"> | null;
  pulseUnreadCount?: number;
  wallHref?: string | null;
}) {
  return (
    <div className={styles.frame}>
      <nav
        aria-label="Primary"
        className={styles.dock}
        data-mobile-parity-dock
      >
        {MOBILE_PRIMARY_DOCK.map((item) => {
          const selected = item.kind === "root" && item.key === activeKey;
          const isScan = item.key === "scan";
          const href = item.key === "wall" && wallHref !== undefined
            ? wallHref
            : item.href;
          const content = (
            <>
              {isScan ? (
                <span className={styles.scanIconWrap}>
                  <DockIcon name={item.key} />
                </span>
              ) : (
                <span className={styles.iconWrap}>
                  <DockIcon name={item.key} />
                  {item.key === "pulse" && pulseUnreadCount > 0 ? (
                    <span className={styles.badge}>
                      {pulseUnreadCount > 99 ? "99+" : pulseUnreadCount}
                    </span>
                  ) : null}
                </span>
              )}
              <span>{item.label}</span>
            </>
          );

          if (!href) {
            return (
              <span
                key={item.key}
                aria-disabled="true"
                className={`${styles.item} ${styles.disabled}`}
                data-dock-label={item.label}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={item.key}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`${styles.item} ${selected ? styles.selected : ""}`}
              data-dock-label={item.label}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
