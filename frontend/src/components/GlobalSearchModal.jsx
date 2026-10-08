import React, { useState, useEffect, useRef } from 'react';
import { Search, Folder, User, Home, ArrowRight, X } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function GlobalSearchModal({
  isOpen,
  onClose,
  token,
  navigateToProject,
  navigateToLandowner
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ projects: [], landowners: [], properties: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ projects: [], landowners: [], properties: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global search API call or local fetch
  useEffect(() => {
    if (!query.trim() || !token) {
      setResults({ projects: [], landowners: [], properties: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Fetch projects to filter
        const projRes = await fetch(`${API_BASE_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const projects = projRes.ok ? await projRes.json() : [];

        // Fetch landowners across all projects
        const matchedProjects = projects.filter(p =>
          p.name?.toLowerCase().includes(query.toLowerCase()) ||
          p.customer?.toLowerCase().includes(query.toLowerCase())
        );

        let matchedLandowners = [];
        let matchedProps = [];

        // Fetch landowners for projects to search across landowners and properties
        const ownerPromises = projects.slice(0, 10).map(async (p) => {
          try {
            const oRes = await fetch(`${API_BASE_URL}/api/projects/${p.id}/landowners`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!oRes.ok) return [];
            const list = await oRes.json();
            return list.map(o => ({ ...o, projectName: p.name }));
          } catch {
            return [];
          }
        });

        const allOwnersNested = await Promise.all(ownerPromises);
        const allOwners = allOwnersNested.flat();

        const qLower = query.toLowerCase();
        matchedLandowners = allOwners.filter(o =>
          o.name?.toLowerCase().includes(qLower) ||
          o.personal_number?.includes(query) ||
          o.phone?.includes(query) ||
          o.email?.toLowerCase().includes(qLower)
        );

        // Match properties if available on landowners
        allOwners.forEach(o => {
          if (o.properties) {
            o.properties.forEach(pr => {
              if (pr.designation?.toLowerCase().includes(qLower)) {
                matchedProps.push({ ...pr, ownerName: o.name, ownerId: o.id, projectName: o.projectName });
              }
            });
          }
        });

        setResults({
          projects: matchedProjects.slice(0, 5),
          landowners: matchedLandowners.slice(0, 8),
          properties: matchedProps.slice(0, 5)
        });
        setSelectedIndex(0);
      } catch (err) {
        console.error('Sökfel:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, token]);

  // Flattened results for keyboard navigation
  const flatItems = [
    ...results.projects.map(p => ({ type: 'project', data: p })),
    ...results.landowners.map(l => ({ type: 'landowner', data: l })),
    ...results.properties.map(pr => ({ type: 'property', data: pr }))
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (flatItems.length || 1)) % (flatItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (item) {
        selectItem(item);
      }
    }
  };

  const selectItem = (item) => {
    if (item.type === 'project') {
      navigateToProject(item.data.id);
    } else if (item.type === 'landowner') {
      navigateToLandowner(item.data.id);
    } else if (item.type === 'property') {
      navigateToLandowner(item.data.ownerId);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 14, 23, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          maxWidth: '92vw',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          gap: '0.75rem'
        }}>
          <Search size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Sök markägare, personnummer, fastighet eller projekt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-primary)',
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
              border: '1px solid var(--color-border)'
            }}>ESC</span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Results Area */}
        <div style={{
          maxHeight: '420px',
          overflowY: 'auto',
          padding: '0.5rem 0'
        }}>
          {loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Söker i databasen...
            </div>
          )}

          {!loading && query && flatItems.length === 0 && (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Inga träffar hittades för "{query}"</p>
              <p style={{ fontSize: '0.75rem' }}>Kontrollera stavning eller sök på fastighetsbeteckning.</p>
            </div>
          )}

          {!loading && !query && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Börja skriva för att söka blixtsnabbt i hela systemet...
            </div>
          )}

          {/* Grouped results */}
          {flatItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {flatItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                let icon = <Folder size={16} style={{ color: '#38bdf8' }} />;
                let title = item.data.name;
                let subtitle = item.data.customer;
                let badge = 'Projekt';

                if (item.type === 'landowner') {
                  icon = <User size={16} style={{ color: 'var(--color-accent)' }} />;
                  title = item.data.name;
                  subtitle = `${item.data.personal_number || 'Inget personnr'} • Projekt: ${item.data.projectName || ''}`;
                  badge = 'Markägare';
                } else if (item.type === 'property') {
                  icon = <Home size={16} style={{ color: '#f59e0b' }} />;
                  title = item.data.designation;
                  subtitle = `Ägare: ${item.data.ownerName || ''} • ${item.data.projectName || ''}`;
                  badge = 'Fastighet';
                }

                return (
                  <div
                    key={`${item.type}-${index}`}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1.25rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--color-accent)' : '3px solid transparent',
                      transition: 'background-color 0.1s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--color-border)'
                      }}>
                        {badge}
                      </span>
                      {isSelected && <ArrowRight size={14} style={{ color: 'var(--color-accent)' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div style={{
          padding: '0.6rem 1.25rem',
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span><strong style={{ color: 'var(--text-secondary)' }}>↑↓</strong> navigera</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>↵</strong> välj</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>ESC</strong> stäng</span>
          </div>
          <span>Markägarplattform Spotlight</span>
        </div>
      </div>
    </div>
  );
}
