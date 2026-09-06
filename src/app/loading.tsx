export default function Loading() {
  return (
    <main className="vc-page vc-auth-page" aria-busy="true" aria-label="Cargando VCARS">
      <section className="vc-auth-card vc-system-state">
        <span className="vc-system-spinner" aria-hidden="true" />
        <p className="vc-system-state-eyebrow">VCARS</p>
        <h1>Preparando información</h1>
        <p>Un momento, estamos cargando la orden y sus evidencias.</p>
      </section>
    </main>
  );
}
