import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { ArrowRight, Shield, Cloud, Mail } from 'lucide-react';
import { auth, emulatorMode, firebaseConfigured } from '../lib/firebase';
import { Brand } from './Shell';
import { Button } from './ui';

export function friendlyError(error: unknown) {
  const code = (error as { code?: string })?.code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'That email and password did not match. Please try again.',
    'auth/email-already-in-use':
      'An account already uses this email. Sign in or reset your password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Use a password with at least 8 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes before trying again.',
    'auth/network-request-failed': 'Connection lost. Check your internet and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please try another method.',
    'auth/popup-blocked':
      'Your browser blocked Google sign-in. Allow popups for this site and try again.',
    'auth/popup-closed-by-user':
      'Google sign-in was closed. You can try again or sign in with email.',
    'auth/cancelled-popup-request':
      'Another sign-in window is already open. Complete that window first.',
    'auth/unauthorized-domain': 'Google sign-in is not configured for this site address yet.',
    'auth/account-exists-with-different-credential':
      'This email already has an account. Sign in with your existing method to keep using that realm.',
    'functions/not-found':
      'The game backend has not been deployed yet. Your account is safe; try again after deployment.',
    'functions/unavailable':
      'The game server is unavailable. Your last confirmed progress is safe.',
    'functions/internal': 'The game server could not complete this request. Try again in a moment.',
  };
  return (
    messages[code] ??
    (error instanceof Error
      ? error.message.replace(/^Firebase: /, '')
      : 'Something went wrong. Please try again.')
  );
}
export function AccountFrame({ children }: { children: ReactNode }) {
  return (
    <main className="account-screen">
      <div className="account-scenery">
        <img src="/art/homestead.webp" alt="A small home beneath a kingdom at war" />
        <div>
          <span className="letter-label">YOUR STORY STARTS HERE</span>
          <h1>
            A home. <br />
            An oath. <br />A kingdom to build.
          </h1>
          <p>
            Raise your banner in a world at war. What begins as a homestead could become a legend.
          </p>
        </div>
      </div>
      <section className="account-panel">
        <Brand />
        {children}
        <p className="account-footnote">
          <Shield size={14} />{' '}
          {emulatorMode
            ? 'Local emulator · Test accounts only'
            : 'Your realm travels with your account.'}
        </p>
      </section>
    </main>
  );
}
export function AccountGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  async function googleSignIn() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setPassword('');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') await createUserWithEmailAndPassword(auth, email.trim(), password);
      else if (mode === 'signin') await signInWithEmailAndPassword(auth, email.trim(), password);
      else {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice('If that address has an account, a password reset link is on its way.');
      }
      setPassword('');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  if (user) return children(user);
  return (
    <AccountFrame>
      {!firebaseConfigured ? (
        <div className="account-form">
          <h2>Connect your realm.</h2>
          <p>
            Firebase configuration is missing. Add the values from .env.example, then run npm run
            dev:live.
          </p>
        </div>
      ) : user === undefined ? (
        <div className="account-form" role="status">
          <Cloud />
          <h2>Finding your realm…</h2>
        </div>
      ) : (
        <form className="account-form" onSubmit={submit}>
          <span className="letter-label">
            {mode === 'signup' ? 'A NEW CHAPTER' : 'WELCOME, WANDERER'}
          </span>
          <h2>
            {mode === 'signup'
              ? 'Claim your homestead.'
              : mode === 'reset'
                ? 'Find your way home.'
                : 'Return to your realm.'}
          </h2>
          <p>
            {mode === 'signup'
              ? 'Begin with 1,800 gold, a loyal militia, and a choice of four factions.'
              : mode === 'reset'
                ? 'Enter your email to request a password reset link.'
                : 'Your people have kept the fires burning.'}
          </p>
          {mode !== 'reset' && (
            <>
              <Button
                type="button"
                variant="secondary"
                className="full-width"
                disabled={busy}
                onClick={googleSignIn}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.2 2-6.9 2-5.3 0-9.8-3.6-11.4-8.3H5.8V33A20.4 20.4 0 0 0 24 44Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.6 27.8a12.2 12.2 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18l6.8-5.2Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 11.9c3 0 5.7 1 7.8 3l5.8-5.8A19.6 19.6 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15l6.8 5.2c1.6-4.7 6.1-8.3 11.4-8.3Z"
                  />
                </svg>
                Continue with Google
              </Button>
              <div className="account-divider">
                <span>or use your email</span>
              </div>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== 'reset' && (
            <label>
              Password
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="positive">
              {notice}
            </p>
          )}
          <Button type="submit" disabled={busy} className="full-width">
            {busy
              ? 'Opening the gates…'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'reset'
                  ? 'Send reset link'
                  : 'Enter your realm'}
            {mode === 'reset' ? <Mail size={17} /> : <ArrowRight size={17} />}
          </Button>
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError('');
              setNotice('');
            }}
          >
            {mode === 'signup' ? 'Already have a realm? Sign in' : 'New here? Create your account'}
          </button>
          {mode !== 'signup' && (
            <button
              type="button"
              className="account-subtle"
              disabled={busy}
              onClick={() => {
                setMode(mode === 'reset' ? 'signin' : 'reset');
                setError('');
                setNotice('');
              }}
            >
              {mode === 'reset' ? 'Back to sign in' : 'Forgot your password?'}
            </button>
          )}
        </form>
      )}
    </AccountFrame>
  );
}
export function RealmLoading({ error, retry }: { error: string; retry: () => void }) {
  return (
    <AccountFrame>
      <div className="account-form" role={error ? 'alert' : 'status'}>
        <Cloud size={28} />
        <h2>{error ? 'The gates are closed for now.' : 'Your realm awaits…'}</h2>
        <p>{error || 'Retrieving your treasury, troops, and the latest chronicles.'}</p>
        {error && (
          <>
            <Button onClick={retry}>Try again</Button>
            <Button variant="ghost" onClick={() => void signOut(auth)}>
              Sign out
            </Button>
          </>
        )}
      </div>
    </AccountFrame>
  );
}
