"use client";

import Link from "next/link";

export default function StoreError({ reset }: { reset: () => void }) {
  return (
    <div className="gv-page-container gv-page-rhythm py-8 sm:py-14">
      <section role="alert" className="gv-storefront-empty mx-auto max-w-2xl text-center">
        <p className="gv-eyebrow">Store temporarily unavailable</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">We couldn’t load this storefront.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">The store may be updating its inventory. Try again, or return to Grookai Vault and browse the catalog.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="gv-primary-button">Try again</button><Link href="/explore" className="gv-secondary-button">Browse cards</Link></div>
      </section>
    </div>
  );
}
