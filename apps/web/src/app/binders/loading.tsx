export default function BindersLoading() {
  return (
    <div className="space-y-8 py-6" aria-busy="true" aria-label="Loading Binders">
      <div className="space-y-3">
        <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
        <div className="h-10 w-64 max-w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-52 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        ))}
      </div>
      <span className="sr-only">Loading your Binders…</span>
    </div>
  );
}
