type LoadingCardGridSkeletonProps = {
  count?: number;
};

export default function LoadingCardGridSkeleton({ count = 6 }: LoadingCardGridSkeletonProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-card-${index}`}
          className="animate-pulse rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="rounded-[12px] border border-slate-100 bg-slate-100 p-2">
            <div className="aspect-[3/4] w-full rounded-[10px] bg-slate-200" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-200" />
            <div className="h-3 w-1/4 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
