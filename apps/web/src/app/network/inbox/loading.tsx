export default function InboxLoading() {
  return (
    <div className="space-y-6 py-8" aria-busy="true" aria-label="Loading messages">
      <div className="space-y-3 border-b border-slate-200 pb-6 dark:border-white/[0.08]">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>
      {[0, 1].map((item) => (
        <div key={item} className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-slate-200 py-5 dark:border-white/[0.08]">
          <div className="aspect-[5/7] animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-7 w-52 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-16 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
