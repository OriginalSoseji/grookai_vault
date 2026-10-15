export default function ProductLoading() {
  return (
    <main className="gv-page-container gv-page-rhythm py-5 sm:py-8" aria-busy="true" aria-label="Loading collectible">
      <div className="mb-5 h-4 w-52 rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="grid overflow-hidden rounded-[2rem] border border-slate-200/70 dark:border-white/[0.08] lg:grid-cols-2">
        <div className="min-h-[30rem] animate-pulse bg-slate-100 dark:bg-white/[0.05]" />
        <div className="space-y-5 p-7 sm:p-12"><div className="h-6 w-40 rounded-full bg-slate-200 dark:bg-white/10" /><div className="h-14 w-full rounded-2xl bg-slate-200 dark:bg-white/10" /><div className="h-28 w-full rounded-2xl bg-slate-100 dark:bg-white/[0.05]" /><div className="h-24 w-full rounded-2xl bg-slate-100 dark:bg-white/[0.05]" /></div>
      </div>
    </main>
  );
}
