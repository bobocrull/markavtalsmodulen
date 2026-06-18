import React from 'react';
import { ArrowUp, ArrowDown, FileText, Trash2, CheckSquare, Square } from 'lucide-react';

function DocumentOrderList({ documents, token, onOrderChanged, onDeleteDocument }) {
  
  const handleMove = async (index, direction) => {
    const newDocs = [...documents];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newDocs.length) return;

    // Skifta plats
    const temp = newDocs[index];
    newDocs[index] = newDocs[targetIndex];
    newDocs[targetIndex] = temp;

    // Spara de nya sorteringsordningarna i backend
    try {
      await Promise.all(
        newDocs.map((doc, idx) => 
          fetch(`http://localhost:5000/api/documents/${doc.id}/order`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ sort_order: idx })
          })
        )
      );
      
      onOrderChanged();
    } catch (err) {
      console.error('Kunde inte spara ny dokumentordning:', err);
    }
  };

  const handleToggleShipping = async (docId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${docId}/toggle-shipping`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onOrderChanged();
      }
    } catch (err) {
      console.error('Kunde inte ändra leveransstatus:', err);
    }
  };

  const getDateBadge = (dateStr, requiresShipping) => {
    if (!dateStr || !requiresShipping) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let color = 'var(--text-secondary)';
    let label = `Måldatum: ${dateStr}`;
    
    if (diffDays < 0) {
      color = 'var(--color-danger)';
      label = `ÖVERSTIGEN: ${dateStr}`;
    } else if (diffDays <= 3) {
      color = 'var(--color-warning)';
      label = `Närmar sig: ${dateStr}`;
    } else {
      color = 'var(--color-success)';
    }
    
    return (
      <span style={{ fontSize: '0.75rem', color, fontWeight: 500, display: 'inline-block', marginTop: '0.2rem' }}>
        {label}
      </span>
    );
  };

  if (!documents || documents.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Inga dokument uppladdade än.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {documents.map((doc, index) => (
        <div key={doc.id} className="sort-item" style={{ borderLeft: doc.requires_shipping ? '4px solid var(--color-accent)' : '4px solid var(--text-muted)' }}>
          <div className="sort-item-info" style={{ flex: 1, marginRight: '1rem' }}>
            {/* Checkbox för att snabbt slå av/på leveransstatus */}
            <div 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: doc.requires_shipping ? 'var(--color-accent)' : 'var(--text-muted)' }} 
              onClick={() => handleToggleShipping(doc.id)}
              title="Klicka för att ändra om dokumentet ska skickas eller ej"
            >
              {doc.requires_shipping ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, fontSize: '0.9rem', color: doc.requires_shipping ? 'white' : 'var(--text-secondary)' }}>
                {doc.name} {!doc.requires_shipping && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Endast referens)</span>}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {doc.landowner_id ? 'Unik för markägare' : 'Gemensam för projekt'} • {doc.doc_type.toUpperCase()}
              </p>
              {getDateBadge(doc.target_send_date, doc.requires_shipping)}
            </div>
          </div>
          
          <div className="sort-item-controls">
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '0.25rem' }}
              disabled={index === 0}
              onClick={() => handleMove(index, 'up')}
              title="Flytta upp"
            >
              <ArrowUp size={14} />
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '0.25rem' }}
              disabled={index === documents.length - 1}
              onClick={() => handleMove(index, 'down')}
              title="Flytta ned"
            >
              <ArrowDown size={14} />
            </button>
            <button 
              className="btn btn-danger btn-sm" 
              style={{ padding: '0.25rem', marginLeft: '0.5rem' }}
              onClick={() => onDeleteDocument(doc.id)}
              title="Ta bort dokument"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default DocumentOrderList;
