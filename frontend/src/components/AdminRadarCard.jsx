import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, Clock, ArrowRight, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AdminRadarCard({ token, onNavigateToInbox, onNavigateToProject }) {
  const [radar, setRadar] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRadar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/admin-radar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRadar(data);
      }
    } catch (err) {
      console.error('Kunde inte hämta admin-radar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRadar();
    }
  }, [token]);

  if (loading && !radar) {
    return (
      <div style={{ backgroundColor: '#182230', border: '1px solid #28374a', borderRadius: '10px', padding: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
        <RefreshCw size={16} className="spin" style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '0.85rem' }}>Laddar administrativ morgon-radar...</span>
      </div>
    );
  }

  if (!radar) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(24, 34, 48, 0.95) 0%, rgba(20, 29, 41, 0.95) 100%)',
      border: '1px solid rgba(95, 200, 145, 0.3)',
      borderLeft: '4px solid var(--color-accent)',
      borderRadius: '10px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
      fontFamily: 'var(--font-body)'
    }}>
      {/* HEADER RAD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: 'rgba(95, 200, 145, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'white', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Administrativ Morgon-Radar
              <span style={{ fontSize: '0.68rem', backgroundColor: '#1b3427', color: 'var(--color-accent)', border: '1px solid rgba(95, 200, 145, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                Anthropic Claude 3.5 Sonnet
              </span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {radar.date}
            </span>
          </div>
        </div>

        <button
          onClick={fetchRadar}
          disabled={loading}
          style={{
            backgroundColor: '#1d2a3a',
            border: '1px solid #2d3e52',
            color: 'var(--text-secondary)',
            borderRadius: '6px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Uppdatera
        </button>
      </div>

      {/* AI BRIEFING BUBBLE */}
      <div style={{
        backgroundColor: 'rgba(95, 200, 145, 0.06)',
        border: '1px solid rgba(95, 200, 145, 0.2)',
        borderRadius: '8px',
        padding: '0.9rem 1.1rem',
        marginBottom: '1.25rem',
        fontSize: '0.85rem',
        color: '#e2e8f0',
        lineHeight: 1.5
      }}>
        {radar.aiBriefing}
      </div>

      {/* METRIC STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ backgroundColor: '#16212e', border: '1px solid #253548', borderRadius: '6px', padding: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Portföljens framdrift</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'white', marginTop: '0.2rem' }}>
            {radar.metrics?.overallProgress}%
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-accent)', marginLeft: '0.5rem' }}>
              {radar.metrics?.totalSigned}/{radar.metrics?.totalLandowners} klara
            </span>
          </div>
        </div>

        <div style={{ backgroundColor: '#16212e', border: '1px solid #253548', borderRadius: '6px', padding: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inkomna returer att attestera</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#60a5fa', marginTop: '0.2rem' }}>
            {radar.metrics?.pendingAttestCount} st
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              Väntar i inkorgen
            </span>
          </div>
        </div>

        <div style={{ backgroundColor: '#16212e', border: '1px solid #253548', borderRadius: '6px', padding: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aktiva nätprojekt</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'white', marginTop: '0.2rem' }}>
            {radar.metrics?.activeProjectsCount} st
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              Under bevakning
            </span>
          </div>
        </div>
      </div>

      {/* BRÅDSKANDE ÅTGÄRDER */}
      {radar.urgentItems && radar.urgentItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rekommenderade prioriteringar idag:
          </span>
          {radar.urgentItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#15202c',
                border: '1px solid #253547',
                borderRadius: '6px',
                padding: '0.65rem 0.9rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle size={15} style={{ color: item.priority === 'high' ? 'var(--color-danger)' : 'var(--color-warning)', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '0.8rem', color: 'white', display: 'block' }}>{item.title}</strong>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{item.description}</span>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (item.action.includes('Inkorg') && onNavigateToInbox) {
                    onNavigateToInbox();
                  } else if (onNavigateToProject) {
                    onNavigateToProject();
                  }
                }}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', flexShrink: 0, textTransform: 'none', fontWeight: 600 }}
              >
                {item.action} <ArrowRight size={12} style={{ marginLeft: '0.25rem' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
