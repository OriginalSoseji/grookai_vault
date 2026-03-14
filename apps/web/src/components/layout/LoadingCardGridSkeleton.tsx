type LoadingCardGridSkeletonProps = {
  count?: number;
};

export default function LoadingCardGridSkeleton({ count = 6 }: LoadingCardGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-card-${index}`}
          className="h-[340px] animate-pulse rounded-xl bg-slate-200"
        >
        </div>
      ))}
    </div>
  );
}
