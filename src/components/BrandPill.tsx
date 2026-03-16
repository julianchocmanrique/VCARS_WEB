import Image from 'next/image';

export function BrandPill() {
  return (
    <div className="vc-brand-wrap">
      <div className="vc-brand-glow" />
      <div className="vc-brand-scan" />
      <div className="vc-brand-row">
        <Image src="/vcars-v.png" alt="VCARS" width={18} height={18} className="vc-brand-image" />
        <span className="vc-brand-text">-CARS</span>
      </div>
    </div>
  );
}
