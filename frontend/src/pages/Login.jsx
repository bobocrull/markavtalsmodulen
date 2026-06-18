import React, { useState } from 'react';
import { KeyRound, User } from 'lucide-react';

function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
      } else {
        setError(data.error || 'Inloggningen misslyckades.');
      }
    } catch (err) {
      setError('Kunde inte nå servern. Kontrollera att backend körs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Vänster panel med info och bild */}
      <div className="login-info-panel">
        <div className="login-info-logo">
          <img src="/src/assets/nektab_logo_white.png" alt="NEKTAB" />
        </div>
        
        <div className="login-info-content">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', lineHeight: '1.2' }}>
            Nästa generations <br />
            <span style={{ color: 'var(--color-accent)' }}>markägarkontakt</span>
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
            Nektabs plattform för digitaliserad beredning, markintrångskalkyler och automatiserad handläggning av ledningsprojekt.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(95, 200, 145, 0.1)', 
                color: 'var(--color-accent)', 
                padding: '0.4rem 0.6rem', 
                borderRadius: '4px',
                fontFamily: 'var(--font-title)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '45px',
                textAlign: 'center'
              }}>GIS</div>
              <div>
                <h4 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>Interaktiv ledningsritning</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Rita ledningssträckor direkt på kartan med automatisk korskörningsanalys mot fastigheter.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(95, 200, 145, 0.1)', 
                color: 'var(--color-accent)', 
                padding: '0.4rem 0.6rem', 
                borderRadius: '4px',
                fontFamily: 'var(--font-title)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '45px',
                textAlign: 'center'
              }}>EBR</div>
              <div>
                <h4 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>Automatiska intrångskalkyler</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Kalkylera intrångsersättning för skog, åker och tomtmark baserat på Elnätsbranschens Riktlinjer.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(95, 200, 145, 0.1)', 
                color: 'var(--color-accent)', 
                padding: '0.4rem 0.6rem', 
                borderRadius: '4px',
                fontFamily: 'var(--font-title)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '45px',
                textAlign: 'center'
              }}>XML</div>
              <div>
                <h4 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>ISO 20022 Bankfiler</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Generera pain.001 XML-utbetalningsfiler direkt för snabb och säker utbetalning via banken.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="login-info-footer">
          <span>© {new Date().getFullYear()} NEKTAB AB</span>
          <span>SÄKER ANSLUTNING</span>
        </div>
      </div>
      
      {/* Höger panel med inloggningsformulär */}
      <div className="login-form-panel">
        <div className="card login-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/src/assets/nektab_logo_green.png" alt="NEKTAB" style={{ height: '32px', marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-title)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Markägarplattform • Logga in
            </p>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.15)', 
              color: 'var(--color-danger)', 
              padding: '0.75rem', 
              borderRadius: '6px', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Användarnamn</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ 
                  position: 'absolute', 
                  left: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '35px' }}
                  placeholder="Skriv användarnamn..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lösenord</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ 
                  position: 'absolute', 
                  left: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ paddingLeft: '35px' }}
                  placeholder="Skriv lösenord..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <p>Testkonton för MVP:</p>
            <p>admin / admin123  •  beredare / beredare123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
