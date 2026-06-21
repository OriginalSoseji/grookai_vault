import Link from "next/link";
import Image from "next/image";
import { joinEarlyAccessAction } from "./actions";

export const metadata = {
  title: "Early Access | Grookai Vault",
  description: "Join early access for Grookai Vault, a collector-first Pokemon card platform.",
};

type EarlyAccessPageProps = {
  searchParams?: {
    status?: string;
  };
};

const STATUS_COPY: Record<string, { title: string; detail: string; tone: string }> = {
  joined: {
    title: "You're on the list.",
    detail: "We have your email and will send early access updates from Grookai.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  exists: {
    title: "You're already on the list.",
    detail: "That email is already registered for Grookai early access.",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
  },
  invalid: {
    title: "Use a valid email.",
    detail: "Check the address and try again.",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  error: {
    title: "Signup did not complete.",
    detail: "Try again in a moment. No duplicate signup was created.",
    tone: "border-rose-200 bg-rose-50 text-rose-800",
  },
};

const intelligenceLayers = [
  {
    label: "Identity",
    title: "Every version has a place.",
    detail: "Printings, finishes, stamps, first edition, errors, and special variants are modeled as collector truth.",
  },
  {
    label: "Completion",
    title: "Your vault becomes a map.",
    detail: "Dex and set progress can reflect what you own against the verified English physical catalog.",
  },
  {
    label: "Discovery",
    title: "Search the way collectors think.",
    detail: "Ask for reverse holos, artists, years, stamps, sets, variants, and ownership instead of memorizing filters.",
  },
];

const proofStats = [
  { value: "38k+", label: "verified printings" },
  { value: "21k+", label: "verified cards" },
  { value: "0", label: "open conflicts" },
];

export default function EarlyAccessPage({ searchParams }: EarlyAccessPageProps) {
  const status = searchParams?.status ? STATUS_COPY[searchParams.status] : null;

  return (
    <div className="space-y-16 py-6 md:space-y-24 md:py-12">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/84 px-5 py-10 text-center shadow-[0_80px_180px_-130px_rgba(15,23,42,0.62)] backdrop-blur md:rounded-[3rem] md:px-10 md:py-16 dark:border-white/10 dark:bg-black/55">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <Image
            src="/grookai-logo-192.png"
            alt="Grookai Vault logo"
            width={96}
            height={96}
            priority
            className="rounded-[1.8rem] shadow-[0_28px_70px_-48px_rgba(15,23,42,0.86)]"
          />

          <p className="mt-8 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-slate-500">
            Grookai Vault Early Access
          </p>
          <h1 className="mt-5 max-w-4xl text-[3.35rem] font-black leading-[0.91] tracking-normal text-slate-950 md:text-[6.75rem] dark:text-white">
            Know every card you own.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-2xl md:leading-10 dark:text-slate-300">
            A collector platform built around verified Pokemon card identity, not generic catalog rows.
          </p>

          <form
            action={joinEarlyAccessAction}
            className="mt-9 flex w-full max-w-2xl flex-col gap-3 rounded-[2rem] border border-slate-200/70 bg-white/78 p-3 shadow-[0_36px_90px_-70px_rgba(15,23,42,0.78)] backdrop-blur sm:flex-row dark:border-white/10 dark:bg-white/8"
          >
            <label htmlFor="early-access-email" className="sr-only">
              Email address
            </label>
            <input
              id="early-access-email"
              name="email"
              type="email"
              required
              maxLength={320}
              autoComplete="email"
              placeholder="Email address"
              className="min-h-[3.35rem] min-w-0 flex-1 rounded-full border border-transparent bg-transparent px-5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:bg-white/75 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400/40 dark:focus:bg-white/10"
            />
            <button type="submit" className="gv-primary-button shrink-0 px-7">
              Request access
            </button>
          </form>

          {status ? (
            <div className={`mt-4 max-w-2xl rounded-2xl border px-4 py-3 text-left text-sm ${status.tone}`} role="status">
              <p className="font-semibold">{status.title}</p>
              <p className="mt-1 leading-5">{status.detail}</p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:gap-3">
            <span>Follow us here for all updates.</span>
            <a
              href="https://discord.gg/UwxmxX2FGH"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/72 px-4 py-2 font-semibold text-slate-800 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.72)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:border-blue-300/30 dark:hover:text-blue-200"
            >
              Join the Discord
            </a>
          </div>

          <div className="mt-10 grid w-full max-w-3xl grid-cols-3 gap-3">
            {proofStats.map((stat) => (
              <div key={stat.label} className="rounded-[1.4rem] bg-slate-50/80 px-3 py-4 dark:bg-white/6">
                <p className="text-2xl font-black tracking-normal text-slate-950 md:text-3xl dark:text-white">{stat.value}</p>
                <p className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl text-center">
        <p className="gv-eyebrow">Built for collector reality</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-[1.02] tracking-normal text-slate-950 md:text-6xl dark:text-white">
          The rare details are not edge cases here.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg dark:text-slate-300">
          Stamps, variants, errors, image confidence, and ownership progress belong in the product from the start.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {intelligenceLayers.map((item) => (
          <article key={item.title} className="rounded-[2rem] border border-slate-200/70 bg-white/76 px-6 py-7 shadow-[0_38px_100px_-78px_rgba(15,23,42,0.56)] backdrop-blur dark:border-white/10 dark:bg-white/6">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-blue-500 dark:text-blue-300">{item.label}</p>
            <h3 className="mt-5 text-2xl font-black leading-tight tracking-normal text-slate-950 dark:text-white">{item.title}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-10 text-white shadow-[0_90px_180px_-120px_rgba(0,0,0,0.95)] md:px-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="space-y-5">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-blue-200">A different kind of card database</p>
            <h2 className="text-4xl font-black leading-[0.98] tracking-normal md:text-6xl">
              Search should feel like collection intelligence.
            </h2>
            <p className="text-base leading-8 text-slate-300">
              Grookai is designed to answer collector questions: what exists, what you own, what you are missing, and why one version matters.
            </p>
            <Link href="/explore" className="gv-secondary-button bg-white text-slate-950 hover:bg-slate-100">
              Preview search
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="rounded-[1.55rem] bg-black/38 p-4">
              <p className="text-sm text-slate-400">Try asking</p>
              <p className="mt-3 text-2xl font-semibold leading-tight tracking-normal text-white md:text-3xl">
                Show me every Pikachu reverse holo from 2014 to 2026.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/8 px-4 py-4">
                  <p className="text-lg font-bold">Pokemon</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">Pikachu</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-4 py-4">
                  <p className="text-lg font-bold">Finish</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">Reverse holo</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-4 py-4">
                  <p className="text-lg font-bold">Years</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">2014-2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
