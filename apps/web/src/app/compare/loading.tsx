import LoadingCardGridSkeleton from "@/components/layout/LoadingCardGridSkeleton";

export default function CompareLoading() {
  return (
    <div className="space-y-6 animate-fade py-2" aria-busy="true" aria-label="Loading card comparison">
      <div className="space-y-3 border-b border-slate-200 bg-white py-6 dark:border-white/[0.08]">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-9 w-56 rounded bg-slate-200" />
        <div className="h-4 w-80 rounded bg-slate-200" />
      </div>
      <LoadingCardGridSkeleton count={4} />
    </div>
  );
}
