export default function DexLoading() {
  return (
    <div className="space-y-6 py-6" aria-busy="true" aria-label="Loading Grookai Dex">
      <div className="space-y-4 border-b border-slate-200 pb-6 dark:border-white/[0.08]">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-12 w-full max-w-2xl animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-12 w-full max-w-xl animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-slate-200 py-5 dark:border-white/[0.08]">
          <div className="aspect-square animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-44 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
