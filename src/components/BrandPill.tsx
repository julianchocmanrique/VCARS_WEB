import Image from 'next/image';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function BrandPill() {
  return (
    <div className="vc-brand-wrap">
      <div className="vc-brand-glow" />
      <div className="vc-brand-scan" />
      <div className="vc-brand-row">
        <Image
          src={`${BASE_PATH}/vcars-v.png`}
          alt="VCARS"
          width={18}
          height={18}
          className="vc-brand-image"
        />
        <span className="vc-brand-text">-CARS</span>
      </div>
    </div>
  );
}
