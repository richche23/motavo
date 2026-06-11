import { useState } from 'react';
import { Mail, Check, AlertCircle, Loader2 } from 'lucide-react';

const CITIES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'ACT', 'TAS', 'NT'];
const FUELS = [
  { code: 'U91', label: '91' },
  { code: 'P95', label: '95' },
  { code: 'P98', label: '98' },
  { code: 'E10', label: 'E10' },
  { code: 'DSL', label: 'Diesel' },
];

export const AlertSignup = () => {
  const [email, setEmail] = useState('');
  const [cities, setCities] = useState([]);
  const [fuelType, setFuelType] = useState('U91');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const toggleCity = (city) => {
    setCities(prev =>
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const submit = async () => {
    if (!email.trim() || cities.length === 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), cities, fuelType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Subscription failed');
      setMessage({ type: 'success', text: `Subscribed! You'll get alerts when ${cities.join(', ')} prices are good.` });
      setEmail('');
      setCities([]);
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Subscription failed — try again' });
    } finally {
      setLoading(false);
    }
  };

  const isReady = email.trim().length > 0 && cities.length > 0;

  return (
    <div className="w-full mt-6 px-4 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Mail size={16} style={{ color: 'var(--accent)' }} />
        <span className="font-display font-semibold text-base" style={{ color: 'var(--text)' }}>Get alerts when it's time to fill up</span>
      </div>

      {/* Email input */}
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={loading}
        style={{
          width: '100%',
          padding: '9px 12px',
          fontSize: 16,
          border: '1px solid var(--border)',
          borderRadius: 0,
          background: 'var(--bg)',
          color: 'var(--text)',
          marginBottom: '12px',
          opacity: loading ? 0.6 : 1,
        }}
      />

      {/* City checkboxes */}
      <div style={{ marginBottom: '12px' }}>
        <div className="text-tiny font-medium uppercase track-wide mb-2" style={{ color: 'var(--text-4)' }}>Which cities?</div>
        <div className="grid grid-cols-4 gap-2">
          {CITIES.map(city => (
            <button
              key={city}
              type="button"
              onClick={() => toggleCity(city)}
              disabled={loading}
              className="text-sm font-medium py-1.5 px-2 transition-colors"
              style={{
                background: cities.includes(city) ? 'var(--accent)' : 'transparent',
                color: cities.includes(city) ? '#ffffff' : 'var(--text-3)',
                border: `1px solid ${cities.includes(city) ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 0,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Fuel type */}
      <div style={{ marginBottom: '12px' }}>
        <div className="text-tiny font-medium uppercase track-wide mb-2" style={{ color: 'var(--text-4)' }}>Fuel type</div>
        <div className="flex gap-2 flex-wrap">
          {FUELS.map(f => (
            <button
              key={f.code}
              type="button"
              onClick={() => setFuelType(f.code)}
              disabled={loading}
              className="text-sm font-medium py-1.5 px-3 transition-colors"
              style={{
                background: fuelType === f.code ? 'var(--accent)' : 'transparent',
                color: fuelType === f.code ? '#ffffff' : 'var(--text-3)',
                border: `1px solid ${fuelType === f.code ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 0,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={submit}
        disabled={!isReady || loading}
        className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm transition-opacity"
        style={{
          background: isReady && !loading ? 'var(--accent)' : 'var(--text-4)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 0,
          cursor: !isReady || loading ? 'default' : 'pointer',
          opacity: !isReady || loading ? 0.5 : 1,
        }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        {loading ? 'Subscribing…' : 'Subscribe to alerts'}
      </button>

      {/* Feedback */}
      {message && (
        <div
          className="mt-3 p-2.5 text-sm flex gap-2 items-start"
          style={{
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: message.type === 'success' ? '#16a34a' : '#dc2626',
          }}
        >
          {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
};
