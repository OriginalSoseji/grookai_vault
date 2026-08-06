export default function BinderInvitationLoading() {
  return (
    <div className="mx-auto max-w-2xl py-12" aria-busy="true" aria-label="Loading Binder invitation">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-11 w-36 animate-pulse rounded-full bg-slate-200" />
      </div>
      <p className="sr-only">Checking Binder invitation…</p>
    </div>
  );
}
