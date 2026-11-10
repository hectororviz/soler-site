import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../../components/layout/Container';
import { useAdminAuth } from '../auth';
import { ApiError } from '../../../types';
import { usePageTitle } from '../../../lib/usePageTitle';

export function AdminLoginPage() {
  usePageTitle('Ingresar — Admin CSD Soler');
  const { login, sessionExpired } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'No se pudo ingresar.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md rounded-card border border-line bg-white p-6 shadow-soft md:p-8">
        <img src="/escudo.svg" alt="Escudo del Club Social y Deportivo Soler" className="h-16 w-16 object-contain" />
        <h1 className="mt-3 font-display text-3xl font-extrabold uppercase">Administración</h1>
        <p className="mt-1 text-sm text-ink-muted">Acceso privado del Club Social y Deportivo Soler.</p>
        {sessionExpired && (
          <p role="alert" className="mt-3 rounded-card bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
            Tu sesión venció. Volvé a ingresar.
          </p>
        )}
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Usuario
            <input
              className="h-11 rounded-card border border-line px-3 font-normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Contraseña
            <input
              type="password"
              className="h-11 rounded-card border border-line px-3 font-normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p role="alert" className="rounded-card bg-primary-soft px-3 py-2 text-sm font-medium text-primary">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-1 inline-flex h-12 items-center justify-center rounded-card bg-primary font-bold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </Container>
  );
}
