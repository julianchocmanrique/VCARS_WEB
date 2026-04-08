import { SkeletonBlock } from './SkeletonBlock';

export function HeroPanelSkeleton() {
  return (
    <section className="relative z-[2] mx-auto w-full max-w-[1160px] px-4 pt-6 md:px-6 md:pt-8">
      <div className="rounded-[24px] border border-[rgba(58,61,66,0.85)] bg-[linear-gradient(145deg,rgba(18,18,20,0.96),rgba(26,27,30,0.96))] p-5 md:p-7">
        <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <SkeletonBlock className="h-4 w-40 rounded-[999px]" />
            <SkeletonBlock className="mt-4 h-10 w-11/12 rounded-[12px]" />
            <SkeletonBlock className="mt-2.5 h-5 w-4/5 rounded-[9px]" />
            <div className="mt-5 flex flex-wrap gap-2.5">
              <SkeletonBlock className="h-11 w-44 rounded-[13px]" />
              <SkeletonBlock className="h-11 w-36 rounded-[13px]" />
            </div>
          </div>
          <div className="rounded-[18px] border border-[rgba(58,61,66,0.8)] bg-[rgba(11,11,12,0.5)] p-4">
            <SkeletonBlock className="h-32 w-full rounded-[14px]" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SkeletonBlock className="h-10 w-full rounded-[10px]" />
              <SkeletonBlock className="h-10 w-full rounded-[10px]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
