export default function CollectorProfileLoading() {
  return (
    <div className="space-y-6 py-8" aria-busy="true" aria-label="Loading collector profile">
      <div className="h-40 rounded-[24px] border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-slate-900" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[5/7] rounded-[18px] bg-slate-200 dark:bg-slate-800" />)}
      </div>
    </div>
  );
}
