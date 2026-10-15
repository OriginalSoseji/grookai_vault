export default function StoreLoading() {
  return (
    <main className="gv-page-container gv-page-rhythm py-5 sm:py-8" aria-busy="true" aria-label="Loading storefront">
      <div className="gv-storefront-hero animate-pulse">
        <div className="gv-storefront-hero-content">
          <div className="h-6 w-52 rounded-full bg-white/15" />
          <div className="mt-6 h-20 w-3/4 max-w-xl rounded-2xl bg-white/15" />
          <div className="mt-4 h-5 w-full max-w-lg rounded-full bg-white/10" />
          <div className="mt-7 h-11 w-40 rounded-full bg-white/15" />
        </div>
      </div>
      <div className="mt-10 space-y-6">
        <div className="space-y-3"><div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-white/10" /><div className="h-10 w-72 rounded-xl bg-slate-200 dark:bg-white/10" /></div>
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-white/[0.05]" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[4/5] rounded-2xl bg-slate-100 dark:bg-white/[0.05]" />)}
        </div>
      </div>
    </main>
  );
}
