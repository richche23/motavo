import { useState, useMemo } from 'react';
import { Mail, Check, AlertCircle, Loader2, X, Search } from 'lucide-react';
import { SUBURBS } from '@/lib/suburbs';

const FUELS = [
  { code: 'U91', label: '91' },
  { code: 'P95', label: '95' },
  { code: 'P98', label: '98' },
  { code: 'E10', label: 'E10' },
  { code: 'DSL', label: 'Diesel' },
];

export const AlertSignup = () => {
  const [email, setEmail] = useState('');
  const [selectedSuburbs, setSelectedSuburbs] = useState([]);
  const [fuelType, setFuelType] = useState('U91');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    const lower = searchInput.toLowerCase();
    return SUBURBS.filter(s =>
      s.name.toLowerCase().includes(lower) || s.postcode.includes(searchInput)
    ).slice(0, 8);
  }, [searchInput]);

  const addSuburb = (suburb) => {
    if (!selectedSuburbs.find(s => s.slug === suburb.slug)) {
      setSelectedSuburbs([...selectedSuburbs, suburb]);
    }
    setSearchInput('');
    setShowSuggestions(false);
  };

  const removeSuburb = (slug) => {
    setSelectedSuburbs(selectedSuburbs.filter(s => s.slug !== slug));
  };

  const submit = async () => {
    if (!email.trim() || selectedSuburbs.length === 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          suburbs: selectedSuburbs.map(s => s.slug),
          fuelType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Subscription failed');
      const suburbNames = selectedSuburbs.map(s => s.name).join(', ');
      setMessage({ type: 'success', text: `Subscribed! You'll get alerts when ${suburbNames} prices are good.` });
      setEmail('');
      setSelectedSuburbs([]);
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Subscription failed — try again' });
    } finally {
      setLoading(false);
    }
  };

  const isReady = email.trim().length > 0 && selectedSuburbs.length > 0;

  return (
    <div className="w-full mt-6 px-4 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0 }}>
      <div className="flex items-center gap-2 mb-4">
        <Mail size={16} style={{ color: 'var(--accent)' }} />
        <span className="font-display font-semibold text-base" style={{ color: 'var(--text)' }}>Get alerts when it's time to fill up</span>
      </div>

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

      <div style={{ marginBottom: '12px', position: 'relative' }}>
        <div className="text-tiny font-medium uppercase track-wide mb-2" style={{ color: 'var(--text-4)' }}>Which suburbs?</div>
        <div style={{ position: 'relative' }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 0 }}>
            <Search size={14} style={{ color: 'var(--text-4)' }} />
            <input
              type="text"
              placeholder="Search by name or postcode..."
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              disabled={loading}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              zIndex: 10,
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {suggestions.map(s => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => addSuburb(s)}
                  className="w-full text-left px-3 py-2"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13px' }}
                >
                  <span className="font-medium">{s.name}</span>
                  <span style={{ color: 'var(--text-4)', marginLeft: '8px' }}>{s.postcode} • {s.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSuburbs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedSuburbs.map(s => (
              <div
                key={s.slug}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium"
                style={{ background: 'var(--accent)', color: '#ffffff', borderRadius: 0 }}
              >
                <span>{s.name}</span>
                <button
                  type="button"
                  onClick={() => removeSuburb(s.slug)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
                background: fuelType === f.code ? 'var(--text)' : 'transparent',
                color: fuelType === f.code ? 'var(--bg)' : 'var(--text-3)',
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

      <button
        type="button"
        onClick={submit}
        disabled={!isReady || loading}
        className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm transition-opacity"
        style={{
          background: isReady && !loading ? 'var(--accent)' : 'var(--surface-2)',
          color: isReady && !loading ? '#ffffff' : 'var(--text-4)',
          border: isReady && !loading ? 'none' : '1px dashed var(--border)',
          borderRadius: 0,
          cursor: !isReady || loading ? 'default' : 'pointer',
        }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        {loading ? 'Subscribing…' : 'Subscribe to alerts'}
      </button>

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
