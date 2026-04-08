import type { CSSProperties } from 'react';

type SkeletonBlockProps = {
  className?: string;
  style?: CSSProperties;
};

export function SkeletonBlock({ className = '', style }: SkeletonBlockProps) {
  return <div aria-hidden="true" className={`vc-skeleton ${className}`.trim()} style={style} />;
}
