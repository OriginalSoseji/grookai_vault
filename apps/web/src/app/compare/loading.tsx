import LoadingCardGridSkeleton from "@/components/layout/LoadingCardGridSkeleton";

export default function CompareLoading() {
  return (
    <div className="space-y-6 animate-fade py-2">
      <div className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-9 w-56 rounded bg-slate-200" />
        <div className="h-4 w-80 rounded bg-slate-200" />
      </div>
      <LoadingCardGridSkeleton count={4} />
    </div>
  );
}
