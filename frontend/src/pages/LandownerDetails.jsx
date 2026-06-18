import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import DocumentOrderList from '../components/DocumentOrderList';
import { ArrowLeft, Save, Upload, FileText, Send, ShieldAlert, Plus, Trash2, ExternalLink, Edit2, Check, AlertCircle } from 'lucide-react';

function LandownerDetails({ token, landownerId, navigateToProject, user }) {
  const [owner, setOwner] = useState(null);
  const [properties, setProperties] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [shipments, setShipments] = useState([]);

  // Form states för markägare
  const [name, setName] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [status, setStatus] = useState('draft');

  // Toggle edit-läge för personuppgifter
  const [isEditing, setIsEditing] = useState(false);

  // Form states för fastigheter
  const [newPropDesignation, setNewPropDesignation] = useState('');
  const [newPropArea, setNewPropArea] = useState('');
  const [newPropLat, setNewPropLat] = useState('');
  const [newPropLng, setNewPropLng] = useState('');

  // Form states för markvärdering
  const [valText, setValText] = useState('');
  const [compSum, setCompSum] = useState('0');
  const [valFile, setValFile] = useState(null);

  // Form states för dokument
  const [docFile, setDocFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('agreement');
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [targetSendDate, setTargetSendDate] = useState('');
  const [projectProperties, setProjectProperties] = useState([]);

  // EBR kalkylator stater
  const [fieldEnabled, setFieldEnabled] = useState(true);
  const [fieldLength, setFieldLength] = useState('0');
  const [fieldWidth, setFieldWidth] = useState('0');
  const [forestEnabled, setForestEnabled] = useState(false);
  const [forestLength, setForestLength] = useState('0');
  const [forestWidth, setForestWidth] = useState('0');
  const [forestType, setForestType] = useState('tall');
  const [forestDensity, setForestDensity] = useState('normal');
  const [cutTreesCount, setCutTreesCount] = useState('0');
  const [avgTreePrice, setAvgTreePrice] = useState('400');
  const [gardenEnabled, setGardenEnabled] = useState(false);
  const [gardenLength, setGardenLength] = useState('0');
  const [gardenWidth, setGardenWidth] = useState('0');
  const [polesCount, setPolesCount] = useState('0');
  const [staysCount, setStaysCount] = useState('0');

  // CRM logs stater
  const [crmLogs, setCrmLogs] = useState([]);
  const [newLogType, setNewLogType] = useState('phone');
  const [newLogSummary, setNewLogSummary] = useState('');
  const [newLogDescription, setNewLogDescription] = useState('');
  const [isAddingLog, setIsAddingLog] = useState(false);

  // Åtaganden (Obligations) stater
  const [obligations, setObligations] = useState([]);
  const [newObligationTitle, setNewObligationTitle] = useState('');
  const [newObligationDesc, setNewObligationDesc] = useState('');
  const [newObligationDueDate, setNewObligationDueDate] = useState('');
  const [isAddingObligation, setIsAddingObligation] = useState(false);

  // Kivra mock state
  const [kivraStatus, setKivraStatus] = useState('Ej skickat');

  // Handover state variables
  const [handoverRecipient, setHandoverRecipient] = useState('');
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);
  const [handoverSignName, setHandoverSignName] = useState(user?.username || '');

  useEffect(() => {
    if (user?.username) {
      setHandoverSignName(user.username);
    }
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOwnerDetails();
  }, [landownerId]);

  const fetchProjectProperties = async (projId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projId}/landowners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ownersData = await res.json();
      const propsMap = new Map();
      await Promise.all(ownersData.map(async (owner) => {
        const detailRes = await fetch(`${API_BASE_URL}/api/landowners/${owner.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const detail = await detailRes.json();
        if (detail.properties) {
          detail.properties.forEach(p => {
            if (p.designation) {
              propsMap.set(p.designation, p);
            }
          });
        }
      }));
      setProjectProperties(Array.from(propsMap.values()));
    } catch (err) {
      console.error('Kunde inte hämta projektets fastigheter:', err);
    }
  };

  const fetchOwnerDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kunde inte läsa markägare.');
      const data = await res.json();
      
      setOwner(data);
      setName(data.name);
      setPersonalNumber(data.personal_number || '');
      setAddress(data.address || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setBankAccount(data.bank_account || '');
      setStatus(data.status);

      setProperties(data.properties);
      setShipments(data.shipments || []);
      if (data.project_id) {
        fetchProjectProperties(data.project_id);
      }

      if (data.valuation) {
        setValText(data.valuation.valuation_text || '');
        setCompSum(data.valuation.compensation_sum.toString());
        try {
          const calcData = data.valuation.calculator_data ? JSON.parse(data.valuation.calculator_data) : null;
          if (calcData) {
            // Bakåtkompatibilitet
            if (calcData.landType === 'field') {
              setFieldEnabled(true);
              setFieldLength((calcData.intrångsLength ?? 0).toString());
              setFieldWidth((calcData.intrångsWidth ?? 0).toString());
              setForestEnabled(false);
              setGardenEnabled(false);
            } else if (calcData.landType === 'forest') {
              setForestEnabled(true);
              setForestLength((calcData.intrångsLength ?? 0).toString());
              setForestWidth((calcData.intrångsWidth ?? 0).toString());
              setForestType(calcData.forestType || 'tall');
              setForestDensity(calcData.forestDensity || 'normal');
              setCutTreesCount((calcData.cutTreesCount ?? 0).toString());
              setAvgTreePrice((calcData.avgTreePrice ?? 400).toString());
              setFieldEnabled(false);
              setGardenEnabled(false);
            }
            
            // Nytt flervals-schema
            if (calcData.fieldEnabled !== undefined) setFieldEnabled(calcData.fieldEnabled);
            if (calcData.fieldLength !== undefined) setFieldLength(calcData.fieldLength.toString());
            if (calcData.fieldWidth !== undefined) setFieldWidth(calcData.fieldWidth.toString());
            
            if (calcData.forestEnabled !== undefined) setForestEnabled(calcData.forestEnabled);
            if (calcData.forestLength !== undefined) setForestLength(calcData.forestLength.toString());
            if (calcData.forestWidth !== undefined) setForestWidth(calcData.forestWidth.toString());
            if (calcData.forestType !== undefined) setForestType(calcData.forestType);
            if (calcData.forestDensity !== undefined) setForestDensity(calcData.forestDensity);
            if (calcData.cutTreesCount !== undefined) setCutTreesCount(calcData.cutTreesCount.toString());
            if (calcData.avgTreePrice !== undefined) setAvgTreePrice(calcData.avgTreePrice.toString());
            
            if (calcData.gardenEnabled !== undefined) setGardenEnabled(calcData.gardenEnabled);
            if (calcData.gardenLength !== undefined) setGardenLength(calcData.gardenLength.toString());
            if (calcData.gardenWidth !== undefined) setGardenWidth(calcData.gardenWidth.toString());
            
            setPolesCount((calcData.polesCount ?? 0).toString());
            setStaysCount((calcData.staysCount ?? 0).toString());
          }
        } catch (e) {
          console.error('Kunde inte läsa kalkylator-data:', e);
        }
      }

      // Hämta sammanställd dokumentlista
      fetchDocuments();
      fetchCrmLogs();
      fetchObligations();

    } catch (err) {
      console.error(err);
      setError('Kunde inte läsa markägarinfo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOwner = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          personal_number: personalNumber,
          address,
          email,
          phone,
          bank_account: bankAccount,
          status
        })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchOwnerDetails();
      } else {
        alert('Gick inte att spara.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (isPurged) return;

    if (newStatus === 'delivered') {
      alert('Vänligen använd överlämningsformuläret till höger för att formellt signera och registrera överlämning till kund.');
      return;
    }
    if (newStatus === 'archived' && status !== 'delivered' && status !== 'archived') {
      alert('Ärendet måste överlämnas till kund (fas 8. Överlämnat) innan det kan arkiveras.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          personal_number: personalNumber,
          address,
          email,
          phone,
          bank_account: bankAccount,
          status: newStatus
        })
      });
      if (res.ok) {
        setStatus(newStatus);
        fetchOwnerDetails();
      } else {
        alert('Kunde inte uppdatera status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterHandover = async (e) => {
    if (e) e.preventDefault();
    if (!handoverRecipient || !handoverDate || !handoverConfirmed || !handoverSignName) {
      alert('Vänligen fyll i alla fält och bekräfta överlämningen.');
      return;
    }

    try {
      // 1. Post the communication log
      const logRes = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/communication-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          log_type: 'meeting',
          summary: 'Dokumentation överlämnad till kund',
          description: `Dokumentation (undertecknat avtal, EBR-värdering och GIS-kartor) har överlämnats formellt.\nMottagare hos kund: ${handoverRecipient}\nÖverlämnandedatum: ${handoverDate}\nSignerat digitalt av handläggare: ${handoverSignName}`
        })
      });

      if (!logRes.ok) {
        alert('Kunde inte logga överlämningen.');
        return;
      }

      // 2. Update status to 'delivered'
      const statusRes = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          personal_number: personalNumber,
          address,
          email,
          phone,
          bank_account: bankAccount,
          status: 'delivered'
        })
      });

      if (statusRes.ok) {
        setStatus('delivered');
        fetchOwnerDetails();
        fetchCrmLogs();
        alert('Överlämning till kund har registrerats och status har uppdaterats till Överlämnat.');
      } else {
        alert('Kunde inte uppdatera status.');
      }
    } catch (err) {
      console.error(err);
      alert('Ett fel uppstod vid registrering av överlämningen.');
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    if (!newPropDesignation) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          designation: newPropDesignation,
          area: parseFloat(newPropArea) || null,
          latitude: parseFloat(newPropLat) || null,
          longitude: parseFloat(newPropLng) || null
        })
      });
      if (res.ok) {
        setNewPropDesignation('');
        setNewPropArea('');
        setNewPropLat('');
        setNewPropLng('');
        fetchOwnerDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProperty = async (propId) => {
    if (!confirm('Vill du ta bort fastigheten?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/properties/${propId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchOwnerDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateValuation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/valuation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          valuation_text: valText,
          compensation_sum: parseFloat(compSum) || 0
        })
      });
      if (res.ok) {
        alert('Markvärdering och ersättningsbelopp sparade!');
        fetchOwnerDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleValuationFileUpload = async (e) => {
    e.preventDefault();
    if (!valFile) return;

    const formData = new FormData();
    formData.append('file', valFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/valuation/file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setValFile(null);
        fetchOwnerDetails();
        alert('Excel-kalkyl för markvärdering uppladdad!');
      }
    } catch (err) {
      console.error(err);
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
    formData.append('target_send_date', targetSendDate);

    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setDocFile(null);
        setDocName('');
        setRequiresShipping(true);
        setTargetSendDate('');
        fetchDocuments();
        alert('Markägardokument uppladdat!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompilePdf = () => {
    window.open(`${API_BASE_URL}/api/landowners/${landownerId}/compile?authorization=Bearer ${token}`, '_blank');
  };

  const handlePostnordShipping = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/ship`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Utskick bokat via PostNord REK! Sändnings-ID: ${data.shipment_id}`);
        fetchOwnerDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendKivra = () => {
    setKivraStatus('Skickat');
    alert(`Digital Kivra-kopia och avisering skickad till ${name}!`);
  };

  const handleSendKivraReminder = () => {
    alert(`Digital påminnelse om signering skickad till ${name}s Kivra inbox.`);
  };

  const handleGdprPurge = async () => {
    if (!confirm('VARNING: Är du helt säker på att du vill utföra GDPR-gallring? Alla personuppgifter kommer att maskeras och uppladdade dokument raderas permanent. Denna åtgärd kan inte ångras.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/gdpr-purge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchOwnerDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCrmLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/communication-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCrmLogs(data);
      }
    } catch (err) {
      console.error('Kunde inte hämta kommunikationsloggar:', err);
    }
  };

  const fetchObligations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/obligations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setObligations(data);
      }
    } catch (err) {
      console.error('Kunde inte hämta åtaganden:', err);
    }
  };

  const handleAddObligation = async (e) => {
    e.preventDefault();
    if (!newObligationTitle) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/obligations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newObligationTitle,
          description: newObligationDesc,
          due_date: newObligationDueDate
        })
      });
      if (res.ok) {
        setNewObligationTitle('');
        setNewObligationDesc('');
        setNewObligationDueDate('');
        setIsAddingObligation(false);
        fetchObligations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateObligationStatus = async (obId, newStatus) => {
    const ob = obligations.find(o => o.id === obId);
    if (!ob) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/obligations/${obId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: ob.title,
          description: ob.description,
          due_date: ob.due_date,
          status: newStatus
        })
      });
      if (res.ok) {
        fetchObligations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteObligation = async (obId) => {
    if (!confirm('Är du säker på att du vill ta bort detta åtagande?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/obligations/${obId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchObligations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCrmLog = async (e) => {
    e.preventDefault();
    if (!newLogSummary) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/communication-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          log_type: newLogType,
          summary: newLogSummary,
          description: newLogDescription
        })
      });
      if (res.ok) {
        setNewLogSummary('');
        setNewLogDescription('');
        setIsAddingLog(false);
        fetchCrmLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const computeEbrCompensation = () => {
    let fieldArea = 0;
    let fieldIntrång = 0;
    if (fieldEnabled) {
      fieldArea = (parseFloat(fieldLength) || 0) * (parseFloat(fieldWidth) || 0);
      fieldIntrång = fieldArea * 12; // 12 kr/m2
    }
    
    let forestArea = 0;
    let forestIntrång = 0;
    let forestAvverkning = 0;
    let forestVärdesförlust = 0;
    if (forestEnabled) {
      forestArea = (parseFloat(forestLength) || 0) * (parseFloat(forestWidth) || 0);
      forestIntrång = forestArea * 8; // 8 kr/m2
      forestAvverkning = (parseInt(cutTreesCount) || 0) * (parseFloat(avgTreePrice) || 0);
      const bonitetsKoeff = forestDensity === 'low' ? 1.0 : forestDensity === 'high' ? 1.6 : 1.3;
      forestVärdesförlust = forestArea * 1.5 * bonitetsKoeff;
    }
    
    let gardenArea = 0;
    let gardenIntrång = 0;
    if (gardenEnabled) {
      gardenArea = (parseFloat(gardenLength) || 0) * (parseFloat(gardenWidth) || 0);
      gardenIntrång = gardenArea * 50; // Tomtmark/Trädgård schablon: 50 kr/m2
    }
    
    const stolparPris = (parseInt(polesCount) || 0) * 1500;
    const stagPris = (parseInt(staysCount) || 0) * 800;
    const stolpStagErsättning = stolparPris + stagPris;
    
    const subtotal = fieldIntrång + forestIntrång + forestAvverkning + forestVärdesförlust + gardenIntrång + stolpStagErsättning;
    const påslag = subtotal * 0.25;
    const total = subtotal + påslag;
    
    return {
      fieldArea,
      fieldIntrång,
      forestArea,
      forestIntrång,
      forestAvverkning,
      forestVärdesförlust,
      gardenArea,
      gardenIntrång,
      stolparPris,
      stagPris,
      stolpStagErsättning,
      subtotal,
      påslag,
      total: Math.round(total)
    };
  };

  const handleSaveEbrCalculator = async (e) => {
    if (e) e.preventDefault();
    const results = computeEbrCompensation();
    
    const calculator_data = {
      fieldEnabled,
      fieldLength: parseFloat(fieldLength) || 0,
      fieldWidth: parseFloat(fieldWidth) || 0,
      forestEnabled,
      forestLength: parseFloat(forestLength) || 0,
      forestWidth: parseFloat(forestWidth) || 0,
      forestType,
      forestDensity,
      cutTreesCount: parseInt(cutTreesCount) || 0,
      avgTreePrice: parseFloat(avgTreePrice) || 0,
      gardenEnabled,
      gardenLength: parseFloat(gardenLength) || 0,
      gardenWidth: parseFloat(gardenWidth) || 0,
      polesCount: parseInt(polesCount) || 0,
      staysCount: parseInt(staysCount) || 0
    };
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/landowners/${landownerId}/valuation-calculator`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          calculator_data,
          compensation_sum: results.total
        })
      });
      if (res.ok) {
        setCompSum(results.total.toString());
        alert('EBR-värderingskalkyl sparad!');
        fetchOwnerDetails();
      } else {
        alert('Gick inte att spara värderingskalkylen.');
      }
    } catch (err) {
      console.error(err);
      alert('Nätverksfel vid sparande av kalkyl.');
    }
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Laddar markägarprofil...</p>;
  if (error || !owner) return <p style={{ color: 'var(--color-danger)' }}>{error || 'Markägare hittades inte.'}</p>;

  const isPurged = owner.status === 'completed';

  const timelineSteps = [
    { key: 'draft', label: '1. Utkast', desc: 'Beredning påbörjad' },
    { key: 'queued', label: '2. I kö', desc: 'Väntar i utskickskö' },
    { key: 'posted', label: '3. Postat', desc: 'Avtal skickat via REK' },
    { key: 'received', label: '4. Mottaget', desc: 'Original mottaget av markägare' },
    { key: 'signed', label: '5. Signerat', desc: 'Fysiskt signerat undertecknat original' },
    { key: 'paid', label: '6. Utbetalt', desc: 'Ersättning överförd till bank' },
    { key: 'easement', label: '7. Servitut', desc: 'Inskrivet hos Lantmäteriet' },
    { key: 'delivered', label: '8. Överlämnat', desc: 'Överlämnat till kund' },
    { key: 'archived', label: '9. Arkiverat', desc: 'Ärendet avslutat & gallring väntar' }
  ];

  // Hitta index för nuvarande status för att färglägga tidslinjen
  const currentStepIndex = timelineSteps.findIndex(step => step.key === status);

  return (
    <div>
      {/* Tillbakalänk */}
      <button className="btn btn-secondary btn-sm" onClick={navigateToProject} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Tillbaka till Projekt
      </button>

      {/* Profiltitel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">{owner.name}</h1>
          <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>
            Ärende-ID: <span style={{ fontFamily: 'monospace' }}>#LO-{landownerId}</span> | Fastigheter: {properties.map(p => p.designation).join(', ') || 'Inga fastigheter'}
          </p>
        </div>
        
        {isPurged && (
          <span className="badge badge-completed" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
            GDPR-GALLRAD & AVSLUTAD
          </span>
        )}
      </div>

      {/* Tvåspaltig Profil Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
        
        {/* VÄNSTER KOLUMN: Workflow Stepper & Utskick */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Vertical status timeline */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'white', marginBottom: '1.5rem', fontFamily: 'var(--font-title)' }}>Handläggningsstatus</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
              {/* Tidslinjestreck */}
              <div style={{
                position: 'absolute',
                left: '11px', top: '10px', bottom: '10px',
                width: '2px',
                backgroundColor: 'var(--color-border)',
                zIndex: 0
              }}></div>

              {timelineSteps.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;
                const isFuture = idx > currentStepIndex;
                
                return (
                  <div 
                    key={step.key} 
                    onClick={() => handleStatusChange(step.key)}
                    style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      alignItems: 'start', 
                      cursor: isPurged ? 'not-allowed' : 'pointer',
                      zIndex: 1
                    }}
                  >
                    {/* Steg-indikator */}
                    <div style={{
                      width: '24px', height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-accent)' : 'var(--bg-primary)',
                      border: isCompleted ? '1px solid var(--color-success)' : isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isCompleted || isActive ? '#0a0e17' : 'var(--text-secondary)',
                      fontSize: '0.7rem', fontWeight: 'bold',
                      boxShadow: isActive ? '0 0 10px rgba(95, 200, 145, 0.4)' : 'none',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    
                    {/* Stegtext */}
                    <div>
                      <strong style={{ 
                        fontSize: '0.85rem', 
                        color: isActive ? 'var(--color-accent)' : isFuture ? 'var(--text-secondary)' : 'white',
                        display: 'block'
                      }}>
                        {step.label.replace(/^\d+\.\s*/, '')}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{step.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Utskickspanel (PostNord + Kivra) */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-title)' }}>Avtal & Avisering</h3>
            
            {/* PostNord REK */}
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'white' }}>PostNord REK (Original)</strong>
                <span className="badge badge-sent" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>Fysiskt Original</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
                Skicka avtalspaketet med rekommenderat brev för fysisk underskrift. Systemet spårar leveransen automatiskt.
              </p>

              {shipments.length > 0 ? (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '1rem' }}>
                  <p><strong>Boknings-ID:</strong> {shipments[0].postnord_shipment_id}</p>
                  <p><strong>Bokad:</strong> {new Date(shipments[0].created_at).toLocaleDateString('sv-SE')}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <a href={shipments[0].tracking_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      Spåra paket <ExternalLink size={10} />
                    </a>
                    <a href={`${API_BASE_URL}${shipments[0].shipping_label_url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      Fraktsedel <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              ) : (
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ width: '100%', marginBottom: '0.5rem' }} 
                  onClick={handlePostnordShipping}
                  disabled={isPurged}
                >
                  <Send size={12} /> Boka & skicka PostNord REK
                </button>
              )}
            </div>

            {/* Kivra mock */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'white' }}>Kivra Digital Avisering</strong>
                <span className={`badge ${kivraStatus === 'Skickat' ? 'badge-signed' : 'badge-draft'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                  {kivraStatus}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
                Skicka digital aviseringskopia och påminnelser direkt till markägarens Kivra-inkorg.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  onClick={handleSendKivra}
                  disabled={isPurged || kivraStatus === 'Skickat'}
                >
                  Skicka Kivra
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  onClick={handleSendKivraReminder}
                  disabled={isPurged}
                >
                  Skicka Påminnelse
                </button>
              </div>
            </div>

          </div>

          {/* CRM Kommunikationslogg */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Kommunikationslogg</h3>
              <button 
                className="btn btn-secondary btn-sm"
                style={{ textTransform: 'none', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                onClick={() => setIsAddingLog(!isAddingLog)}
              >
                {isAddingLog ? 'Avbryt' : '+ Logga kontakt'}
              </button>
            </div>

            {/* Form för att lägga till logg */}
            {isAddingLog && (
              <form onSubmit={handleAddCrmLog} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '0.5rem' }}>
                  <select className="form-select" value={newLogType} onChange={(e) => setNewLogType(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.75rem' }}>
                    <option value="phone">📞 Telefonsamtal</option>
                    <option value="email">📧 E-post</option>
                    <option value="meeting">🤝 Möte</option>
                    <option value="note">📝 Intern anteckning</option>
                  </select>
                  
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Kort sammanfattning (t.ex. Diskuterat stag)" 
                    value={newLogSummary} 
                    onChange={(e) => setNewLogSummary(e.target.value)} 
                    required 
                    style={{ padding: '0.4rem', fontSize: '0.75rem' }} 
                  />
                </div>
                
                <textarea 
                  className="form-textarea" 
                  rows="2" 
                  placeholder="Detaljerad beskrivning av samtalet/mötet..." 
                  value={newLogDescription} 
                  onChange={(e) => setNewLogDescription(e.target.value)}
                  style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                ></textarea>
                
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem' }}>Logga händelse</button>
              </form>
            )}

            {/* Lista med loggar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {crmLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem 0' }}>Ingen kontakt loggad än.</p>
              ) : (
                crmLogs.map((log) => {
                  let icon = '📝';
                  if (log.log_type === 'phone') icon = '📞';
                  else if (log.log_type === 'email') icon = '📧';
                  else if (log.log_type === 'meeting') icon = '🤝';
                  
                  return (
                    <div key={log.id} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong style={{ color: 'white' }}>{icon} {log.summary}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                          {new Date(log.logged_at).toLocaleDateString('sv-SE')}
                        </span>
                      </div>
                      {log.description && (
                        <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', lineHeight: '1.3' }}>{log.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Särskilda åtaganden & fältvillkor */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Särskilda åtaganden & villkor</h3>
              {!isPurged && (
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ textTransform: 'none', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={() => setIsAddingObligation(!isAddingObligation)}
                >
                  {isAddingObligation ? 'Avbryt' : '+ Lägg till åtagande'}
                </button>
              )}
            </div>

            {/* Form för att lägga till åtagande */}
            {isAddingObligation && (
              <form onSubmit={handleAddObligation} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Titel</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="T.ex. Återställ hästhage / Spara ek" 
                    value={newObligationTitle} 
                    onChange={(e) => setNewObligationTitle(e.target.value)} 
                    required 
                    style={{ padding: '0.4rem', fontSize: '0.75rem' }} 
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Beskrivning</label>
                    <textarea 
                      className="form-textarea" 
                      rows="2" 
                      placeholder="Detaljerad beskrivning..." 
                      value={newObligationDesc} 
                      onChange={(e) => setNewObligationDesc(e.target.value)}
                      style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                    ></textarea>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Slutdatum (Deadline)</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newObligationDueDate} 
                    onChange={(e) => setNewObligationDueDate(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                  />
                </div>
                
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem' }}>Spara åtagande</button>
              </form>
            )}

            {/* Lista med åtaganden */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
              {obligations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem 0' }}>Inga särskilda åtaganden registrerade.</p>
              ) : (
                obligations.map((ob) => {
                  let statusColor = '#ef4444'; // Red for pending
                  let statusText = 'Väntar';
                  if (ob.status === 'in_progress') {
                    statusColor = '#3b82f6'; // Blue
                    statusText = 'Pågår';
                  } else if (ob.status === 'completed') {
                    statusColor = '#f59e0b'; // Orange
                    statusText = 'Utförd';
                  } else if (ob.status === 'verified') {
                    statusColor = '#10b981'; // Green
                    statusText = 'Kontrollerad';
                  }

                  return (
                    <div key={ob.id} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <strong style={{ color: 'white', fontSize: '0.8rem' }}>{ob.title}</strong>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 'bold', 
                            padding: '0.1rem 0.3rem', 
                            borderRadius: '4px',
                            backgroundColor: statusColor + '20',
                            color: statusColor,
                            border: `1px solid ${statusColor}40`
                          }}>
                            {statusText}
                          </span>
                          {!isPurged && (
                            <button 
                              onClick={() => handleDeleteObligation(ob.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.1rem' }}
                              title="Radera åtagande"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {ob.description && (
                        <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: '1.3' }}>{ob.description}</p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--color-border)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                          {ob.due_date ? `Deadline: ${ob.due_date}` : 'Ingen deadline'}
                        </span>
                        
                        {!isPurged && (
                          <select 
                            className="form-select"
                            value={ob.status} 
                            onChange={(e) => handleUpdateObligationStatus(ob.id, e.target.value)}
                            style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem', width: 'auto', border: '1px solid var(--color-border)', background: 'var(--bg-secondary)', color: 'white' }}
                          >
                            <option value="pending">Väntar</option>
                            <option value="in_progress">Pågår</option>
                            <option value="completed">Utförd</option>
                            <option value="verified">Kontrollerad</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* HÖGER KOLUMN: Kontaktuppgifter, Värdering, Bilagor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Kontaktkort (Personuppgifter) */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'white', margin: 0, fontFamily: 'var(--font-title)' }}>Personuppgifter</h3>
              {!isPurged && !isEditing && (
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ textTransform: 'none', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 size={12} style={{ marginRight: '0.25rem' }} /> Redigera
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateOwner}>
                <div className="form-group">
                  <label className="form-label">Namn</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Personnummer</label>
                    <input type="text" className="form-input" value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefon</label>
                    <input type="text" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Postadress</label>
                    <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-post</label>
                    <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bankkonto för utbetalning</label>
                  <input type="text" className="form-input" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Clearing + Kontonummer" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Avbryt</button>
                  <button type="submit" className="btn btn-primary btn-sm"><Check size={12} /> Spara</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>Namn</span>
                  <strong style={{ color: 'white' }}>{name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>Personnummer</span>
                  <strong style={{ color: 'white' }}>{personalNumber || 'Ej angivet'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>Telefon</span>
                  <strong style={{ color: 'white' }}>{phone || 'Ej angivet'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>E-post</span>
                  <strong style={{ color: 'white' }}>{email || 'Ej angivet'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>Postadress</span>
                  <strong style={{ color: 'white' }}>{address || 'Ej angiven'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>Bankkonto (Utbetalning)</span>
                  <strong style={{ color: 'white' }}>{bankAccount || 'Ej angivet'}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Fastigheter */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Geografiska fastigheter</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {properties.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Inga registrerade fastigheter.</p>
              ) : (
                properties.map(prop => (
                  <div key={prop.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <strong style={{ color: 'white', fontSize: '0.85rem' }}>{prop.designation}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                        Area: {prop.area ? `${prop.area} kvm` : 'Ej angiven'} | Pos: {prop.latitude ? `${prop.latitude.toFixed(4)}, ${prop.longitude.toFixed(4)}` : 'Ej placerad'}
                      </span>
                    </div>
                    {!isPurged && (
                      <button 
                        onClick={() => handleDeleteProperty(prop.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {!isPurged && (
              <form onSubmit={handleAddProperty} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" className="form-input" placeholder="Höganäs 4:21" value={newPropDesignation} onChange={(e) => setNewPropDesignation(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem' }} required />
                  <input type="number" className="form-input" placeholder="Areal kvm" value={newPropArea} onChange={(e) => setNewPropArea(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input type="number" step="any" className="form-input" placeholder="Latitud" value={newPropLat} onChange={(e) => setNewPropLat(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                  <input type="number" step="any" className="form-input" placeholder="Longitud" value={newPropLng} onChange={(e) => setNewPropLng(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                </div>
                <button type="submit" className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem' }}>+ Lägg till fastighet</button>
              </form>
            )}
          </div>

          {/* Värderingscard (EBR-Kalkylator) */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>EBR Intrångskalkylator</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>Total Ersättning</span>
                <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--color-accent)', fontFamily: 'var(--font-title)' }}>
                  {computeEbrCompensation().total.toLocaleString('sv-SE')} kr
                </p>
              </div>
              <div style={{ backgroundColor: 'rgba(95, 200, 145, 0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', display: 'block', fontWeight: 'bold' }}>Normkalkyl + 25%</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Expropriationslagspåslag</span>
              </div>
            </div>

            <form onSubmit={handleSaveEbrCalculator} style={{ marginBottom: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontFamily: 'var(--font-title)' }}>Ingående marktyper för fastigheten:</span>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'white', cursor: 'pointer' }}>
                    <input type="checkbox" checked={fieldEnabled} onChange={(e) => setFieldEnabled(e.target.checked)} disabled={isPurged} />
                    Åker (12 kr/m²)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'white', cursor: 'pointer' }}>
                    <input type="checkbox" checked={forestEnabled} onChange={(e) => setForestEnabled(e.target.checked)} disabled={isPurged} />
                    Skog (8 kr/m²)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'white', cursor: 'pointer' }}>
                    <input type="checkbox" checked={gardenEnabled} onChange={(e) => setGardenEnabled(e.target.checked)} disabled={isPurged} />
                    Tomtmark/Trädgård (50 kr/m²)
                  </label>
                </div>
              </div>

              {fieldEnabled && (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', backgroundColor: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: '0.75rem', color: 'white', margin: '0 0 0.75rem 0', fontFamily: 'var(--font-title)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    🚜 Åker/Inrösningsjord
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Intrångslängd (m)</label>
                      <input type="number" className="form-input" value={fieldLength} onChange={(e) => setFieldLength(e.target.value)} disabled={isPurged} required style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Gatu-bredd (m)</label>
                      <input type="number" className="form-input" value={fieldWidth} onChange={(e) => setFieldWidth(e.target.value)} disabled={isPurged} required style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'right' }}>
                    Areal: <strong>{((parseFloat(fieldLength) || 0) * (parseFloat(fieldWidth) || 0)).toFixed(1)} kvm</strong>
                  </div>
                </div>
              )}

              {forestEnabled && (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', backgroundColor: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: '0.75rem', color: 'white', margin: '0 0 0.75rem 0', fontFamily: 'var(--font-title)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    🌲 Skogsmark
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Intrångslängd (m)</label>
                      <input type="number" className="form-input" value={forestLength} onChange={(e) => setForestLength(e.target.value)} disabled={isPurged} required style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Gatu-bredd (m)</label>
                      <input type="number" className="form-input" value={forestWidth} onChange={(e) => setForestWidth(e.target.value)} disabled={isPurged} required style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Trädslag</label>
                      <select className="form-select" value={forestType} onChange={(e) => setForestType(e.target.value)} disabled={isPurged} style={{ fontSize: '0.75rem', padding: '0.35rem' }}>
                        <option value="tall">Tall</option>
                        <option value="gran">Gran</option>
                        <option value="lov">Lövskog</option>
                        <option value="bland">Blandskog</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Täthet / Bonitet</label>
                      <select className="form-select" value={forestDensity} onChange={(e) => setForestDensity(e.target.value)} disabled={isPurged} style={{ fontSize: '0.75rem', padding: '0.35rem' }}>
                        <option value="low">Låg bonitet / gles</option>
                        <option value="normal">Normal bonitet</option>
                        <option value="high">Hög bonitet / tät</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Avverkade träd (st)</label>
                      <input type="number" className="form-input" value={cutTreesCount} onChange={(e) => setCutTreesCount(e.target.value)} disabled={isPurged} style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Snittpris per träd (kr)</label>
                      <input type="number" className="form-input" value={avgTreePrice} onChange={(e) => setAvgTreePrice(e.target.value)} disabled={isPurged} style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'right' }}>
                    Areal: <strong>{((parseFloat(forestLength) || 0) * (parseFloat(forestWidth) || 0)).toFixed(1)} kvm</strong>
                  </div>
                </div>
              )}

              {gardenEnabled && (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', backgroundColor: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: '0.75rem', color: 'white', margin: '0 0 0.75rem 0', fontFamily: 'var(--font-title)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    🏡 Tomtmark / Trädgård
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Intrångslängd (m)</label>
                      <input type="number" className="form-input" value={gardenLength} onChange={(e) => setGardenLength(e.target.value)} disabled={isPurged} required style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Gatu-bredd (m)</label>
                      <input type="number" className="form-input" value={gardenWidth} onChange={(e) => setGardenWidth(e.target.value)} disabled={isPurged} required style={{ fontSize: '0.75rem', padding: '0.35rem' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'right' }}>
                    Areal: <strong>{((parseFloat(gardenLength) || 0) * (parseFloat(gardenWidth) || 0)).toFixed(1)} kvm</strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Antal stolpar (st)</label>
                  <input type="number" className="form-input" value={polesCount} onChange={(e) => setPolesCount(e.target.value)} disabled={isPurged} style={{ fontSize: '0.8rem' }} />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Antal stag (st)</label>
                  <input type="number" className="form-input" value={staysCount} onChange={(e) => setStaysCount(e.target.value)} disabled={isPurged} style={{ fontSize: '0.8rem' }} />
                </div>
              </div>

              {/* Sammanfattning av beräkningen */}
              <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.85rem', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
                <span style={{ fontWeight: 'bold', color: 'white', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>Kalkylspecifikation:</span>
                {fieldEnabled && (
                  <>• Gatuintrång (Åker): {computeEbrCompensation().fieldIntrång.toLocaleString('sv-SE')} kr (12 kr/m²)<br/></>
                )}
                {forestEnabled && (
                  <>
                    • Gatuintrång (Skog): {computeEbrCompensation().forestIntrång.toLocaleString('sv-SE')} kr (8 kr/m²)<br/>
                    • Skogsavverkning ({forestType}): {computeEbrCompensation().forestAvverkning.toLocaleString('sv-SE')} kr<br/>
                    • Skogsvärdesförlust: {computeEbrCompensation().forestVärdesförlust.toLocaleString('sv-SE')} kr (bonitet {forestDensity === 'low' ? '1.0' : forestDensity === 'high' ? '1.6' : '1.3'})<br/>
                  </>
                )}
                {gardenEnabled && (
                  <>• Gatuintrång (Tomt/Trädgård): {computeEbrCompensation().gardenIntrång.toLocaleString('sv-SE')} kr (50 kr/m²)<br/></>
                )}
                {(parseInt(polesCount) > 0 || parseInt(staysCount) > 0) && (
                  <>• Stolpe/stag ({polesCount} st / {staysCount} st): {computeEbrCompensation().stolpStagErsättning.toLocaleString('sv-SE')} kr<br/></>
                )}
                • Subtotal: {computeEbrCompensation().subtotal.toLocaleString('sv-SE')} kr<br/>
                • Expropriationspåslag (25%): {computeEbrCompensation().påslag.toLocaleString('sv-SE')} kr
              </div>

              {!isPurged && (
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '0.75rem' }}>Spara kalkyl</button>
              )}
            </form>

            {/* Fritextmotivering / kommentar */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Beredarkommentar / Motivering</label>
                <textarea 
                  className="form-textarea" 
                  rows="2" 
                  value={valText} 
                  onChange={(e) => setValText(e.target.value)} 
                  disabled={isPurged} 
                  placeholder="Skriv kommentar eller särskilda villkor..." 
                  style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                ></textarea>
                {!isPurged && (
                  <button onClick={handleUpdateValuation} className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.75rem', marginTop: '0.5rem', padding: '0.4rem' }}>Spara kommentar</button>
                )}
              </div>
            </div>

            {/* Värderingskalkyl Excel fil */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Kopplat Kalkylblad (Excel)</span>
              
              {owner.valuation && owner.valuation.file_path ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  <FileText size={14} style={{ color: 'var(--color-success)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>varderingskalkyl.xlsx</span>
                  <a href={`${API_BASE_URL}${owner.valuation.file_path}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', marginLeft: 'auto', textTransform: 'none' }}>
                    Öppna
                  </a>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Ingen Excel-kalkyl uppladdad.</p>
              )}

              {!isPurged && (
                <form onSubmit={handleValuationFileUpload} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="file" onChange={(e) => setValFile(e.target.files[0])} style={{ display: 'none' }} id="val-file-input" />
                  <label htmlFor="val-file-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.35rem 0.75rem', textTransform: 'none' }}>
                    Välj Excelfil
                  </label>
                  {valFile && (
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>Ladda upp</button>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Avtalspaket & Bilagor */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Avtalspaket (Ingående Bilagor)</h3>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <DocumentOrderList 
                documents={documents} 
                token={token} 
                onOrderChanged={fetchDocuments}
                onDeleteDocument={handleDeleteDocument}
              />
            </div>

            {/* Ladda upp ny bilaga för markägaren */}
            {!isPurged && (
              <form onSubmit={handleDocUpload} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '0.5rem' }}>
                  <input type="text" className="form-input" placeholder="Bilagenamn (t.ex. Ritning)" value={docName} onChange={(e) => setDocName(e.target.value)} required style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                  <select className="form-select" value={docType} onChange={(e) => setDocType(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem' }}>
                    <option value="agreement">Avtal (PDF)</option>
                    <option value="map">Karta (PDF)</option>
                    <option value="drawing">Ritning (PDF)</option>
                    <option value="other">Övrigt (PDF)</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="file" accept=".pdf" onChange={(e) => setDocFile(e.target.files[0])} style={{ display: 'none' }} id="landowner-doc-input" />
                  <label htmlFor="landowner-doc-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.35rem 0.75rem', textTransform: 'none' }}>
                    Välj PDF
                  </label>
                  {docFile && (
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>Ladda upp</button>
                  )}
                </div>
              </form>
            )}

            <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={handleCompilePdf}>
              <FileText size={16} /> Kompilera Avtalspaket (PDF)
            </button>
          </div>

          {/* Formell överlämning till kund */}
          {(status === 'easement' || status === 'delivered' || status === 'archived') && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>
                Överlämning till kund
              </h3>

              {status === 'easement' ? (
                <form onSubmit={handleRegisterHandover} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                    Innan ärendet kan arkiveras måste dokumentationen (undertecknat avtal, EBR-värdering och GIS-kartor) formellt lämnas över till kunden.
                  </p>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Mottagare hos kund (t.ex. E.ON projektledare)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ange namn på mottagaren" 
                      value={handoverRecipient} 
                      onChange={(e) => setHandoverRecipient(e.target.value)} 
                      required 
                      style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Överlämnandedatum</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={handoverDate} 
                      onChange={(e) => setHandoverDate(e.target.value)} 
                      required 
                      style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start', margin: '0.25rem 0' }}>
                    <input 
                      type="checkbox" 
                      id="handover-confirm-check" 
                      checked={handoverConfirmed} 
                      onChange={(e) => setHandoverConfirmed(e.target.checked)} 
                      style={{ marginTop: '0.2rem' }}
                    />
                    <label htmlFor="handover-confirm-check" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '1.3' }}>
                      Jag bekräftar att all dokumentation har överlämnats till kund för arkivering.
                    </label>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Digital signatur (Namnförtydligande)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ditt namn" 
                      value={handoverSignName} 
                      onChange={(e) => setHandoverSignName(e.target.value)} 
                      required 
                      style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm" 
                    disabled={!handoverRecipient || !handoverDate || !handoverConfirmed || !handoverSignName}
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem' }}
                  >
                    <Check size={14} style={{ marginRight: '0.25rem' }} /> Signera & Registrera Överlämning
                  </button>
                </form>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0.6rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '4px', marginBottom: '1rem', alignItems: 'center' }}>
                    <Check size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
                      Överlämning till kund är genomförd och signerad.
                    </span>
                  </div>
                  {(() => {
                    const handoverLog = crmLogs.find(log => log.log_type === 'meeting' && log.summary === 'Dokumentation överlämnad till kund');
                    if (handoverLog) {
                      return (
                        <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4', margin: 0, whiteSpace: 'pre-line' }}>
                            {handoverLog.description}
                          </p>
                          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            <span>Loggad av ID: {handoverLog.user_id}</span>
                            <span>{new Date(handoverLog.logged_at).toLocaleDateString('sv-SE')}</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        Handläggaren har registrerat att dokumentationen har överlämnats formellt till kunden.
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* GDPR Datagallring */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>GDPR-säkerhet & Gallring</h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', marginBottom: '1rem', alignItems: 'start' }}>
              <ShieldAlert size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                Efter att pappersavtalet undertecknats av båda parter och registrerats ska personuppgifterna gallras permanent ur databasen av integritetsskäl.
              </p>
            </div>

            {!isPurged ? (
              <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleGdprPurge}>
                Utför GDPR-gallring
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                ✓ Ärendet städat. Alla personuppgifter raderade.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default LandownerDetails;
