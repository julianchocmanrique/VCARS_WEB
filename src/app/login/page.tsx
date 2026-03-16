'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { DEMO_USERS, signIn } from '@/lib/auth';
import { getSession } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getSession()) {
      router.replace('/home');
    }
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
        <div className="vc-brand">VCARS</div>
        <h1>Inicia sesión</h1>
        <p>Usa tus credenciales del backend o demo local.</p>

        <form onSubmit={onSubmit} className="vc-form">
          <label>
            Usuario
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin / tecnico / cliente"
              autoComplete="username"
            />
          </label>

          <label>
            Contraseña
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••"
              autoComplete="current-password"
            />
          </label>

          {error ? <div className="vc-error">{error}</div> : null}

          <button className="vc-btn vc-btn-primary" disabled={loading}>
            {loading ? 'Validando...' : 'Ingresar'}
          </button>
        </form>

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
      </section>
    </main>
  );
}
