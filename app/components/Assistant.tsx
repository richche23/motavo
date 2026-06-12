'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ArrowUp, Loader2 } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = {
  role: 'assistant',
  content: "Hi — I'm the Motavo assistant. Ask me where the cheapest fuel is or whether now's a good time to fill up. Try: \"cheapest 95 in Frankston\".",
};

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await r.json();
      setMsgs((m) => [...m, { role: 'assistant', content: data?.reply || 'Sorry, something went wrong.' }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'Network error — please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  // Compact icon-only launcher on small screens so it doesn't sit over
  // content rows or compete with primary CTAs.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the Motavo assistant"
          style={{
            position: 'fixed', right: 18, bottom: 18, zIndex: 900,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--accent, #ff4a17)', color: '#fff',
            border: 'none', cursor: 'pointer',
            padding: compact ? 0 : '12px 16px',
            width: compact ? 52 : undefined, height: compact ? 52 : undefined,
            fontWeight: 700, fontSize: 14, boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
          }}
        >
          <MessageCircle size={compact ? 22 : 18} />{compact ? null : ' Ask Motavo'}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Motavo assistant"
          style={{
            position: 'fixed', zIndex: 900, right: 16, bottom: 16,
            width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 32px))',
            display: 'flex', flexDirection: 'column',
            background: 'var(--surface, #f2f0ea)', color: 'var(--text, #15120e)',
            border: '2px solid var(--text, #15120e)', boxShadow: '0 10px 40px rgba(0,0,0,0.28)',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderBottom: '1px solid var(--border, #cbc6b9)',
            }}
          >
            <span className="font-display" style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Motavo assistant
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3, #6a655c)', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--accent, #ff4a17)' : 'var(--surface-2, #e7e4dd)',
                  color: m.role === 'user' ? '#fff' : 'var(--text, #15120e)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border, #cbc6b9)',
                  padding: '9px 12px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-3, #6a655c)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Loader2 size={14} className="animate-spin" /> Checking live prices…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border, #cbc6b9)' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Ask about fuel near you…"
              aria-label="Message the assistant"
              style={{
                // 16px minimum: iOS Safari auto-zooms the page when focusing
                // any input below 16px, leaving the user stuck zoomed in.
                flex: 1, padding: '10px 12px', fontSize: 16,
                background: 'var(--bg, #e7e4dd)', color: 'var(--text, #15120e)',
                border: '1px solid var(--text, #15120e)', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !input.trim()}
              aria-label="Send"
              style={{
                background: 'var(--accent, #ff4a17)', color: '#fff', border: 'none',
                padding: '0 14px', cursor: busy || !input.trim() ? 'default' : 'pointer',
                opacity: busy || !input.trim() ? 0.6 : 1,
              }}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
