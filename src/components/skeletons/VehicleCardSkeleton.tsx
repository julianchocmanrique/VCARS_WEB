import { SkeletonBlock } from './SkeletonBlock';

export function VehicleCardSkeleton() {
  return (
    <article className="rounded-[22px] border border-[rgba(58,61,66,0.85)] bg-[rgba(18,18,20,0.92)] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
      <SkeletonBlock className="h-[128px] w-full rounded-[16px]" />
      <div className="mt-3 space-y-2">
        <SkeletonBlock className="h-7 w-4/5 rounded-[10px]" />
        <SkeletonBlock className="h-5 w-1/2 rounded-[9px]" />
        <SkeletonBlock className="h-9 w-full rounded-[12px]" />
        <SkeletonBlock className="h-12 w-full rounded-[12px]" />
      </div>
    </article>
  );
}
