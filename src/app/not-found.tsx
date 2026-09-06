import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="vc-page vc-auth-page">
      <section className="vc-auth-card vc-system-state">
        <p className="vc-system-state-eyebrow">404</p>
        <h1>Esta pantalla no existe</h1>
        <p>Revisa el enlace o vuelve al panel operativo de VCARS.</p>
        <Link className="vc-btn vc-btn-primary" href="/home">Ir al inicio</Link>
      </section>
    </main>
  );
}
