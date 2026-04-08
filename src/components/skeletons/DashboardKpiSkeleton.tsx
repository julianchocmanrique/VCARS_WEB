import { SkeletonBlock } from './SkeletonBlock';

type DashboardKpiSkeletonProps = {
  cards?: number;
};

export function DashboardKpiSkeleton({ cards = 4 }: DashboardKpiSkeletonProps) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: cards }).map((_, idx) => (
        <article key={idx} className="rounded-[18px] border border-[rgba(58,61,66,0.84)] bg-[rgba(18,18,20,0.92)] p-4">
          <SkeletonBlock className="h-4 w-2/5 rounded-[8px]" />
          <SkeletonBlock className="mt-3 h-10 w-1/3 rounded-[10px]" />
          <SkeletonBlock className="mt-3 h-2.5 w-full rounded-full" />
          <SkeletonBlock className="mt-3 h-4 w-4/5 rounded-[8px]" />
        </article>
      ))}
    </div>
  );
}
