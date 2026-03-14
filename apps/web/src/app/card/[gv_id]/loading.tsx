export default function CardLoading() {
  return (
    <div className="grid animate-fade gap-10 py-4 md:grid-cols-[40%_60%]">
      <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="aspect-[3/4] w-full animate-pulse rounded-[12px] bg-slate-100" />
      </div>
      <div className="space-y-6">
        <div className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-9 w-64 rounded bg-slate-200" />
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-4 w-24 rounded bg-slate-200" />
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[160px_auto]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`card-meta-${index}`} className="contents animate-pulse">
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
