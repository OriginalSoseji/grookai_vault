import LoadingCardGridSkeleton from "@/components/layout/LoadingCardGridSkeleton";

export default function VaultLoading() {
  return (
    <div className="space-y-6 animate-fade py-2">
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`vault-metric-${index}`} className="animate-pulse rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-4 h-10 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <LoadingCardGridSkeleton />
    </div>
  );
}
