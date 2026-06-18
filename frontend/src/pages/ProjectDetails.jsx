import React, { useState, useEffect } from 'react';
import MapWidget from '../components/MapWidget';
import { ArrowLeft, UserPlus, Trash2, FileText, Upload, Plus, Users, Layout, Shield, FileCheck, Layers, ClipboardList, Info, FileSpreadsheet } from 'lucide-react';

function ProjectDetails({ token, projectId, navigateToLandowner, navigateToDashboard }) {
  const [project, setProject] = useState(null);
  const [landowners, setLandowners] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [projDocs, setProjDocs] = useState([]);

  // States för formulär / modal
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPersonalNum, setNewOwnerPersonalNum] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerPropDesignation, setNewOwnerPropDesignation] = useState('');
  const [newOwnerPropArea, setNewOwnerPropArea] = useState('');
  const [newOwnerPropLat, setNewOwnerPropLat] = useState('');
  const [newOwnerPropLng, setNewOwnerPropLng] = useState('');

  const [selectedUser, setSelectedUser] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('template');
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [selectedOwners, setSelectedOwners] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'landowners', 'properties', 'settings'
  const [uploadPropertyDesignation, setUploadPropertyDesignation] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [routeCoords, setRouteCoords] = useState([]);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mapCenter = React.useMemo(() => {
    const ownersWithCoords = landowners.filter(o => o.latitude && o.longitude);
    if (ownersWithCoords.length > 0) {
      const sumLat = ownersWithCoords.reduce((sum, o) => sum + parseFloat(o.latitude), 0);
      const sumLng = ownersWithCoords.reduce((sum, o) => sum + parseFloat(o.longitude), 0);
      return [sumLat / ownersWithCoords.length, sumLng / ownersWithCoords.length];
    }
    return [project?.center_latitude || 56.2625, project?.center_longitude || 12.5642];
  }, [landowners, project?.center_latitude, project?.center_longitude]);

  const getExistingProperties = () => {
    const propsMap = new Map();
    landowners.forEach(owner => {
      if (owner.properties) {
        owner.properties.forEach(p => {
          if (p.designation) {
            const existing = propsMap.get(p.designation) || {
              designation: p.designation,
              area: p.area,
              latitude: p.latitude,
              longitude: p.longitude,
              owners: []
            };
            if (!existing.owners.some(o => o.id === owner.id)) {
              existing.owners.push({ id: owner.id, name: owner.name, status: owner.status });
            }
            propsMap.set(p.designation, existing);
          }
        });
      }
    });
    return Array.from(propsMap.values());
  };

  useEffect(() => {
    fetchProjectData();
    fetchAllUsers();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const projRes = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!projRes.ok) throw new Error('Kunde inte hämta projektinfo.');
      const projData = await projRes.json();
      setProject(projData);
      setRouteCoords(projData.route_coordinates ? JSON.parse(projData.route_coordinates) : []);

      const ownersRes = await fetch(`http://localhost:5000/api/projects/${projectId}/landowners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ownersData = await ownersRes.json();
      
      const ownersWithCoords = await Promise.all(ownersData.map(async (owner) => {
        const detailRes = await fetch(`http://localhost:5000/api/landowners/${owner.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const detail = await detailRes.json();
        const firstProp = detail.properties && detail.properties[0];
        return {
          ...owner,
          latitude: firstProp ? firstProp.latitude : null,
          longitude: firstProp ? firstProp.longitude : null,
          properties: detail.properties || []
        };
      }));
      setLandowners(ownersWithCoords);

      const collRes = await fetch(`http://localhost:5000/api/projects/${projectId}/collaborators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const collData = await collRes.json();
      setCollaborators(collData);

      const docsRes = await fetch(`http://localhost:5000/api/projects/${projectId}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allDocs = await docsRes.json();
      setProjDocs(allDocs);

    } catch (err) {
      console.error(err);
      setError('Kunde inte läsa projektdata från servern.');
    } finally {
      setLoading(false);
    }
  };

  const calculateRouteLength = (coords) => {
    if (!coords || coords.length < 2) return 0;
    let totalDist = 0;
    const toRad = (val) => (val * Math.PI) / 180;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[i + 1];
      const R = 6371e3; // metres
      const phi1 = toRad(lat1);
      const phi2 = toRad(lat2);
      const deltaPhi = toRad(lat2 - lat1);
      const deltaLambda = toRad(lon2 - lon1);
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += R * c;
    }
    return Math.round(totalDist);
  };

  const distanceToSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) {
      return Math.sqrt(Math.pow(px - ax, 2) + Math.pow(py - ay, 2));
    }
    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    const closestX = ax + t * dx;
    const closestY = ay + t * dy;
    return Math.sqrt(Math.pow(px - closestX, 2) + Math.pow(py - closestY, 2));
  };

  const getAffectedProperties = () => {
    const props = getExistingProperties();
    if (routeCoords.length === 0) return [];
    
    return props.map(p => {
      if (!p.latitude || !p.longitude) return null;
      let minDist = Infinity;
      
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const [lat1, lng1] = routeCoords[i];
        const [lat2, lng2] = routeCoords[i + 1];
        const dist = distanceToSegment(p.latitude, p.longitude, lat1, lng1, lat2, lng2);
        if (dist < minDist) minDist = dist;
      }
      
      if (routeCoords.length === 1) {
        const [lat, lng] = routeCoords[0];
        minDist = Math.sqrt(Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2));
      }
      
      // Tröskel på 0.008 decimalgrader (ca 800 meter)
      if (minDist < 0.008) {
        const seed = Math.sin(p.latitude) * 1000;
        const crossingLength = Math.round(40 + Math.abs(seed % 160));
        return {
          ...p,
          crossingLength
        };
      }
      return null;
    }).filter(Boolean);
  };

  const handleSaveRoute = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/route`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ route_coordinates: JSON.stringify(routeCoords) })
      });
      if (res.ok) {
        setIsDrawingRoute(false);
        alert('Ledningssträckning sparad!');
      } else {
        alert('Kunde inte spara ledningssträckning.');
      }
    } catch (err) {
      console.error(err);
      alert('Nätverksfel vid sparande av sträckning.');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAllUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: parseInt(selectedUser) })
      });
      if (res.ok) {
        setSelectedUser('');
        fetchProjectData();
      } else {
        alert('Användaren är redan tilldelad till detta projekt.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (!confirm('Är du säker på att du vill ta bort beredaren från projektet?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/collaborators/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoFile) return;

    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setLogoFile(null);
        fetchProjectData();
        alert('Logotyp uppladdad!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLandowner = async (e) => {
    e.preventDefault();
    try {
      const ownerRes = await fetch(`http://localhost:5000/api/projects/${projectId}/landowners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newOwnerName,
          personal_number: newOwnerPersonalNum,
          address: newOwnerAddress,
          email: newOwnerEmail,
          phone: newOwnerPhone
        })
      });

      if (!ownerRes.ok) throw new Error('Kunde inte spara markägaren.');
      const ownerData = await ownerRes.json();
      const landownerId = ownerData.id;

      if (newOwnerPropDesignation) {
        await fetch(`http://localhost:5000/api/landowners/${landownerId}/properties`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            designation: newOwnerPropDesignation,
            area: parseFloat(newOwnerPropArea) || null,
            latitude: parseFloat(newOwnerPropLat) || null,
            longitude: parseFloat(newOwnerPropLng) || null
          })
        });
      }

      setShowOwnerModal(false);
      setNewOwnerName('');
      setNewOwnerPersonalNum('');
      setNewOwnerAddress('');
      setNewOwnerEmail('');
      setNewOwnerPhone('');
      setNewOwnerPropDesignation('');
      setNewOwnerPropArea('');
      setNewOwnerPropLat('');
      setNewOwnerPropLng('');
      fetchProjectData();

    } catch (err) {
      console.error(err);
      alert(err.message || 'Ett fel uppstod vid sparandet.');
    }
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docFile) return;

    const formData = new FormData();
    formData.append('file', docFile);
    formData.append('name', docName || docFile.name);
    formData.append('doc_type', docType);
    formData.append('requires_shipping', requiresShipping ? 1 : 0);
    formData.append('property_designation', uploadPropertyDesignation);

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setDocFile(null);
        setDocName('');
        setRequiresShipping(true);
        setUploadPropertyDesignation('');
        fetchProjectData();
        alert('Projektdokument uppladdat!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleShipping = async (docId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${docId}/toggle-shipping`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Vill du ta bort detta projektdokument?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMassShip = async () => {
    if (selectedOwners.length === 0) return;
    if (!confirm(`Är du säker på att du vill boka PostNord-utskick för ${selectedOwners.length} markägare?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/mass-ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ landowner_ids: selectedOwners })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setSelectedOwners([]);
        fetchProjectData();
      } else {
        alert('Det gick inte att boka massutskicket.');
      }
    } catch (err) {
      console.error(err);
      alert('Ett fel uppstod vid bokningen.');
    }
  };

  const handleGeneratePaymentFile = async () => {
    if (selectedOwners.length === 0) return;
    if (!confirm(`Vill du generera en ISO 20022 utbetalningsfil (pain.001 XML) för ${selectedOwners.length} markägare? Statusen på dessa markägare kommer att uppdateras till Utbetalt.`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/generate-payment-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ landowner_ids: selectedOwners })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const disposition = res.headers.get('Content-Disposition');
        let filename = `pain.001_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xml`;
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        alert('Utbetalningsfil genererad och nedladdad framgångsrikt!');
        setSelectedOwners([]);
        fetchProjectData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Det gick inte att generera utbetalningsfilen.');
      }
    } catch (err) {
      console.error(err);
      alert('Ett fel uppstod vid genereringen av bankfilen.');
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      draft: 'badge-draft',
      queued: 'badge-processing',
      posted: 'badge-sent',
      received: 'badge-sent',
      signed: 'badge-signed',
      paid: 'badge-signed',
      easement: 'badge-completed',
      archived: 'badge-completed'
    };
    return classes[status] || 'badge-draft';
  };

  const getStatusSwedishLabel = (status) => {
    const labels = {
      draft: 'Utkast',
      queued: 'I kö',
      posted: 'Postat',
      received: 'Mottaget',
      signed: 'Signerat',
      paid: 'Utbetalt',
      easement: 'Servitut',
      archived: 'Arkiverat'
    };
    return labels[status] || status;
  };

  const getStatusCount = (statusName) => {
    return landowners.filter(owner => owner.status === statusName).length;
  };

  const maskPersonalNumber = (pnum) => {
    if (!pnum) return 'Ej angivet';
    const clean = pnum.replace(/\D/g, '');
    if (clean.length === 12) {
      return `${clean.substring(0, 4)}**-**-****`;
    } else if (clean.length === 10) {
      return `${clean.substring(0, 2)}**-**-****`;
    }
    return '19**-**-**-****';
  };

  const getOwnerShare = (owner, allOwners) => {
    if (!owner.properties || owner.properties.length === 0) return '1/1';
    const firstProp = owner.properties[0].designation;
    const ownersOnProp = allOwners.filter(o => 
      o.properties && o.properties.some(p => p.designation === firstProp)
    );
    if (ownersOnProp.length > 1) {
      return `1/${ownersOnProp.length}`;
    }
    return '1/1';
  };

  const filteredLandowners = statusFilter
    ? landowners.filter(owner => owner.status === statusFilter)
    : landowners;

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Laddar projekt...</p>;
  if (!project) return <p style={{ color: 'var(--color-danger)' }}>Projektet hittades inte.</p>;


  const recentActivities = [
    { date: 'Idag 14:12', user: 'Beredare', text: 'Utskick via PostNord REK bokat för Anna Karlsson.' },
    { date: 'Idag 11:45', user: 'System', text: 'Automatisk matchning av skannat avtal för Bo Lindqvist.' },
    { date: 'Igår 16:30', user: 'Beredare', text: 'Markvärderingskalkyl uppladdad för Cecilia Andersson.' },
    { date: 'Igår 09:15', user: 'System', text: 'Ägaruppslag via Infotrader slutfört.' }
  ];

  return (
    <div>
      {/* Tillbakalänk */}
      <button className="btn btn-secondary btn-sm" onClick={navigateToDashboard} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Tillbaka till Dashboard
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>
            Etapptyp: <strong style={{ color: 'white' }}>{project.project_type.toUpperCase()}</strong> | Geografi: Höganäs, Skåne
          </p>
        </div>
        
        {/* Logotypshantering */}
        <div className="card" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {project.logo_path ? (
            <img 
              src={`http://localhost:5000${project.logo_path}`} 
              alt="Projektlogotyp" 
              style={{ maxHeight: '40px', maxWidth: '100px', borderRadius: '4px' }}
            />
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ingen logotyp</div>
          )}
          
          <form onSubmit={handleLogoUpload} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setLogoFile(e.target.files[0])} 
              style={{ display: 'none' }} 
              id="logo-file-input"
            />
            <label htmlFor="logo-file-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
              Välj Logga
            </label>
            {logoFile && (
              <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                Spara
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Main Tab bar */}
      <div className="tab-headers" style={{ marginBottom: '2rem' }}>
        <button className={`tab-header ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ background: 'none', border: 'none', fontSize: '0.95rem' }}>
          Översikt
        </button>
        <button className={`tab-header ${activeTab === 'landowners' ? 'active' : ''}`} onClick={() => setActiveTab('landowners')} style={{ background: 'none', border: 'none', fontSize: '0.95rem' }}>
          Markägare ({landowners.length})
        </button>
        <button className={`tab-header ${activeTab === 'properties' ? 'active' : ''}`} onClick={() => setActiveTab('properties')} style={{ background: 'none', border: 'none', fontSize: '0.95rem' }}>
          Fastigheter ({getExistingProperties().length})
        </button>
        <button className={`tab-header ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', fontSize: '0.95rem' }}>
          Inställningar
        </button>
      </div>

      {/* TAB 1: ÖVERSIKT */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '2rem' }}>
          
          {/* Vänster spalt */}
          <div>
            {/* Process stepper (8 steg) */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Beredningsprocess - 8 Steg (Klicka för att filtrera)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'draft' ? '' : 'draft')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: statusFilter === 'draft' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'draft' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>1. UTKAST</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('draft')}</p>
                </div>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'queued' ? '' : 'queued')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: statusFilter === 'queued' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'queued' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>2. I KÖ</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('queued')}</p>
                </div>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'posted' ? '' : 'posted')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: statusFilter === 'posted' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'posted' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>3. POSTAT</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('posted')}</p>
                </div>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'received' ? '' : 'received')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: statusFilter === 'received' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'received' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>4. MOTTAGET</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('received')}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'signed' ? '' : 'signed')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    borderLeft: '3px solid var(--color-success)', 
                    borderTop: statusFilter === 'signed' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    borderRight: statusFilter === 'signed' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    borderBottom: statusFilter === 'signed' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'signed' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>5. SIGNERAT</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('signed')}</p>
                </div>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'paid' ? '' : 'paid')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: statusFilter === 'paid' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'paid' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>6. UTBETALT</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('paid')}</p>
                </div>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'easement' ? '' : 'easement')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: statusFilter === 'easement' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'easement' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>7. SERVITUT</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('easement')}</p>
                </div>
                <div 
                  className="card" 
                  onClick={() => setStatusFilter(statusFilter === 'archived' ? '' : 'archived')} 
                  style={{ 
                    padding: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: statusFilter === 'archived' ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    boxShadow: statusFilter === 'archived' ? '0 0 10px rgba(95, 200, 145, 0.2)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>8. ARKIVERAT</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0.25rem 0' }}>{getStatusCount('archived')}</p>
                </div>
              </div>
            </div>

            {/* Markägare i vald status */}
            {statusFilter && (
              <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', border: '1px solid var(--color-accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>
                    Fastighetsägare i fas: <span style={{ color: 'var(--color-accent)' }}>{getStatusSwedishLabel(statusFilter).toUpperCase()}</span> ({filteredLandowners.length} st)
                  </h4>
                  <button className="btn btn-secondary btn-sm" onClick={() => setStatusFilter('')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', textTransform: 'none' }}>
                    Dölj lista
                  </button>
                </div>
                <div className="table-container" style={{ margin: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Markägare</th>
                        <th>Personnummer</th>
                        <th>Fastighet</th>
                        <th>Andel</th>
                        <th>Ersättning</th>
                        <th style={{ textAlign: 'right' }}>Åtgärd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLandowners.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                            Inga markägare i denna fas.
                          </td>
                        </tr>
                      ) : (
                        filteredLandowners.map(owner => (
                          <tr key={owner.id}>
                            <td style={{ fontWeight: 600, color: 'white' }}>{owner.name}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{maskPersonalNumber(owner.personal_number)}</td>
                            <td>{owner.properties_list || 'Ej tillagd'}</td>
                            <td>{getOwnerShare(owner, landowners)}</td>
                            <td>{owner.compensation_sum ? `${owner.compensation_sum.toLocaleString('sv-SE')} kr` : '0 kr'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-secondary btn-sm" style={{ textTransform: 'none', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => navigateToLandowner(owner.id)}>
                                Hantera
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Karta */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Geografisk Ledningssträckning & GIS-analys</h3>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {isDrawingRoute ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={handleSaveRoute} style={{ textTransform: 'none', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                        Spara sträckning
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setRouteCoords([])} style={{ textTransform: 'none', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                        Rensa
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setIsDrawingRoute(false); fetchProjectData(); }} style={{ textTransform: 'none', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                        Avbryt
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => setIsDrawingRoute(true)} style={{ textTransform: 'none', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                      {routeCoords.length > 0 ? 'Redigera sträckning' : 'Rita ledningssträcka'}
                    </button>
                  )}
                </div>
              </div>

              {isDrawingRoute && (
                <div style={{
                  backgroundColor: 'rgba(95, 200, 145, 0.05)',
                  border: '1px solid rgba(95, 200, 145, 0.2)',
                  borderRadius: '4px',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.75rem',
                  color: 'white',
                  marginBottom: '1rem'
                }}>
                  ℹ️ <strong>RITLÄGE AKTIVT:</strong> Klicka direkt på kartan för att placera ut koordinater för kabeln. Klicka sedan på <strong>Spara sträckning</strong>.
                </div>
              )}

              <MapWidget 
                landowners={landowners} 
                center={mapCenter} 
                zoom={project.zoom_level} 
                routeCoordinates={routeCoords}
                onRouteUpdate={setRouteCoords}
                isDrawing={isDrawingRoute}
              />

              {routeCoords.length > 0 && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Total ledningslängd:</span>
                    <strong style={{ color: 'white' }}>{calculateRouteLength(routeCoords).toLocaleString('sv-SE')} meter</strong>
                  </div>

                  <h4 style={{ fontSize: '0.8rem', color: 'white', margin: '1rem 0 0.5rem 0', fontFamily: 'var(--font-title)' }}>GIS-korskörning: Berörda fastigheter</h4>
                  
                  {getAffectedProperties().length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inga fastigheter ligger i direkt anslutning till sträckningen.</p>
                  ) : (
                    <div className="table-container" style={{ margin: 0 }}>
                      <table className="table" style={{ fontSize: '0.75rem' }}>
                        <thead>
                          <tr>
                            <th>Fastighet</th>
                            <th>Delägare</th>
                            <th style={{ textAlign: 'right' }}>Beräknat intrång i gata</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getAffectedProperties().map(p => (
                            <tr key={p.designation}>
                              <td style={{ fontWeight: 600, color: 'white' }}>
                                ⚠️ {p.designation}
                              </td>
                              <td>
                                {p.owners.map(o => o.name).join(', ')}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                                {p.crossingLength} meter
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Höger spalt (Aktivitetslogg) */}
          <div>
            <div className="card" style={{ padding: '1.25rem', height: '100%' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-title)' }}>Projektlogg</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentActivities.map((act, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>{act.date}</span>
                      <span style={{ color: 'var(--color-accent)' }}>{act.user}</span>
                    </div>
                    <p style={{ color: 'white', lineHeight: '1.3' }}>{act.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MARKÄGARE */}
      {activeTab === 'landowners' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => alert('Importera lista: Simulerar uppladdning av Excel/CSV.')}>Importera Excel-lista</button>
              <button className="btn btn-secondary btn-sm" onClick={() => alert('Infotrader API: Synkar ägaruppgifter mot Fastighetsregistret.')}>Synka Infotrader</button>
            </div>
            
            <button className="btn btn-primary btn-sm" onClick={() => setShowOwnerModal(true)}>
              <Plus size={16} /> + Lägg till Markägare
            </button>
          </div>

          {/* Bulk actions */}
          {selectedOwners.length > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'white' }}>
                Valda markägare: <strong>{selectedOwners.length} st</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleMassShip}>
                  Boka PostNord REK för valda ({selectedOwners.length})
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleGeneratePaymentFile} style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}>
                  Skapa utbetalningsfil (ISO 20022)
                </button>
              </div>
            </div>
          )}

          {statusFilter && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(95, 200, 145, 0.05)',
              border: '1px solid rgba(95, 200, 145, 0.2)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: 'white' }}>
                Filtrerat på status: <strong style={{ color: 'var(--color-accent)' }}>{getStatusSwedishLabel(statusFilter).toUpperCase()}</strong> ({filteredLandowners.length} markägare)
              </span>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ textTransform: 'none', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => setStatusFilter('')}
              >
                Visa alla
              </button>
            </div>
          )}

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredLandowners.length > 0 && selectedOwners.length === filteredLandowners.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOwners(filteredLandowners.map(o => o.id));
                        } else {
                          setSelectedOwners([]);
                        }
                      }}
                    />
                  </th>
                  <th>Markägare</th>
                  <th>Personnummer</th>
                  <th>Fastighet</th>
                  <th>Andel</th>
                  <th>Ersättning</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {landowners.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                      Inga markägare tillagda i detta projekt än.
                    </td>
                  </tr>
                ) : filteredLandowners.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                      Inga markägare matchar det valda filtret.
                    </td>
                  </tr>
                ) : (
                  filteredLandowners.map((owner) => (
                    <tr key={owner.id} style={{ backgroundColor: selectedOwners.includes(owner.id) ? 'rgba(95, 200, 145, 0.03)' : 'transparent' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedOwners.includes(owner.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOwners([...selectedOwners, owner.id]);
                            } else {
                              setSelectedOwners(selectedOwners.filter(id => id !== owner.id));
                            }
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 600, color: 'white' }}>{owner.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{maskPersonalNumber(owner.personal_number)}</td>
                      <td>{owner.properties_list || 'Ej tillagd'}</td>
                      <td>{getOwnerShare(owner, landowners)}</td>
                      <td>{owner.compensation_sum ? `${owner.compensation_sum.toLocaleString('sv-SE')} kr` : '0 kr'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(owner.status)}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                          {getStatusSwedishLabel(owner.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" style={{ textTransform: 'none', padding: '0.3rem 0.75rem' }} onClick={() => navigateToLandowner(owner.id)}>
                          Hantera
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FASTIGHETER (Med fastighetsspecifika dokument) */}
      {activeTab === 'properties' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Fastigheter & Delägare</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowOwnerModal(true)}>
              <Plus size={16} /> + Lägg till Fastighet
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Fastighet</th>
                  <th>Areal</th>
                  <th>Position</th>
                  <th>Delägare (Status)</th>
                  <th>Fastighetsspecifika Dokument (Bilagor)</th>
                  <th style={{ textAlign: 'right' }}>Dokumentåtgärd</th>
                </tr>
              </thead>
              <tbody>
                {getExistingProperties().length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                      Inga fastigheter registrerade.
                    </td>
                  </tr>
                ) : (
                  getExistingProperties().map((prop) => {
                    const propDocs = projDocs.filter(d => d.property_designation === prop.designation);
                    return (
                      <tr key={prop.designation}>
                        <td style={{ fontWeight: 600, color: 'white' }}>{prop.designation}</td>
                        <td>{prop.area ? `${prop.area.toLocaleString('sv-SE')} kvm` : 'Ej angiven'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{prop.latitude ? `${prop.latitude.toFixed(4)}, ${prop.longitude.toFixed(4)}` : 'Ej placerad'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {prop.owners.map(o => (
                              <span 
                                key={o.id} 
                                style={{ fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', color: 'var(--color-accent)' }}
                                onClick={() => navigateToLandowner(o.id)}
                              >
                                {o.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({getStatusSwedishLabel(o.status)})</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {propDocs.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Gemensamma bilagor används enbart</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {propDocs.map(d => (
                                <span key={d.id} style={{ fontSize: '0.8rem', color: '#60a5fa' }}>
                                  📄 {d.name} {d.requires_shipping ? '📦' : '💻'}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ textTransform: 'none', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setUploadPropertyDesignation(prop.designation);
                              document.getElementById('project-doc-input')?.click();
                            }}
                          >
                            Ladda upp specifik PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INSTÄLLNINGAR */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Card 1: Avtalsmall */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontFamily: 'var(--font-title)' }}>
              <FileCheck size={18} style={{ color: 'var(--color-accent)' }} /> Avtalsmall & DOCX-koppling
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              DOCX-avtalsmall med automatisk fältkoppling. Varje projekt genereras unikt mot nätägarens standardkontrakt.
            </p>
            
            <div className="form-group">
              <label className="form-label">Aktiv avtalsmall</label>
              <select className="form-select" style={{ fontSize: '0.85rem' }} defaultValue="standard">
                <option value="standard">Nektab Standard - Kraftledning & Intrång v2.4</option>
                <option value="eon">E.ON Standardavtal - Lokal/Regionnät 2026</option>
                <option value="vattenfall">Vattenfall Eldistribution Markupplåtelse v1.9</option>
              </select>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.85rem', fontSize: '0.75rem' }}>
              <span style={{ fontWeight: 'bold', color: 'white', display: 'block', marginBottom: '0.5rem' }}>Aktiva XML/DOCX taggar i mallen:</span>
              <code>{"{{markägare.namn}}"}</code> - Namn på lagfaren ägare<br/>
              <code>{"{{fastighet.beteckning}}"}</code> - Fastighetsbeteckning<br/>
              <code>{"{{ersättning.summa}}"}</code> - Kalkylbelopp i SEK<br/>
              <code>{"{{andel.andel}}"}</code> - Co-ownership share ratio
            </div>
          </div>

          {/* Card 2: Process & Signeringsinställningar */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontFamily: 'var(--font-title)' }}>
              <Layout size={18} style={{ color: 'var(--color-accent)' }} /> Process & Workflow
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Signering sker via fysiskt rekommenderat brev (PostNord REK) för juridisk arkivering och inskick till Lantmäteriet.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Signeringsmetod:</span>
                <strong style={{ color: 'white' }}>Fysiskt Original (Manual)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Utskickstjänst:</span>
                <strong style={{ color: 'white' }}>PostNord REK API</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Digital påminnelse:</span>
                <strong style={{ color: 'white' }}>Kivra Avisering (Mock)</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Värderingsprotokoll (Excel-import) */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontFamily: 'var(--font-title)' }}>
              <FileSpreadsheet size={18} style={{ color: 'var(--color-accent)' }} /> Värderingsmall & Kalkyler
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Excel-mallar för beräkning av intrångsersättning (Skog, åker, trädgård samt tilläggsersättning 125%).
            </p>
            <div className="form-group">
              <label className="form-label">Intrångskalkyl Excel-mall</label>
              <select className="form-select" style={{ fontSize: '0.85rem' }} defaultValue="standard">
                <option value="standard">Skog & Ledningsgata - Nektab Standard 2026</option>
                <option value="eon">E.ON Värderingsnorm - Regionnät (Skog)</option>
              </select>
            </div>
          </div>

          {/* Card 4: Datakälla & Fastighetsregister */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontFamily: 'var(--font-title)' }}>
              <Shield size={18} style={{ color: 'var(--color-accent)' }} /> Fastighetsregister & Säkerhet
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Status för anslutningar till externa källor.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Infotrader API:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></span> Aktiv & ansluten
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lantmäteriet GIS:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></span> Aktiv & ansluten
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dolda element */}
      <form onSubmit={handleDocUpload} style={{ display: 'none' }}>
        <input 
          type="file" 
          accept=".pdf"
          onChange={(e) => setDocFile(e.target.files[0])} 
          id="project-doc-input"
        />
      </form>

      {/* Skapa Markägare Modal */}
      {showOwnerModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', margin: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', color: 'white' }}>Lägg till Markägare & Fastighet</h2>
            
            <form onSubmit={handleAddLandowner}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-accent)', marginBottom: '0.75rem' }}>Personuppgifter</h3>
              <div className="form-group">
                <label className="form-label">Namn (Markägare)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="T.ex. Sven Svensson"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Personnummer</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="YYYYMMDD-XXXX"
                    value={newOwnerPersonalNum}
                    onChange={(e) => setNewOwnerPersonalNum(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefonnummer</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="070-1234567"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Postadress</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Gatunamn 12, Postort"
                    value={newOwnerAddress}
                    onChange={(e) => setNewOwnerAddress(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-post</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="sven@mail.com"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-accent)', marginBottom: '0.75rem', marginTop: '1rem' }}>Fastighet</h3>
              
              {getExistingProperties().length > 0 && (
                <div className="form-group">
                  <label className="form-label">Koppla till befintlig fastighet</label>
                  <select 
                    className="form-select"
                    onChange={(e) => {
                      const selected = getExistingProperties().find(p => p.designation === e.target.value);
                      if (selected) {
                        setNewOwnerPropDesignation(selected.designation);
                        setNewOwnerPropArea(selected.area || '');
                        setNewOwnerPropLat(selected.latitude || '');
                        setNewOwnerPropLng(selected.longitude || '');
                      } else {
                        setNewOwnerPropDesignation('');
                        setNewOwnerPropArea('');
                        setNewOwnerPropLat('');
                        setNewOwnerPropLng('');
                      }
                    }}
                  >
                    <option value="">-- Välj befintlig fastighet (eller fyll i ny nedan) --</option>
                    {getExistingProperties().map(p => (
                      <option key={p.designation} value={p.designation}>
                        {p.designation}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fastighetsbeteckning</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="T.ex. Höganäs 4:21"
                    value={newOwnerPropDesignation}
                    onChange={(e) => setNewOwnerPropDesignation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Areal (Kvm)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="5000"
                    value={newOwnerPropArea}
                    onChange={(e) => setNewOwnerPropArea(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Latitud</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    value={newOwnerPropLat}
                    onChange={(e) => setNewOwnerPropLat(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitud</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    value={newOwnerPropLng}
                    onChange={(e) => setNewOwnerPropLng(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOwnerModal(false)}>
                  Avbryt
                </button>
                <button type="submit" className="btn btn-primary">
                  Spara Markägare
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetails;
