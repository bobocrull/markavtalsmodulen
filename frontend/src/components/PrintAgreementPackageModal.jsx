import React, { useState } from 'react';
import { FileText, Printer, CheckCircle, ShieldCheck, Download, X, Eye, HelpCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function PrintAgreementPackageModal({
  isOpen,
  onClose,
  token,
  landowner,
  project
}) {
  const [includePreprinted, setIncludePreprinted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !landowner) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = `${API_BASE_URL}/api/landowners/${landowner.id}/agreement-package?include_preprinted=${includePreprinted}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Kunde inte ladda ner avtalspaketet.');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = (landowner.name || 'Markagare').replace(/\s+/g, '_');
      a.download = `Avtalspaket_${safeName}_${includePreprinted ? 'fortryckt' : 'standard'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert('Kunde inte generera avtalspaketet: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const propertyText = landowner.properties?.map(p => p.designation).join(', ') || landowner.properties_list || 'Fastighet';

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
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
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
              <Printer size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 700 }}>
                Skriv ut Avtalspaket för Postutskick
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Mottagare: <strong>{landowner.name}</strong> ({propertyText})
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

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0' }}>
          
          {/* FÖRKLARING AV PAKETET */}
          <div style={{ backgroundColor: '#1a2432', border: '1px solid #28374a', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-accent)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} /> 
              Juridiskt rent original + Separat spegelblad (Ersätter fysiska Post-its)
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Paketet genererar ett <strong>separat instruktionsblad med visuell spegelbild</strong> överst i kuvertet som visar markägaren exakt var namnteckningen ska sitta och varnar för felrutor. <strong>Själva originalavtalet förblir 100% orört</strong> och juridiskt giltigt för Lantmäteriets Inskrivningsmyndighet!
            </p>
          </div>

          {/* VISUELL SKISS AV VAD SOM SKRIVS UT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Blad 1 */}
            <div style={{ border: '1px solid #2b3a4c', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(95, 200, 145, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>SIDA 1: FÖLJEBREV</span>
                <span style={{ fontSize: '0.65rem', backgroundColor: '#1f3328', color: 'var(--color-accent)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Huvudspår</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                Instruktions- & Spegelblad
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <li>Visuell miniatyr av underskriftssidan</li>
                <li>Tydliga pilar till delägarnas rader</li>
                <li>Stoppmärke: "Fylls ej i av fastighetsägare"</li>
                <li>Bankkontoinstruktion för ersättning</li>
              </ul>
            </div>

            {/* Blad 2+ */}
            <div style={{ border: '1px solid #2b3a4c', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a232f' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#60a5fa' }}>SIDA 2–3: ORIGINAL</span>
                <span style={{ fontSize: '0.65rem', backgroundColor: '#1c2838', color: '#60a5fa', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Lantmäteriet</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                Markupplåtelseavtal (MUA)
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <li>Officiell EBR-avtalstext för elnät</li>
                <li>Helt fri från färgade pilar & grafik</li>
                <li>Två likalydande exemplar</li>
                <li>100% godkänd för servitutsinskrivning</li>
              </ul>
            </div>
          </div>

          {/* VALBART TILLVAL: FÖRTRYCKTA DELÄGARRADER PÅ ORIGINALET */}
          <div style={{ border: '1px solid #2e3d50', borderRadius: '8px', padding: '1rem', backgroundColor: '#19222e' }}>
            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includePreprinted}
                onChange={(e) => setIncludePreprinted(e.target.checked)}
                style={{ marginTop: '0.2rem', accentColor: 'var(--color-accent)', transform: 'scale(1.2)' }}
              />
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'white', display: 'block' }}>
                  Förtryck delägares namn och personnummer under signaturlinjerna (Valbart tillval)
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem', lineHeight: 1.4 }}>
                  När detta är ikryssat trycker systemet maskinskrivet <em>"Namnteckning: Anna Karlsson | Personnr: 1968... | Andel: 1/2"</em> under linjen på originalet. Om avmarkerad lämnas tomma standardlinjer.
                </span>
              </div>
            </label>
          </div>

        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid #263546' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            PDF sammanställs direkt i A4-format
          </span>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={downloading}
              style={{ textTransform: 'none', fontWeight: 600 }}
            >
              Avbryt
            </button>
            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={downloading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 600 }}
            >
              {downloading ? 'Genererar PDF...' : (
                <>
                  <Download size={16} /> Ladda ner komplett paket (.pdf)
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
