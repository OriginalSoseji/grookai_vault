export default function NetworkLoading() {
  return (
    <div className="space-y-5 py-8" aria-busy="true" aria-label="Loading Pulse">
      <div className="h-8 w-28 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-4 border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
        <div className="aspect-[5/7] rounded-[18px] bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-3">
          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-7 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
