export default function BinderInvitationLoading() {
  return (
    <div className="mx-auto max-w-2xl py-12" aria-busy="true">
      <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      <p className="sr-only">Checking Binder invitation…</p>
    </div>
  );
}
