import Link from "next/link";
import { ArrowRight, Layers, MessageCircle, PanelsTopLeft, Users } from "lucide-react";
import type { ReactNode } from "react";
import NetworkSectionNav from "@/components/network/NetworkSectionNav";

export default function NetworkPageLayout({
  active,
  actions,
  children,
}: {
  active: "cards" | "collectors";
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="gv-network-page mx-auto max-w-[1170px] space-y-8 py-7 sm:py-9">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-medium leading-tight tracking-normal text-[color:var(--gv-text-primary)]">Pulse</h1>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-3">{actions}</div>
      </header>

      <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,2.15fr)_minmax(240px,1fr)] lg:gap-12">
        <div className="min-w-0 space-y-6">
          <NetworkSectionNav active={active} />
          {children}
        </div>

        <aside aria-label="Collector destinations" className="min-w-0 space-y-8 lg:pt-3">
          <section aria-labelledby="pulse-discover-heading" className="space-y-3">
            <h2 id="pulse-discover-heading" className="text-sm font-semibold text-[color:var(--gv-text-primary)]">Discover</h2>
            <Link
              href="/network/discover"
              prefetch={false}
              className="flex min-h-11 items-center gap-3 border-b border-[color:var(--gv-border-soft)] py-3 text-sm text-[color:var(--gv-text-secondary)] transition hover:text-[color:var(--gv-text-primary)]"
            >
              <Users size={18} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 flex-1">Discover collectors</span>
              <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
            </Link>
          </section>

          <details className="gv-collector-disclosure">
            <summary>Your collector space</summary>
            <nav aria-label="Your collector space">
            {[
              { href: "/wall", label: "My Wall", Icon: PanelsTopLeft },
              { href: "/vault", label: "My Vault", Icon: Layers },
              { href: "/network/inbox", label: "Messages", Icon: MessageCircle },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="flex min-h-11 items-center gap-3 py-3 text-sm text-[color:var(--gv-text-secondary)] transition hover:text-[color:var(--gv-text-primary)]"
              >
                <Icon size={18} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 flex-1">{label}</span>
                <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
              </Link>
            ))}
            </nav>
          </details>
        </aside>
      </div>
    </div>
  );
}
