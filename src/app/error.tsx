'use client';

import { useEffect } from 'react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('VCARS page error');
  }, []);

  return (
    <main className="vc-page vc-auth-page">
      <section className="vc-auth-card vc-system-state" role="alert">
        <p className="vc-system-state-eyebrow">Error temporal</p>
        <h1>No pudimos cargar esta pantalla</h1>
        <p>Tu información guardada no se elimina. Intenta nuevamente o vuelve al inicio.</p>
        <div className="vc-system-state-actions">
          <button type="button" className="vc-btn vc-btn-primary" onClick={reset}>Reintentar</button>
          <a className="vc-btn" href="/vcars/home/">Ir al inicio</a>
        </div>
      </section>
    </main>
  );
}
