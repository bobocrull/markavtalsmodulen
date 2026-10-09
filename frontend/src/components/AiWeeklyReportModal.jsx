import React, { useState } from 'react';
import { FileText, Copy, Check, Download, X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AiWeeklyReportModal({
  isOpen,
  onClose,
  token,
  project
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !project) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/anthropic/weekly-report/${project.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte generera rapport.');
      setReport(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Fel vid generering av rapport.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    const text = `ÄMNE: ${report.subject}\n\nSAMMANFATTNING:\n${report.summary}\n\nHÖJDPUNKTER:\n${report.highlights?.map(h => '• ' + h).join('\n')}\n\nFLASKHALSAR & PÅGÅENDE UTREDNINGAR:\n${report.bottlenecks?.map(b => '• ' + b).join('\n')}\n\nNÄSTA STEG:\n${report.next_steps?.map(s => '• ' + s).join('\n')}\n\nBERÄKNAD SLUTLEVERANS: ${report.estimated_completion}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          maxWidth: '750px',
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
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 700 }}>
                  Ett-klicks Veckorapport till Nätägare
                </h2>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#1b3427', color: 'var(--color-accent)', border: '1px solid rgba(95, 200, 145, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                  Claude 3.5
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Formulerad för Vattenfall / Ellevios projektledare (NIS: {project.nis_number || 'N/A'})
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
          {!report ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'rgba(95, 200, 145, 0.1)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <Sparkles size={28} />
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'white', margin: '0 0 0.5rem 0' }}>
                Generera professionell lägesrapport
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                Claude sammanställer automatiskt projektets signeringsgrad, nyligen inkomna avtal, eventuella dödsboutredningar och prognos till kunden.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 600 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" /> Sammanställer rapport...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generera Veckorapport nu
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#182330', border: '1px solid #28374a', borderRadius: '8px', padding: '1.25rem' }}>
              {/* SUBJECT */}
              <div style={{ borderBottom: '1px solid #28374a', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Föreslaget ämne</span>
                <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', color: 'white' }}>{report.subject}</h4>
              </div>

              {/* SUMMARY */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)' }}>SAMMANFATTNING</span>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                  {report.summary}
                </p>
              </div>

              {/* HIGHLIGHTS */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa' }}>HÖJDPUNKTER UNDER PERIODEN</span>
                <ul style={{ margin: '0.35rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {report.highlights?.map((h, idx) => <li key={idx}>{h}</li>)}
                </ul>
              </div>

              {/* BOTTLENECKS */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fbbf24' }}>PÅGÅENDE UTREDNINGAR & FLASKHALSAR</span>
                <ul style={{ margin: '0.35rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {report.bottlenecks?.map((b, idx) => <li key={idx}>{b}</li>)}
                </ul>
              </div>

              {/* NEXT STEPS */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>PLANERADE ÅTGÄRDER KOMMANDE VECKA</span>
                <ul style={{ margin: '0.35rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {report.next_steps?.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              </div>

              {/* COMPLETION */}
              <div style={{ backgroundColor: '#131b26', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Beräknad slutleverans: <strong style={{ color: 'white' }}>{report.estimated_completion}</strong>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid #263546' }}>
          <div>
            {report && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleGenerate}
                disabled={loading}
                style={{ textTransform: 'none', fontWeight: 600 }}
              >
                Regenerera
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ textTransform: 'none', fontWeight: 600 }}
            >
              Stäng
            </button>
            {report && (
              <button
                className="btn btn-primary"
                onClick={handleCopy}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 600 }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Kopierad till urklipp!' : 'Kopiera rapport'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
