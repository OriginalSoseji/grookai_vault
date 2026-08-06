export default function VaultImportLoading() {
  return (
    <div className="space-y-6 py-6" aria-busy="true" aria-label="Loading Vault import">
      <div className="space-y-3 border-b border-slate-200 pb-6 dark:border-white/[0.08]">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="h-28 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-white/[0.08] dark:bg-slate-900" />
    </div>
  );
}
