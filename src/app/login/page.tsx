'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { signIn } from '@/lib/auth';
import { getSession } from '@/lib/storage';
import { FlowHeader } from '@/components/FlowHeader';
import { ActionButton, type ActionButtonState } from '@/components/ui/ActionButton';
import { ActionFeedback, type ActionFeedbackType } from '@/components/ui/ActionFeedback';

type FeedbackState = {
  type: ActionFeedbackType;
  message: string;
} | null;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<ActionButtonState>('idle');
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (getSession()) router.replace('/home');
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSubmitState('loading');
    setFeedback(null);

    const res = await signIn(username, password);
    setLoading(false);

    if (!res.ok) {
      setSubmitState('error');
      setFeedback({ type: 'error', message: res.error });
      setTimeout(() => setSubmitState('idle'), 720);
      return;
    }

    setSubmitState('success');
    setFeedback({ type: 'success', message: 'Acceso concedido. Entrando al panel...' });
    setTimeout(() => router.replace('/home'), 320);
  }

  return (
    <main className="vc-page vc-auth-page">
      <section className="vc-auth-card">
        <FlowHeader subtitle="Inicia sesión" />

        <form onSubmit={onSubmit} className="vc-form-card">
          <label className="vc-label">Usuario</label>
          <div className="vc-input-wrap">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="david@vcars.com"
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

          <ActionFeedback
            show={Boolean(feedback)}
            type={feedback?.type || 'info'}
            message={feedback?.message || ''}
          />

          <ActionButton type="submit" variant="primary" state={submitState} disabled={loading} className="mt-3">
            {loading ? 'Validando...' : 'Ingresar'}
          </ActionButton>

        </form>
      </section>
    </main>
  );
}
