"use client";

import Link from "next/link";

export default function ProductError({ reset }: { reset: () => void }) {
  return (
    <main className="gv-page-container gv-page-rhythm py-8 sm:py-14">
      <section role="alert" className="gv-storefront-empty mx-auto max-w-2xl text-center">
        <p className="gv-eyebrow">Collectible unavailable</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">We couldn’t load this listing.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">The seller may be updating the item. Try again or return to the storefront.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="gv-primary-button">Try again</button><Link href="../.." className="gv-secondary-button">Back to store</Link></div>
      </section>
    </main>
  );
}
