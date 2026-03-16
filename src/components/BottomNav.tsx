import Link from 'next/link';

type Tab = 'home' | 'proceso' | 'login';

export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className="vc-bottom-nav">
      <Link href="/home" className={`vc-nav-item ${active === 'home' ? 'is-active' : ''}`}>
        <span>INICIO</span>
      </Link>
      <Link href="/ingreso-activo" className={`vc-nav-item ${active === 'proceso' ? 'is-active' : ''}`}>
        <span>PROCESO</span>
      </Link>
      <Link href="/login" className={`vc-nav-item ${active === 'login' ? 'is-active' : ''}`}>
        <span>LOGIN</span>
      </Link>
    </nav>
  );
}
