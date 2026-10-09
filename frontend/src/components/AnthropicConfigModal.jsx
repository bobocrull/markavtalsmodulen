import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, AlertTriangle, X, ShieldCheck, Cpu, Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AnthropicConfigModal({ isOpen, onClose, token, onKeySaved }) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && token) {
      checkStatus();
    }
  }, [isOpen, token]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/anthropic/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Ange en giltig Anthropic API-nyckel.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/anthropic/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ api_key: apiKey.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte spara API-nyckeln.');

      setMessage('Anthropic API-nyckeln har sparats och aktiverats!');
      setApiKey('');
      checkStatus();
      if (onKeySaved) onKeySaved();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Fel vid sparande av nyckel.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(6, 11, 19, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#16202c',
          border: '1px solid #2a3c50',
          borderRadius: '12px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85)',
          padding: '1.75rem',
          fontFamily: 'var(--font-body)',
          color: 'white'
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #263546' }}>
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', backgroundColor: 'rgba(95, 200, 145, 0.12)', border: '1px solid rgba(95, 200, 145, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
              <Key size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 700 }}>
                Anthropic API & AI-motor
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Koppla din Claude 3.5 Sonnet utvecklarnyckel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* STATUS BADGE */}
        <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: '#192330', border: '1px solid #28374a', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status för Anthropic Claude</span>
            {status?.configured ? (
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(95, 200, 145, 0.15)', color: 'var(--color-accent)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                ● Aktiv & Ansluten
              </span>
            ) : (
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                ● Körs i simulatorsläge
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            {status?.configured 
              ? 'Claude 3.5 Sonnet är ansluten och hanterar avtalsgranskning med bildigenkänning, veckorapporter och portfolio-radar.' 
              : 'Ingen API-nyckel konfigurerad ännu. Systemet använder en realistisk svensk beredningssimulator tills du klistrar in din nyckel.'}
          </p>
        </div>

        {/* MEDDELANDEN */}
        {message && (
          <div style={{ backgroundColor: 'rgba(95, 200, 145, 0.15)', color: 'var(--color-accent)', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '1rem', border: '1px solid rgba(95, 200, 145, 0.3)', fontSize: '0.8rem' }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        {/* FORMULÄR */}
        <form onSubmit={handleSave} style={{ marginTop: '1.25rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Klistra in Anthropic API-nyckel (sk-ant-api03-...):
            </label>
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#131b26',
                border: '1px solid #293a4d',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.82rem',
                fontFamily: 'monospace'
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
              Nyckeln sparas säkert i backend och används för din $100/mån utvecklarbudget.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ textTransform: 'none', fontWeight: 600 }}
            >
              Stäng
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !apiKey.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 600 }}
            >
              {saving ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {saving ? 'Sparar...' : 'Spara och aktivera'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
