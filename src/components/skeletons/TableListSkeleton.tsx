import { SkeletonBlock } from './SkeletonBlock';

type TableListSkeletonProps = {
  rows?: number;
  withHeader?: boolean;
};

export function TableListSkeleton({ rows = 4, withHeader = true }: TableListSkeletonProps) {
  return (
    <section className="rounded-[18px] border border-[rgba(58,61,66,0.85)] bg-[rgba(18,18,20,0.92)] p-4">
      {withHeader ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <SkeletonBlock className="h-5 w-1/3 rounded-[8px]" />
          <SkeletonBlock className="h-5 w-14 rounded-[999px]" />
        </div>
      ) : null}

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="grid grid-cols-[minmax(0,1fr)_68px_48px] items-center gap-2 rounded-[12px] border border-[rgba(58,61,66,0.65)] p-2.5">
            <SkeletonBlock className="h-4 w-5/6 rounded-[8px]" />
            <SkeletonBlock className="h-4 w-10 rounded-[8px]" />
            <SkeletonBlock className="h-4 w-8 rounded-[8px]" />
          </div>
        ))}
      </div>
    </section>
  );
}
