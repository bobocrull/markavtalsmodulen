import React, { useState, useEffect } from 'react';
import { FolderPlus, FileText, Compass, Inbox, ShieldAlert, Check, RefreshCw, Layers, ArrowRight } from 'lucide-react';

function Dashboard({ 
  token, 
  navigateToProject,
  setCurrentView,
  showOnlyProjects = false,
  matchedReturns = [],
  setMatchedReturns,
  gdprPurges = [],
  setGdprPurges,
  handleMatchInbox,
  handleGdprPurgeByName
}) {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total_projects: 0, active_projects: 0, overdue: 0, approaching: 0, on_time: 0 });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stepper states
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('E.ON Energidistribution');
  const [projectType, setProjectType] = useState('el');
  const [dataSource, setDataSource] = useState('excel');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionLogs, setExtractionLogs] = useState([]);
  const [seedData, setSeedData] = useState(true);

  // Karta defaults
  const [lat, setLat] = useState('56.2625');
  const [lng, setLng] = useState('12.5642');
  const [zoom, setZoom] = useState('12');

  const renderStatusSummary = (project) => {
    const parts = [];
    const done = (project.signed_count || 0) + (project.paid_count || 0) + (project.easement_count || 0) + (project.delivered_count || 0) + (project.archived_count || 0);
    const sent = (project.posted_count || 0) + (project.received_count || 0);
    const queued = project.queued_count || 0;
    const draft = project.draft_count || 0;

    if (done > 0) {
      parts.push(
        <span key="done" style={{ color: 'var(--color-success)', fontWeight: '600' }}>
          {done} klar{done > 1 ? 'a' : ''}
        </span>
      );
    }
    if (sent > 0) {
      parts.push(
        <span key="sent" style={{ color: '#3b82f6', fontWeight: '600' }}>
          {sent} postad{sent > 1 ? 'e' : ''}
        </span>
      );
    }
    if (queued > 0) {
      parts.push(
        <span key="queued" style={{ color: '#f59e0b', fontWeight: '500' }}>
          {queued} i kö
        </span>
      );
    }
    if (draft > 0) {
      parts.push(
        <span key="draft" style={{ color: 'var(--text-secondary)' }}>
          {draft} utkast
        </span>
      );
    }

    if (parts.length === 0) return <span style={{ color: 'var(--text-muted)' }}>Inga avtal</span>;

    const items = [];
    parts.forEach((part, index) => {
      items.push(part);
      if (index < parts.length - 1) {
        items.push(<span key={`bullet-${index}`} style={{ margin: '0 0.3rem', color: 'var(--text-muted)' }}>•</span>);
      }
    });

    return <div style={{ fontSize: '0.68rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{items}</div>;
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Simulerar AI-extraktion vid steg 3 i wizarden
  useEffect(() => {
    if (step === 3 && showModal) {
      setExtractionProgress(0);
      setExtractionLogs([]);
      
      const logs = [
        "Analyserar uppladdade GIS/Excel-data...",
        "Identifierar fastighetsbeteckningar mot Fastighetsregistret...",
        "Matchar delägare och lagfarna ägare...",
        "Klar! Identifierade 3 fastigheter och 4 lagfarna ägare."
      ];

      const interval = setInterval(() => {
        setExtractionProgress((prev) => {
          const next = prev + 10;
          if (next >= 100) {
            clearInterval(interval);
            setExtractionLogs(logs);
            return 100;
          }
          if (next === 20) setExtractionLogs([logs[0]]);
          if (next === 50) setExtractionLogs([logs[0], logs[1]]);
          if (next === 80) setExtractionLogs([logs[0], logs[1], logs[2]]);
          return next;
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [step, showModal]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else {
        setError('Kunde inte hämta projektlista.');
      }

      // Hämta dashboard-statistik
      const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
      setError('Nätverksfel vid hämtning av projekt.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `${customer} - ${name}`,
          project_type: projectType,
          center_latitude: parseFloat(lat),
          center_longitude: parseFloat(lng),
          zoom_level: parseInt(zoom),
          seed: seedData
        })
      });

      if (res.ok) {
        const newProj = await res.json();
        setShowModal(false);
        // Reset wizard states
        setStep(1);
        setName('');
        setCustomer('E.ON Energidistribution');
        setProjectType('el');
        setDataSource('excel');
        
        await fetchProjects();
        // Navigera direkt till det nya projektet!
        navigateToProject(newProj.id);
      } else {
        const data = await res.json();
        setError(data.error || 'Kunde inte skapa projektet.');
      }
    } catch (err) {
      console.error(err);
      setError('Kunde inte spara projektet på servern.');
    }
  };

  const getProjectTypeLabel = (type) => {
    const labels = {
      el: 'Elnät / Kraftledning',
      fiber: 'Fiberutbyggnad',
      road: 'Vägprojekt',
      wind: 'Vindkraftspark',
      water: 'VA-projekt',
      other: 'Övrigt'
    };
    return labels[type] || type;
  };

  const renderWizardModal = () => {
    if (!showModal) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(6, 9, 15, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(6px)'
      }}>
        <div className="card" style={{ width: '100%', maxWidth: '600px', margin: '1rem', border: '1px solid var(--color-accent)', boxShadow: '0 0 20px rgba(95, 200, 145, 0.2)', padding: '2rem' }}>
          
          {/* Stegindikator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Guide: Nytt Markprojekt</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span 
                  key={i} 
                  style={{
                    width: '24px', height: '24px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 'bold',
                    fontFamily: 'var(--font-title)',
                    backgroundColor: step >= i ? 'var(--color-accent)' : 'var(--bg-primary)',
                    color: step >= i ? '#0a0e17' : 'var(--text-secondary)',
                    border: step >= i ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    transition: 'all 0.3s'
                  }}
                >
                  {i}
                </span>
              ))}
            </div>
          </div>

          {/* STEG 1: Kund & Projektnamn */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--color-accent)', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Steg 1: Kund & Projektnamn</h3>
              
              <div className="form-group">
                <label className="form-label">Beställare / Nätägare</label>
                <select 
                  className="form-select"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                >
                  <option value="E.ON Energidistribution">E.ON Energidistribution</option>
                  <option value="Vattenfall Eldistribution">Vattenfall Eldistribution</option>
                  <option value="Ellevio">Ellevio</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Projektnamn / Etapp</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="T.ex. Lokalnät etapp 3 - Höganäs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Infrastrukturtyp</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '4px', border: projectType === 'el' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)' }}>
                    <input type="radio" name="projType" checked={projectType === 'el'} onChange={() => setProjectType('el')} />
                    <span style={{ fontSize: '0.85rem' }}>Elnät / Ledning</span>
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '4px', border: projectType === 'fiber' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)' }}>
                    <input type="radio" name="projType" checked={projectType === 'fiber'} onChange={() => setProjectType('fiber')} />
                    <span style={{ fontSize: '0.85rem' }}>Fiberutbyggnad</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Avbryt</button>
                <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!name}>Nästa</button>
              </div>
            </div>
          )}

          {/* STEG 2: Datakälla */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--color-accent)', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Steg 2: Geografiskt underlag & Datakälla</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Hur vill du mata in kartgränser och fastighetsdata i plattformen?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div 
                  onClick={() => setDataSource('excel')}
                  style={{ 
                    padding: '1rem', borderRadius: '6px', cursor: 'pointer', 
                    backgroundColor: 'var(--bg-primary)', 
                    border: dataSource === 'excel' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'white', display: 'block' }}>Ladda upp Shape/Excel-fil (Beredningslista)</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ladda upp en tabell med koordinater och beteckningar</span>
                  </div>
                  {dataSource === 'excel' && <Check size={18} style={{ color: 'var(--color-accent)' }} />}
                </div>

                <div 
                  onClick={() => setDataSource('map')}
                  style={{ 
                    padding: '1rem', borderRadius: '6px', cursor: 'pointer', 
                    backgroundColor: 'var(--bg-primary)', 
                    border: dataSource === 'map' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'white', display: 'block' }}>Rita på interaktiv GIS-karta</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Peka ut ledningssträckan direkt i gränssnittet</span>
                  </div>
                  {dataSource === 'map' && <Check size={18} style={{ color: 'var(--color-accent)' }} />}
                </div>

                <div 
                  onClick={() => setDataSource('api')}
                  style={{ 
                    padding: '1rem', borderRadius: '6px', cursor: 'pointer', 
                    backgroundColor: 'var(--bg-primary)', 
                    border: dataSource === 'api' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    opacity: 0.6
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'white', display: 'block' }}>Direkt integration med nätägarens system (API)</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automatiskt import från dpPower / Trimble LIS</span>
                  </div>
                  {dataSource === 'api' && <Check size={18} style={{ color: 'var(--color-accent)' }} />}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>Bakåt</button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>Nästa</button>
              </div>
            </div>
          )}

          {/* STEG 3: AI-extraktion */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--color-accent)', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Steg 3: Simulerad AI-kartavläsning</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Systemet läser av kartskisser och korsrefererar med fastighetsgränser för att identifiera berörda fastigheter.
              </p>

              <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontFamily: 'var(--font-title)', fontSize: '0.75rem' }}>
                  <span>Extraktionsstatus: {extractionProgress}%</span>
                  <span>{extractionProgress === 100 ? 'Slutförd' : 'Arbetar...'}</span>
                </div>
                
                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{ width: `${extractionProgress}%`, height: '100%', backgroundColor: 'var(--color-accent)', transition: 'width 0.2s' }}></div>
                </div>

                {/* Konsolloggar */}
                <div style={{ backgroundColor: '#06090f', padding: '1rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem', height: '120px', overflowY: 'auto', border: '1px solid var(--color-border)' }}>
                  {extractionLogs.map((log, idx) => (
                    <div key={idx} style={{ color: idx === 3 ? 'var(--color-accent)' : '#a1a1aa', marginBottom: '0.25rem' }}>
                      &gt; {log}
                    </div>
                  ))}
                  {extractionProgress < 100 && (
                    <div style={{ color: 'var(--color-warning)', animation: 'pulse 1s infinite' }}>
                      &gt; Läser filer... <RefreshCw size={10} style={{ display: 'inline', marginLeft: '0.25rem', animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>Bakåt</button>
                <button className="btn btn-primary" onClick={() => setStep(4)} disabled={extractionProgress < 100}>Nästa</button>
              </div>
            </div>
          )}

          {/* STEG 4: Infotrader API */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--color-accent)', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Steg 4: Ägaruppslag (Infotrader API)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Systemet har matchat fastighetsgränserna mot lagfartsregistret via Infotrader. Följande fastigheter och ägare hämtas in:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'white', display: 'block' }}>Höganäs 4:21</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ägare: Anna Karlsson (1/2), Erik Karlsson (1/2)</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', borderRadius: '50%', padding: '0.25rem' }}>
                    <Check size={16} />
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'white', display: 'block' }}>Mölle 2:55</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ägare: Bo Lindqvist (1/1)</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', borderRadius: '50%', padding: '0.25rem' }}>
                    <Check size={16} />
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'white', display: 'block' }}>Viken 1:15</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ägare: Cecilia Andersson (1/1)</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', borderRadius: '50%', padding: '0.25rem' }}>
                    <Check size={16} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => setStep(3)}>Bakåt</button>
                <button className="btn btn-primary" onClick={() => setStep(5)}>Nästa</button>
              </div>
            </div>
          )}

          {/* STEG 5: Bekräfta */}
          {step === 5 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--color-accent)', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Steg 5: Bekräfta & Skapa</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Klart för import! Verifiera uppgifterna innan projektet upprättas.
              </p>

              <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Nätägare:</span>
                  <strong style={{ color: 'white' }}>{customer}</strong>
                  
                  <span style={{ color: 'var(--text-secondary)' }}>Projektnamn:</span>
                  <strong style={{ color: 'white' }}>{name}</strong>
                  
                  <span style={{ color: 'var(--text-secondary)' }}>Datakälla:</span>
                  <strong style={{ color: 'white' }}>{dataSource === 'excel' ? 'Shapefil/Excel' : dataSource === 'map' ? 'GIS-ritning' : 'dpPower API'}</strong>

                  <span style={{ color: 'var(--text-secondary)' }}>Fastigheter:</span>
                  <strong style={{ color: 'white' }}>3 st (Höganäs 4:21, Mölle 2:55, Viken 1:15)</strong>
                  
                  <span style={{ color: 'var(--text-secondary)' }}>Ägare matchade:</span>
                  <strong style={{ color: 'white' }}>4 st (Anna K, Erik K, Bo L, Cecilia A)</strong>
                </div>
              </div>

              <div className="form-group" style={{ backgroundColor: 'rgba(95, 200, 145, 0.05)', border: '1px solid rgba(95, 200, 145, 0.2)', padding: '1rem', borderRadius: '4px' }}>
                <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={seedData} 
                    onChange={(e) => setSeedData(e.target.checked)} 
                    style={{ transform: 'scale(1.1)', accentColor: 'var(--color-accent)' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'white', display: 'block' }}>Fyll projektet med matchade test-markägare</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Detta lägger in de 4 fastighetsägarna, värderingar och standard-bilagor.</span>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => setStep(4)}>Bakåt</button>
                <button className="btn btn-primary" onClick={handleCreateProject}>Skapa projekt & påbörja beredning</button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    );
  };

  // RENDER DEDICATED PROJECTS TABLE VIEW
  if (showOnlyProjects) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Projekt</h1>
            <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>
              Hantera dina aktiva och planerade lednings- och markprojekt
            </p>
          </div>
          
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FolderPlus size={18} /> + Skapa Nytt Projekt
          </button>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
            color: 'var(--color-danger)', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontFamily: 'var(--font-title)',
            fontSize: '0.8rem'
          }}>
            {error}
          </div>
        )}

        <div className="table-container">
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Alla Projekt</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visar {projects.length} projekt</span>
          </div>
          
          {loading ? (
            <p style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Laddar projekttabell...</p>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Det finns inga aktiva markprojekt.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                Skapa ett projekt nu
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th>Typ & Kund</th>
                  <th>Markägare</th>
                  <th>Skapat</th>
                  <th style={{ textAlign: 'right' }}>Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td style={{ fontWeight: '600', color: 'white' }}>{project.name}</td>
                    <td>
                      <span className="badge badge-sent" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', fontFamily: 'var(--font-title)' }}>
                        {getProjectTypeLabel(project.project_type)}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <span>{project.signed_landowners || 0} av {project.total_landowners || 0} klar</span>
                          <span>{project.total_landowners > 0 ? Math.round((project.signed_landowners / project.total_landowners) * 100) : 0}%</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                          <div style={{ 
                            width: `${project.total_landowners > 0 ? (project.signed_landowners / project.total_landowners) * 100 : 0}%`, 
                            height: '100%', 
                            backgroundColor: 'var(--color-success)', 
                            boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
                            transition: 'width 0.3s' 
                          }}></div>
                        </div>
                        {renderStatusSummary(project)}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(project.created_at).toLocaleDateString('sv-SE')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ textTransform: 'none', padding: '0.3rem 0.70rem' }}
                        onClick={() => navigateToProject(project.id)}
                      >
                        Öppna <ArrowRight size={12} style={{ marginLeft: '0.25rem' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {renderWizardModal()}
      </div>
    );
  }

  // RENDER COMPLETE OVERVIEW DASHBOARD VIEW
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Översikt</h1>
          <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>
            Översikt över aktiva markägar-projekt. Allt som rör fastighet, markägare, avtal, utbetalning och GDPR samlat.
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FolderPlus size={18} /> + Skapa Nytt Projekt
        </button>
      </div>

      {error && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.15)', 
          color: 'var(--color-danger)', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          fontFamily: 'var(--font-title)',
          fontSize: '0.8rem'
        }}>
          {error}
        </div>
      )}

      <div className="grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card" onClick={() => setCurrentView('projects')} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem', cursor: 'pointer' }}>
          <div style={{ backgroundColor: 'rgba(95, 200, 145, 0.15)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-accent)' }}>
            <Layers size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', textTransform: 'uppercase' }}>Aktiva projekt</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-title)' }}>
              {stats.active_projects} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-accent)', display: 'block' }}>3 nya senaste 30 dagarna</span>
            </p>
          </div>
        </div>
        
        <div className="card" onClick={() => setCurrentView('projects')} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem', cursor: 'pointer' }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '0.75rem', borderRadius: '8px', color: '#60a5fa' }}>
            <Compass size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', textTransform: 'uppercase' }}>Markägare i process</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-title)' }}>
              {projects.reduce((acc, curr) => acc + (curr.total_landowners || 0), 0) || 12} st <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#60a5fa', display: 'block' }}>Pågående beredningar</span>
            </p>
          </div>
        </div>

        <div className="card" onClick={() => setCurrentView('inbox')} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem', cursor: 'pointer', borderLeft: '3px solid var(--color-danger)' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-danger)' }}>
            <Inbox size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', textTransform: 'uppercase' }}>Väntar matchning</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-title)' }}>
              {matchedReturns.length} st <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-danger)', display: 'block' }}>Scannade returer i inbox</span>
            </p>
          </div>
        </div>

        <div className="card" onClick={() => setCurrentView('gdpr')} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem', cursor: 'pointer', borderLeft: '3px solid var(--color-warning)' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-warning)' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', textTransform: 'uppercase' }}>GDPR inom 60 dagar</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-title)' }}>
              {gdprPurges.length} st <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-warning)', display: 'block' }}>Personuppgifter att radera</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tvåspaltig Dashboard Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '2rem' }}>
        
        {/* VÄNSTER KOLUMN: Pågående arbeten (Projektlista som tabell) */}
        <div>
          <div className="table-container">
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Pågående arbeten (Projekt)</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visar {projects.length} projekt</span>
            </div>
            
            {loading ? (
              <p style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Laddar projekttabell...</p>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Det finns inga aktiva markprojekt.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                  Skapa ett projekt nu
                </button>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Projekt</th>
                    <th>Typ & Kund</th>
                    <th>Markägare</th>
                    <th>Skapat</th>
                    <th style={{ textAlign: 'right' }}>Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td style={{ fontWeight: '600', color: 'white' }}>{project.name}</td>
                      <td>
                        <span className="badge badge-sent" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', fontFamily: 'var(--font-title)' }}>
                          {getProjectTypeLabel(project.project_type)}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            <span>{project.signed_landowners || 0} av {project.total_landowners || 0} klar</span>
                            <span>{project.total_landowners > 0 ? Math.round((project.signed_landowners / project.total_landowners) * 100) : 0}%</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                            <div style={{ 
                              width: `${project.total_landowners > 0 ? (project.signed_landowners / project.total_landowners) * 100 : 0}%`, 
                              height: '100%', 
                              backgroundColor: 'var(--color-success)', 
                              boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
                              transition: 'width 0.3s' 
                            }}></div>
                          </div>
                          {renderStatusSummary(project)}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(project.created_at).toLocaleDateString('sv-SE')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ textTransform: 'none', padding: '0.3rem 0.70rem' }}
                          onClick={() => navigateToProject(project.id)}
                        >
                          Öppna <ArrowRight size={12} style={{ marginLeft: '0.25rem' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* HÖGER KOLUMN: GDPR-gallring & Inbox returer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* GDPR Panel */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <ShieldAlert size={18} style={{ color: 'var(--color-warning)' }} />
              <h3 style={{ fontSize: '0.9rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>GDPR Datagallring</h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Följande personuppgifter har passerat lagringsgränsen (6 månader efter slutfört avtal) och bör permanent tas bort ur registret.
            </p>
            
            {gdprPurges.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: '600' }}>✓ Inga utestående GDPR-rensningar</span>
              </div>
            ) : (
              gdprPurges.map((purge, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.85rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>{purge.name}</span>
                    <span className="badge badge-draft" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>FÖRDOMD</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Fastighet: {purge.property} <br/>
                    Gallringsdatum: <span style={{ color: 'var(--color-danger)' }}>{purge.date}</span>
                  </div>
                  <button 
                    className="btn btn-danger btn-sm" 
                    style={{ width: '100%', padding: '0.35rem', fontSize: '0.7rem' }}
                    onClick={() => handleGdprPurgeByName(purge.name)}
                  >
                    Rensa personuppgifter
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Inbox Panel */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <Inbox size={18} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '0.9rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Inbox (Skannade returer)</h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Inskannade underskrivna fysiska pappersoriginal har matchats automatiskt. Klicka på matcha för att registrera i databasen.
            </p>

            {matchedReturns.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Inbox är tom</span>
              </div>
            ) : (
              matchedReturns.map((item, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.85rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>{item.name}</span>
                    <span className="badge badge-sent" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', color: 'var(--color-accent)' }}>Match: {item.rate}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Dokument: <span style={{ color: 'white' }}>Avtalsretur ({item.property})</span>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ width: '100%', padding: '0.35rem', fontSize: '0.7rem' }}
                    onClick={() => handleMatchInbox(item.name)}
                  >
                    Matcha & spara avtal
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {renderWizardModal()}
    </div>
  );
}

export default Dashboard;
