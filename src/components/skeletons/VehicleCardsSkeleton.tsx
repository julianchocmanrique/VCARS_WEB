import { VehicleCardSkeleton } from './VehicleCardSkeleton';

type VehicleCardsSkeletonProps = {
  count?: number;
};

export function VehicleCardsSkeleton({ count = 6 }: VehicleCardsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-3 pb-28 min-[520px]:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <VehicleCardSkeleton key={`vehicle-skeleton-${idx}`} />
      ))}
    </div>
  );
}
