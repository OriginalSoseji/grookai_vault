export default function SharedBinderLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-12" aria-busy="true">
      <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      <p className="sr-only">Checking view-only Binder access…</p>
    </div>
  );
}
