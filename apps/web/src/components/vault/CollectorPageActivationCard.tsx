"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CollectorPageActivationCardProps = {
  variant: "live" | "setup";
  href: string;
};

const DISMISS_STORAGE_KEY = "gv:collector-page-activation:v1";

const COPY_BY_VARIANT = {
  live: {
    eyebrow: "Collector Page",
    title: "Your collector page is live",
    body: "You already have a public page for your collection. Open it to see what other collectors can view.",
    cta: "View my page",
  },
  setup: {
    eyebrow: "Collector Page",
    title: "Your collection is ready to show",
    body: "You have enough in your vault to make a collector page feel real. Turn on your public page whenever you want to share it.",
    cta: "Turn on public page",
  },
} as const;

export function CollectorPageActivationCard({ variant, href }: CollectorPageActivationCardProps) {
  const [dismissedVariant, setDismissedVariant] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedVariant(window.localStorage.getItem(DISMISS_STORAGE_KEY));
    } catch {
      setDismissedVariant(null);
    }
  }, []);

  if (dismissedVariant === variant) {
    return null;
  }

  const copy = COPY_BY_VARIANT[variant];

  return (
    <section className="rounded-[1.65rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.14),_transparent_40%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-5 py-5 shadow-[0_28px_60px_-44px_rgba(15,23,42,0.35)] md:rounded-[1.9rem] md:px-6 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{copy.eyebrow}</p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 md:text-[1.35rem]">{copy.title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{copy.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.setItem(DISMISS_STORAGE_KEY, variant);
              } catch {
                // Ignore storage failures and still dismiss for the current session.
              }
              setDismissedVariant(variant);
            }}
            className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
          >
            Dismiss
          </button>
          <Link
            href={href}
            className="inline-flex rounded-full bg-slate-950 px-4.5 py-2 text-sm font-medium text-white shadow-[0_16px_30px_-22px_rgba(15,23,42,0.6)] transition hover:bg-slate-800 md:px-5"
          >
            {copy.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
