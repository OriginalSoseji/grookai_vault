import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="gv-page-container gv-page-rhythm py-8 sm:py-14">
      <section className="gv-storefront-empty mx-auto max-w-2xl text-center">
        <p className="gv-eyebrow">Listing unavailable</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">This collectible is no longer listed.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">The seller may have sold, archived, or unpublished this item. Return to the storefront to see what is available now.</p>
        <Link href="../.." className="gv-primary-button mt-6 inline-flex">Back to store</Link>
      </section>
    </main>
  );
}
