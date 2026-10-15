import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="gv-page-container gv-page-rhythm py-8 sm:py-14">
      <section className="gv-storefront-empty mx-auto max-w-2xl text-center">
        <p className="gv-eyebrow">Store not found</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">This storefront is not public.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">The link may be unpublished, expired, or typed incorrectly. You can keep browsing the Grookai catalog.</p>
        <Link href="/explore" className="gv-primary-button mt-6 inline-flex">Browse cards</Link>
      </section>
    </div>
  );
}
