import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  X, ArrowRight, Loader2, RefreshCw, FileText, Building2,
  Users, DollarSign, Layers, ShieldCheck, ChevronRight
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function VattenfallImportModal({ 
  isOpen, 
  onClose, 
  token, 
  targetProjectId = null, 
  onSuccess 
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('landowners'); // 'landowners' | 'metadata' | 'permits'
  const [customMetadata, setCustomMetadata] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setParsing(false);
    setImporting(false);
    setError('');
    setPreviewData(null);
    setCustomMetadata(null);
    setImportResult(null);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processSelectedFile(dropped);
    }
  };

  const processSelectedFile = async (selectedFile) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      setError('Ogiltigt filformat. Endast Excel- (.xlsx, .xls) eller CSV-filer stöds.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE_URL}/api/projects/preview-vattenfall-import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kunde inte tolka Vattenfall-filen.');
      }

      setPreviewData(data);
      setCustomMetadata({ ...data.metadata });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Fel vid inläsning av fil.');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleMetadataChange = (key, value) => {
    setCustomMetadata(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExecuteImport = async () => {
    if (!previewData) return;
    setImporting(true);
    setError('');

    try {
      const url = targetProjectId 
        ? `${API_BASE_URL}/api/projects/${targetProjectId}/import-vattenfall`
        : `${API_BASE_URL}/api/projects/import-vattenfall`;

      const payload = {
        metadata: customMetadata || previewData.metadata,
        landowners: previewData.landowners || []
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Importen misslyckades.');
      }

      setImportResult(result);
      if (onSuccess) {
        onSuccess(result.projectId || targetProjectId);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ett fel uppstod under importen.');
    } finally {
      setImporting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'easement':
        return <span className="badge badge-signed" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', borderColor: '#818cf8' }}>Inskrivet (Steg 7)</span>;
      case 'signed':
        return <span className="badge badge-signed">Signerat (Steg 5)</span>;
      case 'received':
        return <span className="badge badge-received">Mottaget/Påmint</span>;
      case 'posted':
        return <span className="badge badge-sent">Utskickat (Steg 3)</span>;
      default:
        return <span className="badge badge-draft">Utkast / Beredning</span>;
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: previewData ? '1060px' : '620px', 
          width: '95vw', 
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#161c24',
          border: '1px solid #2a3441',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.25rem', borderBottom: '1px solid #2a3441' }}>
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '8px', backgroundColor: 'rgba(95, 200, 145, 0.12)', border: '1px solid rgba(95, 200, 145, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {targetProjectId ? 'Uppdatera / Komplettera från Vattenfall-mall' : 'Importera Vattenfall Markägarförteckning'}
                <span style={{ fontSize: '0.65rem', backgroundColor: '#1e3a2b', color: 'var(--color-accent)', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vattenfall Eldistribution
                </span>
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Läs in projektfiler direkt (.xlsx, .xls, .csv). Identifierar automatiskt NIS-nr, beredare, fastigheter, EBR-intrång och avtalsstatus.
              </p>
            </div>
          </div>
          <button 
            onClick={() => { handleReset(); onClose(); }} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* FELMEDDELANDE */}
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
            color: '#f87171', 
            padding: '0.85rem 1rem', 
            borderRadius: '6px', 
            marginTop: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0' }}>

          {/* STEG 1: UPPLADDNING & DROPP-ZON */}
          {!previewData && !importResult && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed var(--color-accent)' : '2px dashed #374151',
                  borderRadius: '10px',
                  backgroundColor: isDragging ? 'rgba(95, 200, 145, 0.05)' : '#1a222d',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx,.xls,.csv" 
                  style={{ display: 'none' }} 
                />

                {parsing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={40} className="spin" style={{ color: 'var(--color-accent)' }} />
                    <p style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>
                      Analyserar Vattenfall-mallen...
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Extraherar metadata, NIS-nummer, fastighetsägare och EBR-intrång
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(95, 200, 145, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                      <UploadCloud size={28} />
                    </div>
                    <p style={{ color: 'white', fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>
                      Dra och släpp Vattenfall-filen här, eller <span style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>bläddra</span>
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0 }}>
                      Stöder <strong>.xlsx</strong>, <strong>.xls</strong> samt semikolon-/kommaseparerade <strong>.csv</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: '#222d3a', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #303d4e' }}>
                        ✓ Rad 1–10: Projekt & NIS
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: '#222d3a', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #303d4e' }}>
                        ✓ Kol 1–15: EBR-intrång & kabel
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: '#222d3a', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #303d4e' }}>
                        ✓ Kol 16–31: Fastighet & ägare
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: '#222d3a', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #303d4e' }}>
                        ✓ Kol 32–61: MUA & tillstånd
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mallinformation & tips */}
              <div style={{ marginTop: '1.5rem', backgroundColor: '#18212c', border: '1px solid #2a3544', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'white', fontFamily: 'var(--font-title)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-accent)' }} /> 
                  Smidig parallellkörning under testperioden
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Ni kan fortsätta arbeta i Vattenfalls ordinarie Excel-mall och importera den hit med ett klick. Systemet beräknar automatiskt EBR-ersättning per fastighetsägare och kartlägger status. När som helst kan ni exportera ut samma Excel-mall för återrapportering till Vattenfall!
                </p>
              </div>
            </div>
          )}

          {/* STEG 2: FÖRHANDSGRANSKNING & VALIDERING */}
          {previewData && !importResult && (
            <div>
              {/* STATS STRIP */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#1a232f', padding: '0.85rem', borderRadius: '6px', border: '1px solid #2b3848' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fastigheter</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={18} style={{ color: '#60a5fa' }} />
                    {previewData.summary?.unique_properties || 0} st
                  </div>
                </div>

                <div style={{ backgroundColor: '#1a232f', padding: '0.85rem', borderRadius: '6px', border: '1px solid #2b3848' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Markägare / Andelar</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={18} style={{ color: 'var(--color-accent)' }} />
                    {previewData.summary?.total_rows || 0} st
                  </div>
                </div>

                <div style={{ backgroundColor: '#1a232f', padding: '0.85rem', borderRadius: '6px', border: '1px solid #2b3848' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beräknat EBR-intrång</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <DollarSign size={18} style={{ color: '#fbbf24' }} />
                    {(previewData.summary?.total_compensation || 0).toLocaleString('sv-SE')} kr
                  </div>
                </div>

                <div style={{ backgroundColor: '#1a232f', padding: '0.85rem', borderRadius: '6px', border: '1px solid #2b3848' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statusfördelning</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                    {Object.entries(previewData.summary?.status_counts || {}).map(([st, cnt]) => (
                      <span key={st} style={{ backgroundColor: '#253243', padding: '0.15rem 0.4rem', borderRadius: '3px', color: 'white' }}>
                        {st}: <strong>{cnt}</strong>
                      </span>
                    ))}
                    {Object.keys(previewData.summary?.status_counts || {}).length === 0 && (
                      <span>Inga rader</span>
                    )}
                  </div>
                </div>
              </div>

              {/* VARNINGAR */}
              {previewData.warnings && previewData.warnings.length > 0 && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    <AlertTriangle size={15} />
                    <span>Noteringar från filgranskningen ({previewData.warnings.length})</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {previewData.warnings.slice(0, 3).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                    {previewData.warnings.length > 3 && (
                      <li>...och ytterligare {previewData.warnings.length - 3} noteringar</li>
                    )}
                  </ul>
                </div>
              )}

              {/* FLIKAR */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #2b3848', marginBottom: '1rem' }}>
                <button
                  onClick={() => setActiveTab('landowners')}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'landowners' ? '2px solid var(--color-accent)' : '2px solid transparent',
                    color: activeTab === 'landowners' ? 'white' : 'var(--text-muted)',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: '600'
                  }}
                >
                  Markägare & Fastigheter ({previewData.landowners?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('metadata')}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'metadata' ? '2px solid var(--color-accent)' : '2px solid transparent',
                    color: activeTab === 'metadata' ? 'white' : 'var(--text-muted)',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: '600'
                  }}
                >
                  Projektmetadata (NIS & Beredare)
                </button>
              </div>

              {/* FLIK 1: MARKÄGARE TABELL */}
              {activeTab === 'landowners' && (
                <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #2b3848', borderRadius: '6px' }}>
                  {previewData.landowners?.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Mallen är tom på markägarrader (endast projekthuvud identifierades).</p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Projektet kan fortfarande skapas med tillhörande Vattenfall-metadata för att fyllas på senare.
                      </p>
                    </div>
                  ) : (
                    <table className="table" style={{ margin: 0, fontSize: '0.78rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1d2735', zIndex: 2 }}>
                        <tr>
                          <th>Rad</th>
                          <th>Fastighet</th>
                          <th>Ägare & Andel</th>
                          <th>Personnummer</th>
                          <th>Adress</th>
                          <th>Intrång</th>
                          <th>Ersättning</th>
                          <th>Status</th>
                          <th>Tillstånd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.landowners.map((lo, idx) => (
                          <tr key={idx}>
                            <td style={{ color: 'var(--text-muted)' }}>{lo.row_index}</td>
                            <td style={{ fontWeight: '600', color: 'white' }}>{lo.property_designation || '–'}</td>
                            <td>
                              <div>{lo.name}</div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Andel: {lo.share}</span>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>
                              {lo.personal_number || <span style={{ color: 'var(--color-danger)' }}>Saknas</span>}
                            </td>
                            <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lo.address}>
                              {lo.address || '–'}
                            </td>
                            <td>
                              {lo.intrusion?.cable_hsp_m > 0 && <span>{lo.intrusion.cable_hsp_m}m 24kV </span>}
                              {lo.intrusion?.cable_lsp_m > 0 && <span>{lo.intrusion.cable_lsp_m}m 0.4kV </span>}
                              {lo.intrusion?.substations_count > 0 && <span>{lo.intrusion.substations_count} st Nä </span>}
                              {lo.intrusion?.cabinets_count > 0 && <span>{lo.intrusion.cabinets_count} st KS </span>}
                              {!lo.intrusion?.cable_hsp_m && !lo.intrusion?.cable_lsp_m && !lo.intrusion?.substations_count && !lo.intrusion?.cabinets_count && <span style={{ color: 'var(--text-muted)' }}>–</span>}
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--color-accent)' }}>
                              {(lo.compensation_sum || 0).toLocaleString('sv-SE')} kr
                            </td>
                            <td>{getStatusBadge(lo.status)}</td>
                            <td>
                              {lo.permits?.length > 0 ? (
                                <span style={{ fontSize: '0.7rem', backgroundColor: '#253549', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#93c5fd' }}>
                                  {lo.permits.map(p => p.title.split(' ')[0]).join(', ')}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>–</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* FLIK 2: PROJEKTMETADATA FORM */}
              {activeTab === 'metadata' && (
                <div style={{ backgroundColor: '#1a232f', padding: '1.25rem', borderRadius: '6px', border: '1px solid #2b3848' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Dessa fält identifierades ur mallens huvudblock (rad 1–10). Du kan justera dem innan importen slutförs:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Projektnamn *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.name || ''} 
                        onChange={(e) => handleMetadataChange('name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>NIS-nummer</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.nis_number || ''} 
                        onChange={(e) => handleMetadataChange('nis_number', e.target.value)}
                        placeholder="T.ex. NIS498122"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Nätägare</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.network_owner || ''} 
                        onChange={(e) => handleMetadataChange('network_owner', e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Ledningslittera</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.line_littera || ''} 
                        onChange={(e) => handleMetadataChange('line_littera', e.target.value)}
                        placeholder="T.ex. VL 12-4"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Nätstation-er (nr)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.substation_numbers || ''} 
                        onChange={(e) => handleMetadataChange('substation_numbers', e.target.value)}
                        placeholder="T.ex. S 401, S 402"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Kommun</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.municipality || ''} 
                        onChange={(e) => handleMetadataChange('municipality', e.target.value)}
                        placeholder="T.ex. Höganäs"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Projektledare Vattenfall</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.client_pm || ''} 
                        onChange={(e) => handleMetadataChange('client_pm', e.target.value)}
                        placeholder="För- och efternamn"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Beredare Nektab/Avtalshantering</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                        value={customMetadata?.lead_preparer || ''} 
                        onChange={(e) => handleMetadataChange('lead_preparer', e.target.value)}
                        placeholder="För- och efternamn"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEG 3: KLART / KVITTENS */}
          {importResult && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(95, 200, 145, 0.15)', border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', color: 'var(--color-accent)' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'white', fontFamily: 'var(--font-title)', margin: '0 0 0.5rem 0' }}>
                Importen slutförd framgångsrikt!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                Projektet och samtliga markägare har lästs in och sparats. Alla EBR-kalkyler, MUA-statusar och eventuella sidoavtal har länkats.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const id = importResult.projectId || targetProjectId;
                    handleReset();
                    onClose();
                    if (id && onSuccess) onSuccess(id);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  Öppna Projekt <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid #2a3441', marginTop: '0.5rem' }}>
          <div>
            {previewData && !importResult && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleReset}
                disabled={importing}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} /> Byt fil
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => { handleReset(); onClose(); }}
              disabled={importing}
            >
              Stäng
            </button>

            {previewData && !importResult && (
              <button 
                className="btn btn-primary"
                onClick={handleExecuteImport}
                disabled={importing || !(customMetadata?.name || previewData.metadata?.name)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="spin" /> Importerar...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> 
                    {targetProjectId ? 'Slutför komplettering' : 'Skapa Projekt & Importera'}
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
