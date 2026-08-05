import { POKEMON_CARD_BROWSE_GRID_CLASSNAME } from "@/components/cards/pokemonCardGridLayout";

type LoadingCardGridSkeletonProps = {
  count?: number;
};

export default function LoadingCardGridSkeleton({ count = 6 }: LoadingCardGridSkeletonProps) {
  return (
    <div className={POKEMON_CARD_BROWSE_GRID_CLASSNAME} aria-busy="true" aria-label="Loading cards">
      <span className="sr-only">Loading cards</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skeleton-card-${index}`} className="min-w-0">
          <div className="animate-pulse space-y-2.5" aria-hidden="true">
            <div className="aspect-[5/7] rounded-[22px] bg-slate-200/80 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded-full bg-slate-200" />
              <div className="h-3.5 w-1/2 rounded-full bg-slate-200" />
              <div className="h-3.5 w-2/5 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
