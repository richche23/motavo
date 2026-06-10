'use client';

import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Navigation, ChevronDown } from 'lucide-react';

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
  const ref = useRef<HTMLDivElement>(null);
  const urls = directionsUrls(lat, lng, label);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const trigger: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: 'var(--accent)', fontWeight: 600, fontSize: 14,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Get directions — choose a maps app"
        style={trigger}
      >
        <Navigation size={14} strokeWidth={2.4} /> Directions
        <ChevronDown size={13} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
            minWidth: 170, background: 'var(--surface)', border: '1px solid var(--text)',
            boxShadow: '0 6px 22px rgba(0,0,0,0.16)',
          }}
        >
          {APPS.map((a, i) => (
            <a
              key={a.key}
              role="menuitem"
              href={urls[a.key]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              style={{
                display: 'block', padding: '10px 14px', fontSize: 14,
                color: 'var(--text)', textDecoration: 'none',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              {a.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
