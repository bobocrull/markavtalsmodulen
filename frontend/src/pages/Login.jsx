import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { KeyRound, User, Mail, Shield, CheckCircle2, UserCheck, ArrowRight, Eye, ShieldCheck, UserPlus } from 'lucide-react';
import { nektabLogoWhiteData, nektabLogoGreenData } from '../assets/logoData.js';

function Login({ setToken }) {
  const [mode, setMode] = useState('login'); // 'login' eller 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin'); // 'admin' eller 'beredare'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
      } else {
        // Registrering av ny användare
        if (!username.trim() || !password.trim()) {
          setError('Vänligen fyll i användarnamn och lösenord.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Lösenordet måste bestå av minst 6 tecken.');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
            full_name: fullName.trim(),
            email: email.trim(),
            role
          })
        });

        const data = await res.json();
        if (res.ok) {
          setToken(data.token);
        } else {
          setError(data.error || 'Registreringen misslyckades.');
        }
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
      {/* Vänster panel med info och systemöversikt */}
      <div className="login-info-panel">
        <div className="login-info-logo">
          <img 
            src={nektabLogoWhiteData} 
            alt="NEKTAB" 
            style={{ maxHeight: '44px', width: 'auto', display: 'block' }} 
          />
        </div>
        
        <div className="login-info-content">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.25rem', lineHeight: '1.2' }}>
            Personlig portal för <br />
            <span style={{ color: 'var(--color-accent)' }}>markupplåtelse & beredning</span>
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.25rem', fontSize: '1.02rem', lineHeight: '1.6' }}>
            Nektabs modulära handläggarplattform med automatisk EBR-intrångskalkylering, 
            avtalspaket, delegering mellan administratörer och AI-stödd signaturgranskning.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(95, 200, 145, 0.12)', 
                color: 'var(--color-accent)', 
                padding: '0.4rem 0.65rem', 
                borderRadius: '6px',
                fontFamily: 'var(--font-title)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '55px',
                textAlign: 'center'
              }}>PORTAL</div>
              <div>
                <h4 style={{ color: 'white', marginBottom: '0.2rem', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>Personlig handläggarkö</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>Varje handläggare har sin egen vy med tilldelade ledningsprojekt, delegeringsmöjligheter och deadlines.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(95, 200, 145, 0.12)', 
                color: 'var(--color-accent)', 
                padding: '0.4rem 0.65rem', 
                borderRadius: '6px',
                fontFamily: 'var(--font-title)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '55px',
                textAlign: 'center'
              }}>ROLLER</div>
              <div>
                <h4 style={{ color: 'white', marginBottom: '0.2rem', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>Projektadministratör & Beredare</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>Projektadministratörer har full behörighet för avtal och utbetalning, medan beredare har läs- och granskningsbehörighet.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(95, 200, 145, 0.12)', 
                color: 'var(--color-accent)', 
                padding: '0.4rem 0.65rem', 
                borderRadius: '6px',
                fontFamily: 'var(--font-title)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '55px',
                textAlign: 'center'
              }}>AI & EBR</div>
              <div>
                <h4 style={{ color: 'white', marginBottom: '0.2rem', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>Claude 3.5 Sonnet Integration</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>Automatisk signaturverifiering med bildigenkänning och direktberäkning av intrångsersättning.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="login-info-footer">
          <span>© {new Date().getFullYear()} NEKTAB AB</span>
          <span>SÄKER RBAC-AUTENTISERING</span>
        </div>
      </div>
      
      {/* Höger panel med Inloggnings- & Registreringsformulär */}
      <div className="login-form-panel">
        <div className="card login-card" style={{ maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <img 
              src={nektabLogoGreenData} 
              alt="NEKTAB" 
              style={{ height: '36px', width: 'auto', marginBottom: '0.25rem', display: 'block' }} 
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-title)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Markägarplattform • Handläggarportal
            </p>
          </div>

          {/* FLIKVÄLJARE: Logga in / Registrera */}
          <div style={{ 
            display: 'flex', 
            backgroundColor: 'var(--bg-primary)', 
            borderRadius: '8px', 
            padding: '4px', 
            marginBottom: '1.5rem',
            border: '1px solid var(--color-border)' 
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.6rem 0.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: mode === 'login' ? 'var(--bg-secondary)' : 'transparent',
                color: mode === 'login' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Logga in
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.6rem 0.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: mode === 'register' ? 'var(--bg-secondary)' : 'transparent',
                color: mode === 'register' ? 'var(--color-accent)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              + Skapa konto
            </button>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.15)', 
              color: 'var(--color-danger)', 
              padding: '0.75rem', 
              borderRadius: '6px', 
              marginBottom: '1rem',
              fontSize: '0.82rem',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* INLOGGNINGSFORMULÄR */}
            {mode === 'login' ? (
              <>
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
                      placeholder="T.ex. admin eller beredare..."
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
                  style={{ width: '100%', marginTop: '1.25rem', padding: '0.65rem' }}
                  disabled={loading}
                >
                  {loading ? 'Loggar in...' : 'Logga in på min portal'}
                </button>
              </>
            ) : (
              /* REGISTRERINGSFORMULÄR */
              <>
                <div className="form-group">
                  <label className="form-label">Användarnamn (inloggnings-ID)</label>
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
                      placeholder="T.ex. fornamn.efternamn"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Fullständigt namn</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="För- & efternamn"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">E-postadress</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="namn@nektab.se"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Välj lösenord (minst 6 tecken)</label>
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
                      placeholder="Välj säkert lösenord..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* VÄLJ ROLL */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                    Välj behörighetsroll för portalen:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* Val 1: Projektadministratör */}
                    <div 
                      onClick={() => setRole('admin')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: role === 'admin' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        backgroundColor: role === 'admin' ? 'rgba(95, 200, 145, 0.08)' : 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="role" 
                        checked={role === 'admin'} 
                        onChange={() => setRole('admin')} 
                        style={{ marginTop: '0.2rem' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'white' }}>Projektadministratör</strong>
                          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(95, 200, 145, 0.2)', color: 'var(--color-accent)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                            Full behörighet
                          </span>
                        </div>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                          Skapa/redigera projekt, hantera avtalspaket, delegera ärenden och utföra utbetalningar.
                        </p>
                      </div>
                    </div>

                    {/* Val 2: Beredare */}
                    <div 
                      onClick={() => setRole('beredare')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: role === 'beredare' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        backgroundColor: role === 'beredare' ? 'rgba(95, 200, 145, 0.08)' : 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="role" 
                        checked={role === 'beredare'} 
                        onChange={() => setRole('beredare')} 
                        style={{ marginTop: '0.2rem' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'white' }}>Beredare</strong>
                          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                            Mest läsbehörighet
                          </span>
                        </div>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                          Granska kartor, se fastighetsakter och följa avtalsstatus utan ändringsrätt.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem' }}
                  disabled={loading}
                >
                  {loading ? 'Skapar konto...' : 'Skapa personligt konto & Logga in'}
                </button>
              </>
            )}
          </form>

          {mode === 'login' && (
            <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              <p style={{ marginBottom: '0.25rem' }}>Standardkonton:</p>
              <p>admin / admin123 (Admin) • beredare / beredare123 (Beredare)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
