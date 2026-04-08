import Link from 'next/link';
import { BrandPill } from '@/components/BrandPill';

type FlowHeaderProps = {
  subtitle: string;
  backHref?: string;
  inlineSubtitle?: boolean;
};

export function FlowHeader({ subtitle, backHref, inlineSubtitle = false }: FlowHeaderProps) {
  return (
    <header className="vc-detail-head vc-flow-head">
      {backHref ? (
        <Link href={backHref} className="vc-back-btn" aria-label="Volver">
          ‹
        </Link>
      ) : null}

      <div className={`vc-flow-head-content ${inlineSubtitle ? 'is-inline' : 'is-stacked'}`}>
        <div className="vc-flow-head-row">
          <BrandPill />
          {inlineSubtitle ? <p className="vc-head-sub vc-head-sub-inline">{subtitle}</p> : null}
        </div>
        {!inlineSubtitle ? <p className="vc-head-sub">{subtitle}</p> : null}
      </div>
    </header>
  );
}
