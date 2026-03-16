import Link from 'next/link';

type Tab = 'home' | 'new' | 'process';

export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className="vc-bottom-nav">
      <Link href="/home" className={`vc-nav-item ${active === 'home' ? 'is-active' : ''}`}>
        <span>INICIO</span>
      </Link>
      <Link href="/nuevo-ingreso" className={`vc-nav-item ${active === 'new' ? 'is-active' : ''}`}>
        <span>NUEVO</span>
      </Link>
      <Link href="/ingreso-activo" className={`vc-nav-item ${active === 'process' ? 'is-active' : ''}`}>
        <span>PROCESO</span>
      </Link>
    </nav>
  );
}
