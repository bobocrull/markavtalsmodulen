import React, { useState } from 'react';
import { FileText, Plus, HelpCircle, Eye, Settings, X, Check, Save } from 'lucide-react';

function Templates() {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      customer: 'E.ON Energidistribution',
      title: 'E.ON Markupplåtelseavtal v4',
      workflow: ['DRAFT', 'QUEUED', 'SENT', 'RECEIVED', 'SIGNED', 'PAID', 'REGISTERED', 'ARCHIVED', 'REDACTED'],
      mappings: [
        { tag: '{{markägare.namn}}', dbField: 'landowners.name' },
        { tag: '{{markägare.personnummer}}', dbField: 'landowners.personal_number' },
        { tag: '{{fastighet.beteckning}}', dbField: 'properties.designation' },
        { tag: '{{ersättning.summa}}', dbField: 'land_valuations.compensation_sum' },
        { tag: '{{markägare.bankkonto}}', dbField: 'landowners.bank_account' }
      ],
      text: `MARKUPPLÅTELSEAVTAL (E.ON)\n\nDetta avtal har upprättats mellan E.ON Energidistribution och fastighetsägaren {{markägare.namn}} (personnummer: {{markägare.personnummer}}).\n\n1. UPPGIFT & SYFTE\nFastighetsägaren upplåter härmed till E.ON rätt att bygga och bibehålla elledningar inom fastigheten {{fastighet.beteckning}}.\n\n2. ERSÄTTNING\nErsättning utgår enligt EBR:s riktlinjer med ett belopp om {{ersättning.summa}} kr.\n\n3. UTBETALNING\nUtbetalning sker till bankkonto {{markägare.bankkonto}} efter att avtalet signerats av båda parter.`
    },
    {
      id: 2,
      customer: 'Vattenfall Eldistribution',
      title: 'Vattenfall Lokalnät, mall 2025',
      workflow: ['DRAFT', 'QUEUED', 'SENT', 'RECEIVED', 'SIGNED', 'PAID', 'ARCHIVED', 'REDACTED'],
      mappings: [
        { tag: '{{markägare.namn}}', dbField: 'landowners.name' },
        { tag: '{{fastighet.beteckning}}', dbField: 'properties.designation' },
        { tag: '{{ersättning.summa}}', dbField: 'land_valuations.compensation_sum' }
      ],
      text: `LEDNINGSAVTAL (VATTENFALL)\n\nDetta avtal reglerar intrång på fastigheten {{fastighet.beteckning}} för Vattenfall Eldistribution.\n\nFastighetsägare: {{markägare.namn}}.\nErsättningsbelopp enligt gällande taxa: {{ersättning.summa}} kr.`
    },
    {
      id: 3,
      customer: 'Ellevio',
      title: 'Ellevio Servitut, v2',
      workflow: ['DRAFT', 'QUEUED', 'SENT', 'RECEIVED', 'SIGNED', 'PAID', 'REGISTERED', 'ARCHIVED', 'REDACTED'],
      mappings: [
        { tag: '{{markägare.namn}}', dbField: 'landowners.name' },
        { tag: '{{markägare.personnummer}}', dbField: 'landowners.personal_number' },
        { tag: '{{fastighet.beteckning}}', dbField: 'properties.designation' }
      ],
      text: `SERVITUTSAVTAL (ELLEVIO)\n\nAvtalsservitut avseende elledning upprättas för Ellevio AB på fastigheten {{fastighet.beteckning}}.\nLagfaren ägare: {{markägare.namn}} (personnr: {{markägare.personnummer}}).`
    }
  ]);

  // Modaltillstånd
  const [activeModal, setActiveModal] = useState(null); // 'upload', 'view', 'mapping', 'add_customer'
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Formulärtillstånd för ny mall / kund
  const [newCustomer, setNewCustomer] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState(['DRAFT', 'QUEUED', 'SENT', 'RECEIVED', 'SIGNED', 'PAID', 'ARCHIVED']);
  const availableStages = ['DRAFT', 'QUEUED', 'SENT', 'RECEIVED', 'SIGNED', 'PAID', 'REGISTERED', 'ARCHIVED', 'REDACTED'];

  // Tillstånd för redigering av fältmappning
  const [editingMappings, setEditingMappings] = useState([]);

  // Öppna visa-modal
  const handleOpenView = (temp) => {
    setSelectedTemplate(temp);
    setActiveModal('view');
  };

  // Öppna fältmappning-modal
  const handleOpenMapping = (temp) => {
    setSelectedTemplate(temp);
    setEditingMappings([...temp.mappings]);
    setActiveModal('mapping');
  };

  // Lägg till mappningsrad
  const handleAddMappingRow = () => {
    setEditingMappings(prev => [...prev, { tag: '{{ny.tagg}}', dbField: 'landowners.name' }]);
  };

  // Spara fältmappning
  const handleSaveMapping = () => {
    setTemplates(prev => prev.map(t => {
      if (t.id === selectedTemplate.id) {
        return { ...t, mappings: editingMappings };
      }
      return t;
    }));
    setActiveModal(null);
    alert('Fältmappningen har sparats!');
  };

  // Spara ny mall / kund
  const handleSaveNewTemplate = (e) => {
    e.preventDefault();
    if (!newCustomer || !newTitle) {
      alert('Vänligen fyll i både kund och mallnamn.');
      return;
    }

    const defaultText = `AVTAL (${newCustomer.toUpperCase()})\n\nMall skapad för ${newCustomer}.\nFastighetsägare: {{markägare.namn}}\nFastighet: {{fastighet.beteckning}}`;

    const newTemp = {
      id: templates.length + 1,
      customer: newCustomer,
      title: newTitle,
      workflow: selectedWorkflow,
      mappings: [
        { tag: '{{markägare.namn}}', dbField: 'landowners.name' },
        { tag: '{{fastighet.beteckning}}', dbField: 'properties.designation' }
      ],
      text: newText || defaultText
    };

    setTemplates(prev => [...prev, newTemp]);
    
    // Nollställ
    setNewCustomer('');
    setNewTitle('');
    setNewText('');
    setSelectedWorkflow(['DRAFT', 'QUEUED', 'SENT', 'RECEIVED', 'SIGNED', 'PAID', 'ARCHIVED']);
    setActiveModal(null);
    alert(`Avtalsmallen för ${newCustomer} har skapats!`);
  };

  // Rendera markerade platshållare
  const renderTemplateText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, index) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return (
          <span 
            key={index} 
            style={{ 
              backgroundColor: 'rgba(95, 200, 145, 0.15)', 
              color: 'var(--color-accent)', 
              padding: '0.1rem 0.3rem', 
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '1px solid rgba(95, 200, 145, 0.3)'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div>
      {/* Rubrik & Toppbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-title)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>● Mallar – 05</span>
          <h1 className="page-title" style={{ marginTop: '0.25rem' }}>Avtalsmallar per kund –<br/>utan en enda kodändring.</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '650px' }}>
            Ladda upp kundens DOCX, peka ut fältnamn (<code>{"{{markägare.namn}}"}</code> osv.) — sedan genererar systemet alla avtal automatiskt. 60 kunder, 60 mallar, samma flöde.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveModal('upload')}>
          <Plus size={16} /> Ladda upp ny mall
        </button>
      </div>

      {/* Grid med mall-kort */}
      <div className="grid">
        {templates.map(temp => (
          <div key={temp.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }}></span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-title)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Kund</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '0.25rem' }}>{temp.customer}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{temp.title}</p>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-title)', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Workflow</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {temp.workflow.map(w => (
                    <span 
                      key={w} 
                      style={{ 
                        fontSize: '0.65rem', 
                        fontFamily: 'var(--font-title)', 
                        padding: '0.15rem 0.4rem', 
                        backgroundColor: 'var(--bg-primary)', 
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => handleOpenView(temp)}>
                Visa
              </button>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', color: 'var(--color-accent)' }} onClick={() => handleOpenMapping(temp)}>
                ⚙ Fältmappning
              </button>
            </div>
          </div>
        ))}

        {/* Lägg till kund (kort) */}
        <div 
          className="card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '260px', 
            borderStyle: 'dashed', 
            borderColor: 'var(--color-border)', 
            cursor: 'pointer',
            textAlign: 'center'
          }}
          onClick={() => setActiveModal('add_customer')}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
            <Plus size={20} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.25rem' }}>Lägg till kund</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Med egen mall och workflow</p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MODAL: VISA MALL (Preview) */}
      {/* ======================================================== */}
      {activeModal === 'view' && selectedTemplate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(10, 14, 23, 0.85)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card" style={{ maxWidth: '700px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Förhandsgranskning av mall</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedTemplate.customer} • {selectedTemplate.title}</span>
              </div>
              <button 
                onClick={() => setActiveModal(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ 
              flex: 1, overflowY: 'auto', backgroundColor: '#0a0f1d', 
              padding: '1.5rem', borderRadius: '6px', border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)',
              lineHeight: '1.6', whiteSpace: 'pre-wrap', minHeight: '300px'
            }}>
              {renderTemplateText(selectedTemplate.text)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveModal(null)}>
                Stäng
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setActiveModal(null); handleOpenMapping(selectedTemplate); }}>
                Redigera mappning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MODAL: FÄLTMAPPNING */}
      {/* ======================================================== */}
      {activeModal === 'mapping' && selectedTemplate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(10, 14, 23, 0.85)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card" style={{ maxWidth: '650px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Fältmappning (⚙)</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Koppla taggar i Word-dokumentet till databasfält</span>
              </div>
              <button 
                onClick={() => setActiveModal(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                Här ställer du in vilka kolumner i markägartabellerna som ska ersätta taggarna i DOCX-filen vid generering av avtalspaket.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {editingMappings.map((map, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: '0.75rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ fontSize: '0.8rem', padding: '0.5rem', fontFamily: 'monospace' }}
                      value={map.tag}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingMappings(prev => prev.map((item, i) => i === idx ? { ...item, tag: val } : item));
                      }}
                    />
                    <select 
                      className="form-select"
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                      value={map.dbField}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingMappings(prev => prev.map((item, i) => i === idx ? { ...item, dbField: val } : item));
                      }}
                    >
                      <option value="landowners.name">markägare.namn (Text)</option>
                      <option value="landowners.personal_number">markägare.personnummer (Text)</option>
                      <option value="landowners.address">markägare.postadress (Text)</option>
                      <option value="landowners.email">markägare.e-post (Text)</option>
                      <option value="landowners.phone">markägare.telefon (Text)</option>
                      <option value="landowners.bank_account">markägare.bankkonto (Text)</option>
                      <option value="properties.designation">fastighet.beteckning (Text)</option>
                      <option value="land_valuations.compensation_sum">ersättning.summa (Heltal/SEK)</option>
                    </select>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ color: 'var(--color-danger)', padding: '0.4rem 0.6rem' }}
                      onClick={() => setEditingMappings(prev => prev.filter((_, i) => i !== idx))}
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
              </div>

              <button 
                className="btn btn-secondary btn-sm" 
                style={{ marginTop: '1.25rem', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                onClick={handleAddMappingRow}
              >
                + Lägg till taggmappning
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveModal(null)}>
                Avbryt
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveMapping}>
                <Save size={14} /> Spara ändringar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL: LADDA UPP / LÄGG TILL (Upload / Add) */}
      {/* ======================================================== */}
      {(activeModal === 'upload' || activeModal === 'add_customer') && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(10, 14, 23, 0.85)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card" style={{ maxWidth: '550px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>
                {activeModal === 'upload' ? 'Ladda upp ny avtalsmall (DOCX)' : 'Skapa ny kund & workflow'}
              </h3>
              <button 
                onClick={() => setActiveModal(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div className="form-group">
                <label className="form-label">Kund / Uppdragsgivare</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex. Skellefteå Kraft"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Avtalsmallens Namn</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex. Markavtal Lokalnat v1.docx"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              {activeModal === 'upload' && (
                <div className="form-group">
                  <label className="form-label">Välj DOCX-mallfil</label>
                  <div style={{
                    border: '1px dashed var(--color-border)',
                    borderRadius: '4px',
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      accept=".docx" 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setNewTitle(file.name);
                        }
                      }}
                    />
                    <FileText size={24} style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.8rem', color: 'white' }}>Klicka för att bläddra (.docx)</p>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Avtalsinnehåll (Textutkast)</label>
                <textarea 
                  className="form-textarea" 
                  rows={4}
                  placeholder="Skriv avtalsinnehåll med taggar, ex: Detta avtal upprättas med fastighetsägaren {{markägare.namn}}..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Workflow-steg för kunden</label>
                <div style={{ 
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', 
                  backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' 
                }}>
                  {availableStages.map(stage => {
                    const isChecked = selectedWorkflow.includes(stage);
                    return (
                      <label key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedWorkflow(prev => prev.filter(w => w !== stage));
                            } else {
                              setSelectedWorkflow(prev => [...prev, stage]);
                            }
                          }}
                        />
                        {stage}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveModal(null)}>
                  Avbryt
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Check size={14} /> Skapa mall & kund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Templates;
