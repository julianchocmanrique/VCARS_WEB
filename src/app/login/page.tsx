'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { DEMO_USERS, signIn } from '@/lib/auth';
import { getSession } from '@/lib/storage';
import { BrandPill } from '@/components/BrandPill';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getSession()) router.replace('/home');
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn(username, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace('/home');
  }

  return (
    <main className="vc-page vc-auth-page">
      <section className="vc-auth-card">
        <header className="vc-head-block">
          <BrandPill />
          <p className="vc-head-sub">Inicia sesión</p>
        </header>

        <form onSubmit={onSubmit} className="vc-form-card">
          <label className="vc-label">Usuario</label>
          <div className="vc-input-wrap">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin / tecnico / cliente"
              autoComplete="username"
            />
          </div>

          <label className="vc-label">Contraseña</label>
          <div className="vc-input-wrap">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••"
              autoComplete="current-password"
            />
          </div>

          {error ? <div className="vc-error">{error}</div> : null}

          <button className="vc-login-btn" disabled={loading}>
            {loading ? 'Validando...' : 'Ingresar'}
          </button>

          <div className="vc-chip-row">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                className="vc-chip"
                onClick={() => {
                  setUsername(u.username);
                  setPassword(u.password);
                }}
                type="button"
              >
                {u.username}
              </button>
            ))}
          </div>

          <p className="vc-hint">Credenciales locales temporales (roles: admin / tecnico / cliente).</p>
        </form>
      </section>
    </main>
  );
}
