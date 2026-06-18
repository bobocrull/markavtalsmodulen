import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import LandownerDetails from './pages/LandownerDetails';
import Templates from './pages/Templates';
import { LogOut, LayoutDashboard, Layers, Inbox, ShieldAlert, FileText } from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  
  // Enkel state-baserad router
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'projects', 'project', 'landowner', 'templates', 'inbox', 'gdpr'
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeLandownerId, setActiveLandownerId] = useState(null);

  // Globala tillstånd för inbox returer och GDPR purges
  const [matchedReturns, setMatchedReturns] = useState([
    { name: 'Anna Karlsson', property: 'Höganäs 4:21', rate: '98%' },
    { name: 'Bo Lindqvist', property: 'Mölle 2:55', rate: '99%' },
    { name: 'Cecilia Andersson', property: 'Viken 1:15', rate: '95%' }
  ]);

  const [gdprPurges, setGdprPurges] = useState([
    { name: 'Sven Johansson', property: 'Viken 1:12', date: '2026-06-10' }
  ]);

  // Inkorg uppladdnings- & OCR-tillstånd
  const [allLandowners, setAllLandowners] = useState([]);
  const [inboxUploading, setInboxUploading] = useState(false);
  const [inboxScanning, setInboxScanning] = useState(false);
  const [inboxSelectedFile, setInboxSelectedFile] = useState(null);
  const [inboxOcrResult, setInboxOcrResult] = useState(null);
  const [inboxScanProgress, setInboxScanProgress] = useState(0);
  const [inboxScanLogs, setInboxScanLogs] = useState([]);
  const [inboxSelectedLandownerId, setInboxSelectedLandownerId] = useState('');

  // Ladda användarprofil om token finns
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Kunde inte verifiera profil:', err);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setUser(null);
    setCurrentView('dashboard');
  };

  // Navigeringshjälpare
  const navigateToDashboard = () => {
    setCurrentView('dashboard');
    setActiveProjectId(null);
    setActiveLandownerId(null);
  };

  const navigateToProject = (projectId) => {
    setActiveProjectId(projectId);
    setCurrentView('project');
    setActiveLandownerId(null);
  };

  const navigateToLandowner = (landownerId) => {
    setActiveLandownerId(landownerId);
    setCurrentView('landowner');
  };

  // Hämta alla markägare för inkorgen
  useEffect(() => {
    if (currentView === 'inbox' && token) {
      fetchAllLandowners();
    }
  }, [currentView, token]);

  const fetchAllLandowners = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const projectsData = await res.json();
      
      let loadedOwners = [];
      for (const p of projectsData) {
        const ownersRes = await fetch(`http://localhost:5000/api/projects/${p.id}/landowners`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ownersRes.ok) {
          const owners = await ownersRes.json();
          owners.forEach(o => {
            o.projectName = p.name;
            o.projectId = p.id;
          });
          loadedOwners = loadedOwners.concat(owners);
        }
      }
      setAllLandowners(loadedOwners);
    } catch (err) {
      console.error("Kunde inte hämta markägare för inkorg:", err);
    }
  };

  // Hantera filval och starta ocr-simulering
  const handleInboxFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setInboxSelectedFile(file);
    setInboxScanning(true);
    setInboxScanProgress(0);
    setInboxScanLogs([`[${new Date().toLocaleTimeString()}] Läser in fil: ${file.name}...`]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setInboxScanProgress(progress);

      if (progress === 25) {
        setInboxScanLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Avkodar bild och identifierar textområden...`]);
      } else if (progress === 50) {
        setInboxScanLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Söker efter signaturer och fastighetsstreckkoder...`]);
      } else if (progress === 75) {
        setInboxScanLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Matchar namn mot Lantmäteriets register...`]);
      } else if (progress === 100) {
        clearInterval(interval);
        setInboxScanning(false);
        setInboxScanLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] OCR-analys klar!`]);

        // Försök matcha filnamn mot kända markägare
        const cleanName = file.name.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
        const matched = allLandowners.find(o => 
          cleanName.includes(o.name.toLowerCase()) || 
          o.name.toLowerCase().includes(cleanName.replace(/\.[^/.]+$/, ""))
        );

        if (matched) {
          setInboxOcrResult({
            landownerId: matched.id,
            name: matched.name,
            property: matched.properties_list || 'Okänd fastighet',
            rate: '99% (Filnamnsmatchning)'
          });
          setInboxSelectedLandownerId(matched.id);
        } else {
          const firstEligible = allLandowners.find(o => !['signed', 'paid', 'easement', 'archived'].includes(o.status));
          setInboxOcrResult({
            landownerId: firstEligible ? firstEligible.id : '',
            name: firstEligible ? firstEligible.name : '',
            property: firstEligible ? (firstEligible.properties_list || 'Okänd fastighet') : '',
            rate: 'Manuell validering krävs'
          });
          setInboxSelectedLandownerId(firstEligible ? firstEligible.id : '');
        }
      }
    }, 300);
  };

  // Ladda upp filen till markägarens dokument och lägg till i matchedReturns
  const handleInboxUploadAndMatch = async () => {
    if (!inboxSelectedFile || !inboxSelectedLandownerId) return;

    const selectedOwner = allLandowners.find(o => o.id === parseInt(inboxSelectedLandownerId));
    if (!selectedOwner) return;

    setInboxUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', inboxSelectedFile);
      formData.append('name', `Avtalsretur - ${selectedOwner.name}`);
      formData.append('doc_type', 'agreement');
      formData.append('requires_shipping', '0');

      const res = await fetch(`http://localhost:5000/api/landowners/${selectedOwner.id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const newReturn = {
          name: selectedOwner.name,
          property: selectedOwner.properties_list || 'Okänd fastighet',
          rate: inboxOcrResult.rate.includes('99%') ? '99%' : '95%',
          landownerId: selectedOwner.id
        };

        setMatchedReturns(prev => [newReturn, ...prev]);

        // Återställ
        setInboxSelectedFile(null);
        setInboxOcrResult(null);
        setInboxUploading(false);
        alert(`Dokumentet har laddats upp till ${selectedOwner.name}s profil och lagts till i Inboxen för slutgiltig matchning!`);
      } else {
        const errorData = await res.json();
        alert(`Kunde inte ladda upp filen: ${errorData.error || 'Okänt fel'}`);
        setInboxUploading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Ett fel uppstod vid uppladdning.');
      setInboxUploading(false);
    }
  };

  // Globala handlers för Inbox och GDPR (synkade mot DB)
  const handleMatchInbox = async (name) => {
    try {
      const projRes = await fetch('http://localhost:5000/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!projRes.ok) return;
      const projs = await projRes.json();
      
      let foundOwner = null;
      for (const p of projs) {
        const ownersRes = await fetch(`http://localhost:5000/api/projects/${p.id}/landowners`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ownersRes.ok) {
          const owners = await ownersRes.json();
          const match = owners.find(o => o.name.toLowerCase() === name.toLowerCase());
          if (match) {
            foundOwner = match;
            break;
          }
        }
      }

      if (foundOwner) {
        const updateRes = await fetch(`http://localhost:5000/api/landowners/${foundOwner.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: foundOwner.name,
            personal_number: foundOwner.personal_number,
            address: foundOwner.address,
            email: foundOwner.email,
            phone: foundOwner.phone,
            bank_account: foundOwner.bank_account,
            status: 'signed' // Fysiskt signerat
          })
        });

        if (updateRes.ok) {
          alert(`Matchning lyckades! Fysiskt originalavtal för ${foundOwner.name} har mottagits och markerats som SIGNERAT.`);
          setMatchedReturns(prev => prev.filter(r => r.name !== name));
          // Om vi är på projektvyn eller markägarprofilen vill vi eventuellt ladda om den datan också
        } else {
          alert('Kunde inte uppdatera status.');
        }
      } else {
        alert(`Kunde inte hitta markägaren "${name}" i databasen.`);
      }
    } catch (err) {
      console.error(err);
      alert('Ett fel uppstod vid matchning.');
    }
  };

  const handleGdprPurgeByName = async (name) => {
    try {
      const projRes = await fetch('http://localhost:5000/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!projRes.ok) return;
      const projs = await projRes.json();
      
      let foundOwner = null;
      for (const p of projs) {
        const ownersRes = await fetch(`http://localhost:5000/api/projects/${p.id}/landowners`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ownersRes.ok) {
          const owners = await ownersRes.json();
          const match = owners.find(o => o.name.toLowerCase() === name.toLowerCase());
          if (match) {
            foundOwner = match;
            break;
          }
        }
      }

      if (foundOwner) {
        const res = await fetch(`http://localhost:5000/api/landowners/${foundOwner.id}/gdpr-purge`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          alert(`GDPR-gallring slutförd! Personuppgifter för ${foundOwner.name} har permanent raderats.`);
          setGdprPurges(prev => prev.filter(p => p.name !== name));
        }
      } else {
        setGdprPurges(prev => prev.filter(p => p.name !== name));
        alert('Personuppgifter rensade från gallringslistan.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!token || !user) {
    return <Login setToken={setToken} />;
  }

  return (
    <div className="app-container">
      {/* Vänsterställd Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ cursor: 'pointer' }} onClick={navigateToDashboard}>
          <img src="/src/assets/nektab_logo_white.png" alt="NEKTAB" style={{ width: '100%', maxWidth: '130px', marginBottom: '0.25rem' }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-title)', display: 'block' }}>Markupplåtelse</span>
        </div>

        <div className="sidebar-menu">
          <button 
            className={`sidebar-link ${currentView === 'dashboard' ? 'active' : ''}`} 
            onClick={navigateToDashboard}
          >
            <LayoutDashboard size={18} />
            <span>Översikt</span>
          </button>
          
          <button 
            className={`sidebar-link ${currentView === 'projects' || currentView === 'project' ? 'active' : ''}`}
            onClick={() => {
              if (activeProjectId) {
                setCurrentView('project');
                setActiveLandownerId(null);
              } else {
                setCurrentView('projects');
              }
            }}
          >
            <Layers size={18} />
            <span>Projekt</span>
          </button>
          
          <button 
            className={`sidebar-link ${currentView === 'inbox' ? 'active' : ''}`} 
            onClick={() => {
              setCurrentView('inbox');
              setActiveProjectId(null);
              setActiveLandownerId(null);
            }}
            style={{ position: 'relative' }}
          >
            <Inbox size={18} />
            <span>Inbox</span>
            {matchedReturns.length > 0 && (
              <span className="sidebar-badge" style={{ backgroundColor: 'var(--color-danger)' }}>
                {matchedReturns.length}
              </span>
            )}
          </button>
          
          <button 
            className={`sidebar-link ${currentView === 'gdpr' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('gdpr');
              setActiveProjectId(null);
              setActiveLandownerId(null);
            }}
            style={{ position: 'relative' }}
          >
            <ShieldAlert size={18} />
            <span>GDPR</span>
            {gdprPurges.length > 0 && (
              <span className="sidebar-badge" style={{ backgroundColor: 'var(--color-warning)', color: '#0a0e17' }}>
                {gdprPurges.length}
              </span>
            )}
          </button>
          
          <button 
            className={`sidebar-link ${currentView === 'templates' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('templates');
              setActiveProjectId(null);
              setActiveLandownerId(null);
            }}
          >
            <FileText size={18} />
            <span>Mallar</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="username">{user.username}</span>
              <span className="role">{user.role}</span>
            </div>
            <button className="btn btn-danger btn-icon-only btn-sm" title="Logga ut" onClick={handleLogout} style={{ clipPath: 'none' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Huvudinnehåll till höger */}
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            token={token} 
            navigateToProject={navigateToProject} 
            setCurrentView={setCurrentView}
            matchedReturns={matchedReturns}
            setMatchedReturns={setMatchedReturns}
            gdprPurges={gdprPurges}
            setGdprPurges={setGdprPurges}
            handleMatchInbox={handleMatchInbox}
            handleGdprPurgeByName={handleGdprPurgeByName}
          />
        )}
        {currentView === 'projects' && (
          <Dashboard 
            token={token} 
            navigateToProject={navigateToProject} 
            setCurrentView={setCurrentView}
            showOnlyProjects={true}
            matchedReturns={matchedReturns}
            setMatchedReturns={setMatchedReturns}
            gdprPurges={gdprPurges}
            setGdprPurges={setGdprPurges}
            handleMatchInbox={handleMatchInbox}
            handleGdprPurgeByName={handleGdprPurgeByName}
          />
        )}
        {currentView === 'inbox' && (
          <div>
            <h1 className="page-title">Inbox (Returer)</h1>
            <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>
              Skanna, ladda upp och matcha fysiskt påskrivna originalavtal mot markägare i databasen.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
              {/* VÄNSTER SPALT: Ladda upp & OCR-skanna */}
              <div className="card">
                <h3 className="card-title" style={{ fontSize: '1rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>
                  OCR-skanner (Digital avtalsinläsning)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  Dra och släpp ett inskannat PDF-avtal eller en bild på namnteckningen här för att starta den automatiserade OCR-avläsningen.
                </p>

                {/* Dropzone area */}
                {!inboxSelectedFile && !inboxScanning && (
                  <div style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: '8px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      onChange={handleInboxFileChange}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <Inbox size={32} style={{ color: 'var(--color-accent)', marginBottom: '0.75rem' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
                      Klicka för att bläddra eller släpp filen här
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Stödjer PDF, PNG och JPEG
                    </p>
                  </div>
                )}

                {/* Scanning / Loading animation */}
                {inboxScanning && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold', fontFamily: 'var(--font-title)' }}>
                        OCR-SKANNING PÅGÅR...
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold', fontFamily: 'var(--font-title)' }}>
                        {inboxScanProgress}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                      <div style={{ width: `${inboxScanProgress}%`, height: '100%', backgroundColor: 'var(--color-accent)', transition: 'width 0.2s ease-in-out' }}></div>
                    </div>
                    {/* Terminal Logs */}
                    <div style={{ 
                      backgroundColor: '#0a0f1d', 
                      padding: '0.75rem', 
                      borderRadius: '4px', 
                      fontFamily: 'var(--font-title)', 
                      fontSize: '0.68rem', 
                      color: '#4af626', 
                      height: '100px', 
                      overflowY: 'auto',
                      border: '1px solid #1a2744'
                    }}>
                      {inboxScanLogs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: '0.25rem' }}>{log}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* OCR Scan Result */}
                {inboxSelectedFile && !inboxScanning && inboxOcrResult && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)', textTransform: 'uppercase' }}>
                      OCR Detekterat Resultat
                    </h4>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Matchad Markägare</label>
                      <select 
                        className="form-select"
                        style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                        value={inboxSelectedLandownerId}
                        onChange={(e) => {
                          const oId = e.target.value;
                          setInboxSelectedLandownerId(oId);
                          const owner = allLandowners.find(o => o.id === parseInt(oId));
                          setInboxOcrResult(prev => ({
                            ...prev,
                            landownerId: oId,
                            name: owner ? owner.name : '',
                            property: owner ? (owner.properties_list || 'Okänd fastighet') : '',
                            rate: 'Manuell matchning'
                          }));
                        }}
                      >
                        <option value="">-- Välj markägare manuellt --</option>
                        {allLandowners
                          .filter(o => !['signed', 'paid', 'easement', 'archived'].includes(o.status))
                          .map(o => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.properties_list || 'Ingen fastighet'}) - [{o.projectName}]
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-title)', display: 'block' }}>
                          Fastighet
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: 'white' }}>
                          {inboxOcrResult.property}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-title)', display: 'block' }}>
                          Konfidens / Status
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>
                          {inboxOcrResult.rate}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{ flex: 1, padding: '0.5rem' }}
                        onClick={handleInboxUploadAndMatch}
                        disabled={inboxUploading || !inboxSelectedLandownerId}
                      >
                        {inboxUploading ? 'Laddar upp...' : 'Ladda upp & matcha'}
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '0.5rem' }}
                        onClick={() => {
                          setInboxSelectedFile(null);
                          setInboxOcrResult(null);
                        }}
                        disabled={inboxUploading}
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* HÖGER SPALT: Inbox matchningskö */}
              <div>
                <div className="card">
                  <h3 className="card-title" style={{ fontSize: '1rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>
                    Väntande Matchningar ({matchedReturns.length})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                    Följande skannade avtal väntar på din granskning. Klicka på matcha för att bekräfta och slutgiltigt uppdatera i databasen.
                  </p>

                  {matchedReturns.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        ✓ Inkorgen är tom – alla avtal registrerade
                      </span>
                    </div>
                  ) : (
                    matchedReturns.map((item, idx) => (
                      <div key={idx} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>{item.name}</span>
                          <span className="badge badge-sent" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', color: 'var(--color-accent)' }}>Match: {item.rate}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                          Dokument: <span style={{ color: 'white' }}>Avtalsretur ({item.property})</span>
                        </div>
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}
                          onClick={() => handleMatchInbox(item.name)}
                        >
                          Godkänn matchning & spara avtal
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {currentView === 'gdpr' && (
          <div>
            <h1 className="page-title">GDPR Datagallring</h1>
            <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>
              Systemgallring av personuppgifter för avslutade ärenden.
            </p>
            <div className="card" style={{ maxWidth: '600px', marginTop: '2rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                Följande personuppgifter har legat i registret längre än den tillåtna retentionstiden efter avslutat avtal. Gallringen tar permanent bort personnummer, bankkonton och filer.
              </p>
              {gdprPurges.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓ Inga utestående GDPR-rensningar</span>
                </div>
              ) : (
                gdprPurges.map((purge, idx) => (
                  <div key={idx} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white' }}>{purge.name}</span>
                      <span className="badge badge-draft" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>FÖRDOMD</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Fastighet: {purge.property} <br/>
                      Gallringsdatum: <span style={{ color: 'var(--color-danger)' }}>{purge.date}</span>
                    </div>
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ width: '100%', padding: '0.5rem' }}
                      onClick={() => handleGdprPurgeByName(purge.name)}
                    >
                      Utför GDPR-gallring nu
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {currentView === 'project' && (
          <ProjectDetails 
            token={token} 
            projectId={activeProjectId} 
            navigateToLandowner={navigateToLandowner}
            navigateToDashboard={navigateToDashboard}
          />
        )}
        {currentView === 'landowner' && (
          <LandownerDetails 
            token={token} 
            landownerId={activeLandownerId} 
            navigateToProject={() => navigateToProject(activeProjectId)}
          />
        )}
        {currentView === 'templates' && (
          <Templates />
        )}
      </main>
    </div>
  );
}

export default App;
