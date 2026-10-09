import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { User, Mail, Phone, Lock, Calendar, Palmtree, UserCheck, Shield, Check, AlertCircle, Share2, X } from 'lucide-react';
import { useToast } from './Toast.jsx';

function MyAccountModal({ isOpen, onClose, token, user, onUserUpdated }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' eller 'away'
  
  // Profilfält
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Frånvarofält
  const [isAway, setIsAway] = useState(false);
  const [awayStartDate, setAwayStartDate] = useState('');
  const [awayEndDate, setAwayEndDate] = useState('');
  const [awayMessage, setAwayMessage] = useState('');
  const [backupUserId, setBackupUserId] = useState('');
  const [delegateActiveProjects, setDelegateActiveProjects] = useState(true);

  // Kollegor
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setNewPassword('');
      setConfirmPassword('');

      setIsAway(Boolean(user.is_away));
      setAwayStartDate(user.away_start_date || '');
      setAwayEndDate(user.away_end_date || '');
      setAwayMessage(user.away_message || '');
      setBackupUserId(user.backup_user_id ? String(user.backup_user_id) : '');
      setDelegateActiveProjects(true);

      fetchColleagues();
    }
  }, [isOpen, user]);

  const fetchColleagues = async () => {
    if (!token) return;
    setFetchingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filtrera bort sig själv från listan över potentiella ställföreträdare
        setUsersList((data || []).filter(u => user && u.id !== user.id));
      }
    } catch (err) {
      console.error('Kunde inte hämta kollegor:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword && newPassword.length < 6) {
      showToast('Det nya lösenordet måste innehålla minst 6 tecken.', 'warning');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      showToast('Lösenorden matchar inte.', 'warning');
      return;
    }

    if (isAway && !backupUserId) {
      showToast('Välj en ställföreträdande kollega som dina projekt ska delegeras till vid frånvaro.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: newPassword.trim() || undefined,
          is_away: isAway,
          away_start_date: awayStartDate,
          away_end_date: awayEndDate,
          away_message: awayMessage.trim(),
          backup_user_id: backupUserId ? parseInt(backupUserId, 10) : null,
          delegate_active_projects: isAway && delegateActiveProjects
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Dina kontouppgifter har sparats!', 'success');
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (onUserUpdated && data.user) {
          onUserUpdated(data.user);
        }
        onClose();
      } else {
        showToast(data.error || 'Kunde inte uppdatera kontot.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Ett nätverksfel uppstod när kontot skulle sparas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 10, 15, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              backgroundColor: 'rgba(95, 200, 145, 0.15)',
              color: 'var(--color-accent)',
              padding: '0.45rem',
              borderRadius: '8px'
            }}>
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontFamily: 'var(--font-title)' }}>
                Mitt konto & Inställningar
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Handläggarprofil • Inloggad som <strong style={{ color: '#e2e8f0' }}>{user?.username}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.3rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0.2rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Flikväljare */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--color-accent)' : '2px solid transparent',
              backgroundColor: activeTab === 'profile' ? 'rgba(95, 200, 145, 0.06)' : 'transparent',
              color: activeTab === 'profile' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem'
            }}
          >
            <User size={15} style={{ color: activeTab === 'profile' ? 'var(--color-accent)' : 'inherit' }} />
            Mina uppgifter
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('away')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === 'away' ? '2px solid var(--color-warning)' : '2px solid transparent',
              backgroundColor: activeTab === 'away' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
              color: activeTab === 'away' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem'
            }}
          >
            <Palmtree size={15} style={{ color: isAway ? 'var(--color-warning)' : (activeTab === 'away' ? 'var(--color-warning)' : 'inherit') }} />
            Frånvaro & Automatisk delegering
            {isAway && (
              <span style={{
                fontSize: '0.62rem',
                backgroundColor: 'var(--color-warning)',
                color: '#000',
                padding: '0.1rem 0.35rem',
                borderRadius: '999px',
                fontWeight: 700
              }}>
                AKTIV
              </span>
            )}
          </button>
        </div>

        {/* Formulär */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', flex: 1 }}>

            {/* FLIK 1: MINA UPPGIFTER */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Roll & Login-ID banner */}
                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>
                      Inloggnings-ID (Användarnamn)
                    </span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
                      {user?.username}
                    </div>
                  </div>
                  <div>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      fontWeight: 700,
                      backgroundColor: user?.role === 'admin' ? 'rgba(95, 200, 145, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: user?.role === 'admin' ? 'var(--color-accent)' : '#60a5fa',
                      border: `1px solid ${user?.role === 'admin' ? 'rgba(95, 200, 145, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      letterSpacing: '0.04em'
                    }}>
                      {user?.role === 'admin' ? 'PROJEKTADMINISTRATÖR' : 'BEREDARE (LÄSBEHÖRIGHET)'}
                    </span>
                  </div>
                </div>

                {/* Fullständigt namn */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Fullständigt namn (visas i projekt och protokoll)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '32px' }}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="För- och efternamn"
                      required
                    />
                  </div>
                </div>

                {/* E-post och Telefon */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>E-postadress</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        className="form-input"
                        style={{ paddingLeft: '32px' }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="namn@nektab.se"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Telefonnummer</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '32px' }}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="070-123 45 67"
                      />
                    </div>
                  </div>
                </div>

                {/* Byt lösenord */}
                <div style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                    Byt lösenord <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(lämna tomt om du vill behålla nuvarande)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Nytt lösenord (minst 6 tecken)</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="password"
                          className="form-input"
                          style={{ paddingLeft: '32px' }}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minst 6 tecken..."
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Bekräfta lösenord</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="password"
                          className="form-input"
                          style={{ paddingLeft: '32px' }}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Upprepa lösenord..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FLIK 2: FRÅNVAROSPÄRR & AUTOMATISK DELEGERING */}
            {activeTab === 'away' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Information banner */}
                <div style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45
                }}>
                  <strong style={{ color: 'var(--color-warning)', display: 'block', marginBottom: '0.2rem' }}>
                    🌴 Tillfällig frånvarospärr (Semester / Ledighet)
                  </strong>
                  Aktivera denna spärr när du är borta en längre tid. Nya projekt som tilldelas dig styrs då automatiskt över till din valda ställföreträdare, och dina kollegor informeras om din ledighet.
                </div>

                {/* Huvud-switch: Aktivera frånvaro */}
                <div 
                  onClick={() => setIsAway(!isAway)}
                  style={{
                    backgroundColor: isAway ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-primary)',
                    border: `1px solid ${isAway ? 'var(--color-warning)' : 'var(--color-border)'}`,
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      backgroundColor: isAway ? 'var(--color-warning)' : 'var(--color-border)',
                      color: isAway ? '#000' : 'var(--text-muted)',
                      padding: '0.4rem',
                      borderRadius: '6px'
                    }}>
                      <Palmtree size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'white' }}>
                        {isAway ? 'Frånvarospärr är AKTIVERAD' : 'Frånvarospärr är AVSTÄNGD'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {isAway ? 'Dina ärenden vidarebefordras till vald ställföreträdare.' : 'Klicka här för att markera att du är ledig.'}
                      </div>
                    </div>
                  </div>

                  {/* Switch toggle pill */}
                  <div style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '999px',
                    backgroundColor: isAway ? 'var(--color-warning)' : 'var(--color-border)',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                  }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: isAway ? '21px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}></div>
                  </div>
                </div>

                {/* Fält när frånvaro är aktiv */}
                {isAway && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.2rem' }}>
                    {/* Val av ställföreträdare */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', color: 'white', fontWeight: 600 }}>
                        Automatisk delegering till (Ställföreträdande kollega): *
                      </label>
                      <select
                        className="form-input"
                        value={backupUserId}
                        onChange={(e) => setBackupUserId(e.target.value)}
                        required={isAway}
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                      >
                        <option value="">-- Välj kollega som ska ta över dina projekt --</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name || u.username} ({u.role === 'admin' ? 'Projektadministratör' : 'Beredare'})
                            {u.is_away ? ' [Även ledig]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Datumintervall */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.74rem' }}>Från och med datum</label>
                        <input
                          type="date"
                          className="form-input"
                          value={awayStartDate}
                          onChange={(e) => setAwayStartDate(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.74rem' }}>Till och med datum</label>
                        <input
                          type="date"
                          className="form-input"
                          value={awayEndDate}
                          onChange={(e) => setAwayEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Frånvaromeddelande */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Frånvaromeddelande / Notering</label>
                      <input
                        type="text"
                        className="form-input"
                        value={awayMessage}
                        onChange={(e) => setAwayMessage(e.target.value)}
                        placeholder="T.ex. Semester vecka 28–31. Åter 12 augusti."
                      />
                    </div>

                    {/* Kryssruta: Delegera nuvarande aktiva projekt */}
                    <div style={{
                      backgroundColor: 'rgba(95, 200, 145, 0.05)',
                      border: '1px solid rgba(95, 200, 145, 0.25)',
                      borderRadius: '6px',
                      padding: '0.75rem 0.85rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => setDelegateActiveProjects(!delegateActiveProjects)}
                    >
                      <input
                        type="checkbox"
                        checked={delegateActiveProjects}
                        onChange={(e) => setDelegateActiveProjects(e.target.checked)}
                        style={{ marginTop: '0.2rem' }}
                      />
                      <div style={{ fontSize: '0.78rem', color: 'white' }}>
                        <strong>Överför alla mina nuvarande aktiva projekt nu</strong>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                          Projekt där du är ansvarig flyttas omedelbart över till den valda ställföreträdaren i databasen.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={loading}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              {loading ? 'Sparar...' : (
                <>
                  <Check size={14} /> Spara kontouppgifter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MyAccountModal;
