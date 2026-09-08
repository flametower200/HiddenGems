'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { registraUtente, accedi, esci } from '../lib/registration';

const RUOLI = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
const PIEDI = [
  { value: 'destro', label: 'Destro' },
  { value: 'sinistro', label: 'Sinistro' },
  { value: 'ambidestro', label: 'Ambidestro' },
];
const ANNATE = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Prima Squadra'];

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [genere, setGenere] = useState('');
  const [tipoAccount, setTipoAccount] = useState('giocatore');
  const [dataNascita, setDataNascita] = useState('');
  const [nazione, setNazione] = useState('');
  const [regione, setRegione] = useState('');
  const [provincia, setProvincia] = useState('');

  const [ruoloPrincipale, setRuoloPrincipale] = useState('Attaccante');
  const [piede, setPiede] = useState('destro');
  const [altezza, setAltezza] = useState('');
  const [patentino, setPatentino] = useState('');
  const [societaAttuale, setSocietaAttuale] = useState('');
  const [genereSquadra, setGenereSquadra] = useState('maschile');
  const [annataSquadra, setAnnataSquadra] = useState('Prima Squadra');
  const [categoria, setCategoria] = useState('');

  const [profili, setProfili] = useState([]);
  const [filtroRuolo, setFiltroRuolo] = useState('tutti');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) caricaProfili();
  }, [session, filtroRuolo]);

  const caricaProfili = async () => {
    let query = supabase.from('profiles').select('*');
    if (filtroRuolo !== 'tutti') query = query.eq('tipo_account', filtroRuolo);
    const { data, error } = await query;
    if (error) {
      console.error('Errore caricamento profili:', error.message);
      return;
    }
    setProfili(data || []);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    let dettagli = {};
    if (tipoAccount === 'giocatore') {
      dettagli = {
        ruolo_principale: ruoloPrincipale, piede,
        altezza: altezza ? Number(altezza) : null,
        nazione, regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
      };
    } else if (tipoAccount === 'allenatore') {
      dettagli = {
        patentino, nazione,
        regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
      };
    } else if (tipoAccount === 'scout') {
      dettagli = {
        societa_attuale: societaAttuale || null, nazione: nazione || null,
        regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
      };
    } else if (tipoAccount === 'societa') {
      dettagli = {
        categoria: categoria || null, genere_squadra: genereSquadra,
        annata_squadra: annataSquadra, nazione: nazione || null,
        regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
      };
    }

    try {
      const { richiedeConfermaEmail } = await registraUtente({
        email, password, confermaPassword,
        tipoAccount, nome,
        cognome: tipoAccount === 'societa' ? undefined : cognome,
        genere: tipoAccount === 'societa' ? genereSquadra : genere,
        dataNascita: tipoAccount === 'societa' ? undefined : dataNascita,
        dettagli,
      });

      if (richiedeConfermaEmail) {
        alert('Registrazione avviata! Controlla la tua email per confermare l\'account prima di accedere.');
        setMode('login');
      }
    } catch (err) {
      alert('Errore registrazione: ' + err.message);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await accedi(email, password);
    } catch (err) {
      alert('Errore login: ' + err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await esci();
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Caricamento in corso...</div>;
  }

  if (!session) {
    return (
      <main style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ textAlign: 'center', color: '#1a365d' }}>HiddenGems ⚽</h1>
        <p style={{ textAlign: 'center', color: '#666' }}>Piattaforma Scouting Calcistico</p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setMode('login')} style={{ flex: 1, padding: '10px', backgroundColor: mode === 'login' ? '#2563eb' : '#e5e7eb', color: mode === 'login' ? '#fff' : '#000', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Accedi</button>
          <button onClick={() => setMode('register')} style={{ flex: 1, padding: '10px', backgroundColor: mode === 'register' ? '#2563eb' : '#e5e7eb', color: mode === 'register' ? '#fff' : '#000', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Registrati</button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'register' && (
            <>
              <label>
                Tipo Account:
                <select value={tipoAccount} onChange={(e) => setTipoAccount(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
                  <option value="giocatore">Giocatore</option>
                  <option value="allenatore">Allenatore</option>
                  <option value="scout">Scout</option>
                  <option value="societa">Società</option>
                </select>
              </label>

              <input type="text" placeholder={tipoAccount === 'societa' ? 'Nome società' : 'Nome'} value={nome} onChange={(e) => setNome(e.target.value)} required style={{ padding: '8px' }} />

              {tipoAccount !== 'societa' && (
                <input type="text" placeholder="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} required style={{ padding: '8px' }} />
              )}
              {tipoAccount !== 'societa' && (
                <input type="text" placeholder="Genere" value={genere} onChange={(e) => setGenere(e.target.value)} style={{ padding: '8px' }} />
              )}
              {tipoAccount !== 'societa' && (
                <label>
                  Data di nascita:
                  <input type="date" value={dataNascita} onChange={(e) => setDataNascita(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                </label>
              )}
              {tipoAccount !== 'societa' && (
                <>
                  <input type="text" placeholder="Nazione" value={nazione} onChange={(e) => setNazione(e.target.value)} required style={{ padding: '8px' }} />
                  {nazione === 'Italia' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" placeholder="Regione" value={regione} onChange={(e) => setRegione(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                      <input type="text" placeholder="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                    </div>
                  )}
                </>
              )}

              {tipoAccount === 'giocatore' && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <h4>Dettagli Giocatore</h4>
                  <select value={ruoloPrincipale} onChange={(e) => setRuoloPrincipale(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px' }}>
                    {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select value={piede} onChange={(e) => setPiede(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px' }}>
                    {PIEDI.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <input type="number" placeholder="Altezza (cm)" value={altezza} onChange={(e) => setAltezza(e.target.value)} style={{ width: '100%', padding: '8px' }} />
                </div>
              )}

              {tipoAccount === 'allenatore' && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <h4>Dettagli Allenatore</h4>
                  <input type="text" placeholder="Patentino (es. UEFA B)" value={patentino} onChange={(e) => setPatentino(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
                </div>
              )}

              {tipoAccount === 'scout' && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <h4>Dettagli Scout</h4>
                  <input type="text" placeholder="Società attuale (opzionale)" value={societaAttuale} onChange={(e) => setSocietaAttuale(e.target.value)} style={{ width: '100%', padding: '8px' }} />
                </div>
              )}

              {tipoAccount === 'societa' && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <h4>Dettagli Società</h4>
                  <select value={genereSquadra} onChange={(e) => setGenereSquadra(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px' }}>
                    <option value="maschile">Maschile</option>
                    <option value="femminile">Femminile</option>
                  </select>
                  <select value={annataSquadra} onChange={(e) => setAnnataSquadra(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px' }}>
                    {ANNATE.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input type="text" placeholder="Categoria (opzionale)" value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px' }} />
                  <input type="text" placeholder="Nazione (opzionale)" value={nazione} onChange={(e) => setNazione(e.target.value)} style={{ width: '100%', padding: '8px' }} />
                </div>
              )}
            </>
          )}

          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '8px' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '8px' }} />
          {mode === 'register' && (
            <input type="password" placeholder="Conferma password" value={confermaPassword} onChange={(e) => setConfermaPassword(e.target.value)} required style={{ padding: '8px' }} />
          )}

          <button type="submit" style={{ padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {mode === 'login' ? 'Entra' : 'Crea Account'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '15px' }}>
        <div>
          <h2>HiddenGems</h2>
          <p style={{ margin: 0, color: '#666' }}>Connesso come: <strong>{session.user.email}</strong></p>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
      </header>

      <section style={{ marginTop: '30px' }}>
        <h3>Bacheca Scouting</h3>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>Filtra per Ruolo:</label>
          <select value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)} style={{ padding: '6px' }}>
            <option value="tutti">Tutti i profili</option>
            <option value="giocatore">Giocatori</option>
            <option value="allenatore">Allenatori</option>
            <option value="scout">Scout</option>
            <option value="societa">Società</option>
          </select>
        </div>

        <div style={{ display: 'grid', gap: '15px' }}>
          {profili.length === 0 ? (
            <p>Nessun profilo trovato per questa categoria.</p>
          ) : (
            profili.map((p) => (
              <div key={p.id} style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{p.nome} {p.cognome}</h4>
                <p style={{ margin: '0 0 5px 0', textTransform: 'capitalize', color: '#2563eb', fontWeight: 'bold' }}>{p.tipo_account}</p>
                <small style={{ color: '#64748b' }}>Email: {p.email}</small>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
