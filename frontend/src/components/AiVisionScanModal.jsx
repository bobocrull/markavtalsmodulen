import React, { useState, useRef } from 'react';
import { 
  Camera, UploadCloud, CheckCircle2, AlertTriangle, X, 
  ArrowRight, Loader2, Sparkles, ShieldCheck, DollarSign, 
  UserCheck, AlertOctagon, HelpCircle 
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AiVisionScanModal({
  isOpen,
  onClose,
  token,
  selectedLandownerId = null,
  allLandowners = [],
  onSuccess
}) {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [landownerId, setLandownerId] = useState(selectedLandownerId || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [saveAutomatically, setSaveAutomatically] = useState(true);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setFilePreview(null);
    setAnalyzing(false);
    setAnalysisResult(null);
    setError('');
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
      if (selected.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (re) => setFilePreview(re.target.result);
        reader.readAsDataURL(selected);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Vänligen välj en skannad avtalsfil.');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (landownerId) formData.append('landowner_id', landownerId);
      formData.append('save_updates', saveAutomatically);

      const res = await fetch(`${API_BASE_URL}/api/admin/anthropic/scan-agreement`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte granska avtalet.');

      setAnalysisResult(data);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Fel vid analys med Claude Vision.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleReset();
          onClose();
        }
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
          maxWidth: '780px',
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
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 700 }}>
                  Claude Vision: Avtals- & Signaturgranskare
                </h2>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#1b3427', color: 'var(--color-accent)', border: '1px solid rgba(95, 200, 145, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                  Multimodal AI
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Kontrollerar automatiskt att alla delägare har signerat, flaggar felrutor och läser ut bankkonto.
              </p>
            </div>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0' }}>
          
          {!analysisResult ? (
            <div>
              {/* VÄLJ MARKÄGARE */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Koppla till markägare / fastighet (Valfritt):
                </label>
                <select
                  value={landownerId}
                  onChange={(e) => setLandownerId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', backgroundColor: '#192330', border: '1px solid #28374a', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}
                >
                  <option value="">Välj markägare i projektet (eller auto-identifiera)</option>
                  {allLandowners.map(lo => (
                    <option key={lo.id} value={lo.id}>
                      {lo.name} – {lo.properties_list || lo.property_designation || 'Fastighet'}
                    </option>
                  ))}
                </select>
              </div>

              {/* DROPZONE */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #2d3e52',
                  borderRadius: '10px',
                  backgroundColor: '#192330',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                />

                {file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(95, 200, 145, 0.15)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={24} />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{file.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {(file.size / 1024).toFixed(0)} KB – Klicka för att byta fil
                    </span>
                    {filePreview && (
                      <img
                        src={filePreview}
                        alt="Förhandsgranskning"
                        style={{ maxHeight: '140px', maxWidth: '240px', borderRadius: '6px', marginTop: '0.5rem', border: '1px solid #2d3e52' }}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: 'rgba(95, 200, 145, 0.1)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UploadCloud size={24} />
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                      Dra in den skannade avtalssidan här, eller <span style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>bläddra</span>
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Stöder PDF samt inscannade bilder / foton (.jpg, .png)
                    </span>
                  </div>
                )}
              </div>

              {/* INSTÄLLNING: AUTOMATISK UPPDATERING */}
              <div style={{ marginTop: '1.25rem', backgroundColor: '#19222e', border: '1px solid #253547', borderRadius: '6px', padding: '0.85rem' }}>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={saveAutomatically}
                    onChange={(e) => setSaveAutomatically(e.target.checked)}
                    style={{ accentColor: 'var(--color-accent)', transform: 'scale(1.1)' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', display: 'block' }}>
                      Uppdatera markägarens status och spara utläst bankkonto automatiskt vid godkännande
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Om avtalet är godkänt markeras ärendet som signerat och bankkontot läggs in för utbetalning i Kleer.
                    </span>
                  </div>
                </label>
              </div>

            </div>
          ) : (
            /* ANALYSRESULTAT */
            <div>
              {/* STATUS BANNER */}
              <div style={{
                backgroundColor: analysisResult.status === 'approved' ? 'rgba(95, 200, 145, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${analysisResult.status === 'approved' ? 'rgba(95, 200, 145, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                {analysisResult.status === 'approved' ? (
                  <CheckCircle2 size={28} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                ) : (
                  <AlertOctagon size={28} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>
                    {analysisResult.status === 'approved' ? 'Avtalet är fullständigt och godkänt!' : 'Avvikelse upptäckt – Kräver åtgärd!'}
                  </h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {analysisResult.summary}
                  </p>
                </div>
              </div>

              {/* GRANSKNINGSPUNKTER */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {/* 1. Underskriftskontroll */}
                <div style={{ backgroundColor: '#182330', border: '1px solid #28374a', borderRadius: '6px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Samtliga delägare</span>
                    {analysisResult.all_signatures_present ? (
                      <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Signerat</span>
                    ) : (
                      <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 'bold' }}>✗ Saknas</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {analysisResult.signatures_detected?.map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{s.owner_name}</span>
                        <span style={{ color: s.signature_found ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                          {s.signature_found ? 'Hittad' : 'Ej hittad'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Felruta (Nätägarruta) */}
                <div style={{ backgroundColor: '#182330', border: '1px solid #28374a', borderRadius: '6px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Rätt signaturfält</span>
                    {!analysisResult.signed_in_network_owner_box ? (
                      <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Korrekt ruta</span>
                    ) : (
                      <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 'bold' }}>⚠️ Signerat i fel ruta!</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {analysisResult.signed_in_network_owner_box 
                      ? 'Markägaren har signerat i fältet avsett för Ledningsägaren!'
                      : 'Signaturerna sitter i fastighetsägarens fält som avsett.'}
                  </p>
                </div>

                {/* 3. Bankkonto */}
                <div style={{ backgroundColor: '#182330', border: '1px solid #28374a', borderRadius: '6px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Bankkonto utläst</span>
                    {analysisResult.bank_account_found ? (
                      <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Funnet</span>
                    ) : (
                      <span style={{ color: 'var(--color-warning)', fontSize: '0.75rem', fontWeight: 'bold' }}>Ej angivet</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'white', fontWeight: 'bold' }}>
                    {analysisResult.bank_account_found ? `${analysisResult.clearing_number || ''} ${analysisResult.account_number || ''}` : 'Inget konto ifyllt på sidan'}
                  </p>
                </div>
              </div>

              {/* REKOMMENDATION */}
              <div style={{ backgroundColor: '#1a232e', border: '1px solid #253547', borderRadius: '6px', padding: '0.9rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', display: 'block', marginBottom: '0.25rem' }}>
                  Administrativ rekommendation:
                </span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {analysisResult.recommendation}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid #263546' }}>
          <div>
            {analysisResult && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleReset}
                style={{ textTransform: 'none', fontWeight: 600 }}
              >
                Granska annat avtal
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { handleReset(); onClose(); }}
              disabled={analyzing}
              style={{ textTransform: 'none', fontWeight: 600 }}
            >
              Stäng
            </button>

            {!analysisResult && (
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={!file || analyzing}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 600 }}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={16} className="spin" /> Claude granskar avtalet...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Granska med Claude Vision
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
