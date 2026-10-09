import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle2, X, RefreshCw, Loader2, Sparkles, Building2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AiPreFlightAuditModal({
  isOpen,
  onClose,
  token,
  project
}) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !project) return null;

  const handleRunAudit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/anthropic/audit-project/${project.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte genomföra revisionskontrollen.');
      setAudit(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Fel vid revision.');
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
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
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 700 }}>
                  Pre-Flight Slutgranskning (Lantmäteriet & Nätägaren)
                </h2>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#1b3427', color: 'var(--color-accent)', border: '1px solid rgba(95, 200, 145, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                  Kvalitetsrevision
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Säkerställer 100% felfria handlingar inför inskrivningsakt och nätägararkivering.
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

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0' }}>
          {!audit ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'rgba(95, 200, 145, 0.1)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'white', margin: '0 0 0.5rem 0' }}>
                Kör juridisk revision inför slutleverans
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: '460px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                Systemet granskar samtliga markägarposter, fullmakter för dödsbon, bankkonton för utbetalning samt eventuella tillståndskrav så att Lantmäteriet inte skickar kompletteringsföreläggande.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleRunAudit}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 600 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" /> Genomför revision...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Starta Revisionskontroll nu
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              {/* STATUS SUMMARY */}
              <div style={{
                backgroundColor: audit.isReadyForDelivery ? 'rgba(95, 200, 145, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${audit.isReadyForDelivery ? 'rgba(95, 200, 145, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                borderRadius: '8px',
                padding: '1.1rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                {audit.isReadyForDelivery ? (
                  <CheckCircle2 size={32} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                ) : (
                  <AlertOctagon size={32} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                    {audit.isReadyForDelivery ? 'Klar för slutleverans till Lantmäteriet!' : 'Åtgärder krävs innan leverans'}
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                    {audit.aiExecutiveReview}
                  </p>
                </div>
              </div>

              {/* STATS STRIP */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#182330', border: '1px solid #28374a', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', textTransform: 'uppercase', fontWeight: 600 }}>Kritiska fel</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>{audit.summary?.criticalIssuesCount}</div>
                </div>
                <div style={{ backgroundColor: '#182330', border: '1px solid #28374a', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>Varningar</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>{audit.summary?.warningsCount}</div>
                </div>
                <div style={{ backgroundColor: '#182330', border: '1px solid #28374a', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 600 }}>Granskade & Klara</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>{audit.summary?.passedCount}</div>
                </div>
              </div>

              {/* KRITISKA FEL */}
              {audit.criticalIssues?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--color-danger)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertOctagon size={16} /> Kritiska fel ({audit.criticalIssues.length}) – Måste åtgärdas:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {audit.criticalIssues.map((it, idx) => (
                      <div key={idx} style={{ backgroundColor: '#1e1c26', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                          <span>{it.property} ({it.landowner})</span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#fca5a5' }}>
                          {it.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VARNINGAR */}
              {audit.warnings?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#fbbf24', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={16} /> Varningar & Kompletteringar ({audit.warnings.length}):
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {audit.warnings.map((it, idx) => (
                      <div key={idx} style={{ backgroundColor: '#212224', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                          {it.property} ({it.landowner})
                        </div>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#fde68a' }}>
                          {it.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid #263546' }}>
          <div>
            {audit && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRunAudit}
                disabled={loading}
                style={{ textTransform: 'none', fontWeight: 600 }}
              >
                Kör revision igen
              </button>
            )}
          </div>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ textTransform: 'none', fontWeight: 600 }}
          >
            Stäng
          </button>
        </div>

      </div>
    </div>
  );
}
