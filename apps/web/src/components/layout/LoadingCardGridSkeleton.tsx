import { POKEMON_CARD_BROWSE_GRID_CLASSNAME } from "@/components/cards/pokemonCardGridLayout";

type LoadingCardGridSkeletonProps = {
  count?: number;
};

export default function LoadingCardGridSkeleton({ count = 6 }: LoadingCardGridSkeletonProps) {
  return (
    <div className={POKEMON_CARD_BROWSE_GRID_CLASSNAME}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skeleton-card-${index}`} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="rounded-[14px] border border-slate-100 bg-slate-50 p-4">
              <div className="aspect-[3/4] rounded-[12px] bg-slate-200" />
            </div>
            <div className="space-y-2.5">
              <div className="h-4 w-3/4 rounded-full bg-slate-200" />
              <div className="h-3.5 w-1/2 rounded-full bg-slate-200" />
              <div className="flex gap-2">
                <div className="h-6 w-14 rounded-full bg-slate-200" />
                <div className="h-6 w-16 rounded-full bg-slate-200" />
              </div>
              <div className="h-3.5 w-2/5 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
