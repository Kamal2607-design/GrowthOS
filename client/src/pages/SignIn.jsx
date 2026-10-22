import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';
import { GOOGLE_SIGN_IN_URL } from '../lib/api.js';
import { errorMessage } from '../lib/messages.js';
import { Alert, Button, Field, TextInput } from '../components/ui.jsx';
import { Logo } from '../components/AppShell.jsx';

export default function SignIn() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [mode, setMode] = useState('sign-in');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    params.get('error') === 'google' ? 'Google sign-in did not complete. Try again.' : '',
  );

  if (!loading && user) {
    return <Navigate to={location.state?.from || '/'} replace />;
  }

  const creating = mode === 'create';
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (creating && form.password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    setSubmitting(true);

    try {
      if (creating) {
        await signUp(form);
      } else {
        await signIn(form.email, form.password);
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch (cause) {
      setError(
        cause.status === 401
          ? 'That email and password do not match.'
          : errorMessage(cause),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh md:grid md:place-items-center md:p-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col gap-8 px-6 pb-8 pt-16 md:min-h-0 md:rounded-3xl md:border md:border-line md:bg-surface md:p-10">
        <div className="flex flex-col items-start gap-4">
          <Logo />
          <h1 className="m-0 font-display text-[28px] font-semibold leading-tight tracking-tight">
            Turn your vision into today's actions
          </h1>
          <p className="m-0 text-base text-ink-soft">
            {creating ? 'Create your GrowthOS account.' : 'Sign in to GrowthOS.'}
          </p>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {creating && (
            <Field label="Name">
              <TextInput autoComplete="name" value={form.name} onChange={update('name')} />
            </Field>
          )}
          <Field label="Email">
            <TextInput
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update('email')}
            />
          </Field>
          <Field label="Password" hint={creating ? 'At least 8 characters.' : undefined}>
            <TextInput
              type="password"
              required
              autoComplete={creating ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={update('password')}
            />
          </Field>
          <Button type="submit" loading={submitting} className="min-h-12 text-base">
            {creating ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="h-px flex-1 bg-line-strong" />
          or
          <span className="h-px flex-1 bg-line-strong" />
        </div>

        <a
          href={GOOGLE_SIGN_IN_URL}
          className="flex min-h-12 items-center justify-center rounded-xl border border-field bg-surface text-base font-semibold text-ink no-underline hover:bg-hover"
        >
          Continue with Google
        </a>

        <p className="m-0 mt-auto text-center text-[15px] text-ink-soft">
          {creating ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(creating ? 'sign-in' : 'create');
              setError('');
            }}
            className="min-h-11 font-semibold text-brand-ink underline-offset-2 hover:underline"
          >
            {creating ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
}
