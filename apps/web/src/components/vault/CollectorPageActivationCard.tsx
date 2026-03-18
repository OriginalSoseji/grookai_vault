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
    <section className="rounded-[1.4rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.12),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-4 py-4 shadow-sm md:rounded-[1.8rem] md:px-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.eyebrow}</p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 md:text-xl">{copy.title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{copy.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Dismiss
          </button>
          <Link
            href={href}
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 md:px-5"
          >
            {copy.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
