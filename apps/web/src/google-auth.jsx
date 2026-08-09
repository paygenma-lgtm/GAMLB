import React, { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '131467229339-g0bjrpj7mh05tbb6u71615lj2dmmc3pv.apps.googleusercontent.com';

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function AdminAuthGate({ children }) {
  const buttonRef = useRef(null);
  const [state, setState] = useState('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(response => {
        if (response.ok) return response.json();
        throw new Error('UNAUTHENTICATED');
      })
      .then(() => setState('authenticated'))
      .catch(() => setState('login'));
  }, []);

  useEffect(() => {
    if (state !== 'login' || !buttonRef.current) return undefined;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async response => {
          try {
            setError('');
            const result = await fetch('/api/auth/google', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential })
            });
            const body = await result.json().catch(() => ({}));
            if (!result.ok) throw new Error(body.error || 'GOOGLE_LOGIN_FAILED');
            setState('authenticated');
          } catch (loginError) {
            setError(loginError.message);
          }
        }
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 280
      });
    }).catch(() => setError('GOOGLE_SCRIPT_UNAVAILABLE'));
    return () => { cancelled = true; };
  }, [state]);

  if (state === 'checking') return <div className="admin-loading">Проверка сессии…</div>;
  if (state === 'authenticated') return children;
  return <div className="admin-denied">
    <div className="admin-login-card">
      <span className="admin-logo">G</span>
      <h1>Вход в GAMLB Admin</h1>
      <p>Войдите через Google. Административный доступ предоставляется только аккаунту с ролью admin.</p>
      <div ref={buttonRef} className="google-login-button" />
      {error && <code>{error}</code>}
    </div>
  </div>;
}
