import LoadingCardGridSkeleton from "@/components/layout/LoadingCardGridSkeleton";

export default function ExploreLoading() {
  return (
    <div className="space-y-6 animate-fade py-2">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-9 w-48 rounded bg-slate-200" />
        <div className="h-4 w-72 rounded bg-slate-200" />
      </div>
      <div className="h-16 rounded-[16px] border border-slate-200 bg-white p-4">
        <div className="h-full w-full rounded bg-slate-100" />
      </div>
      <LoadingCardGridSkeleton />
    </div>
  );
}
