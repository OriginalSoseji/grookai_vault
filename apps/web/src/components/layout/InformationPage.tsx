import Link from "next/link";
import type { ReactNode } from "react";

type InformationPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function InformationPage({ eyebrow, title, description, children }: InformationPageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl py-8 text-slate-700 dark:text-slate-200">
      <header className="border-b border-slate-200 pb-6 dark:border-white/[0.08]">
        <p className="gv-eyebrow">{eyebrow}</p>
        <h1 className="gv-display-title mt-2">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </header>

      <article className="divide-y divide-slate-200 text-sm leading-7 dark:divide-white/[0.08] [&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-sky-300 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-950 dark:[&_h2]:text-white [&_section]:space-y-3 [&_section]:py-6">
        {children}
      </article>

      <nav aria-label="Information links" className="flex flex-wrap gap-2 border-t border-slate-200 pt-6 dark:border-white/[0.08]">
        <Link href="/support" className="gv-secondary-button">Support</Link>
        <Link href="/privacy" className="gv-secondary-button">Privacy</Link>
        <Link href="/legal" className="gv-secondary-button">Terms</Link>
      </nav>
    </main>
  );
}
