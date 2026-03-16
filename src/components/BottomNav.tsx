import Link from 'next/link';

type Tab = 'home' | 'new' | 'process';

type NavItem = {
  key: Tab;
  href: string;
  label: string;
};

const ITEMS: NavItem[] = [
  { key: 'home', href: '/home', label: 'INICIO' },
  { key: 'new', href: '/nuevo-ingreso', label: 'NUEVO' },
  { key: 'process', href: '/ingreso-activo', label: 'PROCESO' },
];

function Icon({ name, active }: { name: Tab; active: boolean }) {
  const stroke = active ? '#031522' : '#b2c2d8';

  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" className="vc-nav-svg" aria-hidden="true">
        <path d="M3 11.8 12 4l9 7.8" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.4 10.7V20h9.2v-9.3" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'new') {
    return (
      <svg viewBox="0 0 24 24" className="vc-nav-svg" aria-hidden="true">
        <circle cx="12" cy="12" r="8.4" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M12 8.3v7.4M8.3 12h7.4" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="vc-nav-svg" aria-hidden="true">
      <path d="M5.3 8.2 12 4.5l6.7 3.7L12 12 5.3 8.2Z" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m5.3 12 6.7 3.7 6.7-3.7M5.3 15.8l6.7 3.7 6.7-3.7" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className="vc-bottom-nav" aria-label="Menu inferior">
      {ITEMS.map((item) => {
        const isActive = active === item.key;
        return (
          <Link key={item.key} href={item.href} className={`vc-nav-item ${isActive ? 'is-active' : ''}`}>
            <span className="vc-nav-item-inner">
              <span className="vc-nav-icon-wrap">
                <Icon name={item.key} active={isActive} />
              </span>
              <span className="vc-nav-label">{item.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
