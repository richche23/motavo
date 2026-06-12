// app/components/AddToHomeScreen.jsx — mobile "add to home screen" banner.
// Android/Chrome: uses the native beforeinstallprompt flow.
// iOS Safari: no install API exists, so we show one-line instructions instead.
// Dismissal is remembered for 30 days. Never shows when already installed.
'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'fm:a2hs-dismissed';
const DISMISS_DAYS = 30;

export default function AddToHomeScreen() {
  const [mode, setMode] = useState(null);   // null | 'native' | 'ios'
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    try {
      // Already installed / running standalone? Never show.
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      if (standalone) return;

      // Mobile only.
      if (!window.matchMedia('(pointer: coarse)').matches) return;

      // Recently dismissed?
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

      const ua = window.navigator.userAgent;
      const isIos = /iphone|ipad|ipod/i.test(ua);

      if (isIos) {
        // iOS has no install prompt API — show instructions after a beat.
        const t = setTimeout(() => setMode('ios'), 2500);
        return () => clearTimeout(t);
      }

      // Android/Chrome: wait for the real install prompt to become available.
      const onPrompt = (e) => {
        e.preventDefault();
        setDeferred(e);
        setMode('native');
      };
      window.addEventListener('beforeinstallprompt', onPrompt);
      return () => window.removeEventListener('beforeinstallprompt', onPrompt);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      deferred.prompt();
      await deferred.userChoice;
    } catch {}
    dismiss();
  };

  if (!mode) return null;

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'var(--surface, #f2f0ea)', border: '1px solid var(--border-strong, #15120e)',
      color: 'var(--text, #15120e)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    }}>
      <span aria-hidden="true" style={{
        flexShrink: 0, width: 38, height: 38, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent, #ff4a17)', color: '#fff',
      }}>
        <svg viewBox="30 30 68 68" width="22" height="22" fill="none">
          <path d="M37 86 L37 43 L64 72.5 L91 43 L91 86" stroke="currentColor"
                strokeWidth="11.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>

      <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45 }}>
        {mode === 'native' ? (
          <><strong>Add Motavo to your home screen</strong><br />
          <span style={{ color: 'var(--text-3, #6a655c)' }}>Cheapest fuel and chargers, one tap away.</span></>
        ) : (
          <><strong>Add Motavo to your home screen</strong><br />
          <span style={{ color: 'var(--text-3, #6a655c)' }}>Tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</span></>
        )}
      </span>

      {mode === 'native' && (
        <button type="button" onClick={install} style={{
          flexShrink: 0, font: 'inherit', fontSize: 13, fontWeight: 700,
          padding: '9px 14px', background: 'var(--accent, #ff4a17)', color: '#fff',
          border: 'none', cursor: 'pointer',
        }}>Add</button>
      )}

      <button type="button" onClick={dismiss} aria-label="Dismiss" style={{
        flexShrink: 0, font: 'inherit', fontSize: 16, lineHeight: 1,
        padding: '8px 10px', background: 'none', color: 'var(--text-3, #6a655c)',
        border: '1px solid var(--border, #cbc6b9)', cursor: 'pointer',
      }}>×</button>
    </div>
  );
}
