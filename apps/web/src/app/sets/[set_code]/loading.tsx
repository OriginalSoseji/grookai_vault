import LoadingCardGridSkeleton from "@/components/layout/LoadingCardGridSkeleton";

export default function SetLoading() {
  return (
    <div className="space-y-6 animate-fade py-2">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-10 w-64 rounded bg-slate-200" />
        <div className="h-4 w-48 rounded bg-slate-200" />
      </div>
      <LoadingCardGridSkeleton />
    </div>
  );
}
