'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { Navigation, ChevronDown, ArrowUpRight, X } from 'lucide-react';

// Universal https links — each opens the native app if installed, else the web
// version. (Avoids custom schemes like comgooglemaps:// or waze:// that fail
// silently when the app isn't installed.)
export function directionsUrls(lat: number, lng: number, label?: string) {
  const q = label ? encodeURIComponent(label) : '';
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    apple: `https://maps.apple.com/?daddr=${lat},${lng}${q ? `&q=${q}` : ''}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  };
}

const APPS = [
  { key: 'google', label: 'Google Maps' },
  { key: 'apple', label: 'Apple Maps' },
  { key: 'waze', label: 'Waze' },
] as const;

export function DirectionsMenu({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const urls = directionsUrls(lat, lng, label);

  // Close on Escape and lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const trigger: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: 'var(--accent)', fontWeight: 600, fontSize: 14,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  };

  const sheet = (
    <div
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a maps app for directions"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'motavo-fade 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, background: 'var(--surface)',
          border: '2px solid var(--text)', borderBottom: 'none',
          maxHeight: '80vh', overflowY: 'auto',
          animation: 'motavo-slide 0.18s ease',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 18px', borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="font-display" style={{ fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
              Open directions in
            </div>
            {label && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {APPS.map((a) => (
          <a
            key={a.key}
            href={urls[a.key]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '17px 18px', fontSize: 16, fontWeight: 600,
              color: 'var(--text)', textDecoration: 'none',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Navigation size={16} strokeWidth={2.2} style={{ color: 'var(--accent)' }} />
              {a.label}
            </span>
            <ArrowUpRight size={18} style={{ color: 'var(--text-4)' }} />
          </a>
        ))}

        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            display: 'block', width: '100%', padding: '16px 18px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 15, color: 'var(--text-3)', textAlign: 'center',
          }}
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes motavo-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes motavo-slide { from { transform: translateY(12px) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Get directions — choose a maps app"
        style={trigger}
      >
        <Navigation size={14} strokeWidth={2.4} /> Directions
        <ChevronDown size={13} style={{ opacity: 0.7 }} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(sheet, document.body)}
    </>
  );
}
