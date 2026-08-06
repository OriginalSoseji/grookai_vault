export default function ScanLoading() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 bg-[#05070a] px-6 text-white" aria-busy="true" aria-label="Loading card scanner">
      <div className="aspect-[5/7] w-[min(70vw,286px)] animate-pulse rounded-lg border border-sky-200/40 bg-slate-900" />
      <div className="h-5 w-44 animate-pulse rounded bg-slate-700" />
      <div className="h-11 w-36 animate-pulse rounded-full bg-slate-700" />
    </div>
  );
}
